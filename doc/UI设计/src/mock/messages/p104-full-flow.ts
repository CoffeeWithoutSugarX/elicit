/**
 * p104-full-flow fixture — Pólya 4 阶段完整 happy path 演进。
 * 场景：一元一次方程（初一难度），单小问，从阶段① UNDERSTAND 一路推进到阶段④ REVIEW。
 * 题目：解方程 $3x - 7 = 2(x + 4)$，求 $x$ 的值。
 *
 * 阶段序列：
 *   ① UNDERSTAND（3 轮对话）→ phaseTransition: 'PLAN'
 *   ② PLAN（2 轮对话）       → phaseTransition: 'EXECUTE'
 *   ③ EXECUTE（3 轮对话）    → phaseTransition: 'REVIEW'（含 2 次 insightPointDelta）
 *   ④ REVIEW（2 轮对话）     → emitKnowledgeCard（status: 'done'）
 * 总计：10 轮 user/agent 对话
 */
import type { ConversationState, Message, AgentResponse } from '../types'

export const initialConversation: ConversationState = {
  conversationId: 'fixture-p104-full-flow-0001',
  userId: 'mock-user-0001',
  hasResolved: false,
  subProblems: [
    {
      id: 'sub-0',
      goal: '解方程 $3x - 7 = 2(x + 4)$，求 $x$ 的值',
      status: 'in_progress',
      insightPoints: [],
      stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
      probedQuestionIds: [],
    },
  ],
  currentSubProblemIndex: 0,
  currentPhase: 'UNDERSTAND',
  problemType: 'ALGEBRA',
}

export const initialMessages: Message[] = [
  {
    id: 'msg-001',
    role: 'user',
    content: '（上传题目）这道方程怎么解？',
    streamingDone: true,
    createdAt: '2026-05-22T10:00:00.000Z',
  },
  {
    id: 'msg-002',
    role: 'agent',
    content:
      '好，题目是 $3x - 7 = 2(x + 4)$，我们先来弄懂它在问什么。\n\n你能用自己的话说说，这道题里的"未知量"是什么吗？等式两边各表示什么意思？',
    phase: 'UNDERSTAND',
    streamingDone: true,
    createdAt: '2026-05-22T10:00:05.000Z',
  },
]

/**
 * responses 序列（10 轮对话，从阶段① UNDERSTAND 到阶段④ REVIEW 结束）：
 *
 * 响应 1：UNDERSTAND 轮①——用户复述，AI 引导识别关键条件
 * 响应 2：UNDERSTAND 轮②——用户回答，AI 确认+追问"求什么"
 * 响应 3：UNDERSTAND 轮③——用户指明目标，AI 推进到 PLAN
 * 响应 4：PLAN 轮①——AI 引导选方法
 * 响应 5：PLAN 轮②——用户给出方向，AI 确认并推进到 EXECUTE
 * 响应 6：EXECUTE 轮①——用户展开第一步，AI 引导继续（insightPointDelta）
 * 响应 7：EXECUTE 轮②——用户完成移项，AI 提示合并（insightPointDelta）
 * 响应 8：EXECUTE 轮③——用户得出答案，AI 确认并推进到 REVIEW
 * 响应 9：REVIEW 轮①——AI 引导总结方法
 * 响应 10：REVIEW 轮②——用户总结，AI 完成并 emitKnowledgeCard
 */
export const responses: AgentResponse[] = [
  // ── 阶段① UNDERSTAND ──────────────────────────────────────────────────────

  // 响应 1：用户复述题目，AI 引导关键条件
  {
    content:
      '对！$x$ 是未知数，左边是 $3x-7$，右边是 $2(x+4)$，等式成立时 $x$ 就是答案。\n\n等式右边的括号里有什么？先把 $2(x+4)$ 展开看看，里面藏了哪些项？',
    signalAtEnd: 'STAY',
  },

  // 响应 2：用户展开括号，AI 确认并追问"求什么"
  {
    content:
      '$2(x+4) = 2x + 8$，很好。所以现在题目变成：$3x - 7 = 2x + 8$。\n\n题目让我们求什么？你能用一句话说出来吗？',
    signalAtEnd: 'STAY',
  },

  // 响应 3：用户指明目标，AI 推进到阶段② PLAN
  {
    content:
      '完全正确——求满足等式的 $x$ 的值。理解这道题的目标了，干得好！\n\n现在我们来想想用什么方法来解它。',
    phaseTransition: 'PLAN',
    signalAtEnd: 'COMPLETED',
  },

  // ── 阶段② PLAN ────────────────────────────────────────────────────────────

  // 响应 4：AI 引导选方法
  {
    content:
      '解一元一次方程常见的方法是"移项合并"：把含 $x$ 的项移到一边，常数项移到另一边。\n\n你觉得应该怎么移？先移哪一项？',
    signalAtEnd: 'STAY',
  },

  // 响应 5：用户给出方案，AI 确认并推进到阶段③ EXECUTE
  {
    content:
      '思路很清晰：把右边的 $2x$ 移到左边，把左边的 $-7$ 移到右边，然后合并同类项。\n\n计划拟好了，我们来动手算！',
    phaseTransition: 'EXECUTE',
    signalAtEnd: 'COMPLETED',
  },

  // ── 阶段③ EXECUTE ─────────────────────────────────────────────────────────

  // 响应 6：用户展开第一步移项，AI 引导继续（insightPoint 1）
  {
    content:
      '$3x - 2x = 8 + 7$，移项对了！注意移项时符号要变号——左边 $-7$ 移到右边变 $+7$，右边 $2x$ 移到左边变 $-2x$。\n\n现在合并同类项：左边 $3x - 2x = ?$，右边 $8 + 7 = ?$',
    signalAtEnd: 'STAY',
    insightPointDelta: { kind: 'add', text: '移项变号规则' },
  },

  // 响应 7：用户合并同类项，AI 提示最后一步（insightPoint 2）
  {
    content:
      '左边 $x$，右边 $15$，等式变成 $x = 15$——这就是答案了！\n\n你可以代回原式验证：$3 \\times 15 - 7 = 45 - 7 = 38$，$2(15+4) = 2 \\times 19 = 38$，两边相等，验证正确。',
    signalAtEnd: 'COMPLETED',
    insightPointDelta: { kind: 'add', text: '合并同类项→验证代入' },
    phaseTransition: 'REVIEW',
  },

  // ── 阶段④ REVIEW ──────────────────────────────────────────────────────────

  // 响应 8：AI 引导总结
  {
    content:
      '答案是 $x = 15$，已验证正确。\n\n来总结一下：解这道一元一次方程用了几个步骤？每步的关键操作是什么？',
    signalAtEnd: 'STAY',
  },

  // 响应 9：用户总结，AI 完成并 emitKnowledgeCard
  {
    content:
      '总结得很到位！一元一次方程的标准流程就是：**展开括号 → 移项（变号）→ 合并同类项 → 验证**。这道题你全程走下来了，完成得很好！',
    signalAtEnd: 'COMPLETED',
    emitKnowledgeCard: {
      problemSummary:
        '解一元一次方程 $3x - 7 = 2(x + 4)$，求 $x$ 的值。（答案：$x = 15$）',
      knowledgePoints: [
        '展开括号：$2(x+4) = 2x + 8$，系数分配到每一项',
        '移项规则：把含 $x$ 的项移到一边，常数项移到另一边，移过去符号变号',
        '合并同类项：$3x - 2x = x$，$8 + 7 = 15$',
        '验证代入：将 $x = 15$ 代回原式两边，验证相等',
      ],
      solutionSteps: [
        { method: '展开括号', description: '$3x - 7 = 2x + 8$（右边 $2(x+4)$ 展开）' },
        { method: '移项', description: '$3x - 2x = 8 + 7$（移项时变号）' },
        { method: '合并同类项', description: '$x = 15$' },
        { method: '验证', description: '$3 \\times 15 - 7 = 38 = 2(15+4)$，正确' },
      ],
      subProblemSummaries: [
        {
          index: 0,
          status: 'done',
          insightPoints: ['移项变号规则', '合并同类项→验证代入'],
        },
      ],
    },
  },
]
