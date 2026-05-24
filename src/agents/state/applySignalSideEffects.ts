import { type SubProblemState } from '@/agents/schemas/ElicitGraphStateSchema';
import { type PhaseSignal } from '@/agents/nodes/algorithm/phaseSignalParse';

// ---------- 类型 ----------

/** stuckCountPerPhase / probedQuestionIdsPerPhase 的键名 */
type PhaseKey = 'understand' | 'plan' | 'execute' | 'review';

export interface SignalSideEffectsInput {
  signal: PhaseSignal;
  /** 模型提取到的新洞察（可选） */
  newInsight?: string;
  /** 模型使用的 5 问探路 ID（可选） */
  probedQuestionId?: 1 | 2 | 3 | 4 | 5;
  /** 当前阶段键名（'understand' | 'plan' | 'execute' | 'review'） */
  phaseKey: PhaseKey;
}

/**
 * 纯函数：根据 PhaseSignal 更新指定小问的状态，返回新的 subProblems 数组。
 * 所有副作用均通过返回值体现，无 I/O。
 *
 * 规则（详设 §5.2、§5.3）：
 * - STAY          → stuckCountPerPhase[phaseKey] += 1
 * - COMPLETED     → stuckCountPerPhase[phaseKey] = 0（相位推进时重置）
 * - SUB_PROBLEM_DONE → stuckCountPerPhase[phaseKey] = 0
 * - PROBLEM_BLOCKED  → stuckCountPerPhase[phaseKey] = 0
 * - ESCALATE      → 不改 stuckCount（返回 PLAN，由 PlanNode 在自己的 phase 计数）
 * - newInsight    → 追加到 insightPoints（长度上限 20，超出截断）
 * - probedQuestionId → 追加到 probedQuestionIdsPerPhase[phaseKey]（去重）
 */
export function applySignalSideEffects(
  subProblems: SubProblemState[],
  currentSubProblemIndex: number,
  input: SignalSideEffectsInput,
): SubProblemState[] {
  const { signal, newInsight, probedQuestionId, phaseKey } = input;
  const current = subProblems[currentSubProblemIndex];
  if (!current) return subProblems;

  const patch: Partial<SubProblemState> = {};

  // ——— stuckCountPerPhase 更新 ———
  if (signal === 'STAY') {
    patch.stuckCountPerPhase = {
      ...current.stuckCountPerPhase,
      [phaseKey]: current.stuckCountPerPhase[phaseKey] + 1,
    };
  } else if (
    signal === 'COMPLETED' ||
    signal === 'SUB_PROBLEM_DONE' ||
    signal === 'PROBLEM_BLOCKED'
  ) {
    // 阶段推进或小问终止时重置当前阶段的卡住计数
    patch.stuckCountPerPhase = {
      ...current.stuckCountPerPhase,
      [phaseKey]: 0,
    };
  }
  // ESCALATE 不更新 stuckCount（回到 PLAN 阶段时由 PlanNode 重新计数）

  // ——— insightPoints 追加 ———
  if (newInsight) {
    const trimmed = newInsight.trim().slice(0, 30); // 最长 30 字
    if (trimmed && !current.insightPoints.includes(trimmed)) {
      // 上限 20 条，超出丢弃最旧的
      const existing = current.insightPoints.slice(-19);
      patch.insightPoints = [...existing, trimmed];
    }
  }

  // ——— probedQuestionIdsPerPhase 追加（去重）———
  if (probedQuestionId !== undefined) {
    const existingIds = current.probedQuestionIdsPerPhase[phaseKey];
    if (!existingIds.includes(probedQuestionId)) {
      patch.probedQuestionIdsPerPhase = {
        ...current.probedQuestionIdsPerPhase,
        [phaseKey]: [...existingIds, probedQuestionId],
      };
    }
  }

  // 无任何变更时直接返回原数组引用（避免无效更新）
  if (Object.keys(patch).length === 0) return subProblems;

  return subProblems.map((sp, i) =>
    i === currentSubProblemIndex ? { ...sp, ...patch } : sp,
  );
}
