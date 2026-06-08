import { describe, it, expect } from 'vitest';
import { visionFailureGuard } from '@/agents/nodes/algorithm/visionFailureGuard';
import { createMockState } from '@/__tests__/helpers/mockState';

describe('visionFailureGuard', () => {
  it('无 ocrResult → 返回 false', () => {
    const state = createMockState({ ocrResult: undefined });
    expect(visionFailureGuard(state)).toBe(false);
  });

  it('ocrResult.isSolvable=true → 返回 false（解析成功）', () => {
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
    expect(visionFailureGuard(state)).toBe(false);
  });

  it('ocrResult.isSolvable=false + errorReason="BLURRY" → 返回 true', () => {
    const state = createMockState({
      ocrResult: {
        isSolvable: false,
        subject: 'math',
        questions: [],
        errorReason: 'BLURRY',
      },
    });
    expect(visionFailureGuard(state)).toBe(true);
  });

  it('ocrResult.isSolvable=false + errorReason="TIMEOUT" → 返回 true', () => {
    const state = createMockState({
      ocrResult: {
        isSolvable: false,
        subject: 'math',
        questions: [],
        errorReason: 'TIMEOUT',
      },
    });
    expect(visionFailureGuard(state)).toBe(true);
  });

  it('ocrResult.isSolvable=false + errorReason="PARSE_FAIL" → 返回 true', () => {
    const state = createMockState({
      ocrResult: {
        isSolvable: false,
        subject: 'math',
        questions: [],
        errorReason: 'PARSE_FAIL',
      },
    });
    expect(visionFailureGuard(state)).toBe(true);
  });

  it('ocrResult.isSolvable=false + errorReason="INCOMPLETE" → 返回 true', () => {
    const state = createMockState({
      ocrResult: {
        isSolvable: false,
        subject: 'math',
        questions: [],
        errorReason: 'INCOMPLETE',
      },
    });
    expect(visionFailureGuard(state)).toBe(true);
  });
});
