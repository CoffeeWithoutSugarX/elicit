'use client'

/**
 * OCR 识别结果消息卡片 — 在对话流中作为 agent 气泡展示。
 *
 * 布局：
 *   原图缩略图（点击展开全屏预览）
 *   ├─ 多题时显示 tab 栏（选中态：vermilion 底部 2px 线 + 加粗）
 *   ├─ 单题时不显示 tab（直接展示题目内容）
 *   ├─ LaTeX 混合题目内容
 *   └─ 底栏：[识别错误]  [确认]
 *
 * onConfirm(selectedIndex)：用户确认选择的题目（默认 0）
 * onOcrError：用户报告识别错误
 *
 * 对应 PRD P-103。
 */
import { useState, Fragment } from 'react'
import { cn } from '@/lib/utils'
import { LatexRender } from '@/components/LatexRender'
import { parseLatexSegments } from '@/lib/katexHelpers'
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema'

interface Props {
  originalImageUrl: string
  questions: SanitizedQuestion[]
  onConfirm: (selectedIndex: number) => void
  onOcrError: () => void
}

/** 渲染含 LaTeX 的混合文本 */
function renderMixed(content: string) {
  const segments = parseLatexSegments(content)
  return segments.map((seg, idx) => {
    if (seg.type === 'latex-block') return <LatexRender key={idx} tex={seg.content} display="block" />
    if (seg.type === 'latex-inline') return <LatexRender key={idx} tex={seg.content} display="inline" />
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

export function OcrResultMessage({
  originalImageUrl,
  questions,
  onConfirm,
  onOcrError,
}: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [imageExpanded, setImageExpanded] = useState(false)
  const isSingle = questions.length === 1

  const selectedQuestion = questions[activeTab] ?? questions[0]

  return (
    <>
      {/* 卡片：对话流 agent 气泡风格 */}
      <div
        className={cn(
          'w-full rounded-md border border-ink-line',
          'bg-paper-surface shadow-paper-sm',
          'overflow-hidden',
        )}
        style={{ maxWidth: '480px' }}
      >
        {/* ── 原图缩略图区 ── */}
        <button
          type="button"
          onClick={() => setImageExpanded(true)}
          className="w-full block text-left"
          aria-label="点击查看原图"
        >
          <div
            className="image-preview-container w-full overflow-hidden border-b border-ink-line bg-paper-deep"
            style={{ height: '120px' }}
          >
            <img
              src={originalImageUrl}
              alt="原题图片"
              className="w-full h-full object-contain"
            />
          </div>
        </button>

        {/* ── Tab 栏（多题时显示） ── */}
        {!isSingle && (
          <div className="flex border-b border-ink-line px-3">
            {questions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveTab(i)}
                className={cn(
                  'px-3 py-2 text-xs transition-colors relative',
                  'focus:outline-none',
                  activeTab === i
                    ? 'text-ink-primary font-semibold'
                    : 'text-ink-muted hover:text-ink-primary',
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                题目 {i + 1}
                {/* 选中态：底部 2px 实线 */}
                {activeTab === i && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5"
                    style={{ background: 'var(--color-vermilion)' }}
                  />
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── 题目内容区 ── */}
        <div className="px-4 py-3">
          {/* 题型标签（使用 topic 字段） */}
          {selectedQuestion && (
            <span
              className="inline-block text-[10px] px-1.5 py-0.5 mb-2 rounded-sm border border-ink-line text-ink-muted"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
            >
              {selectedQuestion.topic}
            </span>
          )}

          <p
            className="text-sm text-ink-primary leading-relaxed"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {/* 使用 latexFull 字段渲染题目内容（含 LaTeX） */}
            {selectedQuestion ? renderMixed(selectedQuestion.latexFull) : null}
          </p>
        </div>

        {/* ── 底栏：操作按钮 ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-ink-line">
          {/* 识别错误按钮 */}
          <button
            type="button"
            onClick={onOcrError}
            className={cn(
              'text-xs px-3 py-1.5 rounded-sm',
              'border border-ink-line text-ink-secondary',
              'bg-paper-canvas hover:border-ink-secondary hover:text-ink-primary transition-colors',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            识别错误
          </button>

          {/* 确认按钮（主 CTA） */}
          <button
            type="button"
            onClick={() => onConfirm(activeTab)}
            className={cn(
              'text-sm px-5 py-1.5 rounded-md',
              'bg-vermilion text-paper-surface',
              'hover:opacity-90 active:scale-95 transition-all',
              'shadow-paper-sm font-medium',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            确认
          </button>
        </div>
      </div>

      {/* ── 原图全屏预览 overlay ── */}
      {imageExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgb(26 24 24 / 0.80)' }}
          onClick={() => setImageExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label="原图预览"
        >
          <img
            src={originalImageUrl}
            alt="原题图片（全屏预览）"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-md shadow-paper-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <p
            className="absolute bottom-4 text-paper-surface/60 text-xs"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            点击任意处关闭
          </p>
        </div>
      )}
    </>
  )
}
