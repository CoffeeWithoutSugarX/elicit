import { ElicitGraphState, SubProblemState } from "@/agents/schemas/ElicitGraphStateSchema";
import { chatModel } from "@/agents/models/deepseek-model";
import { systemPrompt, userPromptTemplate, outputContract } from "@/agents/prompts/phases/classifyNode.prompt";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { extractJsonText } from "@/agents/nodes/algorithm/extractJsonText";

export const classifyNodeName = 'classifyNode';

export const classifyNode = async (state: ElicitGraphState) => {
    console.log('ClassifyNode invoked with', { conversationId: state.conversationId });

    // 获取 ocrResult，若无可解题目则跳过
    const ocrResult = state.ocrResult;
    if (!ocrResult || !ocrResult.isSolvable) {
        console.log('ClassifyNode: no solvable ocrResult, skipping');
        return {};
    }

    const selectedIndex = ocrResult.selectedQuestionIndex ?? 0;
    const selectedQuestion = ocrResult.questions[selectedIndex];
    if (!selectedQuestion) {
        console.log('ClassifyNode: selected question not found at index', selectedIndex);
        return {};
    }

    // 辅助函数：将静态 SubProblemDefinition 映射为带运行时字段的 SubProblemState
    const buildSubProblems = (): SubProblemState[] =>
        selectedQuestion.subProblems.map((sp) => ({
            index: sp.index,
            goal: sp.goal,
            givenConditions: sp.givenConditions ?? [],
            milestones: sp.milestones ?? [],
            status: 'pending' as const,
            insightPoints: [],
            stuckCountPerPhase: { understand: 0, plan: 0, execute: 0, review: 0 },
            probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
        }));

    try {
        // 调用 DeepSeek 分类（不流式，JSON 输出；temperature 在 chatModel 构造时配置）
        // 加 "langsmith:nostream" tag：纯 JSON 分类输出不应泄漏到前端文本流，
        // 让 LangGraph StreamMessagesHandler 跳过本次调用的 token emit（参见 @langchain/langgraph StreamMessagesHandler）
        const userContent = userPromptTemplate({ selectedQuestion });
        const response = await chatModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userContent),
        ], { tags: ["langsmith:nostream"] });

        const responseText = typeof response.content === 'string' ? response.content : '';

        // 提取 JSON（支持 ```json 围栏 或裸 JSON，遵循 Postel 宽容解析原则）
        let problemType = 3; // 默认兜底：OTHER
        try {
            const rawJson = extractJsonText(responseText);
            const parsed = JSON.parse(rawJson);
            const validated = outputContract.parse(parsed);
            problemType = validated.problemType;
        } catch {
            // 解析失败兜底为 OTHER，外层 try/catch 仍负责模型异常
        }

        const subProblems = buildSubProblems();

        console.log('ClassifyNode completed', { problemType, subProblemCount: subProblems.length });

        return {
            problemType,
            subProblems,
            currentSubProblemIndex: 0,
        };
    } catch (error) {
        console.log('ClassifyNode error', error);
        // 容错兜底：OTHER 类型，仍初始化 subProblems
        return {
            problemType: 3,
            subProblems: buildSubProblems(),
            currentSubProblemIndex: 0,
        };
    }
};
