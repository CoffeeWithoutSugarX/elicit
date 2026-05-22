/**
 * P-101 空对话页 — 引导用户上传第一道题。
 * 方格本背景 + 中央"开始你的第一题"提示 + 图片按钮 active 态 + 输入框（占位）。
 * 对应 PRD P-101 空态。
 */
import { useState } from 'react'
import { Image, Camera, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/classNames'

/** 极简 ChatInput 空态版（无需 scenario 支持，与正版保持相同盒子布局） */
function EmptyChatInput({ onImageClick }: { onImageClick: () => void }) {
  return (
    /* 外层容器：bg-paper-canvas，无 border-t，与对话区无硬切 */
    <div className="bg-paper-canvas px-4 py-4">
      {/* 内层限宽居中 */}
      <div className="max-w-[768px] mx-auto">
        {/* 盒子：圆角、border、shadow */}
        <div
          className={cn(
            'flex flex-col',
            'bg-paper-surface border border-ink-line rounded-2xl shadow-paper-sm',
          )}
        >
          {/* 上区：占位 div（不可输入） */}
          <div
            className="px-4 pt-3 pb-1 text-base text-ink-muted min-h-[44px]"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            先上传一张题目图片…
          </div>

          {/* 下区：操作行 */}
          <div className="flex items-center justify-between px-2 pb-2">
            {/* 左侧：图片按钮 active 态 */}
            <button
              type="button"
              onClick={onImageClick}
              className={cn(
                'w-8 h-8 rounded-full inline-flex items-center justify-center',
                'bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-paper-deep',
                'transition-colors cursor-pointer',
              )}
              title="上传题目图片"
              aria-label="上传题目图片"
            >
              <Camera size={16} />
            </button>

            {/* 右侧：发送按钮（始终禁用，灰显保持轮廓） */}
            <button
              type="button"
              disabled
              className="w-8 h-8 rounded-full flex items-center justify-center cursor-not-allowed opacity-60"
              style={{
                backgroundColor: 'var(--color-paper-deep)',
                color: 'var(--color-ink-muted)',
              }}
              aria-label="发送"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
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
