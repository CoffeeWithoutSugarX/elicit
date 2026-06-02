import { describe, it, expect } from 'vitest';
import ChatConversationProps from '@/features/chat/props/ChatConversationProps';

describe('ChatConversationProps', () => {
    it('assigns id and title from constructor', () => {
        const props = new ChatConversationProps('conv-123', 'My Conversation');
        expect(props.id).toBe('conv-123');
        expect(props.title).toBe('My Conversation');
    });

    it('works with UUID-format id', () => {
        const uuid = '550e8400-e29b-41d4-a716-446655440000';
        const props = new ChatConversationProps(uuid, 'Test');
        expect(props.id).toBe(uuid);
    });

    it('preserves empty strings', () => {
        const props = new ChatConversationProps('', '');
        expect(props.id).toBe('');
        expect(props.title).toBe('');
    });

    it('handles long title correctly', () => {
        const longTitle = '这是一个很长的对话标题，超过了64个字符的限制，用于测试构造函数是否正确存储长字符串而不做截断';
        const props = new ChatConversationProps('id-1', longTitle);
        expect(props.title).toBe(longTitle);
    });
});
