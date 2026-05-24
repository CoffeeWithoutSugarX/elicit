import { describe, it, expect } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import { outOfScopeGuard } from '@/agents/nodes/algorithm/outOfScopeGuard';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

// ── 辅助构造器 ──────────────────────────────────────────────────

function createMockState(overrides: Partial<ElicitGraphState>): ElicitGraphState {
  return {
    messages: [],
    userId: '00000000-0000-0000-0000-000000000001',
    conversationId: '00000000-0000-0000-0000-000000000002',
    hasResolved: true,
    currentPhase: PolyaPhase.UNDERSTAND,
    lastDeviationAt: null,
    subProblems: [],
    currentSubProblemIndex: 0,
    ...overrides,
  } as ElicitGraphState;
}

describe('outOfScopeGuard', () => {
  // ── 基于 ocrResult.subject 的判断 ─────────────────────────────

  it('ocrResult.subject="chinese" → 超出范围（返回 true）', () => {
    const state = createMockState({
      ocrResult: {
        isSolvable: false,
        subject: 'chinese',
        questions: [],
        errorReason: 'NOT_SOLVABLE',
      },
    });
    expect(outOfScopeGuard(state)).toBe(true);
  });

  it('ocrResult.subject="math" → 在范围内（返回 false）', () => {
    const state = createMockState({
      ocrResult: {
        isSolvable: true,
        subject: 'math',
        grade: '初中',
        questions: [{
          index: 0,
          topic: '代数',
          latexFull: 'x+1=2',
          givenConditions: [],
          implicitConditions: [],
          goal: '求 x',
          milestones: [],
          visualFeaturesNeeded: false,
          visualDescription: '',
          subProblems: [{ index: 0, goal: '求 x', givenConditions: [], milestones: [] }],
        }],
        isMulti: false,
        visualFeaturesNeeded: false,
        errorReason: null,
      },
    });
    expect(outOfScopeGuard(state)).toBe(false);
  });

  // ── 无 ocrResult 时退化为关键词匹配 ──────────────────────────

  it('无 ocrResult + 消息含"英语题" → 超出范围（返回 true）', () => {
    const state = createMockState({
      ocrResult: undefined,
      messages: [new HumanMessage('帮我做这道英语题')],
    });
    expect(outOfScopeGuard(state)).toBe(true);
  });

  it('无 ocrResult + 正常数学消息 → 在范围内（返回 false）', () => {
    const state = createMockState({
      ocrResult: undefined,
      messages: [new HumanMessage('这道题怎么列方程')],
    });
    expect(outOfScopeGuard(state)).toBe(false);
  });
});
