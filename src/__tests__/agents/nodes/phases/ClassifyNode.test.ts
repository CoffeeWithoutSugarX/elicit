import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockState } from '@/__tests__/helpers/mockState';
import type { OcrResult } from '@/agents/schemas/OcrSchema';

// ——— mock chatModel（禁止真实 DeepSeek 调用）———
vi.mock('@/agents/models/deepseek-model', () => ({
    chatModel: {
        invoke: vi.fn(),
    },
}));

import { classifyNode, classifyNodeName } from '@/agents/nodes/phases/ClassifyNode';
import { chatModel } from '@/agents/models/deepseek-model';

// ——— 辅助：构建单道可解题目的 ocrResult ———
function makeSolvableOcrResult(overrides: Partial<{
    topic: string;
    latexFull: string;
    goal: string;
    visualFeaturesNeeded: boolean;
    visualDescription: string;
}> = {}): OcrResult {
    return {
        isSolvable: true,
        subject: 'math',
        grade: '初中',
        questions: [
            {
                index: 0,
                topic: overrides.topic ?? '一元二次方程',
                latexFull: overrides.latexFull ?? '求方程 $x^2 - 4x + 3 = 0$ 的根',
                givenConditions: ['$x^2 - 4x + 3 = 0$'],
                implicitConditions: [],
                goal: overrides.goal ?? '求 x 的值',
                milestones: ['分解因式', '求根'],
                visualFeaturesNeeded: overrides.visualFeaturesNeeded ?? false,
                visualDescription: overrides.visualDescription ?? '',
                subProblems: [
                    {
                        index: 0,
                        goal: '求 x 的值',
                        givenConditions: ['$x^2 - 4x + 3 = 0$'],
                        milestones: ['分解因式', '求根'],
                    },
                ],
            },
        ],
        isMulti: false,
        visualFeaturesNeeded: false,
        errorReason: null,
        selectedQuestionIndex: 0,
    };
}

// ——— 辅助：构建 chatModel 返回值 ———
function makeModelResponse(problemType: 0 | 1 | 2 | 3, reason = '分类理由') {
    return {
        content: JSON.stringify({ problemType, reason }),
    };
}

describe('classifyNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. 代数题 → problemType = 0 ─────────────────────────────────────────────
    it('代数题 → problemType=0，subProblems 初始化含运行时字段', async () => {
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse(0, '方程求根，归代数') as never);

        const ocrResult = makeSolvableOcrResult({
            topic: '一元二次方程求根',
            latexFull: '解 $x^2 - 4x + 3 = 0$',
            goal: '求 x 的值',
        });

        const state = createMockState({ ocrResult, hasResolved: true });
        const result = await classifyNode(state);

        expect(result.problemType).toBe(0);
        expect(result.currentSubProblemIndex).toBe(0);
        expect(result.subProblems).toHaveLength(1);
        // 验证运行时字段已正确初始化
        const sp = result.subProblems![0];
        expect(sp.status).toBe('pending');
        expect(sp.insightPoints).toEqual([]);
        expect(sp.stuckCountPerPhase).toEqual({ understand: 0, plan: 0, execute: 0, review: 0 });
        expect(sp.probedQuestionIdsPerPhase).toEqual({ understand: [], plan: [], execute: [], review: [] });
        // 验证静态字段从 ocrResult.subProblems 继承
        expect(sp.index).toBe(0);
        expect(sp.goal).toBe('求 x 的值');
        expect(sp.givenConditions).toEqual(['$x^2 - 4x + 3 = 0$']);
    });

    // ── 2. 几何题 → problemType = 1 ─────────────────────────────────────────────
    it('几何题 → problemType=1', async () => {
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse(1, '三角形全等，归几何') as never);

        const ocrResult = makeSolvableOcrResult({
            topic: '三角形全等证明',
            latexFull: '证明 $\\triangle ABD \\cong \\triangle ACD$',
            goal: '证明三角形全等',
        });

        const state = createMockState({ ocrResult, hasResolved: true });
        const result = await classifyNode(state);

        expect(result.problemType).toBe(1);
        expect(result.subProblems).toHaveLength(1);
        expect(result.currentSubProblemIndex).toBe(0);
    });

    // ── 3. 函数题（含 visualDescription）→ problemType = 2 ───────────────────────
    it('含 visualDescription 的函数题 → problemType=2', async () => {
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse(2, '含函数图像，优先归函数') as never);

        const ocrResult = makeSolvableOcrResult({
            topic: '二次函数图像',
            latexFull: '已知 $y = x^2 - 2x - 3$，求顶点',
            goal: '求顶点坐标',
            visualFeaturesNeeded: true,
            visualDescription: '图中为开口向上的抛物线',
        });

        const state = createMockState({ ocrResult, hasResolved: true });
        const result = await classifyNode(state);

        expect(result.problemType).toBe(2);
        expect(result.subProblems).toHaveLength(1);
        // 验证 chatModel.invoke 被调用（prompt 包含视觉描述块）
        expect(chatModel.invoke).toHaveBeenCalledOnce();
    });

    // ── 4. 其他/兜底题型 → problemType = 3 ──────────────────────────────────────
    it('其他题型 → problemType=3', async () => {
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse(3, '统计概率，归其他') as never);

        const ocrResult = makeSolvableOcrResult({
            topic: '概率计算',
            latexFull: '掷骰子出现 6 的概率',
            goal: '求概率',
        });

        const state = createMockState({ ocrResult, hasResolved: true });
        const result = await classifyNode(state);

        expect(result.problemType).toBe(3);
        expect(result.subProblems).toHaveLength(1);
        expect(result.currentSubProblemIndex).toBe(0);
    });

    // ── 5. chatModel 抛出异常 → 容错兜底 problemType=3 ──────────────────────────
    it('chatModel 抛出异常 → 容错返回 problemType=3，subProblems 仍初始化', async () => {
        vi.mocked(chatModel.invoke).mockRejectedValue(new Error('Network timeout'));

        const ocrResult = makeSolvableOcrResult();

        const state = createMockState({ ocrResult, hasResolved: true });
        const result = await classifyNode(state);

        // 容错兜底：返回 OTHER 类型
        expect(result.problemType).toBe(3);
        // subProblems 仍被正确初始化
        expect(result.subProblems).toHaveLength(1);
        expect(result.subProblems![0].status).toBe('pending');
        expect(result.currentSubProblemIndex).toBe(0);
    });

    // ── 6. ocrResult 不可解 → 直接返回 {} ────────────────────────────────────────
    it('ocrResult.isSolvable=false → 直接返回 {}，不调用模型', async () => {
        const ocrResult: OcrResult = {
            isSolvable: false,
            subject: 'chinese',
            questions: [],
            errorReason: 'NOT_SOLVABLE',
        };

        const state = createMockState({ ocrResult, hasResolved: true });
        const result = await classifyNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 7. ocrResult 为 undefined → 直接返回 {} ───────────────────────────────────
    it('ocrResult 为 undefined → 直接返回 {}，不调用模型', async () => {
        const state = createMockState({ ocrResult: undefined, hasResolved: true });
        const result = await classifyNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 8. JSON 响应被 ```json 围栏包裹 → 仍能正确解析 ────────────────────────────
    it('模型响应被 ```json 围栏包裹 → 仍能解析出 problemType', async () => {
        const fenced = '```json\n' + JSON.stringify({ problemType: 1, reason: '几何题' }) + '\n```';
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: fenced } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({ ocrResult, hasResolved: true });
        const result = await classifyNode(state);

        expect(result.problemType).toBe(1);
    });

    // ── 9. classifyNodeName 导出值正确 ───────────────────────────────────────────
    it('classifyNodeName 为 "classifyNode"', () => {
        expect(classifyNodeName).toBe('classifyNode');
    });
});
