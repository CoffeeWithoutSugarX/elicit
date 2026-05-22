/**
 * 历史会话恢复路由 — 查看已完成的历史对话（只读）。
 * imageButton 置灰（disabled 态）+ 完整消息历史 + KnowledgeCard。
 * 对应 PRD US-010 / US-017（历史查阅）。
 */
import { useEffect } from 'react'
import { useConversationStore } from '@/stores/useConversationStore'
import { SCENARIOS } from '@/mock/scenarios'
import { ChatBubble } from '@/components/ChatBubble'
import { PolyaTopBar } from '@/components/PolyaTopBar'
import { KnowledgeCard } from '@/components/KnowledgeCard'
import { ChatInput } from '@/components/ChatInput'
import type { Message } from '@/mock/types'
import { SectionDivider } from '@/components/SectionDivider'

const SCENARIO_ID = 'history-resume'

function buildMessageNodes(msgs: Message[]) {
  const nodes: React.ReactNode[] = []
  for (let i = 0; i < msgs.length; i++) {
    const m = msgs[i]
    const prev = msgs[i - 1]
    if (i > 0 && prev?.phase && m.phase && prev.phase !== m.phase) {
      nodes.push(<SectionDivider key={`divider-${i}`} />)
    }
    nodes.push(<ChatBubble key={m.id} message={m} isStreaming={false} />)
  }
  return nodes
}

export function HistoryResume() {
  const { conversation, messages, knowledgeCard, loadScenario, emitKnowledgeCard } =
    useConversationStore()

  useEffect(() => {
    const sc = SCENARIOS[SCENARIO_ID]
    if (!sc) return
    loadScenario({
      initialConversation: sc.initialConversation,
      initialMessages: sc.initialMessages,
    })
    // 加载历史会话的知识卡
    import('@/mock/messages/history-resume').then(({ knowledgeCardData }) => {
      emitKnowledgeCard(knowledgeCardData)
    })
  }, [loadScenario, emitKnowledgeCard])

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

      {/* 历史只读横幅 */}
      <div
        className="px-4 py-2 bg-paper-deep border-b border-ink-line flex items-center justify-center"
      >
        <p
          className="text-xs text-ink-muted"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
        >
          ※ 历史对话（只读）· 2026-05-20
        </p>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-paper-canvas">
        <div className="max-w-2xl mx-auto">
          {buildMessageNodes(messages)}

          {/* 知识卡片 */}
          {knowledgeCard && (
            <div className="mt-6">
              <KnowledgeCard data={knowledgeCard} />
            </div>
          )}
        </div>
      </div>

      {/* 底部输入框：disabled，imageButton 置灰 */}
      <ChatInput
        onSubmit={() => {}}
        onImageClick={() => {}}
        imageButtonState="disabled"
        disabled={true}
      />
    </div>
  )
}
