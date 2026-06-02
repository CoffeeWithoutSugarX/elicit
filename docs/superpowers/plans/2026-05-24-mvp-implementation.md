# MVP v0.1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Elicit MVP v0.1 — a Socratic math tutoring agent using Pólya's 4-phase framework, replacing the POC single ChatNode with 6 LLM prompt nodes, 4 guard algorithms, multi-question OCR flow, and SSE-driven frontend.

**Architecture:** LangGraph StateGraph with conditional fan-out routing. VisionNode (qwen-vl-max) handles OCR → ClassifyNode assigns problem type → 4 Pólya PhaseNodes (UnderstandNode/PlanNode/ExecuteNode/ReviewNode) via DeepSeek-chat with phase_signal protocol. Guards (Stuck/Deviation/OutOfScope/VisionFailure) run as pre-checks at node entry. SubProblemRouter and InsightLoopRouter manage multi-sub-problem and escalation loops. SSE data-custom chunks drive frontend state updates.

**Tech Stack:** Next.js 16, React 19, LangGraph 1.x, Zod, DeepSeek API (OpenAI-compat), Dashscope qwen-vl-max, Supabase (Postgres + Auth + RLS), Zustand, KaTeX, Tailwind v4.

**Design docs (subagents MUST reference these for exact contracts):**
- Detailed design: `doc/详细设计/详细设计_v0.1_MVP.md`
- Concept design: `doc/概要设计/概要设计_v0.1_MVP.md`
- Test strategy: `doc/测试验证/测试验证策略_v0.1_MVP.md`

**Verification command:** `pnpm verify` (L1 typecheck + L2 lint + L3 test) — must pass green before any task is considered done.

---

## Dependency Graph

```
Phase 1 ──→ Phase 2A ──→ Phase 3 ──→ Phase 4 ──→ Phase 5 ──→ Phase 7
         ╲              ╱                                   ╱
          → Phase 2B ──                                    ╱
                                                          ╱
                                        Phase 6 ────────→

Phase 1: Directory Skeleton + Cleanup
Phase 2A: Schema Rewrite (OcrSchema + State + KnowledgeCard)
Phase 2B: Data Files + Guard Algorithms (parallel with 2A)
Phase 3: Prompt Templates (all 6 + shared utils)
Phase 4: Node Implementations (VisionNode → ClassifyNode → 4 PhaseNodes)
Phase 5: Graph Routing + Wiring + /resolve API
Phase 6: SSE + Frontend + Admin API (can start after Phase 4)
Phase 7: Tests (L3 + L4 + L5)
Phase 8: Deployment Runbook (independent, can start anytime)
```

---

## Phase 1: Directory Skeleton + Cleanup

> **Prerequisites:** None. Working tree clean on main.
> **Outcome:** POC files reorganized per detailed design §2.2/§2.3; `pnpm verify` green.
> **Estimated effort:** 1 subagent session, ~30 min.

### Task 1.1: Restructure `src/agents/` directories + move existing files

**Files:**
- Move: `src/agents/nodes/ConversationNode.ts` → `src/agents/nodes/flow/ConversationNode.ts`
- Move: `src/agents/nodes/OcrNode.ts` → `src/agents/nodes/flow/OcrNode.ts`
- Move: `src/agents/nodes/StartFinoutNode.ts` → `src/agents/nodes/flow/StartFinoutNode.ts`
- Keep: `src/agents/nodes/ChatNode.ts` (add `@deprecated` JSDoc — will be replaced by PhaseNodes)
- Move: `src/agents/prompt/OcrPrompt.ts` → `src/agents/prompts/vision/OcrPrompt.ts`
- Create dirs: `src/agents/nodes/phases/`, `src/agents/nodes/guards/`, `src/agents/nodes/algorithm/`
- Create dirs: `src/agents/prompts/phases/`, `src/agents/prompts/guards/`
- Create dirs: `src/agents/state/`, `src/agents/data/`
- Create placeholder: `src/agents/state/reconcileHasResolved.ts` (empty export)

- [ ] **Step 1:** Create all new directories

```bash
mkdir -p src/agents/nodes/{flow,phases,guards,algorithm}
mkdir -p src/agents/prompts/{vision,phases,guards}
mkdir -p src/agents/{state,data}
```

- [ ] **Step 2:** Move flow nodes to `flow/` subdirectory

Move `ConversationNode.ts`, `OcrNode.ts`, `StartFinoutNode.ts` → `src/agents/nodes/flow/`.
Update all imports in `ChatGraph.ts` and `StartFinoutNode.ts` (internal cross-refs):

```ts
// ChatGraph.ts — updated imports
import {conversationNodeName, createConversationNode} from "@/agents/nodes/flow/ConversationNode";
import {ocrNode, ocrNodeName} from "@/agents/nodes/flow/OcrNode";
import {startFinOutNode} from "@/agents/nodes/flow/StartFinoutNode";
```

```ts
// StartFinoutNode.ts — updated imports
import {conversationNodeName, shouldCreateConversation} from "@/agents/nodes/flow/ConversationNode";
import {ocrNodeName, shouldOcr} from "@/agents/nodes/flow/OcrNode";
import {chatNodeName} from "@/agents/nodes/ChatNode";
```

- [ ] **Step 3:** Move OcrPrompt to `prompts/vision/`

Move `src/agents/prompt/OcrPrompt.ts` → `src/agents/prompts/vision/OcrPrompt.ts`.
Delete empty `src/agents/prompt/` directory.
Grep for `@/agents/prompt/OcrPrompt` and update any imports (likely only OcrNode, which is currently empty body).

- [ ] **Step 4:** Add @deprecated to ChatNode.ts

```ts
/**
 * @deprecated Will be replaced by Pólya PhaseNodes in detailed design D2.
 * Kept temporarily for graph compilation until Phase 4 tasks replace it.
 */
export const chatNode = async (state: ElicitGraphState) => {
```

- [ ] **Step 5:** Create reconcileHasResolved placeholder

```ts
// src/agents/state/reconcileHasResolved.ts
export {};
```

- [ ] **Step 6:** Run `pnpm verify` and fix any import issues

```bash
pnpm verify
```
Expected: all green (typecheck + lint).

- [ ] **Step 7:** Commit

```bash
git add src/agents/
git commit -m "refactor(agents): restructure nodes/prompts directories per detailed design §2.2/§2.3

Move flow nodes to nodes/flow/, rename prompt→prompts with subdirs,
add placeholder dirs for phases/guards/algorithm/state/data.
ChatNode.ts marked @deprecated.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.2: Clean AR-004 `qianwen-model.ts` top-level side effect

**Files:**
- Modify: `src/agents/models/qianwen-model.ts`

- [ ] **Step 1:** Read current file and remove top-level `main()` call + hardcoded URL

The file currently has a `main()` function that runs at import time with a hardcoded test URL. Remove the `main()` function entirely. Keep only the model export that will be used by VisionNode.

```ts
// src/agents/models/qianwen-model.ts — cleaned
import OpenAI from "openai";

export const qwenVlModel = new OpenAI({
    apiKey: process.env.DASHSCOPE_API_KEY,
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});
```

- [ ] **Step 2:** Grep for any imports of `qianwen-model` and verify they still compile

```bash
grep -r "qianwen-model\|qwenVlModel\|qwen" src/ --include="*.ts" --include="*.tsx"
```

- [ ] **Step 3:** Run `pnpm verify`

- [ ] **Step 4:** Commit

```bash
git add src/agents/models/qianwen-model.ts
git commit -m "fix(models): remove qianwen-model.ts top-level main() side effect (AR-004)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

### Task 1.3: Add Drizzle mirror for `elicit_messages`

**Files:**
- Create: `src/db/schema/message.ts`

- [ ] **Step 1:** Create Drizzle schema mirroring the existing migration `supabase/migrations/20260520000002_elicit_messages_v01_mvp_schema.sql`

Read the migration file first to get exact column definitions. Then create `message.ts` that mirrors it. **Do NOT use `commonAuditFields` helper** — messages have different column semantics (per project status §7.3.1 note).

```ts
// src/db/schema/message.ts
import { pgTable, bigint, uuid, text, smallint, varchar, boolean, integer, timestamp, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";

export const elicitMessages = pgTable("elicit_messages", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    messageId: uuid("message_id").defaultRandom().notNull(),
    version: integer("version").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    extInfo: jsonb("ext_info").$type<Record<string, unknown>>().notNull().default({}),
    userId: uuid("user_id").notNull(),
    conversationId: uuid("conversation_id").notNull(),
    content: text("content").notNull(),
    role: smallint("role").notNull(),
    type: smallint("type").notNull(),
    imgUrl: varchar("img_url", { length: 512 }),
    phase: smallint("phase"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
}, (table) => [
    uniqueIndex("elicit_messages_conv_msg_unique").on(table.conversationId, table.messageId),
    index("elicit_messages_conversation_id_idx").on(table.conversationId, table.createdAt),
]);
```

- [ ] **Step 2:** Run `pnpm verify`

- [ ] **Step 3:** Commit

```bash
git add src/db/schema/message.ts
git commit -m "feat(db): add Drizzle schema mirror for elicit_messages (type derivation only)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2A: Schema Rewrite

> **Prerequisites:** Phase 1 complete.
> **Outcome:** OcrSchema, ElicitGraphStateSchema, KnowledgeCardSchema all match concept design §4.1/§4.2/§4.3 target state. `pnpm verify` green.
> **Estimated effort:** 1 subagent session, ~40 min.

### Task 2A.1: Rewrite OcrSchema to multi-question target state

**Files:**
- Rewrite: `src/agents/schemas/OcrSchema.ts`

- [ ] **Step 1:** Rewrite OcrSchema per concept design §4.2.1

Replace the entire file with the target state Zod definition. **Exact code is in `doc/概要设计/概要设计_v0.1_MVP.md` lines 641-698.** Key changes:
- `SanitizedQuestion` with `index`, `topic`, `latexFull`, `givenConditions`, `implicitConditions`, `goal`, `milestones`, `visualFeaturesNeeded`, `visualDescription`, `subProblems[]`
- `SubProblemDefinitionSchema` (static VisionNode output)
- `SolvableOcrSchema` with `questions[]` (1-5), `selectedQuestionIndex?`, `isMulti`, `subject`
- `UnsolvableOcrSchema` with `errorReason` enum
- `discriminatedUnion` on `isSolvable`
- Export types: `OcrResult`, `SanitizedQuestion`, `SubProblemDefinition`

- [ ] **Step 2:** Run `pnpm verify` — expect type errors in files importing old OcrSchema

Fix any type errors in downstream files (likely `ElicitGraphStateSchema.ts` import, `OcrNode.ts` — which is empty body so minimal impact).

- [ ] **Step 3:** Commit

### Task 2A.2: Update ElicitGraphStateSchema to v0.1.1 target

**Files:**
- Rewrite: `src/agents/schemas/ElicitGraphStateSchema.ts`

- [ ] **Step 1:** Rewrite per concept design §4.1 (lines 538-619)

Key changes from current:
- Add `SubProblemStateSchema` with runtime fields: `index`, `goal`, `givenConditions`, `milestones`, `status`, `insightPoints`, `stuckCountPerPhase`, `probedQuestionIds`
- Remove top-level `stuckCountPerPhase` and `probedQuestionIds` (moved into SubProblemStateSchema)
- Add `subProblems: z.array(SubProblemStateSchema).default(() => [])`
- Add `currentSubProblemIndex: z.number().int().min(0).default(0)`
- Keep `lastDeviationAt`
- Export `SubProblemState` type

- [ ] **Step 2:** Fix downstream type errors (ChatNode.ts, StartFinoutNode.ts if any)

- [ ] **Step 3:** Run `pnpm verify`

- [ ] **Step 4:** Commit

### Task 2A.3: Create KnowledgeCardSchema + MessageMetadataSchema

**Files:**
- Create: `src/agents/schemas/KnowledgeCardSchema.ts`

- [ ] **Step 1:** Create per concept design §4.3 (lines 721-757)

```ts
// src/agents/schemas/KnowledgeCardSchema.ts
import { z } from "zod";
import { MethodCategory } from "@/types/enums/methodCategory.enum";

export const CURRENT_CARD_VERSION = 1;

const KnowledgePointSchema = z.object({
    name: z.string().min(1).max(40),
    textbookRef: z.string().max(40).optional(),
});

const MethodSchema = z.object({
    name: z.string().min(1).max(40),
    category: z.union([
        z.literal(MethodCategory.ALGEBRAIC),
        z.literal(MethodCategory.GEOMETRIC),
        z.literal(MethodCategory.FUNCTIONAL),
        z.literal(MethodCategory.STATISTICAL),
        z.literal(MethodCategory.OTHER),
    ]),
});

const SubProblemSummarySchema = z.object({
    index: z.number().int().min(0),
    status: z.enum(['done', 'blocked']),
    insightPoints: z.array(z.string()).default([]),
    blockedHint: z.string().max(40).optional(),
});

export const KnowledgeCardSchema = z.object({
    schemaVersion: z.literal(1),
    type: z.literal("knowledge_card"),
    knowledgePoints: z.array(KnowledgePointSchema).min(1).max(3),
    methods: z.array(MethodSchema).min(1).max(2),
    insight: z.string().min(1).max(150),
    subProblemSummaries: z.array(SubProblemSummarySchema).optional(),
});

export type KnowledgeCard = z.infer<typeof KnowledgeCardSchema>;

export const MessageMetadataSchema = z.object({
    knowledgeCard: KnowledgeCardSchema.optional(),
}).default({});
```

- [ ] **Step 2:** Run `pnpm verify`

- [ ] **Step 3:** Commit

---

## Phase 2B: Data Files + Guard Algorithms

> **Prerequisites:** Phase 1 complete. Can run **parallel** with Phase 2A.
> **Outcome:** 4 data files + 5 pure-function algorithms with full L3 unit tests.
> **Estimated effort:** 2 subagent sessions (1 for data+algorithms, 1 for tests), ~60 min total.

### Task 2B.1: Create data/vocabulary files

**Files:**
- Create: `src/agents/data/knowledge-points.csv`
- Create: `src/agents/data/stuck-keywords.json`
- Create: `src/agents/data/deviation-keywords.json`
- Create: `src/agents/data/out-of-scope-keywords.json`
- Create: `src/agents/data/loadKnowledgePoints.ts`

- [ ] **Step 1:** Create all 4 data files per detailed design §6

**knowledge-points.csv** — detailed design §6.1 (30 entries, 5 columns: ID, 知识点, 别名, 年级, 出处). UTF-8 with BOM.

**stuck-keywords.json** — detailed design §6.2.1:
```json
{
  "keywords": ["我不会", "不知道", "卡住了", "想不出", "不懂", "怎么做", "没有思路", "想不到", "不理解", "做不出来"]
}
```

**deviation-keywords.json** — detailed design §6.2.2:
```json
{
  "giveAnswer": ["答案是", "等于", "结果是", "这题是", "所以是"],
  "offTopic": ["天气", "你是谁", "你叫什么", "今天", "好无聊"],
  "crossPhasePatterns": ["\\d+[+\\-*/=]\\d+", "代入得", "解方程得", "计算得"]
}
```

**out-of-scope-keywords.json** — detailed design §6.2.3:
```json
{
  "nonMathSubjects": ["语文题", "英语题", "物理题", "化学题", "生物题", "历史题", "地理题", "政治题"]
}
```

- [ ] **Step 2:** Create `loadKnowledgePoints.ts`

```ts
// src/agents/data/loadKnowledgePoints.ts
import { readFileSync } from 'fs';
import { join } from 'path';

export interface KnowledgePoint {
  id: string;
  name: string;
  aliases: string[];
  grade: string;
  textbookRef: string;
}

const csvPath = join(process.cwd(), 'src/agents/data/knowledge-points.csv');
const raw = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '');

export const knowledgePoints: ReadonlyArray<KnowledgePoint> = raw
  .split('\n')
  .slice(1)
  .filter(line => line.trim())
  .map(line => {
    const [id, name, aliases, grade, textbookRef] = line.split(',').map(s => s.trim());
    return { id, name, aliases: aliases.split('/').map(s => s.trim()), grade, textbookRef };
  });

export const knowledgePointsCsv = raw;
```

- [ ] **Step 3:** Run `pnpm verify`
- [ ] **Step 4:** Commit

### Task 2B.2: Implement PhaseSignalParse algorithm

**Files:**
- Create: `src/agents/nodes/algorithm/phaseSignalParse.ts`

- [ ] **Step 1:** Implement per detailed design §5.2 (lines 1080-1144)

Exact types and algorithm are defined in §5.2. Key points:
- 5 signals: `COMPLETED | STAY | ESCALATE | SUB_PROBLEM_DONE | PROBLEM_BLOCKED`
- Priority: `SUB_PROBLEM_DONE > PROBLEM_BLOCKED > ESCALATE > COMPLETED > STAY`
- Parse `phase_signal:`, `probed_question_id:`, `new_insight:` from last 5 lines
- Return `{ signal, probedQuestionId?, newInsight?, cleanContent }`

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 2B.3: Implement 4 guard algorithms

**Files:**
- Create: `src/agents/nodes/algorithm/stuckGuard.ts`
- Create: `src/agents/nodes/algorithm/deviationGuard.ts`
- Create: `src/agents/nodes/algorithm/outOfScopeGuard.ts`
- Create: `src/agents/nodes/algorithm/visionFailureGuard.ts`

- [ ] **Step 1:** Implement StuckGuard per detailed design §5.3

Pure function. Import stuck keywords from JSON. Check last 6 messages for keyword hits + 3-round same-phase stagnation. Return `PROBE_5Q` or `KNOWLEDGE_FALLBACK` action, or null. Include B4 cross-sub-problem accumulation rule (≥2 blocked → skip directly to KNOWLEDGE_FALLBACK).

- [ ] **Step 2:** Implement DeviationGuard per detailed design §5.4

Pure function. Import deviation keywords. Check last user message for answer-giving / off-topic / cross-phase patterns. 2-round cooldown via `lastDeviationAt`. Return `PULL_BACK` action or null.

- [ ] **Step 3:** Implement OutOfScopeGuard per detailed design §5.5

Pure function. Check `state.ocrResult.subject !== 'math'` as primary. Fall back to keyword match if ocrResult missing.

- [ ] **Step 4:** Implement VisionFailureGuard per detailed design §5.6

Pure function. Check `state.ocrResult.errorReason` against known error set.

- [ ] **Step 5:** Run `pnpm verify`
- [ ] **Step 6:** Commit all 4 guards together

### Task 2B.4: L3 unit tests for algorithms + guards

**Files:**
- Create: `src/__tests__/agents/algorithm/phaseSignalParse.test.ts`
- Create: `src/__tests__/agents/algorithm/stuckGuard.test.ts`
- Create: `src/__tests__/agents/algorithm/deviationGuard.test.ts`
- Create: `src/__tests__/agents/algorithm/outOfScopeGuard.test.ts`
- Create: `src/__tests__/agents/algorithm/visionFailureGuard.test.ts`

- [ ] **Step 1:** Write phaseSignalParse tests

Cover all 10+ boundary cases from detailed design §5.2 table + priority matrix. Must include:
- Each signal type alone
- Missing/malformed signal → defaults to STAY
- Multiple signals → highest priority wins
- `probed_question_id` extraction
- `new_insight` extraction + 30-char truncation
- `cleanContent` stripping

- [ ] **Step 2:** Write stuckGuard tests (~20 cases per §5.3)

Cover: empty probedIds → PROBE_5Q(1), partial probedIds → next unused, all 5 probed → KNOWLEDGE_FALLBACK, no trigger → null, each PolyaPhase. Include B4 cross-sub-problem test (2 blocked → immediate KNOWLEDGE_FALLBACK).

- [ ] **Step 3:** Write deviationGuard tests (~12 cases per §5.4)

Cover: give-answer at UNDERSTAND → PULL_BACK, give-answer at EXECUTE → null (reasonable), off-topic → PULL_BACK, cooldown → null.

- [ ] **Step 4:** Write outOfScopeGuard tests (~8 cases per §5.5)

Cover: subject='chinese' → true, subject='math' → false, missing ocrResult + keyword hit → true.

- [ ] **Step 5:** Write visionFailureGuard tests (5 cases per §5.6)

Cover each errorReason value.

- [ ] **Step 6:** Run `pnpm test` → all green with ≥90% coverage on algorithm files
- [ ] **Step 7:** Commit

---

## Phase 3: Prompt Templates

> **Prerequisites:** Phase 2A complete (schemas needed for type imports).
> **Outcome:** 6 prompt files + shared utils, all type-safe. `pnpm verify` green.
> **Estimated effort:** 1 subagent session, ~45 min.

### Task 3.1: Create shared prompt utilities

**Files:**
- Create: `src/agents/prompts/phases/_shared.ts`

- [ ] **Step 1:** Implement `formatVisualBlock` and `describeSubProblemContext` per detailed design §4.3.0

Exact code in §4.3.0 (lines 267-301). Import `SanitizedQuestion` from OcrSchema. Import `ElicitGraphState` from state schema.

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 3.2: Create VisionNode prompt

**Files:**
- Create: `src/agents/prompts/vision/visionNode.prompt.ts`

- [ ] **Step 1:** Implement per detailed design §4.3.1

Must export 5 things per §2.2 convention:
1. `systemPrompt` — full text from §4.3.1 (lines 403-479)
2. `userPromptTemplate({ imgUrl, userText })` — from §4.3.1 (lines 483-487)
3. `outputContract` — reference the `SolvableOcrSchema` union from OcrSchema
4. `fewShots` — empty array initially (§4.3.1 says "实施期补 3 组")
5. `modelParams` — `{ temperature: 0, max_tokens: 1024, streaming: false, response_format: { type: "json_object" } }`

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 3.3: Create ClassifyNode prompt

**Files:**
- Create: `src/agents/prompts/phases/classifyNode.prompt.ts`

- [ ] **Step 1:** Implement per detailed design §4.3.2

System prompt from lines 557-571. User template from lines 577-586 (uses `formatVisualBlock`). Output contract as `z.object({ problemType, reason })`. modelParams: temp=0, max_tokens=256, streaming=false, json_object.

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 3.4: Create 4 Pólya PhaseNode prompts

**Files:**
- Create: `src/agents/prompts/phases/understandNode.prompt.ts`
- Create: `src/agents/prompts/phases/planNode.prompt.ts`
- Create: `src/agents/prompts/phases/executeNode.prompt.ts`
- Create: `src/agents/prompts/phases/reviewNode.prompt.ts`

- [ ] **Step 1:** Implement UnderstandNode prompt per §4.3.3

System prompt (lines 613-641), user template (lines 648-669), few-shots (2 fixtures from lines 676-698). Output is text + phase_signal. modelParams: temp=0.3, max_tokens=400, streaming=true.

- [ ] **Step 2:** Implement PlanNode prompt per §4.3.4

System prompt (lines 719-772), user template (lines 777-807), few-shots (3 fixtures from lines 821-824). modelParams: temp=0.5, max_tokens=400, streaming=true. This is the most complex prompt — includes method menu, 5-question probing, D11 direction validity self-check.

- [ ] **Step 3:** Implement ExecuteNode prompt per §4.3.5

System prompt (lines 847-888), user template (lines 896-928), few-shots (3 from lines 933-936). Includes B4 5-signal set. modelParams: temp=0.4, max_tokens=400, streaming=true.

- [ ] **Step 4:** Implement ReviewNode prompt per §4.3.6

System prompt (lines 954-1003), user template (lines 1013-1044), few-shots (2 from lines 1049-1051). Includes B4 multi-sub-problem summary + KnowledgeCard JSON output. modelParams: temp=0.3, max_tokens=800, streaming=true.

- [ ] **Step 5:** Run `pnpm verify`
- [ ] **Step 6:** Commit all 4 prompts together

---

## Phase 4: Node Implementations

> **Prerequisites:** Phase 2A + 2B + 3 complete.
> **Outcome:** 6 working LangGraph nodes. `pnpm verify` green.
> **Estimated effort:** 2 subagent sessions, ~90 min total.

### Task 4.1: Implement VisionNode

**Files:**
- Rewrite: `src/agents/nodes/flow/OcrNode.ts` → refactor into VisionNode at `src/agents/nodes/flow/VisionNode.ts`
- Create: `src/agents/nodes/flow/VisionNode.ts`

- [ ] **Step 1:** Create VisionNode

VisionNode calls `qwenVlModel` with the vision prompt, parses JSON output via `OcrSchema.safeParse`, handles failures (TIMEOUT/PARSE_FAIL → error ocrResult), writes `state.ocrResult`, and pushes `questions_detected` SSE chunk via `getWriter()`. **No streaming** (qwen-vl-max returns JSON synchronously).

Key behavior:
- Input: `state.questionImgUrl` + optional `state.messages[-1].content`
- Output: `{ ocrResult }` written to state
- SSE: push `{ kind: 'questions_detected', questions, isMulti }` via getWriter
- Error: catch model timeout → `{ isSolvable: false, errorReason: 'TIMEOUT', questions: [] }`
- Truncate questions to max 5

- [ ] **Step 2:** Delete old `OcrNode.ts` (it was empty body) or keep as re-export stub
- [ ] **Step 3:** Run `pnpm verify`
- [ ] **Step 4:** Commit

### Task 4.2: Implement ClassifyNode

**Files:**
- Create: `src/agents/nodes/phases/ClassifyNode.ts`

- [ ] **Step 1:** Create ClassifyNode

ClassifyNode runs in the **second graph invoke** (triggered by `/resolve`). It:
1. Reads `state.ocrResult.questions[selectedQuestionIndex ?? 0]` as `selectedQuestion`
2. Calls DeepSeek with classifyNode prompt → parses `{ problemType, reason }` JSON
3. Writes `state.problemType`
4. Initializes `state.subProblems` from `selectedQuestion.subProblems` with runtime defaults (status='pending', insightPoints=[], stuckCountPerPhase=zeros, probedQuestionIds=[])
5. Writes `state.currentSubProblemIndex = 0`
6. Runs visionFailureGuard + outOfScopeGuard pre-checks
7. Pushes `phase_changed` SSE chunk

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 4.3: Implement 4 Pólya PhaseNodes

**Files:**
- Create: `src/agents/nodes/phases/UnderstandNode.ts`
- Create: `src/agents/nodes/phases/PlanNode.ts`
- Create: `src/agents/nodes/phases/ExecuteNode.ts`
- Create: `src/agents/nodes/phases/ReviewNode.ts`

All 4 PhaseNodes follow the same structure:
1. Run guard pipeline: `visionFailureGuard → outOfScopeGuard → deviationGuard → stuckGuard`
2. If guard returns action → inject into user prompt
3. Build user prompt from template (selectedQuestion, currentSubProblem, recentMessages, etc.)
4. Call DeepSeek with system + user prompt (streaming=true via `getWriter()`)
5. Parse output via `phaseSignalParse` → extract signal, probedQuestionId, newInsight
6. Update state based on signal (stuckCount, insightPoints, subProblem status, etc.)
7. Push `phase_changed` SSE chunk if phase transitions

- [ ] **Step 1:** Implement UnderstandNode per §4.3.3

Reads currentSubProblem. After COMPLETED signal, pushes `phase_changed` from UNDERSTAND to PLAN.

- [ ] **Step 2:** Implement PlanNode per §4.3.4

Reads probedQuestionIds. After COMPLETED signal, pushes `phase_changed` from PLAN to EXECUTE. Handles StuckGuard PROBE_5Q injection. Updates `probedQuestionIds` from phaseSignalParse result.

- [ ] **Step 3:** Implement ExecuteNode per §4.3.5

Handles 5-signal set (COMPLETED/STAY/ESCALATE/SUB_PROBLEM_DONE/PROBLEM_BLOCKED). Updates `insightPoints` on `newInsight`. Sets `subProblems[i].status` on DONE/BLOCKED signals. Does NOT push phase_changed itself — routing handled by subProblemRouter/insightLoopRouter.

- [ ] **Step 4:** Implement ReviewNode per §4.3.6

Reads ALL subProblems (not just current). Generates knowledge card JSON. Parses card via `KnowledgeCardSchema.safeParse`. Pushes `knowledge_card` SSE chunk. Sets `state.hasResolved = true` + `state.currentPhase = DONE`. Performs has_resolved DB mirror write (reconcile).

- [ ] **Step 5:** Run `pnpm verify`
- [ ] **Step 6:** Commit all 4 nodes together

---

## Phase 5: Graph Routing + Wiring

> **Prerequisites:** Phase 4 complete.
> **Outcome:** Full LangGraph with Pólya 4-phase routing, sub-problem routing, insight loop, /resolve API. `pnpm verify` green.
> **Estimated effort:** 1-2 subagent sessions, ~60 min.

### Task 5.1: Implement router functions

**Files:**
- Create: `src/agents/nodes/flow/phaseRouter.ts`
- Create: `src/agents/nodes/flow/subProblemRouter.ts`
- Create: `src/agents/nodes/flow/insightLoopRouter.ts`

- [ ] **Step 1:** Implement `phaseRouter`

Conditional edge function after each PhaseNode. Reads `state.currentPhase` and routes to the next node:
- UNDERSTAND → PlanNode
- PLAN → ExecuteNode
- EXECUTE → handled by subProblemRouter (not this function)
- REVIEW → END
- DONE → END

Also handles STAY → END (wait for next user message).

- [ ] **Step 2:** Implement `subProblemRouter` (concept design §7.1 / §8.3)

Called after ExecuteNode when signal is SUB_PROBLEM_DONE or PROBLEM_BLOCKED:
- Increments `currentSubProblemIndex`
- If next index < subProblems.length → route to UnderstandNode (start next sub-problem)
- If next index >= subProblems.length → route to ReviewNode (all sub-problems done/blocked)
- Resets per-sub-problem counters for the new sub-problem

- [ ] **Step 3:** Implement `insightLoopRouter`

Called after ExecuteNode when signal is ESCALATE:
- Routes back to PlanNode (same sub-problem, new direction)
- Preserves insightPoints

- [ ] **Step 4:** Run `pnpm verify`
- [ ] **Step 5:** Commit

### Task 5.2: Rewrite ChatGraph.ts with full Pólya topology

**Files:**
- Rewrite: `src/agents/graphs/ChatGraph.ts`

- [ ] **Step 1:** Rebuild the graph per detailed design node topology

Current (POC): `START → startFinOutNode → [conversationNode|ocrNode] → chatNode → END`

Target:
```
START → startFinOutNode → [conversationNode | visionNode | classifyNode+understandNode]
  conversationNode → visionNode
  visionNode → END (wait for /resolve)
  classifyNode → understandNode
  understandNode → phaseRouter
  phaseRouter → [planNode | END]
  planNode → phaseRouter
  phaseRouter → [executeNode | END]
  executeNode → executionRouter (conditional edge combining subProblemRouter + insightLoopRouter)
  executionRouter → [understandNode (next sub-problem) | reviewNode (all done) | planNode (escalate) | END (stay)]
  reviewNode → END
```

Import all new nodes. Remove `chatNode` from graph (kept as deprecated file). Wire conditional edges.

**Important:** `startFinOutNode` logic needs updating:
- If `!hasResolved && questionImgUrl` → VisionNode (first invoke, OCR the image)
- If `hasResolved && !state.subProblems.length` → ClassifyNode (second invoke after /resolve)
- If `hasResolved && state.subProblems.length > 0` → route to current phase node (subsequent messages)
- If needs conversation creation → ConversationNode first

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 5.3: Implement /resolve API route

**Files:**
- Create: `src/app/api/conversation/[conversationId]/resolve/route.ts`

- [ ] **Step 1:** Create POST handler per concept design §5.4

1. `withAuth` wrapper
2. Parse `{ selectedQuestionIndex?: number }` from body
3. Update `elicit_conversations` via Drizzle: `has_resolved = true`
4. Trigger second graph invoke: `compiledElicitGraph.invoke(...)` with thread_id = conversationId + state updates: `hasResolved: true, ocrResult.selectedQuestionIndex: selectedQuestionIndex ?? 0`
5. Return `{ conversationId, hasResolved: true, currentPhase: 'understand' }`

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 5.4: Implement reconcileHasResolved

**Files:**
- Implement: `src/agents/state/reconcileHasResolved.ts`

- [ ] **Step 1:** Implement reconcile logic per concept design §10 C9

Check if `state.hasResolved` and DB `elicit_conversations.has_resolved` are in sync. If state=true but DB=false → update DB (idempotent). Called at chatNode entry (now PhaseNode entry) as a reconciliation step.

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

---

## Phase 6: SSE + Frontend + Admin API

> **Prerequisites:** Phase 4 complete (nodes push SSE chunks).
> **Outcome:** Frontend receives and processes all SSE chunk kinds; P-103 multi-question flow works; admin routes functional.
> **Estimated effort:** 2 subagent sessions, ~90 min.

### Task 6.1: Update SSE handler in streamIterator

**Files:**
- Modify: `src/lib/utils.ts` (streamIterator section)

- [ ] **Step 1:** Add `KNOWN_KINDS` whitelist per detailed design §9.1

Add `questions_detected`, `sub_problem_changed` to the set of known kinds. Add default case that logs and ignores unknown kinds.

- [ ] **Step 2:** Commit

### Task 6.2: Update Zustand useConversation store

**Files:**
- Modify: `src/stores/useConversation.ts`

- [ ] **Step 1:** Add P-103 related state fields per detailed design §9.4

Add: `pendingQuestions`, `isMulti`, `isResolving`, `hasResolved`, `selectedQuestionIndex`, `currentPhase`.

Add actions: `onQuestionsDetected`, `confirmSelectedQuestion`, `rejectVisionResult`, `onPhaseChanged`, `onKnowledgeCard`, `onSubProblemChanged`.

Wire the stream dispatcher to call these on matching `data-custom.kind`.

- [ ] **Step 2:** Run `pnpm verify`
- [ ] **Step 3:** Commit

### Task 6.3: Create admin API routes

**Files:**
- Create: `src/lib/admin-db.ts`
- Create: `src/app/api/admin/conversations/route.ts`
- Create: `src/app/api/admin/conversations/[id]/messages/route.ts`

- [ ] **Step 1:** Create `admin-db.ts` per detailed design §10.1

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

- [ ] **Step 2:** Create admin conversation list route per concept design §5.6

GET handler with `withAdminAuth`. Query all conversations via service_role client. Return list with pagination.

- [ ] **Step 3:** Create admin messages route per concept design §5.6

GET handler with `withAdminAuth`. Query messages for a specific conversation.

- [ ] **Step 4:** Add `withAuth` to OSS routes that are missing it (POC fix per concept design §5.1)

- [ ] **Step 5:** Run `pnpm verify`
- [ ] **Step 6:** Commit

### Task 6.4: Frontend components for P-103 multi-question flow + KnowledgeCard

**Files:**
- Create: `src/features/chat/QuestionSelector.tsx` (P-103 multi-question overlay)
- Create: `src/features/chat/KnowledgeCard.tsx` (P-105 knowledge card)
- Modify: `src/features/chat/MessageContent.tsx` (KaTeX rendering per §9.3)

- [ ] **Step 1:** Implement QuestionSelector (P-103)

Shows when `isMulti && pendingQuestions`. Lists questions with topic + LaTeX preview. "确认选择" calls `confirmSelectedQuestion(index)`. "识别错误" calls `rejectVisionResult()`.

- [ ] **Step 2:** Implement KnowledgeCard with version compat per §9.2

Three branches: current version → full render; future version → degraded view; parse fail → raw JSON fallback.

- [ ] **Step 3:** Add KaTeX safe rendering per §9.3

- [ ] **Step 4:** Run `pnpm verify`
- [ ] **Step 5:** Commit

---

## Phase 7: Tests

> **Prerequisites:** Phases 1-6 complete.
> **Outcome:** L3 unit tests at ≥90/90 coverage, L4 fake-model demo passing.
> **Estimated effort:** 2-3 subagent sessions, ~120 min.

### Task 7.1: L3 Unit Tests — Prompt template validation

**Files:**
- Create: `src/__tests__/agents/prompts/visionNode.prompt.test.ts`
- Create: `src/__tests__/agents/prompts/classifyNode.prompt.test.ts`
- Create: `src/__tests__/agents/prompts/understandNode.prompt.test.ts`
- Create: `src/__tests__/agents/prompts/planNode.prompt.test.ts`
- Create: `src/__tests__/agents/prompts/executeNode.prompt.test.ts`
- Create: `src/__tests__/agents/prompts/reviewNode.prompt.test.ts`

- [ ] **Step 1-6:** For each prompt, test:
- `systemPrompt` is non-empty string
- `userPromptTemplate` returns string containing expected sections (topic, LaTeX, visual block)
- `outputContract` validates fixture JSON
- `modelParams` has required keys

### Task 7.2: L3 Unit Tests — Node behavior with fake models

**Files:**
- Create: `src/__tests__/agents/nodes/VisionNode.test.ts`
- Create: `src/__tests__/agents/nodes/ClassifyNode.test.ts`
- Create: `src/__tests__/agents/nodes/UnderstandNode.test.ts`
- etc. for each node

- [ ] **Step 1:** For each node: inject fake model that returns fixture output. Assert state mutations are correct. Assert SSE chunks are pushed. Never call real DeepSeek/Qwen-VL.

### Task 7.3: L3 Unit Tests — Frontend components

**Files:**
- Create: `src/__tests__/features/chat/KnowledgeCard.test.tsx`
- Create: `src/__tests__/features/chat/QuestionSelector.test.tsx`

### Task 7.4: L4 Fake-model demo

**Files:**
- Create: `src/agents/demo/chatGraphDemo.ts`

- [ ] **Step 1:** Create per detailed design §14.2

End-to-end graph run with all models replaced by fixtures. Covers happy path: VisionNode → ClassifyNode → Understand → Plan → Execute → Review → card output. Verify `state.currentPhase === DONE` at end.

Run via `pnpm demo:chat`.

### Task 7.5: Coverage verification

- [ ] **Step 1:** Run `pnpm test:cov` and verify ≥90% line + branch coverage on:
- `src/agents/nodes/algorithm/*.ts`
- `src/agents/nodes/phases/*.ts`
- `src/agents/nodes/flow/VisionNode.ts`
- `src/agents/schemas/*.ts`

---

## Phase 8: Deployment Runbook

> **Prerequisites:** None (independent). Can start anytime.
> **Outcome:** Complete deployment files per detailed design §12.
> **Estimated effort:** 1 subagent session, ~30 min.

### Task 8.1: Create deployment files

**Files:**
- Create: `deploy/nginx.conf` per §12.3
- Create: `deploy/docker-compose.yml` per §12.2
- Create: `deploy/.env.production.example` per §12.4
- Create: `scripts/backup-pg.sh` per §12.5
- Create: `scripts/restore-pg.sh` per §12.5
- Create: `scripts/migrations/dedupe-elicit-messages.sql` per §12.7

- [ ] **Step 1-6:** Create each file per the detailed design sections.
- [ ] **Step 7:** Commit

---

## Self-Review Checklist

- [x] **Spec coverage:** Every section of detailed design §4 (prompts), §5 (algorithms), §6 (vocabulary), §7 (resource list), §8 (error handling), §9 (frontend), §10 (auth), §12 (deployment), §14 (tests) has corresponding tasks.
- [x] **Placeholder scan:** No TBD/TODO markers. All tasks reference specific design doc sections for exact code.
- [x] **Type consistency:** Schema names (`OcrSchema`, `ElicitGraphStateSchema`, `SubProblemStateSchema`, `KnowledgeCardSchema`) and function names (`phaseSignalParse`, `stuckGuard`, `formatVisualBlock`) are used consistently across all tasks.
- [x] **Dependency order:** Phase numbering respects dependency graph — no phase references types/functions from a later phase.
- [x] **Test coverage:** Algorithm tests (2B.4), prompt tests (7.1), node tests (7.2), component tests (7.3), E2E demo (7.4) cover all major subsystems.
- [x] **Hard gates:** Every task ends with `pnpm verify`. No `--no-verify`. Subagent prompt template compliance checked.
