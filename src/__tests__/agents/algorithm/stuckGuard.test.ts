import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { type ElicitGraphState, type SubProblemState } from '@/agents/schemas/ElicitGraphStateSchema';
import { stuckGuard } from '@/agents/nodes/algorithm/stuckGuard';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

// ── 辅助构造器 ──────────────────────────────────────────────────

function makeSubProblem(overrides: Partial<SubProblemState> = {}): SubProblemState {
  return {
    index: 0,
    goal: '求解方程',
    givenConditions: [],
    milestones: [],
    status: 'pending',
    insightPoints: [],
    stuckCountPerPhase: { understand: 0, plan: 0, execute: 0, review: 0 },
    probedQuestionIds: [],
    ...overrides,
  };
}

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

// 包含卡住关键词的用户消息
const stuckMessages = [
  new HumanMessage('我不会'),
];

describe('stuckGuard', () => {
  // ── 边界情况 ───────────────────────────────────────────────────

  it('subProblems 为空时返回 null', () => {
    const state = createMockState({ subProblems: [] });
    expect(stuckGuard(state)).toBeNull();
  });

  it('stuckCount < 3 时返回 null（未触发）', () => {
    const state = createMockState({
      messages: stuckMessages,
      subProblems: [makeSubProblem({ stuckCountPerPhase: { understand: 2, plan: 0, execute: 0, review: 0 } })],
    });
    expect(stuckGuard(state)).toBeNull();
  });

  // ── PROBE_5Q 分支 ──────────────────────────────────────────────

  it('stuckCount >= 3 + 关键词命中 + probedIds=[] → PROBE_5Q(id=1)', () => {
    const state = createMockState({
      messages: stuckMessages,
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 },
        probedQuestionIds: [],
      })],
    });
    const action = stuckGuard(state);
    expect(action?.kind).toBe('PROBE_5Q');
    if (action?.kind === 'PROBE_5Q') {
      expect(action.nextQuestionId).toBe(1);
    }
  });

  it('stuckCount >= 3 + 关键词命中 + probedIds=[1,2] → PROBE_5Q(id=3)', () => {
    const state = createMockState({
      messages: stuckMessages,
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 },
        probedQuestionIds: [1, 2],
      })],
    });
    const action = stuckGuard(state);
    expect(action?.kind).toBe('PROBE_5Q');
    if (action?.kind === 'PROBE_5Q') {
      expect(action.nextQuestionId).toBe(3);
    }
  });

  it('stuckCount >= 3 + 关键词命中 + 5 问全用尽 → KNOWLEDGE_FALLBACK', () => {
    const state = createMockState({
      messages: stuckMessages,
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 },
        probedQuestionIds: [1, 2, 3, 4, 5],
      })],
    });
    const action = stuckGuard(state);
    expect(action?.kind).toBe('KNOWLEDGE_FALLBACK');
  });

  // ── B4 跨子问题规则 ────────────────────────────────────────────

  it('≥2 个子问题 blocked + stuckCount>=3 → 直接 KNOWLEDGE_FALLBACK（跳过 PROBE_5Q）', () => {
    const state = createMockState({
      messages: stuckMessages,
      subProblems: [
        makeSubProblem({
          index: 0,
          status: 'blocked',
          stuckCountPerPhase: { understand: 3, plan: 0, execute: 0, review: 0 },
          probedQuestionIds: [],
        }),
        makeSubProblem({ index: 1, status: 'blocked' }),
      ],
      currentSubProblemIndex: 0,
    });
    const action = stuckGuard(state);
    expect(action?.kind).toBe('KNOWLEDGE_FALLBACK');
  });

  // ── 无关键词命中 ───────────────────────────────────────────────

  it('stuckCount >= 3 但近期消息无关键词 → 返回 null', () => {
    const state = createMockState({
      messages: [new HumanMessage('这道题很有趣'), new AIMessage('你思考一下')],
      subProblems: [makeSubProblem({
        stuckCountPerPhase: { understand: 5, plan: 0, execute: 0, review: 0 },
        probedQuestionIds: [],
      })],
    });
    expect(stuckGuard(state)).toBeNull();
  });
});
