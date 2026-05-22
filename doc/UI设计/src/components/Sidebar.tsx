/**
 * 左侧会话列表栏 — 纸面调性版本。
 * 深纸背景（--color-paper-deep）+ 浅边线 + Fraunces 标题 + 深墨蓝新建按钮。
 */
import { PlusCircle } from 'lucide-react'
import { cn } from '@/lib/classNames'

interface ConversationListItem {
  id: string
  title: string
  isActive: boolean
  createdAt: string
}

interface Props {
  conversations: ConversationListItem[]
  activeId?: string
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  newButtonHighlight?: boolean
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  newButtonHighlight = false,
}: Props) {
  return (
    <aside
      className={cn(
        'flex flex-col w-60 h-full flex-shrink-0',
        'bg-paper-deep border-r border-ink-line',
      )}
    >
      {/* 头部：品牌标题 + 新建按钮 */}
      <div className="p-4 border-b border-ink-line">
        {/* Fraunces 衬线品牌标题 */}
        <h1
          className="text-lg text-ink-primary mb-3 tracking-tight"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          引思助手
        </h1>
        <button
          type="button"
          onClick={onNewConversation}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2',
            'px-3 py-2 rounded-md',
            'bg-ink-deep text-paper-surface text-sm',
            'hover:opacity-90 transition-all',
            newButtonHighlight && 'ring-2 ring-ink-deep ring-offset-2',
          )}
          style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
        >
          <PlusCircle size={14} />
          新建对话
        </button>
      </div>

      {/* 会话列表 */}
      <nav className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <p
            className="text-ink-muted text-xs text-center px-2 py-4"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            还没有对话记录
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((c) => {
              const active = c.isActive || c.id === activeId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(c.id)}
                    className={cn(
                      'w-full text-left px-3 py-2 rounded-sm text-sm',
                      'transition-colors truncate',
                      active
                        ? 'bg-paper-surface text-ink-primary border-l-2 border-vermilion font-medium pl-2.5'
                        : 'text-ink-secondary hover:bg-paper-canvas hover:text-ink-primary',
                    )}
                    style={{ fontFamily: 'var(--font-body)' }}
                    title={c.title}
                  >
                    {c.title}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>
    </aside>
  )
}
