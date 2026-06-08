import { describe, it, expect, vi, beforeEach } from 'vitest';

// ——— 阻止 server-only 校验 ———
vi.mock('server-only', () => ({}));

// ——— mock ConversationMapper（含 server-only 导入）———
vi.mock('@/db/mappers/ConversationMapper', () => ({
    conversationMapper: {
        findById: vi.fn(),
        create: vi.fn(),
    },
}));

// ——— mock getWriter（LangGraph context 函数）———
vi.mock('@langchain/langgraph', () => ({
    getWriter: vi.fn(),
}));

import { shouldCreateConversation, createConversationNode, conversationNodeName } from '@/agents/nodes/flow/ConversationNode';
import { conversationMapper } from '@/db/mappers/ConversationMapper';
import { getWriter } from '@langchain/langgraph';
import { createMockState } from '@/__tests__/helpers/mockState';
import { HumanMessage } from '@langchain/core/messages';

const mockFindById = vi.mocked(conversationMapper.findById);
const mockCreate = vi.mocked(conversationMapper.create);
const mockGetWriter = vi.mocked(getWriter);

// 辅助：构造会话 DB 记录
const makeConversation = (overrides: Record<string, unknown> = {}) => ({
    conversationId: '00000000-0000-0000-0000-000000000002',
    userId: '00000000-0000-0000-0000-000000000001',
    title: '测试会话',
    hasResolved: false,
    ...overrides,
});

describe('shouldCreateConversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('会话已存在（findById 返回记录）→ 返回 []', async () => {
        mockFindById.mockResolvedValue(makeConversation() as never);

        const state = createMockState({});
        const result = await shouldCreateConversation(state);

        expect(result).toEqual([]);
    });

    it('会话不存在（findById 返回 null）→ 返回 [conversationNodeName]', async () => {
        mockFindById.mockResolvedValue(null as never);

        const state = createMockState({});
        const result = await shouldCreateConversation(state);

        expect(result).toEqual([conversationNodeName]);
    });
});

describe('createConversationNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('标题超过 10 字符时截断为 10 字符', async () => {
        const longTitle = '这是一个超过十个字符的标题文字';
        const writerFn = vi.fn();
        mockGetWriter.mockReturnValue(writerFn);
        mockCreate.mockResolvedValue(makeConversation({ title: longTitle.substring(0, 10) }) as never);

        const state = createMockState({
            messages: [new HumanMessage(longTitle)],
        });

        const result = await createConversationNode(state);

        // create 应被调用，且 title 参数为截断后的 10 字符
        expect(mockCreate).toHaveBeenCalledWith(
            state.conversationId,
            state.userId,
            longTitle.substring(0, 10),
        );
        expect(result).toHaveProperty('conversationId');
    });

    it('标题不超过 10 字符时原样使用', async () => {
        const shortTitle = '短标题';
        const writerFn = vi.fn();
        mockGetWriter.mockReturnValue(writerFn);
        mockCreate.mockResolvedValue(makeConversation({ title: shortTitle }) as never);

        const state = createMockState({
            messages: [new HumanMessage(shortTitle)],
        });

        await createConversationNode(state);

        expect(mockCreate).toHaveBeenCalledWith(
            state.conversationId,
            state.userId,
            shortTitle,
        );
    });

    it('getWriter 返回有效函数时，SSE chunk 被写出', async () => {
        const writerFn = vi.fn();
        mockGetWriter.mockReturnValue(writerFn);

        const conversation = makeConversation();
        mockCreate.mockResolvedValue(conversation as never);

        const state = createMockState({
            messages: [new HumanMessage('测试消息')],
        });

        await createConversationNode(state);

        // 新契约：使用 kind 字段区分，让外层 SSE part 名始终为 data-custom
        expect(writerFn).toHaveBeenCalledWith({
            kind: 'conversation_created',
            conversationId: conversation.conversationId,
            title: conversation.title,
        });
    });

    it('getWriter 返回 null 时不抛出错误', async () => {
        mockGetWriter.mockReturnValue(null as never);
        mockCreate.mockResolvedValue(makeConversation() as never);

        const state = createMockState({
            messages: [new HumanMessage('测试消息')],
        });

        await expect(createConversationNode(state)).resolves.not.toThrow();
    });
});
