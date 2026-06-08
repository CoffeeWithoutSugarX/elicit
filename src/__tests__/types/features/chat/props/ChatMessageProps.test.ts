import { describe, it, expect } from 'vitest';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';

describe('ChatMessageProps', () => {
    const id = 'msg-abc-123';
    const conversationId = 'conv-xyz-456';

    it('assigns all required fields when imgUrl is omitted', () => {
        const props = new ChatMessageProps(
            id,
            conversationId,
            ChatMessageRole.USER,
            'What is 2+2?',
            ChatMessageType.TEXT,
        );

        expect(props.id).toBe(id);
        expect(props.conversationId).toBe(conversationId);
        expect(props.role).toBe(ChatMessageRole.USER);
        expect(props.message).toBe('What is 2+2?');
        expect(props.type).toBe(ChatMessageType.TEXT);
        expect(props.imgUrl).toBeUndefined();
    });

    it('assigns imgUrl when a URL string is provided', () => {
        const url = 'https://cdn.example.com/img.jpg';
        const props = new ChatMessageProps(
            id,
            conversationId,
            ChatMessageRole.USER,
            'Look at this image',
            ChatMessageType.IMAGE,
            url,
        );

        expect(props.imgUrl).toBe(url);
        expect(props.type).toBe(ChatMessageType.IMAGE);
    });

    it('stores null for imgUrl when null is explicitly passed', () => {
        const props = new ChatMessageProps(
            id,
            conversationId,
            ChatMessageRole.ASSISTANT,
            'Here is the answer',
            ChatMessageType.TEXT,
            null,
        );

        expect(props.imgUrl).toBeNull();
    });

    it('works with assistant role', () => {
        const props = new ChatMessageProps(
            id,
            conversationId,
            ChatMessageRole.ASSISTANT,
            'Assistant response',
            ChatMessageType.TEXT,
        );

        expect(props.role).toBe(ChatMessageRole.ASSISTANT);
    });

    it('preserves empty string for message', () => {
        const props = new ChatMessageProps(
            id,
            conversationId,
            ChatMessageRole.USER,
            '',
            ChatMessageType.TEXT,
        );

        expect(props.message).toBe('');
    });
});
