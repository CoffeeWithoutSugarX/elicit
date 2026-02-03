import {chatModel} from "@/agents/model/deppseek-model";
import {ChatMessageRequest} from "@/request/ChatMessageRequest";
import {NextRequest} from "next/server";
import {createUIMessageStreamResponse} from "ai";
import {toUIMessageStream} from "@ai-sdk/langchain";


export async function POST(request: NextRequest) {
    const body = (await request.json()) as ChatMessageRequest;
    console.log(JSON.stringify(body))
    const stream = await chatModel.stream([{role: body.role, content: body.message}]);

    return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream),
    });
}