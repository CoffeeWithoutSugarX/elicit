import { readFileSync } from 'fs';
import { join }         from 'path';

import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';

// ---------- 关键词加载 ----------
const _outOfScopeJson = JSON.parse(
  readFileSync(join(process.cwd(), 'src/agents/data/out-of-scope-keywords.json'), 'utf-8'),
) as { nonMathSubjects: string[] };

const NON_MATH_SUBJECTS: ReadonlyArray<string> = _outOfScopeJson.nonMathSubjects;

/**
 * 纯函数 guard — 判断当前题目是否超出「初中数学」范围。
 * 无 I/O、无副作用。
 *
 * @returns true 表示超出范围，节点应终止并给出范围外提示；false 表示在范围内
 */
export function outOfScopeGuard(state: ElicitGraphState): boolean {
  // 优先信任 OCR 解析结果中的 subject 字段
  if (state.ocrResult && 'subject' in state.ocrResult && state.ocrResult.subject !== 'math') {
    return true;
  }

  // OCR 结果缺失时，退化为关键词匹配最近一条用户消息
  const lastUserMsg = [...state.messages]
    .reverse()
    .find(m => m.getType() === 'human');

  if (!lastUserMsg) return false;

  const text = typeof lastUserMsg.content === 'string' ? lastUserMsg.content : '';
  if (!text.trim()) return false;

  return NON_MATH_SUBJECTS.some(kw => text.includes(kw));
}
