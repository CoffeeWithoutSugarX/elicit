/**
 * 会话超长警示路由 — ChatLayout + LongConversationToast + 50+ 条消息列表。
 * 顶栏 showLongWarning=true 以展示 LongConversationToast 横幅。
 * 对应 PRD §10（≥ 50 轮触发）。
 */
import { useEffect } from 'react'
import { useConversationStore } from '@/stores/useConversationStore'
import { SCENARIOS } from '@/mock/scenarios'
import { ChatBubble } from '@/components/ChatBubble'
import { PolyaTopBar } from '@/components/PolyaTopBar'
import { ChatInput } from '@/components/ChatInput'
import type { Message } from '@/mock/types'

const SCENARIO_ID = 'long-conversation'

function buildNodes(msgs: Message[]) {
  return msgs.map((m) => (
    <ChatBubble key={m.id} message={m} isStreaming={false} />
  ))
}

export function LongConversation() {
  const { conversation, messages, loadScenario } = useConversationStore()

  useEffect(() => {
    const sc = SCENARIOS[SCENARIO_ID]
    if (!sc) return
    loadScenario({
      initialConversation: sc.initialConversation,
      initialMessages: sc.initialMessages,
    })
  }, [loadScenario])

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

  // 50+ 条消息视为超长会话
  const showLongWarning = messages.length >= 50

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* 顶栏（含超长警示横幅） */}
      <PolyaTopBar
        currentSubProblemIndex={conversation.currentSubProblemIndex}
        totalSubProblems={conversation.subProblems.length}
        currentPhase={conversation.currentPhase}
        insightPointCount={insightPoints.length}
        insightPointLatest={latestInsight}
        showLongWarning={showLongWarning}
      />

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-paper-canvas">
        <div className="max-w-2xl mx-auto">
          {/* 消息计数提示 */}
          <div className="text-center mb-4">
            <span
              className="text-[10px] text-ink-muted px-2"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              共 {messages.length} 条消息
            </span>
          </div>

          {buildNodes(messages)}
        </div>
      </div>

      {/* 输入框 */}
      <ChatInput
        onSubmit={() => {}}
        onImageClick={() => {}}
        imageButtonState="triggers-P106"
        disabled={false}
        placeholder="继续探讨…（演示模式，回复不生效）"
      />
    </div>
  )
}
