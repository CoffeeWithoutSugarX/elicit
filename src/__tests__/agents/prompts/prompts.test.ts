/**
 * Prompt template 函数的单元测试。
 * 只测试 userPromptTemplate 的纯函数行为（字符串内容），不调用真实模型。
 */
import { describe, it, expect, vi } from 'vitest';
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { SubProblemState } from '@/agents/schemas/ElicitGraphStateSchema';
import { makeSubProblem } from '@/__tests__/helpers/mockState';
import { ProblemType } from '@/types/enums/problemType.enum';

// ——— mock studentProfile（P-001 新增：prompt 模块顶层导入 studentProfile，需提前 mock）———
vi.mock('@/agents/data/studentProfile', () => ({
    studentGradeTerm: '7B',
}));

// ——— prompt template 导入 ———
import { userPromptTemplate as visionUserPrompt } from '@/agents/prompts/vision/visionNode.prompt';
import { userPromptTemplate as classifyUserPrompt } from '@/agents/prompts/phases/classifyNode.prompt';
import { userPromptTemplate as understandUserPrompt } from '@/agents/prompts/phases/understandNode.prompt';
import { userPromptTemplate as planUserPrompt } from '@/agents/prompts/phases/planNode.prompt';
import { userPromptTemplate as executeUserPrompt } from '@/agents/prompts/phases/executeNode.prompt';
import { userPromptTemplate as reviewUserPrompt } from '@/agents/prompts/phases/reviewNode.prompt';

// ——— 共享测试 fixture ———

function makeSanitizedQuestion(overrides: Partial<SanitizedQuestion> = {}): SanitizedQuestion {
  return {
    index: 0,
    topic: '一元二次方程',
    latexFull: '求方程 $x^2 - 4x + 3 = 0$ 的根',
    givenConditions: ['$x^2 - 4x + 3 = 0$'],
    implicitConditions: [],
    goal: '求 x 的值',
    milestones: ['分解因式', '求根'],
    visualFeaturesNeeded: false,
    visualDescription: '',
    subProblems: [
      {
        index: 0,
        goal: '求 x 的值',
        givenConditions: ['$x^2 - 4x + 3 = 0$'],
        milestones: ['分解因式', '求根'],
      },
    ],
    ...overrides,
  };
}

function makeMessageMock(type: 'human' | 'ai', content: string) {
  return { getType: () => type, content };
}

// ——— visionNode.prompt ———

describe('visionNode.userPromptTemplate', () => {
  it('不含 userText → 只输出图片 URL 行', () => {
    const result = visionUserPrompt({ imgUrl: 'https://example.com/img.jpg' });
    expect(result).toContain('图片 URL：https://example.com/img.jpg');
    expect(result).not.toContain('妹妹的补充');
  });

  it('含 userText → 输出图片 URL + 妹妹的补充', () => {
    const result = visionUserPrompt({
      imgUrl: 'https://example.com/img.jpg',
      userText: '第一题帮我看',
    });
    expect(result).toContain('图片 URL：https://example.com/img.jpg');
    expect(result).toContain('妹妹的补充：第一题帮我看');
  });

  it('userText 为空字符串 → 不输出补充', () => {
    const result = visionUserPrompt({ imgUrl: 'https://x.com/a.jpg', userText: '' });
    expect(result).not.toContain('妹妹的补充');
  });
});

// ——— classifyNode.prompt ———

describe('classifyNode.userPromptTemplate', () => {
  it('无 visualDescription → 不含"# 题目图示"块', () => {
    const q = makeSanitizedQuestion({ visualFeaturesNeeded: false, visualDescription: '' });
    const result = classifyUserPrompt({ selectedQuestion: q });
    expect(result).not.toContain('# 题目图示');
    expect(result).toContain('题目：一元二次方程');
    expect(result).toContain('LaTeX：');
    expect(result).toContain('目标：');
  });

  it('含 visualDescription → 含"# 题目图示"块', () => {
    const q = makeSanitizedQuestion({
      visualFeaturesNeeded: true,
      visualDescription: '开口向上的抛物线，与 x 轴交于两点',
    });
    const result = classifyUserPrompt({ selectedQuestion: q });
    expect(result).toContain('# 题目图示');
    expect(result).toContain('开口向上的抛物线');
  });
});

// ——— understandNode.prompt ———

describe('understandNode.userPromptTemplate', () => {
  const baseQ = makeSanitizedQuestion();
  const baseSub = makeSubProblem({ goal: '求 x 的值', givenConditions: ['方程成立'] });
  const recentMessages = [makeMessageMock('human', '这个题我不会')];

  it('单一目标题（subProblems.length=1）→ 含"单一目标题"描述', () => {
    const result = understandUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: baseSub,
      state: { subProblems: [baseSub], currentSubProblemIndex: 0 },
      recentMessages,
    });
    expect(result).toContain('单一目标题');
    expect(result).toContain('# 题目（已理解）');
    expect(result).toContain('# 当前正在引导的小问');
    expect(result).toContain('目标：求 x 的值');
  });

  it('多小问（第 1 个小问，idx=0）→ 含"当前正在引导第 1 个"描述', () => {
    const sub0 = makeSubProblem({ index: 0, goal: '第一小问' });
    const sub1 = makeSubProblem({ index: 1, goal: '第二小问' });
    const result = understandUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub0,
      state: { subProblems: [sub0, sub1], currentSubProblemIndex: 0 },
      recentMessages: [],
    });
    expect(result).toContain('当前正在引导第 1 个');
    expect(result).not.toContain('前 0 个小问已完成');
  });

  it('多小问（第 2 个小问）→ 含"前 N 个小问已完成"描述', () => {
    const sub0 = makeSubProblem({ index: 0, goal: '第一小问' });
    const sub1 = makeSubProblem({ index: 1, goal: '第二小问' });
    const result = understandUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub1,
      state: { subProblems: [sub0, sub1], currentSubProblemIndex: 1 },
      recentMessages: [],
    });
    expect(result).toContain('前 1 个小问已完成');
    expect(result).toContain('目标：第二小问');
  });

  it('含 visualFeaturesNeeded → 含"# 题目图示"', () => {
    const q = makeSanitizedQuestion({
      visualFeaturesNeeded: true,
      visualDescription: '图中有函数图像',
    });
    const result = understandUserPrompt({
      selectedQuestion: q,
      currentSubProblem: baseSub,
      state: { subProblems: [baseSub], currentSubProblemIndex: 0 },
      recentMessages,
    });
    expect(result).toContain('# 题目图示');
    expect(result).toContain('图中有函数图像');
  });

  it('recentMessages → 出现在"# 对话历史"段中', () => {
    const result = understandUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: baseSub,
      state: { subProblems: [baseSub], currentSubProblemIndex: 0 },
      recentMessages: [
        makeMessageMock('human', '帮我解题'),
        makeMessageMock('ai', '先说说你理解到了什么？'),
      ],
    });
    expect(result).toContain('# 对话历史');
    expect(result).toContain('human: 帮我解题');
    expect(result).toContain('ai: 先说说你理解到了什么？');
  });
});

// ——— planNode.prompt ———

describe('planNode.userPromptTemplate', () => {
  const baseQ = makeSanitizedQuestion();
  const recentMsgs = [makeMessageMock('human', '用因式分解')];

  it('无 insightPoints、无 probedQuestions → 不含"破题点"和"已用过"段', () => {
    const sub = makeSubProblem({
      probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
      insightPoints: [],
    });
    const result = planUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: recentMsgs,
    });
    expect(result).not.toContain('当前小问已积累的破题点');
    expect(result).not.toContain('已用过的探路问号');
    expect(result).toContain('# 题目（已理解）');
  });

  it('有 insightPoints → 含"当前小问已积累的破题点"', () => {
    const sub = makeSubProblem({
      insightPoints: ['判别式 Δ ≥ 0'],
      probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
    });
    const result = planUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
    });
    expect(result).toContain('当前小问已积累的破题点');
    expect(result).toContain('判别式 Δ ≥ 0');
  });

  it('有 probedQuestions → 含"已用过的探路问号"', () => {
    const sub = makeSubProblem({
      insightPoints: [],
      probedQuestionIdsPerPhase: { understand: [], plan: [2, 3], execute: [], review: [] },
    });
    const result = planUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
    });
    expect(result).toContain('已用过的探路问号：2, 3');
  });

  it('visualFeaturesNeeded=true + visualDescription → 含图示块', () => {
    const q = makeSanitizedQuestion({
      visualFeaturesNeeded: true,
      visualDescription: '抛物线图像描述',
    });
    const sub = makeSubProblem();
    const result = planUserPrompt({
      selectedQuestion: q,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.FUNCTION },
      recentMessages: [],
    });
    expect(result).toContain('# 题目图示');
    expect(result).toContain('抛物线图像描述');
  });

  it('visualFeaturesNeeded=false → 不含图示块', () => {
    const q = makeSanitizedQuestion({ visualFeaturesNeeded: false, visualDescription: '' });
    const sub = makeSubProblem();
    const result = planUserPrompt({
      selectedQuestion: q,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
    });
    expect(result).not.toContain('# 题目图示');
  });
});

// ——— executeNode.prompt ———

describe('executeNode.userPromptTemplate', () => {
  const baseQ = makeSanitizedQuestion();

  it('无 insightPoints → 含"尚无破题点"提示', () => {
    const sub = makeSubProblem({ insightPoints: [] });
    const result = executeUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
    });
    expect(result).toContain('尚无破题点');
    expect(result).toContain('# 题目（已理解）');
  });

  it('有 insightPoints → 含"已积累的破题点"列表', () => {
    const sub = makeSubProblem({
      insightPoints: ['利用对称变换', '三点共线时折线最短'],
    });
    const result = executeUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.GEOMETRY },
      recentMessages: [],
    });
    expect(result).toContain('已积累的破题点');
    expect(result).toContain('利用对称变换');
    expect(result).toContain('三点共线时折线最短');
  });

  it('有 probedQuestions（execute 阶段）→ 含"已用过的探路问号"', () => {
    const sub = makeSubProblem({
      probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [1, 2, 3], review: [] },
    });
    const result = executeUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
    });
    expect(result).toContain('ExecuteNode 阶段已用过的探路问号：1, 2, 3');
  });

  it('无 probedQuestions → 不含"已用过的探路问号"行', () => {
    const sub = makeSubProblem({
      probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
    });
    const result = executeUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
    });
    expect(result).not.toContain('ExecuteNode 阶段已用过的探路问号');
  });

  it('recentMessages → 出现在对话历史中', () => {
    const sub = makeSubProblem();
    const result = executeUserPrompt({
      selectedQuestion: baseQ,
      currentSubProblem: sub,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [makeMessageMock('human', '我想用因式分解')],
    });
    expect(result).toContain('# 对话历史');
    expect(result).toContain('human: 我想用因式分解');
  });
});

// ——— reviewNode.prompt ———

describe('reviewNode.userPromptTemplate', () => {
  const baseQ = makeSanitizedQuestion();

  it('单小问（status=done）→ 含状态和破题点', () => {
    const sub = makeSubProblem({
      index: 0,
      goal: '求 m 的取值范围',
      status: 'done',
      insightPoints: ['两实根 ⟹ Δ ≥ 0', '解出 m ≤ 4'],
    });
    const result = reviewUserPrompt({
      selectedQuestion: baseQ,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
      knowledgePointsCsv: '一元二次方程根的判别式,北师大八年级上 §5.3',
    });
    expect(result).toContain('共 1 个小问');
    expect(result).toContain('状态: done');
    expect(result).toContain('两实根 ⟹ Δ ≥ 0');
    expect(result).toContain('解出 m ≤ 4');
    expect(result).toContain('# 题目（已完成全部小问）');
  });

  it('多小问（一个 done + 一个 blocked）→ 正确输出两个小问状态', () => {
    const sub0 = makeSubProblem({
      index: 0,
      goal: '求坐标',
      status: 'done',
      insightPoints: ['令 y=0 求交点'],
    });
    const sub1 = makeSubProblem({
      index: 1,
      goal: '求面积',
      status: 'blocked',
      insightPoints: [],
    });
    const result = reviewUserPrompt({
      selectedQuestion: baseQ,
      state: { subProblems: [sub0, sub1], currentSubProblemIndex: 1, problemType: ProblemType.FUNCTION },
      recentMessages: [],
      knowledgePointsCsv: '三角形面积公式',
    });
    expect(result).toContain('共 2 个小问');
    expect(result).toContain('状态: done');
    expect(result).toContain('状态: blocked');
    expect(result).toContain('令 y=0 求交点');
    expect(result).toContain('（无显式破题点记录）');
  });

  it('含 knowledgePointsCsv → 注入知识点术语库', () => {
    const sub = makeSubProblem({ status: 'done' });
    const result = reviewUserPrompt({
      selectedQuestion: baseQ,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: [],
      knowledgePointsCsv: '勾股定理,北师大八年级下 §3.2\n一次函数',
    });
    expect(result).toContain('# 知识点术语库');
    expect(result).toContain('勾股定理');
    expect(result).toContain('一次函数');
  });

  it('recentMessages → 调用方 slice(-16) 后传入 template，template 渲染全部传入条目', () => {
    // F4 修复：template 内部不再 slice，由调用方（ReviewNode.ts）统一切片后传入。
    // 本测试模拟调用方已切片（传入 16 条），验证 template 完整渲染所有传入条目。
    const sub = makeSubProblem({ status: 'done' });
    const msgs = Array.from({ length: 20 }, (_, i) =>
      makeMessageMock('human', `消息${i}`)
    );
    // 模拟调用方切片：只传入最近 16 条（index 4-19）
    const slicedMsgs = msgs.slice(-16);
    const result = reviewUserPrompt({
      selectedQuestion: baseQ,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.ALGEBRA },
      recentMessages: slicedMsgs,
      knowledgePointsCsv: '',
    });
    // 最早 4 条（0-3）不在传入 slice 内，不应出现
    expect(result).not.toContain('消息0');
    expect(result).not.toContain('消息3');
    // 最近 16 条（4-19）应全部出现
    expect(result).toContain('消息4');
    expect(result).toContain('消息19');
  });

  it('含 visualFeaturesNeeded=true → 含图示块', () => {
    const q = makeSanitizedQuestion({
      visualFeaturesNeeded: true,
      visualDescription: '三角形 ABC 图示',
    });
    const sub = makeSubProblem({ status: 'done' });
    const result = reviewUserPrompt({
      selectedQuestion: q,
      state: { subProblems: [sub], currentSubProblemIndex: 0, problemType: ProblemType.GEOMETRY },
      recentMessages: [],
      knowledgePointsCsv: '',
    });
    expect(result).toContain('# 题目图示');
    expect(result).toContain('三角形 ABC 图示');
  });
});
