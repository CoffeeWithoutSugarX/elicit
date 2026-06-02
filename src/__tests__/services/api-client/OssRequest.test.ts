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

// ── Mock File (not available in Node) ───────────────────────────────────────
class MockFile {
    name: string;
    constructor(_parts: unknown[], name: string) {
        this.name = name;
    }
}
vi.stubGlobal('File', MockFile);

// ── Mock FormData ─────────────────────────────────────────────────────────────
class MockFormData {
    private _data: Map<string, unknown> = new Map();
    append(key: string, value: unknown) { this._data.set(key, value); }
    get(key: string) { return this._data.get(key); }
}
vi.stubGlobal('FormData', MockFormData);

import { ossRequest } from '@/services/api-client/OssRequest';
import { BaseResponse } from '@/types/response/BaseResponse';
import { OssUploadSignInfo } from '@/types/response/OssUploadSignInfo';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeSignInfo(): OssUploadSignInfo {
    return new OssUploadSignInfo(
        'https://muzi-elicit.oss-cn-hangzhou.aliyuncs.com',
        'base64-policy',
        'OSS4-HMAC-SHA256',
        'STS.AK/20260101/oss-cn-hangzhou/oss/aws4_request',
        '20260101T000000Z',
        'abc-signature',
        'conv-123/20260101/',
        'STS-TOKEN',
    );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OssRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetSession.mockResolvedValue({
            data: { session: { access_token: 'test-token' } },
        });
    });

    // ── uploadImageToOss ─────────────────────────────────────────────────────

    describe('uploadImageToOss', () => {
        it('成功签名 + 上传 → 返回 OSS key', async () => {
            const signInfo = makeSignInfo();
            const signResponse = BaseResponse.ofSuccess(signInfo);

            // 第 1 次 fetch: 获取签名
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => signResponse,
            });
            // 第 2 次 fetch: 上传到 OSS
            mockFetch.mockResolvedValueOnce({ ok: true });

            const imageFile = new MockFile(['data'], 'test-image.png') as unknown as File;
            const result = await ossRequest.uploadImageToOss(imageFile, 'conv-123');

            expect(result).toBe('conv-123/20260101/test-image.png');
        });

        it('获取签名时 fetch 返回 !ok → 抛出 "获取签名失败"', async () => {
            mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

            const imageFile = new MockFile(['data'], 'img.png') as unknown as File;
            await expect(
                ossRequest.uploadImageToOss(imageFile, 'conv-123'),
            ).rejects.toThrow('获取签名失败');
        });

        it('签名接口返回非 200 status → 抛出 "上传失败"', async () => {
            const errorResponse = BaseResponse.ofError('签名失败');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => errorResponse,
            });

            const imageFile = new MockFile(['data'], 'img.png') as unknown as File;
            await expect(
                ossRequest.uploadImageToOss(imageFile, 'conv-123'),
            ).rejects.toThrow('上传失败');
        });

        it('上传到 OSS 时返回 !ok → 抛出 "上传失败"', async () => {
            const signInfo = makeSignInfo();
            const signResponse = BaseResponse.ofSuccess(signInfo);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => signResponse,
            });
            // OSS 上传失败
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

            const imageFile = new MockFile(['data'], 'img.png') as unknown as File;
            await expect(
                ossRequest.uploadImageToOss(imageFile, 'conv-123'),
            ).rejects.toThrow('上传失败');
        });

        it('第一次 fetch 传入正确的 Authorization 头', async () => {
            const signInfo = makeSignInfo();
            const signResponse = BaseResponse.ofSuccess(signInfo);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => signResponse,
            });
            mockFetch.mockResolvedValueOnce({ ok: true });

            const imageFile = new MockFile(['data'], 'img.png') as unknown as File;
            await ossRequest.uploadImageToOss(imageFile, 'conv-123');

            const [, opts] = mockFetch.mock.calls[0];
            expect(opts.headers['Authorization']).toBe('Bearer test-token');
        });
    });

    // ── signImageForPreview ──────────────────────────────────────────────────

    describe('signImageForPreview', () => {
        it('成功签名 → 返回签名 URL 字符串', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const signedUrl = 'https://signed.example.com/img.png?sig=xyz';
            const response = BaseResponse.ofSuccess(signedUrl);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => response,
            });

            const result = await ossRequest.signImageForPreview('https://oss.example.com/img.png');
            expect(result).toBe(signedUrl);
            consoleSpy.mockRestore();
        });

        it('fetch 返回 !ok → 抛出 "获取预览签名失败"', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            mockFetch.mockResolvedValueOnce({ ok: false, status: 403 });

            await expect(
                ossRequest.signImageForPreview('https://oss.example.com/img.png'),
            ).rejects.toThrow('获取预览签名失败');
            consoleSpy.mockRestore();
        });

        it('返回非 200 status → 抛出 "获取预览签名失败"', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const errorResponse = BaseResponse.ofError('未授权');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => errorResponse,
            });

            await expect(
                ossRequest.signImageForPreview('https://oss.example.com/img.png'),
            ).rejects.toThrow('获取预览签名失败');
            consoleSpy.mockRestore();
        });

        it('fetch 调用时携带正确的 Content-Type 和 Authorization', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const signedUrl = 'https://signed.example.com/img.png';
            const response = BaseResponse.ofSuccess(signedUrl);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => response,
            });

            const targetUrl = 'https://oss.example.com/img.png';
            await ossRequest.signImageForPreview(targetUrl);

            const [url, opts] = mockFetch.mock.calls[0];
            expect(url).toBe('/api/oss/sign-for-preview');
            expect(opts.method).toBe('POST');
            expect(opts.headers['Content-Type']).toBe('application/json');
            expect(opts.headers['Authorization']).toBe('Bearer test-token');
            expect(JSON.parse(opts.body)).toEqual({ url: targetUrl });
            consoleSpy.mockRestore();
        });
    });
});
