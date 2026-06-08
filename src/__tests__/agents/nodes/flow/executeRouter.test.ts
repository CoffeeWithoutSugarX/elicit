import { describe, it, expect, vi } from 'vitest';

// ——— 阻止 server-only 校验（ReviewNode 现已直接导入 server-only）———
vi.mock('server-only', () => ({}));

// ——— mock ConversationMapper（含 server-only 导入，阻止测试加载失败）———
vi.mock('@/db/mappers/ConversationMapper', () => ({
  conversationMapper: { update: vi.fn(), findById: vi.fn() },
}));

// ——— mock @langchain/langgraph（仅需 END 常量，避免 PostgresSaver 等重依赖）———
vi.mock('@langchain/langgraph', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@langchain/langgraph')>();
  return { ...actual };
});

import { END } from '@langchain/langgraph';
import { executeRouter } from '@/agents/nodes/flow/executeRouter';
import { createMockState, makeSubProblem } from '@/__tests__/helpers/mockState';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

describe('executeRouter', () => {
  // ── STAY → END ────────────────────────────────────────────────────────────

  it('STAY 场景：currentPhase=EXECUTE，小问 pending → 返回 END', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.EXECUTE,
      subProblems: [makeSubProblem({ status: 'pending' })],
      currentSubProblemIndex: 0,
    });
    expect(executeRouter(state)).toBe(END);
  });

  it('subProblems 为空时 → 返回 END（无小问可路由）', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.EXECUTE,
      subProblems: [],
      currentSubProblemIndex: 0,
    });
    expect(executeRouter(state)).toBe(END);
  });

  // ── ESCALATE → planNode ───────────────────────────────────────────────────

  it('ESCALATE 场景：currentPhase=PLAN → 返回 "planNode"', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.PLAN,
      subProblems: [makeSubProblem({ status: 'pending' })],
      currentSubProblemIndex: 0,
    });
    expect(executeRouter(state)).toBe('planNode');
  });

  // ── SUB_PROBLEM_DONE / PROBLEM_BLOCKED + 后续 pending → understandNode ───

  it('小问 done + currentPhase=UNDERSTAND（已推进到下一子问）→ 返回 "understandNode"', () => {
    // ExecuteNode 推进了 currentSubProblemIndex 并设 currentPhase=UNDERSTAND
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      subProblems: [
        makeSubProblem({ index: 0, status: 'done' }),
        makeSubProblem({ index: 1, status: 'pending' }),
      ],
      currentSubProblemIndex: 1, // 已推进到下一子问
    });
    expect(executeRouter(state)).toBe('understandNode');
  });

  it('小问 blocked + currentPhase=UNDERSTAND → 返回 "understandNode"', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      subProblems: [
        makeSubProblem({ index: 0, status: 'blocked' }),
        makeSubProblem({ index: 1, status: 'pending' }),
      ],
      currentSubProblemIndex: 1,
    });
    expect(executeRouter(state)).toBe('understandNode');
  });

  // ── 最后一个子问题完成，无更多 pending → reviewNode ─────────────────────

  it('最后一个小问 done，无后续 pending → 返回 "reviewNode"', () => {
    // ExecuteNode 未推进 index（无 pending 可推），currentPhase 仍 EXECUTE
    const state = createMockState({
      currentPhase: PolyaPhase.EXECUTE,
      subProblems: [
        makeSubProblem({ index: 0, status: 'done' }),
      ],
      currentSubProblemIndex: 0,
    });
    expect(executeRouter(state)).toBe('reviewNode');
  });

  it('最后一个小问 blocked，无后续 pending → 返回 "reviewNode"', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.EXECUTE,
      subProblems: [
        makeSubProblem({ index: 0, status: 'done' }),
        makeSubProblem({ index: 1, status: 'blocked' }),
      ],
      currentSubProblemIndex: 1,
    });
    expect(executeRouter(state)).toBe('reviewNode');
  });

  it('多子问题全部 done → 返回 "reviewNode"', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.EXECUTE,
      subProblems: [
        makeSubProblem({ index: 0, status: 'done' }),
        makeSubProblem({ index: 1, status: 'done' }),
      ],
      currentSubProblemIndex: 1,
    });
    expect(executeRouter(state)).toBe('reviewNode');
  });

  // ── 3 子问题混合场景：第二个 done，推进到第三个 ───────────────────────────

  it('3 子问题：第一个 done，第二个 pending，第三个 pending → understandNode（推进到 index=1）', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,  // ExecuteNode 已将 index 推到 1 并重置 phase
      subProblems: [
        makeSubProblem({ index: 0, status: 'done' }),
        makeSubProblem({ index: 1, status: 'pending' }),
        makeSubProblem({ index: 2, status: 'pending' }),
      ],
      currentSubProblemIndex: 1,
    });
    expect(executeRouter(state)).toBe('understandNode');
  });
});
