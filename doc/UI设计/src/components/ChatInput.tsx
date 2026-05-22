/**
 * 聊天输入框：现代 AI chat 单盒子风格。
 * 整个输入区是一个统一的圆角大盒子，内部上下分区：
 * - 上区：textarea（无 border / 无 outline），充分 padding
 * - 下区：左下 ImageButton（圆形小图标）+ 右下 ArrowUp 发送按钮（圆形填色）
 *
 * 外层 bg-paper-canvas 无 border-t，输入区与对话区无硬切。
 * 聚焦时盒子 border 加深（focus-within），不给 textarea 加 ring。
 * 回车发送，Shift+Enter 换行；disabled 时整体灰化。
 *
 * 纸面调性：象牙白背景 + 深墨蓝发送按钮 + Fraunces 衬线。
 */
import { useState, useRef } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/classNames'
import { ImageButton } from './ImageButton'

interface Props {
  onSubmit: (text: string) => void
  onImageClick: () => void
  imageButtonState: 'active' | 'triggers-P106' | 'disabled'
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSubmit,
  onImageClick,
  imageButtonState,
  disabled = false,
  placeholder = '回复 agent…',
}: Props) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSubmit(trimmed)
    setText('')
    // 复位高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    // 自适应高度（最多 200px）
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  const canSend = !!text.trim() && !disabled

  return (
    /* 外层容器：bg-paper-canvas，无 border-t，与对话区无硬切 */
    <div className={cn('bg-paper-canvas px-4 py-4', disabled && 'opacity-60 pointer-events-none')}>
      {/* 内层限宽居中 */}
      <div className="max-w-[768px] mx-auto">
        {/* 盒子：圆角、border、shadow，focus-within 时 border 加深 */}
        <div
          className={cn(
            'flex flex-col',
            'bg-paper-surface border border-ink-line rounded-2xl shadow-paper-sm',
            'focus-within:border-ink-secondary transition-colors',
          )}
        >
          {/* 上区：textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent outline-none resize-none',
              'px-4 pt-3 pb-1',
              'text-base text-ink-primary placeholder:text-ink-muted',
              'min-h-[44px] max-h-[200px] overflow-y-auto',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          />

          {/* 下区：操作行 */}
          <div className="flex items-center justify-between px-2 pb-2">
            {/* 左侧：图片按钮 */}
            <ImageButton state={imageButtonState} onClick={onImageClick} />

            {/* 右侧：发送按钮（圆形，ArrowUp） */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                canSend
                  ? 'hover:opacity-90 active:scale-95 cursor-pointer'
                  : 'cursor-not-allowed opacity-60',
              )}
              style={
                canSend
                  ? {
                      backgroundColor: 'var(--color-ink-deep)',
                      color: 'var(--color-paper-surface)',
                    }
                  : {
                      backgroundColor: 'var(--color-paper-deep)',
                      color: 'var(--color-ink-muted)',
                    }
              }
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
