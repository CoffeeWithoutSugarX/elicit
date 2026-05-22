/**
 * p101-empty fixture — 空对话页。
 * 场景：用户刚进入系统，尚未上传任何图片，对话列表为空。
 * 演示：空态引导 UI（"开始你的第一题"提示 + 图片按钮 active 态）。
 * responses 空：此 scenario 不交互，图片按钮触发 P-102 流程（由路由层处理）。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p101-empty-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'OTHER',
}

export const initialMessages: Message[] = []

export const responses: AgentResponse[] = []
