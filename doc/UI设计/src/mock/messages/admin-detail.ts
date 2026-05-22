/**
 * admin-detail fixture — Admin 会话详情 stub。
 * 此 scenario 对应 /admin/:conversationId 路由，不走 ChatLayout。
 * fixture 存在以保持注册表完整性。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-admin-detail-0001',
  userId: 'admin-user',
  hasResolved: false,
  subProblems: [],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'OTHER',
}

export const initialMessages: Message[] = []

export const responses: AgentResponse[] = []
