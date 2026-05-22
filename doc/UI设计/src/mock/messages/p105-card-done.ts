/**
 * p105-card-done fixture — P-105 知识卡 全done 形态。
 * 场景：conversation.hasResolved=true，所有小问已完成，展示完整 KnowledgeCard。
 * 对应 PRD P-105 全部 done 分支。
 */
import type { ConversationState, Message, AgentResponse, KnowledgeCardData } from '../types'

/** 完整 KnowledgeCardData（供 P105Card route 直接读取） */
export const knowledgeCardData: KnowledgeCardData = {
  problemSummary:
    '二次函数综合题：已知 $f(x) = ax^2+bx+c$ 满足 $f(0)=2$、$f(1)=1$、$f(-1)=5$，求 $a、b、c$ 并求顶点坐标。',
  knowledgePoints: [
    '三参数确定原理：3 个独立条件唯一确定二次函数',
    '代入法：将已知点代入方程组',
    '消元法：加减消元求解三元一次方程组',
    '顶点公式：顶点 $(-\\frac{b}{2a},\\ f(-\\frac{b}{2a}))$',
  ],
  solutionSteps: [
    {
      method: '三点代入建方程组',
      description:
        '$f(0)=c=2$；$f(1)=a+b+c=1$；$f(-1)=a-b+c=5$。得 $c=2$，$a+b=-1$，$a-b=3$。',
    },
    {
      method: '消元求解',
      description: '两式相加：$2a=2 \\Rightarrow a=1$；相减：$2b=-4 \\Rightarrow b=-2$。',
    },
    {
      method: '求顶点',
      description:
        '$x_0 = -\\frac{b}{2a} = -\\frac{-2}{2} = 1$；$y_0 = f(1) = 1-2+2 = 1$。顶点 $(1,1)$。',
    },
  ],
  subProblemSummaries: [
    {
      index: 0,
      status: 'done',
      insightPoints: ['三参数代入法', '方程组消元'],
    },
  ],
}

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p105-done-0001',
  userId: 'mock-user-0001',
  hasResolved: true,
  subProblems: [
    {
      id: 'sub-0',
      goal: '已知 $f(0)=2$、$f(1)=1$、$f(-1)=5$，求 $a、b、c$ 及顶点',
      status: 'done',
      insightPoints: ['三参数代入法', '方程组消元'],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 1, REVIEW: 0 },
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
    content: '（上传了题目图片）',
    streamingDone: true,
    createdAt: '2026-05-22T15:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content: '这道题我们一起走完了全部四个阶段，你理解得非常扎实！知识卡片已经为你整理好了，看一看？',
    phase: 'REVIEW',
    streamingDone: true,
    createdAt: '2026-05-22T15:30:00.000Z',
  },
  {
    id: 'msg-003',
    role: 'system',
    content: '——— ※ 题目已完成，知识卡片已生成 ———',
    streamingDone: true,
    createdAt: '2026-05-22T15:30:01.000Z',
  },
]

export const responses: AgentResponse[] = []
