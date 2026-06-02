import { describe, it, expect } from 'vitest';
import { ChatMessageRequest } from '@/types/request/ChatMessageRequest';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';

describe('ChatMessageRequest', () => {
    it('assigns role and message when no imgUrl is provided', () => {
        const req = new ChatMessageRequest(ChatMessageRole.USER, 'Hello');
        expect(req.role).toBe(ChatMessageRole.USER);
        expect(req.message).toBe('Hello');
        expect(req.imgUrl).toBeUndefined();
    });

    it('assigns imgUrl when provided', () => {
        const url = 'https://example.com/img.png';
        const req = new ChatMessageRequest(ChatMessageRole.ASSISTANT, 'Here is the image', url);
        expect(req.role).toBe(ChatMessageRole.ASSISTANT);
        expect(req.message).toBe('Here is the image');
        expect(req.imgUrl).toBe(url);
    });

    it('works with assistant role', () => {
        const req = new ChatMessageRequest(ChatMessageRole.ASSISTANT, 'Response text');
        expect(req.role).toBe(ChatMessageRole.ASSISTANT);
    });

    it('preserves empty string for message', () => {
        const req = new ChatMessageRequest(ChatMessageRole.USER, '');
        expect(req.message).toBe('');
    });

    it('preserves empty string for imgUrl when explicitly passed', () => {
        const req = new ChatMessageRequest(ChatMessageRole.USER, 'msg', '');
        expect(req.imgUrl).toBe('');
    });
});
