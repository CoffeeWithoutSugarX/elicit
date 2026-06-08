'use client'

/**
 * renderMixed — 渲染含 LaTeX 的混合文本。
 *
 * 流程：parseLatexSegments 切分文本段 → 逐段渲染：
 *   - latex-block / latex-inline → LatexRender
 *   - 普通文本 → 保留换行（split '\n' + <br />）
 *
 * 供 KnowledgeCard、OcrResultMessage、ChatBubble（user 分支）复用。
 */
import { Fragment } from 'react'
import { LatexRender } from '@/components/LatexRender'
import { parseLatexSegments } from '@/lib/katexHelpers'

export function renderMixed(content: string) {
  const segments = parseLatexSegments(content)
  return segments.map((seg, idx) => {
    if (seg.type === 'latex-block') {
      return <LatexRender key={idx} tex={seg.content} display="block" />
    }
    if (seg.type === 'latex-inline') {
      return <LatexRender key={idx} tex={seg.content} display="inline" />
    }
    // 普通文本：保留换行
    return (
      <Fragment key={idx}>
        {seg.content.split('\n').map((line, i, arr) => (
          <Fragment key={i}>
            {line}
            {i < arr.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </Fragment>
    )
  })
}
