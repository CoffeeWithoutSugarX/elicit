/**
 * Unit tests for POST /api/conversation/[conversationId]/resolve
 *
 * The handler:
 * 1. Marks the conversation as resolved in DB (conversationMapper.update).
 * 2. Reads current graph state via compiledElicitGraph.getState().
 * 3. Updates state with hasResolved=true and selectedQuestionIndex.
 * 4. Streams the graph via compiledElicitGraph.stream().
 * 5. Returns createUIMessageStreamResponse wrapping toUIMessageStream(stream).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock fns ──────────────────────────────────────────────────────────
const {
    mockGraphStream,
    mockGetState,
    mockUpdateState,
    mockConversationUpdate,
    mockCreateUIMessageStreamResponse,
    mockToUIMessageStream,
} = vi.hoisted(() => ({
    mockGraphStream: vi.fn(),
    mockGetState: vi.fn(),
    mockUpdateState: vi.fn(),
    mockConversationUpdate: vi.fn(),
    mockCreateUIMessageStreamResponse: vi.fn(),
    mockToUIMessageStream: vi.fn(),
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
        stream: mockGraphStream,
        getState: mockGetState,
        updateState: mockUpdateState,
    },
}));

// ── ConversationMapper mock ──────────────────────────────────────────────────
// server-only guard needs to be bypassed
vi.mock('server-only', () => ({}));
vi.mock('@/db/mappers/ConversationMapper', () => ({
    conversationMapper: {
        update: mockConversationUpdate,
    },
}));

// ── ai mock ──────────────────────────────────────────────────────────────────
vi.mock('ai', () => ({
    createUIMessageStreamResponse: mockCreateUIMessageStreamResponse,
}));

// ── @ai-sdk/langchain mock ───────────────────────────────────────────────────
vi.mock('@ai-sdk/langchain', () => ({
    toUIMessageStream: mockToUIMessageStream,
}));

import { POST } from '@/app/api/conversation/[conversationId]/resolve/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/conversation/conv-123/resolve', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(body),
    });
}

const fakeStream = Symbol('fakeStream');
const fakeUIStream = Symbol('fakeUIStream');
const fakeResponse = new Response('ok', { status: 200 });

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/conversation/[conversationId]/resolve', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGraphStream.mockResolvedValue(fakeStream);
        mockToUIMessageStream.mockReturnValue(fakeUIStream);
        mockCreateUIMessageStreamResponse.mockReturnValue(fakeResponse);
        mockConversationUpdate.mockResolvedValue([]);
        mockUpdateState.mockResolvedValue(undefined);
        mockGetState.mockResolvedValue({ values: { ocrResult: null } });
    });

    it('ocrResult 缺失（null）时 mapper.update 只传 hasResolved=true，不带 title', async () => {
        // ocrResult 为 null → 取不到 topic → 不写入空标题
        mockGetState.mockResolvedValue({ values: { ocrResult: null } });

        const req = makeRequest({ selectedQuestionIndex: 0 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        expect(mockConversationUpdate).toHaveBeenCalledOnce();
        const [, updateData] = mockConversationUpdate.mock.calls[0];
        expect(updateData.hasResolved).toBe(true);
        expect(updateData.title).toBeUndefined();
    });

    it('ocrResult.questions[index].topic 存在时 mapper.update 带上 title', async () => {
        // 有效 topic → update 应同时写入 hasResolved + title
        mockGetState.mockResolvedValue({
            values: {
                ocrResult: {
                    questions: [
                        { index: 0, topic: '一元二次方程求根' },
                        { index: 1, topic: '等差数列' },
                    ],
                    selectedQuestionIndex: 0,
                },
            },
        });

        const req = makeRequest({ selectedQuestionIndex: 1 });
        const context = { params: Promise.resolve({ conversationId: 'conv-456' }) };

        await POST(req, context);

        expect(mockConversationUpdate).toHaveBeenCalledOnce();
        const [convId, updateData] = mockConversationUpdate.mock.calls[0];
        expect(convId).toBe('conv-456');
        expect(updateData.hasResolved).toBe(true);
        expect(updateData.title).toBe('等差数列');
    });

    it('selectedQuestionIndex 对应题目 topic 为空串时不写入 title', async () => {
        // topic 是空串 → 等价于"取不到" → 不写入 title
        mockGetState.mockResolvedValue({
            values: {
                ocrResult: {
                    questions: [{ index: 0, topic: '' }],
                },
            },
        });

        const req = makeRequest({ selectedQuestionIndex: 0 });
        const context = { params: Promise.resolve({ conversationId: 'conv-789' }) };

        await POST(req, context);

        const [, updateData] = mockConversationUpdate.mock.calls[0];
        expect(updateData.hasResolved).toBe(true);
        expect(updateData.title).toBeUndefined();
    });

    it('selectedQuestionIndex 越界（questions 数组无对应项）时不写入 title', async () => {
        mockGetState.mockResolvedValue({
            values: {
                ocrResult: {
                    questions: [{ index: 0, topic: '数学题' }],
                },
            },
        });

        // index=5 超出 questions 长度
        const req = makeRequest({ selectedQuestionIndex: 5 });
        const context = { params: Promise.resolve({ conversationId: 'conv-oob' }) };

        await POST(req, context);

        const [, updateData] = mockConversationUpdate.mock.calls[0];
        expect(updateData.hasResolved).toBe(true);
        expect(updateData.title).toBeUndefined();
    });

    it('getState 在 mapper.update 之前调用（先读 ocrResult 再写 DB）', async () => {
        // 验证调用顺序：getState 先于 mapper.update
        const callOrder: string[] = [];
        mockGetState.mockImplementation(async () => {
            callOrder.push('getState');
            return { values: { ocrResult: { questions: [{ index: 0, topic: '题目' }] } } };
        });
        mockConversationUpdate.mockImplementation(async () => {
            callOrder.push('update');
            return [];
        });

        const req = makeRequest({ selectedQuestionIndex: 0 });
        const context = { params: Promise.resolve({ conversationId: 'conv-order' }) };

        await POST(req, context);

        expect(callOrder.indexOf('getState')).toBeLessThan(callOrder.indexOf('update'));
    });

    it('调用 getState 读取当前 checkpoint 状态', async () => {
        const req = makeRequest({ selectedQuestionIndex: 1 });
        const context = { params: Promise.resolve({ conversationId: 'conv-abc' }) };

        await POST(req, context);

        expect(mockGetState).toHaveBeenCalledOnce();
        expect(mockGetState).toHaveBeenCalledWith({
            configurable: { thread_id: 'conv-abc' },
        });
    });

    it('updateState 将 hasResolved 和 selectedQuestionIndex 写入 checkpoint', async () => {
        mockGetState.mockResolvedValue({
            values: {
                ocrResult: { questions: ['Q1', 'Q2'], selectedQuestionIndex: 0 },
            },
        });

        const req = makeRequest({ selectedQuestionIndex: 2 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        expect(mockUpdateState).toHaveBeenCalledOnce();
        const [, statePatch] = mockUpdateState.mock.calls[0];
        expect(statePatch.hasResolved).toBe(true);
        expect(statePatch.ocrResult.selectedQuestionIndex).toBe(2);
        // 原有 ocrResult 字段被保留（spread 合并）
        expect(statePatch.ocrResult.questions).toEqual(['Q1', 'Q2']);
    });

    it('ocrResult 为 null 时，updateState 中 ocrResult 设为 undefined', async () => {
        mockGetState.mockResolvedValue({ values: { ocrResult: null } });

        const req = makeRequest({ selectedQuestionIndex: 0 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        const [, statePatch] = mockUpdateState.mock.calls[0];
        expect(statePatch.ocrResult).toBeUndefined();
    });

    it('selectedQuestionIndex 未传时默认为 0', async () => {
        mockGetState.mockResolvedValue({
            values: { ocrResult: { questions: ['Q1'] } },
        });

        const req = makeRequest({});
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        const [, statePatch] = mockUpdateState.mock.calls[0];
        expect(statePatch.ocrResult.selectedQuestionIndex).toBe(0);
    });

    it('调用 graph.stream 传入 userId 和 conversationId，messages 为空数组', async () => {
        const req = makeRequest({ selectedQuestionIndex: 1 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        expect(mockGraphStream).toHaveBeenCalledOnce();
        const [stateArg, configArg] = mockGraphStream.mock.calls[0];
        expect(stateArg.messages).toEqual([]);
        expect(stateArg.userId).toBe('test-user-id');
        expect(stateArg.conversationId).toBe('conv-123');
        expect(configArg.streamMode).toEqual(['values', 'messages', 'custom']);
        expect(configArg.configurable.thread_id).toBe('conv-123');
    });

    it('selectedQuestionIndex 为负数时返回 400 + BaseResponse.ofError 形状', async () => {
        const req = makeRequest({ selectedQuestionIndex: -1 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        const res = await POST(req, context);

        expect(res.status).toBe(400);
        const body = await res.json();
        // BaseResponse.ofError 形状
        expect(body).toHaveProperty('message');
        expect(typeof body.message).toBe('string');
        // 校验失败时不应进入业务逻辑
        expect(mockGetState).not.toHaveBeenCalled();
        expect(mockConversationUpdate).not.toHaveBeenCalled();
    });

    it('selectedQuestionIndex 为非整数（浮点数）时返回 400', async () => {
        const req = makeRequest({ selectedQuestionIndex: 1.5 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        const res = await POST(req, context);

        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body).toHaveProperty('message');
        expect(mockGraphStream).not.toHaveBeenCalled();
    });

    it('返回 createUIMessageStreamResponse 的结果', async () => {
        const req = makeRequest({ selectedQuestionIndex: 0 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        const res = await POST(req, context);

        expect(mockToUIMessageStream).toHaveBeenCalledWith(fakeStream);
        expect(mockCreateUIMessageStreamResponse).toHaveBeenCalledWith({ stream: fakeUIStream });
        expect(res).toBe(fakeResponse);
    });
});
