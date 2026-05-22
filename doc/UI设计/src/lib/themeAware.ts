/**
 * 主题感知工具函数。
 * 根据当前主题决定题号格式：
 *   notebook / notebook-pro / dark-scholar → 罗马数字
 *   minimal / warm-ai → 阿拉伯数字
 */
import { toRoman } from './numerals'
import type { ThemeKey } from '@/styles/theme'

/** 罗马数字主题集合 */
const ROMAN_THEMES: ReadonlySet<ThemeKey> = new Set([
  'notebook',
  'notebook-pro',
  'dark-scholar',
])

/**
 * 根据主题返回题号标签。
 * @param i     题目索引（从 0 开始）
 * @param theme 当前主题 key
 */
export function getQuestionLabel(i: number, theme: ThemeKey): string {
  if (ROMAN_THEMES.has(theme)) {
    return toRoman(i + 1)
  }
  return String(i + 1)
}
