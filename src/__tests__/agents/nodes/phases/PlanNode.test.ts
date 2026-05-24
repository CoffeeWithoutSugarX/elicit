import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockState, makeSubProblem } from '@/__tests__/helpers/mockState';
import type { OcrResult } from '@/agents/schemas/OcrSchema';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { ProblemType } from '@/types/enums/problemType.enum';

// ——— mock chatModel（禁止真实 DeepSeek 调用）———
vi.mock('@/agents/models/deepseek-model', () => ({
    chatModel: {
        invoke: vi.fn(),
    },
}));

// ——— mock getWriter（LangGraph context 函数）———
vi.mock('@langchain/langgraph', () => ({
    getWriter: vi.fn(),
}));

// ——— mock runGuardChain（默认放行；各用例按需覆盖）———
vi.mock('@/agents/nodes/guards/runGuardChain', () => ({
    runGuardChain: vi.fn(() => null),
}));

import { planNode, planNodeName } from '@/agents/nodes/phases/PlanNode';
import { chatModel } from '@/agents/models/deepseek-model';
import { getWriter } from '@langchain/langgraph';
import { runGuardChain } from '@/agents/nodes/guards/runGuardChain';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const mockRunGuardChain = vi.mocked(runGuardChain);

// ——— 辅助：构建单道可解题目的 ocrResult ———
function makeSolvableOcrResult(overrides: Partial<{
    topic: string;
    latexFull: string;
    goal: string;
}> = {}): OcrResult {
    return {
        isSolvable: true,
        subject: 'math',
        grade: '初中',
        questions: [
            {
                index: 0,
                topic: overrides.topic ?? '一元二次方程',
                latexFull: overrides.latexFull ?? '解方程 $x^2 - 4x + 3 = 0$',
                givenConditions: ['$x^2 - 4x + 3 = 0$'],
                implicitConditions: [],
                goal: overrides.goal ?? '求 x 的值',
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
        selectedQuestionIndex: 0,
    };
}

describe('planNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. STAY 信号 → 返回消息，不改变阶段 ────────────────────────────────────
    it('STAY 信号 → 返回 AI 消息，不推进阶段，不触发 SSE', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你觉得这道题应该用什么方法？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            problemType: ProblemType.ALGEBRA,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        // 返回了 AI 消息，cleanContent 去掉了协议行
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].content).toBe('你觉得这道题应该用什么方法？');
        // 阶段不应变化
        expect(result.currentPhase).toBeUndefined();
        // writer 不应被调用
        expect(mockWriter).not.toHaveBeenCalled();
    });

    // ── 2. COMPLETED 信号 → 推进到 EXECUTE，推送 SSE chunk ───────────────────
    it('COMPLETED 信号 → currentPhase = EXECUTE，推送 phase_changed SSE chunk', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '太好了，因式分解方向完全对！接下来我们试着执行这个计划。\nphase_signal: "COMPLETED"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            problemType: ProblemType.ALGEBRA,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        // 消息存在且已清理协议行
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].content).toBe('太好了，因式分解方向完全对！接下来我们试着执行这个计划。');
        // 阶段推进到 EXECUTE
        expect(result.currentPhase).toBe(PolyaPhase.EXECUTE);
        // SSE chunk 已推送
        expect(mockWriter).toHaveBeenCalledWith({
            type: 'phase_changed',
            phase: PolyaPhase.EXECUTE,
        });
    });

    // ── 3. probedQuestionId 追加到 plan 探路记录 ─────────────────────────────
    it('模型输出 probedQuestionId=2 → 追加到 currentSubProblem.probedQuestionIdsPerPhase.plan', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '要不试着把题目画出来，把脑子里的东西落到纸上？\nprobed_question_id: 2\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const subProblem = makeSubProblem({
            probedQuestionIdsPerPhase: { understand: [], plan: [1], execute: [], review: [] },
        });
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            problemType: ProblemType.ALGEBRA,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        // subProblems 已更新，plan 追加了 2
        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].probedQuestionIdsPerPhase.plan).toEqual([1, 2]);
        // 其他相 phase 记录不受影响
        expect(result.subProblems![0].probedQuestionIdsPerPhase.understand).toEqual([]);
    });

    // ── 4. STAY 信号 → stuckCountPerPhase.plan 递增，subProblems 出现在 result 中 ────
    it('STAY 信号 → stuckCountPerPhase.plan 从 0 递增到 1（applySignalSideEffects 生效）', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你觉得题目给的条件都用上了吗？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            problemType: ProblemType.ALGEBRA,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        // STAY 会触发 applySignalSideEffects → stuckCountPerPhase.plan 递增
        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].stuckCountPerPhase.plan).toBe(1);
        // 无 probedQuestionId → probedQuestionIdsPerPhase.plan 不变
        expect(result.subProblems![0].probedQuestionIdsPerPhase.plan).toEqual([]);
    });

    // ── 5. ocrResult 为 undefined → 返回空对象，不调用模型 ───────────────────
    it('ocrResult 为 undefined → 直接返回 {}，不调用模型', async () => {
        const state = createMockState({
            ocrResult: undefined,
            hasResolved: false,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 6. ocrResult.isSolvable=false → 返回空对象，不调用模型 ──────────────
    it('ocrResult.isSolvable=false → 直接返回 {}，不调用模型', async () => {
        const ocrResult: OcrResult = {
            isSolvable: false,
            subject: 'chinese',
            questions: [],
            errorReason: 'NOT_SOLVABLE',
        };

        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 7. subProblems 为空 → 返回空对象 ────────────────────────────────────
    it('subProblems 为空 → 直接返回 {}，不调用模型', async () => {
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 8. getWriter() 返回 null 时 COMPLETED 分支不抛异常 ───────────────────
    it('getWriter 返回 null 时 COMPLETED → 不抛异常，仍推进阶段', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '好方向！我们开始执行吧。\nphase_signal: "COMPLETED"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            problemType: ProblemType.ALGEBRA,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result.currentPhase).toBe(PolyaPhase.EXECUTE);
    });

    // ── 9. 多小问场景：probedQuestionId 仅更新当前小问，不影响其他小问 ─────────
    it('多小问场景：probedQuestionId 只更新 currentSubProblemIndex 指定的小问', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '题目里的条件你都用上了吗？\nprobed_question_id: 1\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const sp0 = makeSubProblem({ index: 0, goal: '第一问' });
        const sp1 = makeSubProblem({ index: 1, goal: '第二问' });
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            problemType: ProblemType.ALGEBRA,
            subProblems: [sp0, sp1],
            currentSubProblemIndex: 1,
        });

        const result = await planNode(state);

        // 第二个小问（index=1）的 plan 记录被更新
        expect(result.subProblems![1].probedQuestionIdsPerPhase.plan).toEqual([1]);
        // 第一个小问（index=0）不受影响
        expect(result.subProblems![0].probedQuestionIdsPerPhase.plan).toEqual([]);
    });

    // ── 10. planNodeName 导出值正确 ──────────────────────────────────────────
    it('planNodeName 为 "planNode"', () => {
        expect(planNodeName).toBe('planNode');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Guard Chain 分支
    // ──────────────────────────────────────────────────────────────────────────

    // ── 11. VISION_FAILURE guard 命中 → 直接返回视觉失败消息，不调用 LLM ─────────
    it('VISION_FAILURE guard 命中 → 返回 AIMessage，不调用 chatModel', async () => {
        mockRunGuardChain.mockReturnValueOnce({ kind: 'VISION_FAILURE' });

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        expect(result.messages![0].content).toContain('图片识别失败');
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 12. OUT_OF_SCOPE guard 命中 → 直接返回超范围消息，不调用 LLM ────────────
    it('OUT_OF_SCOPE guard 命中 → 返回 AIMessage，不调用 chatModel', async () => {
        mockRunGuardChain.mockReturnValueOnce({ kind: 'OUT_OF_SCOPE' });

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        expect(result.messages![0].content).toContain('超出了初中数学的范围');
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 13. PULL_BACK (deviation) guard 命中 → 注入 injectPrompt，仍调用 LLM ───
    it('PULL_BACK guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 先把这题搞定，别跑偏了。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'PULL_BACK',
            injectPrompt,
            pulledFromPhase: 1,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '我们先专注于计划阶段吧。\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 14. PROBE_5Q (stuck) guard 命中 → 注入 injectPrompt，仍调用 LLM ─────────
    it('PROBE_5Q guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 妹妹同阶段已 3 轮无推进。请按 5 问探路第 2 问反问她。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'PROBE_5Q',
            nextQuestionId: 2 as const,
            injectPrompt,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你觉得这道题应该从哪个条件入手？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 15. KNOWLEDGE_FALLBACK (stuck) guard 命中 → 注入 injectPrompt，仍调用 LLM
    it('KNOWLEDGE_FALLBACK guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 5 问已用尽仍未推进。请按 PRD §8.4.2 收尾话术给出知识点提示，禁止给数值答案。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'KNOWLEDGE_FALLBACK',
            injectPrompt,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '这道题用到了因式分解，你有没有学过这个方法？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 16. state.messages 含 human+AI 消息 → recentMessages 映射两条分支均覆盖 ──
    it('state.messages 含 human/AI 消息 → recentMessages 正确截取，LLM 正常调用', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你觉得这道题应该用什么方法？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            // 同时包含 human 和 ai 消息，覆盖 recentMessages map 的两条分支
            messages: [
                new HumanMessage('我不太懂用什么方法'),
                new AIMessage('你觉得题目给的条件都用上了吗？'),
            ],
        });

        const result = await planNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        expect(result.messages).toHaveLength(1);
    });

    // ── 17. selectedQuestionIndex 指向不存在的问题 → 直接返回 {} ─────────────────
    it('selectedQuestionIndex 指向不存在的问题 → 直接返回 {}，不调用模型', async () => {
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult: { ...ocrResult, selectedQuestionIndex: 99 } as typeof ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 18. response.content 非字符串 → 降级为空字符串，正常返回消息 ───────────────
    it('response.content 非字符串 → 降级为空字符串，正常返回 AIMessage', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        // 返回非字符串 content（对象类型，模拟多模态 content）
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: [] } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
    });

    // ── 19. guard 放行（返回 null）→ HumanMessage 不含 guard 注入内容 ────────────
    it('guard 返回 null → HumanMessage 不含 guard 注入内容，走正常 LLM 路径', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你觉得这道题应该用什么方法？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await planNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        // 取 HumanMessage（SystemMessage 之后的第二个参数）
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const humanMsg = callArgs[1];
        expect(humanMsg).toBeDefined();
        expect(String(humanMsg.content)).not.toContain('[系统提示] 妹妹同阶段');
        expect(result.messages).toHaveLength(1);
    });
});
