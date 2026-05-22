/**
 * P-104 Pólya 四阶段统一对话路由。
 * - useParams 拿 scenarioId
 * - useEffect 监听 scenarioId 变化 → loadScenario
 * - ChatInput.onSubmit：appendUserMessage → 消费 responses 队列 → fakeLlmStream 流式 → finalize
 * - 流式过程中 ChatInput 禁用
 * - 应用 phaseTransition / insightPointDelta / subProblemTransition / emitKnowledgeCard 到 store
 * - 处理 forceSignal：覆盖 response.signalAtEnd
 * - 阶段切换边界插入 SectionDivider（※ 分隔线）
 */
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router'
import { useConversationStore } from '@/stores/useConversationStore'
import { usePreviewStore } from '@/stores/usePreviewStore'
import { SCENARIOS } from '@/mock/scenarios'
import { fakeLlmStream } from '@/mock/fakeLlmStream'
import { PolyaTopBar } from '@/components/PolyaTopBar'
import { ChatBubble } from '@/components/ChatBubble'
import { ChatInput } from '@/components/ChatInput'
import { KnowledgeCard } from '@/components/KnowledgeCard'
import { SectionDivider } from '@/components/SectionDivider'
import type { Message } from '@/mock/types'

export function P104Phase() {
  const { scenarioId } = useParams<{ scenarioId: string }>()

  // 流式状态：当前正在 streaming 的 agent messageId（null = 空闲）
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const {
    conversation,
    messages,
    knowledgeCard,
    pendingResponseIndex,
    loadScenario,
    appendUserMessage,
    appendAgentChunk,
    finalizeAgentMessage,
    advancePhase,
    addInsightPoint,
    incrementStuckCount,
    switchSubProblem,
    emitKnowledgeCard,
    advancePendingIndex,
  } = useConversationStore()

  const { streamSpeed, setScenario, consumeAndClearForceSignal } = usePreviewStore()

  // ── scenario 切换 / 初次加载 ─────────────────────────────
  useEffect(() => {
    if (!scenarioId) return
    const sc = SCENARIOS[scenarioId]
    if (!sc) return

    setScenario(scenarioId)
    loadScenario({
      initialConversation: sc.initialConversation,
      initialMessages: sc.initialMessages,
    })
    setStreamingId(null)
  }, [scenarioId, loadScenario, setScenario])

  // ── 滚动到底部 ────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  // ── 校验 scenario 存在 ────────────────────────────────────
  const scenario = scenarioId ? SCENARIOS[scenarioId] : undefined
  if (!scenario) {
    return (
      <div className="flex-1 flex items-center justify-center text-ink-muted">
        Scenario not found: {scenarioId ?? '(none)'}
      </div>
    )
  }

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

  // ── 用户提交：消费下一条 response ─────────────────────────
  async function handleUserSubmit(text: string) {
    if (streamingId !== null) return
    if (!conversation) return

    appendUserMessage(text)

    // 取下一条预设响应
    const response = scenario!.responses[pendingResponseIndex]
    if (!response) {
      // 没有更多预设响应，结束
      return
    }

    // 准备 agent message id
    const agentMessageId = `msg-agent-${Date.now()}`
    setStreamingId(agentMessageId)

    try {
      await fakeLlmStream(response.content, {
        speed: streamSpeed,
        onChunk: (chunk) => appendAgentChunk(agentMessageId, chunk),
        onDone: () => {},
      })

      // 应用 phaseTransition（若有）
      if (response.phaseTransition) {
        advancePhase(response.phaseTransition)
      }

      // 应用 subProblemTransition（若有）
      if (response.subProblemTransition !== undefined) {
        switchSubProblem(response.subProblemTransition)
      }

      // 应用 insightPointDelta（若有）
      if (response.insightPointDelta) {
        addInsightPoint(
          conversation.currentSubProblemIndex,
          response.insightPointDelta.text,
        )
      }

      // 计算最终信号：forceSignal 覆盖 response.signalAtEnd
      const forced = consumeAndClearForceSignal()
      const finalSignal = forced ?? response.signalAtEnd ?? 'STAY'

      // STAY 信号 → stuckCount + 1（手动维护）
      if (finalSignal === 'STAY') {
        incrementStuckCount(conversation.currentSubProblemIndex, conversation.currentPhase)
      }

      // 应用 emitKnowledgeCard（若有）
      if (response.emitKnowledgeCard) {
        emitKnowledgeCard(response.emitKnowledgeCard)
      }

      finalizeAgentMessage(agentMessageId, finalSignal)
      advancePendingIndex()
    } catch (err) {
      // AbortError：流被中断
      if ((err as DOMException).name !== 'AbortError') {
        console.error('fakeLlmStream error:', err)
      }
    } finally {
      setStreamingId(null)
    }
  }

  function handleImageClick() {
    // P-106 触发占位：Batch 3 接换题确认浮层
    console.log('Image button clicked - P-106 trigger (Batch 3)')
  }

  // 历史已有消息（说明可能要走 P-106 换题流）
  const hasHistory = messages.length > 0
  const imageButtonState = hasHistory ? 'triggers-P106' : 'active'

  /**
   * 在消息列表中检测 phase 切换边界：
   * 当前消息的 phase 与上一条不同时，插入 SectionDivider。
   */
  function buildMessageNodes(msgs: Message[]) {
    const nodes: React.ReactNode[] = []
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i]
      const prev = msgs[i - 1]
      // 在 phase 切换边界（且非第一条）插入分隔线
      if (i > 0 && prev?.phase && m.phase && prev.phase !== m.phase) {
        nodes.push(<SectionDivider key={`divider-${i}`} />)
      }
      nodes.push(
        <ChatBubble
          key={m.id}
          message={m}
          isStreaming={m.id === streamingId}
        />
      )
    }
    return nodes
  }

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

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-paper-canvas">
        <div className="max-w-2xl mx-auto">
          {buildMessageNodes(messages)}

          {/* 知识点卡片（阶段④结束后） */}
          {knowledgeCard ? (
            <div className="mt-6">
              <KnowledgeCard data={knowledgeCard} />
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* 输入框 */}
      <ChatInput
        onSubmit={handleUserSubmit}
        onImageClick={handleImageClick}
        imageButtonState={imageButtonState}
        disabled={streamingId !== null}
      />
    </div>
  )
}
