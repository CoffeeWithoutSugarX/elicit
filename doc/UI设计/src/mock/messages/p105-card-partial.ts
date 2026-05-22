/**
 * p105-card-partial fixture — P-105 知识卡 部分 blocked 形态。
 * 场景：多小问题，第 3 小问卡死未突破，知识卡含「未突破」徽标。
 * 对应 PRD P-105 partial blocked 分支。
 */
import type { ConversationState, Message, AgentResponse, KnowledgeCardData } from '../types'

/** partial blocked KnowledgeCardData */
export const knowledgeCardData: KnowledgeCardData = {
  problemSummary:
    '几何综合题：△ABC 中 $AB=5,BC=12,AC=13$，(1) 证明 $\\angle B=90°$，(2) 求 $\\sin A$，(3) 已知 $D$ 是 $AC$ 中点，求 $BD$（第三小问未突破）。',
  knowledgePoints: [
    '勾股定理逆定理：$a^2+b^2=c^2 \\Rightarrow \\angle C=90°$',
    '直角三角形三角函数：$\\sin A = \\frac{对边}{斜边}$',
    '中线定理：$BD^2 = \\frac{2AB^2+2BC^2-AC^2}{4}$（未完全掌握）',
  ],
  solutionSteps: [
    {
      method: '勾股验证',
      description: '$5^2+12^2 = 25+144 = 169 = 13^2$，故 $\\angle B=90°$。',
    },
    {
      method: '正弦值计算',
      description: '$\\sin A = \\frac{BC}{AC} = \\frac{12}{13}$。',
    },
    {
      method: '中线长度（未完成）',
      description: '需用中线定理或直角三角形斜边中线公式，第三小问未突破。',
    },
  ],
  subProblemSummaries: [
    {
      index: 0,
      status: 'done',
      insightPoints: ['勾股定理逆定理应用'],
    },
    {
      index: 1,
      status: 'done',
      insightPoints: ['直角三角形正弦：对边/斜边'],
    },
    {
      index: 2,
      status: 'blocked',
      insightPoints: [],
      blockedReason:
        '对直角三角形中线定理不熟悉——建议复习"斜边中线等于斜边一半"这一性质，以及中线定理的一般形式。',
    },
  ],
}

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p105-partial-0001',
  userId: 'mock-user-0001',
  hasResolved: true,
  subProblems: [
    {
      id: 'sub-0',
      goal: '(1) 证明 $\\angle B=90°$',
      status: 'done',
      insightPoints: ['勾股定理逆定理应用'],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
    {
      id: 'sub-1',
      goal: '(2) 求 $\\sin A$',
      status: 'done',
      insightPoints: ['直角三角形正弦：对边/斜边'],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
    {
      id: 'sub-2',
      goal: '(3) 求 $BD$（$D$ 为 $AC$ 中点）',
      status: 'blocked',
      insightPoints: [],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 5, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 2,
  currentPhase: 'REVIEW',
  problemType: 'GEOMETRY',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传几何题）这道题三小问',
    streamingDone: true,
    createdAt: '2026-05-22T16:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content: '前两小问你完成得很好！第三小问涉及中线定理，这次没能突破，没关系——知识卡片里有详细提示。',
    phase: 'REVIEW',
    streamingDone: true,
    createdAt: '2026-05-22T16:45:00.000Z',
  },
  {
    id: 'msg-003',
    role: 'system',
    content: '——— ※ 本次对话结束，部分小问未突破，知识卡已生成 ———',
    streamingDone: true,
    createdAt: '2026-05-22T16:45:01.000Z',
  },
]

export const responses: AgentResponse[] = []
