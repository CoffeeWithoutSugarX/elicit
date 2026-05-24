import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { compiledElicitGraph } from "@/agents/graphs/ChatGraph";
import { withAuth } from "@/lib/auth";
import { conversationMapper } from "@/db/mappers/ConversationMapper";

export const POST = withAuth(async (request, { params, user }) => {
    const body = await request.json();
    const { conversationId } = await params as { conversationId: string };

    // selectedQuestionIndex 未传时默认 0（单题自动选中）
    const selectedQuestionIndex: number = body.selectedQuestionIndex ?? 0;

    console.log('Resolve route invoked', { conversationId, selectedQuestionIndex, userId: user.id });

    // C9 双写：DB 记录标记 hasResolved=true
    await conversationMapper.update(conversationId, { hasResolved: true });

    const config = {
        configurable: { thread_id: conversationId },
    };

    // 通过 updateState 把新字段合并进 checkpoint，而不是整体替换。
    // ocrResult 已在第一次 invoke 的 checkpoint 中，只需要更新 selectedQuestionIndex。
    // LangGraph 的状态合并会将 ocrResult 中已有的字段与下面的 patch 合并。
    const currentState = await compiledElicitGraph.getState(config);
    const existingOcrResult = currentState.values.ocrResult;

    await compiledElicitGraph.updateState(config, {
        hasResolved: true,
        // 将 selectedQuestionIndex 写入 ocrResult（patch 合并，保留其他字段）
        ocrResult: existingOcrResult
            ? { ...existingOcrResult, selectedQuestionIndex }
            : undefined,
    });

    // 第二次 invoke：checkpoint 已有 ocrResult + hasResolved；
    // 输入只需携带 userId/conversationId 以满足 schema 必填约束，
    // messages=[] 不产生新对话轮次。
    const stream = await compiledElicitGraph.stream(
        {
            messages: [],
            userId: user.id,
            conversationId,
        },
        {
            streamMode: ["values", "messages", "custom"],
            configurable: { thread_id: conversationId },
        }
    );

    return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream),
    });
});
