/**
 * login fixture — 登录态 stub。
 * 此 scenario 对应独立路由 /login，不在 ChatLayout 渲染。
 * fixture 仍存在以保持注册表完整，conversation/messages/responses 均为最小化占位。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-login-0001',
  userId: 'anonymous',
  hasResolved: false,
  subProblems: [],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'OTHER',
}

export const initialMessages: Message[] = []

export const responses: AgentResponse[] = []
