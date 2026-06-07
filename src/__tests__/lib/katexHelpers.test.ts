import { describe, it, expect, vi } from 'vitest';

// Mock katex to avoid real rendering in node environment
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((tex: string, opts: Record<string, unknown>) => {
      return `<span class="katex">${opts.displayMode ? 'block' : 'inline'}:${tex}</span>`;
    }),
  },
}));

import { parseLatexSegments, renderTexToString, normalizeLatexDelimiters, type TextSegment } from '@/lib/katexHelpers';

describe('renderTexToString', () => {
  it('行内模式 → 调用 katex.renderToString 且 displayMode=false', () => {
    const result = renderTexToString('x^2', false);
    expect(result).toContain('inline:x^2');
    expect(result).toContain('katex');
  });

  it('块级模式 → 调用 katex.renderToString 且 displayMode=true', () => {
    const result = renderTexToString('\\frac{1}{2}', true);
    expect(result).toContain('block:\\frac{1}{2}');
  });
});

describe('parseLatexSegments', () => {
  it('纯文本（无 LaTeX）→ 返回单个 text segment', () => {
    const result = parseLatexSegments('Hello world');
    expect(result).toEqual<TextSegment[]>([
      { type: 'text', content: 'Hello world' },
    ]);
  });

  it('空字符串 → 返回空数组', () => {
    const result = parseLatexSegments('');
    expect(result).toEqual([]);
  });

  it('行内 $...$ → 正确切分为 text + latex-inline + text', () => {
    const result = parseLatexSegments('面积公式 $S = \\pi r^2$ 成立');
    expect(result).toEqual<TextSegment[]>([
      { type: 'text', content: '面积公式 ' },
      { type: 'latex-inline', content: 'S = \\pi r^2' },
      { type: 'text', content: ' 成立' },
    ]);
  });

  it('块级 $$...$$ → 正确切分为 latex-block', () => {
    const result = parseLatexSegments('$$E = mc^2$$');
    expect(result).toEqual<TextSegment[]>([
      { type: 'latex-block', content: 'E = mc^2' },
    ]);
  });

  it('块级 $$...$$ 前后有文本 → 三 segment', () => {
    const result = parseLatexSegments('结论：$$a^2+b^2=c^2$$ 勾股定理');
    expect(result).toEqual<TextSegment[]>([
      { type: 'text', content: '结论：' },
      { type: 'latex-block', content: 'a^2+b^2=c^2' },
      { type: 'text', content: ' 勾股定理' },
    ]);
  });

  it('多个行内 LaTeX → 各自成独立 latex-inline segment', () => {
    const result = parseLatexSegments('$a$ 加 $b$ 等于 $c$');
    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ type: 'latex-inline', content: 'a' });
    expect(result[1]).toEqual({ type: 'text', content: ' 加 ' });
    expect(result[2]).toEqual({ type: 'latex-inline', content: 'b' });
    expect(result[3]).toEqual({ type: 'text', content: ' 等于 ' });
    expect(result[4]).toEqual({ type: 'latex-inline', content: 'c' });
  });

  it('混合 $...$ 和 $$...$$ → $$...$$ 优先匹配', () => {
    const result = parseLatexSegments('inline $x$ and block $$y$$');
    const types = result.map(s => s.type);
    expect(types).toContain('latex-inline');
    expect(types).toContain('latex-block');
  });

  it('未闭合的 $ → 不产生 latex-inline segment', () => {
    // 未闭合 $ 不会被正则匹配，原样保留为 text
    const result = parseLatexSegments('未闭合 $abc');
    // 整串是 text，没有 latex-inline
    expect(result.every(s => s.type === 'text')).toBe(true);
    expect(result.map(s => s.content).join('')).toBe('未闭合 $abc');
  });

  it('只有 $...$ 没有前后文本 → 只有 latex-inline', () => {
    const result = parseLatexSegments('$x+1$');
    expect(result).toEqual<TextSegment[]>([
      { type: 'latex-inline', content: 'x+1' },
    ]);
  });

  it('对 \\(AO \\perp BC\\) 输入能切出 latex-inline segment', () => {
    // normalizeLatexDelimiters 会在入口把 \(...\) 转为 $...$，所以能正确切分
    const result = parseLatexSegments('\\(AO \\perp BC\\)');
    const inlineSegments = result.filter(s => s.type === 'latex-inline');
    expect(inlineSegments.length).toBeGreaterThanOrEqual(1);
    expect(inlineSegments[0].content).toBe('AO \\perp BC');
  });
});

describe('normalizeLatexDelimiters', () => {
  it('行内 \\(...\\) → 转换为 $...$', () => {
    expect(normalizeLatexDelimiters('\\(AO \\perp BC\\)')).toBe('$AO \\perp BC$');
  });

  it('块级 \\[...\\] → 转换为 $$...$$', () => {
    expect(normalizeLatexDelimiters('\\[E = mc^2\\]')).toBe('$$E = mc^2$$');
  });

  it('混合文本：部分 \\(...\\) 部分普通文本', () => {
    expect(normalizeLatexDelimiters('如果 \\(x > 0\\) 成立')).toBe('如果 $x > 0$ 成立');
  });

  it('已是 $...$ 的内容保持不变', () => {
    expect(normalizeLatexDelimiters('$x^2$')).toBe('$x^2$');
  });

  it('纯文本无数学内容 → 原样返回', () => {
    expect(normalizeLatexDelimiters('Hello world')).toBe('Hello world');
  });

  it('真实回归样例：DB 原文含多处 \\(...\\)', () => {
    const input = '如果我们要证明 \\(AO \\perp BC\\)，你觉得 \\(AO\\) 需要先成为等腰三角形 \\(ABC\\) 的哪条线';
    const result = normalizeLatexDelimiters(input);
    expect(result).toContain('$AO \\perp BC$');
  });

  it('空字符串 → 返回空字符串', () => {
    expect(normalizeLatexDelimiters('')).toBe('');
  });

  it('跨行块级 \\[...\\] → 正确转换', () => {
    const input = '\\[\na + b\n= c\n\\]';
    expect(normalizeLatexDelimiters(input)).toBe('$$\na + b\n= c\n$$');
  });
});
