/**
 * P-105 知识卡片路由 — 从 useConversationStore.knowledgeCard 读数据并渲染。
 * 同时支持 done 和 partial-blocked 两种形态（由 scenario fixture 的 initialKnowledgeCard 决定）。
 * 对应 PRD P-105 知识点卡片。
 */
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useConversationStore } from '@/stores/useConversationStore'
import { SCENARIOS } from '@/mock/scenarios'
import { KnowledgeCard } from '@/components/KnowledgeCard'
import { PolyaTopBar } from '@/components/PolyaTopBar'
import { ChatBubble } from '@/components/ChatBubble'
import type { Message } from '@/mock/types'

function buildNodes(msgs: Message[]) {
  return msgs.map((m) => (
    <ChatBubble key={m.id} message={m} isStreaming={false} />
  ))
}

export function P105Card() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const {
    conversation,
    messages,
    knowledgeCard,
    loadScenario,
    emitKnowledgeCard,
  } = useConversationStore()

  // 加载 scenario fixture
  useEffect(() => {
    if (!scenarioId) return
    const sc = SCENARIOS[scenarioId]
    if (!sc) return

    loadScenario({
      initialConversation: sc.initialConversation,
      initialMessages: sc.initialMessages,
    })

    // 根据 scenarioId 注入对应知识卡数据
    if (scenarioId === 'p105-card-done') {
      import('@/mock/messages/p105-card-done').then(({ knowledgeCardData }) => {
        emitKnowledgeCard(knowledgeCardData)
      })
    } else if (scenarioId === 'p105-card-partial') {
      import('@/mock/messages/p105-card-partial').then(({ knowledgeCardData }) => {
        emitKnowledgeCard(knowledgeCardData)
      })
    }
  }, [scenarioId, loadScenario, emitKnowledgeCard])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-muted">
        加载中…
      </div>
    )
  }

  const currentSub = conversation.subProblems[conversation.currentSubProblemIndex]
  const insightPoints = currentSub?.insightPoints ?? []
  const latestInsight = insightPoints[insightPoints.length - 1]

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* 顶栏 */}
      <PolyaTopBar
        currentSubProblemIndex={conversation.currentSubProblemIndex}
        totalSubProblems={conversation.subProblems.length}
        currentPhase={conversation.currentPhase}
        insightPointCount={insightPoints.length}
        insightPointLatest={latestInsight}
      />

      {/* 消息列表 + 知识卡片 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-paper-canvas">
        <div className="max-w-2xl mx-auto">
          {buildNodes(messages)}

          {/* 知识卡片 */}
          {knowledgeCard ? (
            <div className="mt-6">
              <KnowledgeCard data={knowledgeCard} />
            </div>
          ) : (
            <div className="mt-6 p-4 bg-paper-surface border border-ink-line rounded-sm text-center">
              <p
                className="text-sm text-ink-muted"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                知识卡片加载中…
              </p>
            </div>
          )}

          {/* hasResolved 标志 */}
          {conversation.hasResolved && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="flex-1 max-w-xs h-px bg-ink-line" />
              <span
                className="text-xs text-ink-muted"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ※ 本题已完成
              </span>
              <div className="flex-1 max-w-xs h-px bg-ink-line" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
