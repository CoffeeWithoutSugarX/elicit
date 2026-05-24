# 代码审查 Checklist — elicit 项目

> 本文件为 `code-review` skill 的机器可读索引，供审查流程 Step 2-4 消费。
> 人工阅读也可做快查表使用。

---

## §1 文件→分类映射

| 路径 glob | 层级 | 适用分类 |
|-----------|------|----------|
| `src/features/**/*.tsx` | Feature 组件 | A B C D E |
| `src/components/**/*.tsx` | 共享组件 | A B C D E |
| `src/stores/**/*.ts` | Zustand Store | A B C F |
| `src/services/**/*.ts` | 服务层 | A B C |
| `src/services/api-client/**/*.ts` | API 客户端 | A B C |
| `src/lib/**/*.ts` | 工具库 | A B C |
| `src/types/**/*.ts` | 类型定义 | B C |
| `src/types/enums/**/*.ts` | 枚举定义 | B（子集：B-04 B-08 B-09 B-10） |
| `src/db/schema/**/*.ts` | Drizzle Schema | B C G |
| `src/db/mappers/**/*.ts` | 数据映射（服务端） | A B C G |
| `src/db/models/**/*.ts` | 数据模型（客户端） | A B C G |
| `src/app/api/**/*.ts` | API 路由 | A B C H |
| `src/agents/nodes/**/*.ts` | Agent 节点 | A B C I |
| `src/agents/graphs/**/*.ts` | Agent 图定义 | A B C I |
| `src/agents/schemas/**/*.ts` | Agent Schema | B C I |
| `src/agents/models/**/*.ts` | Agent 模型配置 | B C I |
| `src/agents/prompt/**/*.ts` | Agent Prompt | B C I |
| `src/app/globals.css` | 全局样式 | E |

---

## §2 自动 Grep 模式表

> 审查 Step 3 依次执行以下 grep。命中即记为 finding，人工判读列标 `auto` 的直接记录，标 `判读` 的需结合上下文确认。

### A — 导入与模块边界

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| A-01 | `grep -n "from\s\+['\"]\\.\\./" {file}` | 全部 .ts/.tsx | 🔴 | 判读 | 禁止跨目录相对导入；同目录 `./` 允许 |
| A-02 | `grep -n "from\s\+['\"]@/db/mappers\|from\s\+['\"]@/db/index" {file}` 且文件内无 `import.*server-only` | 消费 DB 的文件 | 🔴 | auto | 使用服务端模块但缺 `server-only` 导入 |
| A-03 | 文件含 `"use client"` 且 `grep -n "from\s\+['\"]@/db/mappers\|from\s\+['\"]@/db/index" {file}` 有命中 | .tsx | 🔴 | auto | 客户端文件导入服务端模块 |
| A-04 | `grep -n "createClient" {file}` | 全部（豁免 `src/db/supabase/supabase.ts`、`src/lib/auth.ts`） | 🔴 | auto | Supabase 客户端必须用单例，禁止分散实例化 |

### B — TypeScript 合规

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| B-01 | `grep -n ":\s*any\b" {file}` | 全部 .ts/.tsx | 🔴 | auto | 禁止 `any` 类型注解 |
| B-02 | `grep -n "as\s\+any\b" {file}` | 全部 .ts/.tsx | 🔴 | auto | 禁止 `as any` 断言 |
| B-03 | `grep -n "\.then(" {file}` | 全部 .ts/.tsx | 🔴 | 判读 | 禁止 `.then()` 链，必须用 async/await；第三方库回调除外 |
| B-04 | `grep -n "\benum\s\+[A-Z]" {file}` | 全部 .ts/.tsx | 🔴 | auto | 禁止 TS `enum` 关键字，用 `as const` + `createEnum()` |
| B-05 | `grep -n "catch\s*([^)]*)\s*{\s*}" {file}` | 全部 .ts/.tsx | 🔴 | auto | 禁止空 catch 块 |
| B-06 | `grep -n "^\s*\(export\s\+\)\?type\s\+[A-Z]\w*\s*=\s*['\"]" {file}` | 全部（豁免 `src/types/enums/`） | 🔴 | 判读 | 字面量联合枚举应收归 enums 目录 |
| B-07 | `grep -n "as\s\+const" {file}` 且文件不在 `src/types/enums/` 且模式形如枚举对象 | 全部（豁免 `src/types/enums/`） | 🔴 | 判读 | `as const` 枚举对象应收归 enums 目录 |
| B-10 | `grep -n "Record<.*,\s*string>\s*=" {file}` | 全部（豁免 `src/types/enums/`） | 🔴 | 判读 | 禁止在 enums 外自维护 label 映射，用 `createEnum().getLabel()` |
| B-11 | 文件在 `src/app/api/` 且缺少 Zod / 类型校验 | API 路由入参 | 🟡 | 判读 | API 边界建议做运行时入参校验 |

### C — 命名规范

| ID | 检查方式 | 范围 | 严重度 | 判定 | 说明 |
|----|----------|------|--------|------|------|
| C-01 | 文件名非 kebab-case（含大写字母或下划线，`_common.ts` 惯例豁免） | features/ components/ | 🟡 | auto | 组件文件须 kebab-case |
| C-02 | enum 文件名非 `camelCase.enum.ts` 格式 | types/enums/ | 🟡 | auto | 枚举文件命名规范 |
| C-03 | store 文件名缺 `use` 前缀 | stores/ | 🟡 | auto | Store 文件须 `useXxx.ts` |
| C-04 | Props 类名缺 `Props` 后缀 | features/props/ | 🟡 | 判读 | Props 类须 `XxxProps` |
| C-05 | `grep -n "snake_case" {file}` — TS 变量/函数名含下划线 | features/ components/ stores/ lib/ | 🟡 | 判读 | 前端代码禁 snake_case（DB 列映射字段除外） |
| C-06 | DB 列名非 snake_case | db/schema/ | 🔴 | 判读 | DB 列必须 snake_case |
| C-07 | 代码注释为英文 | 全部 | 🟡 | 判读 | 项目惯例为中文注释 |

### D — React / 组件结构

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| D-01 | `grep -n "class\s\+\w\+\s\+extends\s\+\(React\.\)\?Component" {file}` | .tsx | 🔴 | auto | 禁止 class 组件 |
| D-02 | `grep -n "\buseMemo\b\|\buseCallback\b" {file}` | .tsx | 🔴 | auto | React Compiler 已启用，禁止手动 memo |
| D-03 | `grep -n "React\.memo" {file}` | .tsx | 🔴 | auto | React Compiler 已启用，禁止 React.memo |
| D-04 | `grep -n "style={{" {file}` 且含 `color\|background\|border\|font-size\|margin\|padding` | .tsx | 🔴 | 判读 | 禁止内联视觉样式，用 Tailwind 类 |

### E — CSS / Tailwind v4

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| E-01 | `grep -n "#[0-9a-fA-F]\{3,8\}\b" {file}` | .tsx .ts（豁免 `globals.css` 变量定义区、Tailwind 配置） | 🔴 | 判读 | 禁硬编码 hex 色值，用 Tailwind 类或 CSS 变量 |
| E-02 | `grep -n "\.module\.css\|\.module\.scss" {file}` | 全部 import 语句 | 🔴 | auto | 禁 CSS modules，项目只用 Tailwind |
| E-03 | `grep -n "rgb(\|rgba(\|hsl(\|hsla(" {file}` | .tsx（豁免 `globals.css`） | 🔴 | 判读 | 禁组件内硬编码颜色函数 |
| E-04 | `grep -n "className=" {file}` 且存在条件拼接但未用 `cn()` | .tsx | 🟡 | 判读 | 条件 className 应使用 `cn()` 工具函数 |
| E-05 | `grep -n "styled-components\|@emotion" {file}` | 全部 import | 🔴 | auto | 禁 CSS-in-JS 库 |

### F — Zustand Store

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| F-01 | `grep -n "create((" {file}` 且缺类型参数 `create<` | stores/ | 🔴 | 判读 | Store 必须类型化 `create<StoreType>()` |
| F-02 | `grep -n "useStore\b" {file}` 且未用选择器 `(state =>` | 消费 store 的组件 | 🟡 | 判读 | 应使用 selector 避免不必要重渲染 |

### G — 数据库与持久化

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| G-01 | `grep -n "from\s\+['\"]@/db/index\|from\s\+['\"]drizzle" {file}` 且文件无 `import.*server-only` | 全部 | 🔴 | auto | Drizzle 仅限服务端使用 |
| G-02 | `grep -n "from\s\+['\"]@/db/supabase" {file}` | agents/ mappers/ db/schema/ | 🔴 | auto | Supabase 客户端仅限浏览器端 |
| G-03 | `grep -n "from\s\+['\"]@/db/supabase/type" {file}` + `git diff` 显示该文件被手编 | `src/db/supabase/type.ts` | 🔴 | auto | 禁止手编 type.ts，必须 `pnpm supabase:type` 重生成 |
| G-04 | `grep -n "prepare:" {file}` 且值非 `false` | db/index.ts | 🔴 | auto | `prepare: false` 是 Supavisor 兼容必需 |

### H — API 路由

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| H-01 | `grep -n "export\s\+\(async\s\+\)\?function\s\+\(GET\|POST\|PUT\|DELETE\|PATCH\)" {file}` 且文件内无 `withAuth` | app/api/ | 🟡 | 判读 | 认证路由须用 `withAuth()` 包裹 |
| H-02 | `grep -n "Response\.json(" {file}` 且无 `BaseResponse` | app/api/ | 🟡 | 判读 | 应使用 `BaseResponse.ofSuccess/ofError` |
| H-03 | 动态路由文件缺 `await params` | app/api/[*]/ | 🔴 | 判读 | Next.js 16 要求 `const { param } = await params` |

### I — LangGraph / Agent

| ID | grep 命令 | 范围 | 严重度 | 判定 | 说明 |
|----|-----------|------|--------|------|------|
| I-01 | 文件缺 `console.log('` + 节点名 + `invoked` | agents/nodes/ | 🟡 | 判读 | 节点须有标准入口日志 `console.log('XxxNode invoked with ...')` |
| I-02 | 文件缺 `export const \w+Name\s*=` | agents/nodes/ | 🟡 | 判读 | 节点须导出名称常量（如 `export const chatNodeName = 'chatNode'`） |
| I-03 | `grep -n "new ChatOpenAI\|new OpenAI" {file}` 在 nodes/ 内 | agents/nodes/ | 🔴 | auto | 模型须在 models/ 定义为单例，节点内禁止实例化 |
| I-04 | prompt 文本硬编码在 node 文件内（`grep -n "你是\|You are\|system:" {file}` 长于 2 行） | agents/nodes/ | 🟡 | 判读 | 长 prompt 应提取到 `agents/prompt/` |

---

## §3 结构检查表

> 审查 Step 4 读取文件全文后执行以下检查。

### Feature / Component 文件 (.tsx)

| ID | 检查项 | 严重度 | 方法 |
|----|--------|--------|------|
| S-01 | 文件行数 > 200 | 🟡 | `wc -l` |
| S-02 | 单组件 `useState` 调用 > 5 次 | 🟡 | 计数 `useState` 出现次数 |
| S-03 | 组件函数体内定义 `function use*` 或 `const use* =` | 🔴 | 自定义 hook 必须提取到独立文件 |
| S-04 | 使用 hooks / 事件处理器 / 浏览器 API 但缺 `"use client"` 指令 | 🔴 | 检查首行是否有 `"use client"` |
| S-05 | 组件未使用 `export default` | 🔴 | 检查导出方式 |
| S-06 | JSX return 嵌套 > 5 层 | 🟡 | 读取 JSX 结构 |

### Store 文件 (stores/*.ts)

| ID | 检查项 | 严重度 | 方法 |
|----|--------|--------|------|
| S-07 | async action 内无 `try/catch` 或 `try/finally` | 🟡 | 检查 async 函数体 |
| S-08 | store 缺类型定义（无 `type` 或 `interface` 定义 store shape） | 🔴 | 检查是否定义了 store 类型 |

### DB Schema 文件 (db/schema/*.ts)

| ID | 检查项 | 严重度 | 方法 |
|----|--------|--------|------|
| S-09 | 业务表 `pgTable()` 调用缺 `...commonAuditFields` 展开 | 🔴 | 检查 pgTable 定义 |
| S-10 | 表名未使用 `elicit_` 前缀 | 🟡 | 检查 pgTable 第一参数 |

### Agent Node 文件 (agents/nodes/*.ts)

| ID | 检查项 | 严重度 | 方法 |
|----|--------|--------|------|
| S-11 | 节点函数缺标准日志 `console.log('XxxNode invoked with ...')` | 🟡 | 读取函数首行 |
| S-12 | 节点未导出名称常量 | 🟡 | 检查 export |
| S-13 | 节点返回完整 state 而非部分更新 | 🔴 | 检查 return 语句 |

### API Route 文件 (app/api/**/route.ts)

| ID | 检查项 | 严重度 | 方法 |
|----|--------|--------|------|
| S-14 | 动态路由缺 `const { xxx } = await params` | 🔴 | 检查参数解构 |
| S-15 | 缺顶层 try/catch 错误处理 | 🟡 | 检查函数体结构 |
| S-16 | 返回非 `BaseResponse` 格式 | 🟡 | 检查 Response.json 参数 |

---

## §4 全局扫描规则

> 以下规则**不限于变更文件**，每次审查都对 `src/` 全量扫描。

| ID | 扫描命令 | 严重度 | 说明 |
|----|----------|--------|------|
| B-08 | `find src -name "*.enum.ts" -not -path "*/types/enums/*"` | 🔴 | 枚举文件必须在 `src/types/enums/` 目录 |
| B-09 | 遍历 `src/types/enums/*.ts`（豁免 `base.ts`），检查每个文件是否含 `createEnum(` | 🔴 | 枚举文件必须调用 `createEnum()` 工厂 |
| B-10 | `grep -rn "Record<.*,\s*string>\s*=\s*{" src/ --include="*.ts" --include="*.tsx"` 并排除 `src/types/enums/` 结果 | 🔴 | 禁止在 enums 外自维护 label 映射 |
| G-03 | `git diff --name-only` 检查 `src/db/supabase/type.ts` 是否被手动修改 | 🔴 | 该文件必须 `pnpm supabase:type` 自动生成 |
