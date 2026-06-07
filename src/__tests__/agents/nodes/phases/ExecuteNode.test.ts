import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockState, makeSubProblem, makeSolvableOcrResult } from '@/__tests__/helpers/mockState';
import type { OcrResult } from '@/agents/schemas/OcrSchema';

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

import { executeNode, executeNodeName } from '@/agents/nodes/phases/ExecuteNode';
import { chatModel } from '@/agents/models/deepseek-model';
import { getWriter } from '@langchain/langgraph';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { runGuardChain } from '@/agents/nodes/guards/runGuardChain';

const mockRunGuardChain = vi.mocked(runGuardChain);

// ——— 辅助：构建模型返回值（末尾追加信号行）———
function makeModelResponse(signal: string, extras = ''): { content: string } {
    return {
        content: `下一步你怎么想？${extras ? '\n' + extras : ''}\nphase_signal: "${signal}"`,
    };
}

describe('executeNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. STAY 信号 — 无状态变更 ────────────────────────────────────────────────
    it('STAY 信号 → messages 包含回复，subProblems 状态不变', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('STAY') as never);

        const subProblem = makeSubProblem({ index: 0, status: 'pending', insightPoints: [] });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        // 返回 AI 消息
        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        // subProblems 状态不变（STAY）
        if (result.subProblems) {
            expect(result.subProblems[0].status).toBe('pending');
        }
        // STAY 不推 phase_changed（kind 字段新契约）
        expect(mockWriter).not.toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed' }),
        );
        // nostream 模式下，assistant_message 应被推送
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'assistant_message' }),
        );
    });

    // ── 2. SUB_PROBLEM_DONE — subProblems[0].status = 'done' ─────────────────────
    it('SUB_PROBLEM_DONE 信号 → subProblems[currentIndex].status = "done"', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('SUB_PROBLEM_DONE') as never);

        const subProblem = makeSubProblem({ index: 0, status: 'pending' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].status).toBe('done');
        // 推送 phase_changed chunk（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed', phase: PolyaPhase.EXECUTE }),
        );
    });

    // ── 3. PROBLEM_BLOCKED — subProblems[0].status = 'blocked' ──────────────────
    it('PROBLEM_BLOCKED 信号 → subProblems[currentIndex].status = "blocked"', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('PROBLEM_BLOCKED') as never);

        const subProblem = makeSubProblem({ index: 0, status: 'pending' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].status).toBe('blocked');
        // 推送 phase_changed chunk（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed', phase: PolyaPhase.EXECUTE }),
        );
    });

    // ── 4. ESCALATE — 无 status 变更，推送 phase_changed → PLAN ─────────────────
    it('ESCALATE 信号 → subProblems status 不变，推送 phase_changed 到 PLAN', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('ESCALATE') as never);

        const subProblem = makeSubProblem({ index: 0, status: 'pending' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        // status 保持不变
        if (result.subProblems) {
            expect(result.subProblems[0].status).toBe('pending');
        }
        // 推送 PLAN 信号（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'phase_changed', phase: PolyaPhase.PLAN }),
        );
    });

    // ── 5. new_insight 提取 — 追加到 insightPoints ───────────────────────────────
    it('模型输出含 new_insight → 追加到 subProblems[currentIndex].insightPoints', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '很好！三点共线时最短。\nnew_insight: "三点共线折线最短"\nphase_signal: "STAY"',
        } as never);

        const subProblem = makeSubProblem({
            index: 0,
            status: 'pending',
            insightPoints: ['利用对称将 PA 转化为 PA\''],
        });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toBeDefined();
        const updatedSp = result.subProblems![0];
        // 原来有 1 个，追加后应有 2 个
        expect(updatedSp.insightPoints).toHaveLength(2);
        expect(updatedSp.insightPoints[1]).toBe('三点共线折线最短');
    });

    // ── 6. probedQuestionId 提取 — 追加到 probedQuestionIdsPerPhase.execute ──────
    it('模型输出含 probed_question_id → 追加到 probedQuestionIdsPerPhase.execute', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue({
            content: '你能说说下一步的想法吗？\nprobed_question_id: 2\nphase_signal: "STAY"',
        } as never);

        const subProblem = makeSubProblem({
            index: 0,
            status: 'pending',
            probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [1], review: [] },
        });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].probedQuestionIdsPerPhase.execute).toContain(2);
        // 原来的 id=1 仍保留
        expect(result.subProblems![0].probedQuestionIdsPerPhase.execute).toContain(1);
    });

    // ── 7. ocrResult 不可解 → 直接返回 {} ────────────────────────────────────────
    it('ocrResult.isSolvable=false → 直接返回 {}，不调用模型', async () => {
        const ocrResult: OcrResult = {
            isSolvable: false,
            subject: 'chinese',
            questions: [],
            errorReason: 'NOT_SOLVABLE',
        };
        const state = createMockState({ ocrResult, currentPhase: PolyaPhase.EXECUTE });
        const result = await executeNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 8. ocrResult 为 undefined → 直接返回 {} ──────────────────────────────────
    it('ocrResult 为 undefined → 直接返回 {}，不调用模型', async () => {
        const state = createMockState({ ocrResult: undefined, currentPhase: PolyaPhase.EXECUTE });
        const result = await executeNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 9. 多个 subProblems — 只更新 currentSubProblemIndex 指向的那个 ───────────
    it('多 subProblems + SUB_PROBLEM_DONE → 只更新 index=1 的小问，其他不变', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('SUB_PROBLEM_DONE') as never);

        const sp0 = makeSubProblem({ index: 0, status: 'done' });
        const sp1 = makeSubProblem({ index: 1, status: 'pending', goal: '求面积' });
        const ocrResult = makeSolvableOcrResult();
        // 扩展 questions[0].subProblems 不影响 state 中的 subProblems
        const state = createMockState({
            ocrResult,
            subProblems: [sp0, sp1],
            currentSubProblemIndex: 1,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toHaveLength(2);
        // index=0 的状态不变
        expect(result.subProblems![0].status).toBe('done');
        // index=1 变为 done
        expect(result.subProblems![1].status).toBe('done');
    });

    // ── 10. chatModel 抛出异常 → 容错兜底回复 ────────────────────────────────────
    it('chatModel 抛异常 → 容错兜底，返回错误提示消息', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockRejectedValue(new Error('Network timeout'));

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
    });

    // ── 11. executeNodeName 导出值正确 ───────────────────────────────────────────
    it('executeNodeName 为 "executeNode"', () => {
        expect(executeNodeName).toBe('executeNode');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // Guard Chain 分支
    // ──────────────────────────────────────────────────────────────────────────

    // ── 12. VISION_FAILURE guard 命中 → 直接返回视觉失败消息，不调用 LLM ─────────
    it('VISION_FAILURE guard 命中 → 返回 AIMessage，不调用 chatModel', async () => {
        mockRunGuardChain.mockReturnValueOnce({ kind: 'VISION_FAILURE' });

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        expect(result.messages![0].content).toContain('图片识别失败');
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 13. OUT_OF_SCOPE guard 命中 → 直接返回超范围消息，不调用 LLM ────────────
    it('OUT_OF_SCOPE guard 命中 → 返回 AIMessage，不调用 chatModel', async () => {
        mockRunGuardChain.mockReturnValueOnce({ kind: 'OUT_OF_SCOPE' });

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
        expect(result.messages![0].content).toContain('超出了初中数学的范围');
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 14. PULL_BACK (deviation) guard 命中 → 注入 injectPrompt，仍调用 LLM ───
    it('PULL_BACK guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 先把这题搞定，别跑偏了。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'PULL_BACK',
            injectPrompt,
            pulledFromPhase: 2,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('STAY') as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 15. PROBE_5Q (stuck) guard 命中 → 注入 injectPrompt，仍调用 LLM ─────────
    it('PROBE_5Q guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 妹妹同阶段已 3 轮无推进。请按 5 问探路第 3 问反问她。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'PROBE_5Q',
            nextQuestionId: 3 as const,
            injectPrompt,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('STAY') as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 16. KNOWLEDGE_FALLBACK (stuck) guard 命中 → 注入 injectPrompt，仍调用 LLM
    it('KNOWLEDGE_FALLBACK guard 命中 → injectPrompt 追加到 user content，仍调用 LLM 一次', async () => {
        const injectPrompt = '[系统提示] 5 问已用尽仍未推进。请按 PRD §8.4.2 收尾话术给出知识点提示，禁止给数值答案。';
        mockRunGuardChain.mockReturnValueOnce({
            kind: 'KNOWLEDGE_FALLBACK',
            injectPrompt,
        });
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('STAY') as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const userMsg = callArgs.find(m => m.content && String(m.content).includes(injectPrompt));
        expect(userMsg).toBeDefined();
        expect(result.messages).toHaveLength(1);
    });

    // ── 17. selectedQuestion 不存在 → 直接返回 {} ────────────────────────────────
    it('ocrResult.selectedQuestionIndex 指向不存在的问题 → 直接返回 {}，不调用模型', async () => {
        const ocrResult = {
            ...makeSolvableOcrResult(),
            selectedQuestionIndex: 99,
        } as ReturnType<typeof makeSolvableOcrResult>;
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 18. currentSubProblem 不存在 → 直接返回 {} ───────────────────────────────
    it('subProblems 为空（currentSubProblem 不存在）→ 直接返回 {}，不调用模型', async () => {
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [], // 空数组，currentSubProblem 不存在
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result).toEqual({});
        expect(chatModel.invoke).not.toHaveBeenCalled();
    });

    // ── 19. SUB_PROBLEM_DONE + 存在下一个 pending 子问 → 推进 currentSubProblemIndex
    it('SUB_PROBLEM_DONE + 下一个 pending 子问存在 → currentSubProblemIndex 推进，currentPhase=UNDERSTAND', async () => {
        const mockWriter = vi.fn();
        vi.mocked(getWriter).mockReturnValue(mockWriter);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('SUB_PROBLEM_DONE') as never);

        const sp0 = makeSubProblem({ index: 0, status: 'pending', goal: '第一问' });
        const sp1 = makeSubProblem({ index: 1, status: 'pending', goal: '第二问' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [sp0, sp1],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        // 下一个 pending 子问存在（index=1），应推进 currentSubProblemIndex
        expect(result.currentSubProblemIndex).toBe(1);
        // 阶段重置为 UNDERSTAND
        expect(result.currentPhase).toBe(PolyaPhase.UNDERSTAND);
        // 推送 sub_problem_changed chunk（kind 字段新契约）
        expect(mockWriter).toHaveBeenCalledWith(
            expect.objectContaining({ kind: 'sub_problem_changed', currentIndex: 1 }),
        );
    });

    // ── 20. SUB_PROBLEM_DONE + writer=null → 不抛异常，仍正确更新 status ──────────
    it('SUB_PROBLEM_DONE + getWriter 返回 null → 不抛异常，status 变为 done', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('SUB_PROBLEM_DONE') as never);

        const subProblem = makeSubProblem({ index: 0, status: 'pending' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].status).toBe('done');
    });

    // ── 21. response.content 非字符串 → 降级为空字符串，正常返回消息 ─────────────
    it('response.content 非字符串 → 降级为空字符串，正常返回 AIMessage', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue({ content: [] } as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.messages).toHaveLength(1);
        expect(result.messages![0].getType()).toBe('ai');
    });

    // ── 22. PROBLEM_BLOCKED + writer=null → 不抛异常，status 变为 blocked ─────────
    it('PROBLEM_BLOCKED + getWriter 返回 null → 不抛异常，status 变为 blocked', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('PROBLEM_BLOCKED') as never);

        const subProblem = makeSubProblem({ index: 0, status: 'pending' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].status).toBe('blocked');
    });

    // ── 23. ESCALATE + writer=null → 不抛异常，currentPhase 回退到 PLAN ────────
    it('ESCALATE + getWriter 返回 null → 不抛异常，currentPhase=PLAN', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('ESCALATE') as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.currentPhase).toBe(PolyaPhase.PLAN);
    });

    // ── 24. SUB_PROBLEM_DONE + 下一个 pending 子问存在 + writer=null → 不抛异常 ─
    it('SUB_PROBLEM_DONE + 下一 pending 存在 + writer=null → 不抛异常，currentSubProblemIndex 推进', async () => {
        vi.mocked(getWriter).mockReturnValue(null as never);
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('SUB_PROBLEM_DONE') as never);

        const sp0 = makeSubProblem({ index: 0, status: 'pending', goal: '第一问' });
        const sp1 = makeSubProblem({ index: 1, status: 'pending', goal: '第二问' });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [sp0, sp1],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.currentSubProblemIndex).toBe(1);
        expect(result.currentPhase).toBe(PolyaPhase.UNDERSTAND);
    });

    // ── 25. STAY 信号 → stuckCount 递增（applySignalSideEffects 集成验证）────────
    it('STAY 信号 → stuckCountPerPhase.execute 从 0 递增到 1（applySignalSideEffects 集成）', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('STAY') as never);

        const subProblem = makeSubProblem({
            index: 0,
            status: 'pending',
            stuckCountPerPhase: { understand: 0, plan: 0, execute: 0, review: 0 },
        });
        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [subProblem],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(result.subProblems).toBeDefined();
        expect(result.subProblems![0].stuckCountPerPhase.execute).toBe(1);
    });

    // ── 18. guard 放行（返回 null）→ 最后一条 HumanMessage 不含 guard 注入内容 ──
    it('guard 返回 null → 最后 HumanMessage 不含 guard 注入内容，走正常 LLM 路径', async () => {
        vi.mocked(getWriter).mockReturnValue(vi.fn());
        vi.mocked(chatModel.invoke).mockResolvedValue(makeModelResponse('STAY') as never);

        const ocrResult = makeSolvableOcrResult();
        const state = createMockState({
            ocrResult,
            subProblems: [makeSubProblem()],
            currentSubProblemIndex: 0,
            currentPhase: PolyaPhase.EXECUTE,
        });

        const result = await executeNode(state);

        expect(chatModel.invoke).toHaveBeenCalledOnce();
        // ExecuteNode 的 invoke 调用顺序：[SystemMessage, ...fewShotMessages, HumanMessage]
        // 最后一个元素是实际的用户 HumanMessage
        const callArgs = vi.mocked(chatModel.invoke).mock.calls[0][0] as Array<{ content: string }>;
        const lastMsg = callArgs[callArgs.length - 1];
        expect(lastMsg).toBeDefined();
        // guard 未注入时最后 HumanMessage 不含 guard 注入的特定标记
        expect(String(lastMsg.content)).not.toContain('[系统提示] 妹妹同阶段');
        expect(result.messages).toHaveLength(1);
    });
});
