import {ChatMessageRequest} from "@/body/request/ChatMessageRequest";
import {NextRequest} from "next/server";
import {createUIMessageStreamResponse} from "ai";
import {toUIMessageStream} from "@ai-sdk/langchain";
import {compiledChatGraph} from "@/agents/graphs/ChatGraph";
import {HumanMessage} from "@langchain/core/messages";
import {ChatSchema} from "@/agents/schemas/ChatSchema";

const chatSchema: ChatSchema = {
    messages: []
}

export async function POST(request: NextRequest) {
    const body = (await request.json()) as ChatMessageRequest;
    chatSchema.messages.push(new HumanMessage(body.message))
    const stream = await compiledChatGraph.stream(
        chatSchema,
        {
            streamMode: ["values", "messages"]
        }
    );

    return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream)
    });

}
