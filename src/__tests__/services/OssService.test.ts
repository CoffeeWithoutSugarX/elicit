import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── server-only mock（OssService 现已导入 server-only）──────────────────────
vi.mock('server-only', () => ({}));

// ── Hoisted: everything referenced inside vi.mock factories ─────────────────
const {
    mockAssumeRole,
    mockSignPostObjectPolicyV4,
    mockSignatureUrlV4,
    MockOSSConstructor,
    mockOssClientInstance,
} = vi.hoisted(() => {
    const mockAssumeRole = vi.fn();
    const mockSignPostObjectPolicyV4 = vi.fn();
    const mockSignatureUrlV4 = vi.fn();
    const mockGetCredential = vi.fn();

    const mockOssClientInstance = {
        options: {
            bucket: 'muzi-elicit',
            region: 'oss-cn-hangzhou',
            accessKeyId: 'STS.AK',
            accessKeySecret: 'STS.SK',
            stsToken: 'STS-TOKEN',
        },
        signPostObjectPolicyV4: mockSignPostObjectPolicyV4,
        signatureUrlV4: mockSignatureUrlV4,
        getCredential: mockGetCredential,
    };

    // Use function syntax so `new` works for both OSS and OSS.STS
    function MockSTSConstructor(this: { assumeRole: typeof mockAssumeRole }) {
        this.assumeRole = mockAssumeRole;
    }

    function MockOSSConstructorFn(this: typeof mockOssClientInstance) {
        Object.assign(this, mockOssClientInstance);
        return mockOssClientInstance;
    }
    (MockOSSConstructorFn as unknown as { STS: typeof MockSTSConstructor }).STS = MockSTSConstructor;

    return {
        mockAssumeRole,
        mockSignPostObjectPolicyV4,
        mockSignatureUrlV4,
        MockOSSConstructor: MockOSSConstructorFn,
        mockOssClientInstance,
    };
});

// ── Mock ali-oss ─────────────────────────────────────────────────────────────
vi.mock('ali-oss', () => ({
    default: MockOSSConstructor,
}));

// ── Mock ali-oss sub-modules ─────────────────────────────────────────────────
vi.mock('ali-oss/lib/common/utils/getStandardRegion', () => ({
    getStandardRegion: vi.fn((r: string) => r),
}));

vi.mock('ali-oss/lib/common/signUtils', () => ({
    getCredential: vi.fn((_date: string, _region: string, accessKeyId: string) =>
        `${accessKeyId}/date/region/oss/aws4_request`,
    ),
}));

// ── Mock env vars ────────────────────────────────────────────────────────────
process.env.OSS_ACCESS_KEY_ID = 'AK-ID';
process.env.OSS_ACCESS_KEY_SECRET = 'AK-SECRET';
process.env.OSS_BUCKET = 'muzi-elicit';
process.env.OSS_REGION = 'oss-cn-hangzhou';
process.env.OSS_STS_ROLE_ARN = 'acs:ram::123456789:role/test-role';

import { ossService } from '@/services/OssService';
import { OssUploadSignInfo } from '@/types/response/OssUploadSignInfo';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('OssService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset defaults
        mockAssumeRole.mockResolvedValue({
            credentials: {
                AccessKeyId: 'STS.AK',
                AccessKeySecret: 'STS.SK',
                SecurityToken: 'STS-TOKEN',
            },
        });
        mockSignPostObjectPolicyV4.mockReturnValue('mock-signature');
        mockSignatureUrlV4.mockResolvedValue('https://signed-url.example.com/file.png');
    });

    // ── getUploadSignInfo ────────────────────────────────────────────────────

    describe('getUploadSignInfo', () => {
        it('成功获取签名信息 → 返回 OssUploadSignInfo 实例', async () => {
            const result = await ossService.getUploadSignInfo('conv-123');
            expect(result).toBeInstanceOf(OssUploadSignInfo);
        });

        it('返回的 host 包含 bucket 和 region', async () => {
            const result = await ossService.getUploadSignInfo('conv-123');
            expect(result.host).toContain('muzi-elicit');
            expect(result.host).toContain('aliyuncs.com');
        });

        it('返回的 xOssSignatureVersion 为 OSS4-HMAC-SHA256', async () => {
            const result = await ossService.getUploadSignInfo('conv-123');
            expect(result.xOssSignatureVersion).toBe('OSS4-HMAC-SHA256');
        });

        it('policy、signature、credential 字段有值', async () => {
            const result = await ossService.getUploadSignInfo('conv-123');
            expect(result.policy).toBeTruthy();
            expect(result.signature).toBe('mock-signature');
            expect(result.xOssCredential).toBeTruthy();
        });

        it('dir 以 conversationId 开头', async () => {
            const result = await ossService.getUploadSignInfo('conv-abc');
            expect(result.dir).toMatch(/^conv-abc\//);
        });

        it('securityToken 为 STS token', async () => {
            const result = await ossService.getUploadSignInfo('conv-123');
            expect(result.securityToken).toBe('STS-TOKEN');
        });

        it('assumeRole 被调用，传入 roleArn 和 sessionName', async () => {
            await ossService.getUploadSignInfo('conv-123');
            expect(mockAssumeRole).toHaveBeenCalledWith(
                process.env.OSS_STS_ROLE_ARN,
                '',
                3600,
                'ElicitUploadQuestionImage',
            );
        });

        it('assumeRole 抛出异常 → 向上传播', async () => {
            mockAssumeRole.mockRejectedValue(new Error('STS service unavailable'));
            await expect(ossService.getUploadSignInfo('conv-fail')).rejects.toThrow(
                'STS service unavailable',
            );
        });

        it('stsToken 为 undefined 时不向 policy.conditions 添加 x-oss-security-token', async () => {
            // 通过临时清除 stsToken 覆盖 if (client.options.stsToken) 的 false 分支
            const originalToken = mockOssClientInstance.options.stsToken;
            (mockOssClientInstance.options as { stsToken?: string }).stsToken = undefined;

            const result = await ossService.getUploadSignInfo('conv-no-sts');
            // 当 stsToken 不存在时，securityToken 字段为 undefined
            expect(result.securityToken).toBeUndefined();

            // 恢复
            mockOssClientInstance.options.stsToken = originalToken;
        });
    });

    // ── getSignedUrl ─────────────────────────────────────────────────────────

    describe('getSignedUrl', () => {
        it('返回 signatureUrlV4 的结果', async () => {
            mockSignatureUrlV4.mockResolvedValue('https://signed.example.com/key.png?sig=abc');

            const result = await ossService.getSignedUrl('some/object/key.png');

            expect(result).toBe('https://signed.example.com/key.png?sig=abc');
        });

        it('调用 signatureUrlV4 时传入 GET 方法和 3600 过期时间', async () => {
            mockSignatureUrlV4.mockResolvedValue('https://signed.example.com/key.png');

            await ossService.getSignedUrl('path/to/image.png');

            expect(mockSignatureUrlV4).toHaveBeenCalledWith(
                'GET',
                3600,
                expect.objectContaining({ headers: {} }),
                'path/to/image.png',
            );
        });

        it('signatureUrlV4 抛出异常 → 向上传播', async () => {
            mockSignatureUrlV4.mockRejectedValue(new Error('OSS sign error'));

            await expect(ossService.getSignedUrl('bad/path')).rejects.toThrow('OSS sign error');
        });
    });
});
