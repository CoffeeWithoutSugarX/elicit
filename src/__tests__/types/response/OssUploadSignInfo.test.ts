import { describe, it, expect } from 'vitest';
import { OssUploadSignInfo } from '@/types/response/OssUploadSignInfo';

describe('OssUploadSignInfo', () => {
    const host = 'https://muzi-elicit.oss-cn-hangzhou.aliyuncs.com';
    const policy = 'eyJleHBpcmF0aW9uIjoiMjAyNC0wMS0wMVQwMDowMDowMFoifQ==';
    const xOssSignatureVersion = 'OSS4-HMAC-SHA256';
    const xOssCredential = 'STS.AccessKeyId/20240101/cn-hangzhou/oss/aliyun_v4_request';
    const xOssDate = '20240101T000000Z';
    const signature = 'abcdef1234567890';
    const dir = 'uploads/user-id/';
    const securityToken = 'CAISxxxx...';

    it('assigns all constructor arguments to corresponding fields', () => {
        const info = new OssUploadSignInfo(
            host,
            policy,
            xOssSignatureVersion,
            xOssCredential,
            xOssDate,
            signature,
            dir,
            securityToken,
        );

        expect(info.host).toBe(host);
        expect(info.policy).toBe(policy);
        expect(info.xOssSignatureVersion).toBe(xOssSignatureVersion);
        expect(info.xOssCredential).toBe(xOssCredential);
        expect(info.xOssDate).toBe(xOssDate);
        expect(info.signature).toBe(signature);
        expect(info.dir).toBe(dir);
        expect(info.securityToken).toBe(securityToken);
    });

    it('stores empty strings without error', () => {
        const info = new OssUploadSignInfo('', '', '', '', '', '', '', '');
        expect(info.host).toBe('');
        expect(info.securityToken).toBe('');
    });

    it('two instances with the same args are value-equal (field by field)', () => {
        const a = new OssUploadSignInfo(host, policy, xOssSignatureVersion, xOssCredential, xOssDate, signature, dir, securityToken);
        const b = new OssUploadSignInfo(host, policy, xOssSignatureVersion, xOssCredential, xOssDate, signature, dir, securityToken);

        expect(a.host).toBe(b.host);
        expect(a.policy).toBe(b.policy);
        expect(a.xOssSignatureVersion).toBe(b.xOssSignatureVersion);
        expect(a.xOssCredential).toBe(b.xOssCredential);
        expect(a.xOssDate).toBe(b.xOssDate);
        expect(a.signature).toBe(b.signature);
        expect(a.dir).toBe(b.dir);
        expect(a.securityToken).toBe(b.securityToken);
    });
});
