/**
 * p103-single fixture — OCR 识别到单道题，直接确认。
 * 场景：用户上传图片，OCR 识别出 1 道几何题，agent 展示题目并询问确认。
 * 对应 PRD P-103（单题直接确认分支）。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p103-single-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'GEOMETRY',
  ocrResult:
    '如图，在 △ABC 中，已知 $AB=5$，$BC=12$，$AC=13$，求证 $\\angle ABC=90°$，并求 $\\sin A$ 的值。',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传了题目图片）',
    streamingDone: true,
    createdAt: '2026-05-22T09:10:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '我看到这道几何题，识别结果如下——\n\n**题目**：在 △ABC 中，已知 $AB=5$，$BC=12$，$AC=13$，求证 $\\angle ABC=90°$，并求 $\\sin A$ 的值。\n\n就这一道题，识别正确吗？',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-22T09:10:03.000Z',
  },
]

/** responses：用户确认后，agent 开始理解阶段引导 */
export const responses: AgentResponse[] = [
  {
    content:
      '好，我们就做这道题！\n\n先来理解题意——题目要求"求证 $\\angle ABC = 90°$"，你觉得应该用什么定理来证明一个角是直角？',
    signalAtEnd: 'STAY',
  },
  {
    content:
      '对！勾股定理逆定理是证直角三角形的经典方法：若 $a^2 + b^2 = c^2$，则 $\\angle C = 90°$。你试着把题目中的三条边代入，看看等式成立吗？',
    signalAtEnd: 'ESCALATE',
    phaseTransition: 'PLAN',
  },
]
