/**
 * 破题点显示 — 批改红下划线版。
 * 「count」中文引号包数字（IBM Plex Mono bold）+ 朱砂红下划线。
 * hover 通过 title attribute 显示最新破题点。
 */
import { cn } from '@/lib/classNames'

interface Props {
  count: number
  latest?: string
}

export function InsightPointPill({ count, latest }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1',
        'text-sm text-ink-primary',
        'cursor-default select-none',
      )}
      title={latest ? `最新破题点：${latest}` : undefined}
    >
      <span className="text-ink-secondary text-xs" style={{ fontFamily: 'var(--font-body)' }}>
        破题点
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          textDecorationLine: 'underline',
          textDecorationColor: 'var(--color-vermilion)',
          textUnderlineOffset: '4px',
          letterSpacing: '0.04em',
        }}
      >
        「{count}」
      </span>
    </span>
  )
}
