/**
 * p106-swap fixture — 换题确认浮层。
 * 场景：用户已完成一道题（hasResolved=true），点击图片按钮触发 P-106 换题确认浮层。
 * 浮层作为独立 route 叠加在 ChatLayout 之上。
 * 对应 PRD P-106 / US-016（换题流程）。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p106-swap-0001',
  userId: 'mock-user-0001',
  hasResolved: true,
  subProblems: [
    {
      id: 'sub-0',
      goal: '已知 $f(x) = x^2 - 6x + 8$，求零点',
      status: 'done',
      insightPoints: ['因式分解法', '韦达定理验证'],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 0,
  currentPhase: 'REVIEW',
  problemType: 'QUADRATIC',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传了题目）',
    streamingDone: true,
    createdAt: '2026-05-22T17:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '$f(x) = x^2-6x+8 = (x-2)(x-4)$，零点为 $x=2$ 和 $x=4$。题目已完成！',
    phase: 'REVIEW',
    streamingDone: true,
    createdAt: '2026-05-22T17:20:00.000Z',
  },
  {
    id: 'msg-003',
    role: 'system',
    content: '——— ※ 题目已完成 ———',
    streamingDone: true,
    createdAt: '2026-05-22T17:20:01.000Z',
  },
]

export const responses: AgentResponse[] = []
