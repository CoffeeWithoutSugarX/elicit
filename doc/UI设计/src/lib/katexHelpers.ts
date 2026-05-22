/**
 * KaTeX 渲染帮助函数。
 * 返回 HTML 字符串，供调用方通过 DOM 注入（避免 XSS：只在受控 ref.innerHTML 场景使用）。
 */
import katex from 'katex'

/**
 * 将 TeX 字符串渲染为 HTML 字符串。
 * @param tex     TeX 源码（不含 $ 分隔符）
 * @param displayMode true = 块级居中，false = 行内
 */
export function renderTexToString(tex: string, displayMode: boolean): string {
  return katex.renderToString(tex, {
    displayMode,
    throwOnError: false,
    errorColor: '#dc2626',
    output: 'html',
  })
}

/**
 * 将含 $...$ / $$...$$ 的混合文本切分为 segments。
 * 每个 segment 含 text 和是否为 LaTeX 的标记。
 */
export interface TextSegment {
  type: 'text' | 'latex-inline' | 'latex-block'
  content: string
}

export function parseLatexSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  // 先匹配 $$...$$（块级），再匹配 $...$（行内）
  const re = /\$\$([^$]+?)\$\$|\$([^$\n]+?)\$/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    // 把 match 前的普通文本加进来
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }

    if (match[1] !== undefined) {
      // $$...$$ 块级
      segments.push({ type: 'latex-block', content: match[1] })
    } else if (match[2] !== undefined) {
      // $...$ 行内
      segments.push({ type: 'latex-inline', content: match[2] })
    }

    lastIndex = match.index + match[0].length
  }

  // 尾部剩余普通文本
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return segments
}
