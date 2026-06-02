import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockGetSession } = vi.hoisted(() => ({
    mockGetSession: vi.fn(),
}));

// ── Mock supabase (for getSession) ───────────────────────────────────────────
vi.mock('@/db/supabase/supabase', () => ({
    supabase: {
        auth: {
            getSession: mockGetSession,
        },
    },
}));

// ── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { chatRequest } from '@/services/api-client/ChatRequest';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSampleMessage(): ChatMessageProps {
    return new ChatMessageProps(
        'msg-001',
        'conv-001',
        ChatMessageRole.USER,
        'Hello',
        ChatMessageType.TEXT,
        null,
    );
}

function makeReadableStream(content: string): ReadableStream {
    const encoder = new TextEncoder();
    return new ReadableStream({
        start(controller) {
            controller.enqueue(encoder.encode(content));
            controller.close();
        },
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ChatRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSession.mockResolvedValue({
            data: { session: { access_token: 'test-token' } },
        });
    });

    // ── getRawResponse ───────────────────────────────────────────────────────

    describe('getRawResponse', () => {
        it('成功响应 → 返回 Response 对象', async () => {
            const fakeBody = makeReadableStream('data: {"id":"1"}\n');
            const fakeResponse = new Response(fakeBody, { status: 200 });
            mockFetch.mockResolvedValue(fakeResponse);

            const msg = makeSampleMessage();
            const result = await chatRequest.getRawResponse(msg);

            expect(result).toBe(fakeResponse);
        });

        it('fetch 调用时传入正确的 URL 和 Authorization 头', async () => {
            const fakeBody = makeReadableStream('');
            mockFetch.mockResolvedValue(new Response(fakeBody, { status: 200 }));

            const msg = makeSampleMessage();
            await chatRequest.getRawResponse(msg);

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/chat/conv-001',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                        'Content-Type': 'application/json',
                    }),
                }),
            );
        });

        it('fetch 调用时 body 为序列化后的 message', async () => {
            const fakeBody = makeReadableStream('');
            mockFetch.mockResolvedValue(new Response(fakeBody, { status: 200 }));

            const msg = makeSampleMessage();
            await chatRequest.getRawResponse(msg);

            const [, options] = mockFetch.mock.calls[0];
            expect(JSON.parse(options.body)).toMatchObject({
                id: 'msg-001',
                conversationId: 'conv-001',
            });
        });

        it('session 为 null → Authorization 为 "Bearer undefined"（不抛出）', async () => {
            mockGetSession.mockResolvedValue({ data: { session: null } });
            const fakeBody = makeReadableStream('');
            mockFetch.mockResolvedValue(new Response(fakeBody, { status: 200 }));

            const msg = makeSampleMessage();
            await chatRequest.getRawResponse(msg);

            const [, options] = mockFetch.mock.calls[0];
            expect(options.headers['Authorization']).toBe('Bearer undefined');
        });

        it('response.ok 为 false → 抛出 Error', async () => {
            mockFetch.mockResolvedValue(
                new Response(null, { status: 500, statusText: 'Internal Server Error' }),
            );

            const msg = makeSampleMessage();
            await expect(chatRequest.getRawResponse(msg)).rejects.toThrow(
                'Failed to get chat response',
            );
        });

        it('response.body 为 null → 抛出 Error', async () => {
            // status 200 但 body 为 null
            const fakeResponse = new Response(null, { status: 200 });
            mockFetch.mockResolvedValue(fakeResponse);

            const msg = makeSampleMessage();
            await expect(chatRequest.getRawResponse(msg)).rejects.toThrow(
                'Failed to get chat response',
            );
        });
    });

    // ── getChatResponse ──────────────────────────────────────────────────────

    describe('getChatResponse', () => {
        it('返回 streamIterator 的 AsyncGenerator', async () => {
            const msgData = { id: '1', type: 'text', delta: 'hello', data: {} };
            const fakeBody = makeReadableStream(`data: ${JSON.stringify(msgData)}\n`);
            mockFetch.mockResolvedValue(new Response(fakeBody, { status: 200 }));

            const msg = makeSampleMessage();
            const iterator = await chatRequest.getChatResponse(msg);

            // 消费 generator
            const items: unknown[] = [];
            for await (const item of iterator) {
                items.push(item);
            }

            expect(items).toHaveLength(1);
            expect(items[0]).toEqual(msgData);
        });

        it('getRawResponse 抛出异常 → getChatResponse 也抛出', async () => {
            mockFetch.mockResolvedValue(new Response(null, { status: 401 }));

            const msg = makeSampleMessage();
            await expect(chatRequest.getChatResponse(msg)).rejects.toThrow(
                'Failed to get chat response',
            );
        });
    });
});
