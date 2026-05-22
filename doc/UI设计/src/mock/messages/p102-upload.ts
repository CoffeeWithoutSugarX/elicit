/**
 * p102-upload fixture — 上传图片浮层。
 * 场景：用户点击图片按钮，触发上传选择浮层（P-102）。
 * 浮层独立 route，不在 ChatLayout 内渲染 conversation。
 * fixture 主要用于注册表完整性；实际 UI 为静态浮层演示。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p102-upload-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'OTHER',
}

export const initialMessages: Message[] = []

export const responses: AgentResponse[] = []
