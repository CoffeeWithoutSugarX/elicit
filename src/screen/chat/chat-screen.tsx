"use client"
import ChatHeader from "@/screen/chat/chat-header";
import ChatMessage from "@/screen/chat/chat-message";
import ChatInput from "@/screen/chat/chat-input";
import {useConversation} from "@/stores/useConversation";
import {useEffect, useRef} from "react";
import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";

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
            <div ref={listRef} className={"h-full max-w-2xl mx-auto flex flex-col flex-1 overflow-y-auto"}>
                {
                    chatMessageProps.map(message => <ChatMessage key={message.id} {...message}/>)
                }
                {
                    isWaitingFirstChunk && (
                        <ChatMessage id="thinking-card" role={ChatMessageRoleEnum.ASSISTANT} message="正在思考..."/>
                    )
                }
            </div>
            <ChatInput/>
        </div>
    )
}
