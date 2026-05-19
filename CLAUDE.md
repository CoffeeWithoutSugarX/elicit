# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 在本仓库中工作时提供指引。

## 常用命令

- `pnpm dev` — 启动 Next.js 开发服务器，地址 `http://localhost:3000`。
- `pnpm build` / `pnpm start` — 生产构建 / 启动生产服务。
- `pnpm lint` — 运行 ESLint（flat 配置在 `eslint.config.mjs`）。
- `pnpm supabase:start` / `:stop` / `:reset` — 启停 / 重置本地 Supabase 栈（Postgres 等），配置见 `supabase/config.toml`。
- `pnpm supabase:diff` — 根据本地 schema 漂移生成新的迁移文件（写入 `supabase/migrations/`，文件名为 `init_schema`）。
- `pnpm supabase:type` — 从本地数据库重新生成 `src/db/supabase/type.ts`。任何 schema 变更后都需要执行。

仓库未配置任何测试运行器，也没有独立的 typecheck 脚本；类型校验请依赖 `next build` 或 `tsc --noEmit`。

## 架构

### 聊天请求流程

1. 客户端（`useConversation` Zustand store）调用 `chatRequest.getChatResponse()` → `POST /api/chat/[conversationId]`，请求头携带 Supabase 的 `Authorization: Bearer` token。
2. `src/lib/auth.ts::withAuth` 是所有 API 路由的统一包装：通过 Supabase 校验 token，并把 `user` 注入到 handler 的 context 中。**任何需要用户信息的路由都必须用 `withAuth` 包裹。**
3. 路由内部调用 `compiledElicitGraph.stream(...)`，并以 `thread_id: conversationId` 作为配置，使 LangGraph 的 `PostgresSaver` 在该 thread 下做 checkpoint。
4. 输出流经 `@ai-sdk/langchain::toUIMessageStream` → `createUIMessageStreamResponse`（AI SDK UI message 协议）下发。客户端使用 `src/lib/utils.ts` 中的 `streamIterator` 解析 SSE 风格的 chunk，并按 `type` 分发（`data-custom` 对应 graph 内通过 `getWriter()` 主动写出的事件，其余作为文本增量处理）。

### LangGraph: `ChatGraph`(`src/agents/graphs/ChatGraph.ts`)

State schema（`ElicitGraphStateSchema`）：`messages`、`userId`、`conversationId`、`questionImgUrl`、`hasResolved`、`ocrResult`。

拓扑结构：
- `START` 通过 **条件边** 进入 `startFinOutNode`，该函数返回一个 **节点名数组**，LangGraph 会按数组并行 fan-out：
  - 当 `shouldCreateConversation` 查不到对应会话记录时，加入 `conversationNode`（通过 Drizzle 创建会话行，并通过 `getWriter()` 把新的 `conversationId` 与 `title` 流式推送回客户端）。
  - 当 `!state.hasResolved` 时加入 `ocrNode`。
  - 两者都不命中时直接路由到 `chatNode`。
- `conversationNode` 与 `ocrNode` 的出边都指向 `chatNode`；`chatNode` 调用 DeepSeek 模型生成助手消息后 → `END`。

Checkpointing 使用 `PostgresSaver.fromConnString(POSTGRES_URL)`。**`checkpointer.setup()` 当前被注释掉**——在全新的数据库上需要先手动执行一次，以创建 checkpoint 相关的表。

### 模型 (`src/agents/models/`)

- `deepseek-model.ts` — `chatModel`（通过 OpenAI 兼容协议调用 deepseek-chat），是 `chatNode` 实际调用的模型。
- `qianwen-model.ts` — `qwen-vl-ocr-latest`，用于图片 OCR。**注意**：当前文件在模块顶层调用了 `main()` 且 URL 是硬编码的，属于实验/示例代码，尚未接入到 `ocrNode`。如需在应用代码中导入，先移除顶层调用。

### 同一个 Postgres 下的两条持久化路径

- **Drizzle ORM**（`src/db/index.ts`、`src/db/schema/`、`src/db/mappers/`）— 仅服务端使用。Graph 节点（如 `ConversationMapper`）通过它访问数据库。`postgres-js` 客户端设置了 `prepare: false`，以兼容 Supabase 的 Supavisor 连接池。`elicit_conversations` 的 schema 以 Drizzle 定义为准——`pnpm supabase:diff` 据此生成迁移。
- **Supabase 客户端**（`src/db/supabase/supabase.ts`、`src/db/models/`）— 在 **浏览器端** 读写 `elicit_messages`。生成的类型放在 `src/db/supabase/type.ts`（通过 `pnpm supabase:type` 重新生成）。`elicit_messages` 的迁移是手写在 `supabase/migrations/` 下的。

当新增表需要被服务端 graph 节点使用时，同时添加 Drizzle schema **和** 迁移文件；如果客户端也要读这张表，记得重新生成 Supabase 类型。

### 会话 ID 的生命周期

会话在用户发送第一条消息之前没有数据库记录。客户端流程（`useConversation.setTempConversationId` / `sendMessage`）：
1. 客户端为新会话生成一个 UUID（`tempConversationId`），以便在服务端创建记录之前，URL/路由就能正常工作。
2. 服务端的 `shouldCreateConversation` 发现记录缺失，路由经过 `conversationNode`，插入会话行后 **以 `data-custom` chunk 的形式把 `{conversationId, title}` 流式回传**。
3. 客户端监听这个 chunk，并把新会话插入到侧边栏列表的最前面。

如果要修改"会话创建"的契约（在哪里建行、回传哪些字段），必须同时更新 `ConversationNode.ts` 和 `useConversation.ts` 里对 `data-custom` 的处理。

### OSS 上传 (`src/services/OssService.ts`)

- `getUploadSignInfo` — 服务端通过 `sts.assumeRole(OSS_STS_ROLE_ARN)` 申请 **STS 临时凭证**，再签发一份 **POST policy**（OSS4-HMAC-SHA256），供浏览器直传 OSS。返回浏览器需要的全部表单字段。
- `getSignedUrl` — 为私有桶预览签发 GET URL。
- POST policy 的 conditions 中硬编码了 bucket 名 `muzi-elicit`；如果 `OSS_BUCKET` 变化，这里的字符串也要同步改。

### 路径别名

`@/*` → `src/*`（见 `tsconfig.json`）。请始终使用别名——目前没有跨 feature 的相对路径导入。

## 值得注意的约定

- **`server-only` 导入** 出现在 `ConversationMapper` 等服务端模块里——不要在客户端组件中导入它们，否则会触发 Next.js 构建错误。
- Graph 节点统一使用 `console.log('NodeName invoked with ...')` 的日志格式，便于 grep，请保持一致。
- 代码中大量使用中文注释——编辑已有代码时请保留这些注释。
- 启用了 React Compiler（devDeps 里的 `babel-plugin-react-compiler`），除非性能分析显示有需要，否则不要手动写 `useMemo` / `useCallback`。
