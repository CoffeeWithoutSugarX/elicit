'use client'

/**
 * Pólya 双层顶栏 — 数学笔记本风。
 * 最上层：4 阶段横向 stepper（理解→规划→执行→回顾）
 * 中层：罗马题号（IBM Plex Mono）+ 细竖分隔 + 衬线阶段名
 * 下层：仅 EXECUTE 阶段显示破题点行
 */
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PHASE_LABEL } from '@/lib/theme'
import type { PolyaPhase } from '@/lib/theme'
import { toRoman } from '@/lib/numerals'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Props {
  currentPhase: number            // 0=UNDERSTAND,1=PLAN,2=EXECUTE,3=REVIEW（或直接传 PolyaPhase 字符串）
  totalSubProblems: number
  currentSubProblemIndex: number
  insightPointCount: number
  insightPointLatest?: string
  showLongWarning?: boolean
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

/**
 * 阶段圆点颜色 — 全灰阶，不使用彩色 phase token。
 * 当前阶段：实心黑（--color-ink-primary）；已完成：深灰；未到达：淡灰。
 * 颜色语义通过填充/粗细/opacity 区分，见 stepper 渲染逻辑。
 */
// PHASE_COLOR 已移除（原 --color-phase-* 彩色 token，迁移到黑白灰 inline style）

/** 小问题号徽标 — 罗马数字版 */
function SubProblemBadge({ current, total }: { current: number; total: number }) {
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

/** 破题点显示 — 批改红下划线版 */
function InsightPointPill({ count, latest }: { count: number; latest?: string }) {
  const pill = (
    <span
      className={cn(
        'inline-flex items-baseline gap-1',
        'text-sm text-ink-primary',
        'cursor-default select-none',
      )}
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

  /* 只有 latest 存在时才包 Tooltip；否则直接渲染 span，避免多余包裹 */
  if (!latest) return pill

  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent>最新破题点：{latest}</TooltipContent>
    </Tooltip>
  )
}

/** 长对话警示 Toast */
function LongConversationToast() {
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

export function PolyaTopBar({
  currentPhase,
  totalSubProblems,
  currentSubProblemIndex,
  insightPointCount,
  insightPointLatest,
  showLongWarning = false,
}: Props) {
  // currentPhase 接受 0-3 的数字索引
  const currentPhaseIndex = Math.max(0, Math.min(3, currentPhase))
  const currentPolyaPhase = PHASE_ORDER[currentPhaseIndex]

  // EXECUTE 阶段才显示破题点下层
  const showInsightRow = currentPolyaPhase === 'EXECUTE'

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
                    // 当前阶段：实心黑 + 白 ring（灰阶，不用 phase 彩色）
                    ...(isCurrent ? {
                      backgroundColor: 'var(--color-ink-primary)',
                      boxShadow: `0 0 0 2px var(--color-paper-surface), 0 0 0 3.5px var(--color-ink-primary)`,
                    } : isDone ? {
                      // 已完成：实心深灰
                      backgroundColor: 'var(--color-ink-secondary)',
                    } : {
                      // 未到达：空心淡灰
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

        {/* 细竖线分隔（灰阶，不用 phase 彩色） */}
        <div
          className="w-px h-4 flex-shrink-0"
          style={{ backgroundColor: 'var(--color-ink-secondary)' }}
          aria-hidden
        />

        {/* 衬线阶段名 */}
        <span
          className="text-sm text-ink-primary"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          阶段 │ {PHASE_LABEL[currentPolyaPhase]}
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
