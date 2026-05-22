/**
 * P-103 单题确认 — OCR 识别出 1 道题，对话流展示 OcrResultMessage 卡片（无 tab）。
 * 布局：对话容器，2 条消息：
 *   1. user 上传图片消息（"（图片已上传）"）
 *   2. agent OcrResultMessage 卡片（单题，隐藏 tab 栏）
 * 确认后显示"确认！开始 Pólya 引导…"提示态。
 * 对应 PRD P-103（单题分支）。
 */
import { useState } from 'react'
import { OcrResultMessage } from '@/components/OcrResultMessage'
import { cn } from '@/lib/classNames'
import type { OcrQuestion } from '@/components/OcrResultMessage'

const QUESTION: OcrQuestion = {
  subject: '几何',
  content:
    '在 △ABC 中，已知 $AB=5$，$BC=12$，$AC=13$，求证 $\\angle ABC=90°$，并求 $\\sin A$ 的值。',
}

export function P103SingleQuestion() {
  const [confirmed, setConfirmed] = useState(false)
  const [showOcrError, setShowOcrError] = useState(false)

  if (confirmed) {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-paper-canvas">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-paper-surface border border-ink-line rounded-md shadow-paper-md p-6 text-center">
            <p
              className="text-2xl text-vermilion mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ✓
            </p>
            <p
              className="text-sm text-ink-secondary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              确认！开始 Pólya 引导…
            </p>
            <button
              type="button"
              onClick={() => { setConfirmed(false); setShowOcrError(false) }}
              className="mt-4 text-xs text-ink-muted underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              返回演示
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-paper-canvas">
      {/* 对话流容器 */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* 消息 1：user 上传图片 */}
          <div className="flex justify-end">
            <div
              className={cn(
                'max-w-xs px-4 py-2.5 rounded-md',
                'bg-ink-deep text-paper-surface',
                'shadow-paper-sm text-sm leading-relaxed',
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              （图片已上传）
            </div>
          </div>

          {/* 消息 2：agent OcrResultMessage 卡片（单题） */}
          <div className="flex justify-start">
            <div className="max-w-[90%]">
              {/* agent 标识 */}
              <p
                className="text-[10px] text-ink-muted mb-1.5 px-0.5"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
              >
                引思助手
              </p>
              <OcrResultMessage
                originalImageUrl="/mock-images/sample-geometry.svg"
                questions={[QUESTION]}
                onConfirm={() => setConfirmed(true)}
                onOcrError={() => setShowOcrError(true)}
              />
              {showOcrError && (
                <p
                  className="text-[11px] text-ink-muted mt-2 px-0.5"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  演示模式：识别错误已记录，模拟重新上传。
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
