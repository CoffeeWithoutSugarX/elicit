/**
 * 会话状态 Zustand store。
 * 镜像主项目 useConversation zustand 形态，含 B4 subProblems / insightPoints。
 */
import { create } from 'zustand'
import type {
  ConversationState,
  Message,
  PolyaPhase,
  PhaseSignal,
  KnowledgeCardData,
} from '@/mock/types'

// ──────────────────────────────────────────────────────────────
// State & Actions 类型
// ──────────────────────────────────────────────────────────────

interface ConversationStoreState {
  conversation: ConversationState | null
  messages: Message[]
  knowledgeCard: KnowledgeCardData | null
  /** 下一条 responses 队列指针 */
  pendingResponseIndex: number
}

interface ConversationStoreActions {
  loadScenario(state: {
    initialConversation: ConversationState
    initialMessages: Message[]
  }): void
  reset(): void
  appendUserMessage(text: string): string
  /** 流式追加：向指定 messageId 的 agent 消息追加一段文本 */
  appendAgentChunk(messageId: string, chunk: string): void
  /** 流式结束：标记消息完成 + 更新阶段信号 */
  finalizeAgentMessage(messageId: string, signal: PhaseSignal): void
  advancePhase(phase: PolyaPhase): void
  addInsightPoint(subProblemIndex: number, text: string): void
  incrementStuckCount(subProblemIndex: number, phase: PolyaPhase): void
  switchSubProblem(index: number): void
  emitKnowledgeCard(data: KnowledgeCardData): void
  setHasResolved(value: boolean): void
  /** 增加 pendingResponseIndex（消费一条 response） */
  advancePendingIndex(): void
}

type ConversationStore = ConversationStoreState & ConversationStoreActions

// ──────────────────────────────────────────────────────────────
// 初始 state
// ──────────────────────────────────────────────────────────────

const INITIAL_STATE: ConversationStoreState = {
  conversation: null,
  messages: [],
  knowledgeCard: null,
  pendingResponseIndex: 0,
}

// ──────────────────────────────────────────────────────────────
// Store 实例
// ──────────────────────────────────────────────────────────────

export const useConversationStore = create<ConversationStore>()((set, get) => ({
  ...INITIAL_STATE,

  loadScenario({ initialConversation, initialMessages }) {
    // 先 reset 再注入，避免残留
    set({
      conversation: structuredClone(initialConversation),
      messages: structuredClone(initialMessages),
      knowledgeCard: null,
      pendingResponseIndex: 0,
    })
  },

  reset() {
    set({ ...INITIAL_STATE })
  },

  appendUserMessage(text) {
    const messageId = `msg-user-${Date.now()}`
    const msg: Message = {
      id: messageId,
      role: 'user',
      content: text,
      streamingDone: true,
      createdAt: new Date().toISOString(),
    }
    set((s) => ({ messages: [...s.messages, msg] }))
    return messageId
  },

  appendAgentChunk(messageId, chunk) {
    set((s) => {
      const idx = s.messages.findIndex((m) => m.id === messageId)
      if (idx === -1) {
        // 第一个 chunk：新建消息
        const { conversation } = get()
        const phase = conversation?.currentPhase
        const newMsg: Message = {
          id: messageId,
          role: 'agent',
          content: chunk,
          phase,
          streamingDone: false,
          createdAt: new Date().toISOString(),
        }
        return { messages: [...s.messages, newMsg] }
      }

      // 后续 chunk：追加
      const updated = s.messages.map((m, i) =>
        i === idx ? { ...m, content: m.content + chunk } : m,
      )
      return { messages: updated }
    })
  },

  finalizeAgentMessage(messageId, _signal) {
    set((s) => {
      const updated = s.messages.map((m) =>
        m.id === messageId ? { ...m, streamingDone: true } : m,
      )
      return { messages: updated }
    })
  },

  advancePhase(phase) {
    set((s) => {
      if (!s.conversation) return {}
      return {
        conversation: { ...s.conversation, currentPhase: phase },
      }
    })
  },

  addInsightPoint(subProblemIndex, text) {
    set((s) => {
      if (!s.conversation) return {}
      const subProblems = s.conversation.subProblems.map((sp, i) =>
        i === subProblemIndex
          ? { ...sp, insightPoints: [...sp.insightPoints, text] }
          : sp,
      )
      return { conversation: { ...s.conversation, subProblems } }
    })
  },

  incrementStuckCount(subProblemIndex, phase) {
    set((s) => {
      if (!s.conversation) return {}
      const subProblems = s.conversation.subProblems.map((sp, i) => {
        if (i !== subProblemIndex) return sp
        return {
          ...sp,
          stuckCountPerPhase: {
            ...sp.stuckCountPerPhase,
            [phase]: sp.stuckCountPerPhase[phase] + 1,
          },
        }
      })
      return { conversation: { ...s.conversation, subProblems } }
    })
  },

  switchSubProblem(index) {
    set((s) => {
      if (!s.conversation) return {}
      return { conversation: { ...s.conversation, currentSubProblemIndex: index } }
    })
  },

  emitKnowledgeCard(data) {
    set({ knowledgeCard: data })
  },

  setHasResolved(value) {
    set((s) => {
      if (!s.conversation) return {}
      return { conversation: { ...s.conversation, hasResolved: value } }
    })
  },

  advancePendingIndex() {
    set((s) => ({ pendingResponseIndex: s.pendingResponseIndex + 1 }))
  },
}))
