import { readFileSync } from 'fs';
import { join }         from 'path';

import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import { PolyaPhase, PolyaPhaseEnum } from '@/types/enums/polyaPhase.enum';

// ---------- 关键词加载 ----------
const _deviationJson = JSON.parse(
  readFileSync(join(process.cwd(), 'src', 'agents', 'data', 'deviation-keywords.json'), 'utf-8'),
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
      injectPrompt:   `[系统提示] 这个我们等会再聊，先把这题搞定？你刚才在【${phaseLabel}】这一步。`,
      pulledFromPhase: phase,
    };
  }

  // 检查 giveAnswer 与 crossPhasePatterns — 仅在 UNDERSTAND(0) 和 PLAN(1) 阶段触发
  // SIM-04：isGivingAnswer / isCrossPhase 两分支的 return 块完全相同，合并为单个 if。
  // 详设 §5.4：CROSS_PHASE = 当前 currentPhase ≤ PLAN 但 user 给出 EXECUTE 阶段才该有的内容
  // 在 EXECUTE/REVIEW 阶段，用户输入算式属于正常行为，不应拦截
  if (phase === PolyaPhase.UNDERSTAND || phase === PolyaPhase.PLAN) {
    const isGivingAnswer = GIVE_ANSWER_KEYWORDS.some(kw => text.includes(kw));
    const isCrossPhase = CROSS_PHASE_PATTERNS.some(re => re.test(text));
    if (isGivingAnswer || isCrossPhase) {
      const phaseLabel = PolyaPhaseEnum.getLabel(phase);
      const snippet = text.slice(0, 20);
      return {
        kind:           'PULL_BACK',
        injectPrompt:   `[系统提示] 等等，我们先停一下。我们刚才在【${phaseLabel}】这一步，你刚才说的【${snippet}】是怎么想到的？`,
        pulledFromPhase: phase,
      };
    }
  }

  return null;
}
