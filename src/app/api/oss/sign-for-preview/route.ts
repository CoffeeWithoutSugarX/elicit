import { ossService } from "@/services/OssService";
import { BaseResponse } from "@/types/response/BaseResponse";
import { OssSignForPreviewRequest } from "@/types/request/OssSignForPreviewRequest";
import { withAuth } from "@/lib/auth";

export const POST = withAuth(async (request) => {
    const { url } = await request.json() as OssSignForPreviewRequest;
    console.log('sign-for-preview invoked for', url);
    try {
        const signedUrl = await ossService.getSignedUrl(url);
        console.log('Generated OSS signed preview url', signedUrl);
        return Response.json(BaseResponse.ofSuccess(signedUrl));
    } catch (error) {
        console.error(error);
        return Response.json(BaseResponse.ofError('Failed to generate OSS signed preview url'));
    }
});
