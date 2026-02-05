import {OssUploadSignInfo} from "@/body/response/OssUploadSignInfo";
import {BaseResponse} from "@/body/response/BaseResponse";


class OssRequest {


    uploadImageToOss = async (imageFile: File, conversationId: string): Promise<string> => {
        const response: BaseResponse<OssUploadSignInfo> = await fetch(`/api/oss/sign-for-upload/${conversationId}`, {method: "GET"})
            .then((response) => {
                if (!response.ok) {
                    throw new Error("获取签名失败");
                }
                return response.json();
            });
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

            if (!uploadResponse.ok) {
                throw new Error("上传失败");
            }

            return data.host+ "/" + data.dir + imageFile.name;
        }

        throw new Error("签名获取失败");
    }
}


export const ossRequest = new OssRequest();