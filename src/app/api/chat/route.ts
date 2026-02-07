import {ChatMessageRequest} from "@/body/request/ChatMessageRequest";
import {NextRequest} from "next/server";
import {createUIMessageStreamResponse} from "ai";
import {toUIMessageStream} from "@ai-sdk/langchain";
import {compiledChatGraph} from "@/agents/graphs/ChatGraph";
import {HumanMessage} from "@langchain/core/messages";

const threadId = "conversationId:test";

export async function POST(request: NextRequest) {
    const body = (await request.json()) as ChatMessageRequest;

    const stream = await compiledChatGraph.stream(
        {
            messages: [new HumanMessage(body.message)]
        },
        {
            streamMode: ["values", "messages"],
            configurable: {
                thread_id: threadId
            }
        }
    );

    return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream)
    });

}
