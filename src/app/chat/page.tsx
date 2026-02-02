import ChatInput from "@/components/chat/chat-input";
import ChatHeader from "@/components/chat/chat-header";

export default function ChatPage() {
    return (
        <div className="flex flex-col justify-between h-screen bg-muted">
            <ChatHeader/>
            <ChatInput/>
        </div>
    )
}