/**
 * 三态消息气泡：user / agent / system。
 * 支持内嵌 LaTeX：检测 $...$ / $$...$$ 分隔符并分段渲染。
 * isStreaming=true 时在尾部显示钢笔尖光标（✎ 朱砂色闪烁）。
 *
 * 纸条角风格：
 * - user：深墨蓝底 + 象牙字 + 微右倾（0.4deg）
 * - agent：纸面底 + 浅边线 + 纸阴影 + 微左倾（-0.3deg）
 * - system：居中纯文字，SectionDivider 风格
 */
import { Fragment } from 'react'
import { cn } from '@/lib/classNames'
import { parseLatexSegments } from '@/lib/katexHelpers'
import { LatexRender } from './LatexRender'
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

  return (
    <div className={cn('flex w-full my-2.5', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[78%] px-4 py-3 text-base leading-relaxed',
          isUser
            ? [
                'bg-ink-deep text-paper-surface',
                'rounded-sm',
              ].join(' ')
            : [
                'bg-paper-surface text-ink-primary',
                'border border-ink-line',
                'rounded-sm shadow-paper-md',
              ].join(' '),
        )}
        style={{
          transform: isUser ? 'rotate(0.4deg)' : 'rotate(-0.3deg)',
        }}
      >
        <div className="break-words" style={{ fontFamily: 'var(--font-body)' }}>
          {renderContent(content)}
          {isStreaming ? (
            // 钢笔尖光标：✎ 朱砂色闪烁
            <span
              className="inline-block ml-0.5 align-middle animate-pulse"
              style={{ color: 'var(--color-vermilion)', fontSize: '1em' }}
              aria-hidden
            >
              ✎
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
