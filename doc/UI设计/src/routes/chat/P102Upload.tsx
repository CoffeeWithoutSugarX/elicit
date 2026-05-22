/**
 * P-102 上传图片浮层 — 纸面卡片浮层演示。
 * fixed 全屏遮罩 + 中央纸面卡片（拍照/相册二选一）。
 * 选择后展示 sample-quadratic.svg 预览 + 确认/取消按钮。
 * 对应 PRD P-102 / US-001 / US-002（上传入口）。
 */
import { useState } from 'react'
import { Camera, Images, X } from 'lucide-react'
import { cn } from '@/lib/classNames'

type UploadSource = 'camera' | 'album' | null

export function P102Upload() {
  const [selected, setSelected] = useState<UploadSource>(null)
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-paper-canvas">
      {/* 背景内容（浮层下方的空对话页占位） */}
      <div className="flex-1 flex items-center justify-center">
        <p
          className="text-ink-muted text-sm"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          （对话区占位）
        </p>
      </div>

      {/* 全屏遮罩 */}
      {!confirmed && (
        <div
          className="absolute inset-0 bg-ink-primary/30 flex items-center justify-center p-6 z-10"
          role="dialog"
          aria-modal="true"
          aria-label="上传题目图片"
        >
          {/* 纸面卡片 */}
          <div
            className={cn(
              'w-full max-w-sm',
              'bg-paper-surface border border-ink-line rounded-md',
              'shadow-paper-lg',
              'flex flex-col',
            )}
          >
            {/* 卡片头部 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-ink-line">
              <h2
                className="text-base text-ink-primary"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                上传题目图片
              </h2>
              <button
                type="button"
                className="text-ink-muted hover:text-ink-primary transition-colors"
                aria-label="关闭"
                onClick={() => setSelected(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* 未选择状态：两个来源按钮 */}
              {!selected ? (
                <>
                  <p
                    className="text-xs text-ink-muted"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    选择图片来源：
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelected('camera')}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-2.5 py-5',
                        'border border-ink-line rounded-sm',
                        'bg-paper-canvas hover:bg-paper-surface',
                        'hover:border-ink-secondary transition-all',
                      )}
                    >
                      <Camera size={22} className="text-ink-secondary" />
                      <span
                        className="text-sm text-ink-primary"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        拍照
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelected('album')}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-2.5 py-5',
                        'border border-ink-line rounded-sm',
                        'bg-paper-canvas hover:bg-paper-surface',
                        'hover:border-ink-secondary transition-all',
                      )}
                    >
                      <Images size={22} className="text-ink-secondary" />
                      <span
                        className="text-sm text-ink-primary"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        相册
                      </span>
                    </button>
                  </div>
                </>
              ) : (
                /* 已选择状态：图片预览 */
                <>
                  <p
                    className="text-xs text-ink-muted mb-1"
                    style={{ fontFamily: 'var(--font-body)' }}
                  >
                    来源：{selected === 'camera' ? '拍照' : '相册'} · 预览
                  </p>

                  {/* 图片预览 */}
                  <div className="rounded-sm border border-ink-line overflow-hidden bg-paper-canvas">
                    <img
                      src="/mock-images/sample-quadratic.svg"
                      alt="题目图片预览"
                      className="w-full object-contain"
                      style={{ maxHeight: '200px' }}
                    />
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      className={cn(
                        'flex-1 py-2.5 text-sm rounded-sm',
                        'border border-ink-line',
                        'text-ink-secondary bg-paper-canvas',
                        'hover:border-ink-secondary transition-colors',
                      )}
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      取消
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmed(true)}
                      className={cn(
                        'flex-1 py-2.5 rounded-md text-sm',
                        'bg-ink-deep text-paper-surface',
                        'hover:opacity-90 transition-opacity',
                        'shadow-paper-sm',
                      )}
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontFeatureSettings: '"smcp"',
                        letterSpacing: '0.05em',
                      }}
                    >
                      确认上传
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 确认后成功提示 */}
      {confirmed && (
        <div className="absolute inset-0 bg-ink-primary/20 flex items-center justify-center z-10">
          <div
            className={cn(
              'bg-paper-surface border border-ink-line rounded-md p-8',
              'shadow-paper-lg text-center max-w-xs',
            )}
          >
            <p
              className="text-2xl text-ink-primary mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ✓
            </p>
            <p
              className="text-sm text-ink-secondary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              上传成功！OCR 识别中…
            </p>
            <button
              type="button"
              onClick={() => {
                setConfirmed(false)
                setSelected(null)
              }}
              className="mt-4 text-xs text-ink-muted underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              返回演示
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
