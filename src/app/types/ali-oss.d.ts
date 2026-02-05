declare module "ali-oss/lib/common/utils/getStandardRegion" {
    export function getStandardRegion(region: string | undefined): string;
}

declare module "ali-oss/lib/common/signUtils" {
    export function getCredential(date: string, region: string, accessKeyId: string): string;
}

declare module "ali-oss/lib/common/utils/policy2Str" {
    export function policy2Str(policy: unknown): string;
}

declare module "ali-oss" {
    import * as OSS from 'ali-oss';

    interface OSSInstance extends OSS {
        options: OSS.Options;
        getCredential(): Promise<OSS.Credentials>;
        signPostObjectPolicyV4(policy: unknown, date: Date): string;
    }

    const OSSConstructor: {
        new(options: OSS.Options): OSSInstance;
        STS: typeof OSS.STS;
    };

    export default OSSConstructor;
    export type { Credentials, Options, STSOptions } from 'ali-oss';
}