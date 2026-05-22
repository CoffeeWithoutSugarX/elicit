# UI设计_v0.1_MVP — 引思助手前端高保真原型规格

## 1. 文档元信息

| 字段          | 值                                |
| ----------- | -------------------------------- |
| 文档名称        | doc/UI设计/SPEC.md                 |
| 版本          | v0.1                             |
| 状态          | 草稿                               |
| 创建日期        | 2026-05-21                       |
| 最后更新        | 2026-05-21                       |
| 产品负责人       | muzi                             |
| 评审人         | muzi                             |
| **关联文档**    |                                  |
| ↑ 上游：产品契约   | `doc/PRD/PRD_v0.1_MVP.md`        |
| ↑ 上游：功能/NFR | `doc/需求分析/需求分析_v0.1_MVP.md`      |
| ↑ 上游：架构子系统  | `doc/高层架构/高层架构设计_v0.1_MVP.md`    |
| ↑ 上游：API/SSE/state | `doc/概要设计/概要设计_v0.1_MVP.md` §4 / §9 |
| ↑ 上游：双层循环行为 | `doc/详细设计/详细设计_v0.1_MVP.md` §4.3 / §14.4 |
| → 下游：实施计划   | `doc/UI设计/PLAN.md`（紧随其后产出）       |
| → 下游：原型代码   | `doc/UI设计/src/**`                |

---

## 0. 文档边界（这份 SPEC 是什么 / 不是什么）

**是什么**：

- 一份**前端高保真原型**的产品 / 工程规格，落点位置 `doc/UI设计/`（独立 Vite 子项目）
- 目的是**在实施期之前**让 muzi 在浏览器里可视化校验 PRD §6 全部页面 + §8 全部 Agent 行为分支的呈现效果
- 作为实施期把组件抄回 `src/` 的视觉 + 交互**参照基线**

**不是什么**：

- ❌ 不是产品需求文档（产品行为契约以 PRD 为准）
- ❌ 不是详细设计的视觉版本（节点 / 状态机 / prompt 以 详设 §4.3 为准）
- ❌ 不是生产代码（**不会**被构建到主项目，**不参与** `pnpm verify` 全工程验证）
- ❌ 不接真实 LLM / OSS / Supabase（纯 mock）
- ❌ 不做无障碍 a11y 全套审计、不做 mobile 响应式、不做暗色模式
- ❌ 不写自动化测试（手测 checklist 替代）

**与主项目的关系**：

- 独立 `package.json` / `node_modules` / `pnpm-lock.yaml`，**不**进入主项目工作流
- `.claude/settings.json` 4 条 hard gate hook **不**应触及该子项目（hook 限定在主仓的 `pnpm` 命令，不递归子目录）
- 实施期：照着抄组件 → 进 `src/components/` / `src/features/`；抄完后 `doc/UI设计/` 仍保留作为视觉参照（不删）

---

## 2. 设计目标

| ID  | 目标                                            | 验收信号                                   |
| --- | ----------------------------------------------- | -------------------------------------- |
| G1  | 17 个分支场景全部可视化（PRD §6 + §8 + 兜底矩阵）       | DevToolbar 切到任一项均能看到完整 UI            |
| G2  | 双层循环 P-104 顶栏的两层语义清晰可读                  | "小问 N/M · 阶段 · 破题点 K" 在 4 个 scenario 中实测对得上 PRD mockup |
| G3  | P-105 知识点卡片的 done / partial blocked 两形态正确 | 两个 scenario 切换无样式漂移                  |
| G4  | 流式渲染体感 ≈ 真实 SSE                            | fakeLlmStream 默认档位（~30 char/s）肉眼接近线上 |
| G5  | 实施期可直接照抄                                     | 组件命名 / Tailwind class / Zustand store 形态对齐主项目惯例 |

---

## 3. 技术选型

| 维度          | 选型                                                                  | 与主项目对齐                                                |
| ------------ | --------------------------------------------------------------------- | ----------------------------------------------------------- |
| 构建           | Vite 6.x                                                              | 主项目用 Next.js 16；这里独立项目不需要 SSR                  |
| 框架           | React 19                                                              | ✅ 完全对齐                                                  |
| 语言           | TypeScript 5.x（严格模式）                                            | ✅                                                          |
| 样式           | Tailwind CSS v4 + 主题 token（CSS variables）                          | ✅ 主项目同版                                                |
| 状态           | Zustand 5.x                                                           | ✅                                                          |
| 路由           | React Router v7（SPA 模式）                                            | 主项目用 Next.js App Router；这里 SPA 更轻             |
| 数学渲染       | KaTeX（不上 react-katex 包装，直接调）                                  | ✅                                                          |
| 字体（display） | **Fraunces Variable**（衬线，可变字重 + SOFT/WONK 轴）— 标题 / drop-cap / 阶段名 | `@fontsource-variable/fraunces`                              |
| 字体（body）    | **IBM Plex Sans** — 正文 / 气泡 / 按钮                                | `@fontsource/ibm-plex-sans` 400/500/600                      |
| 字体（mono）    | **IBM Plex Mono** — 罗马数字 / 题号 / 等宽元素                        | `@fontsource/ibm-plex-mono` 400/500                          |
| 图标           | lucide-react（轻量，与 shadcn 系契合）                                 | —                                                           |
| 美学方向       | **数学笔记本 × 编辑式**：象牙白纸 / 方格本背景 / 钢笔感 / 罗马数字 / 「」中文引号 / 章节分隔 ※ / 朱砂"批改红"克制强调 | 区别于主项目 POC 的 shadcn 通用 chat 风                       |
| 不引入         | LangGraph / @ai-sdk/* / LangChain / Drizzle / Supabase client / ali-oss / shadcn registry / @radix-ui / class-variance-authority / tw-animate-css / dark mode | 纯前端原型 + 轻量            |

---

## 4. 14 个 Scenario 清单 → PRD 锚点

| #   | scenario id              | PRD 锚点                  | 关键 UI 元素 / 分支要点                                                 |
| --- | ------------------------ | ------------------------- | ------------------------------------------------------------------------ |
| 1   | `login`                  | P5（PRD §9）              | 邮箱 + 密码表单 + 错误态                                                  |
| 2   | `p101-empty`             | P-101                     | 空对话页 / 图片按钮 active / 输入框                                       |
| 3   | `p102-upload`            | P-102 / US-001 / US-002   | 「拍照」「相册」二选一 + 预览 + 确认 / 取消                                |
| 4   | `p103-multi`             | P-103 / US-004 / US-005   | 多题列表 LaTeX 渲染 + 单选 + 「识别错误」回 P-102                          |
| 5   | `p103-single`            | P-103                     | 单题直接进确认                                                            |
| 6   | `p104-understand-oos`    | 阶段① + US-014            | 学科外礼貌拒答兜底 + 单 / 多问顶栏切换                                    |
| 7   | `p104-plan-deviation`    | 阶段② + US-008            | DeviationGuard 引回话术                                                   |
| 8   | `p104-execute-stuck`     | 阶段③ + US-009 + B4 双层  | 卡死 5 问探路 + KNOWLEDGE_FALLBACK 升级 + `insightPoints` 增长动效        |
| 9   | `p104-execute-multi-sub` | 阶段③ B4                  | 多 subProblem 顺序推进 + `sub_problem_changed` 顶栏切换                   |
| 10  | `p104-review`            | 阶段④                     | 多 subProblem 汇总过场                                                    |
| 11  | `p105-card-done`         | P-105 全 done             | 完整知识点卡片 + 「再来一题」                                              |
| 12  | `p105-card-partial`      | P-105 partial blocked     | 含「未突破」徽标的卡片形态                                                |
| 13  | `p106-swap`              | P-106 / US-016            | 换题确认浮层 + 「换一道」「取消」                                          |
| 14  | `history-resume`         | US-010 / US-017           | 图片按钮置灰 + 历史消息恢复                                                |
| 15  | `long-conversation`      | PRD §10 (≥ 50 轮)         | 顶栏「对话已较长」警示                                                    |
| 16  | `admin-list`             | US-015                    | `/admin` 跨用户只读列表                                                   |
| 17  | `admin-detail`           | US-015                    | 单会话只读详情 + 不脱敏（P9）                                              |

> 范围确认：17 个 scenario（之前口算 14 个偏低，按 PRD 完整覆盖应为 17 个）。DevToolbar 切换面板按 4 组分类：登录 / 上传 OCR / Pólya 阶段 / 卡片与浮层 / Admin。

---

## 5. 目录结构

```
doc/UI设计/
├── SPEC.md                         ← 本文件
├── PLAN.md                         ← 实施计划
├── README.md                       ← 跑法 + 17 scenario 手测 checklist + 与主项目映射
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml             ← packages:['.'] 切断主项目 workspace 上溯 + allowBuilds:esbuild
├── .npmrc                          ← registry 锁 npmmirror.com（国内拉 rollup darwin-arm64 二进制不稳）
├── vite.config.ts
├── tsconfig.json
├── tsconfig.app.json               ← Vite 6 标准分层（src/ TS 配置）
├── tsconfig.node.json              ← vite.config.ts 用
├── index.html
├── public/
│   └── mock-images/                ← 题目截图 fixtures（占位 SVG 或自绘）
└── src/
    ├── main.tsx                    ← React 19 createRoot + Router 挂载
    ├── App.tsx                     ← Router root + DevToolbar 全局挂载
    ├── routes/
    │   ├── LoginRoute.tsx
    │   ├── chat/
    │   │   ├── ChatLayout.tsx      ← 侧边栏 + 主区域共用骨架
    │   │   ├── P101Empty.tsx
    │   │   ├── P102Upload.tsx      ← overlay 浮层
    │   │   ├── P103MultiQuestion.tsx
    │   │   ├── P103SingleQuestion.tsx
    │   │   ├── P104Phase.tsx       ← 4 阶段共用主对话流路由（按 phase state 切壳）
    │   │   ├── P105Card.tsx
    │   │   ├── P106SwapConfirm.tsx ← overlay
    │   │   ├── HistoryResume.tsx
    │   │   └── LongConversation.tsx
    │   └── admin/
    │       ├── AdminLayout.tsx
    │       ├── ConversationList.tsx
    │       └── ConversationDetail.tsx
    ├── components/
    │   ├── DevToolbar.tsx          ← 右下角固定切分支面板
    │   ├── ChatBubble.tsx          ← user / agent / system 三态气泡
    │   ├── ChatInput.tsx           ← 输入框 + 图片按钮 + 发送
    │   ├── ImageButton.tsx         ← 三态：active / triggers-P106 / disabled
    │   ├── Sidebar.tsx             ← 会话列表
    │   ├── PolyaTopBar.tsx         ← 双层顶栏（小问 N/M · 阶段 · 破题点 K）
    │   ├── KnowledgeCard.tsx       ← P-105 卡片
    │   ├── LatexRender.tsx         ← KaTeX 封装 + fallback
    │   ├── SubProblemBadge.tsx
    │   ├── InsightPointPill.tsx
    │   ├── PhaseSignalBadge.tsx    ← COMPLETED / STAY / ESCALATE / DONE / BLOCKED
    │   ├── LongConversationToast.tsx
    │   └── OcrErrorButton.tsx
    ├── mock/
    │   ├── scenarios.ts            ← 17 scenarios 注册表 + 元信息
    │   ├── messages/               ← 每个 scenario 一份对话 fixtures
    │   │   ├── p101-empty.ts
    │   │   ├── p103-multi.ts
    │   │   ├── p104-execute-stuck.ts
    │   │   └── ...
    │   ├── conversations.ts        ← 侧边栏列表 + admin 列表
    │   ├── knowledge-cards.ts      ← P-105 done / partial 两形态
    │   ├── ocr-results.ts          ← 单 / 多题 / OOS OCR fixtures
    │   └── fakeLlmStream.ts        ← 流式打字机模拟（setTimeout）
    ├── stores/
    │   ├── usePreviewStore.ts      ← scenarioId / streamSpeed / DevToolbar 状态
    │   └── useConversationStore.ts ← 镜像主项目 zustand 形态（含 B4 subProblems / insightPoints）
    ├── styles/
    │   ├── globals.css             ← Tailwind v4 @import + 主题 token CSS variables
    │   └── theme.ts                ← 颜色 / 字号 / 圆角 / 阴影 design token TS 镜像
    └── lib/
        ├── classNames.ts           ← cn() 工具
        └── katexHelpers.ts
```

---

## 6. 数据流

### 6.1 Scenario 切换

```
DevToolbar.onSelectScenario(id)
  → usePreviewStore.setScenario(id)
  → App.tsx 监听 scenarioId 变化
    → 从 mock/scenarios.ts 读元信息（route / 初始 conversation state / 初始 message 历史）
    → 调用 useConversationStore.loadScenario(state)（清空 + 重灌）
    → React Router programmatic navigate 到 scenario 指定路由
  → 对应 route 组件 render → UI 展现
```

### 6.2 流式响应模拟

```
ChatInput.onSubmit(userText)
  → useConversationStore.appendUserMessage(userText)
  → 从当前 scenario.responses 队列取下一条预设 Agent 回答（含 phase / signal / insightPoint 变化）
  → fakeLlmStream(response, { speed: usePreviewStore.streamSpeed })
    → setTimeout 按 token 切片回灌
    → 每 chunk → useConversationStore.appendAgentChunk(chunk)
    → 流式过程中：phase 切换触发 PolyaTopBar 重渲染、insightPoint 增长触发 Pill 动画、subProblem 切换触发 toast
  → 流尾 → useConversationStore.finalizeAgentMessage()
```

### 6.3 DevToolbar 二级控件

- **流速档位**：慢（10 char/s） / 正常（30 char/s） / 瞬时（一次性 flush）
- **强制信号**：覆盖当前 scenario 的下一条 Agent 信号为 STAY / ESCALATE / SUB_PROBLEM_DONE / PROBLEM_BLOCKED（用于压测顶栏切换）
- **重置**：清空 conversation store，重新加载当前 scenario 初始态

---

## 7. 组件清单（按职责）

### 7.1 视觉原子层

| 组件                     | 职责                                   | 关键 props                                                          |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------- |
| `LatexRender`            | KaTeX 行内 / 块级渲染，错误 fallback   | `tex: string`, `display?: 'inline' \| 'block'`                       |
| `SubProblemBadge`        | "小问 N/M" 徽标                        | `current: number`, `total: number`                                  |
| `InsightPointPill`       | 破题点 K 胶囊                          | `count: number`, `latest?: string`（hover 显示）                    |
| `PhaseSignalBadge`       | 5 信号着色徽标                         | `signal: 'COMPLETED'\|'STAY'\|...`                                  |
| `ImageButton`            | 三态图片按钮                           | `state: 'active'\|'triggers-P106'\|'disabled'`                       |

### 7.2 组合组件层

| 组件                       | 职责                                       | 依赖                                              |
| -------------------------- | ------------------------------------------ | ------------------------------------------------- |
| `ChatBubble`               | user / agent / system 三态气泡 + LaTeX 内嵌 | `LatexRender`                                     |
| `ChatInput`                | 输入框 + 图片按钮 + 发送                    | `ImageButton`                                     |
| `PolyaTopBar`              | 双层顶栏：上"小问 N/M · 阶段"，下"破题点 K" | `SubProblemBadge`, `InsightPointPill`             |
| `KnowledgeCard`            | P-105 卡片（done + partial blocked 两形态） | `LatexRender`, `SubProblemBadge`                  |
| `Sidebar`                  | 会话列表 + 「新建对话」                     | —                                                 |
| `LongConversationToast`    | ≥ 50 轮警示                                 | —                                                 |
| `OcrErrorButton`           | 「识别错误」按钮                            | —                                                 |
| `DevToolbar`               | 右下角面板：scenario / streamSpeed / 强制信号 | `usePreviewStore`                                 |

### 7.3 浮层 / 页面层

略，见 §5 routes/ 目录树。

---

## 8. Mock 引擎契约

### 8.1 `Scenario` 类型

```typescript
type Scenario = {
  id: string;                                // 'p104-execute-stuck'
  group: 'auth' | 'upload' | 'polya' | 'card-overlay' | 'admin';
  label: string;                              // DevToolbar 显示
  prdAnchor: string;                          // 'P-104 阶段③ + US-009 + B4 双层'
  route: string;                              // '/chat/p104'
  initialConversation: ConversationState;     // 注入到 useConversationStore
  initialMessages: Message[];                  // 历史消息（user/agent 混合）
  responses: AgentResponse[];                  // 用户回车后按顺序消费的预设回答
};

type AgentResponse = {
  content: string;                            // Agent 文本（含 LaTeX）
  tokens?: string[];                           // 可选预切 tokens；缺省按字符切
  phaseTransition?: PolyaPhase;                // 渲染过程中切阶段
  signalAtEnd?: 'COMPLETED'|'STAY'|'ESCALATE'|'SUB_PROBLEM_DONE'|'PROBLEM_BLOCKED';
  insightPointDelta?: { kind: 'add'; text: string };
  subProblemTransition?: number;               // 切到第 N 个 subProblem
  emitKnowledgeCard?: KnowledgeCardData;       // 阶段④结束推 P-105
};
```

### 8.2 `ConversationState` 镜像主项目 state

字段对齐 `src/agents/schemas/ElicitGraphStateSchema.ts`：

- `conversationId / userId / hasResolved`
- `subProblems[]`（status / insightPoints / stuckCountPerPhase / probedQuestionIds）
- `currentSubProblemIndex`
- `currentPhase`（UNDERSTAND / PLAN / EXECUTE / REVIEW）
- `problemType`
- `ocrResult`

**注意**：字段命名与主项目 100% 对齐（camelCase），实施期可直接复用类型定义。

---

## 9. 错误处理（mock 层面）

| 错误源                       | 处理                                                       |
| ---------------------------- | ---------------------------------------------------------- |
| LaTeX 渲染失败                | KaTeX `errorColor: red` + 原 tex 字符串 fallback           |
| DevToolbar 切到不存在 scenario | 兜底页 "Scenario not found"                                |
| fakeLlmStream 中断（页面切走） | 已渲染部分保留 + 标记 "已中断"                              |
| Scenario fixture 字段缺失      | TS 类型保证；运行时不做兜底（设计原型 fail-fast）           |
| 不模拟                        | 401 / 网络断 / OSS 上传超时 / Postgres 失败（out-of-scope） |

---

## 10. 验收基线

| 项                                    | 标准                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `pnpm install` in `doc/UI设计/`        | ✅ 全绿，无 peerDep 警告之外的报错                                       |
| `pnpm build` in `doc/UI设计/`          | ✅ TS 严格模式全绿，产物可 `pnpm preview` 起本地静态服务                  |
| `pnpm dev` 浏览器手测                  | 17 scenario 全部可视化、DevToolbar 切换流畅                              |
| README 「手测 checklist」              | 17 项 ✓                                                                  |
| 不动主项目                              | `git diff main -- ':!doc/UI设计/'` 应为空（Batch 3 完成后）              |
| 字段命名对齐主项目                      | grep 不出 snake_case / `_camelCase` 漏网                                 |

**不做**：单元测试 / E2E / 覆盖率。

---

## 11. 与主项目的映射表（实施期照抄索引）

| 原型组件                          | 实施期目标位置                                        |
| --------------------------------- | ----------------------------------------------------- |
| `ChatBubble / ChatInput / Sidebar` | `src/features/chat/components/*`                      |
| `PolyaTopBar`                     | `src/features/chat/components/PolyaTopBar.tsx`        |
| `KnowledgeCard`                   | `src/features/chat/components/KnowledgeCard.tsx`      |
| `LatexRender`                     | `src/components/LatexRender.tsx`                      |
| `ImageButton`                     | `src/features/chat/components/ImageButton.tsx`        |
| `useConversationStore`            | `src/stores/useConversation.ts`（POC 已存在，要 merge） |
| `routes/admin/*`                  | `src/app/admin/**`（Next.js Server Component 改写）   |
| `routes/login.tsx`                | `src/features/auth/*`（POC 已存在）                   |

**注意**：实施期主项目走 Next.js App Router + RSC，原型组件抄过去时需要把 React Router `<Link>` 换成 Next.js `<Link>`；client-only 状态保持。

---

## 12. 非目标（明确不做）

- ❌ 真实 LLM 接入（DeepSeek / Qwen-VL）
- ❌ 真实 OSS 上传 / STS
- ❌ Supabase Auth / Postgres
- ❌ E2E / 单测 / 覆盖率
- ❌ 无障碍 a11y 全套审计（基础 aria-label 会写）
- ❌ Mobile 响应式适配（妹妹用桌面，定 1280×800）
- ❌ 暗色模式
- ❌ i18n（仅简体中文）
- ❌ PWA / Service Worker
- ❌ Source map 优化 / 性能打包优化（设计原型，不上生产）

---

## 13. 风险登记

| 编号    | 风险                                                                                          | 严重度 | 缓解                                                                       |
| ------- | --------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| UR-001  | Tailwind v4 与主项目版本不同步（v4 alpha→stable 期间 API 漂移）                                | 低     | 锁版本号一致；主项目升级时同步                                              |
| UR-002  | 17 scenario fixtures 写得太薄，对实施期参考价值不足                                            | 中     | 每个 scenario 至少 4 轮对话 + 完整 B4 state 变化                            |
| UR-003  | DevToolbar 自身 bug 导致 scenario 切换串台（state 残留）                                       | 中     | 切换时 `useConversationStore.reset()` 必须先于 `loadScenario()`             |
| UR-004  | 原型组件抄回主项目时因 RSC / Server Component 边界报错                                         | 低     | SPEC §11 已注明；实施期主项目侧加 `'use client'` 标注                       |
| UR-005  | 妹妹/家长后台数据同源 mock，可能误把家长后台调试改动带回妹妹端                                 | 低     | mock/conversations.ts 区分 `view: 'self' \| 'admin'` 字段                  |

---

## 14. 修订记录

| 版本   | 日期       | 修订人 | 摘要                                       |
| ------ | ---------- | ------ | ------------------------------------------ |
| v0.1   | 2026-05-21 | Claude | 首版草稿；17 scenario 范围 + 方案 A 落地    |
| v0.1.1 | 2026-05-21 | Claude | Batch 1 落地反馈：§5 目录树补 `pnpm-workspace.yaml`（切断主项目 workspace 上溯）+ `.npmrc`（registry 锁 npmmirror）+ `tsconfig.app.json`（Vite 6 分层）。`@vitejs/plugin-react` 锁 `^5`（与 Vite 6.x 兼容；`@latest` 会装到 6.x 需要 Vite 7） |
| v0.1.2 | 2026-05-22 | Claude | Batch 2 视觉重设计：美学方向从"暖橙学习风"切到"数学笔记本 × 编辑式"。装 3 个字体包（Fraunces Variable / IBM Plex Sans / IBM Plex Mono），重写 globals.css 主题 token（paper-* / ink-* / vermilion / 4 阶段色 / 5 信号色），重写 theme.ts TS 镜像。§5 目录树新增 `src/components/SectionDivider.tsx` + `src/lib/numerals.ts`（罗马数字工具）。10 个差异化视觉细节落地：方格本背景 / SVG noise overlay / 罗马数字题号 / 章节分隔 ※ / 气泡纸条角微旋转 / 阶段 Badge 1px 左竖线 / InsightPoint 朱砂下划线 / KnowledgeCard drop-cap + ≡ 装饰 / DevToolbar 便签夹 / 钢笔尖 ✎ 流式光标 |
