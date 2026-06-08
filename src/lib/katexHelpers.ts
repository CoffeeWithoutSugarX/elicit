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
    // KaTeX API 仅接受色值字符串，此处须与 globals.css 的 --color-destructive 保持人工同步
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

/**
 * 将 LaTeX 的 \(...\) / \[...\] 分隔符归一化为 remark-math 能识别的 $...$ / $$...$$。
 * 宽容解析原则（Postel 法则）：在渲染层做一次性转换，覆盖 user 气泡、Sidebar 标题等所有路径。
 *
 * 注意：JS String.replace 的替换串中 $ 是特殊字符（如 $& 表示整个匹配、$$ 表示字面 $），
 * 必须用函数式 replacer 避免意外展开。
 */
export function normalizeLatexDelimiters(text: string): string {
  if (!text) return text
  // 先替换块级 \[...\]（允许跨行），再替换行内 \(...\)，顺序不能颠倒
  let result = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, inner: string) => `$$${inner}$$`)
  result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, inner: string) => `$${inner}$`)
  return result
}

export function parseLatexSegments(text: string): TextSegment[] {
  // 入口先归一化，\(...\) / \[...\] 统一转为 $...$ / $$...$$
  text = normalizeLatexDelimiters(text)
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
