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
 *
 * 签名说明：
 *   originalImageUrl 是私有桶 OSS object key，不可直接用于 <img src>。
 *   组件挂载后调用 ossRequest.signImageForPreview(key) 获取签名 URL，
 *   签名完成前显示占位（避免裂图闪烁）。防竞态 guard 模式与 ChatBubble 一致。
 */
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { renderMixed } from '@/features/chat/components/renderMixed'
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ossRequest } from '@/services/api-client/OssRequest'
import { unescapeLiteralNewlines } from '@/lib/textUtils'

interface Props {
  originalImageUrl: string
  questions: SanitizedQuestion[]
  /** readOnly=true 时：隐藏操作按钮和提示文字，显示「✓ 已确认」徽标，适用于对话流中的静态富卡片 */
  readOnly?: boolean
  onConfirm?: (selectedIndex: number) => void
  onOcrError?: () => void
}


export function OcrResultMessage({
  originalImageUrl,
  questions,
  readOnly = false,
  onConfirm,
  onOcrError,
}: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [imageExpanded, setImageExpanded] = useState(false)
  // 签名后的 OSS URL，null 表示签名尚未完成（显示占位）
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null)
  const isSingle = questions.length === 1

  const selectedQuestion = questions[activeTab] ?? questions[0]

  // 组件挂载后签名 OSS 预览 URL；isCancelled 防竞态（与 ChatBubble 保持一致的模式）
  useEffect(() => {
    if (!originalImageUrl) return
    let isCancelled = false
    ossRequest
      .signImageForPreview(originalImageUrl)
      .then((url) => {
        if (!isCancelled) setSignedImageUrl(url)
      })
      .catch((error) => {
        console.error('OcrResultMessage：获取原图预览签名失败', error)
      })
    return () => {
      isCancelled = true
    }
  }, [originalImageUrl])

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
            {signedImageUrl ? (
              <img
                src={signedImageUrl}
                alt="原题图片"
                className="w-full h-full object-contain"
              />
            ) : (
              // 签名未完成前显示占位，避免私有桶裂图
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                图片加载中…
              </div>
            )}
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
          {/* 题型标签（使用 topic 字段）+ readOnly 时显示「✓ 已确认」徽标 */}
          <div className="flex items-center gap-2 mb-2">
            {selectedQuestion && (
              <span
                className="inline-block text-[10px] px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground"
              >
                {selectedQuestion.topic}
              </span>
            )}
            {readOnly && (
              <span
                className="inline-block text-[10px] px-1.5 py-0.5 rounded-sm border border-border text-muted-foreground"
              >
                ✓ 已确认
              </span>
            )}
          </div>

          <p
            className="text-sm text-foreground leading-relaxed"
          >
            {/* 使用 latexFull 字段渲染题目内容（含 LaTeX）；
                先用 unescapeLiteralNewlines 清洗字面 \n，
                防御模型未遵守 prompt 约束时产生的乱码感文本 */}
            {selectedQuestion
              ? renderMixed(unescapeLiteralNewlines(selectedQuestion.latexFull))
              : null}
          </p>
        </div>

        {/* ── 识别确认提示（只读时隐藏） ── */}
        {!readOnly && (
          <p className="px-4 pb-1 text-xs text-muted-foreground">
            请确认识别是否正确，正确就点「确认」开始引导，不对就点「识别错误」重拍。
          </p>
        )}

        {/* ── 底栏：操作按钮（只读时隐藏） ── */}
        {!readOnly && (
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
              onClick={() => onConfirm!(activeTab)}
            >
              确认
            </Button>
          </div>
        )}
      </div>

      {/* ── 原图全屏预览（shadcn Dialog 真模态，受控 open/onOpenChange） ── */}
      <Dialog open={imageExpanded} onOpenChange={setImageExpanded}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0 flex items-center justify-center bg-black/80 border-0"
          showCloseButton={true}
        >
          {/* 视觉隐藏的标题与描述，供屏幕阅读器使用；Radix 会自动通过 aria-labelledby 关联 DialogTitle */}
          <DialogTitle className="sr-only">原图预览</DialogTitle>
          <DialogDescription className="sr-only">原题图片全屏预览，点击任意处或按 Esc 关闭</DialogDescription>
          {signedImageUrl ? (
            <img
              src={signedImageUrl}
              alt="原题图片（全屏预览）"
              className="max-w-full max-h-[85vh] object-contain rounded-md"
            />
          ) : (
            // 签名未完成时 Dialog 内也显示占位，不出现私有桶裂图
            <div className="text-white/60 text-sm">图片加载中…</div>
          )}
          <p className="absolute bottom-4 text-white/60 text-xs pointer-events-none">
            点击任意处关闭
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
