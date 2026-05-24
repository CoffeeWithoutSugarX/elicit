import { ElicitGraphState } from "@/agents/schemas/ElicitGraphStateSchema";
import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getWriter } from "@langchain/langgraph";
import { chatModel } from "@/agents/models/deepseek-model";
import { phaseSignalParse } from "@/agents/nodes/algorithm/phaseSignalParse";
import {
    systemPrompt,
    userPromptTemplate,
    fewShots,
} from "@/agents/prompts/phases/reviewNode.prompt";
import { KnowledgeCardSchema } from "@/agents/schemas/KnowledgeCardSchema";
import { knowledgePointsCsv } from "@/agents/data/loadKnowledgePoints";
import { conversationMapper } from "@/db/mappers/ConversationMapper";
import { PolyaPhase } from "@/types/enums/polyaPhase.enum";

export const reviewNodeName = 'reviewNode';

/**
 * 从模型输出中提取 ```json``` 围栏内的 JSON 字符串。
 * 返回解析后的对象，若无围栏或解析失败则返回 undefined。
 */
function extractJsonFence(text: string): unknown | undefined {
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (!match) return undefined;
    try {
        return JSON.parse(match[1]);
    } catch {
        return undefined;
    }
}

export const reviewNode = async (state: ElicitGraphState) => {
    console.log('ReviewNode invoked with', { conversationId: state.conversationId, currentPhase: state.currentPhase });

    // ——— 前置校验 ———
    const ocrResult = state.ocrResult;
    if (!ocrResult || !ocrResult.isSolvable) {
        console.log('ReviewNode: no solvable ocrResult, skipping');
        return {};
    }

    const selectedIndex = ocrResult.selectedQuestionIndex ?? 0;
    const selectedQuestion = ocrResult.questions[selectedIndex];
    if (!selectedQuestion) {
        console.log('ReviewNode: selected question not found at index', selectedIndex);
        return {};
    }

    // ——— 构建 few-shot messages ———
    const fewShotMessages = fewShots.flatMap(({ user, assistant }) => [
        new HumanMessage(user),
        new AIMessage(assistant),
    ]);

    // ——— 构建用户 prompt（ReviewNode 汇总所有 subProblems，不局限于当前）———
    const recentMessages = state.messages.slice(-16);
    const userContent = userPromptTemplate({
        selectedQuestion,
        state,
        recentMessages,
        knowledgePointsCsv,
    });

    try {
        // ——— 调用 DeepSeek ———
        // temperature / max_tokens 在 modelParams 中定义供文档用；
        // ChatOpenAI 的 temperature 是构造参数，不是 invoke call option。
        const response = await chatModel.invoke([
            new SystemMessage(systemPrompt),
            ...fewShotMessages,
            new HumanMessage(userContent),
        ]);

        const rawContent = typeof response.content === 'string' ? response.content : '';

        // ——— 解析 phase 信号（COMPLETED）———
        const { cleanContent } = phaseSignalParse(rawContent);

        // ——— 提取知识卡片 JSON ———
        const writer = getWriter();
        const rawJson = extractJsonFence(rawContent);

        if (rawJson !== undefined) {
            const cardResult = KnowledgeCardSchema.safeParse(rawJson);
            if (cardResult.success) {
                // 推送 knowledge_card SSE chunk
                if (writer) {
                    writer({ type: 'knowledge_card', card: cardResult.data });
                }
                console.log('ReviewNode: knowledge_card pushed', { knowledgePoints: cardResult.data.knowledgePoints.length });
            } else {
                console.log('ReviewNode: knowledge card validation failed', cardResult.error.issues);
            }
        } else {
            console.log('ReviewNode: no ```json``` fence found in response');
        }

        // ——— 推送 phase_changed → DONE SSE chunk ———
        if (writer) {
            writer({ type: 'phase_changed', phase: PolyaPhase.DONE });
        }

        // ——— C9 dual-write：更新 DB hasResolved + currentPhase ———
        try {
            await conversationMapper.update(state.conversationId, {
                hasResolved: true,
                currentPhase: PolyaPhase.DONE,
            });
            console.log('ReviewNode: C9 dual-write completed', { conversationId: state.conversationId });
        } catch (dbError) {
            // DB 写失败不阻断会话（日志留痕，state 仍更新）
            console.log('ReviewNode: C9 dual-write failed (non-fatal)', dbError);
        }

        return {
            messages: [new AIMessage(cleanContent)],
            currentPhase: PolyaPhase.DONE,
            hasResolved: true,
        };

    } catch (error) {
        console.log('ReviewNode error', error);
        // 容错兜底：返回简单回复，不改变 phase
        return {
            messages: [new AIMessage('（回顾阶段暂时无法响应，请重试）')],
        };
    }
};
