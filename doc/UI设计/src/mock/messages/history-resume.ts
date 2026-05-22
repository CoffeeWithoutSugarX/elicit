/**
 * history-resume fixture — 历史会话恢复。
 * 场景：用户从侧边栏进入已完成的历史对话，imageButton 置灰（disabled），展示完整消息历史 + KnowledgeCard。
 * 对应 PRD US-010 / US-017（历史查阅）。
 */
import type { ConversationState, Message, AgentResponse, KnowledgeCardData } from '../types'

export const knowledgeCardData: KnowledgeCardData = {
  problemSummary:
    '一元二次方程 $x^2-5x+6=0$，用因式分解法求解，得 $x=2$ 或 $x=3$。',
  knowledgePoints: [
    '因式分解法：将方程左边分解为两个一次式之积',
    '韦达定理：两根之和 $= -b/a$，两根之积 $= c/a$',
    '零积原理：若 $ab=0$ 则 $a=0$ 或 $b=0$',
  ],
  solutionSteps: [
    {
      method: '分解因式',
      description: '$x^2-5x+6 = (x-2)(x-3)$，寻找积为 6、和为 -5 的两数。',
    },
    {
      method: '令各因式为零',
      description: '$(x-2)(x-3)=0 \\Rightarrow x=2$ 或 $x=3$。',
    },
    {
      method: '韦达验证',
      description: '$2+3=5 = -(-5)/1$，$2\\times 3=6 = 6/1$，验证正确。',
    },
  ],
  subProblemSummaries: [
    {
      index: 0,
      status: 'done',
      insightPoints: ['因式分解法', '韦达定理验证'],
    },
  ],
}

export const initialConversation: ConversationState = {
  conversationId: 'fixture-history-resume-0001',
  userId: 'mock-user-0001',
  hasResolved: true,
  subProblems: [
    {
      id: 'sub-0',
      goal: '解方程 $x^2-5x+6=0$',
      status: 'done',
      insightPoints: ['因式分解法', '韦达定理验证'],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 1, REVIEW: 0 },
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
    content: '（上传了方程题图片）',
    streamingDone: true,
    createdAt: '2026-05-20T08:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '这道题要解一元二次方程 $x^2-5x+6=0$。你知道有哪些方法可以解这类方程吗？',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-20T08:00:04.000Z',
  },
  {
    id: 'msg-003',
    role: 'user',
    content: '公式法？还有分解因式？',
    streamingDone: true,
    createdAt: '2026-05-20T08:01:00.000Z',
  },
  {
    id: 'msg-004',
    role: 'agent',
    content:
      '两种方法都对！这道题的系数比较"好看"，你试试因式分解法——找两个数，它们的积等于 6、和等于 -5，是哪两个？',
    phase: 'PLAN',
    streamingDone: true,
    createdAt: '2026-05-20T08:01:06.000Z',
  },
  {
    id: 'msg-005',
    role: 'user',
    content: '$-2$ 和 $-3$？',
    streamingDone: true,
    createdAt: '2026-05-20T08:02:00.000Z',
  },
  {
    id: 'msg-006',
    role: 'agent',
    content:
      '正确！$(-2)+(-3)=-5$，$(-2)\\times(-3)=6$。所以 $x^2-5x+6 = (x-2)(x-3)$，令每个因子等于零，解是？',
    phase: 'EXECUTE',
    streamingDone: true,
    createdAt: '2026-05-20T08:02:05.000Z',
  },
  {
    id: 'msg-007',
    role: 'user',
    content: '$x=2$ 或 $x=3$',
    streamingDone: true,
    createdAt: '2026-05-20T08:03:00.000Z',
  },
  {
    id: 'msg-008',
    role: 'agent',
    content:
      '完全正确！最后我们用韦达定理验证：两根之和 $2+3=5$，等于 $-(-5)/1=5$；两根之积 $2\\times 3=6$，等于 $6/1=6$。验证通过！\n\n这道题全部完成，知识卡片已生成。',
    phase: 'REVIEW',
    streamingDone: true,
    createdAt: '2026-05-20T08:03:30.000Z',
  },
  {
    id: 'msg-009',
    role: 'system',
    content: '——— ※ 历史对话（只读）———',
    streamingDone: true,
    createdAt: '2026-05-20T08:03:31.000Z',
  },
]

export const responses: AgentResponse[] = []
