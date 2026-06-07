'use client';

import { useEffect, useRef } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PolyaTopBar } from '@/features/chat/components/PolyaTopBar';
import { ChatBubble, AgentBubbleShell } from '@/features/chat/components/ChatBubble';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { OcrResultMessage } from '@/features/chat/components/OcrResultMessage';
import { KnowledgeCard } from '@/features/chat/components/KnowledgeCard';
import { useConversation } from '@/stores/useConversation';
import { generateId } from '@/lib/utils';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import { ossRequest } from '@/services/api-client/OssRequest';

interface PageProps {
    params: Promise<{ conversationId: string }>;
}

export default function ConversationPage({ params }: PageProps) {
    const { conversationId } = use(params);

    const chatMessages = useConversation(state => state.chatMessages);
    const isStreaming = useConversation(state => state.isStreaming);
    const isWaitingFirstChunk = useConversation(state => state.isWaitingFirstChunk);
    const sendMessage = useConversation(state => state.sendMessage);
    const sendError = useConversation(state => state.sendError);
    const clearSendError = useConversation(state => state.clearSendError);
    const setCurrentConversationId = useConversation(state => state.setCurrentConversationId);
    const confirmSelectedQuestion = useConversation(state => state.confirmSelectedQuestion);
    const resetForNewConversation = useConversation(state => state.resetForNewConversation);
    const currentPhase = useConversation(state => state.currentPhase);
    const totalSubProblems = useConversation(state => state.totalSubProblems);
    const currentSubProblemIndex = useConversation(state => state.currentSubProblemIndex);
    const currentInsightPoints = useConversation(state => state.currentInsightPoints);
    const pendingQuestions = useConversation(state => state.pendingQuestions);
    const hasResolved = useConversation(state => state.hasResolved);

    const router = useRouter();

    const listRef = useRef<HTMLDivElement>(null);

    // 切换到本对话时加载消息
    useEffect(() => {
        setCurrentConversationId(conversationId);
    }, [conversationId]);

    // sendError 置位时弹 toast 并立即清空（避免重复弹）
    useEffect(() => {
        if (sendError) {
            toast.error(sendError);
            clearSendError();
        }
    }, [sendError, clearSendError]);

    // 新消息到来时自动滚动到底部
    useEffect(() => {
        listRef.current?.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: 'smooth',
        });
    }, [chatMessages, isWaitingFirstChunk]);

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        const message = new ChatMessageProps(
            generateId(),
            conversationId,
            ChatMessageRole.USER,
            text,
            ChatMessageType.TEXT,
            imageUrl ?? null,
        );
        await sendMessage(message);
    };

    const handleImageUpload = async (file: File): Promise<string> => {
        return await ossRequest.uploadImageToOss(file, conversationId);
    };

    const handleOcrError = () => {
        // 识别错误：重置流程，让用户重新上传
        resetForNewConversation();
    };

    // 最后一条助手消息的 id（用于判断流式光标位置）
    const lastMsgId = chatMessages[chatMessages.length - 1]?.id;
    const lastMsgRole = chatMessages[chatMessages.length - 1]?.role;

    // P-103：有待确认题目且用户尚未 resolve 时展示 OcrResultMessage（单题/多题均弹卡）
    const showOcrSelector = pendingQuestions.length > 0 && !hasResolved;

    // 找 OCR 时上传的题目图片（最后一条 user 消息中的 imgUrl）
    const questionImageUrl = [...chatMessages]
        .reverse()
        .find(m => m.role === ChatMessageRole.USER && m.imgUrl)
        ?.imgUrl ?? '';

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Polya 顶栏 */}
            <PolyaTopBar
                currentPhase={currentPhase}
                totalSubProblems={totalSubProblems}
                currentSubProblemIndex={currentSubProblemIndex}
                insightPointCount={currentInsightPoints.length}
            />

            {/* 消息列表区 */}
            <div
                ref={listRef}
                className="flex-1 overflow-y-auto px-4 py-2 max-w-2xl mx-auto w-full"
            >
                {chatMessages.map(msg => {
                    // type=3 OCR_CARD：渲染静态已确认题目卡（只读，无按钮）
                    if (msg.type === ChatMessageType.OCR_CARD) {
                        try {
                            const { question } = JSON.parse(msg.message) as { question: import('@/agents/schemas/OcrSchema').SanitizedQuestion };
                            return (
                                <AgentBubbleShell key={msg.id}>
                                    <OcrResultMessage
                                        originalImageUrl={msg.imgUrl ?? ''}
                                        questions={[question]}
                                        readOnly
                                    />
                                </AgentBubbleShell>
                            );
                        } catch {
                            // 解析失败：数据损坏时回落成普通气泡，不整页崩溃
                            return (
                                <ChatBubble
                                    key={msg.id}
                                    role="assistant"
                                    content={msg.message}
                                />
                            );
                        }
                    }
                    // type=4 KNOWLEDGE_CARD：渲染知识卡片（从消息列表中读取，刷新后仍在）
                    if (msg.type === ChatMessageType.KNOWLEDGE_CARD) {
                        try {
                            const { card } = JSON.parse(msg.message) as { card: import('@/agents/schemas/KnowledgeCardSchema').KnowledgeCard };
                            return (
                                <div key={msg.id} className="my-6">
                                    <KnowledgeCard
                                        data={card}
                                        // 再来一题 = 等价于侧边栏新对话：清会话态并回 hero 新会话页
                                        onRetry={() => {
                                            setCurrentConversationId('');
                                            router.push('/chat');
                                        }}
                                    />
                                </div>
                            );
                        } catch {
                            // 解析失败：数据损坏时回落成普通气泡，不整页崩溃
                            return (
                                <ChatBubble
                                    key={msg.id}
                                    role="assistant"
                                    content={msg.message}
                                />
                            );
                        }
                    }
                    return (
                        <ChatBubble
                            key={msg.id}
                            role={msg.role === ChatMessageRole.USER ? 'user' : 'assistant'}
                            content={msg.message}
                            imgUrl={msg.imgUrl}
                            isStreaming={
                                isStreaming &&
                                msg.id === lastMsgId &&
                                lastMsgRole === ChatMessageRole.ASSISTANT
                            }
                        />
                    );
                })}

                {/* P-103：OCR 确认卡片（单题/多题均显示，用户确认后消失） */}
                {showOcrSelector && questionImageUrl && (
                    <AgentBubbleShell>
                        <OcrResultMessage
                            originalImageUrl={questionImageUrl}
                            questions={pendingQuestions}
                            onConfirm={(selectedIndex) => confirmSelectedQuestion(selectedIndex)}
                            onOcrError={handleOcrError}
                        />
                    </AgentBubbleShell>
                )}

                {/* 等待第一个 chunk：语境化提示
                    最后一条是带图用户消息 = vision 识别中；确认题目后等待最后一条是 OCR 卡/文本，自然回落到思考中 */}
                {isWaitingFirstChunk && (() => {
                    const lastMsg = chatMessages[chatMessages.length - 1];
                    const waitingText = lastMsg?.role === ChatMessageRole.USER && lastMsg?.imgUrl
                        ? '正在识别题目…'
                        : '正在思考…';
                    return <ChatBubble role="assistant" content={waitingText} isStreaming />;
                })()}
            </div>

            {/* 输入框 */}
            <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isStreaming}
                showImageButton
                onImageUpload={handleImageUpload}
            />
        </div>
    );
}
