/**
 * 长对话警示 Toast（≥ 50 轮时显示）。
 * 纸面调性：象牙白底 + 朱砂左竖线 + 墨色文字。
 * 关闭只影响 UI 显示，不真断会话。
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/classNames'

export function LongConversationToast() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        'px-4 py-2',
        'bg-paper-canvas text-ink-primary text-sm',
        'border-b border-ink-line',
      )}
      style={{
        borderLeft: '3px solid var(--color-vermilion)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span>对话已较长，建议新建对话以获得更好体验</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-ink-muted hover:text-vermilion transition-colors"
        aria-label="关闭提示"
      >
        <X size={14} />
      </button>
    </div>
  )
}
