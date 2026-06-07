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
import { filterKnowledgePointsCsvByGradeTerm } from "@/agents/data/loadKnowledgePoints";
import { studentGradeTerm } from "@/agents/data/studentProfile";
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
    // P-001 学情过滤：只注入妹妹已学（≤ 当前学期）的知识点，生成端硬约束
    const filteredKnowledgePointsCsv = filterKnowledgePointsCsvByGradeTerm(studentGradeTerm);
    const recentMessages = state.messages.slice(-16);
    const userContent = userPromptTemplate({
        selectedQuestion,
        state,
        recentMessages,
        knowledgePointsCsv: filteredKnowledgePointsCsv,
    });

    try {
        // ——— 调用 DeepSeek ———
        // temperature / max_tokens 在 modelParams 中定义供文档用；
        // ChatOpenAI 的 temperature 是构造参数，不是 invoke call option。
        // 加 "langsmith:nostream" tag：让 LangGraph StreamMessagesHandler 跳过本次调用的 token emit，
        // 避免正文里的 ```json 知识卡片被当作妹妹回复推送到前端文本流。干净正文由下方 getWriter() 主动推出。
        const response = await chatModel.invoke([
            new SystemMessage(systemPrompt),
            ...fewShotMessages,
            new HumanMessage(userContent),
        ], { tags: ["langsmith:nostream"] });

        const rawContent = typeof response.content === 'string' ? response.content : '';

        // ——— 解析 phase 信号（COMPLETED）———
        const { cleanContent } = phaseSignalParse(rawContent);

        // ReviewNode 特殊：phaseSignalParse 只剥末尾协议行，剥不掉正文里的 ```json 围栏。
        // 在推送/存储前先剥掉围栏，确保妹妹气泡和会话历史里不残留 JSON 片段。
        const prose = cleanContent.replace(/```json[\s\S]*?```/g, '').trim();

        // ——— 提取知识卡片 JSON ———
        // 使用 kind 字段区分（不用 type），让外层 SSE part 名始终为 data-custom
        const writer = getWriter();
        const rawJson = extractJsonFence(rawContent);

        if (rawJson !== undefined) {
            const cardResult = KnowledgeCardSchema.safeParse(rawJson);
            if (cardResult.success) {
                // 推送 knowledge_card SSE chunk
                if (writer) {
                    writer({ kind: 'knowledge_card', card: cardResult.data });
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
            writer({ kind: 'phase_changed', phase: PolyaPhase.DONE });
        }

        // nostream 模式下，主动用 getWriter() 把干净正文推回给前端（已剥去围栏）
        if (writer && prose) {
            writer({ kind: 'assistant_message', text: prose });
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
            // 存入 state.messages 的使用剥去围栏的 prose，保证会话历史里不残留 JSON
            messages: [new AIMessage(prose)],
            currentPhase: PolyaPhase.DONE,
            hasResolved: true,
        };

    } catch (error) {
        console.log('ReviewNode error', error);
        // 容错兜底：返回简单回复，不改变 phase
        // nostream 模式下前端收不到 messages 流，需主动推干净正文
        const catchText = '（回顾阶段暂时无法响应，请重试）';
        getWriter()?.({ kind: 'assistant_message', text: catchText });
        return {
            messages: [new AIMessage(catchText)],
        };
    }
};
