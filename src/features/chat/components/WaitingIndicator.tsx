'use client';

// 等待第一个 chunk 的语境化提示气泡
// 供 src/app/chat/page.tsx 与 src/app/chat/[conversationId]/page.tsx 共用

import { ChatBubble } from '@/features/chat/components/ChatBubble';
import { resolveWaitingText } from '@/features/chat/chatPageUtils';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';

interface WaitingIndicatorProps {
    /** 消息列表中的最后一条消息（用于推断等待文案） */
    lastMsg: ChatMessageProps | undefined;
}

/**
 * 等待第一个 SSE chunk 时展示的语境化提示气泡。
 * 最后一条是带图用户消息时显示「正在识别题目…」，其余显示「正在思考…」。
 */
export function WaitingIndicator({ lastMsg }: WaitingIndicatorProps) {
    const waitingText = resolveWaitingText(lastMsg);
    return <ChatBubble role="assistant" content={waitingText} isStreaming />;
}
