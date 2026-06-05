'use client'

/**
 * Pólya 双层顶栏 — 数学笔记本风。
 * 最上层：4 阶段横向 stepper（理解→规划→执行→回顾）
 * 中层：罗马题号（IBM Plex Mono）+ 细竖分隔 + 衬线阶段名（totalSubProblems >= 2 时才显示题号）
 * 下层：仅 EXECUTE 阶段显示破题点行
 * 已迁移至 shadcn 标准 token（background/card/border/foreground/muted-foreground）
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
  DONE:       '完成',  // 终态不作为第五个 stepper 圆圈渲染，仅满足类型约束
}

/**
 * 阶段圆圈 stepper 颜色说明（全灰阶，不使用彩色 phase token）：
 * - 已完成：实心 muted-foreground + 白色 ✓
 * - 当前：实心 foreground + 白色序号 + ring
 * - 未到达：透明底 + border 描边 + muted-foreground 序号
 */

/** 小问题号徽标 — 仅在 totalSubProblems >= 2 时由父组件渲染 */
function SubProblemBadge({ current, total }: { current: number; total: number }) {
  const currentRoman = toRoman(current)
  const totalRoman   = toRoman(total)

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5',
        'text-xs text-muted-foreground',
        'border border-border rounded-sm',
        'bg-card',
      )}
      style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
    >
      {currentRoman} / {totalRoman}
    </span>
  )
}

/** 破题点显示 — 批改红下划线版 */
function InsightPointPill({ count, latest }: { count: number; latest?: string }) {
  const pill = (
    <span
      className={cn(
        'inline-flex items-baseline gap-1',
        'text-sm text-foreground',
        'cursor-default select-none',
      )}
    >
      <span className="text-muted-foreground text-xs" style={{ fontFamily: 'var(--font-body)' }}>
        破题点
      </span>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          textDecorationLine: 'underline',
          textDecorationColor: 'var(--color-foreground)',
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
        'bg-background text-foreground text-sm',
        'border-b border-border',
      )}
      style={{
        borderLeft: '3px solid var(--color-foreground)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <span>对话已较长，建议新建对话以获得更好体验</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
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
  // currentPhase 接受 0-3（进行中）或 4（DONE 终态）
  // clamp 上限放宽到 4：DONE 时 currentPhaseIndex=4，PHASE_ORDER[4] 为 undefined，故兜底为 'DONE'
  const currentPhaseIndex = Math.max(0, Math.min(4, currentPhase))
  const currentPolyaPhase = PHASE_ORDER[currentPhaseIndex] ?? 'DONE'

  // EXECUTE 阶段才显示破题点下层；DONE 时 currentPolyaPhase === 'DONE'，自然为 false
  const showInsightRow = currentPolyaPhase === 'EXECUTE'

  // totalSubProblems >= 2 时才显示题号徽标及竖分隔线（单题/未知题数不显示，避免误导）
  const showBadge = totalSubProblems >= 2

  return (
    <div
      className={cn(
        'flex flex-col',
        'bg-card border-b border-border',
      )}
    >
      {showLongWarning ? <LongConversationToast /> : null}

      {/* 最上层：4 阶段横向 stepper — 编号圆圈横向版 */}
      <div
        className="flex items-center justify-center gap-0 px-4 pt-3 pb-2"
        role="progressbar"
        aria-label="Pólya 阶段进度"
        aria-valuenow={Math.min(currentPhaseIndex + 1, 4)}
        aria-valuemin={1}
        aria-valuemax={4}
      >
        {PHASE_ORDER.map((phase, idx) => {
          const isDone = idx < currentPhaseIndex
          const isCurrent = idx === currentPhaseIndex
          const isUpcoming = idx > currentPhaseIndex
          // 连线已完成：连线在圆圈右侧且左侧阶段已完成
          const lineCompleted = idx < currentPhaseIndex
          const isLast = idx === PHASE_ORDER.length - 1

          return (
            <div key={phase} className="flex items-center">
              {/* 圆圈 + 阶段名（纵向排列） */}
              <div className="flex flex-col items-center" style={{ gap: '6px' }}>
                {/* 圆圈：直径 20px（当前态 22px），含序号或对勾 */}
                <div
                  className={cn(
                    'flex-shrink-0 flex items-center justify-center',
                    'transition-all duration-300',
                  )}
                  style={{
                    width: isCurrent ? '22px' : '20px',
                    height: isCurrent ? '22px' : '20px',
                    borderRadius: '50%',
                    // 当前阶段：实心黑 + ring（灰阶，不用 phase 彩色）
                    ...(isCurrent ? {
                      backgroundColor: 'var(--color-foreground)',
                      boxShadow: `0 0 0 2px var(--color-card), 0 0 0 3.5px var(--color-foreground)`,
                    } : isDone ? {
                      // 已完成：实心深灰
                      backgroundColor: 'var(--color-muted-foreground)',
                    } : {
                      // 未到达：透明底 + 描边
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-border)',
                    }),
                  }}
                  aria-hidden
                >
                  {/* 已完成：白色对勾；当前/未到达：序号 */}
                  {isDone ? (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '11px',
                        lineHeight: 1,
                        color: 'white',
                        fontWeight: 700,
                        userSelect: 'none',
                      }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span
                      className="font-mono"
                      style={{
                        fontSize: '11px',
                        lineHeight: 1,
                        color: isCurrent ? 'white' : 'var(--color-muted-foreground)',
                        fontWeight: isCurrent ? 700 : 400,
                        userSelect: 'none',
                        opacity: isUpcoming ? 0.7 : 1,
                      }}
                    >
                      {idx + 1}
                    </span>
                  )}
                </div>

                {/* 阶段名标签：移到圆圈下方，字号 13px，衬线体 */}
                <span
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '13px',
                    lineHeight: '16px',
                    color: isCurrent
                      ? 'var(--color-foreground)'
                      : 'var(--color-muted-foreground)',
                    fontWeight: isCurrent ? 600 : 400,
                    opacity: isUpcoming ? 0.55 : 1,
                    letterSpacing: '0.02em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {PHASE_SHORT_LABEL[phase]}
                </span>
              </div>

              {/* 连接线（最后一个圆圈右侧无连线）— 垂直居中对齐圆圈中心 */}
              {!isLast ? (
                <div
                  style={{
                    width: '40px',
                    height: '1.5px',
                    // 补偿下方标签高度（约 22px = 16px line-height + 6px gap）
                    // 使连线垂直对齐圆圈中心而非标签底部
                    marginBottom: '22px',
                    backgroundColor: lineCompleted
                      ? 'var(--color-muted-foreground)'
                      : 'var(--color-border)',
                    opacity: lineCompleted ? 1 : 0.3,
                    transition: 'all 300ms',
                  }}
                  aria-hidden
                />
              ) : null}
            </div>
          )
        })}
      </div>

      {/* 中层：罗马题号（totalSubProblems >= 2 才显示）+ 细竖线 + 衬线阶段名 */}
      <div className="flex items-center gap-3 px-4 py-2">
        {showBadge ? (
          <>
            <SubProblemBadge
              current={currentSubProblemIndex + 1}
              total={totalSubProblems}
            />

            {/* 细竖线分隔（灰阶，不用 phase 彩色）*/}
            <div
              className="w-px h-4 flex-shrink-0"
              style={{ backgroundColor: 'var(--color-muted-foreground)' }}
              aria-hidden
            />
          </>
        ) : null}

        {/* 衬线阶段名 */}
        <span
          className="text-sm text-foreground"
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
