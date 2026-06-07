/**
 * 罗马数字工具 — 支持 1~10（题号 / 小问编号场景）
 */

const ROMAN_MAP: readonly [number, string][] = [
  [10, 'X'],
  [9,  'IX'],
  [8,  'VIII'],
  [7,  'VII'],
  [6,  'VI'],
  [5,  'V'],
  [4,  'IV'],
  [3,  'III'],
  [2,  'II'],
  [1,  'I'],
]

/**
 * 将正整数转为罗马数字字符串。
 * 1~3999 均正确；当前 UI 场景最大为 10。
 */
export function toRoman(n: number): string {
  if (n < 1 || n > 3999) return String(n)
  let result = ''
  let remaining = n
  for (const [value, numeral] of ROMAN_MAP) {
    while (remaining >= value) {
      result += numeral
      remaining -= value
    }
  }
  return result
}
