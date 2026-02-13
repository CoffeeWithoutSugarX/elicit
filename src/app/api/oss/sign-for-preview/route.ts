import {NextRequest} from "next/server";
import {ossService} from "@/services/OssService";
import {BaseResponse} from "@/types/response/BaseResponse";
import {OssSignForPreviewRequest} from "@/types/request/OssSignForPreviewRequest";


export async function POST(request: NextRequest) {
    const {url} = await request.json() as OssSignForPreviewRequest
    console.log('Generating OSS signed preview url for', url)
    try {
        const signedUrl = await ossService.getSignedUrl(url)
        console.log('Generated OSS signed preview url', signedUrl)
        return Response.json(BaseResponse.ofSuccess(signedUrl));
    } catch (error) {
        console.error(error);
        return Response.json(BaseResponse.ofError('Failed to generate OSS signed preview url'));
    }

}