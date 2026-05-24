import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';

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
