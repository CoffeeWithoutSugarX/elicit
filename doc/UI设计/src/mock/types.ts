/**
 * 原型 Mock 层核心类型。
 * 字段命名与主项目 ElicitGraphStateSchema 1:1 对齐（camelCase）。
 */

/** Pólya 四阶段 */
export type PolyaPhase = 'UNDERSTAND' | 'PLAN' | 'EXECUTE' | 'REVIEW'

/** Agent 信号（阶段推进语义） */
export type PhaseSignal =
  | 'COMPLETED'
  | 'STAY'
  | 'ESCALATE'
  | 'SUB_PROBLEM_DONE'
  | 'PROBLEM_BLOCKED'

/** 题型（对齐主项目 ProblemType enum） */
export type ProblemType = 'QUADRATIC' | 'GEOMETRY' | 'STATISTICS' | 'ALGEBRA' | 'FUNCTION' | 'OTHER'

/** 单个小问状态（B4 subProblems 结构） */
export interface SubProblemState {
  id: string
  goal: string
  status: 'pending' | 'in_progress' | 'done' | 'blocked'
  insightPoints: string[]
  stuckCountPerPhase: Record<PolyaPhase, number>
  probedQuestionIds: string[]
}

/** 会话状态（对齐 ElicitGraphStateSchema） */
export interface ConversationState {
  conversationId: string
  userId: string
  hasResolved: boolean
  subProblems: SubProblemState[]
  currentSubProblemIndex: number
  currentPhase: PolyaPhase
  problemType: ProblemType
  ocrResult?: string
}

/** 消息 */
export interface Message {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  phase?: PolyaPhase
  metadata?: Record<string, unknown>
  streamingDone?: boolean
  createdAt: string
}

/** 知识点卡片数据（P-105） */
export interface KnowledgeCardData {
  problemSummary: string
  knowledgePoints: string[]
  solutionSteps: {
    method: string
    description: string
  }[]
  subProblemSummaries?: {
    index: number
    status: 'done' | 'blocked'
    insightPoints: string[]
    blockedReason?: string
  }[]
}

/** 单条预设 Agent 回答 */
export interface AgentResponse {
  content: string
  tokens?: string[]
  phaseTransition?: PolyaPhase
  signalAtEnd?: PhaseSignal
  insightPointDelta?: { kind: 'add'; text: string }
  subProblemTransition?: number
  emitKnowledgeCard?: KnowledgeCardData
}

/** Scenario 定义 */
export interface Scenario {
  id: string
  group: 'auth' | 'upload' | 'polya' | 'card-overlay' | 'admin'
  label: string
  prdAnchor: string
  route: string
  initialConversation: ConversationState
  initialMessages: Message[]
  responses: AgentResponse[]
}
