/**
 * Pólya 双层顶栏 — 数学笔记本风。
 * 最上层：4 阶段横向 stepper（理解→规划→执行→回顾）
 * 中层：罗马题号（IBM Plex Mono）+ 细竖分隔 + 衬线阶段名
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

/** 4 阶段有序列表 */
const PHASE_ORDER: PolyaPhase[] = ['UNDERSTAND', 'PLAN', 'EXECUTE', 'REVIEW']

/** 阶段 → 简短中文标签（stepper 用，比 PHASE_LABEL 更紧凑） */
const PHASE_SHORT_LABEL: Record<PolyaPhase, string> = {
  UNDERSTAND: '理解',
  PLAN:       '规划',
  EXECUTE:    '执行',
  REVIEW:     '回顾',
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

  // 当前阶段在 PHASE_ORDER 中的 index
  const currentPhaseIndex = PHASE_ORDER.indexOf(currentPhase)

  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-paper-surface border-b border-ink-line',
      )}
    >
      {showLongWarning ? <LongConversationToast /> : null}

      {/* 最上层：4 阶段横向 stepper */}
      <div
        className="flex items-center justify-center gap-0 px-4 pt-2.5 pb-1"
        role="progressbar"
        aria-label="Pólya 阶段进度"
        aria-valuenow={currentPhaseIndex + 1}
        aria-valuemin={1}
        aria-valuemax={4}
      >
        {PHASE_ORDER.map((phase, idx) => {
          const isDone = idx < currentPhaseIndex
          const isCurrent = idx === currentPhaseIndex
          const isUpcoming = idx > currentPhaseIndex
          const dotColor = PHASE_COLOR[phase]
          // 连线状态：连线在圆点右侧，最后一个无连线
          const lineCompleted = idx < currentPhaseIndex
          const isLast = idx === PHASE_ORDER.length - 1

          return (
            <div key={phase} className="flex items-center">
              {/* 圆点 + 阶段名（纵向排列） */}
              <div className="flex flex-col items-center gap-0.5">
                {/* 圆点 */}
                <div
                  className={cn(
                    'flex-shrink-0 flex items-center justify-center',
                    'transition-all duration-300',
                  )}
                  style={{
                    width: isCurrent ? '10px' : '8px',
                    height: isCurrent ? '10px' : '8px',
                    borderRadius: '50%',
                    // 当前阶段：实心 + 白色 ring
                    ...(isCurrent ? {
                      backgroundColor: dotColor,
                      boxShadow: `0 0 0 2px var(--color-paper-surface), 0 0 0 3.5px ${dotColor}`,
                    } : isDone ? {
                      // 已完成：实心阶段色
                      backgroundColor: dotColor,
                    } : {
                      // 未到达：空心
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-ink-line)',
                    }),
                  }}
                  aria-hidden
                >
                  {/* 已完成阶段：checkmark */}
                  {isDone ? (
                    <span
                      style={{
                        display: 'block',
                        width: '6px',
                        height: '6px',
                        color: 'var(--color-paper-surface)',
                        fontSize: '6px',
                        lineHeight: '6px',
                        textAlign: 'center',
                        fontWeight: 700,
                      }}
                    >
                      ✓
                    </span>
                  ) : null}
                </div>

                {/* 阶段名衬线小字 */}
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '9px',
                    lineHeight: '12px',
                    color: isCurrent
                      ? 'var(--color-ink-primary)'
                      : isDone
                        ? 'var(--color-ink-muted)'
                        : 'var(--color-ink-muted)',
                    fontWeight: isCurrent ? 600 : 400,
                    opacity: isUpcoming ? 0.55 : 1,
                    letterSpacing: '0.02em',
                  }}
                >
                  {PHASE_SHORT_LABEL[phase]}
                </span>
              </div>

              {/* 连接线（最后一个圆点无连线） */}
              {!isLast ? (
                <div
                  style={{
                    width: '28px',
                    height: '1px',
                    marginBottom: '12px', /* 补偿阶段名文字高度 */
                    backgroundColor: 'var(--color-ink-line)',
                    opacity: lineCompleted ? 1 : 0.3,
                  }}
                  aria-hidden
                />
              ) : null}
            </div>
          )
        })}
      </div>

      {/* 中层：罗马题号 + 细竖线 + 衬线阶段名 */}
      <div className="flex items-center gap-3 px-4 py-2">
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
