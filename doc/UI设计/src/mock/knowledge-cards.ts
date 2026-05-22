/**
 * 知识点卡片 fixture。
 * done 形态 1 个 + partial blocked 形态 1 个（对齐 P-105 card-done / card-partial）。
 */
import type { KnowledgeCardData } from './types'

/** 全部完成形态：单小问，3 个破题点 */
export const knowledgeCardDone: KnowledgeCardData = {
  problemSummary:
    '已知二次函数 $f(x) = ax^2 + bx + c$ 满足 $f(0)=1$、$f(1)=0$、$f(2)=3$，求三参数值。',
  knowledgePoints: [
    '三参数确定原理：$a$、$b$、$c$ 各自独立，需 3 个独立方程',
    '代入法：将已知点坐标代入函数式建方程组',
    '消元求解：逐步消去变量直到解出唯一结果',
  ],
  solutionSteps: [
    {
      method: '三条件代入',
      description: '将 $(0,1)$、$(1,0)$、$(2,3)$ 分别代入 $f(x)$，得三元方程组。',
    },
    {
      method: '消元法',
      description: '由方程组用加减消元，先解出 $a$，再回代求 $b$、$c$。',
    },
    {
      method: '验证',
      description: '将 $a$、$b$、$c$ 代回原式，核对三个点均满足。',
    },
  ],
  subProblemSummaries: [
    {
      index: 0,
      status: 'done',
      insightPoints: ['三参数三条件代入法', '方程组消元', '逐步验证'],
    },
  ],
}

/** 部分解卡死形态：多小问，第 2 小问受阻 */
export const knowledgeCardPartialBlocked: KnowledgeCardData = {
  problemSummary:
    '二次函数综合题 (1) 求顶点坐标 (2) 求 $f(x)>0$ 的解集（分类讨论题型，第 2 小问未突破）。',
  knowledgePoints: [
    '配方法：$ax^2+bx+c = a(x+\\frac{b}{2a})^2 + c - \\frac{b^2}{4a}$',
    '顶点公式：顶点 $(-\\frac{b}{2a}, f(-\\frac{b}{2a}))$',
    '判别式：$\\Delta = b^2 - 4ac$ 决定根的个数',
  ],
  solutionSteps: [
    {
      method: '配方求顶点',
      description: '对 (1) 用配方法得顶点坐标，已完成。',
    },
    {
      method: '判别式分类',
      description: '对 (2) 需判 $\\Delta$ 的符号，再分三种情况讨论解集。',
    },
  ],
  subProblemSummaries: [
    {
      index: 0,
      status: 'done',
      insightPoints: ['配方法', '顶点公式代入'],
    },
    {
      index: 1,
      status: 'blocked',
      insightPoints: [],
      blockedReason: '对 $\\Delta < 0$ 情形的分类讨论未能突破，建议参考老师讲解"判别式三情形"。',
    },
  ],
}
