/**
 * Agent 信号徽标 — 纸张感版本。
 * 1px 左竖线（阶段/信号色）+ 衬线中文 + 无 fill 背景。
 */
import { cn } from '@/lib/classNames'
import { SIGNAL_LABEL } from '@/styles/theme'
import type { PhaseSignal } from '@/mock/types'

interface Props {
  signal: PhaseSignal
}

/** 信号 → CSS variable 颜色（左竖线用） */
const SIGNAL_COLOR: Record<PhaseSignal, string> = {
  COMPLETED:       'var(--color-signal-completed)',
  STAY:            'var(--color-signal-stay)',
  ESCALATE:        'var(--color-signal-escalate)',
  SUB_PROBLEM_DONE:'var(--color-signal-done)',
  PROBLEM_BLOCKED: 'var(--color-signal-blocked)',
}

/** 信号 → 文字颜色 class */
const SIGNAL_TEXT: Record<PhaseSignal, string> = {
  COMPLETED:       'text-signal-completed',
  STAY:            'text-signal-stay',
  ESCALATE:        'text-signal-escalate',
  SUB_PROBLEM_DONE:'text-signal-done',
  PROBLEM_BLOCKED: 'text-signal-blocked',
}

// SIGNAL_LABEL 中 key 是 AgentSignal（含 DONE / BLOCKED）；
// PhaseSignal 用 SUB_PROBLEM_DONE / PROBLEM_BLOCKED，单独映射。
const PHASE_SIGNAL_DISPLAY: Record<PhaseSignal, string> = {
  COMPLETED:       SIGNAL_LABEL.COMPLETED,
  STAY:            SIGNAL_LABEL.STAY,
  ESCALATE:        SIGNAL_LABEL.ESCALATE,
  SUB_PROBLEM_DONE:SIGNAL_LABEL.DONE,
  PROBLEM_BLOCKED: SIGNAL_LABEL.BLOCKED,
}

export function PhaseSignalBadge({ signal }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center pl-2 pr-1 py-0.5 gap-1',
        'text-xs',
        SIGNAL_TEXT[signal],
      )}
      style={{
        borderLeft: `2px solid ${SIGNAL_COLOR[signal]}`,
        fontFamily: 'var(--font-display)',
      }}
    >
      {PHASE_SIGNAL_DISPLAY[signal]}
    </span>
  )
}
