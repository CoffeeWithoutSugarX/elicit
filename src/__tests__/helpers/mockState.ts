import { type ElicitGraphState, type SubProblemState } from '@/agents/schemas/ElicitGraphStateSchema';
import type { OcrResult } from '@/agents/schemas/OcrSchema';
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

/**
 * 构建单道可解题目的 ocrResult fixture。
 * 支持 overrides 覆盖常用字段，其余使用固定默认值（一元二次方程场景）。
 */
export function makeSolvableOcrResult(overrides: Partial<{
  topic: string;
  latexFull: string;
  goal: string;
  visualFeaturesNeeded: boolean;
  visualDescription: string;
}> = {}): OcrResult {
  return {
    isSolvable: true,
    subject: 'math',
    grade: '初中',
    questions: [
      {
        index: 0,
        topic: overrides.topic ?? '一元二次方程',
        latexFull: overrides.latexFull ?? '解方程 $x^2 - 4x + 3 = 0$',
        givenConditions: ['$x^2 - 4x + 3 = 0$'],
        implicitConditions: [],
        goal: overrides.goal ?? '求 x 的值',
        milestones: ['分解因式', '求根'],
        visualFeaturesNeeded: overrides.visualFeaturesNeeded ?? false,
        visualDescription: overrides.visualDescription ?? '',
        subProblems: [
          {
            index: 0,
            goal: '求 x 的值',
            givenConditions: ['$x^2 - 4x + 3 = 0$'],
            milestones: ['分解因式', '求根'],
          },
        ],
      },
    ],
    isMulti: false,
    visualFeaturesNeeded: false,
    errorReason: null,
    selectedQuestionIndex: 0,
  };
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
    probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
    ...overrides,
  };
}
