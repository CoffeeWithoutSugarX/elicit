import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import type { BaseMessage } from '@langchain/core/messages';

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
