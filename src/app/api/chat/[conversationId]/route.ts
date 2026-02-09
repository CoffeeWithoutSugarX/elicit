import {ChatMessageRequest} from "@/body/request/ChatMessageRequest";
import {createUIMessageStreamResponse} from "ai";
import {toUIMessageStream} from "@ai-sdk/langchain";
import {compiledChatGraph} from "@/agents/graphs/ChatGraph";
import {HumanMessage} from "@langchain/core/messages";
import {withAuth} from "@/lib/auth";


export const POST = withAuth(async (request, {params, user}) => {
    const body = (await request.json()) as ChatMessageRequest;
    const {conversationId} = await params as { conversationId: string };

    const stream = await compiledChatGraph.stream(
        {
            messages: [new HumanMessage(body.message)],
            userId: user.id,
            conversationId: conversationId,
        },
        {
            streamMode: ["values", "messages"],
            configurable: {
                thread_id: conversationId
            }
        }
    );

    return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream)
    });

})
