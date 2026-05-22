/**
 * p103-multi fixture — OCR 识别到多道题，用户选一道。
 * 场景：用户上传了一张含 3 道题的作业纸，OCR 返回 3 道二次函数/几何/应用题。
 * Agent 显示题目列表，user 尚未选择。
 * 对应 PRD P-103 / US-004 / US-005。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p103-multi-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'OTHER',
  ocrResult:
    '题 1：已知 $f(x)=ax^2+bx+c$，$f(0)=2$，$f(1)=1$，$f(-1)=5$，求 $a、b、c$。\n题 2：如图，△ABC 中，$\\angle B=90°$，$AB=3$，$BC=4$，求 $AC$ 及 $\\sin A$。\n题 3：某商品成本为 60 元，售价每提高 1 元，销量减少 2 件。已知成本价时日销量 80 件，问售价定多少元时日利润最大？',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传了作业图片）',
    streamingDone: true,
    createdAt: '2026-05-22T09:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '我在这张图里看到了 **3 道题**，你想先做哪一道？\n\n**题 I**：已知 $f(x)=ax^2+bx+c$，$f(0)=2$，$f(1)=1$，$f(-1)=5$，求 $a、b、c$。\n\n**题 II**：△ABC 中，$\\angle B=90°$，$AB=3$，$BC=4$，求 $AC$ 及 $\\sin A$。\n\n**题 III**：某商品成本 60 元，售价每提高 1 元销量减 2 件，初始日销 80 件，问最优售价？\n\n请选择一道，或告诉我如果识别有误。',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-22T09:00:04.000Z',
  },
]

/** responses：用户选题后 agent 确认并进入理解阶段 */
export const responses: AgentResponse[] = [
  // 用户选了题 I（二次函数）
  {
    content:
      '好，我们来做**题 I**：已知 $f(x) = ax^2+bx+c$，满足 $f(0)=2$、$f(1)=1$、$f(-1)=5$，求 $a、b、c$。\n\n先来理解一下——这道题给了几个已知条件？分别能告诉你什么？',
    signalAtEnd: 'STAY',
  },
  {
    content:
      '非常好！3 个条件对应 3 个方程，恰好能唯一确定 $a、b、c$。你打算怎么用这三个方程求解呢？',
    signalAtEnd: 'STAY',
  },
]
