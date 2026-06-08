/**
 * ChatNode unit tests
 *
 * `chatNode` is an async function that calls `chatModel.invoke(state.messages)`.
 * The model is imported directly at the module level from deepseek-model.ts, so
 * we mock the entire `@/agents/models/deepseek-model` module.
 *
 * `chatNodeName` is a plain string constant — tested directly.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the model module BEFORE importing ChatNode, so the module-level import
// inside ChatNode.ts resolves to our fake.
vi.mock('@/agents/models/deepseek-model', () => ({
    chatModel: {
        invoke: vi.fn(),
    },
}));

import { chatNode, chatNodeName } from '@/agents/nodes/ChatNode';
import { chatModel } from '@/agents/models/deepseek-model';

const mockInvoke = vi.mocked(chatModel.invoke);

describe('chatNodeName', () => {
    it('equals the literal string "chatNode"', () => {
        expect(chatNodeName).toBe('chatNode');
    });
});

describe('chatNode', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('calls chatModel.invoke with the messages from state', async () => {
        const fakeMessages = [{ role: 'user', content: 'test question' }];
        const fakeResult = { role: 'assistant', content: 'test answer' };

        mockInvoke.mockResolvedValueOnce(fakeResult as never);

        const state = {
            messages: fakeMessages,
            userId: 'user-1',
            conversationId: 'conv-1',
            hasResolved: false,
        };

        await chatNode(state as never);

        expect(mockInvoke).toHaveBeenCalledOnce();
        expect(mockInvoke).toHaveBeenCalledWith(fakeMessages);
    });

    it('returns an object with messages array containing the model result', async () => {
        const fakeResult = { role: 'assistant', content: 'answer' };
        mockInvoke.mockResolvedValueOnce(fakeResult as never);

        const result = await chatNode({
            messages: [],
            userId: 'u',
            conversationId: 'c',
            hasResolved: false,
        } as never);

        expect(result).toEqual({ messages: [fakeResult] });
    });

    it('propagates errors thrown by the model', async () => {
        mockInvoke.mockRejectedValueOnce(new Error('API timeout'));

        await expect(
            chatNode({
                messages: [],
                userId: 'u',
                conversationId: 'c',
                hasResolved: false,
            } as never),
        ).rejects.toThrow('API timeout');
    });
});
