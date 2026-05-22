/**
 * Admin 跨用户会话列表 — 账本感 table。
 * 行间细横线 + 罗马数字编号 + PhaseSignalBadge 当前阶段。
 * 列：序号 / 用户邮箱 / 题目摘要 / 当前阶段 / 创建时间 / 操作。
 * 对应 PRD US-015（家长/监护人查阅列表）。
 */
import { Link } from 'react-router'
import { cn } from '@/lib/classNames'
import { toRoman } from '@/lib/numerals'
import { MOCK_ADMIN_CONVERSATIONS } from '@/mock/conversations'
import { PHASE_LABEL } from '@/styles/theme'
import type { PolyaPhase } from '@/mock/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 简单相位徽标（仅用于 Admin 列表，不依赖 signal） */
function PhaseBadge({ phase, hasResolved }: { phase: PolyaPhase; hasResolved: boolean }) {
  if (hasResolved) {
    return (
      <span
        className="inline-flex items-center pl-2 pr-1 py-0.5 text-xs text-signal-completed"
        style={{ borderLeft: '2px solid var(--color-signal-completed)', fontFamily: 'var(--font-display)' }}
      >
        已完成
      </span>
    )
  }
  const colorVar = {
    UNDERSTAND: 'var(--color-phase-understand)',
    PLAN: 'var(--color-phase-plan)',
    EXECUTE: 'var(--color-phase-execute)',
    REVIEW: 'var(--color-phase-review)',
  }[phase]
  return (
    <span
      className="inline-flex items-center pl-2 pr-1 py-0.5 text-xs text-ink-secondary"
      style={{ borderLeft: `2px solid ${colorVar}`, fontFamily: 'var(--font-display)' }}
    >
      {PHASE_LABEL[phase]}
    </span>
  )
}

export function ConversationList() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* 页头 */}
      <div className="mb-6">
        <h2
          className="text-xl text-ink-primary mb-1"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          全部对话记录
        </h2>
        <p
          className="text-xs text-ink-muted"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          共 {MOCK_ADMIN_CONVERSATIONS.length} 条
        </p>
      </div>

      {/* 账本 table */}
      <div
        className={cn(
          'bg-paper-surface border border-ink-line rounded-sm',
          'shadow-paper-sm overflow-hidden',
        )}
      >
        {/* 表头 */}
        <div
          className={cn(
            'grid gap-0 border-b border-ink-line',
            'bg-paper-deep',
          )}
          style={{ gridTemplateColumns: '40px 1fr 2fr 100px 120px 80px' }}
        >
          {['序', '用户邮箱', '题目摘要', '阶段', '创建时间', '操作'].map((h) => (
            <div
              key={h}
              className="px-3 py-2.5 text-[10px] text-ink-secondary"
              style={{
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {h}
            </div>
          ))}
        </div>

        {/* 数据行 */}
        {MOCK_ADMIN_CONVERSATIONS.map((conv, i) => (
          <div
            key={conv.id}
            className={cn(
              'grid gap-0 items-center',
              'border-b border-ink-line last:border-b-0',
              'hover:bg-paper-canvas transition-colors',
            )}
            style={{ gridTemplateColumns: '40px 1fr 2fr 100px 120px 80px' }}
          >
            {/* 序号（罗马数字） */}
            <div
              className="px-3 py-3 text-xs text-ink-muted text-center"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {toRoman(i + 1)}
            </div>

            {/* 用户邮箱 */}
            <div
              className="px-3 py-3 text-xs text-ink-secondary truncate"
              style={{ fontFamily: 'var(--font-body)' }}
              title={conv.userEmail}
            >
              {conv.userEmail}
            </div>

            {/* 题目摘要 */}
            <div
              className="px-3 py-3 text-xs text-ink-primary truncate"
              style={{ fontFamily: 'var(--font-body)' }}
              title={conv.title}
            >
              {conv.title}
              {conv.messageCount > 30 && (
                <span
                  className="ml-1.5 text-[9px] text-ink-muted"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  [{conv.messageCount} 条]
                </span>
              )}
            </div>

            {/* 当前阶段 */}
            <div className="px-3 py-3">
              <PhaseBadge phase={conv.currentPhase} hasResolved={conv.hasResolved} />
            </div>

            {/* 创建时间 */}
            <div
              className="px-3 py-3 text-[10px] text-ink-muted"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {formatDate(conv.createdAt)}
            </div>

            {/* 操作 */}
            <div className="px-3 py-3">
              <Link
                to={`/admin/${conv.id}`}
                className={cn(
                  'text-[11px] text-ink-secondary',
                  'hover:text-vermilion transition-colors',
                  'underline underline-offset-2',
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                查看
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* 底部说明 */}
      <div className="mt-4 flex items-center justify-center">
        <span className="text-ink-muted text-xs tracking-widest">——— ※ ———</span>
      </div>
      <p
        className="text-center text-[10px] text-ink-muted mt-2"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        数据为演示 mock，不含真实用户信息
      </p>
    </div>
  )
}
