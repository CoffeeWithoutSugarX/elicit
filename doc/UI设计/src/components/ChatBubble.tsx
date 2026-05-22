/**
 * 三态消息气泡：user / agent / system。
 * 支持内嵌 LaTeX：检测 $...$ / $$...$$ 分隔符并分段渲染。
 * isStreaming=true 时在尾部显示块状光标（▍，ink-deep 色闪烁）。
 *
 * 设计：
 * - user：右对齐，bg-paper-deep，无 border / shadow，rounded-lg
 * - agent：左对齐，无背景，左侧 2px ink-deep 细线，pl-4
 * - system：居中纯文字，无气泡
 */
import { Fragment } from 'react'
import { cn } from '@/lib/classNames'
import { parseLatexSegments } from '@/lib/katexHelpers'
import { formatRelativeTime } from '@/lib/relativeTime'
import { LatexRender } from './LatexRender'
import { PHASE_LABEL } from '@/styles/theme'
import type { Message } from '@/mock/types'

interface Props {
  message: Message
  isStreaming?: boolean
}

/** 将一段含 LaTeX 的字符串渲染为 React 节点序列 */
function renderContent(content: string) {
  const segments = parseLatexSegments(content)
  return segments.map((seg, idx) => {
    if (seg.type === 'latex-block') {
      return <LatexRender key={idx} tex={seg.content} display="block" />
    }
    if (seg.type === 'latex-inline') {
      return <LatexRender key={idx} tex={seg.content} display="inline" />
    }
    // 普通文本：保留换行
    return (
      <Fragment key={idx}>
        {seg.content.split('\n').map((line, i, arr) => (
          <Fragment key={i}>
            {line}
            {i < arr.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </Fragment>
    )
  })
}

/** agent 气泡顶部阶段 badge（可选） */
function PhaseBadge({ message }: { message: Message }) {
  const phase = message.phase
  const meta = message.metadata as Record<string, unknown> | undefined
  const subProblemIndex =
    typeof meta?.subProblemIndex === 'number' ? meta.subProblemIndex : undefined
  const total = typeof meta?.total === 'number' ? meta.total : undefined

  if (!phase) return null

  const phaseLabel = PHASE_LABEL[phase as keyof typeof PHASE_LABEL] ?? phase

  let badgeText = phaseLabel
  if (subProblemIndex !== undefined && total !== undefined) {
    badgeText = `${phaseLabel} · 小问 ${subProblemIndex + 1}/${total}`
  } else if (subProblemIndex !== undefined) {
    badgeText = `${phaseLabel} · 小问 ${subProblemIndex + 1}`
  }

  return (
    <div
      className="mb-1 text-ink-muted"
      style={{
        fontSize: '10px',
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.06em',
      }}
    >
      {badgeText}
    </div>
  )
}

export function ChatBubble({ message, isStreaming }: Props) {
  const { role, content } = message

  // system 消息：居中纯文字，无气泡背景
  if (role === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span
          className="text-ink-muted text-xs tracking-wide px-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {content}
        </span>
      </div>
    )
  }

  const isUser = role === 'user'
  const timestamp = formatRelativeTime(message.createdAt)

  if (isUser) {
    return (
      <div className="group flex w-full my-2.5 justify-end">
        <div className="relative max-w-[78%]">
          <div
            className="px-4 py-3 text-base leading-relaxed rounded-lg"
            style={{
              backgroundColor: 'var(--color-paper-deep)',
              color: 'var(--color-ink-primary)',
              fontFamily: 'var(--font-body)',
            }}
          >
            <div className="break-words">
              {renderContent(content)}
            </div>
          </div>
          {/* hover 时右下角显示时间戳 */}
          {timestamp ? (
            <div
              className={cn(
                'absolute -bottom-4 right-0',
                'text-[10px] text-ink-muted',
                'opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap',
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {timestamp}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  // agent 气泡：无背景，左侧 2px 细线
  return (
    <div className="group flex w-full my-2.5 justify-start">
      <div className="relative max-w-[78%]">
        <div
          className="pl-4 pr-4 py-2 text-base leading-relaxed"
          style={{
            borderLeft: '2px solid var(--color-ink-deep)',
            color: 'var(--color-ink-primary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <PhaseBadge message={message} />
          <div className="break-words">
            {renderContent(content)}
            {isStreaming ? (
              // 块状光标，ink-deep 色闪烁
              <span
                className="inline-block ml-0.5 align-middle animate-pulse"
                style={{ color: 'var(--color-ink-deep)', fontSize: '1em', lineHeight: 1 }}
                aria-hidden
              >
                ▍
              </span>
            ) : null}
          </div>
        </div>
        {/* hover 时右下角显示时间戳 */}
        {timestamp ? (
          <div
            className={cn(
              'absolute -bottom-4 right-0',
              'text-[10px] text-ink-muted',
              'opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {timestamp}
          </div>
        ) : null}
      </div>
    </div>
  )
}
