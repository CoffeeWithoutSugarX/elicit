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

    try {
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
                // null/空串 → undefined，ElicitGraphInputSchema 的 z.string().optional() 只接受 string|undefined
                questionImgUrl: questionImgUrl || undefined,
            },
            {
                streamMode: ["values", "messages", "custom"],
                configurable: {
                    thread_id: conversationId
                }
            }
        );

        // 注：@ai-sdk/langchain 的 toUIMessageStream 返回 ReadableStream，
        // graph 流式迭代中节点抛的错误会在 stream 消费时抛出；
        // 错误路径由 graph 节点自身 catch 兜底后通过 assistant_message chunk 推送到前端，
        // 此处记录服务端日志以便排查。
        const uiStream = toUIMessageStream(stream, {
            onFinal: () => { /* 流正常结束 */ },
        });

        return createUIMessageStreamResponse({
            stream: uiStream,
        });
    } catch (err) {
        // getSignedUrl / compiledElicitGraph.stream 同步抛错（如 ZodError）时兜底
        console.error('Chat route error', err);
        return new Response(
            JSON.stringify({ error: err instanceof Error ? err.message : '聊天请求失败，请重试' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } },
        );
    }
})
