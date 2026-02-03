"use client"
import ChatHeader from "@/screen/chat/chat-header";
import ChatMessage from "@/screen/chat/chat-message";
import ChatInput from "@/screen/chat/chat-input";
import {useConversation} from "@/stores/useConversation";

export default function ChatPage() {

    const chatMessageProps = useConversation((state) => state.chatMessages);

    return (
        <div className="flex flex-col justify-between h-screen bg-muted">
            <ChatHeader/>
            <div className={"h-screen flex flex-col"}>
                {
                    chatMessageProps.map(message => <ChatMessage key={message.id} {...message}/>)
                }
            </div>
            <ChatInput/>
        </div>
    )
}