import {OssUploadSignInfo} from "@/types/response/OssUploadSignInfo";
import {BaseResponse} from "@/types/response/BaseResponse";
import { getAuthHeaders } from "@/services/api-client/getAuthHeaders";


class OssRequest {


    uploadImageToOss = async (imageFile: File, conversationId: string): Promise<string> => {
        const res = await fetch(`/api/oss/sign-for-upload/${conversationId}`, {
            method: "GET",
            headers: {
                ...await getAuthHeaders(),
            }
        });
        if (!res.ok) {
            throw new Error("获取签名失败");
        }
        const response: BaseResponse<OssUploadSignInfo> = await res.json() as BaseResponse<OssUploadSignInfo>;
        if (BaseResponse.isSuccess(response)) {
            const data = response.data;
            const formData = new FormData();
            formData.append("success_action_status", "200");
            formData.append("policy", data.policy);
            formData.append("x-oss-signature", data.signature);
            formData.append("x-oss-signature-version", data.xOssSignatureVersion);
            formData.append("x-oss-credential", data.xOssCredential);
            formData.append("x-oss-date", data.xOssDate);
            formData.append("key", data.dir + imageFile.name); // 文件名
            formData.append("x-oss-security-token", data.securityToken);
            formData.append("file", imageFile); // imageFile 必须为最后一个表单域

            const uploadResponse = await fetch(data.host, {
                method: "POST",
                body: formData
            });

            if (uploadResponse.ok) {
                return data.dir + imageFile.name;
            }
        }

        throw new Error("上传失败");
    }

    signImageForPreview = async (url: string): Promise<string> => {
        console.log('Signing OSS preview url for', url)
        const res = await fetch("/api/oss/sign-for-preview", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...await getAuthHeaders(),
            },
            body: JSON.stringify({url})
        });
        if (!res.ok) {
            throw new Error("获取预览签名失败");
        }
        const response: BaseResponse<string> = await res.json() as BaseResponse<string>;

        if (BaseResponse.isSuccess(response)) {
            return response.data;
        }

        throw new Error("获取预览签名失败");
    }
}


export const ossRequest = new OssRequest();