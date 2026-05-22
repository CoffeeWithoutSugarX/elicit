/**
 * KaTeX 行内 / 块级渲染组件。
 * ref + useLayoutEffect 注入 KaTeX 产出的受控 HTML（来源 KaTeX 库，非用户原始输入）。
 * KaTeX CSS 由 index.html 引入。
 */
import { useLayoutEffect, useMemo, useRef } from 'react'
import { renderTexToString } from '@/lib/katexHelpers'
import { cn } from '@/lib/classNames'

interface Props {
  tex: string
  display?: 'inline' | 'block'
}

// 将 KaTeX HTML 挂载到 DOM 节点（KaTeX 产出受控，与用户输入已隔离）
function mountKatex(el: HTMLElement | null, html: string) {
  if (el) {
    // 注：此处 html 来自 katex.renderToString，非用户原始输入
    el.innerHTML = html // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

export function LatexRender({ tex, display = 'inline' }: Props) {
  const blockRef = useRef<HTMLDivElement>(null)
  const inlineRef = useRef<HTMLSpanElement>(null)

  const html = useMemo(() => renderTexToString(tex, display === 'block'), [tex, display])

  useLayoutEffect(() => {
    const el = display === 'block' ? blockRef.current : inlineRef.current
    mountKatex(el, html)
  }, [html, display])

  if (display === 'block') {
    return (
      <div className="my-2 overflow-x-auto">
        <div ref={blockRef} />
      </div>
    )
  }

  return <span ref={inlineRef} className={cn('inline')} />
}
