# 引思助手 UI 高保真原型

数学笔记本 × 编辑式美学的聊天辅导界面原型，覆盖 17 个 scenario、全部 PRD 页面状态与 Admin 后台。

## 快速启动

```bash
cd doc/UI设计
pnpm install   # 首次安装依赖
pnpm dev       # 启动开发服务器
```

浏览器访问 `http://localhost:5173/`，右下角 DevToolbar 可切换任意 scenario。

```bash
pnpm build     # 生产构建（产物在 dist/）
pnpm typecheck # TypeScript 严格检查
```

---

## 17 Scenario 手测 Checklist

每个 scenario 通过 DevToolbar 选择后，验证以下检查点。

### 登录 (auth)

- [ ] `login`：Fraunces 衬线标题"引思助手"可见；空邮箱提交 → 邮箱格式错误提示（朱砂红）；密码输入非"correct" → 密码错误提示；密码输入"correct" → 成功态（✓ 符号）；全程无大圆角、无 backdrop-blur

### 上传 OCR (upload)

- [ ] `p101-empty`：方格本背景可见；中央大图片上传按钮（虚线边框）可见；底部输入框呈禁用提示"先上传一张题目图片…"；点击上传区出现朱砂边框高亮 + 演示提示文字
- [ ] `p102-upload`：半透明遮罩 (`bg-ink-primary/30`) 叠加在对话区上方；纸面卡片（rounded-md + shadow-paper-lg）包含"拍照"/"相册"二选一按钮；选择一项后显示 `sample-quadratic.svg` 预览图；「确认上传」按钮为深墨蓝（ink-deep）；点击确认显示成功态
- [ ] `p103-multi`：显示 3 道题卡片，罗马数字编号 I/II/III 可见（IBM Plex Mono）；题目间有 `——— ※ ———` 分隔线；选中时卡片边框变朱砂红；「识别错误」按钮可见；「确认选择」在未选时置灰，选后高亮；确认后显示成功态
- [ ] `p103-single`：1 道几何题高亮卡片（双边朱砂边框）；`sample-geometry.svg` 预览图可见；"就这道吗？"文字可见；「确认，开始」按钮为深墨蓝；「重新识别」按钮可见

### Pólya 阶段 (polya)

- [ ] `p104-understand-oos`：顶栏显示阶段① "理解题意"；初始 2 条消息含 agent 礼貌拒答"这看起来不像数学题"；回车 2 次消费完响应队列；不出现数学 LaTeX 公式
- [ ] `p104-plan-deviation`：顶栏显示阶段② "拟定计划"；4 条历史消息含概率题内容；回车模拟偏题后 agent 引回"嗯先回到刚才的方向上"；第 2 次回车后顶栏切换到"执行"阶段（EXECUTE）
- [ ] `p104-execute-stuck`：顶栏显示阶段③"执行" + 破题点数 0；5 次回车后：第 5 次响应为 KNOWLEDGE_FALLBACK 升级，顶栏破题点变为 1，消息内容含"**三参数三条件代入法**"；阶段切换时 `——— ※ ———` 分隔线出现
- [ ] `p104-execute-multi-sub`：顶栏显示"小问 I/III"（罗马数字）；3 道小问响应序列中，第 1 响应后切换到 II/III，第 3 响应后切换到 III/III；第 5 响应后显示知识卡片（三行步骤含罗马数字编号）
- [ ] `p104-review`：顶栏显示阶段④"回顾"；历史消息含 8 条（含展开/配方全过程）；3 次回车后最后一响应显示知识卡片（代数展开主题）；知识卡片标题"知识点 + 思路总结"可见

### 卡片与浮层 (card-overlay)

- [ ] `p105-card-done`：显示完整知识卡片（全 done）；题目摘要首字下沉可见；"涉及知识点"4 项带罗马数字；"解题思路"3 步带罗马数字；"小问进展"1 项 done（绿色勾）；「再来一题」按钮为深墨蓝
- [ ] `p105-card-partial`：知识卡片含"小问进展" 3 项：I 和 II 为 done（绿勾），III 为"（未突破）"（朱砂红/AlertCircle 图标）；III 含 `blockedReason` 文字；整体无报错
- [ ] `p106-swap`：背景是已完成题目的历史对话；全屏半透明遮罩 + 中央纸面卡片；文案"换一道题？这道题会保留在侧边栏"可见；「换一道」为朱砂红按钮；「取消」关闭遮罩；点击换一道后显示成功态 + 提供"返回演示"链接
- [ ] `history-resume`：顶部显示"※ 历史对话（只读）"蓝色横幅；底部输入框灰化（pointer-events-none）；图片按钮为 disabled 态（不可点）；完整 9 条消息历史 + 知识卡片可见；消息列表含阶段分隔线
- [ ] `long-conversation`：顶部显示 LongConversationToast 警示横幅（黄色/朱砂色）；消息计数"共 50 条消息"提示可见；消息列表可正常滚动；DevToolbar 可正常展开

### Admin (admin)

- [ ] `admin-list`：AdminLayout 顶栏含 Fraunces "引思助手 | 家长后台"；"parent@example.com" + 退出按钮可见；Table 含 8 条 mock 数据；罗马数字序号 I~VIII 可见；阶段列显示对应汉字阶段名或"已完成"；「查看」链接可跳转到详情页
- [ ] `admin-detail`：通过 admin-list 点击"查看"进入详情；显示会话标题、用户邮箱、阶段、创建时间、消息数；`sample-quadratic.svg` 占位图可见；消息列表正常渲染（若有数据）；知识卡片（若有）正常渲染；「返回列表」链接可返回

---

## 美学说明

本原型遵循"数学笔记本 × 编辑式"美学（SPEC §3），核心三件套：

- **字体**：Fraunces（衬线，标题/阶段名/CTA）× IBM Plex Sans（正文/输入框）× IBM Plex Mono（题号/罗马数字/等宽内容）
- **色彩**：象牙白纸面（`paper-canvas` / `paper-surface` / `paper-deep`）× 深墨水（`ink-primary` / `ink-deep`）× 朱砂红（`vermilion`，批改/强调/CTA）
- **质感**：`rounded-sm`/`rounded-md`（2px/4px 纸张感圆角）× `shadow-paper-*`（内嵌纸张阴影）× `border-ink-line`（浅边线）× `——— ※ ———`（章节分隔装饰）

### 设计原则

| 禁止 | 应当 |
|------|------|
| `rounded-2xl` 大圆角 | `rounded-sm` / `rounded-md` |
| `shadow-lg` | `shadow-paper-sm/md/lg` |
| emoji 装饰 | `≡` / `※` / 「」/ 罗马数字 |
| backdrop-blur 毛玻璃 | 纯纸面（不透明） |
| 渐变色背景 | 纯象牙白纸面 |

---

## 与主项目映射

| 原型 Route | 主项目组件/逻辑 |
|---|---|
| `/chat/:id` → P104Phase | `src/agents/graphs/ChatGraph.ts` + `useConversation` store |
| `ChatLayout` 侧边栏 | `elicit_conversations` 表 + ConversationMapper |
| `P105Card` 知识卡片 | `emitKnowledgeCard` 信号 + REVIEW 阶段 agent |
| `P102Upload` 浮层 | `OssService.getUploadSignInfo` + OCR `ocrNode` |
| `P106SwapConfirm` 换题 | `conversationNode` 新建行 + `data-custom` chunk |
| `AdminLayout` | 独立 admin 路由（主项目未实现，原型先行） |
| `DevToolbar` | 开发专用，主项目不存在 |
| `SCENARIOS` 注册表 | 对应主项目 ElicitGraphStateSchema 字段 |

---

## 已知限制

（对应 SPEC §0 + §12 非目标）

- **无真实网络请求**：所有 Agent 回复为预设 `responses` 队列，通过 `fakeLlmStream` 逐字模拟流式输出
- **无持久化**：页面刷新后 Zustand store 重置，消息不保存
- **LaTeX 本地渲染**：KaTeX 在客户端渲染，与主项目 Markdown 渲染方式有差异
- **图片上传为占位**：P-102 图片预览使用本地 SVG 占位，不触发真实 OCR
- **Admin 数据为 mock**：MOCK_ADMIN_CONVERSATIONS 为硬编码，不来自数据库
- **移动端适配有限**：原型以桌面端（≥1024px）为主要目标

---

## 文件关系

| 文件 | 角色 |
|---|---|
| `SPEC.md` | **产品契约**：场景定义、PRD 锚点、美学规范（不可在原型中修改） |
| `PLAN.md` | **实施计划**：Batch 分解、工作量、完成标志（主线程维护） |
| `README.md`（本文件） | **用户文档**：跑法、checklist、美学说明、与主项目映射 |
| `src/mock/scenarios.ts` | 17 scenario 注册表：id / route / fixture 引用 |
| `src/mock/messages/` | 各 scenario 的 initialConversation / initialMessages / responses |
| `src/components/` | 13 个核心 UI 组件（DevToolbar、KnowledgeCard、PolyaTopBar 等） |
| `src/routes/` | 10 个路由组件（LoginRoute + 7 chat + 3 admin） |
| `src/stores/` | useConversationStore（会话状态）+ usePreviewStore（DevToolbar 状态） |
| `public/mock-images/` | 3 张占位 SVG（二次函数 / 几何 / 非数学） |
