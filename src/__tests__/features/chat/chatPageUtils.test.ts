/**
 * Unit tests for src/features/chat/chatPageUtils.ts
 *
 * 覆盖 isLastStreamingMessage 和 resolveWaitingText 两个纯函数的所有分支。
 */
import { describe, it, expect } from 'vitest';
import { isLastStreamingMessage, resolveWaitingText } from '@/features/chat/chatPageUtils';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';

// ── isLastStreamingMessage ────────────────────────────────────────────────────

describe('isLastStreamingMessage', () => {
    const ASSISTANT_ROLE = ChatMessageRole.ASSISTANT;
    const USER_ROLE = ChatMessageRole.USER;

    it('三个条件全满足 → true（流式中 + id 匹配 + 助手角色）', () => {
        expect(isLastStreamingMessage(true, 'msg-1', 'msg-1', ASSISTANT_ROLE)).toBe(true);
    });

    it('isStreaming=false → false（未在流式中，其余条件满足也不算）', () => {
        expect(isLastStreamingMessage(false, 'msg-1', 'msg-1', ASSISTANT_ROLE)).toBe(false);
    });

    it('msgId !== lastMsgId → false（不是最后一条消息）', () => {
        expect(isLastStreamingMessage(true, 'msg-1', 'msg-2', ASSISTANT_ROLE)).toBe(false);
    });

    it('role=USER → false（用户消息不应显示流式光标）', () => {
        expect(isLastStreamingMessage(true, 'msg-1', 'msg-1', USER_ROLE)).toBe(false);
    });

    it('lastMsgId=undefined → false（列表为空，无最后一条消息）', () => {
        expect(isLastStreamingMessage(true, 'msg-1', undefined, ASSISTANT_ROLE)).toBe(false);
    });

    it('isStreaming=false + id 不匹配 + USER → false（三个条件均不满足）', () => {
        expect(isLastStreamingMessage(false, 'msg-1', 'msg-2', USER_ROLE)).toBe(false);
    });
});

// ── resolveWaitingText ────────────────────────────────────────────────────────

// 工厂函数：方便构造测试用 ChatMessageProps
function makeMsg(role: ChatMessageRole, imgUrl: string | null = null): ChatMessageProps {
    return new ChatMessageProps('id', 'conv-id', role, '内容', ChatMessageType.TEXT, imgUrl);
}

describe('resolveWaitingText', () => {
    it('最后一条是带图用户消息 → "正在识别题目…"', () => {
        const msg = makeMsg(ChatMessageRole.USER, 'https://oss.example.com/img.jpg');
        expect(resolveWaitingText(msg)).toBe('正在识别题目…');
    });

    it('最后一条是用户消息但无图 → "正在思考…"（图片为 null）', () => {
        const msg = makeMsg(ChatMessageRole.USER, null);
        expect(resolveWaitingText(msg)).toBe('正在思考…');
    });

    it('最后一条是助手消息（带图也不算）→ "正在思考…"', () => {
        const msg = makeMsg(ChatMessageRole.ASSISTANT, 'https://oss.example.com/img.jpg');
        expect(resolveWaitingText(msg)).toBe('正在思考…');
    });

    it('最后一条是助手消息无图 → "正在思考…"', () => {
        const msg = makeMsg(ChatMessageRole.ASSISTANT, null);
        expect(resolveWaitingText(msg)).toBe('正在思考…');
    });

    it('lastMsg=undefined（消息列表为空）→ "正在思考…"', () => {
        expect(resolveWaitingText(undefined)).toBe('正在思考…');
    });

    it('最后一条用户消息 imgUrl 为空字符串（falsy）→ "正在思考…"', () => {
        // imgUrl 空字符串视为无图（与 null 等同的 falsy 行为）
        const msg = makeMsg(ChatMessageRole.USER, '');
        expect(resolveWaitingText(msg)).toBe('正在思考…');
    });
});
