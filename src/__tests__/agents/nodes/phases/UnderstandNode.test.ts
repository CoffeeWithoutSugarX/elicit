import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockState, makeSubProblem, makeSolvableOcrResult } from '@/__tests__/helpers/mockState';
import type { OcrResult } from '@/agents/schemas/OcrSchema';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

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

// ——— mock studentProfile（P-001 新增，避免读取真实 env）———
vi.mock('@/agents/data/studentProfile', () => ({
    studentGradeTerm: '7B',
}));

import { understandNode, understandNodeName } from '@/agents/nodes/phases/UnderstandNode';
import { chatModel } from '@/agents/models/deepseek-model';
import { getWriter } from '@langchain/langgraph';
import { runGuardChain } from '@/agents/nodes/guards/runGuardChain';
import { HumanMessage, AIMessage } from '@langchain/core/messages';

const mockRunGuardChain = vi.mocked(runGuardChain);

describe('understandNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. STAY 信号 → 返回消息，不改变阶段 ────────────────────────────────────
    it('STAY 信号 → 返回 AI 消息，不推进阶段，不触发 SSE', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你能说说题目让你求什么吗？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.UNDERSTAND,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        // 返回了 AI 消息，cleanContent 去掉了协议行
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].content).toBe('你能说说题目让你求什么吗？');
        // 阶段不应变化
        expect(result.currentPhase).toBeUndefined();
        // STAY 时 phase_changed 不应被调用，但 assistant_message 应被推送（nostream 干净正文）
        expect(mockWriter).not.toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed' })
        );
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'assistant_message' })
        );
    });

    // ── 2. COMPLETED 信号 → 推进到 PLAN，推送 SSE chunk ──────────────────────
    it('COMPLETED 信号 → currentPhase = PLAN，推送 phase_changed SSE chunk', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '我们对题目的理解一致了，接下来想想从哪入手？\nphase_signal: "COMPLETED"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            currentPhase: PolyaPhase.UNDERSTAND,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        // 消息存在且已清理协议行
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].content).toBe('我们对题目的理解一致了，接下来想想从哪入手？');
        // 阶段推进到 PLAN
        expect(result.currentPhase).toBe(PolyaPhase.PLAN);
        // SSE chunk 已推送（kind 字段确保外层 SSE part 为 data-custom）
        expect(mockWriter).toHaveBeenCalledWith({
            kind: 'phase_changed',
            phase: PolyaPhase.PLAN,
        });
        // nostream 模式下，干净正文应通过 assistant_message chunk 主动推出
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'assistant_message' })
        );
    });

    // ── 3. ocrResult 为 undefined → 返回空对象，不调用模型 ───────────────────
    it('ocrResult 为 undefined → 直接返回 {}，不调用模型', async () => {
        const state = createMockState({
            ocrResult: undefined,
            hasResolved: false,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 4. ocrResult.isSolvable=false → 返回空对象，不调用模型 ──────────────
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

        const result = await understandNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 5. subProblems 为空 → 返回空对象 ────────────────────────────────────
    it('subProblems 为空 → 直接返回 {}，不调用模型', async () => {
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 6. getWriter() 返回 null 时 COMPLETED 分支不抛异常 ───────────────────
    it('getWriter 返回 null 时 COMPLETED → 不抛异常，仍推进阶段', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '好，接下来想想怎么入手？\nphase_signal: "COMPLETED"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(result.currentPhase).toBe(PolyaPhase.PLAN);
    });

    // ── 7. understandNodeName 导出值正确 ─────────────────────────────────────
    it('understandNodeName 为 "understandNode"', () => {
        expect(understandNodeName).toBe('understandNode');
    });

    // ── 8. chatModel.invoke 被调用（验证模型实际被触发）────────────────────────
    it('正常情况下 chatModel.invoke 被调用一次', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你能复述一下题目让你求什么吗？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        await understandNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Guard Chain 分支
    // ──────────────────────────────────────────────────────────────────────────

    // ── 9. VISION_FAILURE guard 命中 → 直接返回视觉失败消息，不调用 LLM ────────
    it('VISION_FAILURE guard 命中 → 返回 AIMessage，不调用 chatModel', async () => {
        mockRunGuardChain.mockReturnValueOnce({ kind: 'VISION_FAILURE' });

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        // 返回了 AI 消息
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        // 消息内容包含视觉失败提示
        expect(result.messages![0].content).toContain('图片识别失败');
        // LLM 不应被调用
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 10. OUT_OF_SCOPE guard 命中 → 直接返回超范围消息，不调用 LLM ───────────
    it('OUT_OF_SCOPE guard 命中 → 返回 AIMessage，不调用 chatModel', async () => {
        mockRunGuardChain.mockReturnValueOnce({ kind: 'OUT_OF_SCOPE' });

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        expect(result.messages![0].content).toContain('超出了初中数学的范围');
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 11. PULL_BACK (deviation) guard 命中 → 注入 injectPrompt，仍调用 LLM ──
    it('PULL_BACK guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 先把这题搞定，别跑偏了。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'PULL_BACK',
            injectPrompt,
            pulledFromPhase: 0,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '我们先专注于理解题目吧。\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        // LLM 应当被调用
        expect(chatModel.invoke).toHaveBeenCalledOnce();
        // 调用参数中应含有 injectPrompt 内容（HumanMessage 第二个参数）
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        // 正常返回 AI 消息
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
    });

    // ── 12. PROBE_5Q (stuck) guard 命中 → 注入 injectPrompt，仍调用 LLM ────────
    it('PROBE_5Q guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 妹妹同阶段已 3 轮无推进。请按 5 问探路第 1 问反问她。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'PROBE_5Q',
            nextQuestionId: 1 as const,
            injectPrompt,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你能复述一下题目让你求什么吗？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 13. KNOWLEDGE_FALLBACK (stuck) guard 命中 → 注入 injectPrompt，仍调用 LLM
    it('KNOWLEDGE_FALLBACK guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 5 问已用尽仍未推进。请按 PRD §8.4.2 收尾话术给出知识点提示，禁止给数值答案。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'KNOWLEDGE_FALLBACK',
            injectPrompt,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '这道题用到了因式分解的思路，你有没有学过？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 14. state.messages 含 human+AI 消息 → recentMessages 映射两条分支均覆盖 ──
    it('state.messages 含 human/AI 消息 → recentMessages 正确截取，LLM 正常调用', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你能说说题目让你求什么吗？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            // 同时包含 human 和 ai 消息，覆盖 recentMessages map 的两条分支
            messages: [
                new HumanMessage('我不太懂这道题求什么'),
                new AIMessage('你能说说题目给的条件是什么？'),
            ],
        });

        const result = await understandNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        expect(result.messages).toHaveLength(1);
    });

    // ── 15. selectedQuestionIndex 指向不存在的问题 → 直接返回 {} ─────────────────
    it('selectedQuestionIndex 指向不存在的问题 → 直接返回 {}，不调用模型', async () => {
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult: { ...ocrResult, selectedQuestionIndex: 99 } as typeof ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 16. response.content 非字符串 → 降级为空字符串，正常返回消息 ───────────────
    it('response.content 非字符串 → 降级为空字符串，正常返回 AIMessage', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: [] } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
    });

    // ── 17. guard 放行（返回 null）→ 正常路径，HumanMessage 不含 guard 注入 ──────
    it('guard 返回 null → HumanMessage 不含 guard 注入内容，走正常 LLM 路径', async () => {
        // mockRunGuardChain 默认返回 null（beforeEach 中 vi.clearAllMocks 会重置 mock 实现，
        // 但 vi.mock factory 的默认值 () => null 在 clearAllMocks 后仍生效）
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你能说说题目让你求什么吗？\nphase_signal: "STAY"',
        } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        const result = await understandNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        // 取 HumanMessage（invoke 第二个参数）——SystemMessage 本身含"[系统提示]"字样，不检查
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string; _getType?: () => string }>;
        // HumanMessage 在 SystemMessage 之后
        const humanMsg = callArgs[1];
        expect(humanMsg).toBeDefined();
        // guard 未注入时 HumanMessage 不应有"[系统提示] 妹妹同阶段"等 guard 注入前缀
        expect(String(humanMsg.content)).not.toContain('[系统提示] 妹妹同阶段');
        expect(result.messages).toHaveLength(1);
    });

    // ── 18. 进入理解阶段时 emit sub_problem_changed（A1 修复验证）────────────────
    it('进入理解阶段时 emit sub_problem_changed（totalCount = subProblems.length）', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你先理解一下条件。\nphase_signal: "STAY"',
        } as never);

        // 准备含两个子问题的 state（多子问场景，totalCount 应为 2）
        const state = createMockState({
            ocrResult: makeSolvableOcrResult(),
            hasResolved: true,
            currentSubProblemIndex: 0,
            subProblems: [
                makeSubProblem({ index: 0, goal: '求x' }),
                makeSubProblem({ index: 1, goal: '求y' }),
            ],
        });

        await understandNode(state);

        // 验证：进入理解阶段时，必须在第一时间 emit sub_problem_changed，
        // 让前端在理解/规划阶段也能正确显示 totalSubProblems
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({
                kind: 'sub_problem_changed',
                currentIndex: 0,
                totalCount: 2,
            })
        );
    });

    // ── 19. getWriter 返回 null 时，sub_problem_changed emit 安全跳过 ────────────
    it('getWriter 返回 null 时，sub_problem_changed emit 安全跳过，不抛异常', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '理解题目吧。\nphase_signal: "STAY"',
        } as never);

        const state = createMockState({
            ocrResult: makeSolvableOcrResult(),
            hasResolved: true,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
        });

        // 不应抛出异常
        await expect(understandNode(state)).resolves.not.toThrow();
    });
});
