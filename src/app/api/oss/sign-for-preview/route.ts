import {NextRequest} from "next/server";
import {ossService} from "@/services/OssService";
import {BaseResponse} from "@/types/response/BaseResponse";
import {OssSignForPreviewRequest} from "@/types/request/OssSignForPreviewRequest";


export async function POST(request: NextRequest) {
    const {url} = await request.json() as OssSignForPreviewRequest

    try {
        const signedUrl = await ossService.getSignedUrl(url)
        return Response.json(BaseResponse.ofSuccess(signedUrl));
    } catch (error) {
        console.error(error);
        return Response.json(BaseResponse.ofError('Failed to generate OSS signed preview url'));
    }

}