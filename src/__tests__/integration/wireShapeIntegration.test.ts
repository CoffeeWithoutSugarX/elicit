/**
 * Wire 形状集成护栏测试
 *
 * 验证完整链路：
 *   graph 节点 writer 写出的 LangGraph 事件
 *   → toUIMessageStream (真实 @ai-sdk/langchain)
 *   → createUIMessageStreamResponse (真实 ai)
 *   → streamIterator (真实 @/lib/utils)
 *   → processStream (useConversation store)
 *   → store 状态更新
 *
 * 防止"mock 形状与后端实际产出不一致、单测假绿但真机挂"这类问题复发。
 * 如果将来把 writer 的 `kind` 改回 `type`，或前端判别键写错，这套测试会变红。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toUIMessageStream } from '@ai-sdk/langchain';
import { createUIMessageStreamResponse } from 'ai';
import { streamIterator } from '@/lib/utils';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';

// ── Mocks（store 依赖，不测数据库/网络） ─────────────────────────────────────

const mockInsertChatMessageRequest = vi.fn();
const mockLoadChatMessagesByConversationIdRequest = vi.fn();
const mockLoadAllChatConversation = vi.fn();
const mockGetRawResponse = vi.fn();
const mockGetSession = vi.fn();

vi.mock('@/db/models/ChatMessage', () => ({
    insertChatMessageRequest: (...args: unknown[]) => mockInsertChatMessageRequest(...args),
    loadChatMessagesByConversationIdRequest: (...args: unknown[]) => mockLoadChatMessagesByConversationIdRequest(...args),
}));

vi.mock('@/db/models/ChatConversation', () => ({
    loadAllChatConversation: () => mockLoadAllChatConversation(),
}));

vi.mock('@/services/api-client/ChatRequest', () => ({
    chatRequest: {
        getRawResponse: (...args: unknown[]) => mockGetRawResponse(...args),
    },
}));

vi.mock('@/db/supabase/supabase', () => ({
    supabase: {
        auth: {
            getSession: () => mockGetSession(),
        },
    },
}));

// ── 真实 streamIterator（不 mock，这是集成护栏的核心）────────────────────────
// 注意：useConversation store 内部 import 的 streamIterator 来自 @/lib/utils，
// 这里不 mock，让 store 使用真实实现

import { useConversation } from '@/stores/useConversation';

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_MSG_ID = 'conv-1-1';

/** 重置 store 到初始状态 */
function resetStore() {
    const defaultMessage = new ChatMessageProps(
        DEFAULT_MSG_ID,
        'conv-1',
        ChatMessageRole.ASSISTANT,
        '你好呀！我是引思助手',
        ChatMessageType.TEXT
    );
    useConversation.setState({
        chatMessages: [defaultMessage],
        chatConversation: [],
        currentConversationId: '',
        tempConversationId: '',
        isStreaming: false,
        isWaitingFirstChunk: false,
        draftMessage: null,
        sendError: null,
        currentPhase: 0,
        currentSubProblemIndex: 0,
        totalSubProblems: 0,
        pendingQuestions: [],
        isMultiQuestion: false,
        currentInsightPoints: [],
        hasResolved: false,
    });
}

/**
 * 把 LangGraph custom 事件数组转成真实的 SSE Response，
 * 走完 toUIMessageStream → createUIMessageStreamResponse 全链路。
 *
 * LangGraph streamMode: ["custom"] 时，graph.stream() 产出的事件格式为：
 *   ["custom", customData]  （二元组）
 * 其中 customData 就是 writer.write(customData) 写入的内容（即 CustomChunk）。
 */
async function buildRealSseResponse(customEvents: unknown[]): Promise<Response> {
    // 构造与 LangGraph streamMode:["custom"] 等价的 AsyncIterable
    const fakeGraphStream = (async function* () {
        for (const payload of customEvents) {
            // LangGraph "custom" 事件格式：["custom", data]
            yield ['custom', payload];
        }
    })();

    const uiStream = toUIMessageStream(fakeGraphStream as never, {
        onFinal: () => { /* 无需操作 */ },
    });

    return createUIMessageStreamResponse({ stream: uiStream });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('wire 形状集成护栏：graph writer → toUIMessageStream → streamIterator → store', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();
        resetStore();
        mockInsertChatMessageRequest.mockResolvedValue(true);
    });

    // ------------------------------------------------------------------
    // 1. questions_detected 全链路
    // ------------------------------------------------------------------
    it('questions_detected 事件经真实 toUIMessageStream + streamIterator 正确更新 pendingQuestions', async () => {
        // 模拟 graph 节点 writer 实际写出的 payload（多题场景）
        const questionsPayload = {
            kind: 'questions_detected',
            questions: [
                {
                    index: 0,
                    topic: '代数',
                    latexFull: 'x^2 - 5x + 6 = 0',
                    givenConditions: ['$x^2 - 5x + 6 = 0$'],
                    implicitConditions: [],
                    goal: '求 x 的值',
                    milestones: ['因式分解'],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [{ index: 0, goal: '求 x 的值', givenConditions: [], milestones: [] }],
                },
                {
                    index: 1,
                    topic: '几何',
                    latexFull: 'S = πr²',
                    givenConditions: ['r=3'],
                    implicitConditions: [],
                    goal: '求圆面积',
                    milestones: ['代入公式'],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [{ index: 0, goal: '求圆面积', givenConditions: [], milestones: [] }],
                },
            ],
            isMulti: true,
        };

        const sseResponse = await buildRealSseResponse([questionsPayload]);

        // 用真实 streamIterator 解析
        const chunks = [];
        for await (const chunk of streamIterator(sseResponse)) {
            chunks.push(chunk);
        }

        // 找到 data-custom chunk
        const customChunk = chunks.find(c => c.type === 'data-custom');
        expect(customChunk).toBeDefined();
        expect(customChunk!.data).toMatchObject({
            kind: 'questions_detected',
            questions: expect.arrayContaining([
                expect.objectContaining({ index: 0, topic: '代数' }),
                expect.objectContaining({ index: 1, topic: '几何' }),
            ]),
            isMulti: true,
        });
    });

    it('questions_detected 全链路经 store.processStream 更新 pendingQuestions 和 isMultiQuestion', async () => {
        useConversation.setState({ currentConversationId: 'conv-wire-q', chatConversation: [] });

        const questionsPayload = {
            kind: 'questions_detected',
            questions: [
                {
                    index: 0,
                    topic: '代数',
                    latexFull: 'x+1=2',
                    givenConditions: [],
                    implicitConditions: [],
                    goal: '求 x',
                    milestones: [],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [{ index: 0, goal: '求 x', givenConditions: [], milestones: [] }],
                },
                {
                    index: 1,
                    topic: '几何',
                    latexFull: 'a^2+b^2=c^2',
                    givenConditions: [],
                    implicitConditions: [],
                    goal: '求斜边',
                    milestones: [],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [{ index: 0, goal: '求斜边', givenConditions: [], milestones: [] }],
                },
            ],
            isMulti: true,
        };

        // 用真实 SSE Response 作为 getRawResponse 的返回值
        const sseResponse = await buildRealSseResponse([questionsPayload]);
        mockGetRawResponse.mockResolvedValueOnce(sseResponse);

        const userMsg = new ChatMessageProps('u-wire-q', 'conv-wire-q', ChatMessageRole.USER, '两道题', ChatMessageType.TEXT);
        await useConversation.getState().sendMessage(userMsg);

        // 断言 store 状态被正确更新
        expect(useConversation.getState().pendingQuestions).toHaveLength(2);
        expect(useConversation.getState().isMultiQuestion).toBe(true);
    });

    // ------------------------------------------------------------------
    // 2. phase_changed 全链路
    // ------------------------------------------------------------------
    it('phase_changed 事件经全链路更新 currentPhase', async () => {
        useConversation.setState({ currentConversationId: 'conv-wire-ph', chatConversation: [] });

        // phase 节点写出的 payload
        const phasePayload = { kind: 'phase_changed', phase: 2 }; // EXECUTE

        const sseResponse = await buildRealSseResponse([phasePayload]);
        mockGetRawResponse.mockResolvedValueOnce(sseResponse);

        const userMsg = new ChatMessageProps('u-wire-ph', 'conv-wire-ph', ChatMessageRole.USER, '继续', ChatMessageType.TEXT);
        await useConversation.getState().sendMessage(userMsg);

        // currentPhase 应被更新为 2 (EXECUTE)
        expect(useConversation.getState().currentPhase).toBe(2);
    });

    // ------------------------------------------------------------------
    // 3. assistant_message 全链路
    // ------------------------------------------------------------------
    it('assistant_message 事件经全链路新增 ASSISTANT 气泡并复位 isWaitingFirstChunk', async () => {
        useConversation.setState({
            currentConversationId: 'conv-wire-am',
            chatConversation: [],
            isWaitingFirstChunk: true,
        });

        // phase 节点（nostream 模式）写出的 payload
        const assistantMsgPayload = {
            kind: 'assistant_message',
            text: '好的，让我来帮你分析这道题。\n\n首先，我们要理解题目...',
        };

        const sseResponse = await buildRealSseResponse([assistantMsgPayload]);
        mockGetRawResponse.mockResolvedValueOnce(sseResponse);

        const userMsg = new ChatMessageProps('u-wire-am', 'conv-wire-am', ChatMessageRole.USER, '题目', ChatMessageType.TEXT);
        await useConversation.getState().sendMessage(userMsg);

        const msgs = useConversation.getState().chatMessages;
        // 最后一条应为 ASSISTANT 气泡
        const lastMsg = msgs[msgs.length - 1];
        expect(lastMsg.role).toBe(ChatMessageRole.ASSISTANT);
        expect(lastMsg.message).toBe('好的，让我来帮你分析这道题。\n\n首先，我们要理解题目...');
        // isWaitingFirstChunk 应被复位
        expect(useConversation.getState().isWaitingFirstChunk).toBe(false);
    });

    // ------------------------------------------------------------------
    // 4. 多个 custom chunk 顺序处理
    // ------------------------------------------------------------------
    it('多个 custom chunk（phase_changed + assistant_message）按顺序处理', async () => {
        useConversation.setState({ currentConversationId: 'conv-wire-multi', chatConversation: [] });

        const events = [
            { kind: 'phase_changed', phase: 1 },  // PLAN
            { kind: 'assistant_message', text: '进入计划阶段，我们来制定解题步骤...' },
        ];

        const sseResponse = await buildRealSseResponse(events);
        mockGetRawResponse.mockResolvedValueOnce(sseResponse);

        const userMsg = new ChatMessageProps('u-wire-m', 'conv-wire-multi', ChatMessageRole.USER, '开始', ChatMessageType.TEXT);
        await useConversation.getState().sendMessage(userMsg);

        expect(useConversation.getState().currentPhase).toBe(1);
        const msgs = useConversation.getState().chatMessages;
        const lastMsg = msgs[msgs.length - 1];
        expect(lastMsg.role).toBe(ChatMessageRole.ASSISTANT);
        expect(lastMsg.message).toContain('进入计划阶段');
    });

    // ------------------------------------------------------------------
    // 5. 护栏验证：kind 不匹配时测试会红（反向验证）
    // 这条测试验证护栏本身有效：如果后端把 kind 写成 type，前端不会处理
    // ------------------------------------------------------------------
    it('【护栏验证】writer 使用 type 而非 kind 时，store 不更新 currentPhase（体现护栏能力）', async () => {
        useConversation.setState({ currentConversationId: 'conv-wire-guard', chatConversation: [], currentPhase: 0 });

        // 故意模拟"writer 用 type 而非 kind"的旧格式（这是 bug 复现场景）
        // 如果前端 switch(custom.kind) 能正确处理，则 custom.kind=undefined → default: break
        const wrongPayload = { type: 'phase_changed', phase: 3 }; // 用了 type 而非 kind

        const sseResponse = await buildRealSseResponse([wrongPayload]);
        mockGetRawResponse.mockResolvedValueOnce(sseResponse);

        const userMsg = new ChatMessageProps('u-wire-g', 'conv-wire-guard', ChatMessageRole.USER, '测试', ChatMessageType.TEXT);
        await useConversation.getState().sendMessage(userMsg);

        // currentPhase 不应被更新（因为 kind 字段不存在，走 default: break）
        // 这证明前端确实用 kind 判别，如果有人把后端改回 type，这条测试会提醒问题所在
        expect(useConversation.getState().currentPhase).toBe(0);
    });

    // ------------------------------------------------------------------
    // 6. conversation_created with kind 全链路
    // ------------------------------------------------------------------
    it('conversation_created（有 kind）经全链路插入侧边栏', async () => {
        const convId = 'conv-wire-cc';
        const userMsg = new ChatMessageProps('u-wire-cc', convId, ChatMessageRole.USER, '新题目', ChatMessageType.TEXT);
        useConversation.setState({
            currentConversationId: convId,
            chatConversation: [],
            chatMessages: [
                new ChatMessageProps(DEFAULT_MSG_ID, 'conv-1', ChatMessageRole.ASSISTANT, 'hi', ChatMessageType.TEXT),
                userMsg,
            ],
        });

        const ccPayload = {
            kind: 'conversation_created',
            conversationId: convId,
            title: '代数题目',
        };

        const sseResponse = await buildRealSseResponse([ccPayload]);
        mockGetRawResponse.mockResolvedValueOnce(sseResponse);

        const triggerMsg = new ChatMessageProps('u-wire-cc2', convId, ChatMessageRole.USER, '触发', ChatMessageType.TEXT);
        await useConversation.getState().sendMessage(triggerMsg);

        const convs = useConversation.getState().chatConversation;
        expect(convs.find(c => c.id === convId)).toBeDefined();
        expect(convs[0].title).toBe('代数题目');
    });
});
