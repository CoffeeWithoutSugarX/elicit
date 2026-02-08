import {Plus, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {useHistoryConversation} from "@/stores/useHistoryConversation";
import ChatConversationProps from "@/screen/chat/props/ChatConversationProps";
import ChatConversation from "@/screen/chat/chat-conversation";

export default function ChatHistoryConversation() {
    const {isOpen, close} = useHistoryConversation(state => state);
    const containerClassName = [
        "h-screen bg-background absolute top-0 left-0 z-10",
        "transition-[width] duration-300 ease-in-out overflow-hidden",
        isOpen ? "w-75" : "w-0 pointer-events-none"
    ].join(" ");

    const conversation: ChatConversationProps[] = [];

    conversation.push(new ChatConversationProps("conversation:1", "这道题怎么做", new Date(), 6))
    conversation.push(new ChatConversationProps("conversation:2", "我不会做一元二次方程", new Date(), 6))

    return (
        <div className={containerClassName} aria-hidden={!isOpen}>
            <div className={"w-75 "}>
                <div className={"border-b border-border p-5 flex flex-row justify-between"}>
                    <h3 className={"text-foreground font-black"}>历史对话</h3>
                    <Button className={"icon-button"} onClick={close}>
                        <X className={"small-icon"}/>
                    </Button>
                </div>
                <div className={"p-5"}>
                    <Button className={"w-full cursor-pointer rounded-2xl bg-background text-foreground hover:bg-muted-foreground/50 py-2 px-4"}>
                        <Plus/>
                        <span>开启新对话</span>
                    </Button>
                </div>
                <div>
                    {conversation.map(props => <ChatConversation key={props.id} {...props}/>)}
                </div>
            </div>
        </div>
    );
}
