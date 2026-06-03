/**
 * Unit tests for POST /api/chat/[conversationId]
 *
 * The handler:
 * 1. Parses the request body (message, optional imgUrl).
 * 2. If imgUrl is present, calls ossService.getSignedUrl to get a presigned URL.
 * 3. Streams the graph via compiledElicitGraph.stream().
 * 4. Returns createUIMessageStreamResponse wrapping toUIMessageStream(stream).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock fns (must exist before vi.mock factories are hoisted) ────────
const { mockGraphStream, mockGetSignedUrl, mockCreateUIMessageStreamResponse, mockToUIMessageStream } = vi.hoisted(() => ({
    mockGraphStream: vi.fn(),
    mockGetSignedUrl: vi.fn(),
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
    },
}));

// ── OssService mock ──────────────────────────────────────────────────────────
vi.mock('@/services/OssService', () => ({
    ossService: {
        getSignedUrl: mockGetSignedUrl,
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

// ── @langchain/core/messages mock ────────────────────────────────────────────
// HumanMessage is used with `new`, so the mock must be a constructor function.
vi.mock('@langchain/core/messages', () => ({
    HumanMessage: function (this: Record<string, unknown>, content: string) {
        this.role = 'human';
        this.content = content;
    },
}));

import { POST } from '@/app/api/chat/[conversationId]/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/chat/conv-123', {
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

describe('POST /api/chat/[conversationId]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGraphStream.mockResolvedValue(fakeStream);
        mockToUIMessageStream.mockReturnValue(fakeUIStream);
        mockCreateUIMessageStreamResponse.mockReturnValue(fakeResponse);
    });

    it('成功处理无 imgUrl 的请求，调用 graph.stream 并返回 UI stream 响应', async () => {
        const req = makeRequest({ message: 'hello', role: 'user' });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        const res = await POST(req, context);

        // 不应该调用 getSignedUrl
        expect(mockGetSignedUrl).not.toHaveBeenCalled();

        // 应该调用 graph.stream
        expect(mockGraphStream).toHaveBeenCalledOnce();
        const [stateArg] = mockGraphStream.mock.calls[0];
        expect(stateArg.userId).toBe('test-user-id');
        expect(stateArg.conversationId).toBe('conv-123');
        expect(stateArg.questionImgUrl).toBeUndefined();
        expect(stateArg.messages).toHaveLength(1);

        // 应该调用 toUIMessageStream 包装 graph stream（第二参数为 callbacks 对象，含 onFinal）
        expect(mockToUIMessageStream).toHaveBeenCalledWith(fakeStream, expect.objectContaining({ onFinal: expect.any(Function) }));

        // 应该调用 createUIMessageStreamResponse
        expect(mockCreateUIMessageStreamResponse).toHaveBeenCalledWith({
            stream: fakeUIStream,
        });

        expect(res).toBe(fakeResponse);
    });

    it('有 imgUrl 时先调用 ossService.getSignedUrl 获取预签名 URL', async () => {
        const signedUrl = 'https://oss.example.com/signed-image.png?token=xyz';
        mockGetSignedUrl.mockResolvedValue(signedUrl);

        const req = makeRequest({
            message: 'check this image',
            role: 'user',
            imgUrl: 'conv-123/2026-01-01/image.png',
        });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        expect(mockGetSignedUrl).toHaveBeenCalledOnce();
        expect(mockGetSignedUrl).toHaveBeenCalledWith('conv-123/2026-01-01/image.png');

        const [stateArg] = mockGraphStream.mock.calls[0];
        expect(stateArg.questionImgUrl).toBe(signedUrl);
    });

    it('graph.stream 使用正确的 streamMode 和 thread_id 配置', async () => {
        const req = makeRequest({ message: 'hi', role: 'user' });
        const context = { params: Promise.resolve({ conversationId: 'conv-abc' }) };

        await POST(req, context);

        const [, configArg] = mockGraphStream.mock.calls[0];
        expect(configArg.streamMode).toEqual(['values', 'messages', 'custom']);
        expect(configArg.configurable.thread_id).toBe('conv-abc');
    });

    it('HumanMessage 以请求体中的 message 内容构建', async () => {
        const req = makeRequest({ message: 'what is 2+2?', role: 'user' });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        const [stateArg] = mockGraphStream.mock.calls[0];
        // HumanMessage mock 构造函数将 role 和 content 挂到实例上
        expect(stateArg.messages[0].role).toBe('human');
        expect(stateArg.messages[0].content).toBe('what is 2+2?');
    });

    it('imgUrl 为 null 时传给 graph.stream 的 questionImgUrl 是 undefined 而非 null（ZodError 修复）', async () => {
        // 后续消息无图片时 body.imgUrl === null，schema z.string().optional() 拒绝 null，修复后转 undefined
        const req = makeRequest({ message: '继续解题', role: 'user', imgUrl: null });
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        await POST(req, context);

        expect(mockGetSignedUrl).not.toHaveBeenCalled();
        const [stateArg] = mockGraphStream.mock.calls[0];
        expect(stateArg.questionImgUrl).toBeUndefined();
    });

    it('graph.stream 同步抛出错误时返回结构化 500 JSON', async () => {
        // 模拟 stream 同步抛出（如 ZodError）
        mockGraphStream.mockRejectedValueOnce(new Error('ZodError: expected string, received null'));

        const req = makeRequest({ message: 'hello', role: 'user' });
        const context = { params: Promise.resolve({ conversationId: 'conv-err' }) };

        const res = await POST(req, context);

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body).toHaveProperty('error');
        expect(typeof body.error).toBe('string');
    });
});
