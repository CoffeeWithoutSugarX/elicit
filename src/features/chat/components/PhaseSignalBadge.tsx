'use client'

/**
 * Agent 信号徽标 — shadcn Badge 灰阶版。
 * 用 variant + lucide 图标区分语义，不使用任何彩色 token。
 * - 正向/完成类：variant="default"（黑底白字）+ CheckCircle2
 * - 中性/停留类：variant="secondary"（灰底）+ Clock
 * - 警示/升级类：variant="outline"（镂空）+ TrendingUp
 * - 达成/done 类：variant="secondary" + Sparkles
 * - 受阻/blocked 类：variant="outline" + AlertTriangle
 */
import { CheckCircle2, Clock, TrendingUp, Sparkles, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { PhaseSignal } from '@/types/enums/phaseSignal.enum'
import { PhaseSignalEnum } from '@/types/enums/phaseSignal.enum'

interface Props {
  signal: PhaseSignal
}

/** 信号 → shadcn Badge variant（全灰阶，无彩色） */
const SIGNAL_VARIANT: Record<PhaseSignal, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  COMPLETED:        'default',    // 黑底白字 — 正向完成
  STAY:             'secondary',  // 灰底 — 中性停留
  ESCALATE:         'outline',    // 镂空 — 需要关注
  SUB_PROBLEM_DONE: 'secondary',  // 灰底 — 阶段性达成
  PROBLEM_BLOCKED:  'outline',    // 镂空 — 警示受阻
}

/** 信号 → lucide 图标（替代彩色区分语义） */
const SIGNAL_ICON: Record<PhaseSignal, React.ComponentType<{ size?: number }>> = {
  COMPLETED:        CheckCircle2,
  STAY:             Clock,
  ESCALATE:         TrendingUp,
  SUB_PROBLEM_DONE: Sparkles,
  PROBLEM_BLOCKED:  AlertTriangle,
}

export function PhaseSignalBadge({ signal }: Props) {
  const Icon = SIGNAL_ICON[signal]

  return (
    <Badge variant={SIGNAL_VARIANT[signal]}>
      <Icon size={10} aria-hidden />
      {PhaseSignalEnum.getLabel(signal)}
    </Badge>
  )
}
