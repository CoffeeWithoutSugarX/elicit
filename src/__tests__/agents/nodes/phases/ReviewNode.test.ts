import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockState, makeSubProblem } from '@/__tests__/helpers/mockState';
import type { OcrResult } from '@/agents/schemas/OcrSchema';

// ——— mock chatModel（禁止真实 DeepSeek 调用）———
vi.mock('@/agents/models/deepseek-model', () => ({
    chatModel: {
        invoke: vi.fn(),
    },
}));

// ——— mock getWriter（LangGraph context 函数）———
vi.mock('@langchain/langgraph', () => ({
    getWriter: vi.fn(),
}));

// ——— mock ConversationMapper（含 server-only 导入）———
vi.mock('@/db/mappers/ConversationMapper', () => ({
    conversationMapper: {
        update: vi.fn().mockResolvedValue([]),
    },
}));

// ——— mock loadKnowledgePoints（避免读取真实文件系统）———
vi.mock('@/agents/data/loadKnowledgePoints', () => ({
    knowledgePointsCsv: '一元二次方程根的判别式,北师大八年级上 §5.3\n判别式分类讨论,北师大八年级上 §5.3',
    knowledgePoints: [],
}));

import { reviewNode, reviewNodeName } from '@/agents/nodes/phases/ReviewNode';
import { chatModel } from '@/agents/models/deepseek-model';
import { getWriter } from '@langchain/langgraph';
import { conversationMapper } from '@/db/mappers/ConversationMapper';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

// ——— 辅助：构建可解题 ocrResult ———
function makeSolvableOcrResult(): OcrResult {
    return {
        isSolvable: true,
        subject: 'math',
        grade: '初中',
        questions: [
            {
                index: 0,
                topic: '一元二次方程',
                latexFull: '解 $x^2 - 4x + 3 = 0$',
                givenConditions: ['$x^2 - 4x + 3 = 0$'],
                implicitConditions: [],
                goal: '求 x 的值',
                milestones: ['分解因式', '求根'],
                visualFeaturesNeeded: false,
                visualDescription: '',
                subProblems: [
                    {
                        index: 0,
                        goal: '求 x 的值',
                        givenConditions: ['$x^2 - 4x + 3 = 0$'],
                        milestones: ['分解因式', '求根'],
                    },
                ],
            },
        ],
        isMulti: false,
        visualFeaturesNeeded: false,
        errorReason: null,
        selectedQuestionIndex: 0,
    };
}

// ——— 辅助：构建含合法知识卡片 JSON 的模型响应 ———
function makeValidCardResponse(): string {
    return `你做得很好！这道题以后再遇到，你第一步会想到什么？

\`\`\`json
{
  "schemaVersion": 1,
  "type": "knowledge_card",
  "knowledgePoints": [
    { "name": "一元二次方程根的判别式", "textbookRef": "北师大八年级上 §5.3" }
  ],
  "methods": [
    { "name": "判别式建不等式", "category": 0 }
  ],
  "insight": "两实根 ⟹ Δ ≥ 0；将 Δ 代入建立不等式，解出参数范围。",
  "subProblemSummaries": [
    {
      "index": 0,
      "status": "done",
      "insightPoints": ["两实根 ⟹ Δ ≥ 0", "解出 m ≤ 4"]
    }
  ]
}
\`\`\`
phase_signal: "COMPLETED"`;
}

// ——— 辅助：构建含非法 JSON 的模型响应 ———
function makeInvalidCardResponse(): string {
    return `你做得很好！有没有更短的路？

\`\`\`json
{ "not_a_valid_card": true }
\`\`\`
phase_signal: "COMPLETED"`;
}

// ——— 辅助：构建无 json 围栏的模型响应 ———
function makeNoCardResponse(): string {
    return `你做得很好！这道题的关键在于判别式。
phase_signal: "COMPLETED"`;
}

describe('reviewNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. 成功生成知识卡片 — knowledge_card SSE + DONE 状态 ─────────────────────
    it('模型输出合法卡片 → knowledge_card chunk 推送，currentPhase=DONE，hasResolved=true', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: makeValidCardResponse() } as never);

        const sp = makeSubProblem({ index: 0, status: 'done', insightPoints: ['两实根 ⟹ Δ ≥ 0'] });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [sp],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.REVIEW,
            hasResolved: false,
        });

        const result = await reviewNode(state);

        // 返回 AI 消息
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');

        // 状态更新
        expect(result.currentPhase).toBe(PolyaPhase.DONE);
        expect(result.hasResolved).toBe(true);

        // knowledge_card SSE chunk 已推送（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'knowledge_card' }),
        );
        // phase_changed → DONE SSE chunk 已推送（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed', phase: PolyaPhase.DONE }),
        );
        // nostream 模式下，干净正文（已剥去 ```json 围栏）应通过 assistant_message chunk 主动推出
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'assistant_message' }),
        );

        // C9 dual-write：conversationMapper.update 被调用
        expect(conversationMapper.update).toHaveBeenCalledWith(
            state.conversationId,
            expect.objectContaining({ hasResolved: true, currentPhase: PolyaPhase.DONE }),
        );
    });

    // ── 2. 卡片 JSON 校验失败 — 不推 knowledge_card，仍返回文本 ──────────────────
    it('卡片 JSON schema 校验失败 → 不推 knowledge_card chunk，仍返回文本回复', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: makeInvalidCardResponse() } as never);

        const sp = makeSubProblem({ index: 0, status: 'done' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [sp],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.REVIEW,
        });

        const result = await reviewNode(state);

        // 仍然有消息回复
        expect(result.messages).toHaveLength(1);

        // knowledge_card chunk 不推送（kind 字段新契约）
        expect(mockWriter).not.toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'knowledge_card' }),
        );
        // phase_changed → DONE 仍推送（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed', phase: PolyaPhase.DONE }),
        );
        // 状态仍更新
        expect(result.currentPhase).toBe(PolyaPhase.DONE);
        expect(result.hasResolved).toBe(true);
    });

    // ── 3. 模型输出无 json 围栏 — 不推 knowledge_card ────────────────────────────
    it('模型输出无 ```json``` 围栏 → 不推 knowledge_card chunk', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: makeNoCardResponse() } as never);

        const sp = makeSubProblem({ index: 0, status: 'done' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [sp],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.REVIEW,
        });

        const result = await reviewNode(state);

        expect(result.messages).toHaveLength(1);
        // knowledge_card 不推送（无 json 围栏）（kind 字段新契约）
        expect(mockWriter).not.toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'knowledge_card' }),
        );
        // phase_changed 仍推送（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed', phase: PolyaPhase.DONE }),
        );
    });

    // ── 4. ocrResult 缺失 → 直接返回 {} ──────────────────────────────────────────
    it('ocrResult 为 undefined → 直接返回 {}，不调用模型', async () => {
        const state = createMockState({ ocrResult: undefined, currentPhase: PolyaPhase.REVIEW });
        const result = await reviewNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 5. ocrResult.isSolvable=false → 直接返回 {} ──────────────────────────────
    it('ocrResult.isSolvable=false → 直接返回 {}，不调用模型', async () => {
        const ocrResult: OcrResult = {
            isSolvable: false,
            subject: 'chinese',
            questions: [],
            errorReason: 'NOT_SOLVABLE',
        };
        const state = createMockState({ ocrResult, currentPhase: PolyaPhase.REVIEW });
        const result = await reviewNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 6. DB 写失败（非致命）— 仍返回正常结果 ───────────────────────────────────
    it('conversationMapper.update 抛异常 → 非致命，仍返回正常状态', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: makeValidCardResponse() } as never);
        vi.mocked(conversationMapper.update).mockRejectedValue(new Error('DB connection lost'));

        const sp = makeSubProblem({ index: 0, status: 'done' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [sp],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.REVIEW,
        });

        const result = await reviewNode(state);

        // 即使 DB 失败，状态仍正确更新
        expect(result.currentPhase).toBe(PolyaPhase.DONE);
        expect(result.hasResolved).toBe(true);
        expect(result.messages).toHaveLength(1);
    });

    // ── 7. chatModel 抛出异常 → 容错兜底回复 ─────────────────────────────────────
    it('chatModel 抛异常 → 容错兜底，返回错误提示消息', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockRejectedValue(new Error('Network timeout'));

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem({ status: 'done' })],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.REVIEW,
        });

        const result = await reviewNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        // 容错时不更新 phase
        expect(result.currentPhase).toBeUndefined();
    });

    // ── 8. 多小问题（blocked + done）— 正确处理 ──────────────────────────────────
    it('多小问（done+blocked）→ 卡片正常生成，phase=DONE', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        const multiCardResponse = `你很棒！第一小问顺利完成了。

\`\`\`json
{
  "schemaVersion": 1,
  "type": "knowledge_card",
  "knowledgePoints": [
    { "name": "二次函数图像", "textbookRef": "北师大九年级上 §3.2" }
  ],
  "methods": [
    { "name": "令 y=0 求交点", "category": 2 }
  ],
  "insight": "小问①：令 y=0 解方程得坐标。小问②：三角形面积（未突破）。",
  "subProblemSummaries": [
    { "index": 0, "status": "done", "insightPoints": ["令 y=0 解方程"] },
    { "index": 1, "status": "blocked", "insightPoints": [], "blockedHint": "面积公式" }
  ]
}
\`\`\`
phase_signal: "COMPLETED"`;

        vi.mocked(chatModel.invoke).mockResolvedValue({ content: multiCardResponse } as never);

        const sp0 = makeSubProblem({ index: 0, status: 'done', insightPoints: ['令 y=0 解方程'] });
        const sp1 = makeSubProblem({ index: 1, status: 'blocked', goal: '求面积' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [sp0, sp1],
            currentSubProblemIndex: 1,
            currentPhase: PolyaPhase.REVIEW,
        });

        const result = await reviewNode(state);

        expect(result.currentPhase).toBe(PolyaPhase.DONE);
        expect(result.hasResolved).toBe(true);
        // 多小问场景 knowledge_card 推送（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'knowledge_card' }),
        );
    });

    // ── 9. reviewNodeName 导出值正确 ─────────────────────────────────────────────
    it('reviewNodeName 为 "reviewNode"', () => {
        expect(reviewNodeName).toBe('reviewNode');
    });
});
