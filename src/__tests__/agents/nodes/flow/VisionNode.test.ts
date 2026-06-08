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
        // SSE writer 应被调用推送 questions_detected（kind 字段确保外层 SSE part 为 data-custom）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'questions_detected' })
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
        // questions_detected chunk 要包含 2 道题（kind 字段确保外层 SSE part 为 data-custom）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'questions_detected',
                isMulti: true,
            })
        );
    });

    // ── 3. 非数学学科（isSolvable=false）────────────────────────────────────────
    it('非数学题（语文） → ocrResult.isSolvable=false，推 assistant_message 妹妹提示', async () => {
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
        // isSolvable=false 时推 assistant_message 妹妹提示（NOT_SOLVABLE 话术）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'assistant_message' })
        );
        // questionImgUrl 同样清空
        expect(result.questionImgUrl).toBeUndefined();
    });

    // ── 4. 解析失败（乱码响应）→ errorReason='PARSE_FAIL'，推 assistant_message ─
    it('模型返回乱码 → errorReason=PARSE_FAIL，推 assistant_message 妹妹提示', async () => {
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
        // 提取 JSON 失败时推 assistant_message 妹妹提示，避免前端无限「正在思考…」
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'assistant_message' })
        );
        expect(result.questionImgUrl).toBeUndefined();
    });

    // ── 5. questionImgUrl 为空时直接返回空对象 ────────────────────────────────
    it('questionImgUrl 为空 → 直接返回 {}，不调用模型', async () => {
        const state = createMockState({ questionImgUrl: undefined, hasResolved: false });
        const result = await visionNode(state);

        expect(result).toEqual({});
        expect(visionModel.invoke).not.toHaveBeenCalled();
    });

    // ── 6. 模型抛出异常 → 返回 PARSE_FAIL，推 assistant_message ─────────────
    it('模型调用抛异常 → 返回 PARSE_FAIL 兜底，推 assistant_message 妹妹提示', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        vi.mocked(visionModel.invoke).mockRejectedValue(new Error('Network timeout'));

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        const result = await visionNode(state);

        expect(result.ocrResult!.isSolvable).toBe(false);
        if (!result.ocrResult!.isSolvable) {
            expect(result.ocrResult!.errorReason).toBe('PARSE_FAIL');
        }
        // catch 分支推 assistant_message 妹妹提示，避免前端无限「正在思考…」
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'assistant_message' })
        );
        expect(result.questionImgUrl).toBeUndefined();
    });

    // ── 7. visionNodeName 导出值正确 ─────────────────────────────────────────
    it('visionNodeName 为 "visionNode"', () => {
        expect(visionNodeName).toBe('visionNode');
    });

    // ── 10. isSolvable=false + errorReason=BLURRY → 推模糊图片话术 ────────────
    it('BLURRY → 推专属"模糊图片"话术 assistant_message', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        const blurryJson = JSON.stringify({
            isSolvable: false,
            subject: 'math',
            questions: [],
            errorReason: 'BLURRY',
        });
        vi.mocked(visionModel.invoke).mockResolvedValue({ content: blurryJson } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        await visionNode(state);

        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'assistant_message',
                text: expect.stringContaining('模糊'),
            })
        );
    });

    // ── 11. getWriter() 返回 null/undefined 时失败路径不崩溃 ──────────────────
    it('getWriter() 返回 null 时，乱码失败路径不抛错', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);

        vi.mocked(visionModel.invoke).mockResolvedValue({
            content: '纯文本乱码，无 JSON',
        } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        // 不抛错即通过
        await expect(visionNode(state)).resolves.toBeDefined();
    });

    // ── 9. visionModel.invoke 携带 nostream tag，防止 OCR JSON 泄漏到前端文本流 ──
    it('invoke 第二参数包含 tags: ["langsmith:nostream"]，避免 OCR JSON 泄漏前端', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(visionModel.invoke).mockResolvedValue({
            content: makeSolvableJson(),
        } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        await visionNode(state);

        expect(visionModel.invoke).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ tags: ["langsmith:nostream"] })
        );
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

    // ── 13. few-shot 消息正确注入（顺序 System → few-shots → 含图 HumanMessage）────
    it('few-shot 消息已注入且顺序正确：System → few-shots → 含图 HumanMessage', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(visionModel.invoke).mockResolvedValue({
            content: makeSolvableJson(),
        } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        await visionNode(state);

        expect(visionModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(visionModel.invoke).mock.calls[0][0] as Array<{ content: unknown }>;

        // visionNode.prompt.ts fewShots 有 3 组 → 6 条 few-shot 消息
        // 消息布局：[0]=SystemMessage, [1..6]=few-shots(Human/AI 交替), [7]=含图 HumanMessage
        expect(callArgs.length).toBeGreaterThanOrEqual(8);

        // index 0 必须是 SystemMessage（内容含 "识别助手" 或 "数学题图片"）
        const systemMsg = callArgs[0];
        expect(String(systemMsg.content)).toContain('识别助手');

        // index 1 应是第一个 few-shot HumanMessage（visionNode few-shot 1 含 "algebra-only"）
        const firstFewShotHuman = callArgs[1];
        expect(String(firstFewShotHuman.content)).toContain('algebra-only');

        // 倒数第一条应是含图片的真实 HumanMessage（content 为数组，含 image_url）
        const lastMsg = callArgs[callArgs.length - 1] as { content: unknown };
        expect(Array.isArray(lastMsg.content)).toBe(true);
        const contentArr = lastMsg.content as Array<{ type: string }>;
        expect(contentArr.some(item => item.type === 'image_url')).toBe(true);
    });

    // ── 12. isSolvable=false + errorReason=INCOMPLETE → 推"被截到了一半"话术 ──────
    it('INCOMPLETE → 推专属"被截到了一半"话术 assistant_message', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);

        const incompleteJson = JSON.stringify({
            isSolvable: false,
            subject: 'math',
            questions: [],
            errorReason: 'INCOMPLETE',
        });
        vi.mocked(visionModel.invoke).mockResolvedValue({ content: incompleteJson } as never);

        const state = createMockState({ questionImgUrl: TEST_IMG_URL, hasResolved: false });
        await visionNode(state);

        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'assistant_message',
                text: expect.stringContaining('截'),
            })
        );
    });
});
