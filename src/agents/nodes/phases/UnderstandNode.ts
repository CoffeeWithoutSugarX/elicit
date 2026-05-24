import { ElicitGraphState, SubProblemState } from "@/agents/schemas/ElicitGraphStateSchema";
import { chatModel } from "@/agents/models/deepseek-model";
import { systemPrompt, userPromptTemplate, modelParams } from "@/agents/prompts/phases/understandNode.prompt";
import { phaseSignalParse } from "@/agents/nodes/algorithm/phaseSignalParse";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getWriter } from "@langchain/langgraph";
import { PolyaPhase } from "@/types/enums/polyaPhase.enum";
import { runGuardChain } from "@/agents/nodes/guards/runGuardChain";
import { applySignalSideEffects } from "@/agents/state/applySignalSideEffects";

export const understandNodeName = 'understandNode';

export const understandNode = async (state: ElicitGraphState) => {
    console.log('UnderstandNode invoked with', { conversationId: state.conversationId, currentPhase: state.currentPhase });

    // ocrResult 不存在或题目不可解时直接跳过
    const ocrResult = state.ocrResult;
    if (!ocrResult || !ocrResult.isSolvable) return {};

    const selectedQuestion = ocrResult.questions[ocrResult.selectedQuestionIndex ?? 0];
    if (!selectedQuestion) return {};

    const currentSubProblem: SubProblemState = state.subProblems[state.currentSubProblemIndex];
    if (!currentSubProblem) return {};

    // ——— Guard Chain ———
    // 优先级：visionFailure > outOfScope > deviation > stuck
    const guardAction = runGuardChain(state);
    let guardInjection = '';
    if (guardAction) {
        if (guardAction.kind === 'VISION_FAILURE') {
            console.log('UnderstandNode guard fired: VISION_FAILURE');
            return { messages: [new AIMessage('（图片识别失败，无法继续引导，请重新上传清晰的题目图片）')] };
        }
        if (guardAction.kind === 'OUT_OF_SCOPE') {
            console.log('UnderstandNode guard fired: OUT_OF_SCOPE');
            return { messages: [new AIMessage('（这道题超出了初中数学的范围，我只能帮你解决初中数学题哦）')] };
        }
        // PULL_BACK / PROBE_5Q / KNOWLEDGE_FALLBACK — 注入 prompt，继续调用 LLM
        console.log('UnderstandNode guard fired:', guardAction.kind);
        guardInjection = guardAction.injectPrompt ?? '';
    }

    // 取最近 10 条消息（约 5 轮对话）
    const recentMessages = state.messages.slice(-10).map(m => ({
        getType: () => (m._getType() === 'human' ? 'human' as const : 'ai' as const),
        content: typeof m.content === 'string' ? m.content : '',
    }));

    // 构造 user prompt（若有 guard 注入则追加）
    const baseUserContent = userPromptTemplate({
        selectedQuestion,
        currentSubProblem,
        state,
        recentMessages,
    });
    const userContent = guardInjection ? `${baseUserContent}\n\n${guardInjection}` : baseUserContent;

    // 调用 DeepSeek（temperature 由 modelParams 定义，但 ChatOpenAICallOptions 不接受运行时覆盖，
    // 故此处仅传消息列表，temperature / max_tokens 通过 modelParams 文档化供未来模型绑定使用）
    void modelParams; // 保持对 modelParams 的引用，避免 unused import
    const response = await chatModel.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userContent),
    ]);

    const responseText = typeof response.content === 'string' ? response.content : '';

    // 解析 phase_signal 协议行
    const parsed = phaseSignalParse(responseText);

    // ——— 应用信号副作用（stuckCountPerPhase / insightPoints / probedQuestionIdsPerPhase）———
    const updatedSubProblems = applySignalSideEffects(
        state.subProblems,
        state.currentSubProblemIndex,
        {
            signal: parsed.signal,
            newInsight: parsed.newInsight,
            probedQuestionId: parsed.probedQuestionId,
            phaseKey: 'understand',
        },
    );

    // 构造状态更新
    const stateUpdate: Partial<ElicitGraphState> = {
        messages: [new AIMessage(parsed.cleanContent)],
        subProblems: updatedSubProblems,
    };

    // COMPLETED → 推进到 PLAN 阶段并发送 SSE chunk
    if (parsed.signal === 'COMPLETED') {
        stateUpdate.currentPhase = PolyaPhase.PLAN;
        const writer = getWriter();
        if (writer) {
            writer({ type: 'phase_changed', phase: PolyaPhase.PLAN });
        }
    }

    return stateUpdate;
};
