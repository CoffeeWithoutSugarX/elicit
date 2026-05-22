/**
 * 小问题号徽标 — 罗马数字版。
 * current=1 / total=3 显示 "I / III"（IBM Plex Mono）。
 * 单问（total=1）显示 "I"，作为视觉锚点始终保留。
 */
import { cn } from '@/lib/classNames'
import { toRoman } from '@/lib/numerals'

interface Props {
  current: number
  total: number
}

export function SubProblemBadge({ current, total }: Props) {
  const currentRoman = toRoman(current)
  const totalRoman   = toRoman(total)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5',
        'text-xs text-ink-secondary',
        'border border-ink-line rounded-sm',
        'bg-paper-surface',
      )}
      style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
    >
      {total <= 1 ? currentRoman : `${currentRoman} / ${totalRoman}`}
    </span>
  )
}
