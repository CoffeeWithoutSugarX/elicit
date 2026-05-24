import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import { visionFailureGuard } from '@/agents/nodes/algorithm/visionFailureGuard';
import { outOfScopeGuard } from '@/agents/nodes/algorithm/outOfScopeGuard';
import { deviationGuard, type DeviationAction } from '@/agents/nodes/algorithm/deviationGuard';
import { stuckGuard, type StuckAction } from '@/agents/nodes/algorithm/stuckGuard';

// ---------- 统一 GuardAction 类型 ----------
// visionFailureGuard / outOfScopeGuard 返回 boolean；用 kind 字段统一包装。

export type GuardAction =
  | { kind: 'VISION_FAILURE' }
  | { kind: 'OUT_OF_SCOPE' }
  | DeviationAction   // { kind: 'PULL_BACK'; injectPrompt: string; pulledFromPhase: number }
  | StuckAction;      // { kind: 'PROBE_5Q'; ... } | { kind: 'KNOWLEDGE_FALLBACK'; ... }

/**
 * 按优先级顺序运行所有 guard，返回第一个命中的 GuardAction。
 * 优先级（高→低）：visionFailure > outOfScope > deviation > stuck
 *
 * 纯函数调用链，无 I/O、无副作用。
 *
 * @returns 命中的 GuardAction，或 null（所有 guard 均放行）
 */
export function runGuardChain(state: ElicitGraphState): GuardAction | null {
  // 1. VisionFailureGuard — OCR 解析失败，无法继续引导
  if (visionFailureGuard(state)) {
    return { kind: 'VISION_FAILURE' };
  }

  // 2. OutOfScopeGuard — 题目超出初中数学范围
  if (outOfScopeGuard(state)) {
    return { kind: 'OUT_OF_SCOPE' };
  }

  // 3. DeviationGuard — 学生偏离引导路径
  const deviationResult = deviationGuard(state);
  if (deviationResult) return deviationResult;

  // 4. StuckGuard — 学生在当前阶段卡住
  const stuckResult = stuckGuard(state);
  if (stuckResult) return stuckResult;

  return null;
}
