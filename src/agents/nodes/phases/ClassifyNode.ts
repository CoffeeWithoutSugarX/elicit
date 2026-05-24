import { ElicitGraphState, SubProblemState } from "@/agents/schemas/ElicitGraphStateSchema";
import { chatModel } from "@/agents/models/deepseek-model";
import { systemPrompt, userPromptTemplate, outputContract } from "@/agents/prompts/phases/classifyNode.prompt";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";

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
        const userContent = userPromptTemplate({ selectedQuestion });
        const response = await chatModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(userContent),
        ]);

        const responseText = typeof response.content === 'string' ? response.content : '';

        // 提取 JSON（支持 ```json 围栏 或裸 JSON）
        const jsonMatch =
            responseText.match(/```json\s*([\s\S]*?)\s*```/) ??
            responseText.match(/(\{[\s\S]*\})/);

        let problemType = 3; // 默认兜底：OTHER
        if (jsonMatch) {
            const rawJson = jsonMatch[1] ?? jsonMatch[0];
            const parsed = JSON.parse(rawJson);
            const validated = outputContract.parse(parsed);
            problemType = validated.problemType;
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
