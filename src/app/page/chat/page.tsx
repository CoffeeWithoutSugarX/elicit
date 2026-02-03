import ChatInput from "@/components/chat/chat-input";
import ChatHeader from "@/components/chat/chat-header";
import ChatMessage from "@/components/chat/chat-message";
import ChatMessageProps from "@/components/chat/props/ChatMessageProps";
import ChatMessageRoleEnum from "@/components/chat/enums/ChatMessageRoleEnum";

export default function ChatPage() {

    const messages: ChatMessageProps[] = [];

    const defaultMessage = new ChatMessageProps("conv-1-1", ChatMessageRoleEnum.ASSISTANT, "你好呀！我是引思助手\n\n遇到不会的题目了吗？把题目拍照发给我，我会一步步引导你思考，帮你找到解题思路！");
    messages.push(defaultMessage);

    const defaultMessage2 = new ChatMessageProps("conv-1-2", ChatMessageRoleEnum.USER, "这道题怎么做？");
    messages.push(defaultMessage2);

    return (
        <div className="flex flex-col justify-between h-screen bg-muted">
            <ChatHeader/>
            <div className={"h-screen flex flex-col"}>
                {
                    messages.map(message => <ChatMessage key={message.id} {...message}/>)
                }
            </div>
            <ChatInput/>
        </div>
    )
}