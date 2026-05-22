/**
 * p104-review fixture — 阶段④ 回顾汇总。
 * 场景：user 已走完前三阶段（UNDERSTAND→PLAN→EXECUTE），进入 REVIEW 阶段。
 * agent 提出回顾性问题，user 回答后 emitKnowledgeCard。
 * 对应 PRD 阶段④ 回顾阶段。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p104-review-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [
    {
      id: 'sub-0',
      goal: '用完全平方公式展开 $(2x+3)^2$，再化简 $(2x+3)^2 - (x-1)^2$',
      status: 'in_progress',
      insightPoints: ['完全平方公式', '同类项合并'],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 0,
  currentPhase: 'REVIEW',
  problemType: 'ALGEBRA',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传代数题）',
    streamingDone: true,
    createdAt: '2026-05-22T14:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '这道题要求展开 $(2x+3)^2$ 并化简 $(2x+3)^2 - (x-1)^2$。你知道完全平方公式是什么吗？',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-22T14:00:04.000Z',
  },
  {
    id: 'msg-003',
    role: 'user',
    content: '$(a+b)^2 = a^2 + 2ab + b^2$？',
    streamingDone: true,
    createdAt: '2026-05-22T14:01:00.000Z',
  },
  {
    id: 'msg-004',
    role: 'agent',
    content:
      '完全正确！那我们来展开——$(2x+3)^2 = (2x)^2 + 2\\cdot 2x\\cdot 3 + 3^2 = 4x^2+12x+9$，你能按同样方法展开 $(x-1)^2$ 吗？',
    phase: 'PLAN',
    streamingDone: true,
    createdAt: '2026-05-22T14:01:06.000Z',
  },
  {
    id: 'msg-005',
    role: 'user',
    content: '$(x-1)^2 = x^2 - 2x + 1$',
    streamingDone: true,
    createdAt: '2026-05-22T14:02:00.000Z',
  },
  {
    id: 'msg-006',
    role: 'agent',
    content:
      '很好！那两式相减：$(4x^2+12x+9)-(x^2-2x+1)$，合并同类项试试看。',
    phase: 'EXECUTE',
    streamingDone: true,
    createdAt: '2026-05-22T14:02:05.000Z',
  },
  {
    id: 'msg-007',
    role: 'user',
    content: '$3x^2+14x+8$',
    streamingDone: true,
    createdAt: '2026-05-22T14:03:00.000Z',
  },
  {
    id: 'msg-008',
    role: 'agent',
    content:
      '答案正确！结果是 $3x^2+14x+8$。\n\n现在我们来回顾一下这道题。',
    phase: 'REVIEW',
    streamingDone: true,
    createdAt: '2026-05-22T14:03:05.000Z',
  },
]

/** responses：回顾阶段问答 → 最终 emitKnowledgeCard */
export const responses: AgentResponse[] = [
  // 回顾问题 1：完全平方公式
  {
    content:
      '回顾一下：完全平方公式有两个，$(a+b)^2$ 和 $(a-b)^2$，你能各举一个例子说明为什么"中间项一定有系数 2"吗？',
    signalAtEnd: 'STAY',
  },
  // 回顾问题 2：错误防范
  {
    content:
      '很好的理解！最后一个问题：$(a-b)^2$ 展开后，$b^2$ 前面的符号是正还是负？为什么？',
    signalAtEnd: 'STAY',
  },
  // 总结，发出 KnowledgeCard
  {
    content:
      '说得对——$(a-b)^2 = a^2 - 2ab + b^2$，$b^2$ 永远是正的（平方不变号）！这道题你全部搞明白了，太棒了！',
    signalAtEnd: 'COMPLETED',
    emitKnowledgeCard: {
      problemSummary:
        '代数展开题：化简 $(2x+3)^2 - (x-1)^2$，结果为 $3x^2+14x+8$。',
      knowledgePoints: [
        '完全平方公式：$(a+b)^2 = a^2+2ab+b^2$',
        '完全平方公式：$(a-b)^2 = a^2-2ab+b^2$（注意中间符号）',
        '平方项恒正：$(\\cdot)^2 \\geq 0$',
        '同类项合并：次数相同才能相加减',
      ],
      solutionSteps: [
        {
          method: '展开各项',
          description:
            '$(2x+3)^2 = 4x^2+12x+9$；$(x-1)^2 = x^2-2x+1$',
        },
        {
          method: '相减分配负号',
          description:
            '$(4x^2+12x+9) - (x^2-2x+1) = 4x^2+12x+9 - x^2+2x-1$',
        },
        {
          method: '合并同类项',
          description: '$= (4-1)x^2 + (12+2)x + (9-1) = 3x^2+14x+8$',
        },
      ],
    },
  },
]
