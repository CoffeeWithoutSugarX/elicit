/**
 * Unit tests for GET /api/admin/conversations/[conversationId]
 *
 * The handler:
 * 1. Checks user.email against ADMIN_EMAILS → 403 if not admin.
 * 2. Queries elicit_conversations for the specific conversation → 404 if not found.
 * 3. Queries elicit_messages for that conversation's messages.
 * 4. Returns combined data with camelCase keys wrapped in BaseResponse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted: stable mock references ──────────────────────────────────────────
// Also sets process.env here — vi.hoisted() runs before vi.mock() factories and
// before import resolution, so ADMIN_EMAILS is guaranteed set when the route
// module first loads and captures that constant.
const {
    mockWithAuthImpl,
    mockConvSingle,
    mockMsgOrder,
    mockAdminSupabaseFrom,
} = vi.hoisted(() => {
    process.env.ADMIN_EMAILS = 'admin@example.com';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const mockConvSingle = vi.fn();
    const mockMsgOrder = vi.fn();

    // Two separate query chains per table
    const mockConvChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: mockConvSingle,
    };
    const mockMsgChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: mockMsgOrder,
    };

    const mockAdminSupabaseFrom = vi.fn((table: string) => {
        if (table === 'elicit_conversations') return mockConvChain;
        if (table === 'elicit_messages') return mockMsgChain;
        throw new Error(`Unexpected table: ${table}`);
    });

    return {
        mockWithAuthImpl: vi.fn(),
        mockConvSingle,
        mockMsgOrder,
        mockAdminSupabaseFrom,
    };
});

// ── withAuth: delegate to hoisted mockWithAuthImpl ───────────────────────────
vi.mock('@/lib/auth', () => ({
    withAuth: vi.fn((handler) => async (request: Request, context: { params: unknown }) => {
        return mockWithAuthImpl(handler, request, context);
    }),
}));

// ── server-only mock ──────────────────────────────────────────────────────────
vi.mock('server-only', () => ({}));

// ── adminDb mock ──────────────────────────────────────────────────────────────
vi.mock('@/lib/adminDb', () => ({
    getAdminSupabase: vi.fn(() => ({
        from: mockAdminSupabaseFrom,
    })),
}));

import { GET } from '@/app/api/admin/conversations/[conversationId]/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
    return new NextRequest('http://localhost/api/admin/conversations/conv-123', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
    });
}

function withAdminUser() {
    mockWithAuthImpl.mockImplementation((handler: (req: Request, ctx: { params: unknown; user: { id: string; email: string } }) => Promise<Response>, request: Request, context: { params: unknown }) =>
        handler(request, {
            ...context,
            user: { id: 'test-user-id', email: 'admin@example.com' },
        }),
    );
}

const fakeConvRow = {
    conversation_id: 'conv-123',
    title: 'Test conversation',
    user_id: 'user-1',
    created_at: '2026-01-01T00:00:00Z',
    current_phase: 3,
    has_resolved: false,
};

const fakeMsgRows = [
    {
        message_id: 'msg-1',
        role: 'user',
        content: 'Hello',
        img_url: null,
        created_at: '2026-01-01T00:00:01Z',
        type: 'text',
    },
    {
        message_id: 'msg-2',
        role: 'assistant',
        content: 'World',
        img_url: null,
        created_at: '2026-01-01T00:00:02Z',
        type: 'text',
    },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/conversations/[conversationId]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockConvSingle.mockResolvedValue({ data: fakeConvRow, error: null });
        mockMsgOrder.mockResolvedValue({ data: fakeMsgRows, error: null });
    });

    it('非管理员邮箱 → 返回 403（BaseResponse 形状）', async () => {
        mockWithAuthImpl.mockImplementation((handler: (req: Request, ctx: { params: unknown; user: { id: string; email: string } }) => Promise<Response>, request: Request, context: { params: unknown }) =>
            handler(request, {
                ...context,
                user: { id: 'test-user-id', email: 'hacker@evil.com' },
            }),
        );

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };
        const res = await GET(req, context);

        expect(res.status).toBe(403);
        const body = await res.json();
        // BaseResponse 形状：{ status: -1, message: '无权限', data: null }
        expect(body.status).toBe(-1);
        expect(body.message).toBe('无权限');
        expect(body.data).toBeNull();
    });

    it('会话不存在（single 返回 error）→ 返回 404（BaseResponse 形状）', async () => {
        withAdminUser();
        mockConvSingle.mockResolvedValue({
            data: null,
            error: { message: 'not found' },
        });

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-no-exist' }) };
        const res = await GET(req, context);

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.status).toBe(-1);
        expect(body.message).toBe('会话不存在');
        expect(body.data).toBeNull();
    });

    it('会话存在但 data 为 null → 返回 404（BaseResponse 形状）', async () => {
        withAdminUser();
        mockConvSingle.mockResolvedValue({ data: null, error: null });

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };
        const res = await GET(req, context);

        expect(res.status).toBe(404);
        const body = await res.json();
        expect(body.status).toBe(-1);
        expect(body.message).toBe('会话不存在');
        expect(body.data).toBeNull();
    });

    it('消息查询返回 error → 返回 500（BaseResponse 形状）', async () => {
        withAdminUser();
        mockMsgOrder.mockResolvedValue({
            data: null,
            error: { message: 'msg DB error' },
        });

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };
        const res = await GET(req, context);

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.status).toBe(-1);
        expect(body.message).toBe('消息查询失败');
        expect(body.data).toBeNull();
    });

    it('成功返回会话信息，snake_case 映射为 camelCase（BaseResponse 形状）', async () => {
        withAdminUser();

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };
        const res = await GET(req, context);

        expect(res.status).toBe(200);
        const body = await res.json();
        // BaseResponse 形状：{ status: 200, message: 'Success', data: { conversation, messages } }
        expect(body.status).toBe(200);
        expect(body.message).toBe('Success');
        expect(body.data.conversation).toEqual({
            conversationId: 'conv-123',
            title: 'Test conversation',
            userId: 'user-1',
            createdAt: '2026-01-01T00:00:00Z',
            currentPhase: 3,
            hasResolved: false,
        });
    });

    it('成功返回消息列表，snake_case 映射为 camelCase（BaseResponse 形状）', async () => {
        withAdminUser();

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };
        const res = await GET(req, context);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.data.messages).toHaveLength(2);
        expect(body.data.messages[0]).toEqual({
            messageId: 'msg-1',
            role: 'user',
            content: 'Hello',
            imgUrl: null,
            createdAt: '2026-01-01T00:00:01Z',
            type: 'text',
        });
        expect(body.data.messages[1]).toEqual({
            messageId: 'msg-2',
            role: 'assistant',
            content: 'World',
            imgUrl: null,
            createdAt: '2026-01-01T00:00:02Z',
            type: 'text',
        });
    });

    it('消息 data 为 null 时返回空数组', async () => {
        withAdminUser();
        mockMsgOrder.mockResolvedValue({ data: null, error: null });

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };
        const res = await GET(req, context);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe(200);
        expect(body.data.messages).toEqual([]);
    });
});
