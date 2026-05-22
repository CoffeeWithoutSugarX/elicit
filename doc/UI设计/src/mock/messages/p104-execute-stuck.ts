/**
 * p104-execute-stuck fixture。
 * 场景：二次函数题，用户已在 PLAN 阶段卡了 1 轮（stuckCountPerPhase.PLAN=1）。
 * Batch 2 压测用例：5 问探路 + KNOWLEDGE_FALLBACK 升级 + insightPoints 增长。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

/** 初始会话状态：进入 fixture 时已在阶段 PLAN，已卡 1 轮 */
export const initialConversation: ConversationState = {
  conversationId: 'fixture-p104-stuck-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [
    {
      id: 'sub-0',
      goal: '已知 $f(0)=1$、$f(1)=0$、$f(2)=3$，求 $a$、$b$、$c$',
      status: 'in_progress',
      insightPoints: [],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 1, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 0,
  currentPhase: 'PLAN',
  problemType: 'QUADRATIC',
}

/** 4 条历史消息 */
export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传了题目图片）请帮我看这道题',
    phase: undefined,
    streamingDone: true,
    createdAt: '2026-05-22T08:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '我看到这道二次函数题了。题目要求：已知 $f(x) = ax^2 + bx + c$，满足 $f(0)=1$、$f(1)=0$、$f(2)=3$，求三个参数的值。\n\n我们先来理解一下题意——你能说说这道题已知了什么、要求什么吗？',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-22T08:00:05.000Z',
  },
  {
    id: 'msg-003',
    role: 'agent',
    content:
      '很好！你已经清楚题意了。现在我们进入第二步：拟定解题计划。\n\n这道题有三个未知数 $a$、$b$、$c$，你打算怎么入手？',
    phase: 'PLAN',
    streamingDone: true,
    createdAt: '2026-05-22T08:00:30.000Z',
  },
  {
    id: 'msg-004',
    role: 'user',
    content: '我感觉可以……用代入法？但是不太确定怎么列式子',
    streamingDone: true,
    createdAt: '2026-05-22T08:01:00.000Z',
  },
]

/**
 * 5 条预设 Agent 回答，按顺序消费（用户每次回车消费一条）。
 *
 * 响应 1–2：继续 PLAN 引导，STAY（stuckCount 在 store 里手动 +1）
 * 响应 3–4：检测到卡死 3 轮，进入 5 问探路（仍在 PLAN 阶段）
 * 响应 5：5 问用尽仍未推进 → KNOWLEDGE_FALLBACK 升级，
 *          phaseTransition='EXECUTE'，insightPointDelta 加一个破题点
 */
export const responses: AgentResponse[] = [
  // --- 响应 1：引导具体化，stuckCount → 2 ---
  {
    content:
      '代入法思路是对的！能再具体一点吗——你打算把哪些已知条件代入 $f(x) = ax^2 + bx + c$ 里？',
    signalAtEnd: 'STAY',
  },

  // --- 响应 2：再次引导，stuckCount → 3，触发 5 问探路门槛 ---
  {
    content:
      '我换个角度帮你想想：题目里给了 3 个点的函数值，$f(0)=1$、$f(1)=0$、$f(2)=3$，这三个条件各自能给你一个方程。你能试着把第一个 $f(0)=1$ 代进去，看看能得到什么？',
    signalAtEnd: 'STAY',
  },

  // --- 响应 3：5 问探路第 1 问（stuckCount ≥ 3 触发） ---
  {
    content:
      '我换个问法：题目里 $f(0)$ 等于多少？直接把 $x=0$ 代进 $f(x) = ax^2 + bx + c$，会得到哪个参数？',
    signalAtEnd: 'STAY',
  },

  // --- 响应 4：5 问探路第 2 问 ---
  {
    content:
      '好，那我们试试 $x=1$：$f(1) = a(1)^2 + b(1) + c = a + b + c$，题目说 $f(1) = 0$，所以 $a + b + c = ?$',
    signalAtEnd: 'STAY',
  },

  // --- 响应 5：KNOWLEDGE_FALLBACK 升级 ---
  // stuckCount 用尽 → 直接给方法论提示 + ESCALATE 升级阶段
  {
    content:
      '这一步涉及的是**三参数三条件代入法**：二次函数 $f(x) = ax^2 + bx + c$ 有三个独立参数，需要三个独立方程才能唯一确定。\n\n常见做法是：把 $(0,1)$、$(1,0)$、$(2,3)$ 分别代入，得到三个方程，然后用加减消元法解出 $a$、$b$、$c$。\n\n你试着按这个方向，把三个方程列出来，看看能解出来吗？',
    signalAtEnd: 'ESCALATE',
    phaseTransition: 'EXECUTE',
    insightPointDelta: { kind: 'add', text: '三参数三条件代入法' },
  },
]
