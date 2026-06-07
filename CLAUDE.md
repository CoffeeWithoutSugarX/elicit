# CLAUDE.md

本文档为 Claude Code (claude.ai/code) 在本仓库中工作时提供指引。

## 常用命令

- `pnpm dev` — 启动 Next.js 开发服务器，地址 `http://localhost:3000`。
- `pnpm build` / `pnpm start` — 生产构建 / 启动生产服务。
- `pnpm lint` — 运行 ESLint（flat 配置在 `eslint.config.mjs`）。
- `pnpm typecheck` — `tsc --noEmit` 类型检查（**Phase 1 起启用**，见测试验证 ADR §5.1）。
- `pnpm supabase:start` / `:stop` / `:reset` — 启停 / 重置本地 Supabase 栈（Postgres 等），配置见 `supabase/config.toml`。
- `pnpm supabase:diff` — 根据本地 schema 漂移生成新的迁移文件（写入 `supabase/migrations/`，文件名为 `init_schema`）。
- `pnpm supabase:type` — 从本地数据库重新生成 `src/db/supabase/type.ts`。任何 schema 变更后都需要执行。

**测试与验证相关命令**（按 Phase 推进逐步启用，详见 `doc/测试验证/测试验证策略_v0.1_MVP.md`）：

- `pnpm typecheck` — L1 类型检查（Phase 1）
- `pnpm test` / `pnpm test:cov` — L3 单元测试 + 覆盖率（Phase 2，基线 90/90）
- `pnpm demo:chat` — L4 fake-model 跑通 ChatGraph 端到端闭环（Phase 2）
- `pnpm integration` / `pnpm smoke` — L5 集成 / 冒烟测试（Phase 3）
- `pnpm evals` — L6 Agent 行为评测，**不阻断 PR**（Phase 3）
- `pnpm check` — L1+L2+L3+lint 全绿（单测层）
- `pnpm verify` — L1–L5 全工程验证；**subagent 完成代码落地前必须跑这个全绿才返回**

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
- **新版本 API 先查 context7**：本项目用的 LangGraph 1.x / LangChain 1.x / AI SDK v6 / Next.js 16 / React 19 都是 2025 末才稳的版本，训练数据可能滞后。涉及这些库的 API 用法（如 `getWriter()` / `PostgresSaver` / `toUIMessageStream` / `data-custom` chunk / Server Actions / React Compiler 行为）**先调 `mcp__claude_ai_Context7__query-docs` 查权威文档**，不要凭记忆写。

## 测试与验证体系

**唯一权威文档**：`doc/测试验证/测试验证策略_v0.1_MVP.md`（六层验证 + Phase 推进表 + Hard Gate + L6 Agent Behavior Evals）。

硬约束（按 Phase 启用，详见 ADR）：

- **L1–L5 PR 阻断级，L6 仅观察分**（避免 LLM 随机性误伤）
- **单测覆盖率 90/90**（行 / 分支），Phase 2 启用时即按此水位验收，无入门宽松期
- **禁手改 `src/db/supabase/type.ts`**（必须 `pnpm supabase:type` 重生成）
- **禁单元测试调真实 DeepSeek / Qwen-VL / OSS**（一律 mock 或 fake model）
- **禁 L6 evals 分数作 PR gating**
- **禁 Claude subagent 用 `--no-verify` 跳 hook**（除非 muzi 显式授权当次）
- **写测试代码也属于"落地代码"**——必须派 Sonnet subagent 写，主线程只评审
- **subagent prompt 模版必须包含**："禁止编写仅为提升覆盖率的无效断言；完成后跑 `pnpm verify` 全绿才返回"

新建任何 `tests/` 顶层目录 / `src/__tests__/` / `src/agents/demo/` 等，必须先在本文件登记。

### 已登记的测试目录

- `src/__tests__/` — L3 单元测试（Phase 2 起启用，vitest + `@/` 别名）
- `src/__tests__/agents/nodes/phases/` — Phase 节点单元测试（ClassifyNode 等）
- `src/__tests__/agents/graphs/` — Graph 不变量测试（checkpointStatePersistence 等）
- `src/__tests__/stores/` — Zustand store 单元测试（useConversation、useUserInfo、useHistoryConversation、useShowWelcome、useThemeFlag）
- `src/__tests__/app/api/` — Next.js API 路由单元测试（chat、oss、conversation、admin，镜像 `src/app/api/` 路径）
- `src/__tests__/integration/` — Wire 形状集成护栏测试（真实 `toUIMessageStream` + `streamIterator` → store 全链路；防止 mock 形状漂移复发）
- `src/__tests__/services/api-client/` — api-client 请求层单元测试（AdminRequest 等）
- `src/__tests__/agents/data/` — P-001 数据层单元测试（bsdMathCatalog、studentProfile、loadKnowledgePoints 过滤函数）
- `src/__tests__/agents/prompts/` — P-001 prompt 注入单元测试（buildStudentContext、5 个 systemPrompt 含学情块断言、reviewNode few-shots 口径验证）
