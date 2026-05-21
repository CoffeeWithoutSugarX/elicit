# 引思助手 UI 高保真原型 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `doc/UI设计/` 下产出独立 Vite + React 19 子项目，可视化 17 个分支场景全部 UI 高保真，作为实施期把组件抄回主项目的视觉 / 交互参照基线。

**Architecture:** 独立 SPA（不接 LLM / DB / OSS / 主项目工作流），mock 引擎 = scenario 注册表 + fakeLlmStream 模拟 SSE + Zustand state 镜像主项目 B4 双层循环字段；DevToolbar 右下角面板一键切 17 scenarios。

**Tech Stack:** Vite 6 · React 19 · TypeScript 5 严格模式 · Tailwind v4 · Zustand 5 · React Router 7 · KaTeX · lucide-react

---

## 落地节奏

3 个 subagent batch + 主线程评审 + commit，每 batch 间留 muzi 评审 gate。每 batch 必须自包含 + 可独立验收 + 单独 commit。

| Batch | 目标产物 | 主要文件数 | 预期 subagent 耗时 |
| --- | --- | --- | --- |
| 1 | 脚手架 + DevToolbar shell + 路由占位 | ~12 | 30~45 min |
| 2 | 核心组件库 + mock 引擎 + 1 个端到端 scenario 跑通 | ~30 | 1.5~2 h |
| 3 | 剩余 16 个 scenario + admin + 登录 + README + 手测 checklist | ~35 | 2~3 h |

---

## 全局风格约束（每个 subagent prompt 内必须重复声明）

- **目录隔离**：subagent 只能修改 `doc/UI设计/` 内的文件，**不**许触碰主项目 `src/` / `package.json` / `.claude/` / `supabase/` / `scripts/` / 顶层 `pnpm-lock.yaml` 等任何文件
- **命名**：TS 一律 camelCase；不出现 snake_case（数据库相关在本原型不适用，因为不接 DB）
- **类型对齐主项目**：state schema 字段名（`subProblems` / `currentSubProblemIndex` / `currentPhase` / `insightPoints` / `stuckCountPerPhase` / `probedQuestionIds` / `problemType` / `hasResolved` 等）必须 1:1 对齐 `src/agents/schemas/ElicitGraphStateSchema.ts` + 详设 §15 D14
- **注释**：中文注释保留、不写废话注释（不写 "// 渲染 ChatBubble" 这类）；只在 WHY 非显然处加注释
- **样式**：Tailwind v4 syntax（`@import "tailwindcss";` + `@theme inline` 块定义主题 token），不写 v3 的 `tailwind.config.ts`
- **不**引入：LangGraph / @ai-sdk/* / @langchain/* / Drizzle / @supabase/* / ali-oss / next 等后端 / 框架包
- **不**写自动化测试 / vitest / playwright（设计原型 out-of-scope）
- **不**用 `git commit --no-verify`（虽然该子项目不在主项目 hard gate hook 范围内，但保持习惯）
- **完成验收前必须**：① `cd doc/UI设计 && pnpm install` 全绿；② `cd doc/UI设计 && pnpm build` 全绿（TS 严格 + Vite production build）；③ `cd doc/UI设计 && pnpm dev` 浏览器手测对应 scenario 可视化

---

## Pre-flight

- [ ] **Step 0.1: 确认 doc/UI设计/ 现状**

Run: `ls -la /Users/muzi/Project/elicit/doc/UI设计/`
Expected: 只有 `SPEC.md` 和 `PLAN.md`，无 `src/` / `node_modules` / `package.json`。

- [ ] **Step 0.2: 确认 pnpm + node 版本**

Run: `pnpm -v && node -v`
Expected: pnpm 8+ / node 20+。

- [ ] **Step 0.3: 确认主项目工作树干净**

Run: `git status -s`
Expected: 干净，或仅 `doc/UI设计/` 内 untracked 文件。

---

## Task 1 — Batch 1：脚手架 + DevToolbar shell + 路由占位

**Files (Create only)：**
- `doc/UI设计/.gitignore`
- `doc/UI设计/package.json`
- `doc/UI设计/vite.config.ts`
- `doc/UI设计/tsconfig.json`
- `doc/UI设计/tsconfig.node.json`
- `doc/UI设计/index.html`
- `doc/UI设计/src/main.tsx`
- `doc/UI设计/src/App.tsx`
- `doc/UI设计/src/vite-env.d.ts`
- `doc/UI设计/src/styles/globals.css`
- `doc/UI设计/src/styles/theme.ts`
- `doc/UI设计/src/lib/classNames.ts`
- `doc/UI设计/src/components/DevToolbar.tsx`（**仅 shell**，右下角固定面板显示 "DevToolbar · Batch 1 shell"）
- `doc/UI设计/src/stores/usePreviewStore.ts`（**仅 shell**，含 `scenarioId: string` + `setScenario(id)` 空实现）

**Subagent dispatch（model: sonnet / subagent_type: general-purpose / 不许 background）：**

```
你是引思助手项目的前端落地 subagent，model = sonnet 4.6。

任务：为 doc/UI设计/ 子项目创建脚手架（Batch 1），让独立 Vite + React 19 + Tailwind v4 + Zustand + React Router 项目可以 `pnpm install && pnpm dev` 起来，浏览器看到首页 + 右下角 DevToolbar shell。

依据文档：
- /Users/muzi/Project/elicit/doc/UI设计/SPEC.md （唯一权威；先完整读一遍，特别是 §3 技术选型 / §5 目录结构 / §0 文档边界）
- 不要读 PLAN.md（避免上下文污染）

强制约束：
1. 只在 doc/UI设计/ 目录内创建文件；不许动主项目任何文件
2. 不引入 LangGraph / AI SDK / Supabase / Drizzle / ali-oss / Next.js
3. Tailwind v4 syntax：globals.css 用 @import "tailwindcss" + @theme inline 定义 token；不写 tailwind.config.ts
4. React 19 createRoot；不写 ReactDOM.render
5. TypeScript 严格模式（strict: true、noUncheckedIndexedAccess: true、noImplicitAny）
6. 不写 README.md（Batch 3 再写）
7. 中文注释保留 + 不写废话注释

文件清单（创建以下文件，路径必须精确）：
1. doc/UI设计/.gitignore（忽略 node_modules / dist / .vite / *.log）
2. doc/UI设计/package.json
   - name: "elicit-ui-hifi"
   - private: true
   - type: "module"
   - scripts: dev / build / preview / typecheck
   - deps: react@^19 react-dom@^19 react-router@^7 zustand@^5 katex@latest lucide-react@latest
   - devDeps: vite@^6 @vitejs/plugin-react@latest typescript@^5 tailwindcss@^4 @tailwindcss/vite@^4 @types/react@^19 @types/react-dom@^19 @types/katex@latest
3. doc/UI设计/vite.config.ts（插件：@vitejs/plugin-react + @tailwindcss/vite）
4. doc/UI设计/tsconfig.json（严格 + bundler resolution + jsx: react-jsx + paths alias "@/*": "./src/*"）
5. doc/UI设计/tsconfig.node.json（vite.config.ts 用）
6. doc/UI设计/index.html（root div + module script -> src/main.tsx + 中文 lang + 字体预设系统默认）
7. doc/UI设计/src/main.tsx（StrictMode + BrowserRouter + 渲染 App + import './styles/globals.css'）
8. doc/UI设计/src/App.tsx
   - 顶层布局：min-h-screen bg-bg-canvas
   - 渲染 `<Routes>`：临时占位路由 `/` → 一个简单的"引思助手 UI 高保真原型 · Batch 1 OK"卡片页（用 Tailwind 主题 token 渲染，验证主题 token 工作）
   - 全局挂载 `<DevToolbar />`（fixed bottom-4 right-4）
9. doc/UI设计/src/vite-env.d.ts（默认 vite/client 类型）
10. doc/UI设计/src/styles/globals.css
    - `@import "tailwindcss";`
    - `@theme inline { ... }` 定义主题 token：colors（primary / accent / bg-canvas / bg-elevated / text-primary / text-muted / border-subtle / signal-completed / signal-stay / signal-escalate / signal-done / signal-blocked / phase-understand / phase-plan / phase-execute / phase-review）、radius（sm / md / lg / pill）、shadow（sm / md / overlay）、font-size 字阶
    - 颜色用现代温暖学习风：主色暖橙 / 辅色青绿 / 中性灰偏暖；具体数值由 subagent 选定但要写进 SPEC §3 的延续——subagent 可以自己拍板
11. doc/UI设计/src/styles/theme.ts（导出 token TS 镜像供组件直接 import，含 PHASE_LABEL / SIGNAL_LABEL 文案映射）
12. doc/UI设计/src/lib/classNames.ts（cn(...inputs) 合并 className，~10 行）
13. doc/UI设计/src/components/DevToolbar.tsx
    - 右下角 fixed 面板（圆角 + 阴影 + bg-bg-elevated）
    - 显示标题 "DevToolbar"（带 lucide-react 的 Wrench 图标）
    - 显示 "Batch 1 shell · scenarios 占位"
    - 不实现 scenario 切换逻辑（Batch 2 再做）
14. doc/UI设计/src/stores/usePreviewStore.ts
    - Zustand store
    - State: scenarioId: string ('default')、streamSpeed: 'slow'|'normal'|'instant'（默认 'normal'）
    - Action: setScenario(id) / setStreamSpeed(speed)
    - 不持久化

验收清单（subagent 完成前自跑）：
[ ] cd doc/UI设计 && pnpm install   ← 全绿，可有 peerDep warning 但无 error
[ ] cd doc/UI设计 && pnpm typecheck ← 全绿
[ ] cd doc/UI设计 && pnpm build     ← 全绿
[ ] cd doc/UI设计 && pnpm dev       ← 起 dev server（默认 5173），后台跑；用 curl http://localhost:5173 取首页确认 HTML 有 root div；不需要真开浏览器
[ ] 杀掉 dev server 进程

返回内容（必须）：
1. 创建的文件清单（每行一个绝对路径）
2. package.json 实际锁定的 dep 版本号（pnpm install 结束后从 pnpm-lock.yaml 摘要）
3. pnpm typecheck 输出尾部 5 行
4. pnpm build 输出尾部 10 行（含构建产物大小）
5. dev server curl 首页 HTML 的前 30 行
6. 任何与上述约束冲突的决策 + 理由（如有）

禁止：
- 修改 doc/UI设计/ 之外任何文件
- 提交 git commit（主线程评审后才提交）
- 跑 `pnpm install --no-frozen-lockfile` 触及主项目 lock（你的 install 应该只生成 doc/UI设计/pnpm-lock.yaml）
- 写自动化测试 / vitest / playwright 配置
- 用 `--no-verify` / `--no-gpg-sign` 任何 flag

完成后用 markdown 报告返回。
```

**Verification（主线程跑）：**

- [ ] **Step 1.1: 派发 Sonnet subagent 执行上面 prompt**

Run: 主线程 Agent 工具调用 `subagent_type=general-purpose, model=sonnet`，foreground，等返回。

- [ ] **Step 1.2: subagent 返回后 `git status -s` 抽检改动范围**

Run: `git status -s`
Expected: 改动只在 `doc/UI设计/` 下；无 `node_modules` 入 git（被 .gitignore）。

- [ ] **Step 1.3: 主线程自跑验收四件套**

```bash
cd doc/UI设计
pnpm install
pnpm typecheck
pnpm build
pnpm dev &
sleep 3
curl -s http://localhost:5173 | head -30
kill %1
cd ../..
```

Expected: 全绿；HTML 含 `<div id="root">`。

- [ ] **Step 1.4: 主线程 Read 抽检 3 个关键文件**

- `package.json` — 确认依赖版本 + scripts 齐全
- `src/styles/globals.css` — 确认 @theme inline 块语法正确、token 命名一致
- `src/App.tsx` — 确认 BrowserRouter 包裹 + DevToolbar 全局挂载

- [ ] **Step 1.5: 跟 muzi 报告 + 等评审 ok**

报告内容：① subagent 返回摘要 ② 主线程抽检结果 ③ 是否可以 commit + 进 Batch 2。等 muzi 一句 "ok 提交" 才 commit。

- [ ] **Step 1.6: Commit Batch 1**

```bash
git add doc/UI设计/
git commit -m "$(cat <<'EOF'
feat(ui-hifi): scaffold Vite + React 19 + Tailwind v4 子项目（Batch 1）

落地 doc/UI设计/ 独立 SPA 脚手架，含 React Router + Zustand + KaTeX + lucide-react
依赖、主题 token、DevToolbar shell、空 usePreviewStore。pnpm install / typecheck /
build / dev 全绿。详见 doc/UI设计/SPEC.md。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2 — Batch 2：核心组件库 + mock 引擎 + 1 个端到端 scenario

**前置条件：** Batch 1 已 commit。

**Files：**

Create（~30 个）：
- `doc/UI设计/src/mock/types.ts` — `Scenario / AgentResponse / ConversationState / Message / PolyaPhase / PhaseSignal / SubProblemState / KnowledgeCardData` 等
- `doc/UI设计/src/mock/scenarios.ts` — 17 scenario 元信息注册表（**先写 1 个完整 `p104-execute-stuck` fixture，其余 16 项留占位元信息 + label，Batch 3 填**）
- `doc/UI设计/src/mock/messages/p104-execute-stuck.ts` — 完整 fixture（含 4~6 轮对话 + 5 信号变化 + insightPoint 增长 + KNOWLEDGE_FALLBACK 升级）
- `doc/UI设计/src/mock/knowledge-cards.ts` — done / partial blocked 两形态各 1 个
- `doc/UI设计/src/mock/ocr-results.ts` — 单 / 多题 / OOS 三组 fixture
- `doc/UI设计/src/mock/fakeLlmStream.ts` — 流式打字机：`fakeLlmStream(text, { speed, onChunk, onDone, signal })` Promise
- `doc/UI设计/src/lib/katexHelpers.ts` — `renderTexToString(tex, displayMode)` 含 errorColor + 原文 fallback
- `doc/UI设计/src/stores/useConversationStore.ts` — 完整：含 `loadScenario(state) / reset() / appendUserMessage(text) / appendAgentChunk(chunk) / finalizeAgentMessage(signal) / advancePhase(phase) / addInsightPoint(text) / switchSubProblem(index) / emitKnowledgeCard(data)`
- `doc/UI设计/src/stores/usePreviewStore.ts` **改写**：含 `forceSignal` / `setForceSignal` / `reset` 全套
- `doc/UI设计/src/components/LatexRender.tsx`
- `doc/UI设计/src/components/SubProblemBadge.tsx`
- `doc/UI设计/src/components/InsightPointPill.tsx`
- `doc/UI设计/src/components/PhaseSignalBadge.tsx`
- `doc/UI设计/src/components/ImageButton.tsx`
- `doc/UI设计/src/components/ChatBubble.tsx`
- `doc/UI设计/src/components/ChatInput.tsx`
- `doc/UI设计/src/components/Sidebar.tsx`
- `doc/UI设计/src/components/PolyaTopBar.tsx`
- `doc/UI设计/src/components/KnowledgeCard.tsx`
- `doc/UI设计/src/components/LongConversationToast.tsx`
- `doc/UI设计/src/components/OcrErrorButton.tsx`
- `doc/UI设计/src/components/DevToolbar.tsx` **改写完整版**：scenario 下拉 + 流速档位 + 强制信号按钮 + 重置按钮
- `doc/UI设计/src/routes/chat/ChatLayout.tsx`
- `doc/UI设计/src/routes/chat/P104Phase.tsx`（4 阶段共用主对话流路由，按 phase state 切外层壳）

Modify：
- `doc/UI设计/src/App.tsx` — 加 `/chat/:scenarioId` 路由 → P104Phase；保留 `/` 简介首页

**Subagent dispatch（model: sonnet / subagent_type: general-purpose / foreground）：**

```
你是引思助手项目的前端落地 subagent，model = sonnet 4.6。

任务：为 doc/UI设计/ 子项目落地 Batch 2：核心组件库 + mock 引擎 + 1 个端到端 scenario 跑通（p104-execute-stuck，最复杂用例提前压测）。

前置条件：
- Batch 1 已提交（脚手架 + 主题 token + DevToolbar shell + usePreviewStore shell 均就绪）
- doc/UI设计/ 当前可 pnpm install / build / dev

依据文档（按顺序读全）：
1. /Users/muzi/Project/elicit/doc/UI设计/SPEC.md 全文（§4 scenario 清单 / §5 目录结构 / §6 数据流 / §7 组件清单 / §8 mock 引擎契约）
2. /Users/muzi/Project/elicit/doc/PRD/PRD_v0.1_MVP.md §6 页面清单 + §8.2 双层循环行为现象 + §8.4 兜底矩阵 + §8.5 P-105 卡片
3. /Users/muzi/Project/elicit/doc/详细设计/详细设计_v0.1_MVP.md §4.3.4 ExecuteNode prompt + §4.3.5 + §14.4 E12/E13/E14 剧本（fixture 内容参考剧本）
4. /Users/muzi/Project/elicit/src/agents/schemas/ElicitGraphStateSchema.ts （字段命名 1:1 对齐）

强制约束（同 Batch 1，特别注意）：
- 只在 doc/UI设计/ 内修改
- TS 字段命名 1:1 对齐主项目 state schema（subProblems / currentSubProblemIndex / currentPhase / insightPoints / stuckCountPerPhase / probedQuestionIds / problemType / hasResolved）
- Tailwind v4 syntax / 主题 token 用 Batch 1 定义的 css variable，禁止硬编码 hex 颜色
- 不写自动化测试
- 中文注释保留

落地分块（subagent 自己拆步骤，但必须按以下顺序）：

A. types & mock 引擎层（无 UI 依赖，先做）
- src/mock/types.ts：完整定义见 SPEC §8
- src/mock/fakeLlmStream.ts：核心流式模拟，支持 AbortSignal 中断；speed: slow=100ms/char, normal=33ms/char, instant=立即 onDone
- src/lib/katexHelpers.ts：KaTeX 渲染 API：renderToString 调用，throwOnError=false + errorColor=#dc2626，返回 HTML 字符串；调用方负责安全注入（fixture 内容由 SPEC 控制，不来自用户输入）
- src/mock/ocr-results.ts、knowledge-cards.ts：fixture
- src/mock/messages/p104-execute-stuck.ts：完整 fixture：
  · 题目：一个二次函数综合题（含 LaTeX）
  · 4 轮初始消息（user 上传 + agent OCR 确认 + agent 引导 Pólya 阶段①完成 → 阶段②）
  · responses 队列 5 条：
    1. user 答方向（STAY） → agent 引导继续
    2. user 答方向（STAY） → agent 引导继续
    3. user 答方向（STAY，触发卡死 3 轮）→ agent 进入 5 问探路第 1 问
    4. user 答（STAY，探路第 1 失败）→ agent 5 问探路第 2 问
    5. user 答（ESCALATE，KNOWLEDGE_FALLBACK 升级）→ agent 直接给方法论提示 + new_insight 入 insightPoints
  · 每条 response 含 phaseTransition / signalAtEnd / insightPointDelta（如 #5）
- src/mock/scenarios.ts：注册表导出 SCENARIOS（17 项），先写 p104-execute-stuck 完整元信息（route='/chat/p104-execute-stuck' / group='polya' / label='P-104 阶段③ 卡死5问 + KNOWLEDGE_FALLBACK'），其余 16 项写元信息壳（label + group + 占位 route），initialMessages/responses 留空数组（Batch 3 填）

B. stores 层
- src/stores/useConversationStore.ts：完整实现 SPEC §6 / §8.2 字段；用 Zustand 5 syntax（create<State>()((set) => ({...}))）；reset() 在 loadScenario 入口先调
- src/stores/usePreviewStore.ts：扩展 Batch 1 版本，加 forceSignal + setForceSignal

C. UI 原子组件（无依赖到 store / route）
- LatexRender / SubProblemBadge / InsightPointPill / PhaseSignalBadge / ImageButton（三态）/ OcrErrorButton / LongConversationToast
- 每个组件 ≤ 80 行，单一职责
- 视觉风格参考 SPEC §3（暖色 + 现代学习风），具体细节 subagent 拍板但要在主题 token 内取色

D. UI 组合组件
- ChatBubble / ChatInput / Sidebar / PolyaTopBar（双层顶栏，PRD §6 P-104 mockup 严格还原）/ KnowledgeCard（done + partial blocked 两形态走同一组件，通过 props 切）

E. DevToolbar 完整版
- 右下角 fixed 面板，可折叠（默认展开）
- 5 个 group 分组下拉：auth / upload / polya / card-overlay / admin
- 当前 scenario label 显示在顶部
- 流速档位 3 button toggle
- "强制下一信号" 5 button（COMPLETED / STAY / ESCALATE / SUB_PROBLEM_DONE / PROBLEM_BLOCKED）
- "重置当前 scenario" 按钮 → useConversationStore.reset() + 重新 loadScenario(currentId)
- 切 scenario 时：用 react-router navigate 到 scenarios[id].route + 同步 useConversationStore.loadScenario(scenarios[id])

F. Routes & App
- src/routes/chat/ChatLayout.tsx：左侧边栏 + 右主区域；按 useConversationStore.currentPhase 决定主区域内容
- src/routes/chat/P104Phase.tsx：渲染 PolyaTopBar + 消息列表 + ChatInput；ChatInput.onSubmit 触发 fakeLlmStream 消费 scenario.responses 队列
- src/App.tsx：加路由 `/chat/:scenarioId` → P104Phase；其余路由 Batch 3 加

验收清单（subagent 完成前自跑）：
[ ] cd doc/UI设计 && pnpm typecheck 全绿
[ ] cd doc/UI设计 && pnpm build 全绿
[ ] cd doc/UI设计 && pnpm dev 后台起；curl http://localhost:5173/chat/p104-execute-stuck 取 HTML 确认 root mount
[ ] 杀 dev server

返回内容：
1. 创建 / 修改文件清单（带绝对路径）
2. p104-execute-stuck fixture 的 responses 数组（完整 JSON）
3. pnpm typecheck / build 输出尾部
4. 任何对 SPEC 的偏离 + 理由

禁止（同 Batch 1）。
```

**Verification（主线程跑）：**

- [ ] **Step 2.1: 派 subagent 执行**

- [ ] **Step 2.2: 抽检改动范围** — `git status -s` 应只在 `doc/UI设计/` 下。

- [ ] **Step 2.3: 自跑构建验收**

```bash
cd doc/UI设计 && pnpm typecheck && pnpm build && cd ../..
```

- [ ] **Step 2.4: 浏览器手测 p104-execute-stuck**

```bash
cd doc/UI设计 && pnpm dev
```

打开 `http://localhost:5173/chat/p104-execute-stuck` → 应能看到：
- 顶栏：「小问 1/1 · 阶段：拟定计划 → 执行 · 破题点 0 → 1」（随对话推进切换）
- 5 轮 user 输入后能完整看到从 STAY → 卡死 → 5 问探路 → KNOWLEDGE_FALLBACK 升级的完整流
- DevToolbar 右下角可切流速 / 强制信号 / 重置
- LaTeX 题目渲染正确

- [ ] **Step 2.5: Read 抽检关键文件**

- `src/mock/types.ts` — 字段命名对齐主项目
- `src/mock/messages/p104-execute-stuck.ts` — fixture 完整度
- `src/components/PolyaTopBar.tsx` — 双层顶栏对照 PRD §6 mockup
- `src/stores/useConversationStore.ts` — actions 完整 + reset 时机正确

- [ ] **Step 2.6: 报告 + 等 muzi 评审 ok**

- [ ] **Step 2.7: Commit Batch 2**

```bash
git add doc/UI设计/
git commit -m "$(cat <<'EOF'
feat(ui-hifi): core components + mock engine + p104-execute-stuck E2E（Batch 2）

落地 17 scenario 注册表骨架 + 1 个最复杂 scenario 端到端跑通（卡死 5 问 +
KNOWLEDGE_FALLBACK 升级），含 13 个 UI 组件、fakeLlmStream、useConversationStore
镜像主项目 B4 双层循环字段、DevToolbar 完整版。剩 16 scenario fixtures 留 Batch 3。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3 — Batch 3：剩余 16 scenarios + admin + 登录 + README + 手测 checklist

**前置条件：** Batch 2 已 commit。

**Files：**

Create（~35 个）：
- `doc/UI设计/src/mock/messages/login.ts`
- `doc/UI设计/src/mock/messages/p101-empty.ts`
- `doc/UI设计/src/mock/messages/p102-upload.ts`
- `doc/UI设计/src/mock/messages/p103-multi.ts`
- `doc/UI设计/src/mock/messages/p103-single.ts`
- `doc/UI设计/src/mock/messages/p104-understand-oos.ts`
- `doc/UI设计/src/mock/messages/p104-plan-deviation.ts`
- `doc/UI设计/src/mock/messages/p104-execute-multi-sub.ts`
- `doc/UI设计/src/mock/messages/p104-review.ts`
- `doc/UI设计/src/mock/messages/p105-card-done.ts`
- `doc/UI设计/src/mock/messages/p105-card-partial.ts`
- `doc/UI设计/src/mock/messages/p106-swap.ts`
- `doc/UI设计/src/mock/messages/history-resume.ts`
- `doc/UI设计/src/mock/messages/long-conversation.ts`
- `doc/UI设计/src/mock/messages/admin-list.ts`
- `doc/UI设计/src/mock/messages/admin-detail.ts`
- `doc/UI设计/src/mock/conversations.ts`（侧边栏 + admin 列表共用）
- `doc/UI设计/src/routes/LoginRoute.tsx`
- `doc/UI设计/src/routes/chat/P101Empty.tsx`
- `doc/UI设计/src/routes/chat/P102Upload.tsx`（overlay）
- `doc/UI设计/src/routes/chat/P103MultiQuestion.tsx`
- `doc/UI设计/src/routes/chat/P103SingleQuestion.tsx`
- `doc/UI设计/src/routes/chat/P105Card.tsx`
- `doc/UI设计/src/routes/chat/P106SwapConfirm.tsx`（overlay）
- `doc/UI设计/src/routes/chat/HistoryResume.tsx`
- `doc/UI设计/src/routes/chat/LongConversation.tsx`
- `doc/UI设计/src/routes/admin/AdminLayout.tsx`
- `doc/UI设计/src/routes/admin/ConversationList.tsx`
- `doc/UI设计/src/routes/admin/ConversationDetail.tsx`
- `doc/UI设计/public/mock-images/sample-quadratic.svg`（占位题目截图，自绘 SVG，~3 张不同题型）
- `doc/UI设计/public/mock-images/sample-geometry.svg`
- `doc/UI设计/public/mock-images/sample-non-math.svg`（用于 OOS scenario）
- `doc/UI设计/README.md`

Modify：
- `doc/UI设计/src/mock/scenarios.ts`（把 Batch 2 留的 16 个 fixture 占位填实 + initialMessages/responses）
- `doc/UI设计/src/App.tsx`（加全部路由：`/login`, `/chat`（P-101）, `/chat/:scenarioId`, `/admin`, `/admin/:conversationId`）
- `doc/UI设计/src/components/DevToolbar.tsx`（确认所有 17 scenario 均出现在下拉，分组完整）

**Subagent dispatch（model: sonnet / subagent_type: general-purpose / foreground，可考虑 run_in_background=true 因为耗时长）：**

```
你是引思助手项目的前端落地 subagent，model = sonnet 4.6。

任务：为 doc/UI设计/ 子项目落地 Batch 3：剩余 16 个 scenario fixtures + 全部 routes + admin + 登录 + README + 手测 checklist 全部填齐，DevToolbar 切 17 scenario 任一项均可视化。

前置条件：
- Batch 2 已提交（核心组件 + mock 引擎 + p104-execute-stuck 端到端跑通）
- p104-execute-stuck 作为最复杂 scenario 的 fixture 模式，其余 16 个按相同结构写

依据文档（按需查）：
1. /Users/muzi/Project/elicit/doc/UI设计/SPEC.md 全文（§4 17 scenario 清单 → PRD 锚点是首要参考）
2. /Users/muzi/Project/elicit/doc/PRD/PRD_v0.1_MVP.md §6 页面清单 + §7 用户故事 + §8 Agent 行为 + §10 边界
3. /Users/muzi/Project/elicit/doc/详细设计/详细设计_v0.1_MVP.md §14.4 E1~E14 剧本（fixture 内容直接复用剧本 USER + AGENT 文案）
4. /Users/muzi/Project/elicit/doc/需求分析/需求分析_v0.1_MVP.md TC-001~TC-032（验收用例参考）

强制约束（同 Batch 1/2）：
- 只在 doc/UI设计/ 内修改
- TS 字段命名对齐主项目
- 不引后端包
- 不写自动化测试
- 不动 Batch 1/2 已落地的核心组件（除非发现 bug 才修，并在报告中标注）

fixture 内容指引（subagent 自由发挥但必须覆盖以下分支要点）：

1. login：邮箱密码 form，含 ① 空 ② 输错密码 ③ 输错邮箱格式 ④ 成功跳 P-101 四态切换（无需真路由跳，UI 切态即可）
2. p101-empty：空对话页，图片按钮 active 状态高亮；点击 → 跳 p102-upload
3. p102-upload：浮层「拍照」「相册」二选一 + 选完后预览图 + 「确认上传」「取消」；预览图用 public/mock-images/sample-quadratic.svg
4. p103-multi：OCR 出 3 题列表（LaTeX 渲染），单选 + 「识别错误」按钮回 p102；选确认后跳 p104-understand
5. p103-single：OCR 出 1 题直接 placement = 高亮 + 「确认」
6. p104-understand-oos：上传非数学图（sample-non-math.svg）→ Agent 礼貌拒答："这看起来不像数学题哦，要不换一张？" + 输入框可点「换一张」回 p102
7. p104-plan-deviation：在阶段②妹妹说出与方法无关的话 → Agent 引回 "嗯先回到刚才的方向上：（复述方法）"
8. p104-execute-multi-sub：题目含 (1)(2)(3) 三小问，PolyaTopBar 顶栏顺序显示 "小问 1/3 → 2/3 → 3/3"；切换时触发 sub_problem_changed toast 1.5s 浮现
9. p104-review：阶段④妹妹答了回顾问题 → Agent 推 P-105 卡片
10. p105-card-done：完整知识点卡片（题目摘要 + 知识点 list + 思路步骤 list + 「再来一题」）
11. p105-card-partial：含「未突破点」徽标的卡片，blocked 状态用 signal-blocked 颜色提示
12. p106-swap：已确认题目后点图片按钮 → 弹浮层 "换一道题吗？" + 「换一道」「取消」；点换一道模拟新会话跳转
13. history-resume：进入一个 conversation_id 已完成的会话，图片按钮置灰 disabled；消息历史完整渲染
14. long-conversation：上方 toast「对话已较长，建议新建对话」+ 消息列表 50+ 条
15. admin-list：跨用户会话列表 table，列 = 用户邮箱 / 题目摘要 / 当前阶段 / 创建时间 / 操作（查看详情）
16. admin-detail：单会话只读详情，不脱敏（P9），含完整消息历史 + 知识点卡片 + 题目图（占位）

视觉细节：
- 全 17 scenario 共享 ChatLayout 左侧边栏（Sidebar 组件），admin 是独立 AdminLayout
- 浮层（P-102 / P-106）用 fixed 全屏遮罩 + 中央卡片
- Sidebar 「新建对话」按钮在 p101-empty 时高亮，其余时段常态

文件清单（创建以下文件，路径必须精确，~35 个）：
[见 PLAN.md Task 3 - Files 节，按序创建]

修改：
- src/mock/scenarios.ts：填齐 16 个 fixture（initialMessages + responses + initialConversation）
- src/App.tsx：加全部路由
- src/components/DevToolbar.tsx：确认 17 scenario 全列

README.md 内容（最后写）：
- # 引思助手 UI 高保真原型
- 跑法（pnpm install / pnpm dev / 浏览器 5173）
- 17 scenario 手测 checklist（每行一项 + 关键检查点）
- 与主项目的映射表（抄 SPEC §11）
- 已知限制（抄 SPEC §0 + §12 非目标）
- 与 SPEC.md / PLAN.md 的关系

验收清单：
[ ] pnpm typecheck 全绿
[ ] pnpm build 全绿
[ ] 17 scenario 任一切换均不抛 console error
[ ] DevToolbar 流速档位 + 强制信号在每个 scenario 下都可用（部分 scenario 如 login 强制信号无意义但 UI 不应报错）

返回内容：
1. 全部新增 / 修改文件清单（绝对路径）
2. 17 scenario 手测 checklist（README.md §X 节）的完整内容
3. pnpm typecheck / build 输出尾部
4. 任何对 SPEC 偏离 + 理由

禁止（同 Batch 1/2）。
```

**Verification（主线程跑）：**

- [ ] **Step 3.1: 派 subagent 执行（可考虑 run_in_background=true）**

- [ ] **Step 3.2: 抽检改动范围** — `git status -s` 应只在 `doc/UI设计/` 下。

- [ ] **Step 3.3: 自跑构建验收**

```bash
cd doc/UI设计 && pnpm typecheck && pnpm build && cd ../..
```

- [ ] **Step 3.4: 浏览器手测全 17 scenario**

```bash
cd doc/UI设计 && pnpm dev
```

按 README.md 手测 checklist 逐项过；每项至少：
- DevToolbar 切换到该 scenario，不报 console error
- 关键 UI 元素 visible（按 SPEC §4 表的「关键 UI 元素 / 分支要点」列）
- 流式响应正常（如适用）

- [ ] **Step 3.5: 主线程 Read 抽检 4 个文件**

- `README.md` — 手测 checklist 完整度
- `src/mock/scenarios.ts` — 17 项全部 initialMessages / responses 非空（admin/login 除外）
- `src/routes/admin/ConversationDetail.tsx` — P9 不脱敏
- `src/routes/chat/P102Upload.tsx` — 浮层关闭机制 + 拍照/相册切换

- [ ] **Step 3.6: 报告 + 等 muzi 评审 ok**

- [ ] **Step 3.7: Commit Batch 3 + 更新项目状态文档**

```bash
git add doc/UI设计/
git commit -m "$(cat <<'EOF'
feat(ui-hifi): 完整 17 scenario + admin + 登录 + README（Batch 3）

补齐剩余 16 个 scenario fixtures、登录页、家长后台只读两页、README 含手测
checklist。doc/UI设计/ 子项目 17 个分支场景全部可视化，作为实施期把组件抄回主
项目的视觉/交互参照基线。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

更新 `doc/_项目状态.md`：
- §1 表加一行「UI 高保真原型 v0.1 | ✅ 已落地 | doc/UI设计/ | 17 scenarios + DevToolbar 切分支」
- §7 「下个会话第一步建议」补一句「实施期可参照 doc/UI设计/ 抄组件 → 实施落地」

---

## 风险 / 回滚预案

| 风险 | 触发条件 | 应对 |
| --- | --- | --- |
| Tailwind v4 与 Vite 6 装不上 | Batch 1 pnpm install 报 peerDep error | subagent 改用 Tailwind v3 + `tailwind.config.ts`，并在 SPEC §3 / 本 PLAN 头部修订记录注明 |
| Tailwind v4 alpha→stable API 漂移 | 主项目升级 v4 stable 后子项目语法差异 | 子项目锁 `package.json` 版本号；主项目升级时同步 PR |
| KaTeX 与 React 19 不兼容 | LatexRender 报错 | 退到 `react-katex@^3` 或自写 HTML 字符串注入包装（fixture 内容由 SPEC 控制） |
| Batch 2 写到一半发现 SPEC 字段命名跟主项目实际有出入 | 主项目 ElicitGraphStateSchema.ts 与 SPEC §8.2 表述不一致 | 优先以主项目源码为准，回头修 SPEC §8.2 + 本 PLAN，再继续 Batch 2 |
| Subagent 在 Batch 3 把 p104-execute-stuck fixture 改坏 | 报告中提到改动 Batch 2 文件 | 主线程评审时拒绝 / 要求恢复 |
| 17 scenarios 累积让 bundle 过大 | pnpm build 产物 >5MB | 接受（设计原型，非生产）；如真过 10MB 考虑动态 import |

---

## Self-Review

**1. Spec coverage：**

- SPEC §0 边界 → 全 plan 强制约束章节覆盖 ✅
- SPEC §1 文档元信息 → PLAN 头部 ✅
- SPEC §2 G1~G5 → Task 1/2/3 共同贡献 ✅
- SPEC §3 技术选型 → Task 1 package.json + vite.config.ts + tsconfig.json ✅
- SPEC §4 17 scenarios → Task 2（1 个）+ Task 3（16 个）✅
- SPEC §5 目录结构 → Task 1/2/3 文件清单覆盖 ✅
- SPEC §6 数据流 → Task 2 stores + DevToolbar + P104Phase ✅
- SPEC §7 组件清单 → Task 2 全部组件 ✅
- SPEC §8 mock 引擎契约 → Task 2 types.ts + scenarios.ts + fakeLlmStream ✅
- SPEC §9 错误处理 → Task 2 LatexRender errorColor + Scenario not found 兜底 ✅
- SPEC §10 验收基线 → 每 Task 的 Verification 节 ✅
- SPEC §11 与主项目映射 → README（Batch 3）✅
- SPEC §12 非目标 → 强制约束节明确不引入 ✅
- SPEC §13 风险 → 本 PLAN 风险预案表 ✅

**2. Placeholder scan：**

无 TBD / TODO / "implement later"。每个 subagent prompt 文件清单都列了精确路径。fixture 内容指引每项都有"覆盖以下分支要点"的具体描述。✅

**3. Type / 命名 / 接口一致性：**

- `useConversationStore` 的 actions 名（loadScenario / reset / appendUserMessage / appendAgentChunk / finalizeAgentMessage / advancePhase / addInsightPoint / switchSubProblem / emitKnowledgeCard）— Task 2 定义 + Task 3 消费，名称一致 ✅
- Scenario 字段（id / group / label / prdAnchor / route / initialConversation / initialMessages / responses）— SPEC §8.1 + Task 2 types.ts + Task 3 scenarios.ts，一致 ✅
- 5 信号枚举（COMPLETED / STAY / ESCALATE / SUB_PROBLEM_DONE / PROBLEM_BLOCKED）— PhaseSignalBadge + DevToolbar 强制信号 + AgentResponse.signalAtEnd，一致 ✅

无须修订。

---

## Execution Handoff

Plan 已落 `doc/UI设计/PLAN.md`。两个执行选项：

**1. Subagent-Driven（推荐 — 与用户级 CLAUDE.md「落地代码必须派 subagent」硬规则对齐）**

- 主线程派 Sonnet subagent 跑 Task 1 → 评审 + commit → 派 Task 2 → 评审 + commit → 派 Task 3 → 评审 + commit
- 每 Task 后跟 muzi 报告 + 等 muzi 一句「ok」才推进下一 Task

**2. Inline Execution**

- 不适用：用户级 CLAUDE.md 明确「主线程 Claude 不直接动手写/改代码」。
