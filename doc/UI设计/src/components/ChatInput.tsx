/**
 * 聊天输入框：textarea + 图片按钮 + 发送按钮。
 * 回车发送，Shift+Enter 换行。
 * disabled 时整个 input 灰化，禁止双发。
 *
 * 纸面调性：象牙白输入框 + 深墨蓝发送按钮 + Fraunces 衬线。
 */
import { useState, useRef } from 'react'
import { Send } from 'lucide-react'
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
    // 自适应高度（最多约 4 行）
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  return (
    <div
      className={cn(
        'flex items-end gap-2 p-3',
        'bg-paper-surface border-t border-ink-line',
        disabled && 'opacity-60 pointer-events-none',
      )}
    >
      <ImageButton state={imageButtonState} onClick={onImageClick} />

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
          'flex-1 resize-none px-3 py-2 text-base',
          'rounded-sm bg-paper-canvas',
          'border border-ink-line',
          'text-ink-primary placeholder:text-ink-muted',
          'focus:outline-none focus:border-ink-secondary',
          'min-h-[40px] max-h-[120px] overflow-y-auto',
        )}
        style={{ fontFamily: 'var(--font-body)' }}
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || !text.trim()}
        className={cn(
          'inline-flex items-center justify-center w-9 h-9 rounded-md',
          'transition-colors',
          text.trim() && !disabled
            ? 'bg-ink-deep text-paper-surface hover:opacity-90 cursor-pointer'
            : 'bg-paper-deep text-ink-muted cursor-not-allowed',
        )}
        style={{ fontFamily: 'var(--font-display)' }}
        aria-label="发送"
      >
        <Send size={16} />
      </button>
    </div>
  )
}
