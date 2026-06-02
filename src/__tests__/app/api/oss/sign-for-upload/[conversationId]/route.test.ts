/**
 * Unit tests for GET /api/oss/sign-for-upload/[conversationId]
 *
 * The handler calls ossService.getUploadSignInfo(conversationId) and returns
 * a BaseResponse wrapper. Errors are caught and returned as error responses.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Hoisted mock fns (must be declared before vi.mock factories run) ──────────
const { mockGetUploadSignInfo } = vi.hoisted(() => ({
    mockGetUploadSignInfo: vi.fn(),
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
        getUploadSignInfo: mockGetUploadSignInfo,
    },
}));

import { GET } from '@/app/api/oss/sign-for-upload/[conversationId]/route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(): NextRequest {
    return new NextRequest('http://localhost/api/oss/sign-for-upload/conv-123', {
        method: 'GET',
        headers: { Authorization: 'Bearer test-token' },
    });
}

const fakeSignInfo = {
    host: 'https://muzi-elicit.oss-cn-hangzhou.aliyuncs.com',
    policy: 'base64policy==',
    xOssSignatureVersion: 'OSS4-HMAC-SHA256',
    xOssCredential: 'STS.AK/20260101/oss/aws4_request',
    xOssDate: '20260101T000000Z',
    signature: 'mock-sig',
    dir: 'conv-123/2026-01-01/',
    securityToken: 'STS-TOKEN',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/oss/sign-for-upload/[conversationId]', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('成功获取签名信息，返回 BaseResponse.ofSuccess 包装的结果', async () => {
        mockGetUploadSignInfo.mockResolvedValue(fakeSignInfo);

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-123' }) };

        const res = await GET(req, context);

        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.status).toBe(200);
        expect(body.message).toBe('Success');
        expect(body.data).toEqual(fakeSignInfo);
    });

    it('将 conversationId 从路由参数传入 getUploadSignInfo', async () => {
        mockGetUploadSignInfo.mockResolvedValue(fakeSignInfo);

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'my-conv-id' }) };

        await GET(req, context);

        expect(mockGetUploadSignInfo).toHaveBeenCalledOnce();
        expect(mockGetUploadSignInfo).toHaveBeenCalledWith('my-conv-id');
    });

    it('getUploadSignInfo 抛出异常时，返回 BaseResponse.ofError 错误响应', async () => {
        mockGetUploadSignInfo.mockRejectedValue(new Error('STS unavailable'));

        const req = makeRequest();
        const context = { params: Promise.resolve({ conversationId: 'conv-err' }) };

        const res = await GET(req, context);

        expect(res.status).toBe(200); // Response.json 默认 200，错误信息在 body 中
        const body = await res.json();
        expect(body.status).toBe(-1);
        expect(body.message).toBe('Failed to generate OSS upload sign info');
        expect(body.data).toBeNull();
    });
});
