import { createUIMessageStreamResponse } from "ai";
import { toUIMessageStream } from "@ai-sdk/langchain";
import { compiledElicitGraph } from "@/agents/graphs/ChatGraph";
import { withAuth } from "@/lib/auth";
import { conversationMapper } from "@/db/mappers/ConversationMapper";
import { BaseResponse } from "@/types/response/BaseResponse";

export const POST = withAuth(async (request, { params, user }) => {
    const body = await request.json();
    const { conversationId } = await params as { conversationId: string };

    // selectedQuestionIndex 未传时默认 0（单题自动选中）
    const selectedQuestionIndex: number = body.selectedQuestionIndex ?? 0;

    console.log('Resolve route invoked', { conversationId, selectedQuestionIndex, userId: user.id });

    try {
        const config = {
            configurable: { thread_id: conversationId },
        };

        // 先读 checkpoint，从 ocrResult 取题目概括（topic），用于更新会话标题
        // 必须在 mapper.update 之前调用，以便一次性把 title 和 hasResolved 合并写入 DB
        const currentState = await compiledElicitGraph.getState(config);
        const existingOcrResult = currentState.values.ocrResult;

        // 取被确认题目的 topic（≤40 字），取不到（undefined / 空串）则不写入 title
        const topic: string | undefined = existingOcrResult?.questions?.[selectedQuestionIndex]?.topic || undefined;

        // C9 双写：DB 记录标记 hasResolved=true，同时更新标题（有 topic 时）
        await conversationMapper.update(conversationId, {
            hasResolved: true,
            ...(topic ? { title: topic } : {}),
        });

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
    } catch (err) {
        // update/getState/updateState/stream 本身抛出的同步或异步错误
        console.error('Resolve route error', err);
        const message = err instanceof Error ? err.message : '解题初始化失败，请重试';
        return Response.json(BaseResponse.ofError(message), { status: 500 });
    }
});
