/**
 * Unit tests for POST /api/oss/sign-for-preview
 *
 * The handler parses { url } from the request body, calls
 * ossService.getSignedUrl(url), and returns a BaseResponse wrapper.
 * Errors are caught and returned as error responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock fns ──────────────────────────────────────────────────────────
const { mockGetSignedUrl } = vi.hoisted(() => ({
    mockGetSignedUrl: vi.fn(),
}));

// ── withAuth pass-through mock ───────────────────────────────────────────────
vi.mock('@/lib/auth', () => ({
    withAuth: vi.fn((handler) => async (request: Request, context: { params: unknown }) => {
        return handler(request, { ...context, user: { id: 'test-user-id' } });
    }),
}));

// ── OssService mock ──────────────────────────────────────────────────────────
vi.mock('@/services/OssService', () => ({
    ossService: {
        getSignedUrl: mockGetSignedUrl,
    },
}));

import { POST } from '@/app/api/oss/sign-for-preview/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/oss/sign-for-preview', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
        },
        body: JSON.stringify(body),
    });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/oss/sign-for-preview', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('成功返回 BaseResponse.ofSuccess 包装的预签名 URL', async () => {
        const signedUrl = 'https://oss.example.com/image.png?token=abc';
        mockGetSignedUrl.mockResolvedValue(signedUrl);

        const req = makeRequest({ url: 'conv-123/2026-01-01/image.png' });

        const res = await POST(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe(200);
        expect(body.message).toBe('Success');
        expect(body.data).toBe(signedUrl);
    });

    it('将请求体中的 url 字段传入 getSignedUrl', async () => {
        mockGetSignedUrl.mockResolvedValue('https://signed.example.com/img.jpg');

        const objectKey = 'conv-abc/2026-01-01/photo.jpg';
        const req = makeRequest({ url: objectKey });

        await POST(req, { params: Promise.resolve({}) });

        expect(mockGetSignedUrl).toHaveBeenCalledOnce();
        expect(mockGetSignedUrl).toHaveBeenCalledWith(objectKey);
    });

    it('getSignedUrl 抛出异常时，返回 BaseResponse.ofError 错误响应', async () => {
        mockGetSignedUrl.mockRejectedValue(new Error('OSS sign error'));

        const req = makeRequest({ url: 'bad/path.png' });

        const res = await POST(req, { params: Promise.resolve({}) });

        expect(res.status).toBe(200); // Response.json 默认 200，错误信息在 body 中
        const body = await res.json();
        expect(body.status).toBe(-1);
        expect(body.message).toBe('Failed to generate OSS signed preview url');
        expect(body.data).toBeNull();
    });
});
