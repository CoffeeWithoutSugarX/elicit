/**
 * Pólya 双层顶栏 — 数学笔记本风。
 * 上层：罗马题号（IBM Plex Mono）+ 细竖分隔 + 衬线阶段名
 * 下层：仅 EXECUTE 阶段显示破题点行
 */
import { cn } from '@/lib/classNames'
import { PHASE_LABEL } from '@/styles/theme'
import type { PolyaPhase } from '@/mock/types'
import { SubProblemBadge } from './SubProblemBadge'
import { InsightPointPill } from './InsightPointPill'
import { LongConversationToast } from './LongConversationToast'

interface Props {
  currentSubProblemIndex: number
  totalSubProblems: number
  currentPhase: PolyaPhase
  insightPointCount: number
  insightPointLatest?: string
  showLongWarning?: boolean
}

/** 阶段 → CSS variable 颜色 */
const PHASE_COLOR: Record<PolyaPhase, string> = {
  UNDERSTAND: 'var(--color-phase-understand)',
  PLAN:       'var(--color-phase-plan)',
  EXECUTE:    'var(--color-phase-execute)',
  REVIEW:     'var(--color-phase-review)',
}

export function PolyaTopBar({
  currentSubProblemIndex,
  totalSubProblems,
  currentPhase,
  insightPointCount,
  insightPointLatest,
  showLongWarning = false,
}: Props) {
  // EXECUTE 阶段才显示破题点下层
  const showInsightRow = currentPhase === 'EXECUTE'
  const phaseColor = PHASE_COLOR[currentPhase]

  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-paper-surface border-b border-ink-line',
      )}
    >
      {showLongWarning ? <LongConversationToast /> : null}

      {/* 上层：罗马题号 + 细竖线 + 衬线阶段名 */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <SubProblemBadge
          current={currentSubProblemIndex + 1}
          total={totalSubProblems}
        />

        {/* 阶段色细竖线 */}
        <div
          className="w-px h-4 flex-shrink-0"
          style={{ backgroundColor: phaseColor }}
          aria-hidden
        />

        {/* 衬线阶段名 */}
        <span
          className="text-sm text-ink-primary"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          阶段 │ {PHASE_LABEL[currentPhase]}
        </span>
      </div>

      {/* 下层：仅 EXECUTE 阶段显示破题点 */}
      {showInsightRow ? (
        <div className="flex items-center px-4 pb-2.5">
          <InsightPointPill
            count={insightPointCount}
            latest={insightPointLatest}
          />
        </div>
      ) : null}
    </div>
  )
}
