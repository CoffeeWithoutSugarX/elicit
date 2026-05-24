import { readFileSync } from 'fs';
import { join }         from 'path';

import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import { PolyaPhase }            from '@/types/enums/polyaPhase.enum';

// ---------- 关键词加载 ----------
const _stuckJson = JSON.parse(
  readFileSync(join(__dirname, '../../data/stuck-keywords.json'), 'utf-8'),
) as { keywords: string[] };
const STUCK_KEYWORDS: ReadonlyArray<string> = _stuckJson.keywords;

// ---------- 类型 ----------
export type StuckAction =
  | { kind: 'PROBE_5Q';         nextQuestionId: 1 | 2 | 3 | 4 | 5; injectPrompt: string }
  | { kind: 'KNOWLEDGE_FALLBACK'; injectPrompt: string };

// ---------- 辅助：PolyaPhase 数值 → stuckCountPerPhase 键名 ----------
const PHASE_KEY_MAP: Record<number, keyof ElicitGraphState['subProblems'][number]['stuckCountPerPhase']> = {
  [PolyaPhase.UNDERSTAND]: 'understand',
  [PolyaPhase.PLAN]:       'plan',
  [PolyaPhase.EXECUTE]:    'execute',
  [PolyaPhase.REVIEW]:     'review',
};

/**
 * 纯函数 guard — 判断当前子问题在当前阶段是否触发"卡住"保护。
 * 无 I/O、无副作用。
 *
 * @returns StuckAction（需要干预）或 null（继续正常流程）
 */
export function stuckGuard(state: ElicitGraphState): StuckAction | null {
  // 边界：子问题列表未初始化
  if (state.subProblems.length === 0) return null;

  const subProblem = state.subProblems[state.currentSubProblemIndex];
  if (!subProblem) return null;

  const phaseKey = PHASE_KEY_MAP[state.currentPhase];
  if (!phaseKey) return null;

  const stuckCount = subProblem.stuckCountPerPhase[phaseKey];

  // 卡住次数未达阈值
  if (stuckCount < 3) return null;

  // 检查近 6 条消息是否命中卡住关键词
  const recentMessages = state.messages.slice(-6);
  const recentUserTexts = recentMessages
    .filter(m => m.getType() === 'human')
    .map(m => (typeof m.content === 'string' ? m.content : ''));

  const hasStuckKeyword = recentUserTexts.some(text =>
    STUCK_KEYWORDS.some(kw => text.includes(kw)),
  );

  if (!hasStuckKeyword) return null;

  // B4 跨子问题规则：≥2 个子问题已 blocked + 当前 stuckCount ≥ 3 → 直接 KNOWLEDGE_FALLBACK
  const blockedCount = state.subProblems.filter(sp => sp.status === 'blocked').length;
  if (blockedCount >= 2) {
    return {
      kind:         'KNOWLEDGE_FALLBACK',
      injectPrompt: '[系统提示] 5 问已用尽仍未推进。请按 PRD §8.4.2 收尾话术给出知识点提示，禁止给数值答案。',
    };
  }

  const usedIds    = subProblem.probedQuestionIdsPerPhase[phaseKey] as number[];
  const allIds     = [1, 2, 3, 4, 5] as const;
  const unusedIds  = allIds.filter(id => !usedIds.includes(id));

  if (unusedIds.length > 0) {
    const nextId = unusedIds[0];
    return {
      kind:           'PROBE_5Q',
      nextQuestionId: nextId,
      injectPrompt:   `[系统提示] 妹妹同阶段已 3 轮无推进。请按 5 问探路第 ${nextId} 问反问她。`,
    };
  }

  // 5 问全部用尽
  return {
    kind:         'KNOWLEDGE_FALLBACK',
    injectPrompt: '[系统提示] 5 问已用尽仍未推进。请按 PRD §8.4.2 收尾话术给出知识点提示，禁止给数值答案。',
  };
}
