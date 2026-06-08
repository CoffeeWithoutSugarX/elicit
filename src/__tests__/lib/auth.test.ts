import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ── Mock @supabase/supabase-js ──────────────────────────────────────────────
const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
    createClient: vi.fn(() => ({
        auth: {
            getUser: mockGetUser,
        },
    })),
}));

import { withAuth } from '@/lib/auth';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(authHeader?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (authHeader !== undefined) {
        headers['Authorization'] = authHeader;
    }
    return new NextRequest('http://localhost/api/test', { headers });
}

const fakeUser = { id: 'user-123', email: 'test@example.com' };
const fakeSegment = { params: { id: 'seg-1' } };

// ── Tests ────────────────────────────────────────────────────────────────────

describe('withAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    });

    it('缺少 Authorization 头 → 返回 401', async () => {
        const handler = vi.fn();
        const wrapped = withAuth(handler);

        const req = makeRequest();
        const res = await wrapped(req, fakeSegment);

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('未授权');
        expect(handler).not.toHaveBeenCalled();
    });

    it('Authorization 头仅有 "Bearer " 前缀（Headers API 会 trim，token 变为 "Bearer"）→ 继续走到 getUser 校验', async () => {
        // 浏览器 Headers API 会去掉尾部空格：'Bearer ' → 'Bearer'
        // replace('Bearer ', '') 不匹配，token = 'Bearer'（非空），继续调用 supabase.getUser
        // getUser 返回 user=null → 401 身份校验失败
        mockGetUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const handler = vi.fn();
        const wrapped = withAuth(handler);

        const req = makeRequest('Bearer ');
        const res = await wrapped(req, fakeSegment);

        // getUser 说 user=null → 身份校验失败
        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('身份校验失败');
        expect(handler).not.toHaveBeenCalled();
    });

    it('supabase getUser 返回 error → 返回 401 身份校验失败', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'invalid token' },
        });

        const handler = vi.fn();
        const wrapped = withAuth(handler);

        const req = makeRequest('Bearer bad-token');
        const res = await wrapped(req, fakeSegment);

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('身份校验失败');
        expect(handler).not.toHaveBeenCalled();
    });

    it('supabase getUser 返回 user 为 null（无 error）→ 返回 401', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        const handler = vi.fn();
        const wrapped = withAuth(handler);

        const req = makeRequest('Bearer null-user-token');
        const res = await wrapped(req, fakeSegment);

        expect(res.status).toBe(401);
        const body = await res.json();
        expect(body.error).toBe('身份校验失败');
    });

    it('合法 token → handler 被调用，user 注入到 context', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: fakeUser },
            error: null,
        });

        const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withAuth(handler);

        const req = makeRequest('Bearer valid-token');
        const res = await wrapped(req, fakeSegment);

        expect(handler).toHaveBeenCalledOnce();
        const [calledReq, calledCtx] = handler.mock.calls[0];
        expect(calledReq).toBe(req);
        expect(calledCtx.user).toEqual(fakeUser);
        expect(calledCtx.params).toEqual(fakeSegment.params);
        expect(res.status).toBe(200);
    });

    it('handler 内部抛出异常 → withAuth 捕获，返回 500', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: fakeUser },
            error: null,
        });

        const handler = vi.fn().mockRejectedValue(new Error('业务异常'));
        const wrapped = withAuth(handler);

        const req = makeRequest('Bearer valid-token');
        const res = await wrapped(req, fakeSegment);

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('服务器错误');
    });

    it('supabase getUser 本身抛出异常 → withAuth 捕获，返回 500', async () => {
        mockGetUser.mockRejectedValue(new Error('network error'));

        const handler = vi.fn();
        const wrapped = withAuth(handler);

        const req = makeRequest('Bearer some-token');
        const res = await wrapped(req, fakeSegment);

        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('服务器错误');
        expect(handler).not.toHaveBeenCalled();
    });

    it('Authorization 头不含 "Bearer " 前缀 → token 为原始字符串，正常调用 getUser', async () => {
        mockGetUser.mockResolvedValue({
            data: { user: fakeUser },
            error: null,
        });

        const handler = vi.fn().mockResolvedValue(NextResponse.json({ ok: true }));
        const wrapped = withAuth(handler);

        // 没有 "Bearer " 前缀，replace 后 token = 原始字符串（非空），继续执行
        const req = makeRequest('direct-token');
        await wrapped(req, fakeSegment);

        expect(handler).toHaveBeenCalledOnce();
    });
});
