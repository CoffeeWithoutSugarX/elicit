"use client"
import ChatHeader from "@/features/chat/chat-header";
import ChatMessage from "@/features/chat/chat-message";
import ChatInput from "@/features/chat/chat-input";
import {useConversation} from "@/stores/useConversation";
import {useEffect, useRef} from "react";
import ChatMessageRoleEnum from "@/types/enums/ChatMessageRoleEnum";
import ChatHistoryConversation from "@/features/chat/chat-history-conversation";
import ChatMessageTypeEnum from "@/types/enums/ChatMessageTypeEnum";

export default function ChatPage() {

    const chatMessageProps = useConversation((state) => state.chatMessages);
    const isWaitingFirstChunk = useConversation((state) => state.isWaitingFirstChunk);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(()=> {
        listRef?.current?.scrollTo({
            top: listRef.current.scrollHeight,
            behavior: 'smooth'
        })
    }, [chatMessageProps])

    return (
        <div className="flex flex-col justify-between h-screen bg-muted">
            <ChatHeader/>
            <ChatHistoryConversation/>
            <div ref={listRef} className={"h-full max-w-2xl mx-auto flex flex-col flex-1 overflow-y-auto scrollbar-hide"}>
                {
                    chatMessageProps.map(message => <ChatMessage key={message.id} {...message}/>)
                }
                {
                    isWaitingFirstChunk && (
                        <ChatMessage id="thinking-card" role={ChatMessageRoleEnum.ASSISTANT} message="正在思考..." type={ChatMessageTypeEnum.TEXT} conversationId={"conversationId"}/>
                    )
                }
            </div>
            <ChatInput/>
        </div>
    )
}
