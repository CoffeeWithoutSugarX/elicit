import { describe, it, expect, vi } from 'vitest';

// Mock katex to avoid real rendering in node environment
vi.mock('katex', () => ({
  default: {
    renderToString: vi.fn((tex: string, opts: Record<string, unknown>) => {
      return `<span class="katex">${opts.displayMode ? 'block' : 'inline'}:${tex}</span>`;
    }),
  },
}));

import { parseLatexSegments, renderTexToString, type TextSegment } from '@/lib/katexHelpers';

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
});
