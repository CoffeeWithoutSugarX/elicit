import {ChatMessageRequest} from "@/body/request/ChatMessageRequest";
import {NextRequest} from "next/server";
import {createUIMessageStreamResponse} from "ai";
import {toUIMessageStream} from "@ai-sdk/langchain";
import {compiledChatGraph} from "@/agents/graphs/ChatGraph";
import {HumanMessage} from "@langchain/core/messages";


export async function POST(request: NextRequest) {
    const body = (await request.json()) as ChatMessageRequest;
    console.log(JSON.stringify(body))
    const stream = await compiledChatGraph.stream(
        {
            messages: [new HumanMessage(body.message)]
        },
        {
            streamMode: ["values", "messages"]
        }
    );

    return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream)
    });

}
