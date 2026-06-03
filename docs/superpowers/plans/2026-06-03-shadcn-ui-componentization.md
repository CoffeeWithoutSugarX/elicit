# shadcn/ui 组件化 + 全站黑白化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把全站色调改为纯黑白灰(shadcn 默认 neutral),补一批常用 shadcn/ui 组件并把现有手写 UI 迁移到组件默认样式,移除自定义公共样式(paper/ink/phase/signal 主题层与 `.icon-button` 等),并清除 `features/chat/` 下 kebab-case 死代码。

**Architecture:** 采用 shadcn/ui 默认 **neutral 黑白主题**,直接用组件默认样式,不再写自定义公共样式。过渡安全策略:**先把 `@theme` 自定义 token 重着色为灰阶**(全站瞬间黑白、零破坏)→ 再逐个把手写控件迁到 shadcn 组件 + 标准 token(`bg-background`/`text-foreground`/`bg-muted`/`border-border`)→ 最后删除无人引用的自定义 token。每步 `pnpm verify` 全绿 + 视觉验收 + 提交。

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4(`@theme`)/ shadcn/ui(CLI,baseColor=neutral)/ class-variance-authority / tailwind-merge / lucide-react / Radix primitives(仅作 shadcn 底层)。

**关键决策与事实(muzi 已拍板):**
- 🎨 **全站纯黑白灰**:Pólya 阶段色 / 信号色**也去色**,状态靠填充/粗细/图标/位置表达(shadcn 组件默认做法),不保留任何彩色强调。
- 🧩 **直接用组件 UI、不写公共样式**:迁移后用 shadcn 组件默认样式 + 标准 token,移除 `bg-paper-*`/`text-ink-*`/`text-phase-*`/`signal-*`/`.icon-button`/`--shadow-paper-*` 等自定义公共样式。
- ✅ shadcn token 兼容层已存在(`globals.css:61-88`),`button.tsx`/`input.tsx` 正常工作——本计划把这层的值改成 neutral 黑白即可。
- ✅ 活的聊天 UI 只在 `src/features/chat/components/`(PascalCase);`src/features/chat/*.tsx`(kebab-case)整套零外部引用 = 死代码,已确认可删。
- ⚠️ `pnpm verify`(typecheck/lint/test)**抓不到视觉回归**。每个迁移 Task 末必须加**视觉验收**(muzi 跑 `pnpm dev` 眼看 或 执行方用 run/verify skill 截图)。
- 🔒 覆盖率 90/90 硬门槛仍生效;改组件若致既有测试断言失败需同步修(**不得弱化断言**)。分支 `feat/mvp-implementation`,禁直接动 main。

---

## Phase 0:全站黑白(快速见效)+ 清死代码

### Task 0.1:把 `@theme` + shadcn 兼容层 token 重着色为 neutral 黑白

**Files:** Modify `src/app/globals.css:5-88`

**策略:** 只改 token 的**值**,不删 token、不改任何组件的 class 名 → 全站立刻变黑白,且零破坏(`bg-paper-canvas`、`text-phase-understand` 等类仍有效,只是解析成灰阶)。

- [ ] **Step 1:把彩色 token 全部改成灰阶/黑白**

在 `globals.css` 中:
- 强调色去蓝:`--color-ink-deep`、`--color-vermilion`、`--color-primary`、`--color-ring`、`--color-sidebar-primary`、`--color-sidebar-ring` 由 `#2563EB` → `#0A0A0A`(近黑);`--color-primary-foreground` 保持 `#FFFFFF`。
- 阶段色去色(统一灰阶,用深浅区分即可):`--color-phase-understand/plan/execute/review` → 如 `#0A0A0A`/`#404040`/`#737373`/`#A3A3A3`(或全设 `#525252`,留待组件用填充表达 active)。
- 信号色去色:`--color-signal-completed/stay/escalate/done/blocked` → 灰阶(如 `#0A0A0A`/`#525252`/`#737373`…);**注意 `destructive` 例外**——错误态可保留可去色,本次按全黑白:`--color-destructive` → `#0A0A0A`(纯黑白方案),`--color-destructive-foreground: #FFFFFF`(补此缺失 token)。
- paper/ink 中性色已是灰阶,保持不变(canvas 白 / ink 黑灰)。

- [ ] **Step 2:`pnpm verify` 全绿**

Run: `pnpm verify`
Expected:全绿(只改值,不影响类型/测试;若测试硬断言了某十六进制颜色——不太可能——同步更新)。

- [ ] **Step 3:视觉验收** — muzi 跑 `pnpm dev` 确认全站已是黑白灰、无残留蓝/彩色,阶段条/信号标签仍能区分(靠深浅/填充)。

- [ ] **Step 4:Commit**
```bash
git add src/app/globals.css && git commit -m "style(ui): 全站色调改为 neutral 黑白灰(去蓝/去阶段·信号彩色)"
```

### Task 0.2:删除 kebab-case 死代码

**Files:** Delete `src/features/chat/{chat-conversation,chat-header,chat-input,chat-message,chat-screen,chat-history-conversation}.tsx`

- [ ] **Step 1:复核零外部引用**
```bash
for f in chat-conversation chat-header chat-input chat-message chat-screen chat-history-conversation; do
  echo "== $f =="; grep -rn "$f" src --include="*.tsx" --include="*.ts" | grep -v "features/chat/$f.tsx" | grep -v __tests__
done
```
Expected:仅这 6 文件互相 import,无 `src/app/**`、无活的 `components/**`。否则停下报告 muzi。
- [ ] **Step 2:删除 6 个文件**;同样复核 `src/features/chat/components/SectionDivider.tsx` 零引用则一并删。
- [ ] **Step 3:`pnpm verify` 全绿**
- [ ] **Step 4:Commit** `chore(ui): 删除 features/chat 下零引用的 kebab-case 死代码`

---

## Phase 1:Scaffold shadcn 组件(neutral)

### Task 1.1:确认 baseColor=neutral 并批量 add

**Files:** Create `src/components/ui/{textarea,card,badge,avatar,dialog,table,tooltip,sonner,separator,dropdown-menu}.tsx`(CLI 生成);可能改 `components.json`

- [ ] **Step 1:确认 `components.json` 的 `tailwind.baseColor` = `neutral`**;若不是,改成 `neutral`(对齐黑白方向)。
- [ ] **Step 2:批量 add**
```bash
pnpm dlx shadcn@latest add textarea card badge avatar dialog table tooltip sonner separator dropdown-menu
```
（`dropdown-menu`/`separator` 当前无活落点,scaffold 备用;muzi 要最小化可去掉。网络失败则报告——registry 走 github/npm,不在 dashscope/deepseek 直连规则内。）
- [ ] **Step 3:`pnpm verify` 全绿**

注:`vitest.config.ts` 的 coverage `include` 仅 `src/**/*.ts`(**不含 `.tsx`**),且测试环境 `environment: 'node'` 无 DOM——shadcn `.tsx` 组件**不计入覆盖率**(现有 button/input 同理),故**无需写冒烟测试**(写了也不计、node 环境也渲染不了)。生成组件只需 typecheck / lint / 既有 594 测试全绿。若报 unknown token → 回 Task 0.1 补(如 `--color-destructive-foreground`);若生成组件含 `any`/裸 `Function` 致 lint error → 补真实类型,**禁 eslint-disable**。
- [ ] **Step 4:Commit** `feat(ui): scaffold 一批 neutral shadcn 组件`

---

## Phase 2:迁移现有手写 UI → shadcn 组件默认样式

> 通用要求(每个 Task):① Read 目标文件,保留全部行为与中文注释;② **改用 shadcn 组件默认样式 + 标准 token**,移除手写 `bg-paper-*`/`text-ink-*`/`text-phase-*`/`signal-*` 等自定义类,语义状态用**填充/粗细/图标/位置**表达(全灰阶);③ `pnpm verify` 全绿;④ **视觉验收**(muzi 看对应界面或截图);⑤ 单独 commit。未过视觉验收不进下一 Task。

### Task 2.1:ChatInput → Textarea + Button
**Files:** Modify `src/features/chat/components/ChatInput.tsx`
- [ ] `<textarea>` → `<Textarea>`(保留 ref/value/onChange/onKeyDown/onInput/自适应高度/disabled);发送/移除图片按钮 → `<Button>`(发送用 default、图片用 `variant="ghost" size="icon"`);移除 paper 类改用组件默认。
- [ ] verify → 视觉验收 → commit `refactor(ui): ChatInput 迁移到 shadcn Textarea/Button`

### Task 2.2:KnowledgeCard → Card
**Files:** Modify `src/features/chat/components/KnowledgeCard.tsx`
- [ ] 容器 → `Card/CardHeader/CardContent/CardFooter`,按钮 → `Button`,移除自定义阴影/纸面类。
- [ ] verify → 视觉验收 → commit `refactor(ui): KnowledgeCard 迁移到 shadcn Card`

### Task 2.3:PhaseSignalBadge / PolyaTopBar → Badge(灰阶)
**Files:** Modify `src/features/chat/components/PhaseSignalBadge.tsx`、`PolyaTopBar.tsx`
- [ ] chip/标签 → `<Badge>`;**信号/阶段全用灰阶**:active 用 `variant="default"`(黑底白字)、非 active 用 `variant="secondary"`/`outline`(灰);PolyaTopBar 当前阶段用填充黑点 + 加粗,非当前灰,**不用彩色**;移除 `--color-phase-*`/`signal-*` 类引用。
- [ ] verify → 视觉验收 → commit `refactor(ui): 阶段/信号标签迁移到 shadcn Badge(灰阶)`

### Task 2.4:头像 → Avatar
**Files:** Modify `src/features/chat/components/ChatBubble.tsx`、`Sidebar.tsx`(及其它 `rounded-full` 头像)
- [ ] 引/妹头像 → `<Avatar><AvatarFallback>引/妹</AvatarFallback></Avatar>`,黑白配色(黑底白字或灰底)。
- [ ] verify → 视觉验收 → commit `refactor(ui): 聊天头像迁移到 shadcn Avatar`

### Task 2.5:模态 → Dialog
**Files:** Modify `src/features/chat/components/OcrResultMessage.tsx`(若为真模态)、`src/features/auth/login-screen.tsx`
- [ ] `fixed inset-0` 手写遮罩 → `Dialog/DialogContent`,保留选题/登录逻辑;OcrResultMessage 若是内联卡片非模态则跳过、仅迁 login-screen 并在 commit 注明。
- [ ] verify → 视觉验收 → commit `refactor(ui): 模态迁移到 shadcn Dialog`

### Task 2.6:admin 表格 → Table
**Files:** Modify `src/app/admin/page.tsx`
- [ ] 原生 `<table>…<th>` → `Table/TableHeader/TableBody/TableRow/TableHead/TableCell`(保留 5 列),操作按钮 → `Button`。
- [ ] verify → 视觉验收 → commit `refactor(ui): admin 会话表迁移到 shadcn Table`

### Task 2.7:sendError 横幅 → Sonner toast
**Files:** Modify `src/app/layout.tsx`(挂 `<Toaster />`)、`src/app/chat/page.tsx`、`src/app/chat/[conversationId]/page.tsx`、(可选)`src/stores/useConversation.ts`
- [ ] 根 layout 挂 `<Toaster />`;两页手写红横幅 → `useEffect(()=>{ if(sendError) toast.error(sendError) },[sendError])`,移除横幅 JSX 与关闭按钮;**toast 用默认(黑白)样式**;若 `sendError`/`clearSendError` 被测试覆盖则同步更新(不弱化断言)。
- [ ] verify → 视觉验收(触发一次发送失败看 toast)→ commit `refactor(ui): 错误提示迁移到 sonner toast`

### Task 2.8:title= 图标按钮 → Tooltip
**Files:** Modify `src/features/chat/components/{ImageButton,PolyaTopBar,Sidebar,ChatInput}.tsx`、根 layout 加 `TooltipProvider`
- [ ] `title=` 图标按钮 → `Tooltip/TooltipTrigger/TooltipContent`,移除原生 `title`,保留 `aria-label`。
- [ ] verify → 视觉验收(hover 看 tooltip)→ commit `refactor(ui): 图标按钮 title 迁移到 shadcn Tooltip`

---

## Phase 3:清理自定义公共样式 + 总验收

### Task 3.1:删除已无人引用的自定义 token / 工具类
**Files:** Modify `src/app/globals.css`
- [ ] **Step 1:逐个确认无组件再引用**(迁移完成后):
```bash
for t in paper-canvas paper-surface paper-deep ink-primary ink-secondary ink-muted ink-line ink-deep vermilion phase-understand phase-plan phase-execute phase-review signal-completed signal-stay signal-escalate signal-done signal-blocked shadow-paper icon-button small-icon; do
  echo "== $t =="; grep -rn "$t" src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v globals.css
done
```
- [ ] **Step 2:删除零引用的 `@theme` 自定义 token 与 `.icon-button`/`.small-icon` 工具类**;仍被引用的暂留并记 TODO。保留 shadcn 标准 token 兼容层(neutral 值)。
- [ ] **Step 3:`pnpm verify` 全绿 + 视觉无回归** → Commit `chore(ui): 移除迁移后无人引用的自定义主题 token 与工具类`

### Task 3.2:全量总验收
- [ ] `pnpm verify` 全绿(typecheck 0 / lint 0 / 594+ tests / 覆盖率 ≥90/90)
- [ ] muzi 完整走查:新建会话 → 发带图消息 → OCR 选题 → 流式回答 → 知识卡片 → admin 表格 → 失败 toast,逐屏确认**纯黑白灰一致、无残留彩色/错位/掉色**。
- [ ] 决定是否 push + 开 PR。

---

## Verification 策略
| 层 | 手段 | 何时 |
|---|---|---|
| 功能/类型/lint/覆盖率 | `pnpm verify` | 每个 Task 末 |
| **视觉回归(含"是否真黑白")** | `pnpm dev` 人工 / run skill 截图 | **每个 Phase 0.1 & Phase 2 Task 末(强制)** |

## Self-Review(已自查)
- **Spec 覆盖:** 黑白化(Task 0.1 重着色 + 2.3/2.7 灰阶 + 3.1 清理)✓;补组件(1.1)✓;迁移现有 UI 到组件默认(2.1–2.8)✓;移除自定义公共样式(3.1)✓;清死代码(0.2)✓。
- **过渡安全:** 先重着色(零破坏全站黑白)→ 再迁移 → 最后删 token,每步 verify 绿且可发布,避免"删 token 致全站 unknown utility"。
- **占位符扫描:** 迁移任务给"文件+目标组件+保留契约+验收+commit",bespoke 部分(token 灰阶值、shadcn add 命令、死代码/清理 grep)具体;精确编辑在执行时读文件产出,遵守"保留行为+全灰阶"契约。
- **一致性:** 路径/组件名与调查一致;`dropdown-menu`/`separator` 无活落点已标"备用"。
