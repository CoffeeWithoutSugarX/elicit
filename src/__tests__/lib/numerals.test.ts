import { describe, it, expect } from 'vitest';
import { toRoman } from '@/lib/numerals';

/**
 * toRoman 的 ROMAN_MAP 仅含 1-10（X） 的条目。
 * 注释明确说明"仅保证 1~10 正确（UI 场景够用）"。
 * 因此只测试 1~10 范围内的正确性，以及边界值行为。
 */
describe('toRoman — 支持范围 1~10', () => {
  it('1 → I', () => expect(toRoman(1)).toBe('I'));
  it('2 → II', () => expect(toRoman(2)).toBe('II'));
  it('3 → III', () => expect(toRoman(3)).toBe('III'));
  it('4 → IV', () => expect(toRoman(4)).toBe('IV'));
  it('5 → V', () => expect(toRoman(5)).toBe('V'));
  it('6 → VI', () => expect(toRoman(6)).toBe('VI'));
  it('7 → VII', () => expect(toRoman(7)).toBe('VII'));
  it('8 → VIII', () => expect(toRoman(8)).toBe('VIII'));
  it('9 → IX', () => expect(toRoman(9)).toBe('IX'));
  it('10 → X', () => expect(toRoman(10)).toBe('X'));
});

describe('toRoman — 边界值行为', () => {
  // 0 < 1 → 超出下界，直接 String(n)
  it('0 → "0"（小于下界 1）', () => expect(toRoman(0)).toBe('0'));

  // 负数 → 超出下界
  it('-1 → "-1"（负数）', () => expect(toRoman(-1)).toBe('-1'));

  // 4000 > 3999 → 超出上界，直接 String(n)
  it('4000 → "4000"（超出上界 3999）', () => expect(toRoman(4000)).toBe('4000'));

  // 3999 在上界内 → 走算法（ROMAN_MAP 只有到 X，不含标准 CD/CM 等）
  // 实际结果是用 X 重复 399 次然后跟 IX，但这超出设计范围；
  // 只验证函数不抛出异常且返回字符串
  it('3999（上界值）→ 返回非空字符串（不抛出）', () => {
    const result = toRoman(3999);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('11 → 返回字符串（不抛出，尽管超出 1-10 保证范围）', () => {
    // 算法会用 X+I 计算，得 'XI'（10+1），但这只是算法副作用
    const result = toRoman(11);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
