import { describe, it, expect, vi } from 'vitest';

// ——— mock ConversationMapper（含 server-only 导入，阻止测试加载失败）———
vi.mock('@/db/mappers/ConversationMapper', () => ({
  conversationMapper: { update: vi.fn(), findById: vi.fn() },
}));

import { phaseRouter } from '@/agents/nodes/flow/phaseRouter';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

describe('phaseRouter', () => {
  it('PolyaPhase.UNDERSTAND → "understandNode"', () => {
    expect(phaseRouter(PolyaPhase.UNDERSTAND)).toBe('understandNode');
  });

  it('PolyaPhase.PLAN → "planNode"', () => {
    expect(phaseRouter(PolyaPhase.PLAN)).toBe('planNode');
  });

  it('PolyaPhase.EXECUTE → "executeNode"', () => {
    expect(phaseRouter(PolyaPhase.EXECUTE)).toBe('executeNode');
  });

  it('PolyaPhase.REVIEW → "reviewNode"', () => {
    expect(phaseRouter(PolyaPhase.REVIEW)).toBe('reviewNode');
  });

  it('PolyaPhase.DONE（未知阶段）→ 兜底返回 "understandNode"', () => {
    expect(phaseRouter(PolyaPhase.DONE)).toBe('understandNode');
  });

  it('未知数值 99 → 兜底返回 "understandNode"', () => {
    expect(phaseRouter(99)).toBe('understandNode');
  });
});
