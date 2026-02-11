import {ossService} from "@/services/OssService";
import {BaseResponse} from "@/types/response/BaseResponse";
import {NextRequest} from "next/server";


export async function GET(request: NextRequest, context: { params: Promise<{ conversationId: string }> }) {
    console.log('Generating OSS upload sign info for conversation-1')
    try {
        const {conversationId} = await context.params
        const signInfo = await ossService.getUploadSignInfo(conversationId)
        return Response.json(BaseResponse.ofSuccess(signInfo));
    } catch (error) {
        console.error(error);
        return Response.json(BaseResponse.ofError('Failed to generate OSS upload sign info'));
    }

}