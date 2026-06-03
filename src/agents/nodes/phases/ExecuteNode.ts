import { ElicitGraphState, SubProblemState } from "@/agents/schemas/ElicitGraphStateSchema";
import { AIMessage, SystemMessage, HumanMessage } from "@langchain/core/messages";
import { getWriter } from "@langchain/langgraph";
import { chatModel } from "@/agents/models/deepseek-model";
import { phaseSignalParse } from "@/agents/nodes/algorithm/phaseSignalParse";
import {
    systemPrompt,
    userPromptTemplate,
    fewShots,
} from "@/agents/prompts/phases/executeNode.prompt";
import { PolyaPhase } from "@/types/enums/polyaPhase.enum";
import { runGuardChain } from "@/agents/nodes/guards/runGuardChain";
import { applySignalSideEffects } from "@/agents/state/applySignalSideEffects";

export const executeNodeName = 'executeNode';

/**
 * 辅助：对 subProblems 数组中指定位置的元素做 patch，返回新数组。
 * LangGraph state 浅合并，必须返回整个数组才能更新嵌套字段。
 */
function updateCurrentSubProblem(
    subProblems: SubProblemState[],
    currentIndex: number,
    patch: Partial<SubProblemState>,
): SubProblemState[] {
    return subProblems.map((sp, i) =>
        i === currentIndex ? { ...sp, ...patch } : sp,
    );
}

export const executeNode = async (state: ElicitGraphState) => {
    console.log('ExecuteNode invoked with', { conversationId: state.conversationId, currentPhase: state.currentPhase });

    // ——— 前置校验 ———
    const ocrResult = state.ocrResult;
    if (!ocrResult || !ocrResult.isSolvable) {
        console.log('ExecuteNode: no solvable ocrResult, skipping');
        return {};
    }

    const selectedIndex = ocrResult.selectedQuestionIndex ?? 0;
    const selectedQuestion = ocrResult.questions[selectedIndex];
    if (!selectedQuestion) {
        console.log('ExecuteNode: selected question not found at index', selectedIndex);
        return {};
    }

    const currentSubProblemIndex = state.currentSubProblemIndex ?? 0;
    const currentSubProblem = state.subProblems[currentSubProblemIndex];
    if (!currentSubProblem) {
        console.log('ExecuteNode: currentSubProblem not found at index', currentSubProblemIndex);
        return {};
    }

    // ——— Guard Chain ———
    // 优先级：visionFailure > outOfScope > deviation > stuck
    const guardAction = runGuardChain(state);
    let guardInjection = '';
    if (guardAction) {
        if (guardAction.kind === 'VISION_FAILURE') {
            console.log('ExecuteNode guard fired: VISION_FAILURE');
            const visionFailText = '（图片识别失败，无法继续引导，请重新上传清晰的题目图片）';
            // nostream 模式下前端收不到 messages 流，需主动推干净正文
            getWriter()?.({ kind: 'assistant_message', text: visionFailText });
            return { messages: [new AIMessage(visionFailText)] };
        }
        if (guardAction.kind === 'OUT_OF_SCOPE') {
            console.log('ExecuteNode guard fired: OUT_OF_SCOPE');
            const outOfScopeText = '（这道题超出了初中数学的范围，我只能帮你解决初中数学题哦）';
            // nostream 模式下前端收不到 messages 流，需主动推干净正文
            getWriter()?.({ kind: 'assistant_message', text: outOfScopeText });
            return { messages: [new AIMessage(outOfScopeText)] };
        }
        // PULL_BACK / PROBE_5Q / KNOWLEDGE_FALLBACK — 注入 prompt，继续调用 LLM
        console.log('ExecuteNode guard fired:', guardAction.kind);
        guardInjection = guardAction.injectPrompt ?? '';
    }

    // ——— 构建 few-shot messages ———
    const fewShotMessages = fewShots.flatMap(({ user, assistant }) => [
        new HumanMessage(user),
        new AIMessage(assistant),
    ]);

    // ——— 构建用户 prompt（若有 guard 注入则追加）———
    const recentMessages = state.messages.slice(-16);
    const baseUserContent = userPromptTemplate({
        selectedQuestion,
        currentSubProblem,
        state,
        recentMessages,
    });
    const userContent = guardInjection ? `${baseUserContent}\n\n${guardInjection}` : baseUserContent;

    try {
        // ——— 调用 DeepSeek ———
        // temperature / max_tokens 在 modelParams 中定义供文档用；
        // ChatOpenAI 的 temperature 是构造参数，不是 invoke call option。
        // 如需覆盖可在 chatModel 构造时传入，或通过 new ChatOpenAI({...modelParams})。
        // 加 "langsmith:nostream" tag：让 LangGraph StreamMessagesHandler 跳过本次调用的 token emit，
        // 避免协议行（phase_signal 等）被当作妹妹回复推送到前端文本流。干净正文由下方 getWriter() 主动推出。
        const response = await chatModel.invoke([
            new SystemMessage(systemPrompt),
            ...fewShotMessages,
            new HumanMessage(userContent),
        ], { tags: ["langsmith:nostream"] });

        const rawContent = typeof response.content === 'string' ? response.content : '';

        // ——— 解析 phase 信号 ———
        const { signal, newInsight, probedQuestionId, cleanContent } = phaseSignalParse(rawContent);

        console.log('ExecuteNode signal:', signal, { newInsight, probedQuestionId });

        // ——— 应用信号副作用（stuckCountPerPhase / insightPoints / probedQuestionIdsPerPhase）———
        // applySignalSideEffects 统一处理，取代原先手动追加这些字段的逻辑
        const afterSideEffects = applySignalSideEffects(
            state.subProblems,
            currentSubProblemIndex,
            {
                signal,
                newInsight,
                probedQuestionId,
                phaseKey: 'execute',
            },
        );

        // ——— 处理各信号的 status / 路由变更（status 不属于 applySignalSideEffects 职责）———
        // 使用 kind 字段区分（不用 type），让外层 SSE part 名始终为 data-custom
        const writer = getWriter();
        let updatedSubProblems = afterSideEffects;

        switch (signal) {
            case 'SUB_PROBLEM_DONE': {
                // 标记当前小问完成
                updatedSubProblems = updateCurrentSubProblem(updatedSubProblems, currentSubProblemIndex, { status: 'done' });
                // 推送 phase_changed 信号（路由到下一小问 / reviewNode 由 graph 处理）
                if (writer) {
                    writer({ kind: 'phase_changed', phase: PolyaPhase.EXECUTE });
                }
                break;
            }
            case 'PROBLEM_BLOCKED': {
                // 标记当前小问阻塞
                updatedSubProblems = updateCurrentSubProblem(updatedSubProblems, currentSubProblemIndex, { status: 'blocked' });
                if (writer) {
                    writer({ kind: 'phase_changed', phase: PolyaPhase.EXECUTE });
                }
                break;
            }
            case 'ESCALATE': {
                // 路由回 PlanNode 由 graph 处理；currentPhase 回退到 PLAN（供 executeRouter 判断）
                if (writer) {
                    writer({ kind: 'phase_changed', phase: PolyaPhase.PLAN });
                }
                break;
            }
            case 'COMPLETED':
            case 'STAY':
            default: {
                // STAY：等待下一条用户消息，无路由变更
                // COMPLETED 在 Execute 阶段不应出现，按 STAY 处理（priority 低）
                break;
            }
        }

        // nostream 模式下，主动用 getWriter() 把干净正文推回给前端
        if (writer && cleanContent.trim()) {
            writer({ kind: 'assistant_message', text: cleanContent });
        }

        // 构造 state 更新对象
        const stateUpdate: Partial<ElicitGraphState> = {
            messages: [new AIMessage(cleanContent)],
            subProblems: updatedSubProblems,
        };

        // ESCALATE → currentPhase 回退到 PLAN（executeRouter 据此判断路由目标）
        if (signal === 'ESCALATE') {
            stateUpdate.currentPhase = PolyaPhase.PLAN;
        }

        // SUB_PROBLEM_DONE / PROBLEM_BLOCKED → 推进 currentSubProblemIndex 到下一个 pending 子问
        // executeRouter 据 index 判断是路由到 understandNode 还是 reviewNode
        if (signal === 'SUB_PROBLEM_DONE' || signal === 'PROBLEM_BLOCKED') {
            const nextPendingIndex = state.subProblems.findIndex(
                (sp, i) => i > currentSubProblemIndex && sp.status === 'pending',
            );
            if (nextPendingIndex >= 0) {
                stateUpdate.currentSubProblemIndex = nextPendingIndex;
                // 重置阶段到 UNDERSTAND，从头引导下一个子问题
                stateUpdate.currentPhase = PolyaPhase.UNDERSTAND;
                // 使用 kind 字段区分，让外层 SSE part 名始终为 data-custom
                if (writer) {
                    writer({ kind: 'sub_problem_changed', currentIndex: nextPendingIndex, totalCount: state.subProblems.length });
                }
            }
            // 无更多 pending → index 保持（executeRouter 会路由到 reviewNode）
        }

        return stateUpdate;

    } catch (error) {
        console.log('ExecuteNode error', error);
        // 容错兜底：返回简单回复，不改变 subProblems 状态
        // nostream 模式下前端收不到 messages 流，需主动推干净正文
        const catchText = '（执行阶段暂时无法响应，请重试）';
        getWriter()?.({ kind: 'assistant_message', text: catchText });
        return {
            messages: [new AIMessage(catchText)],
        };
    }
};
