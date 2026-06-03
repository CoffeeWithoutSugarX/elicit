'use client'

/**
 * 左侧会话列表栏 — 主题中性版本。
 * bg-paper-canvas + 右侧 border-r + 纯文字品牌标题 + 幽灵新建按钮。
 * 会话列表按时间分组（今天 / 昨天 / 本周 / 更早），双行布局（标题 + 副标题）。
 * 底部固定用户区（首字母头像 + 邮箱 + 设置图标）。
 */
import type React from 'react'
import { Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/relativeTime'
import { PHASE_LABEL } from '@/lib/theme'
import type { PolyaPhase } from '@/lib/theme'
import { parseLatexSegments } from '@/lib/katexHelpers'
import { LatexRender } from '@/components/LatexRender'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface ConversationListItem {
  id: string
  title: string
  isActive: boolean
  createdAt: string
  /** 可选，用于副标题显示阶段标签 */
  currentPhase?: PolyaPhase
}

interface Props {
  conversations: ConversationListItem[]
  activeId?: string
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  newButtonHighlight?: boolean
  /** 当前登录用户邮箱，用于底部用户区显示 */
  userEmail?: string
}

/** 按时间分组标签 */
type TimeGroup = '今天' | '昨天' | '本周' | '更早'

function getTimeGroup(createdAt: string): TimeGroup {
  const date = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / 86_400_000)

  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isSameDay) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays <= 7) return '本周'
  return '更早'
}

const GROUP_ORDER: TimeGroup[] = ['今天', '昨天', '本周', '更早']

interface GroupedConversations {
  label: TimeGroup
  items: ConversationListItem[]
}

function groupConversations(conversations: ConversationListItem[]): GroupedConversations[] {
  const map = new Map<TimeGroup, ConversationListItem[]>()

  for (const c of conversations) {
    const g = getTimeGroup(c.createdAt)
    if (!map.has(g)) map.set(g, [])
    map.get(g)!.push(c)
  }

  return GROUP_ORDER.map((label) => ({
    label,
    items: map.get(label) ?? [],
  })).filter((g) => g.items.length > 0)
}

/**
 * 将含 $...$ 的标题/副标题字符串渲染为 React 节点序列。
 * 块级 $$...$$ 在侧边栏单行场景没有意义，统一按 inline 处理。
 */
function renderTitleWithLatex(text: string): React.ReactNode {
  const segments = parseLatexSegments(text)
  return segments.map((seg, idx) => {
    if (seg.type === 'latex-inline' || seg.type === 'latex-block') {
      return <LatexRender key={idx} tex={seg.content} display="inline" />
    }
    return <span key={idx}>{seg.content}</span>
  })
}

/** 邮箱前缀首字母大写 */
function getInitial(email: string): string {
  const prefix = email.split('@')[0] ?? ''
  return (prefix[0] ?? '妹').toUpperCase()
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  newButtonHighlight = false,
  userEmail = 'lxinlucas@gmail.com',
}: Props) {
  const groups = groupConversations(conversations)
  const initial = getInitial(userEmail)

  return (
    <aside
      className="flex flex-col w-60 h-full flex-shrink-0"
      style={{
        backgroundColor: 'var(--color-paper-canvas)',
        borderRight: '1px solid var(--color-ink-line)',
      }}
    >
      {/* 品牌区 */}
      <div
        className="h-14 px-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-ink-line)' }}
      >
        <span
          className="text-lg font-semibold"
          style={{ color: 'var(--color-ink-primary)', fontFamily: 'var(--font-body)' }}
        >
          引思
        </span>
        <span
          className="text-xs"
          style={{ color: 'var(--color-ink-muted)' }}
        >
          ·
        </span>
      </div>

      {/* 新建对话按钮区 */}
      <div className="p-3 flex-shrink-0">
        <button
          type="button"
          onClick={onNewConversation}
          className={cn(
            'w-full inline-flex items-center justify-center gap-1.5',
            'px-3 py-2 rounded-md text-sm transition-all',
            newButtonHighlight && 'ring-2 ring-offset-2',
          )}
          style={{
            background: 'transparent',
            border: '1px solid var(--color-ink-line)',
            color: 'var(--color-ink-secondary)',
            fontFamily: 'var(--font-body)',
            fontWeight: 500,
            // ring 色用 inline style 兜底 Tailwind 无法动态生成的颜色
            ...(newButtonHighlight
              ? { outline: '2px solid var(--color-ink-deep)', outlineOffset: '2px' }
              : {}),
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.backgroundColor = 'var(--color-paper-deep)'
            el.style.borderColor = 'var(--color-ink-secondary)'
            el.style.color = 'var(--color-ink-primary)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.backgroundColor = 'transparent'
            el.style.borderColor = 'var(--color-ink-line)'
            el.style.color = 'var(--color-ink-secondary)'
          }}
        >
          <Plus size={14} />
          新对话
        </button>
      </div>

      {/* 会话列表区 */}
      <nav
        className="flex-1 overflow-y-auto px-2 py-2"
      >
        {conversations.length === 0 ? (
          <p
            className="text-xs text-center px-2 py-4"
            style={{ color: 'var(--color-ink-muted)', fontFamily: 'var(--font-body)' }}
          >
            还没有对话记录
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <div key={group.label}>
                {/* 组标题 */}
                <div
                  className="px-3 py-1.5 uppercase tracking-widest"
                  style={{
                    fontSize: '10px',
                    color: 'var(--color-ink-muted)',
                    fontFamily: 'var(--font-body)',
                    letterSpacing: '0.1em',
                  }}
                >
                  {group.label}
                </div>
                {/* 会话项列表 */}
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((c) => {
                    const active = c.isActive || c.id === activeId
                    // 副标题：有阶段显示阶段，否则相对时间
                    const subtitle = c.currentPhase
                      ? PHASE_LABEL[c.currentPhase]
                      : formatRelativeTime(c.createdAt)

                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => onSelectConversation(c.id)}
                          className="w-full text-left px-3 py-2 rounded-md transition-colors"
                          style={{
                            backgroundColor: active
                              ? 'var(--color-paper-deep)'
                              : 'transparent',
                            fontFamily: 'var(--font-body)',
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.backgroundColor =
                                'color-mix(in srgb, var(--color-paper-deep) 50%, transparent)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.backgroundColor = 'transparent'
                            }
                          }}
                          title={c.title}
                        >
                          {/* 第一行：标题 */}
                          <div
                            className="truncate text-sm"
                            style={{
                              color: 'var(--color-ink-primary)',
                              fontWeight: active ? 500 : 400,
                            }}
                          >
                            {renderTitleWithLatex(c.title)}
                          </div>
                          {/* 第二行：副标题 */}
                          {subtitle ? (
                            <div
                              className="truncate mt-0.5"
                              style={{
                                fontSize: '11px',
                                color: 'var(--color-ink-muted)',
                              }}
                            >
                              {renderTitleWithLatex(subtitle)}
                            </div>
                          ) : null}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* 底部用户区 */}
      <div
        className="flex-shrink-0 px-3 py-3 flex items-center gap-2"
        style={{ borderTop: '1px solid var(--color-ink-line)' }}
      >
        {/* 首字母头像 */}
        <Avatar size="sm" className="flex-shrink-0">
          <AvatarFallback className="bg-foreground text-background font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
        {/* 邮箱缩写 */}
        <span
          className="flex-1 truncate text-xs"
          style={{
            color: 'var(--color-ink-secondary)',
            fontFamily: 'var(--font-body)',
          }}
        >
          {userEmail}
        </span>
        {/* 设置图标 */}
        <button
          type="button"
          className="flex-shrink-0 transition-colors"
          style={{ color: 'var(--color-ink-muted)', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-ink-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-ink-muted)' }}
          aria-label="设置"
        >
          <Settings size={14} />
        </button>
      </div>
    </aside>
  )
}
