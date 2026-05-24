import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';

/**
 * 纯函数 guard — 判断 OCR / 视觉解析是否失败，无法继续引导流程。
 * 无 I/O、无副作用。
 *
 * @returns true 表示视觉解析失败，节点应给出无法识别图片的提示；false 表示正常
 */
export function visionFailureGuard(state: ElicitGraphState): boolean {
  if (!state.ocrResult) return false;
  if (!state.ocrResult.isSolvable && state.ocrResult.errorReason) return true;
  return false;
}
