/**
 * Unit tests for GET /api/admin/conversations
 *
 * The handler:
 * 1. Checks user.email against ADMIN_EMAILS env var whitelist → 403 if not admin.
 * 2. Dynamically imports @/lib/adminDb and calls getAdminSupabase().
 * 3. Queries elicit_conversations ordered by created_at desc, limit 200.
 * 4. Maps DB snake_case rows to camelCase and returns them wrapped in BaseResponse.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted: stable mock references that survive vi.clearAllMocks ─────────────
// Also sets process.env here — vi.hoisted() runs before vi.mock() factories and
// before import resolution, so ADMIN_EMAILS is guaranteed to be set when the
// route module first loads and captures that constant.
const { mockWithAuthImpl, mockSupabaseLimit, mockAdminSupabaseFrom } = vi.hoisted(() => {
    process.env.ADMIN_EMAILS = 'admin@example.com,superuser@example.com';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';

    const mockSupabaseLimit = vi.fn();
    const mockSupabaseOrder = vi.fn().mockReturnValue({ limit: mockSupabaseLimit });
    const mockSupabaseSelect = vi.fn().mockReturnValue({ order: mockSupabaseOrder });
    const mockAdminSupabaseFrom = vi.fn().mockReturnValue({ select: mockSupabaseSelect });

    return {
        mockWithAuthImpl: vi.fn(),
        mockSupabaseLimit,
        mockSupabaseOrder,
        mockSupabaseSelect,
        mockAdminSupabaseFrom,
    };
});

// ── withAuth: delegate to hoisted mockWithAuthImpl ───────────────────────────
vi.mock('@/lib/auth', () => ({
    withAuth: vi.fn((handler) => async (request: Request, context: { params: unknown }) => {
        return mockWithAuthImpl(handler, request, context);
    }),
}));

// ── server-only mock (adminDb has 'server-only' import) ──────────────────────
vi.mock('server-only', () => ({}));

// ── adminDb mock (dynamic import in route is resolved to this) ────────────────
vi.mock('@/lib/adminDb', () => ({
    getAdminSupabase: vi.fn(() => ({
        from: mockAdminSupabaseFrom,
    })),
}));

import { GET } from '@/app/api/admin/conversations/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
    return new NextRequest('http://localhost/api/admin/conversations', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
    });
}

/** Configure withAuth to inject a user with the given email */
function withUser(email: string | null) {
    mockWithAuthImpl.mockImplementation((handler: (req: Request, ctx: { params: unknown; user: { id: string; email: string | null } }) => Promise<Response>, request: Request, context: { params: unknown }) =>
        handler(request, { ...context, user: { id: 'test-user-id', email } }),
    );
}

const fakeRows = [
    {
        conversation_id: 'conv-1',
        title: 'First conversation',
        user_id: 'user-1',
        created_at: '2026-01-02T00:00:00Z',
        current_phase: 2,
        has_resolved: false,
    },
    {
        conversation_id: 'conv-2',
        title: 'Second conversation',
        user_id: 'user-2',
        created_at: '2026-01-01T00:00:00Z',
        current_phase: 1,
        has_resolved: true,
    },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/admin/conversations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Re-wire the chain after clearAllMocks (clearAllMocks resets mock return values)
        const mockSupabaseOrder = vi.fn().mockReturnValue({ limit: mockSupabaseLimit });
        const mockSupabaseSelect = vi.fn().mockReturnValue({ order: mockSupabaseOrder });
        mockAdminSupabaseFrom.mockReturnValue({ select: mockSupabaseSelect });

        mockSupabaseLimit.mockResolvedValue({ data: fakeRows, error: null });
    });

    it('非管理员邮箱 → 返回 403 无权限（BaseResponse 形状）', async () => {
        withUser('notadmin@example.com');

        const req = makeRequest();
        const res = await GET(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(403);
        const body = await res.json();
        // BaseResponse 形状：{ status: -1, message: '无权限', data: null }
        expect(body.status).toBe(-1);
        expect(body.message).toBe('无权限');
        expect(body.data).toBeNull();
    });

    it('用户无 email → 返回 403（BaseResponse 形状）', async () => {
        withUser(null);

        const req = makeRequest();
        const res = await GET(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(403);
        const body = await res.json();
        expect(body.status).toBe(-1);
        expect(body.message).toBe('无权限');
        expect(body.data).toBeNull();
    });

    it('管理员邮箱不区分大小写', async () => {
        withUser('ADMIN@EXAMPLE.COM');
        mockSupabaseLimit.mockResolvedValue({ data: [], error: null });

        const req = makeRequest();
        const res = await GET(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(200);
        const body = await res.json();
        // BaseResponse 形状：{ status: 200, message: 'Success', data: { conversations: [] } }
        expect(body.status).toBe(200);
        expect(body.data.conversations).toEqual([]);
    });

    it('成功返回会话列表，snake_case 映射为 camelCase（BaseResponse 形状）', async () => {
        withUser('admin@example.com');

        const req = makeRequest();
        const res = await GET(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(200);
        const body = await res.json();
        // BaseResponse 形状：{ status: 200, message: 'Success', data: { conversations: [...] } }
        expect(body.status).toBe(200);
        expect(body.message).toBe('Success');
        expect(body.data.conversations).toHaveLength(2);

        const first = body.data.conversations[0];
        expect(first.conversationId).toBe('conv-1');
        expect(first.title).toBe('First conversation');
        expect(first.userId).toBe('user-1');
        expect(first.createdAt).toBe('2026-01-02T00:00:00Z');
        expect(first.currentPhase).toBe(2);
        expect(first.hasResolved).toBe(false);
    });

    it('DB 查询返回 error → 返回 500（BaseResponse 形状）', async () => {
        withUser('admin@example.com');
        mockSupabaseLimit.mockResolvedValue({
            data: null,
            error: { message: 'DB error' },
        });

        const req = makeRequest();
        const res = await GET(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.status).toBe(-1);
        expect(body.message).toBe('查询失败');
        expect(body.data).toBeNull();
    });

    it('DB 返回 null data 时返回空数组', async () => {
        withUser('admin@example.com');
        mockSupabaseLimit.mockResolvedValue({ data: null, error: null });

        const req = makeRequest();
        const res = await GET(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe(200);
        expect(body.data.conversations).toEqual([]);
    });
});
