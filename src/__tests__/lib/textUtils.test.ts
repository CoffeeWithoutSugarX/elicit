import { describe, it, expect } from 'vitest';
import { unescapeLiteralNewlines } from '@/lib/textUtils';

describe('unescapeLiteralNewlines', () => {
  it('把字面 \\n（反斜杠+n 两字符）替换为真实换行符', () => {
    // 模型输出的字符串中含字面 \n，不是真实换行
    const input = '(1) = a^2 − 1；\\n+ a + 1) = ...';
    const result = unescapeLiteralNewlines(input);
    expect(result).toBe('(1) = a^2 − 1；\n+ a + 1) = ...');
    expect(result).toContain('\n');
    expect(result).not.toContain('\\n');
  });

  it('真实换行符（\\n 字符）不受影响，原样保留', () => {
    // 已经是真实换行的字符串不应被二次处理
    const input = '第一行\n第二行';
    const result = unescapeLiteralNewlines(input);
    expect(result).toBe('第一行\n第二行');
  });

  it('不含 \\n 的字符串原样返回', () => {
    const input = '已知方程 $x^2 - 4x + m = 0$ 有两个实数根，求 $m$ 的取值范围。';
    const result = unescapeLiteralNewlines(input);
    expect(result).toBe(input);
  });

  it('多处字面 \\n 全部替换', () => {
    const input = 'line1\\nline2\\nline3';
    const result = unescapeLiteralNewlines(input);
    expect(result).toBe('line1\nline2\nline3');
    expect(result.split('\n')).toHaveLength(3);
  });
});
