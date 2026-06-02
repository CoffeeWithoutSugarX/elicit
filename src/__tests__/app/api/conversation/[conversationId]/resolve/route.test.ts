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

    it('先将会话标记为 hasResolved=true 写入 DB', async () => {
        const req = makeRequest({ selectedQuestionIndex: 0 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        expect(mockConversationUpdate).toHaveBeenCalledOnce();
        expect(mockConversationUpdate).toHaveBeenCalledWith('conv-123', { hasResolved: true });
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

    it('返回 createUIMessageStreamResponse 的结果', async () => {
        const req = makeRequest({ selectedQuestionIndex: 0 });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        const res = await POST(req, context);

        expect(mockToUIMessageStream).toHaveBeenCalledWith(fakeStream);
        expect(mockCreateUIMessageStreamResponse).toHaveBeenCalledWith({ stream: fakeUIStream });
        expect(res).toBe(fakeResponse);
    });
});
