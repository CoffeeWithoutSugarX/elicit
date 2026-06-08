import { ElicitGraphState, SubProblemState } from "@/agents/schemas/ElicitGraphStateSchema";
import { chatModel } from "@/agents/models/deepseek-model";
import { systemPrompt, userPromptTemplate, fewShots } from "@/agents/prompts/phases/understandNode.prompt";
import { phaseSignalParse } from "@/agents/nodes/algorithm/phaseSignalParse";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { getWriter } from "@langchain/langgraph";
import { PolyaPhase } from "@/types/enums/polyaPhase.enum";
import { runGuardChain } from "@/agents/nodes/guards/runGuardChain";
import { handleTerminalGuard } from "@/agents/nodes/guards/handleTerminalGuard";
import { applySignalSideEffects } from "@/agents/state/applySignalSideEffects";
import { adaptRecentMessages, buildFewShotMessages, resolveGuardInjection, toStringContent } from "@/agents/prompts/phases/_shared";

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

    // 每次进入理解阶段时，主动推送子问题总数到前端。
    // 这样无论是第一次（ClassifyNode 刚分类完）还是切到下一个子问题，
    // 前端都能在进入 UNDERSTAND 时得到最新的 totalSubProblems。
    // getWriter() 在流式 invoke 上下文中返回写入函数，非流式时返回 undefined（安全调用）。
    const writerForInit = getWriter();
    if (writerForInit && state.subProblems.length > 0) {
        writerForInit({ kind: 'sub_problem_changed', currentIndex: state.currentSubProblemIndex, totalCount: state.subProblems.length });
    }

    // ——— Guard Chain ———
    // 优先级：visionFailure > outOfScope > deviation > stuck
    const { terminal: guardTerminal, injection: guardInjection } = resolveGuardInjection(
        runGuardChain(state),
        handleTerminalGuard,
        'UnderstandNode',
    );
    if (guardTerminal) return guardTerminal;

    // 取最近 10 条消息（约 5 轮对话）
    const recentMessages = adaptRecentMessages(state.messages.slice(-10));

    // 构造 user prompt（若有 guard 注入则追加）
    const baseUserContent = userPromptTemplate({
        selectedQuestion,
        currentSubProblem,
        state,
        recentMessages,
    });
    const userContent = guardInjection ? `${baseUserContent}\n\n${guardInjection}` : baseUserContent;

    // ——— 构建 few-shot messages ———
    const fewShotMessages = buildFewShotMessages(fewShots);

    // 调用 DeepSeek（temperature / max_tokens 见 understandNode.prompt.ts 中的 modelParams 文档，
    // ChatOpenAICallOptions 不接受运行时覆盖，故仅传消息列表）
    // 加 "langsmith:nostream" tag：让 LangGraph StreamMessagesHandler 跳过本次调用的 token emit，
    // 避免协议行（phase_signal 等）被当作妹妹回复推送到前端文本流。干净正文由下方 getWriter() 主动推出。
    const response = await chatModel.invoke([
        new SystemMessage(systemPrompt),
        ...fewShotMessages,
        new HumanMessage(userContent),
    ], { tags: ["langsmith:nostream"] });

    const responseText = toStringContent(response.content);

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

    // nostream 模式下，主动用 getWriter() 把干净正文推回给前端
    const writer = getWriter();
    if (writer && parsed.cleanContent.trim()) {
        writer({ kind: 'assistant_message', text: parsed.cleanContent });
    }

    // COMPLETED → 推进到 PLAN 阶段并发送 SSE chunk
    // 使用 kind 字段区分（不用 type），让外层 SSE part 名始终为 data-custom
    if (parsed.signal === 'COMPLETED') {
        stateUpdate.currentPhase = PolyaPhase.PLAN;
        if (writer) {
            writer({ kind: 'phase_changed', phase: PolyaPhase.PLAN });
        }
    }

    return stateUpdate;
};
