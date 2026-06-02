'use client';

import { PolyaTopBar } from '@/features/chat/components/PolyaTopBar';
import { ChatBubble } from '@/features/chat/components/ChatBubble';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { useConversation } from '@/stores/useConversation';
import { useRouter } from 'next/navigation';
import { generateId } from '@/lib/utils';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import { ossRequest } from '@/services/api-client/OssRequest';


export default function ChatNewPage() {
    const chatMessages = useConversation(state => state.chatMessages);
    const isStreaming = useConversation(state => state.isStreaming);
    const isWaitingFirstChunk = useConversation(state => state.isWaitingFirstChunk);
    const sendMessage = useConversation(state => state.sendMessage);
    const sendError = useConversation(state => state.sendError);
    const clearSendError = useConversation(state => state.clearSendError);
    const setTempConversationId = useConversation(state => state.setTempConversationId);
    const currentConversationId = useConversation(state => state.currentConversationId);
    const currentPhase = useConversation(state => state.currentPhase);
    const totalSubProblems = useConversation(state => state.totalSubProblems);
    const currentSubProblemIndex = useConversation(state => state.currentSubProblemIndex);
    const currentInsightPoints = useConversation(state => state.currentInsightPoints);
    const router = useRouter();

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        // 新会话：为本次会话生成 tempConversationId 并路由到对应页面
        const tempId = setTempConversationId();
        if (tempId) {
            // 不在此处调用 setCurrentConversationId，避免与 sendMessage 的乐观 append 产生竞态
            // sendMessage 内部会在 currentConversationId === "" 时自动使用 tempConversationId
            router.push(`/chat/${tempId}`);
        }

        const message = new ChatMessageProps(
            generateId(),
            tempId || generateId(),
            ChatMessageRole.USER,
            text,
            ChatMessageType.TEXT,
            imageUrl ?? null,
        );
        await sendMessage(message);
    };

    const handleImageUpload = async (file: File): Promise<string> => {
        const convId = currentConversationId || generateId();
        return await ossRequest.uploadImageToOss(file, convId);
    };

    return (
        <div className="flex flex-col h-full bg-paper-canvas">
            {/* Polya 顶栏 */}
            <PolyaTopBar
                currentPhase={currentPhase}
                totalSubProblems={Math.max(totalSubProblems, 1)}
                currentSubProblemIndex={currentSubProblemIndex}
                insightPointCount={currentInsightPoints.length}
            />

            {/* 消息列表区：新会话仅含欢迎消息 */}
            <div className="flex-1 overflow-y-auto px-4 py-2 max-w-2xl mx-auto w-full">
                {chatMessages.map(msg => (
                    <ChatBubble
                        key={msg.id}
                        role={msg.role === ChatMessageRole.USER ? 'user' : 'assistant'}
                        content={msg.message}
                        imgUrl={msg.imgUrl}
                        isStreaming={isStreaming && msg.id === chatMessages[chatMessages.length - 1]?.id && msg.role === ChatMessageRole.ASSISTANT}
                    />
                ))}
                {isWaitingFirstChunk && (
                    <ChatBubble role="assistant" content="正在思考…" isStreaming />
                )}
            </div>

            {/* 错误横幅 */}
            {sendError && (
                <div className="px-4 pb-2 max-w-[768px] mx-auto w-full">
                    <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 text-red-700 text-sm border border-red-200">
                        <span>{sendError}</span>
                        <button
                            type="button"
                            onClick={clearSendError}
                            className="ml-2 text-red-500 hover:text-red-700 text-xs"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}

            {/* 输入框 */}
            <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isStreaming}
                placeholder="把不会的题目描述一下，或者上传图片…"
                showImageButton
                onImageUpload={handleImageUpload}
            />
        </div>
    );
}
