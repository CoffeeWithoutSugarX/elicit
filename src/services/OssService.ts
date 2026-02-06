import {OssUploadSignInfo} from "@/body/response/OssUploadSignInfo";
import OSS, {Credentials} from 'ali-oss';
import {getStandardRegion} from "ali-oss/lib/common/utils/getStandardRegion";
import {getCredential} from 'ali-oss/lib/common/signUtils';
import {policy2Str} from "ali-oss/lib/common/utils/policy2Str";
import {formatDateToUTC} from "@/lib/DateTimeUtils";

const sts = new OSS.STS({
    accessKeyId: process.env.OSS_ACCESS_KEY_ID!,  // 从环境变量中获取RAM用户的AccessKey ID
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET! // 从环境变量中获取RAM用户的AccessKey Secret
});


const buildTempOssClient = async ()=> {
    // 调用assumeRole接口获取STS临时访问凭证
    const result = await sts.assumeRole(process.env.OSS_STS_ROLE_ARN!, '', 3600, 'ElicitUploadQuestionImage');

    // 提取临时访问凭证中的AccessKeyId、AccessKeySecret和SecurityToken
    const accessKeyId = result.credentials.AccessKeyId;
    const accessKeySecret = result.credentials.AccessKeySecret;
    const securityToken = result.credentials.SecurityToken;

    // 初始化OSS Client
    const client = new OSS({
        bucket: 'muzi-elicit', // 请替换为目标Bucket名称
        region: 'cn-shanghai', // 请替换为标Bucket所在地域
        accessKeyId,
        accessKeySecret,
        stsToken: securityToken,
        refreshSTSTokenInterval: 0,
        refreshSTSToken: async () => {
            const credential: Credentials = await client.getCredential();
            return {
                accessKeyId: credential.AccessKeyId,
                accessKeySecret: credential.AccessKeySecret,
                stsToken: credential.SecurityToken
            };
        },
    });

    return client;
}



class OssService {

    getUploadSignInfo = async (conversationId: string): Promise<OssUploadSignInfo> => {

        const client = await buildTempOssClient();

        // 设置签名过期时间为当前时间往后推10分钟
        const date = new Date();
        const expirationDate = new Date(date);
        expirationDate.setMinutes(expirationDate.getMinutes() + 10);

        const formattedDate = formatDateToUTC(expirationDate);

        // 生成x-oss-credential并设置表单数据
        const credential = getCredential(formattedDate.split('T')[0], getStandardRegion(client.options.region), client.options.accessKeyId);

        // 创建policy
        // 示例policy表单域只列举必填字段，如有其他需求可参考文档：https://help.aliyun.com/zh/oss/developer-reference/signature-version-4-recommend
        const policy: { expiration: string; conditions: unknown[] } = {
            expiration: expirationDate.toISOString(),
            conditions: [
                {'bucket': 'muzi-elicit'}, // 替换为目标bucket名称
                {'x-oss-credential': credential},
                {'x-oss-signature-version': 'OSS4-HMAC-SHA256'},
                {'x-oss-date': formattedDate},
            ],
        };

        // 如果存在STS Token，添加到策略和表单数据中
        if (client.options.stsToken) {
            policy.conditions.push({'x-oss-security-token': client.options.stsToken});
        }

        // 生成签名并设置表单数据
        const signature = client.signPostObjectPolicyV4(policy, date);
        const policyBase64 = Buffer.from(policy2Str(policy), 'utf8').toString('base64');

        return new OssUploadSignInfo(
            `https://${client.options.bucket}.oss-${client.options.region}.aliyuncs.com`,
            policyBase64,
            "OSS4-HMAC-SHA256",
            credential,
            formattedDate,
            signature,
            conversationId + '/' + formattedDate.split('T')[0] + '/',
            client.options.stsToken
        );
    }
}


export const ossService = new OssService();