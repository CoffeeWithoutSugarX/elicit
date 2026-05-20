import { ossService } from "@/services/OssService";
import { BaseResponse } from "@/types/response/BaseResponse";
import { withAuth } from "@/lib/auth";

export const GET = withAuth(async (request, { params }) => {
    console.log('sign-for-upload invoked');
    try {
        const { conversationId } = await params as { conversationId: string };
        const signInfo = await ossService.getUploadSignInfo(conversationId);
        return Response.json(BaseResponse.ofSuccess(signInfo));
    } catch (error) {
        console.error(error);
        return Response.json(BaseResponse.ofError('Failed to generate OSS upload sign info'));
    }
});
