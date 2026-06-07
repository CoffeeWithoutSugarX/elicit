// chat 页面通用纯函数工具
// 供 src/app/chat/page.tsx 与 src/app/chat/[conversationId]/page.tsx 共用

import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';

/**
 * 判断某条消息是否为当前正在流式输出的最后一条助手消息。
 * 满足：isStreaming=true 且 msg.id === 最后一条消息 id 且 role=ASSISTANT。
 */
export function isLastStreamingMessage(
    isStreaming: boolean,
    msgId: string,
    lastMsgId: string | undefined,
    msgRole: number,
): boolean {
    return isStreaming && msgId === lastMsgId && msgRole === ChatMessageRole.ASSISTANT;
}

/**
 * 根据最后一条消息推断等待提示文案。
 * 最后一条是带图用户消息 → '正在识别题目…'；其余 → '正在思考…'
 */
export function resolveWaitingText(lastMsg: ChatMessageProps | undefined): string {
    if (lastMsg?.role === ChatMessageRole.USER && lastMsg?.imgUrl) {
        return '正在识别题目…';
    }
    return '正在思考…';
}
