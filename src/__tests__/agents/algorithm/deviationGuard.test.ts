import { describe, it, expect } from 'vitest';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { deviationGuard } from '@/agents/nodes/algorithm/deviationGuard';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { createMockState } from '@/__tests__/helpers/mockState';

describe('deviationGuard', () => {
  // ── giveAnswer 检测（仅 UNDERSTAND / PLAN 阶段触发）──────────

  it('UNDERSTAND 阶段用户说"答案是 5" → PULL_BACK', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      messages: [new HumanMessage('答案是 5')],
    });
    const action = deviationGuard(state);
    expect(action?.kind).toBe('PULL_BACK');
  });

  it('EXECUTE 阶段用户说"答案是 5" → null（该阶段不触发 giveAnswer）', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.EXECUTE,
      messages: [new HumanMessage('答案是 5')],
    });
    // EXECUTE 阶段不检查 giveAnswer；但"答案是"也不是 offTopic 关键词
    // 注意："= " 是 crossPhasePattern，"答案是 5" 含有中文，不含 "= "，所以应返回 null
    // 实际关键词："答案是" 在 giveAnswer 列表中，不在 offTopic 中
    expect(deviationGuard(state)).toBeNull();
  });

  // ── offTopic 检测（任意阶段触发）─────────────────────────────

  it('用户说"今天天气怎么样" → PULL_BACK（OFF_TOPIC）', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      messages: [new HumanMessage('今天天气怎么样')],
    });
    const action = deviationGuard(state);
    expect(action?.kind).toBe('PULL_BACK');
  });

  // ── 冷却期：距上次偏离 < 2 条消息时不重复触发 ────────────────

  it('冷却期内（lastDeviationAt 是最近 1 条）→ 返回 null', () => {
    const messages = [
      new AIMessage('请回到数学题。'),
      new HumanMessage('答案是 5'),
    ];
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      // messages.length = 2，lastDeviationAt = 1 → 2 - 1 = 1 < 2，冷却中
      lastDeviationAt: 1,
      messages,
    });
    expect(deviationGuard(state)).toBeNull();
  });

  // ── crossPhasePatterns 检测（仅 UNDERSTAND / PLAN 阶段触发）────

  it('UNDERSTAND 阶段用户输入"3+5=8"(crossPhase) → PULL_BACK', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      messages: [new HumanMessage('3+5=8')],
    });
    const action = deviationGuard(state);
    expect(action?.kind).toBe('PULL_BACK');
  });

  it('EXECUTE 阶段用户输入"x=3"(crossPhase) → null（该阶段不触发 crossPhase）', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.EXECUTE,
      messages: [new HumanMessage('x=3')],
    });
    expect(deviationGuard(state)).toBeNull();
  });

  // ── 正常数学回复不触发 ────────────────────────────────────────

  it('正常数学思考回复 → 返回 null', () => {
    const state = createMockState({
      currentPhase: PolyaPhase.UNDERSTAND,
      messages: [new HumanMessage('这道题需要找已知条件和未知数')],
    });
    expect(deviationGuard(state)).toBeNull();
  });
});
