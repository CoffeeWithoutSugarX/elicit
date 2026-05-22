/**
 * p104-plan-deviation fixture — 阶段② + 偏题引回。
 * 场景：用户在 PLAN 阶段聊到无关话题，agent 引回解题方向。
 * 初始消息已走到 PLAN 阶段（4 条历史），responses 中 user 偏题 → agent 引回。
 * 对应 PRD 阶段② + US-008（偏题引回）。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p104-plan-dev-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [
    {
      id: 'sub-0',
      goal: '已知概率 $P(A)=0.4$，$P(B)=0.3$，$A$ 与 $B$ 独立，求 $P(A\\cup B)$',
      status: 'in_progress',
      insightPoints: [],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 0,
  currentPhase: 'PLAN',
  problemType: 'STATISTICS',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传了概率题图片）帮我看看',
    streamingDone: true,
    createdAt: '2026-05-22T10:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '好，这是一道概率题：已知事件 $A$ 的概率 $P(A)=0.4$，事件 $B$ 的概率 $P(B)=0.3$，且 $A$ 与 $B$ 相互独立，求 $P(A\\cup B)$。\n\n你对"相互独立"这个条件有印象吗？它意味着什么？',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-22T10:00:04.000Z',
  },
  {
    id: 'msg-003',
    role: 'user',
    content: '就是……两件事互不影响？',
    streamingDone: true,
    createdAt: '2026-05-22T10:01:00.000Z',
  },
  {
    id: 'msg-004',
    role: 'agent',
    content:
      '对！相互独立意味着 $P(A\\cap B) = P(A)\\cdot P(B)$——一件事发生与否不影响另一件事的概率。\n\n现在我们来拟定解题计划：求 $P(A\\cup B)$ 可以用什么公式？',
    phase: 'PLAN',
    streamingDone: true,
    createdAt: '2026-05-22T10:01:10.000Z',
  },
]

/** responses：用户偏题，agent 引回 */
export const responses: AgentResponse[] = [
  // 用户偏题："话说老师讲这章的时候我没听，概率学了有什么用啊"
  {
    content:
      '嗯，这个问题很好——不过我们先回到刚才的方向上：$P(A\\cup B)$ 的加法公式。你记不记得 $P(A\\cup B) = P(A) + P(B) - ?$，问号处填什么？',
    signalAtEnd: 'STAY',
  },
  // 用户回来："哦，减去 P(A 交 B)？"
  {
    content:
      '正是！$P(A\\cup B) = P(A) + P(B) - P(A\\cap B)$。现在你已经有了公式，也知道独立时 $P(A\\cap B) = P(A)\\cdot P(B)$，试着把数字代进去计算一下。',
    signalAtEnd: 'ESCALATE',
    phaseTransition: 'EXECUTE',
  },
  // 用户算完
  {
    content:
      '很好！$P(A\\cup B) = 0.4 + 0.3 - 0.4\\times 0.3 = 0.7 - 0.12 = 0.58$。你算出来了吗？',
    signalAtEnd: 'ESCALATE',
    phaseTransition: 'REVIEW',
  },
]
