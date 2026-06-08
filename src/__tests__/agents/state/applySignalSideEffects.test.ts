import { describe, it, expect } from 'vitest';
import { applySignalSideEffects } from '@/agents/state/applySignalSideEffects';
import { makeSubProblem } from '@/__tests__/helpers/mockState';

describe('applySignalSideEffects', () => {
  // ── STAY：stuckCount += 1 ─────────────────────────────────────────────────

  it('STAY → 当前阶段 stuckCount + 1', () => {
    const sp = makeSubProblem({ stuckCountPerPhase: { understand: 2, plan: 0, execute: 0, review: 0 } });
    const result = applySignalSideEffects([sp], 0, { signal: 'STAY', phaseKey: 'understand' });
    expect(result[0].stuckCountPerPhase.understand).toBe(3);
    // 其他阶段不受影响
    expect(result[0].stuckCountPerPhase.plan).toBe(0);
  });

  it('STAY plan 阶段 → plan stuckCount + 1', () => {
    const sp = makeSubProblem({ stuckCountPerPhase: { understand: 0, plan: 1, execute: 0, review: 0 } });
    const result = applySignalSideEffects([sp], 0, { signal: 'STAY', phaseKey: 'plan' });
    expect(result[0].stuckCountPerPhase.plan).toBe(2);
  });

  // ── COMPLETED：当前阶段 stuckCount 重置为 0 ───────────────────────────────

  it('COMPLETED → 当前阶段 stuckCount 重置为 0', () => {
    const sp = makeSubProblem({ stuckCountPerPhase: { understand: 5, plan: 3, execute: 0, review: 0 } });
    const result = applySignalSideEffects([sp], 0, { signal: 'COMPLETED', phaseKey: 'understand' });
    expect(result[0].stuckCountPerPhase.understand).toBe(0);
    // plan 不受影响
    expect(result[0].stuckCountPerPhase.plan).toBe(3);
  });

  // ── SUB_PROBLEM_DONE：当前阶段 stuckCount 重置为 0 ───────────────────────

  it('SUB_PROBLEM_DONE → 当前阶段 stuckCount 重置为 0', () => {
    const sp = makeSubProblem({ stuckCountPerPhase: { understand: 0, plan: 0, execute: 4, review: 0 } });
    const result = applySignalSideEffects([sp], 0, { signal: 'SUB_PROBLEM_DONE', phaseKey: 'execute' });
    expect(result[0].stuckCountPerPhase.execute).toBe(0);
  });

  // ── PROBLEM_BLOCKED：当前阶段 stuckCount 重置为 0 ────────────────────────

  it('PROBLEM_BLOCKED → 当前阶段 stuckCount 重置为 0', () => {
    const sp = makeSubProblem({ stuckCountPerPhase: { understand: 0, plan: 0, execute: 3, review: 0 } });
    const result = applySignalSideEffects([sp], 0, { signal: 'PROBLEM_BLOCKED', phaseKey: 'execute' });
    expect(result[0].stuckCountPerPhase.execute).toBe(0);
  });

  // ── ESCALATE：stuckCount 不变 ────────────────────────────────────────────

  it('ESCALATE → stuckCount 不变（回到 PlanNode 重新计数）', () => {
    const sp = makeSubProblem({ stuckCountPerPhase: { understand: 0, plan: 0, execute: 2, review: 0 } });
    const result = applySignalSideEffects([sp], 0, { signal: 'ESCALATE', phaseKey: 'execute' });
    // ESCALATE 不改 stuckCount
    expect(result[0].stuckCountPerPhase.execute).toBe(2);
  });

  // ── newInsight 追加 ───────────────────────────────────────────────────────

  it('STAY + newInsight → 追加到 insightPoints', () => {
    const sp = makeSubProblem({ insightPoints: ['已有洞察'] });
    const result = applySignalSideEffects([sp], 0, {
      signal: 'STAY',
      phaseKey: 'execute',
      newInsight: '三点共线折线最短',
    });
    expect(result[0].insightPoints).toHaveLength(2);
    expect(result[0].insightPoints[1]).toBe('三点共线折线最短');
  });

  it('newInsight 超过 30 字 → 截断至 30 字', () => {
    const sp = makeSubProblem({ insightPoints: [] });
    const longInsight = '这是一个超过三十个字符的洞察文字，用于测试截断逻辑的边界条件';
    const result = applySignalSideEffects([sp], 0, {
      signal: 'STAY',
      phaseKey: 'execute',
      newInsight: longInsight,
    });
    expect(result[0].insightPoints[0].length).toBeLessThanOrEqual(30);
  });

  it('newInsight 重复时不追加（去重）', () => {
    const sp = makeSubProblem({ insightPoints: ['三点共线折线最短'] });
    const result = applySignalSideEffects([sp], 0, {
      signal: 'STAY',
      phaseKey: 'execute',
      newInsight: '三点共线折线最短',
    });
    expect(result[0].insightPoints).toHaveLength(1);
  });

  // ── probedQuestionId 追加 ─────────────────────────────────────────────────

  it('STAY + probedQuestionId → 追加到 probedQuestionIdsPerPhase[phaseKey]', () => {
    const sp = makeSubProblem({
      probedQuestionIdsPerPhase: { understand: [], plan: [1], execute: [], review: [] },
    });
    const result = applySignalSideEffects([sp], 0, {
      signal: 'STAY',
      phaseKey: 'plan',
      probedQuestionId: 2,
    });
    expect(result[0].probedQuestionIdsPerPhase.plan).toContain(1);
    expect(result[0].probedQuestionIdsPerPhase.plan).toContain(2);
  });

  it('probedQuestionId 已存在时不重复追加', () => {
    const sp = makeSubProblem({
      probedQuestionIdsPerPhase: { understand: [1, 2], plan: [], execute: [], review: [] },
    });
    const result = applySignalSideEffects([sp], 0, {
      signal: 'STAY',
      phaseKey: 'understand',
      probedQuestionId: 2,
    });
    const ids = result[0].probedQuestionIdsPerPhase.understand;
    expect(ids.filter(id => id === 2)).toHaveLength(1);
  });

  // ── 多子问题：只更新 currentIndex 指向的那个 ─────────────────────────────

  it('多子问题场景 → 只更新 index=1 的小问，index=0 不变', () => {
    const sp0 = makeSubProblem({ index: 0, stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 } });
    const sp1 = makeSubProblem({ index: 1, stuckCountPerPhase: { understand: 0, plan: 2, execute: 0, review: 0 } });
    const result = applySignalSideEffects([sp0, sp1], 1, { signal: 'STAY', phaseKey: 'plan' });
    // index=0 不变
    expect(result[0].stuckCountPerPhase.understand).toBe(3);
    // index=1 的 plan 增加
    expect(result[1].stuckCountPerPhase.plan).toBe(3);
  });

  // ── 无更新时返回原数组引用 ────────────────────────────────────────────────

  it('ESCALATE 无 insight / probedId → 返回原数组引用（无变更）', () => {
    const sp = makeSubProblem();
    const original = [sp];
    const result = applySignalSideEffects(original, 0, { signal: 'ESCALATE', phaseKey: 'execute' });
    expect(result).toBe(original);
  });

  // ── 边界：index 超出范围 ──────────────────────────────────────────────────

  it('currentSubProblemIndex 超出 subProblems 长度 → 返回原数组不崩溃', () => {
    const sp = makeSubProblem();
    const original = [sp];
    const result = applySignalSideEffects(original, 5, { signal: 'STAY', phaseKey: 'execute' });
    expect(result).toBe(original);
  });
});
