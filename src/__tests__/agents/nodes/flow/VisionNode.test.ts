import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockState } from '@/__tests__/helpers/mockState';

// ——— mock visionModel（禁止真实 Qwen-VL 调用）———
vi.mock('@/agents/models/qwen-vl-model', () => ({
    visionModel: {
        invoke: vi.fn(),
    },
}));

// ——— mock getWriter（LangGraph context 函数）———
vi.mock('@langchain/langgraph', () => ({
    getWriter: vi.fn(),
}));

import { visionNode, visionNodeName } from '@/agents/nodes/flow/VisionNode';
import { visionModel } from '@/agents/models/qwen-vl-model';
import { getWriter } from '@langchain/langgraph';

// ——— 辅助：构建 Qwen VL 返回的合法 JSON ———

function makeSolvableJson(overrides: Record<string, unknown> = {}): string {
    const base = {
        isSolvable: true,
        subject: 'math',
        grade: '初中',
        questions: [
            {
                index: 0,
                topic: '一元二次方程求根',
                latexFull: '解方程 $x^2 - 4x + 3 = 0$',
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
            },
        ],
        isMulti: false,
        visualFeaturesNeeded: false,
        errorReason: null,
        ...overrides,
    };
    return JSON.stringify(base);
}

const TEST_IMG_URL = 'https://example.com/math-problem.jpg';

describe('visionNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. 单道数学题（纯文字，visualFeaturesNeeded=false）──────────────────────
    it('单道数学题 → ocrResult.isSolvable=true，questions.length=1', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(visionModel.invoke).mockResolvedValue({
            content: makeSolvableJson(),
        } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        const result = await visionNode(state);

        expect(result.ocrResult).toBeDefined();
        expect(result.ocrResult!.isSolvable).toBe(true);
        if (result.ocrResult!.isSolvable) {
            expect(result.ocrResult!.questions).toHaveLength(1);
            expect(result.ocrResult!.isMulti).toBe(false);
        }
        // questionImgUrl 应清空，避免重复触发 OCR
        expect(result.questionImgUrl).toBeUndefined();
        // SSE writer 应被调用推送 questions_detected
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'questions_detected' })
        );
    });

    // ── 2. 多道数学题（isMulti=true）────────────────────────────────────────────
    it('两道数学题 → ocrResult.isMulti=true，questions.length=2', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        const secondQuestion = {
            index: 1,
            topic: '等差数列求和',
            latexFull: '求 $\\sum_{k=1}^{n} k$',
            givenConditions: [],
            implicitConditions: [],
            goal: '求前 n 项和',
            milestones: ['写通项', '套公式'],
            visualFeaturesNeeded: false,
            visualDescription: '',
            subProblems: [
                {
                    index: 0,
                    goal: '求前 n 项和',
                    givenConditions: [],
                    milestones: ['套公式'],
                },
            ],
        };

        const baseQuestions = JSON.parse(makeSolvableJson()).questions;
        const multiJson = makeSolvableJson({
            questions: [...baseQuestions, secondQuestion],
            isMulti: true,
        });

        vi.mocked(visionModel.invoke).mockResolvedValue({ content: multiJson } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        const result = await visionNode(state);

        expect(result.ocrResult!.isSolvable).toBe(true);
        if (result.ocrResult!.isSolvable) {
            expect(result.ocrResult!.questions).toHaveLength(2);
            expect(result.ocrResult!.isMulti).toBe(true);
        }
        // questions_detected chunk 要包含 2 道题
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({
                type: 'questions_detected',
                isMulti: true,
            })
        );
    });

    // ── 3. 非数学学科（isSolvable=false）────────────────────────────────────────
    it('非数学题（语文） → ocrResult.isSolvable=false', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        const unsolvableJson = JSON.stringify({
            isSolvable: false,
            subject: 'chinese',
            questions: [],
            errorReason: 'NOT_SOLVABLE',
        });

        vi.mocked(visionModel.invoke).mockResolvedValue({ content: unsolvableJson } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        const result = await visionNode(state);

        expect(result.ocrResult!.isSolvable).toBe(false);
        if (!result.ocrResult!.isSolvable) {
            expect(result.ocrResult!.subject).toBe('chinese');
            expect(result.ocrResult!.errorReason).toBe('NOT_SOLVABLE');
            expect(result.ocrResult!.questions).toHaveLength(0);
        }
        // 非数学题不推送 questions_detected
        expect(mockWriter).not.toHaveBeenCalled();
        // questionImgUrl 同样清空
        expect(result.questionImgUrl).toBeUndefined();
    });

    // ── 4. 解析失败（乱码响应）→ errorReason='PARSE_FAIL' ──────────────────────
    it('模型返回乱码 → errorReason=PARSE_FAIL', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        vi.mocked(visionModel.invoke).mockResolvedValue({
            content: '抱歉，无法识别该图片内容。请检查图片格式。',
        } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        const result = await visionNode(state);

        expect(result.ocrResult!.isSolvable).toBe(false);
        if (!result.ocrResult!.isSolvable) {
            expect(result.ocrResult!.errorReason).toBe('PARSE_FAIL');
        }
        expect(mockWriter).not.toHaveBeenCalled();
        expect(result.questionImgUrl).toBeUndefined();
    });

    // ── 5. questionImgUrl 为空时直接返回空对象 ────────────────────────────────
    it('questionImgUrl 为空 → 直接返回 {}，不调用模型', async () => {
        const state = createMockState({ questionImgUrl: undefined, hasResolved: false });
        const result = await visionNode(state);

        expect(result).toEqual({});
        expect(visionModel.invoke).not.toHaveBeenCalled();
    });

    // ── 6. 模型抛出异常 → 返回 PARSE_FAIL ────────────────────────────────────
    it('模型调用抛异常 → 返回 PARSE_FAIL 兜底', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        vi.mocked(visionModel.invoke).mockRejectedValue(new Error('Network timeout'));

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        const result = await visionNode(state);

        expect(result.ocrResult!.isSolvable).toBe(false);
        if (!result.ocrResult!.isSolvable) {
            expect(result.ocrResult!.errorReason).toBe('PARSE_FAIL');
        }
        expect(result.questionImgUrl).toBeUndefined();
    });

    // ── 7. visionNodeName 导出值正确 ─────────────────────────────────────────
    it('visionNodeName 为 "visionNode"', () => {
        expect(visionNodeName).toBe('visionNode');
    });

    // ── 8. JSON 被 ```json 围栏包裹时仍能正确解析 ─────────────────────────────
    it('响应被 ```json 围栏包裹 → 仍能正确解析', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        const fencedResponse = '```json\n' + makeSolvableJson() + '\n```';
        vi.mocked(visionModel.invoke).mockResolvedValue({ content: fencedResponse } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        const result = await visionNode(state);

        expect(result.ocrResult!.isSolvable).toBe(true);
        if (result.ocrResult!.isSolvable) {
            expect(result.ocrResult!.questions).toHaveLength(1);
        }
    });
});
