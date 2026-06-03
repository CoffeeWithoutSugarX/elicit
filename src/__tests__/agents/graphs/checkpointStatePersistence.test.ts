/**
 * 不变量测试：跨 invoke checkpoint 状态持久化
 *
 * 防止 blocker② 回归：LangGraph 每次 stream(partialInput) 时会用 input schema 的
 * .partial().parse() 给缺省字段补 default 值写回 channel，从而覆盖 checkpoint 中
 * 已 updateState 写入的值。
 *
 * 解决方案：独立 input schema（ElicitGraphInputSchema）只含 HTTP 输入携带的字段，
 * 其余字段（hasResolved / currentPhase / subProblems 等）不在 input schema 中，
 * 确保跨 invoke 时这些字段不被 default 值覆盖。
 *
 * 本测试使用 MemorySaver 构建与生产同款 schema 的最小 graph，验证：
 *   invoke1(full input)
 *   → updateState({ hasResolved:true, currentPhase:PLAN, subProblems:[...] })
 *   → invoke2(仅 messages+userId+conversationId)
 *   → getState().values 里 hasResolved 仍 true、currentPhase 仍 PLAN、
 *     subProblems 仍非空、messages 经两次 invoke 正确累积
 */
import { describe, it, expect, vi } from 'vitest';
import { END, MemorySaver, START, StateGraph } from '@langchain/langgraph';
import {
    ElicitGraphStateSchema,
    ElicitGraphInputSchema,
    type SubProblemState,
} from '@/agents/schemas/ElicitGraphStateSchema';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { ProblemType } from '@/types/enums/problemType.enum';

// ——— 禁止真实模型调用（本测试不需要任何 LLM）———
vi.mock('@/agents/models/deepseek-model', () => ({
    chatModel: { invoke: vi.fn() },
}));

// ——— 构建最小测试用 SubProblemState ———
function makeTestSubProblem(): SubProblemState {
    return {
        index: 0,
        goal: '求解方程',
        givenConditions: ['$x^2 - 4x + 3 = 0$'],
        milestones: ['分解因式'],
        status: 'pending',
        insightPoints: [],
        stuckCountPerPhase: { understand: 0, plan: 0, execute: 0, review: 0 },
        probedQuestionIdsPerPhase: { understand: [], plan: [], execute: [], review: [] },
    };
}

// ——— 构建与生产同款 schema 的最小 graph ———
function buildMinimalGraph(checkpointer: MemorySaver) {
    // passthrough 节点：不改变状态，仅记录被调用
    const noopNode = async () => ({});

    const graph = new StateGraph({
        state: ElicitGraphStateSchema,
        input: ElicitGraphInputSchema,
    })
        .addNode('noop', noopNode)
        .addEdge(START, 'noop')
        .addEdge('noop', END);

    return graph.compile({ checkpointer });
}

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const CONV_ID = '123e4567-e89b-12d3-a456-426614174000';
const CONFIG = { configurable: { thread_id: CONV_ID } };

describe('跨 invoke checkpoint 状态持久化（防 blocker② 回归）', () => {
    it('updateState 写入的 hasResolved/currentPhase/subProblems 在 invoke2 后不被 default 值覆盖', async () => {
        const checkpointer = new MemorySaver();
        const compiledGraph = buildMinimalGraph(checkpointer);

        // ——— invoke1：提供完整 input（含 messages）———
        const invoke1Input = {
            messages: [new HumanMessage('第一条消息')],
            userId: USER_ID,
            conversationId: CONV_ID,
        };

        for await (const _ of await compiledGraph.stream(invoke1Input, {
            streamMode: ['values'],
            configurable: CONFIG.configurable,
        })) {
            // 消费 stream
        }

        // ——— updateState：模拟 /resolve 路由写入 hasResolved、currentPhase、subProblems ———
        await compiledGraph.updateState(CONFIG, {
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
            subProblems: [makeTestSubProblem()],
            currentSubProblemIndex: 0,
            problemType: ProblemType.ALGEBRA,
        });

        // 验证 updateState 写入成功
        const stateAfterUpdate = await compiledGraph.getState(CONFIG);
        expect(stateAfterUpdate.values.hasResolved).toBe(true);
        expect(stateAfterUpdate.values.currentPhase).toBe(PolyaPhase.PLAN);
        expect(stateAfterUpdate.values.subProblems).toHaveLength(1);

        // ——— invoke2：仅携带 messages+userId+conversationId（模拟 /resolve 的第二次 stream）———
        // 关键：不携带 hasResolved / currentPhase / subProblems 等字段
        const invoke2Input = {
            messages: [],
            userId: USER_ID,
            conversationId: CONV_ID,
        };

        for await (const _ of await compiledGraph.stream(invoke2Input, {
            streamMode: ['values'],
            configurable: CONFIG.configurable,
        })) {
            // 消费 stream
        }

        // ——— 验证：checkpoint 里的状态不被 invoke2 的 default 值覆盖 ———
        const finalState = await compiledGraph.getState(CONFIG);

        // hasResolved 仍是 updateState 写入的 true，不被 default(false) 覆盖
        expect(finalState.values.hasResolved).toBe(true);

        // currentPhase 仍是 PLAN，不被 default(UNDERSTAND) 覆盖
        expect(finalState.values.currentPhase).toBe(PolyaPhase.PLAN);

        // subProblems 仍非空，不被 default([]) 覆盖
        expect(finalState.values.subProblems).toHaveLength(1);
        expect(finalState.values.subProblems[0].goal).toBe('求解方程');

        // currentSubProblemIndex 仍是 updateState 写入的 0
        expect(finalState.values.currentSubProblemIndex).toBe(0);
    });

    it('invoke1 读取顶层 schema 默认值（hasResolved=false, currentPhase=UNDERSTAND, subProblems=[]）', async () => {
        // 使用新的 CONV_ID 避免和上一个测试共享 checkpoint
        const newConvId = '223e4567-e89b-12d3-a456-426614174001';
        const newConfig = { configurable: { thread_id: newConvId } };

        const checkpointer = new MemorySaver();
        const compiledGraph = buildMinimalGraph(checkpointer);

        const invoke1Input = {
            messages: [new HumanMessage('初次消息')],
            userId: USER_ID,
            conversationId: newConvId,
        };

        for await (const _ of await compiledGraph.stream(invoke1Input, {
            streamMode: ['values'],
            configurable: newConfig.configurable,
        })) {
            // 消费 stream
        }

        const state = await compiledGraph.getState(newConfig);

        // invoke1 时这些字段应读取 schema 默认值（registry default）
        expect(state.values.hasResolved).toBe(false);
        expect(state.values.currentPhase).toBe(PolyaPhase.UNDERSTAND);
        expect(state.values.subProblems).toEqual([]);
        expect(state.values.lastDeviationAt).toBeNull();
        expect(state.values.currentSubProblemIndex).toBe(0);
    });

    it('messages 经两次 invoke 正确累积（追加而非替换）', async () => {
        const newConvId = '323e4567-e89b-12d3-a456-426614174002';
        const newConfig = { configurable: { thread_id: newConvId } };

        const checkpointer = new MemorySaver();
        const compiledGraph = buildMinimalGraph(checkpointer);

        // invoke1：发送第一条人类消息
        for await (const _ of await compiledGraph.stream(
            { messages: [new HumanMessage('第一条')], userId: USER_ID, conversationId: newConvId },
            { streamMode: ['values'], configurable: newConfig.configurable },
        )) { /* 消费 */ }

        // 模拟节点写了一条 AI 消息（在实际 graph 中节点会 return { messages: [new AIMessage(...)] }）
        await compiledGraph.updateState(newConfig, {
            messages: [new AIMessage('第一条 AI 回复')],
        });

        // invoke2：发送第二条人类消息
        for await (const _ of await compiledGraph.stream(
            { messages: [new HumanMessage('第二条')], userId: USER_ID, conversationId: newConvId },
            { streamMode: ['values'], configurable: newConfig.configurable },
        )) { /* 消费 */ }

        const state = await compiledGraph.getState(newConfig);

        // messages 应追加（MessagesZodMeta 的 reducer 是 addMessages），不应被清空
        // 至少包含 invoke1 的人类消息 + AI 回复 + invoke2 的人类消息
        expect(state.values.messages.length).toBeGreaterThanOrEqual(3);

        // 验证消息内容（按顺序）
        const contents = state.values.messages.map((m: { content: unknown }) =>
            typeof m.content === 'string' ? m.content : '',
        );
        expect(contents).toContain('第一条');
        expect(contents).toContain('第一条 AI 回复');
        expect(contents).toContain('第二条');
    });
});
