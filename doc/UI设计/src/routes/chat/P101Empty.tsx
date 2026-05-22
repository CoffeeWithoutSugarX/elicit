/**
 * P-101 空对话页 — 引导用户上传第一道题。
 * 方格本背景 + 中央"开始你的第一题"提示 + 图片按钮 active 态 + 输入框（占位）。
 * 对应 PRD P-101 空态。
 */
import { useState } from 'react'
import { Image } from 'lucide-react'
import { cn } from '@/lib/classNames'

/** 极简 ChatInput 空态版（无需 scenario 支持） */
function EmptyChatInput({ onImageClick }: { onImageClick: () => void }) {
  return (
    <div
      className={cn(
        'flex items-end gap-2 px-4 py-3',
        'bg-paper-surface border-t border-ink-line',
      )}
    >
      {/* 图片按钮 active 态 */}
      <button
        type="button"
        onClick={onImageClick}
        className={cn(
          'flex-shrink-0 w-9 h-9 inline-flex items-center justify-center',
          'rounded-sm border border-ink-line',
          'bg-paper-canvas text-ink-secondary',
          'hover:border-ink-secondary hover:text-ink-primary',
          'transition-colors',
        )}
        title="上传题目图片"
        aria-label="上传题目图片"
      >
        <Image size={16} />
      </button>

      {/* 输入框 */}
      <div
        className={cn(
          'flex-1 px-3 py-2.5 text-sm',
          'bg-paper-canvas border border-ink-line rounded-sm',
          'text-ink-muted',
        )}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        先上传一张题目图片…
      </div>

      {/* 发送按钮（禁用） */}
      <button
        type="button"
        disabled
        className="flex-shrink-0 px-4 py-2.5 rounded-md text-sm bg-paper-deep border border-ink-line text-ink-muted opacity-50 cursor-not-allowed"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        发送
      </button>
    </div>
  )
}

export function P101Empty() {
  const [showUploadHint, setShowUploadHint] = useState(false)

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* 主区域：方格本背景 + 居中引导 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-paper-canvas flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          {/* 顶部装饰 */}
          <div
            className="flex items-center gap-3 text-ink-line tracking-widest"
            aria-hidden
          >
            <span style={{ fontSize: '1.4em' }}>≡</span>
            <span style={{ fontSize: '1.4em' }}>≡</span>
            <span style={{ fontSize: '1.4em' }}>≡</span>
          </div>

          {/* 引导标题 */}
          <div>
            <h2
              className="text-2xl text-ink-primary mb-2 tracking-tight"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            >
              开始你的第一题
            </h2>
            <p
              className="text-sm text-ink-secondary leading-relaxed"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              拍一张数学题照片，Pólya 四步法引导你逐步突破——
              理解题意、拟定计划、执行解题、回顾总结。
            </p>
          </div>

          {/* 大图片上传按钮 */}
          <button
            type="button"
            onClick={() => setShowUploadHint(true)}
            className={cn(
              'inline-flex flex-col items-center gap-3 px-8 py-6',
              'rounded-md border-2 border-dashed',
              showUploadHint
                ? 'border-vermilion bg-paper-surface'
                : 'border-ink-line bg-paper-surface',
              'hover:border-ink-secondary transition-all',
              'shadow-paper-sm',
            )}
          >
            <Image
              size={28}
              className={showUploadHint ? 'text-vermilion' : 'text-ink-secondary'}
            />
            <span
              className={cn(
                'text-sm',
                showUploadHint ? 'text-vermilion' : 'text-ink-secondary',
              )}
              style={{ fontFamily: 'var(--font-display)' }}
            >
              上传题目图片
            </span>
            <span
              className="text-xs text-ink-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              拍照 · 相册 · 截图
            </span>
          </button>

          {showUploadHint && (
            <p
              className="text-xs text-vermilion"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              演示模式：请通过 DevToolbar 切换到 "P-102 上传图片" scenario
            </p>
          )}

          {/* 分隔 */}
          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-ink-line" />
            <span
              className="text-xs text-ink-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ※
            </span>
            <div className="flex-1 h-px bg-ink-line" />
          </div>

          {/* 支持题型提示 */}
          <div className="flex flex-wrap gap-2 justify-center">
            {['二次函数', '几何证明', '概率统计', '代数化简', '一元方程'].map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 text-xs text-ink-secondary border border-ink-line rounded-sm bg-paper-surface"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 底部输入框（空态） */}
      <EmptyChatInput onImageClick={() => setShowUploadHint(true)} />
    </div>
  )
}
