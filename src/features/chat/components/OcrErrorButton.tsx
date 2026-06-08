'use client'

/**
 * "识别错误" 文字按钮，触发重新 OCR 或回 P-102。
 * 纸面调性：浅边线 + 墨色文字 + hover 朱砂。
 */
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onClick: () => void
}

export function OcrErrorButton({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5',
        'rounded-sm text-sm text-muted-foreground',
        'border border-border bg-card',
        'hover:border-foreground hover:text-foreground',
        'transition-colors',
      )}
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <RefreshCw size={14} />
      识别错误
    </button>
  )
}
