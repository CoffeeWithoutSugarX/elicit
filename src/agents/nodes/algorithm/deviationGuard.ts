import { readFileSync } from 'fs';
import { join }         from 'path';

import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import { PolyaPhase, PolyaPhaseEnum } from '@/types/enums/polyaPhase.enum';

// ---------- 关键词加载 ----------
const _deviationJson = JSON.parse(
  readFileSync(join(process.cwd(), 'src/agents/data/deviation-keywords.json'), 'utf-8'),
) as {
  giveAnswer:          string[];
  offTopic:            string[];
  crossPhasePatterns:  string[];
};

const GIVE_ANSWER_KEYWORDS:   ReadonlyArray<string> = _deviationJson.giveAnswer;
const OFF_TOPIC_KEYWORDS:     ReadonlyArray<string> = _deviationJson.offTopic;
const CROSS_PHASE_PATTERNS:   ReadonlyArray<RegExp> = _deviationJson.crossPhasePatterns.map(p => new RegExp(p));

// ---------- 类型 ----------
export type DeviationAction =
  | { kind: 'PULL_BACK'; injectPrompt: string; pulledFromPhase: number };

/**
 * 纯函数 guard — 判断最近用户消息是否偏离引导路径。
 * 无 I/O、无副作用。
 *
 * @returns DeviationAction（需要拉回）或 null（正常）
 */
export function deviationGuard(state: ElicitGraphState): DeviationAction | null {
  // 取最后一条用户消息
  const lastUserMsg = [...state.messages]
    .reverse()
    .find(m => m.getType() === 'human');

  if (!lastUserMsg) return null;

  const text = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '';
  if (!text.trim()) return null;

  // 冷却期：上次偏离后未满 2 轮，不重复触发
  if (
    state.lastDeviationAt !== null &&
    state.messages.length - state.lastDeviationAt < 2
  ) {
    return null;
  }

  const phase = state.currentPhase;

  // 检查 offTopic（任何阶段均触发）
  const isOffTopic = OFF_TOPIC_KEYWORDS.some(kw => text.includes(kw));
  if (isOffTopic) {
    const phaseLabel = PolyaPhaseEnum.getLabel(phase);
    return {
      kind:           'PULL_BACK',
      injectPrompt:   `[系统提示] 同学似乎跑题了。请温和地把话题拉回到当前「${phaseLabel}」阶段的数学题。`,
      pulledFromPhase: phase,
    };
  }

  // 检查 giveAnswer — 仅在 UNDERSTAND(0) 和 PLAN(1) 阶段触发
  if (phase === PolyaPhase.UNDERSTAND || phase === PolyaPhase.PLAN) {
    const isGivingAnswer = GIVE_ANSWER_KEYWORDS.some(kw => text.includes(kw));
    if (isGivingAnswer) {
      const phaseLabel = PolyaPhaseEnum.getLabel(phase);
      return {
        kind:           'PULL_BACK',
        injectPrompt:   `[系统提示] 同学试图直接给出答案。请提醒她先完成「${phaseLabel}」阶段，引导她自己思考。`,
        pulledFromPhase: phase,
      };
    }
  }

  // 检查 crossPhasePatterns（任何阶段均触发，防止直接列算式跳过思考）
  const isCrossPhase = CROSS_PHASE_PATTERNS.some(re => re.test(text));
  if (isCrossPhase) {
    const phaseLabel = PolyaPhaseEnum.getLabel(phase);
    return {
      kind:           'PULL_BACK',
      injectPrompt:   `[系统提示] 同学似乎跳过了当前「${phaseLabel}」阶段直接计算。请引导她先完成本阶段再推进。`,
      pulledFromPhase: phase,
    };
  }

  return null;
}
