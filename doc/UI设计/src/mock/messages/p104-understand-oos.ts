/**
 * p104-understand-oos fixture — 阶段① + 学科范围外（OOS）。
 * 场景：用户上传非数学图片（一只猫），agent 礼貌拒答并引导换题。
 * 对应 PRD 阶段① + US-014（学科外拒答）。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p104-oos-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [
    {
      id: 'sub-0',
      goal: '（非数学题，待用户重新上传）',
      status: 'pending',
      insightPoints: [],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'OTHER',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传了图片）',
    streamingDone: true,
    createdAt: '2026-05-22T09:20:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '这看起来不像是数学题哦——图片里好像是一只猫？\n\n我专注于辅助数学解题，目前只支持代数、几何、统计等数学题型。要不换一张有数学题目的图片试试？',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-22T09:20:03.000Z',
  },
]

/** responses：用户继续追问，agent 坚持边界引导 */
export const responses: AgentResponse[] = [
  // 用户说"这就是道题，里面是一道关于猫的应用题"
  {
    content:
      '如果图片里有文字题目，我可能没有识别到。你可以把题目文字直接告诉我，或者重新拍一张题目清晰的照片，我来帮你解答！',
    signalAtEnd: 'STAY',
  },
  // 用户重新说"好吧，我去换一张"
  {
    content:
      '好的！期待你带来新题目。点击输入框旁边的图片按钮重新上传就好。',
    signalAtEnd: 'STAY',
  },
]
