import { ElicitGraphState, SubProblemState } from "@/agents/schemas/ElicitGraphStateSchema";
import { chatModel } from "@/agents/models/deepseek-model";
import { systemPrompt, userPromptTemplate, modelParams } from "@/agents/prompts/phases/planNode.prompt";
import { phaseSignalParse } from "@/agents/nodes/algorithm/phaseSignalParse";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getWriter } from "@langchain/langgraph";
import { PolyaPhase } from "@/types/enums/polyaPhase.enum";
import { runGuardChain } from "@/agents/nodes/guards/runGuardChain";
import { handleTerminalGuard } from "@/agents/nodes/guards/handleTerminalGuard";
import { applySignalSideEffects } from "@/agents/state/applySignalSideEffects";

export const planNodeName = 'planNode';

export const planNode = async (state: ElicitGraphState) => {
    console.log('PlanNode invoked with', { conversationId: state.conversationId, currentPhase: state.currentPhase });

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
        const terminal = handleTerminalGuard(guardAction, 'PlanNode');
        if (terminal) return terminal;
        // PULL_BACK / PROBE_5Q / KNOWLEDGE_FALLBACK — 注入 prompt，继续调用 LLM
        console.log('PlanNode guard fired:', guardAction.kind);
        guardInjection = ('injectPrompt' in guardAction ? guardAction.injectPrompt : undefined) ?? '';
    }

    // 取最近 10 条消息（约 5 轮对话）
    const recentMessages = state.messages.slice(-10).map(m => ({
        getType: () => (m._getType() === 'human' ? 'human' as const : 'ai' as const),
        content: typeof m.content === 'string' ? m.content : '',
    }));

    // 构造 user prompt（PlanNode 需要 problemType 上下文；若有 guard 注入则追加）
    const baseUserContent = userPromptTemplate({
        selectedQuestion,
        currentSubProblem,
        state,
        recentMessages,
    });
    const userContent = guardInjection ? `${baseUserContent}\n\n${guardInjection}` : baseUserContent;

    // 调用 DeepSeek（temperature 由 modelParams 定义，但 ChatOpenAICallOptions 不接受运行时覆盖，
    // 故此处仅传消息列表，temperature / max_tokens 通过 modelParams 文档化供未来模型绑定使用）
    // 加 "langsmith:nostream" tag：让 LangGraph StreamMessagesHandler 跳过本次调用的 token emit，
    // 避免协议行（phase_signal 等）被当作妹妹回复推送到前端文本流。干净正文由下方 getWriter() 主动推出。
    void modelParams; // 保持对 modelParams 的引用，避免 unused import
    const response = await chatModel.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userContent),
    ], { tags: ["langsmith:nostream"] });

    const responseText = typeof response.content === 'string' ? response.content : '';

    // 解析 phase_signal / probedQuestionId / newInsight 协议行
    const parsed = phaseSignalParse(responseText);

    // ——— 应用信号副作用（stuckCountPerPhase / insightPoints / probedQuestionIdsPerPhase）———
    // applySignalSideEffects 统一处理，取代原先手动追加 probedQuestionId 的逻辑
    const updatedSubProblems = applySignalSideEffects(
        state.subProblems,
        state.currentSubProblemIndex,
        {
            signal: parsed.signal,
            newInsight: parsed.newInsight,
            probedQuestionId: parsed.probedQuestionId,
            phaseKey: 'plan',
        },
    );

    // 构造状态更新
    const stateUpdate: Partial<ElicitGraphState> = {
        messages: [new AIMessage(parsed.cleanContent)],
        subProblems: updatedSubProblems,
    };

    // nostream 模式下，主动用 getWriter() 把干净正文推回给前端
    const writer = getWriter();
    if (writer && parsed.cleanContent.trim()) {
        writer({ kind: 'assistant_message', text: parsed.cleanContent });
    }

    // COMPLETED → 推进到 EXECUTE 阶段并发送 SSE chunk
    // 使用 kind 字段区分（不用 type），让外层 SSE part 名始终为 data-custom
    if (parsed.signal === 'COMPLETED') {
        stateUpdate.currentPhase = PolyaPhase.EXECUTE;
        if (writer) {
            writer({ kind: 'phase_changed', phase: PolyaPhase.EXECUTE });
        }
    }

    return stateUpdate;
};
