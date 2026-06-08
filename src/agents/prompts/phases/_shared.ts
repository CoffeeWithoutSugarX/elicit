import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import type { BaseMessage } from '@langchain/core/messages';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

/**
 * 共享 few-shot 消息类型：所有 PhaseNode prompt 文件的 fewShots 均满足此形状。
 */
export type FewShotPair = { readonly user: string; readonly assistant: string };

/**
 * SIM-01：将 few-shot 对数组转换为 [HumanMessage, AIMessage] 交替的消息数组。
 * 消息插在 SystemMessage 之后、真实用户消息之前。
 * ExecuteNode / ReviewNode 以及新接线的 4 个节点统一使用此函数。
 */
export function buildFewShotMessages(
    fewShots: ReadonlyArray<FewShotPair>,
): Array<HumanMessage | AIMessage> {
    return fewShots.flatMap(({ user, assistant }) => [
        new HumanMessage(user),
        new AIMessage(assistant),
    ]);
}

/**
 * R-011 落地：为含图题目生成"# 题目图示"块。
 * 仅当 visualFeaturesNeeded=true 且 visualDescription 非空时才输出，
 * 否则返回空字符串（不占 token）。
 * 所有 PhaseNode 的 userPromptTemplate 都必须调用此函数。
 */
export function formatVisualBlock(q: SanitizedQuestion): string {
    if (!q.visualFeaturesNeeded || !q.visualDescription) return '';
    return `# 题目图示（妹妹看到的图，你看不到，按下方描述还原图意进行引导，不要假设描述外的视觉信息）\n${q.visualDescription}`;
}

/**
 * SIM-03：将模型响应 content 统一转为字符串，非字符串时降级为空字符串。
 * 5 个 phase 节点中重复的 `typeof response.content === 'string' ? response.content : ''`
 * 提取为此工具函数，全部节点调用处均使用此函数。
 */
export function toStringContent(content: unknown): string {
    return typeof content === 'string' ? content : '';
}

/**
 * 将 LangGraph messages 适配为 prompt 模板所需的轻量消息格式。
 * PlanNode 与 UnderstandNode 共用此适配器，避免重复手写相同的 map 逻辑。
 * @param messages - LangGraph state 中的原始消息数组（取切片后传入）
 */
export function adaptRecentMessages(
    messages: BaseMessage[]
): Pick<BaseMessage, 'getType' | 'content'>[] {
    return messages.map(m => ({
        getType: () => (m._getType() === 'human' ? 'human' as const : 'ai' as const),
        content: typeof m.content === 'string' ? m.content : '',
    }));
}

/**
 * SIM-02：统一处理 Guard Chain 注入，返回 `{ terminal, injection }` 两个字段。
 * - `terminal`：终态时为 `Partial<ElicitGraphState>`（调用方直接 return），非终态为 null
 * - `injection`：PULL_BACK / PROBE_5Q / KNOWLEDGE_FALLBACK 时为注入的 prompt 字符串，否则为空字符串
 *
 * 调用方模式（以 UnderstandNode 为例）：
 * ```ts
 * const { terminal, injection } = resolveGuardInjection(
 *   runGuardChain(state), handleTerminalGuard, 'UnderstandNode'
 * );
 * if (terminal) return terminal;
 * // ...追加 injection 到 userContent
 * ```
 */
export function resolveGuardInjection(
    guardAction: import('@/agents/nodes/guards/runGuardChain').GuardAction | null,
    handleTerminal: (
        guardAction: import('@/agents/nodes/guards/runGuardChain').GuardAction,
        nodeName: string,
    ) => Partial<import('@/agents/schemas/ElicitGraphStateSchema').ElicitGraphState> | null,
    nodeName: string,
): {
    terminal: Partial<import('@/agents/schemas/ElicitGraphStateSchema').ElicitGraphState> | null;
    injection: string;
} {
    if (!guardAction) {
        return { terminal: null, injection: '' };
    }
    const terminal = handleTerminal(guardAction, nodeName);
    if (terminal) {
        return { terminal, injection: '' };
    }
    // PULL_BACK / PROBE_5Q / KNOWLEDGE_FALLBACK — 注入 prompt，继续调用 LLM
    console.log(`${nodeName} guard fired:`, guardAction.kind);
    const injection = ('injectPrompt' in guardAction ? guardAction.injectPrompt : undefined) ?? '';
    return { terminal: null, injection };
}

/**
 * B4 多小问感知：描述当前处于哪个小问的上下文。
 * 所有 PhaseNode 的 userPromptTemplate 都必须调用此函数并注入到"# 多小问场景"段。
 */
export function describeSubProblemContext(
    state: Pick<ElicitGraphState, 'subProblems' | 'currentSubProblemIndex'>
): string {
    const total = state.subProblems.length;
    const idx = state.currentSubProblemIndex;
    if (total <= 1) return '本题为单一目标题（无小问拆分）';
    if (idx === 0) return `本题共 ${total} 个小问，当前正在引导第 1 个`;
    return `本题共 ${total} 个小问，当前正在引导第 ${idx + 1} 个；前 ${idx} 个小问已完成（妹妹已对整道题面有过理解）`;
}
