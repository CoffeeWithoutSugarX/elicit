/**
 * Unit tests for GET /api/conversation/[conversationId]/state
 *
 * The handler:
 * 1. 校验 Authorization token（withAuth 包装）。
 * 2. 调用 compiledElicitGraph.getState() 获取 checkpoint 快照。
 * 3. 无 checkpoint 时返回默认值（200）。
 * 4. userId 不匹配时返回 403。
 * 5. 正常情况返回 camelCase 的展示字段：
 *    currentPhase / currentSubProblemIndex / totalSubProblems / insightPoints / hasResolved。
 * 6. getState 抛错时返回 500。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock fns ──────────────────────────────────────────────────────────
const { mockGetState } = vi.hoisted(() => ({
    mockGetState: vi.fn(),
}));

// ── withAuth pass-through mock ───────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
    withAuth: vi.fn((handler) => async (request: Request, context: { params: unknown }) => {
        return handler(request, { ...context, user: { id: 'test-user-id' } });
    }),
}));

// ── ChatGraph mock ───────────────────────────────────────────────────────────
vi.mock('@/agents/graphs/ChatGraph', () => ({
    compiledElicitGraph: {
        getState: mockGetState,
    },
}));

import { GET } from '@/app/api/conversation/[conversationId]/state/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
    return new NextRequest('http://localhost/api/conversation/conv-123/state', {
        method: 'GET',
        headers: {
            Authorization: 'Bearer test-token',
        },
    });
}

function makeContext(conversationId = 'conv-123') {
    return { params: Promise.resolve({ conversationId }) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/conversation/[conversationId]/state', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --------------------------------------------------
    // 正常回填映射
    // --------------------------------------------------
    it('正常返回 checkpoint 中的展示字段（含派生字段）', async () => {
        mockGetState.mockResolvedValueOnce({
            values: {
                userId: 'test-user-id',
                currentPhase: 2,
                currentSubProblemIndex: 1,
                subProblems: [
                    { index: 0, insightPoints: ['洞察A'] },
                    { index: 1, insightPoints: ['洞察B', '洞察C'] },
                ],
                hasResolved: true,
            },
        });

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.currentPhase).toBe(2);
        expect(body.currentSubProblemIndex).toBe(1);
        // totalSubProblems 是 subProblems.length
        expect(body.totalSubProblems).toBe(2);
        // insightPoints 来自 subProblems[currentSubProblemIndex]
        expect(body.insightPoints).toEqual(['洞察B', '洞察C']);
        expect(body.hasResolved).toBe(true);
    });

    it('insightPoints 取当前 currentSubProblemIndex 对应子问题的 insightPoints', async () => {
        mockGetState.mockResolvedValueOnce({
            values: {
                userId: 'test-user-id',
                currentPhase: 1,
                currentSubProblemIndex: 0,
                subProblems: [
                    { index: 0, insightPoints: ['洞察X', '洞察Y'] },
                    { index: 1, insightPoints: ['洞察Z'] },
                ],
                hasResolved: false,
            },
        });

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(body.insightPoints).toEqual(['洞察X', '洞察Y']);
    });

    it('totalSubProblems 是 subProblems 数组长度', async () => {
        mockGetState.mockResolvedValueOnce({
            values: {
                userId: 'test-user-id',
                currentPhase: 1,
                currentSubProblemIndex: 0,
                subProblems: [
                    { index: 0, insightPoints: [] },
                    { index: 1, insightPoints: [] },
                    { index: 2, insightPoints: [] },
                ],
                hasResolved: false,
            },
        });

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(body.totalSubProblems).toBe(3);
    });

    // --------------------------------------------------
    // 无 checkpoint 返回默认值
    // --------------------------------------------------
    it('snapshot.values 为空对象时返回默认值（200）', async () => {
        mockGetState.mockResolvedValueOnce({ values: {} });

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            currentPhase: 0,
            currentSubProblemIndex: 0,
            totalSubProblems: 0,
            insightPoints: [],
            hasResolved: false,
        });
    });

    it('snapshot.values 中 currentPhase 为 undefined 时返回默认值（200）', async () => {
        mockGetState.mockResolvedValueOnce({
            values: {
                userId: 'test-user-id',
                hasResolved: false,
                // currentPhase 故意缺失
            },
        });

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toEqual({
            currentPhase: 0,
            currentSubProblemIndex: 0,
            totalSubProblems: 0,
            insightPoints: [],
            hasResolved: false,
        });
    });

    it('snapshot 为 null/undefined 时返回默认值（200）', async () => {
        mockGetState.mockResolvedValueOnce(null);

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.currentPhase).toBe(0);
        expect(body.hasResolved).toBe(false);
    });

    // --------------------------------------------------
    // userId 不匹配 → 403
    // --------------------------------------------------
    it('snapshot.values.userId 与当前用户 id 不匹配时返回 403', async () => {
        mockGetState.mockResolvedValueOnce({
            values: {
                userId: 'other-user-id',  // 不是 test-user-id
                currentPhase: 1,
                currentSubProblemIndex: 0,
                subProblems: [],
                hasResolved: false,
            },
        });

        const res = await GET(makeRequest(), makeContext());
        expect(res.status).toBe(403);
    });

    it('snapshot.values 有数据但 userId 缺失时返回 403（fail-closed）', async () => {
        // checkpoint 有实际业务数据但未记录 userId → 拒绝访问，不泄露数据
        mockGetState.mockResolvedValueOnce({
            values: {
                currentPhase: 1,
                currentSubProblemIndex: 0,
                subProblems: [{ index: 0, insightPoints: [] }],
                hasResolved: true,
                // userId 字段故意缺失
            },
        });

        const res = await GET(makeRequest(), makeContext());
        expect(res.status).toBe(403);
    });

    // --------------------------------------------------
    // getState 抛错 → 500
    // --------------------------------------------------
    it('getState 抛错时返回 500 + JSON error', async () => {
        mockGetState.mockRejectedValueOnce(new Error('数据库连接失败'));

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe('数据库连接失败');
    });

    it('getState 抛非 Error 对象时使用默认错误消息', async () => {
        mockGetState.mockRejectedValueOnce('some string error');

        const res = await GET(makeRequest(), makeContext());
        const body = await res.json();

        expect(res.status).toBe(500);
        expect(body.error).toBe('获取会话状态失败，请重试');
    });

    // --------------------------------------------------
    // getState 调用参数校验
    // --------------------------------------------------
    it('getState 以正确的 thread_id 调用', async () => {
        mockGetState.mockResolvedValueOnce({ values: {} });

        await GET(makeRequest(), makeContext('conv-abc'));

        expect(mockGetState).toHaveBeenCalledWith({
            configurable: { thread_id: 'conv-abc' },
        });
    });
});
