'use client'

/**
 * OCR 识别结果消息卡片 — 在对话流中作为 agent 气泡展示。
 *
 * 布局：
 *   原图缩略图（点击展开全屏预览）
 *   ├─ 多题时显示 tab 栏（选中态：底部 2px 实线 + 加粗）
 *   ├─ 单题时不显示 tab（直接展示题目内容）
 *   ├─ LaTeX 混合题目内容
 *   └─ 底栏：[识别错误]  [确认]
 *
 * onConfirm(selectedIndex)：用户确认选择的题目（默认 0）
 * onOcrError：用户报告识别错误
 *
 * 对应 PRD P-103。
 *
 * 判定：主卡片为内联卡片（嵌在对话流 agent 气泡，非浮层），未套 Dialog。
 * 原图全屏预览是真模态，已迁移至 shadcn Dialog。
 */
import { useState, Fragment } from 'react'
import { cn } from '@/lib/utils'
import { LatexRender } from '@/components/LatexRender'
import { parseLatexSegments } from '@/lib/katexHelpers'
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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
      {/* 卡片：对话流 agent 气泡风格（内联卡片，非模态） */}
      <div
        className={cn(
          'w-full rounded-md border border-border',
          'bg-card shadow-sm',
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
            className="image-preview-container w-full overflow-hidden border-b border-border bg-muted"
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
          <div className="flex border-b border-border px-3">
            {questions.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveTab(i)}
                className={cn(
                  'px-3 py-2 text-xs transition-colors relative',
                  'focus:outline-none',
                  activeTab === i
                    ? 'text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                题目 {i + 1}
                {/* 选中态：底部 2px 实线 */}
                {activeTab === i && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground"
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
              className="inline-block text-[10px] px-1.5 py-0.5 mb-2 rounded-sm border border-border text-muted-foreground"
            >
              {selectedQuestion.topic}
            </span>
          )}

          <p
            className="text-sm text-foreground leading-relaxed"
          >
            {/* 使用 latexFull 字段渲染题目内容（含 LaTeX） */}
            {selectedQuestion ? renderMixed(selectedQuestion.latexFull) : null}
          </p>
        </div>

        {/* ── 底栏：操作按钮 ── */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          {/* 识别错误按钮 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onOcrError}
          >
            识别错误
          </Button>

          {/* 确认按钮（主 CTA） */}
          <Button
            type="button"
            size="sm"
            onClick={() => onConfirm(activeTab)}
          >
            确认
          </Button>
        </div>
      </div>

      {/* ── 原图全屏预览（shadcn Dialog 真模态，受控 open/onOpenChange） ── */}
      <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0 flex items-center justify-center bg-black/80 border-0"
          showCloseButton={true}
          aria-label="原图预览"
        >
          <img
            src={originalImageUrl}
            alt="原题图片（全屏预览）"
            className="max-w-full max-h-[85vh] object-contain rounded-md"
          />
          <p className="absolute bottom-4 text-white/60 text-xs pointer-events-none">
            点击任意处关闭
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
