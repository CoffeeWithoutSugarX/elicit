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

import { adminRequest, AdminUnauthorizedError } from '@/services/api-client/AdminRequest';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const sampleConversation = {
    conversationId: 'conv-001',
    title: '一道数学题',
    userId: 'user-abc',
    createdAt: '2026-01-01T00:00:00Z',
    currentPhase: 0,
    hasResolved: false,
};

const sampleMessage = {
    messageId: 'msg-001',
    role: 0,
    content: '题目内容',
    imgUrl: null,
    createdAt: '2026-01-01T00:01:00Z',
    type: 0,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AdminRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSession.mockResolvedValue({
            data: { session: { access_token: 'admin-token' } },
        });
    });

    // ── getConversations ─────────────────────────────────────────────────────

    describe('getConversations', () => {
        it('成功 → 返回 conversations 数组（从 BaseResponse.data 中提取）', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                // API 现在返回 BaseResponse 形状：{ status, message, data: { conversations } }
                json: async () => ({
                    status: 200,
                    message: 'Success',
                    data: { conversations: [sampleConversation] },
                }),
            });

            const result = await adminRequest.getConversations();

            expect(result).toHaveLength(1);
            expect(result[0]).toEqual(sampleConversation);
        });

        it('fetch 携带正确的 Authorization 头', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 200,
                    message: 'Success',
                    data: { conversations: [] },
                }),
            });

            await adminRequest.getConversations();

            const [url, opts] = mockFetch.mock.calls[0];
            expect(url).toBe('/api/admin/conversations');
            expect(opts.method).toBe('GET');
            expect(opts.headers['Authorization']).toBe('Bearer admin-token');
        });

        it('401 → 抛出 AdminUnauthorizedError', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

            await expect(adminRequest.getConversations()).rejects.toThrow(AdminUnauthorizedError);
        });

        it('403 → 抛出 AdminUnauthorizedError', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

            await expect(adminRequest.getConversations()).rejects.toThrow(AdminUnauthorizedError);
        });

        it('500 → 抛出通用 Error（非 AdminUnauthorizedError）', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

            const err = await adminRequest.getConversations().catch(e => e);
            expect(err).toBeInstanceOf(Error);
            expect(err).not.toBeInstanceOf(AdminUnauthorizedError);
        });
    });

    // ── getConversationDetail ────────────────────────────────────────────────

    describe('getConversationDetail', () => {
        it('成功 → 返回 { conversation, messages }（从 BaseResponse.data 中提取）', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                // API 现在返回 BaseResponse 形状：{ status, message, data: { conversation, messages } }
                json: async () => ({
                    status: 200,
                    message: 'Success',
                    data: {
                        conversation: sampleConversation,
                        messages: [sampleMessage],
                    },
                }),
            });

            const result = await adminRequest.getConversationDetail('conv-001');

            expect(result.conversation).toEqual(sampleConversation);
            expect(result.messages).toHaveLength(1);
            expect(result.messages[0]).toEqual(sampleMessage);
        });

        it('fetch 携带正确的 URL 和 Authorization 头', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    status: 200,
                    message: 'Success',
                    data: { conversation: sampleConversation, messages: [] },
                }),
            });

            await adminRequest.getConversationDetail('conv-001');

            const [url, opts] = mockFetch.mock.calls[0];
            expect(url).toBe('/api/admin/conversations/conv-001');
            expect(opts.method).toBe('GET');
            expect(opts.headers['Authorization']).toBe('Bearer admin-token');
        });

        it('401 → 抛出 AdminUnauthorizedError', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 401 });

            await expect(
                adminRequest.getConversationDetail('conv-001'),
            ).rejects.toThrow(AdminUnauthorizedError);
        });

        it('403 → 抛出 AdminUnauthorizedError', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

            await expect(
                adminRequest.getConversationDetail('conv-001'),
            ).rejects.toThrow(AdminUnauthorizedError);
        });

        it('404 → 抛出 Error("NOT_FOUND")', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

            const err = await adminRequest.getConversationDetail('conv-999').catch(e => e);
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe('NOT_FOUND');
        });

        it('500 → 抛出通用 Error（非 AdminUnauthorizedError）', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

            const err = await adminRequest.getConversationDetail('conv-001').catch(e => e);
            expect(err).toBeInstanceOf(Error);
            expect(err).not.toBeInstanceOf(AdminUnauthorizedError);
        });
    });
});
