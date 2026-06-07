'use client';

import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'sonner';
import { PolyaTopBar } from '@/features/chat/components/PolyaTopBar';
import { ChatBubble } from '@/features/chat/components/ChatBubble';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useConversation } from '@/stores/useConversation';
import { useRouter } from 'next/navigation';
import { generateId } from '@/lib/utils';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import { ossRequest } from '@/services/api-client/OssRequest';


export default function ChatNewPage() {
    // Hero 态：sent=false；发送后翻转为 true，布局沉到底部
    const [sent, setSent] = useState(false);

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

    // sendError 置位时弹 toast 并立即清空（避免重复弹）
    useEffect(() => {
        if (sendError) {
            toast.error(sendError);
            clearSendError();
        }
    }, [sendError, clearSendError]);

    const handleSendMessage = async (text: string, imageUrl?: string) => {
        // 1. 为新会话生成 tempConversationId
        const tempId = setTempConversationId();

        const message = new ChatMessageProps(
            generateId(),
            tempId || generateId(),
            ChatMessageRole.USER,
            text,
            ChatMessageType.TEXT,
            imageUrl ?? null,
        );

        // 2. 触发 View Transition 状态翻转：hero → docked
        //    View Transitions API 支持时做丝滑下沉动画；不支持时直接瞬切
        let transition: ViewTransition | null = null;
        if (typeof document !== 'undefined' && 'startViewTransition' in document) {
            transition = document.startViewTransition(() => {
                // flushSync 保证状态在快照间同步提交，让浏览器能正确捕捉新旧位置
                flushSync(() => setSent(true));
            });
        } else {
            setSent(true);
        }

        // 3. 立即发消息，不等动画完成——网络请求先跑
        //    注意：不在此处调用 setCurrentConversationId，避免与 sendMessage 的乐观 append 产生竞态
        //    sendMessage 内部会在 currentConversationId === "" 时自动使用 tempConversationId
        sendMessage(message);

        // 4. 等动画完成（或降级时已直接完成）后再 push 路由，避免路由切换打断同文档动画
        if (transition) {
            await transition.finished;
        }
        if (tempId) {
            router.push(`/chat/${tempId}`);
        }
    };

    const handleImageUpload = async (file: File): Promise<string> => {
        const convId = currentConversationId || generateId();
        return await ossRequest.uploadImageToOss(file, convId);
    };

    // ── Hero 态（sent=false）：视口垂直居中，无 TopBar，无消息区 ──
    //    pb-[12vh] 让整块视觉重心略高于几何中心（通用 AI hero 惯例）
    if (!sent) {
        return (
            <div className="flex flex-col h-full bg-background items-center justify-center px-4 pb-[12vh]">
                <div className="w-full max-w-2xl flex flex-col items-center">
                    {/* 墨印 + 标题：同属第一档入场动画，delay 0 */}
                    <div className="flex flex-col items-center gap-5 chat-hero-title">
                        {/* 「引」圆形墨印：40px 水墨实心，与对话气泡头像同色系，作为视觉锚点 */}
                        <Avatar aria-hidden className="size-10">
                            <AvatarFallback className="bg-foreground text-background text-lg font-medium size-10">
                                引
                            </AvatarFallback>
                        </Avatar>
                        {/* 标题：降一号、减重，居中构图 */}
                        <h1 className="text-2xl sm:text-3xl font-medium text-foreground text-center">
                            你好呀，我是引思助手
                        </h1>
                    </div>

                    {/* 副文案：一行，第二档入场 */}
                    <p className="mt-2 text-sm sm:text-base text-muted-foreground text-center chat-hero-subtitle">
                        拍照或描述题目，我会一步步引导你思考——不直接给答案。
                    </p>

                    {/* 输入框：第三档入场；赋予 view-transition-name，与 docked 态共名，触发 FLIP 动画 */}
                    <div
                        className="mt-10 w-full chat-hero-input"
                        style={{ viewTransitionName: 'chat-input' }}
                    >
                        <ChatInput
                            onSendMessage={handleSendMessage}
                            disabled={isStreaming}
                            placeholder="把不会的题目描述一下，或者上传图片…"
                            showImageButton
                            onImageUpload={handleImageUpload}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // ── Docked 态（sent=true）：与 /chat/[conversationId] 页完全同构 ──
    //    路由 push 到目标页后此布局仅短暂显示，动画衔接后即被目标页接管
    return (
        <div className="flex flex-col h-full bg-background">
            {/* Polya 顶栏 */}
            <PolyaTopBar
                currentPhase={currentPhase}
                totalSubProblems={totalSubProblems}
                currentSubProblemIndex={currentSubProblemIndex}
                insightPointCount={currentInsightPoints.length}
            />

            {/* 消息列表区：乐观气泡 + 思考中 */}
            <div className="flex-1 overflow-y-auto px-4 py-2 max-w-2xl mx-auto w-full scrollbar-hide">
                {chatMessages.map(msg => (
                    <ChatBubble
                        key={msg.id}
                        role={msg.role === ChatMessageRole.USER ? 'user' : 'assistant'}
                        content={msg.message}
                        imgUrl={msg.imgUrl}
                        isStreaming={isStreaming && msg.id === chatMessages[chatMessages.length - 1]?.id && msg.role === ChatMessageRole.ASSISTANT}
                    />
                ))}
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

            {/* 输入框：同名 view-transition-name，与 hero 态做 FLIP 位移动画 */}
            <div style={{ viewTransitionName: 'chat-input' }}>
                <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={isStreaming}
                    placeholder="把不会的题目描述一下，或者上传图片…"
                    showImageButton
                    onImageUpload={handleImageUpload}
                />
            </div>
        </div>
    );
}
