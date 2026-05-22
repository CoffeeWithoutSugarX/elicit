/**
 * p104-execute-multi-sub fixture — 阶段③ 多小问推进。
 * 场景：题目含 (1)(2)(3) 三小问，currentSubProblemIndex 从 0→1→2 推进。
 * responses 含 subProblemTransition 字段，触发顶栏"小问 I/III → II/III → III/III"切换。
 * 对应 PRD 阶段③ B4 双层结构。
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p104-multi-sub-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [
    {
      id: 'sub-0',
      goal: '(1) 用配方法将 $f(x)=x^2-4x+3$ 化为顶点式',
      status: 'in_progress',
      insightPoints: ['配方法步骤'],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
    {
      id: 'sub-1',
      goal: '(2) 求 $f(x)$ 的最小值及取得最小值时 $x$ 的值',
      status: 'pending',
      insightPoints: [],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
    {
      id: 'sub-2',
      goal: '(3) 求 $f(x)=0$ 的解集',
      status: 'pending',
      insightPoints: [],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 0,
  currentPhase: 'EXECUTE',
  problemType: 'QUADRATIC',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传题目）这道题有三小问',
    streamingDone: true,
    createdAt: '2026-05-22T11:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '好，这道题一共 3 小问，我们一步步来：\n\n**(1)** 将 $f(x)=x^2-4x+3$ 化为顶点式 $a(x-h)^2+k$。\n\n配方法的关键是"凑完全平方"——你试着把 $x^2-4x$ 这部分配方，看能得到什么形式？',
    phase: 'EXECUTE',
    streamingDone: true,
    createdAt: '2026-05-22T11:00:05.000Z',
  },
  {
    id: 'msg-003',
    role: 'user',
    content: '$x^2-4x = (x-2)^2 - 4$，所以 $f(x)=(x-2)^2-1$？',
    streamingDone: true,
    createdAt: '2026-05-22T11:01:00.000Z',
  },
  {
    id: 'msg-004',
    role: 'agent',
    content:
      '完全正确！$f(x) = (x-2)^2 - 1$，顶点式搞定了。\n\n这说明顶点坐标是 $(2, -1)$，对吗？小问 (1) 完成，我们进入 (2)。',
    phase: 'EXECUTE',
    streamingDone: true,
    createdAt: '2026-05-22T11:01:05.000Z',
  },
]

/**
 * responses 序列：
 * 响应 1：用户确认，完成小问 (1)，切换到小问 (2)
 * 响应 2：引导小问 (2) 执行
 * 响应 3：用户答出 (2)，切换到小问 (3)
 * 响应 4：引导小问 (3)
 * 响应 5：全部完成，发出 KnowledgeCard
 */
export const responses: AgentResponse[] = [
  // 响应 1：确认 sub-0 完成，切换到 sub-1
  {
    content:
      '对，顶点 $(2, -1)$。小问 (1) 完成！\n\n现在看 **(2)**：$f(x)$ 的最小值是多少？在哪里取到？',
    signalAtEnd: 'SUB_PROBLEM_DONE',
    subProblemTransition: 1,
    insightPointDelta: { kind: 'add', text: '配方法：凑完全平方' },
  },

  // 响应 2：引导小问 (2)
  {
    content:
      '提示：从顶点式 $(x-2)^2-1$ 来看，$(x-2)^2\\geq 0$，那么 $f(x)$ 的最小值在什么时候取到？',
    signalAtEnd: 'STAY',
  },

  // 响应 3：用户算出 (2)，切换到 sub-2
  {
    content:
      '正确！当 $x=2$ 时 $(x-2)^2=0$，所以最小值 $f(2) = -1$。小问 (2) 完成！\n\n最后看 **(3)**：求 $f(x)=0$ 的解集。你会怎么做？',
    signalAtEnd: 'SUB_PROBLEM_DONE',
    subProblemTransition: 2,
    insightPointDelta: { kind: 'add', text: '顶点 → 最小值判断' },
  },

  // 响应 4：引导小问 (3)
  {
    content:
      '$(x-2)^2 - 1 = 0$ → $(x-2)^2 = 1$ → $x-2 = \\pm 1$，解出 $x$ 等于多少？',
    signalAtEnd: 'STAY',
  },

  // 响应 5：全题完成，emit KnowledgeCard
  {
    content:
      '非常好！$x=1$ 或 $x=3$，解集为 $\\{1, 3\\}$。三道小问全部完成！',
    signalAtEnd: 'COMPLETED',
    phaseTransition: 'REVIEW',
    insightPointDelta: { kind: 'add', text: '顶点式解方程：因式分解' },
    emitKnowledgeCard: {
      problemSummary:
        '二次函数 $f(x)=x^2-4x+3$，分三小问：(1) 化顶点式，(2) 最小值，(3) 解集。',
      knowledgePoints: [
        '配方法：$x^2-4x = (x-2)^2 - 4$，凑完全平方',
        '顶点式 $a(x-h)^2+k$ 的顶点为 $(h, k)$',
        '当 $a>0$ 时，顶点即为最小值点',
        '令顶点式 $= 0$ 解方程：$(x-h)^2 = -k/a$',
      ],
      solutionSteps: [
        { method: '配方化顶点式', description: '$x^2-4x+3 = (x-2)^2 - 4 + 3 = (x-2)^2 - 1$' },
        { method: '读取最小值', description: '当 $x=2$ 时，$(x-2)^2=0$，最小值 $f(2)=-1$' },
        { method: '解方程', description: '$(x-2)^2=1 \\Rightarrow x=1$ 或 $x=3$' },
      ],
      subProblemSummaries: [
        { index: 0, status: 'done', insightPoints: ['配方法：凑完全平方'] },
        { index: 1, status: 'done', insightPoints: ['顶点 → 最小值判断'] },
        { index: 2, status: 'done', insightPoints: ['顶点式解方程：因式分解'] },
      ],
    },
  },
]
