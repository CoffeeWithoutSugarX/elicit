import {ChatMessageRequest} from "@/types/request/ChatMessageRequest";
import {createUIMessageStreamResponse} from "ai";
import {toUIMessageStream} from "@ai-sdk/langchain";
import {compiledElicitGraph} from "@/agents/graphs/ChatGraph";
import {HumanMessage} from "@langchain/core/messages";
import {withAuth} from "@/lib/auth";
import {ossService} from "@/services/OssService";


export const POST = withAuth(async (request, {params, user}) => {
    const body = (await request.json()) as ChatMessageRequest;
    const {conversationId} = await params as { conversationId: string };
    console.log(body);

    // OSS object key → 预签名 URL，供 VisionNode / OcrNode 访问
    let questionImgUrl = body.imgUrl;
    if (questionImgUrl) {
        questionImgUrl = await ossService.getSignedUrl(questionImgUrl);
    }

    const stream = await compiledElicitGraph.stream(
        {
            messages: [new HumanMessage(body.message)],
            userId: user.id,
            conversationId: conversationId,
            questionImgUrl: questionImgUrl,  // 已签名的可访问 URL，供 VisionNode / OcrNode 使用
        },
        {
            streamMode: ["values", "messages", "custom"],
            configurable: {
                thread_id: conversationId
            }
        }
    );

    return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream)
    });

})
