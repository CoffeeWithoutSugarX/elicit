/**
 * P-106 换题确认浮层 — 叠加于 ChatLayout 之上的 overlay。
 * fixed 全屏遮罩 + 中央纸面卡片 + 「换一道」/「取消」。
 * 对应 PRD P-106 / US-016（换题流程）。
 */
import { useEffect } from 'react'
import { useParams } from 'react-router'
import { useConversationStore } from '@/stores/useConversationStore'
import { SCENARIOS } from '@/mock/scenarios'
import { ChatBubble } from '@/components/ChatBubble'
import { PolyaTopBar } from '@/components/PolyaTopBar'
import { cn } from '@/lib/classNames'
import { useState } from 'react'

export function P106SwapConfirm() {
  const { scenarioId } = useParams<{ scenarioId: string }>()
  const { conversation, messages, loadScenario } = useConversationStore()

  const [overlayOpen, setOverlayOpen] = useState(true)
  const [swapped, setSwapped] = useState(false)

  useEffect(() => {
    if (!scenarioId) return
    const sc = SCENARIOS[scenarioId]
    if (!sc) return
    loadScenario({
      initialConversation: sc.initialConversation,
      initialMessages: sc.initialMessages,
    })
    setOverlayOpen(true)
    setSwapped(false)
  }, [scenarioId, loadScenario])

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
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
      {/* 背景：完整的历史对话内容 */}
      <PolyaTopBar
        currentSubProblemIndex={conversation.currentSubProblemIndex}
        totalSubProblems={conversation.subProblems.length}
        currentPhase={conversation.currentPhase}
        insightPointCount={insightPoints.length}
        insightPointLatest={latestInsight}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 bg-paper-canvas">
        <div className="max-w-2xl mx-auto">
          {messages.map((m) => (
            <ChatBubble key={m.id} message={m} isStreaming={false} />
          ))}
        </div>
      </div>

      {/* 换题确认浮层 */}
      {overlayOpen && !swapped && (
        <div
          className="absolute inset-0 bg-ink-primary/30 flex items-center justify-center p-6 z-20"
          role="dialog"
          aria-modal="true"
          aria-label="换题确认"
        >
          <div
            className={cn(
              'w-full max-w-sm',
              'bg-paper-surface border border-ink-line rounded-md',
              'shadow-paper-lg',
            )}
          >
            {/* 卡片顶部 */}
            <div className="px-6 pt-6 pb-4">
              {/* 顶部装饰 */}
              <div
                className="flex items-center gap-2 text-ink-line mb-4"
                aria-hidden
              >
                <span>≡</span>
                <span>≡</span>
                <span>≡</span>
              </div>

              <h2
                className="text-base text-ink-primary mb-2"
                style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
              >
                换一道题？
              </h2>
              <p
                className="text-sm text-ink-secondary leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                这道题会保留在侧边栏，方便你随时回顾。换了新题后，当前对话进入只读历史模式。
              </p>
            </div>

            {/* 分隔 */}
            <div className="mx-6 h-px bg-ink-line" />

            {/* 按钮区 */}
            <div className="flex gap-3 px-6 py-4">
              <button
                type="button"
                onClick={() => setOverlayOpen(false)}
                className={cn(
                  'flex-1 py-2.5 text-sm rounded-sm',
                  'border border-ink-line',
                  'text-ink-secondary bg-paper-canvas',
                  'hover:border-ink-secondary transition-colors',
                )}
                style={{ fontFamily: 'var(--font-body)' }}
              >
                取消
              </button>

              <button
                type="button"
                onClick={() => setSwapped(true)}
                className={cn(
                  'flex-1 py-2.5 rounded-md text-sm',
                  'bg-vermilion text-paper-surface',
                  'hover:opacity-90 transition-opacity',
                  'shadow-paper-sm',
                )}
                style={{
                  fontFamily: 'var(--font-display)',
                  fontFeatureSettings: '"smcp"',
                  letterSpacing: '0.05em',
                }}
              >
                换一道
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 换题成功提示 */}
      {swapped && (
        <div className="absolute inset-0 bg-ink-primary/20 flex items-center justify-center z-20">
          <div
            className="bg-paper-surface border border-ink-line rounded-md p-8 shadow-paper-lg text-center max-w-xs"
          >
            <p
              className="text-2xl text-ink-primary mb-2"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ✓
            </p>
            <p
              className="text-sm text-ink-secondary"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              已切换，旧题已存档到侧边栏。
            </p>
            <button
              type="button"
              onClick={() => { setSwapped(false); setOverlayOpen(true) }}
              className="mt-4 text-xs text-ink-muted underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              返回演示
            </button>
          </div>
        </div>
      )}

      {/* 浮层关闭后，重新触发按钮 */}
      {!overlayOpen && !swapped && (
        <div className="absolute bottom-20 right-6 z-10">
          <button
            type="button"
            onClick={() => setOverlayOpen(true)}
            className={cn(
              'px-4 py-2 text-xs rounded-sm',
              'bg-paper-surface border border-vermilion text-vermilion',
              'shadow-paper-sm hover:bg-paper-deep transition-colors',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            再次触发换题浮层
          </button>
        </div>
      )}
    </div>
  )
}
