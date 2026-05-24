import { describe, it, expect, vi, beforeEach } from 'vitest';

// ——— 阻止 server-only 校验 ———
vi.mock('server-only', () => ({}));

// ——— mock ConversationMapper（含 server-only 导入）———
vi.mock('@/db/mappers/ConversationMapper', () => ({
    conversationMapper: { findById: vi.fn(), create: vi.fn(), update: vi.fn() },
}));

// ——— mock reconcileHasResolved（避免真实 DB 调用）———
vi.mock('@/agents/state/reconcileHasResolved', () => ({
    reconcileHasResolved: vi.fn().mockResolvedValue(undefined),
}));

// ——— mock getWriter（LangGraph context 函数）———
vi.mock('@langchain/langgraph', () => ({
    getWriter: vi.fn().mockReturnValue(null),
}));

import { startFinOutNode } from '@/agents/nodes/flow/StartFinoutNode';
import { conversationMapper } from '@/db/mappers/ConversationMapper';
import { conversationNodeName } from '@/agents/nodes/flow/ConversationNode';
import { ocrNodeName } from '@/agents/nodes/flow/OcrNode';
import { classifyNodeName } from '@/agents/nodes/phases/ClassifyNode';
import { understandNodeName } from '@/agents/nodes/phases/UnderstandNode';
import { planNodeName } from '@/agents/nodes/phases/PlanNode';
import { executeNodeName } from '@/agents/nodes/phases/ExecuteNode';
import { reviewNodeName } from '@/agents/nodes/phases/ReviewNode';
import { createMockState } from '@/__tests__/helpers/mockState';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { ProblemType } from '@/types/enums/problemType.enum';

const mockFindById = vi.mocked(conversationMapper.findById);

// 辅助：构造足够最简的 DB 记录
const makeDbRecord = (overrides: Record<string, unknown> = {}) => ({
    conversationId: '00000000-0000-0000-0000-000000000002',
    userId: '00000000-0000-0000-0000-000000000001',
    title: 'test',
    hasResolved: false,
    currentPhase: PolyaPhase.UNDERSTAND,
    problemType: undefined,
    ...overrides,
});

describe('startFinOutNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. 新会话（DB 无记录）→ conversationNodeName ──────────────────────────

    it('新会话（findById 返回 null）→ 返回 [conversationNodeName]', async () => {
        mockFindById.mockResolvedValue(null as never);

        const state = createMockState({
            hasResolved: false,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toContain(conversationNodeName);
    });

    // ── 2. 有图片且未解析 → ocrNodeName ──────────────────────────────────────

    it('会话存在 + questionImgUrl + hasResolved=false → 返回 [ocrNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord() as never);

        const state = createMockState({
            hasResolved: false,
            questionImgUrl: 'https://example.com/img.jpg',
        });
        const result = await startFinOutNode(state);

        expect(result).toContain(ocrNodeName);
        expect(result).not.toContain(classifyNodeName);
    });

    // ── 3. 新会话 + 有图片 → conversationNodeName + ocrNodeName ──────────────

    it('新会话 + questionImgUrl → 同时返回 conversationNodeName 和 ocrNodeName', async () => {
        mockFindById.mockResolvedValue(null as never);

        const state = createMockState({
            hasResolved: false,
            questionImgUrl: 'https://example.com/img.jpg',
        });
        const result = await startFinOutNode(state);

        expect(result).toContain(conversationNodeName);
        expect(result).toContain(ocrNodeName);
    });

    // ── 4. hasResolved=true, problemType=undefined → classifyNodeName ─────────

    it('hasResolved=true, problemType=undefined → 返回 [classifyNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        const state = createMockState({
            hasResolved: true,
            problemType: undefined,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toEqual([classifyNodeName]);
    });

    // ── 5. hasResolved=true, problemType set, UNDERSTAND → understandNodeName ─

    it('hasResolved=true + problemType + currentPhase=UNDERSTAND → [understandNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        const state = createMockState({
            hasResolved: true,
            problemType: ProblemType.ALGEBRA,
            currentPhase: PolyaPhase.UNDERSTAND,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toEqual([understandNodeName]);
    });

    // ── 6. hasResolved=true, problemType set, PLAN → planNodeName ────────────

    it('hasResolved=true + problemType + currentPhase=PLAN → [planNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        const state = createMockState({
            hasResolved: true,
            problemType: ProblemType.GEOMETRY,
            currentPhase: PolyaPhase.PLAN,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toEqual([planNodeName]);
    });

    // ── 7. hasResolved=true, problemType set, EXECUTE → executeNodeName ───────

    it('hasResolved=true + problemType + currentPhase=EXECUTE → [executeNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        const state = createMockState({
            hasResolved: true,
            problemType: ProblemType.FUNCTION,
            currentPhase: PolyaPhase.EXECUTE,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toEqual([executeNodeName]);
    });

    // ── 8. hasResolved=true, problemType set, REVIEW → reviewNodeName ─────────

    it('hasResolved=true + problemType + currentPhase=REVIEW → [reviewNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        const state = createMockState({
            hasResolved: true,
            problemType: ProblemType.OTHER,
            currentPhase: PolyaPhase.REVIEW,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toEqual([reviewNodeName]);
    });

    // ── 9. 兜底：会话存在 + 无图片 + 未解析 → understandNodeName ───────────────

    it('兜底：会话存在 + 无图片 + hasResolved=false → [understandNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord() as never);

        const state = createMockState({
            hasResolved: false,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toEqual([understandNodeName]);
    });

    // ── 10. DONE 阶段（未知阶段）→ 兜底 understandNodeName ────────────────────

    it('hasResolved=true + problemType + currentPhase=DONE → 兜底 [understandNodeName]', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        const state = createMockState({
            hasResolved: true,
            problemType: ProblemType.ALGEBRA,
            currentPhase: PolyaPhase.DONE,
            questionImgUrl: undefined,
        });
        const result = await startFinOutNode(state);

        expect(result).toEqual([understandNodeName]);
    });
});
