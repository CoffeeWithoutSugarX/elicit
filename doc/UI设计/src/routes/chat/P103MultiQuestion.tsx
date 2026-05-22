/**
 * P-103 多题列表 — OCR 识别到多道题，对话流展示 OcrResultMessage 卡片。
 * 布局：对话容器，2 条消息：
 *   1. user 上传图片消息（"（图片已上传）"）
 *   2. agent OcrResultMessage 卡片（含 3 道题 + tab 切换）
 * 确认后显示"已选择题目 X，开始 Pólya 引导..."提示态。
 * 对应 PRD P-103 / US-004 / US-005。
 */
import { useState } from 'react'
import { OcrResultMessage } from '@/components/OcrResultMessage'
import { cn } from '@/lib/classNames'
import { usePreviewStore } from '@/stores/usePreviewStore'
import { getQuestionLabel } from '@/lib/themeAware'
import type { OcrQuestion } from '@/components/OcrResultMessage'

const QUESTIONS: OcrQuestion[] = [
  {
    subject: '二次函数',
    content: '已知 $f(x)=ax^2+bx+c$，满足 $f(0)=2$，$f(1)=1$，$f(-1)=5$，求 $a$、$b$、$c$ 的值。',
  },
  {
    subject: '几何',
    content: '△ABC 中，$\\angle B=90°$，$AB=3$，$BC=4$，求斜边 $AC$ 的长及 $\\sin A$ 的值。',
  },
  {
    subject: '应用题',
    content:
      '某商品成本 60 元，售价每提高 1 元，销量减少 2 件。初始日销量 80 件，问售价定多少元时日利润最大？',
  },
]

export function P103MultiQuestion() {
  const [confirmedIndex, setConfirmedIndex] = useState<number | null>(null)
  const [showOcrError, setShowOcrError] = useState(false)
  const { theme } = usePreviewStore()

  if (confirmedIndex !== null) {
    const label = getQuestionLabel(confirmedIndex, theme)
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
              className="text-sm text-ink-secondary mb-1"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              已选择题目 {label}：
            </p>
            <p
              className="text-sm text-ink-primary font-medium"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {QUESTIONS[confirmedIndex]?.subject}
            </p>
            <p
              className="text-xs text-ink-muted mt-2"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              开始 Pólya 引导…
            </p>
            <button
              type="button"
              onClick={() => { setConfirmedIndex(null); setShowOcrError(false) }}
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

          {/* 消息 2：agent OcrResultMessage 卡片 */}
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
                originalImageUrl="/mock-images/sample-quadratic.svg"
                questions={QUESTIONS}
                onConfirm={(idx) => setConfirmedIndex(idx)}
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
