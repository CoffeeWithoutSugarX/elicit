import { describe, it, expect } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { runGuardChain } from '@/agents/nodes/guards/runGuardChain';
import { createMockState, makeSubProblem } from '@/__tests__/helpers/mockState';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

// ——— 辅助：构建视觉解析失败的 ocrResult ———
function makeFailedOcrResult() {
  return {
    isSolvable: false as const,
    subject: 'math' as const,
    questions: [] as never[],
    errorReason: 'BLURRY' as const,
  };
}

// ——— 辅助：构建非数学学科的 ocrResult ———
function makeNonMathOcrResult() {
  return {
    isSolvable: true as const,
    subject: 'chinese' as const, // outOfScopeGuard: subject !== 'math' → true
    grade: '初中',
    questions: [],
    isMulti: false,
    visualFeaturesNeeded: false,
    errorReason: null,
  };
}

// ——— 辅助：包含卡住关键词的消息列表（触发 stuckGuard）———
function makeStuckMessages() {
  return [new HumanMessage('我不会')];
}

describe('runGuardChain', () => {
  // ── 全 pass 场景 ───────────────────────────────────────────────────────────

  it('所有 guard 均 pass → 返回 null', () => {
    const state = createMockState({
      subProblems: [],
      messages: [new HumanMessage('下一步怎么想？')],
    });
    expect(runGuardChain(state)).toBeNull();
  });

  // ── VisionFailure（最高优先级）─────────────────────────────────────────────

  it('VisionFailureGuard 命中 → 返回 { kind: "VISION_FAILURE" }', () => {
    const state = createMockState({ ocrResult: makeFailedOcrResult() });
    const action = runGuardChain(state);
    expect(action?.kind).toBe('VISION_FAILURE');
  });

  it('visionFailure 命中时，不再检查后续 guard', () => {
    // ocrResult 失败 + 包含 outOfScope 线索：只应返回 VISION_FAILURE
    const state = createMockState({
      ocrResult: {
        ...makeFailedOcrResult(),
        subject: 'chinese' as const,
      },
    });
    const action = runGuardChain(state);
    expect(action?.kind).toBe('VISION_FAILURE');
  });

  // ── OutOfScope（第 2 优先级）──────────────────────────────────────────────

  it('OutOfScopeGuard 命中 → 返回 { kind: "OUT_OF_SCOPE" }', () => {
    const state = createMockState({ ocrResult: makeNonMathOcrResult() as never });
    const action = runGuardChain(state);
    expect(action?.kind).toBe('OUT_OF_SCOPE');
  });

  it('outOfScope 命中时，stuckGuard 不应运行（即使满足条件）', () => {
    // ocrResult.subject = 'chinese' 且 stuckCount >= 3 + 关键词：只应返回 OUT_OF_SCOPE
    const state = createMockState({
      ocrResult: makeNonMathOcrResult() as never,
      messages: makeStuckMessages(),
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 },
        probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
      })],
    });
    const action = runGuardChain(state);
    expect(action?.kind).toBe('OUT_OF_SCOPE');
  });

  // ── Deviation（第 3 优先级）──────────────────────────────────────────────

  it('DeviationGuard 命中 → 返回 { kind: "PULL_BACK" }', () => {
    // '答案是' 是 giveAnswer 关键词，UNDERSTAND 阶段无冷却期 → 必然触发 deviation
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      messages: [new HumanMessage('答案是 42')],
      lastDeviationAt: null,
    });
    const action = runGuardChain(state);
    expect(action).not.toBeNull();
    expect(action!.kind).toBe('PULL_BACK');
  });

  // ── Stuck（第 4 优先级）──────────────────────────────────────────────────

  it('StuckGuard 命中（5 问未用尽）→ 返回 PROBE_5Q + injectPrompt + nextQuestionId', () => {
    // probedQuestionIdsPerPhase.understand 为空 → 尚有未用 5 问 → PROBE_5Q
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      messages: makeStuckMessages(),
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 },
        probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
      })],
    });
    const action = runGuardChain(state);
    expect(action).not.toBeNull();
    expect(action!.kind).toBe('PROBE_5Q');
    expect((action as { kind: 'PROBE_5Q'; injectPrompt: string; nextQuestionId: number }).injectPrompt).toBeTruthy();
    expect([1, 2, 3, 4, 5]).toContain((action as { kind: 'PROBE_5Q'; injectPrompt: string; nextQuestionId: number }).nextQuestionId);
  });

  it('StuckGuard 命中（5 问已全部用尽）→ 返回 KNOWLEDGE_FALLBACK', () => {
    // probedQuestionIdsPerPhase.understand 已含 1-5 → 5 问耗尽 → KNOWLEDGE_FALLBACK
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      messages: makeStuckMessages(),
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 },
        probedQuestionIdsPerPhase: { understand: [1, 2, 3, 4, 5], plan: [], execute: [], review: [] },
      })],
    });
    const action = runGuardChain(state);
    expect(action).not.toBeNull();
    expect(action!.kind).toBe('KNOWLEDGE_FALLBACK');
  });

  // ── 优先级验证：stuck 命中但 visionFailure 也命中 → visionFailure 优先 ────

  it('visionFailure 与 stuck 同时满足 → 只返回 VISION_FAILURE（优先级最高）', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      ocrResult: makeFailedOcrResult(),
      messages: makeStuckMessages(),
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 5, plan: 0, execute: 0, review: 0 },
        probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
      })],
    });
    const action = runGuardChain(state);
    expect(action?.kind).toBe('VISION_FAILURE');
  });

});
