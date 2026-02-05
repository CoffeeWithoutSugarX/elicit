import {ossService} from "@/services/OssService";
import {BaseResponse} from "@/response/BaseResponse";


export async function GET() {
    console.log('Generating OSS upload sign info for conversation-1')
    try {
        const signInfo = await ossService.getUploadSignInfo('conversation-1')
        return Response.json(BaseResponse.ofSuccess(signInfo));
    } catch (error) {
        console.error(error);
        return Response.json(BaseResponse.ofError('Failed to generate OSS upload sign info'));
    }

}