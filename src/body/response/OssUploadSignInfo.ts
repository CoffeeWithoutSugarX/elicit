
export class OssUploadSignInfo {
    host: string;
    policy: string;
    xOssSignatureVersion: string;
    xOssCredential: string;
    xOssDate: string;
    signature: string;
    dir: string ;
    securityToken: string

    constructor(host: string,
                policy: string,
                xOssSignatureVersion: string,
                xOssCredential: string,
                xOssDate: string,
                signature: string,
                dir: string,
                securityToken: string) {
        this.host = host;
        this.policy = policy;
        this.xOssSignatureVersion = xOssSignatureVersion;
        this.xOssCredential = xOssCredential;
        this.xOssDate = xOssDate;
        this.signature = signature;
        this.dir = dir;
        this.securityToken = securityToken;
    }
}