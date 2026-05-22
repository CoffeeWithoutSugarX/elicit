/**
 * Admin 单会话详情 — 完整消息列表 + KnowledgeCard（如有）+ 题目图（占位）。
 * 只读视图，不脱敏（PRD §10 P9）。
 * 对应 PRD US-015 详情页。
 */
import { useParams, Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/classNames'
import { ChatBubble } from '@/components/ChatBubble'
import { KnowledgeCard } from '@/components/KnowledgeCard'
import { MOCK_ADMIN_CONVERSATIONS } from '@/mock/conversations'
import { PHASE_LABEL } from '@/styles/theme'
import type { PolyaPhase } from '@/mock/types'
import type { KnowledgeCardData, Message } from '@/mock/types'

// ── 硬编码 mock 消息数据（对应已知 id 的 fixture）────────────────────────────
// 在真实应用中这些来自 API；原型中直接 import fixture 的 initialMessages
import {
  initialMessages as p105DoneMessages,
  knowledgeCardData as p105DoneCard,
} from '@/mock/messages/p105-card-done'
import {
  initialMessages as historyMessages,
  knowledgeCardData as historyCard,
} from '@/mock/messages/history-resume'
import { initialMessages as p104StuckMessages } from '@/mock/messages/p104-execute-stuck'
import { initialMessages as p104MultiMessages } from '@/mock/messages/p104-execute-multi-sub'
import { initialMessages as p104PlanMessages } from '@/mock/messages/p104-plan-deviation'
import {
  initialMessages as p105PartialMessages,
  knowledgeCardData as p105PartialCard,
} from '@/mock/messages/p105-card-partial'
import { initialMessages as p104ReviewMessages } from '@/mock/messages/p104-review'
import { initialMessages as longMessages } from '@/mock/messages/long-conversation'

const MESSAGE_MAP: Record<string, Message[]> = {
  'fixture-p105-done-0001': p105DoneMessages,
  'fixture-history-resume-0001': historyMessages,
  'fixture-p104-stuck-0001': p104StuckMessages,
  'fixture-p104-multi-sub-0001': p104MultiMessages,
  'fixture-p104-plan-dev-0001': p104PlanMessages,
  'fixture-p105-partial-0001': p105PartialMessages,
  'fixture-p104-review-0001': p104ReviewMessages,
  'fixture-long-conv-0001': longMessages,
}

const CARD_MAP: Record<string, KnowledgeCardData> = {
  'fixture-p105-done-0001': p105DoneCard,
  'fixture-history-resume-0001': historyCard,
  'fixture-p105-partial-0001': p105PartialCard,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ConversationDetail() {
  const { conversationId } = useParams<{ conversationId: string }>()

  const conv = MOCK_ADMIN_CONVERSATIONS.find((c) => c.id === conversationId)
  const sidebarInfo = MOCK_CONVERSATIONS.find((c) => c.id === conversationId)
  const messages: Message[] = conversationId ? (MESSAGE_MAP[conversationId] ?? []) : []
  const knowledgeCard: KnowledgeCardData | undefined = conversationId
    ? CARD_MAP[conversationId]
    : undefined

  if (!conv) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-vermilion transition-colors mb-6"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <ArrowLeft size={13} />
          返回列表
        </Link>
        <p className="text-ink-muted text-sm" style={{ fontFamily: 'var(--font-body)' }}>
          未找到会话 ID：{conversationId}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* 返回按钮 */}
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs text-ink-secondary hover:text-vermilion transition-colors mb-6"
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <ArrowLeft size={13} />
        返回列表
      </Link>

      {/* 会话元信息卡片 */}
      <div
        className={cn(
          'bg-paper-surface border border-ink-line rounded-sm shadow-paper-sm',
          'p-5 mb-6',
        )}
      >
        {/* 顶部装饰 */}
        <div
          className="flex items-center gap-2 text-ink-line mb-4"
          aria-hidden
        >
          <span>≡</span><span>≡</span><span>≡</span>
        </div>

        <h2
          className="text-lg text-ink-primary mb-3 leading-snug"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          {conv.title}
        </h2>

        <dl className="flex flex-wrap gap-x-8 gap-y-2 text-xs">
          <div>
            <dt
              className="text-ink-muted inline"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
            >
              用户邮箱:{' '}
            </dt>
            <dd className="inline text-ink-primary" style={{ fontFamily: 'var(--font-body)' }}>
              {conv.userEmail}
            </dd>
          </div>
          <div>
            <dt
              className="text-ink-muted inline"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
            >
              当前阶段:{' '}
            </dt>
            <dd className="inline text-ink-primary" style={{ fontFamily: 'var(--font-body)' }}>
              {conv.hasResolved ? '已完成' : PHASE_LABEL[conv.currentPhase as PolyaPhase]}
            </dd>
          </div>
          <div>
            <dt
              className="text-ink-muted inline"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
            >
              创建时间:{' '}
            </dt>
            <dd className="inline text-ink-primary" style={{ fontFamily: 'var(--font-body)' }}>
              {formatDate(conv.createdAt)}
            </dd>
          </div>
          <div>
            <dt
              className="text-ink-muted inline"
              style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
            >
              消息总数:{' '}
            </dt>
            <dd className="inline text-ink-primary" style={{ fontFamily: 'var(--font-body)' }}>
              {conv.messageCount} 条
            </dd>
          </div>
        </dl>

        {/* 题目图占位 */}
        <div className="mt-4 pt-4 border-t border-ink-line">
          <p
            className="text-[10px] text-ink-muted mb-2"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
          >
            题目图片（占位）
          </p>
          <div className="rounded-sm border border-ink-line overflow-hidden bg-paper-canvas" style={{ maxHeight: '160px' }}>
            <img
              src="/mock-images/sample-quadratic.svg"
              alt="题目图片（演示占位）"
              className="w-full object-contain"
              style={{ maxHeight: '160px' }}
            />
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="mb-6">
        <h3
          className="text-xs text-ink-secondary mb-3 tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
        >
          对话记录（{messages.length} 条）
        </h3>

        {messages.length === 0 ? (
          <div
            className="bg-paper-surface border border-ink-line rounded-sm p-4 text-center"
          >
            <p className="text-xs text-ink-muted" style={{ fontFamily: 'var(--font-body)' }}>
              （演示数据未包含此会话的消息记录）
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((m) => (
              <ChatBubble key={m.id} message={m} isStreaming={false} />
            ))}
          </div>
        )}
      </div>

      {/* 知识卡片（如有） */}
      {knowledgeCard && (
        <div className="mt-2">
          <h3
            className="text-xs text-ink-secondary mb-3 tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}
          >
            知识卡片
          </h3>
          <KnowledgeCard data={knowledgeCard} />
        </div>
      )}

      {/* 页脚分隔 */}
      <div className="flex items-center justify-center mt-8">
        <span className="text-ink-muted text-xs tracking-widest">——— ※ ———</span>
      </div>
      <p
        className="text-center text-[10px] text-ink-muted mt-2"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        Admin 只读视图 · 数据不脱敏（PRD §10 P9）
      </p>
    </div>
  )
}
