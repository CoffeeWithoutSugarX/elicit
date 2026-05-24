import { type ElicitGraphState, type SubProblemState } from '@/agents/schemas/ElicitGraphStateSchema';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

export function createMockState(overrides: Partial<ElicitGraphState>): ElicitGraphState {
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

export function makeSubProblem(overrides: Partial<SubProblemState> = {}): SubProblemState {
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
