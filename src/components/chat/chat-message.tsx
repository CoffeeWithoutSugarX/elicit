"use client"
import ChatMessageProps from "@/components/chat/props/ChatMessageProps";
import {Bot, User} from "lucide-react";
import ChatMessageRoleEnum from "@/components/chat/enums/ChatMessageRoleEnum";

export default function ChatMessage({role, content}: ChatMessageProps) {
    const avatar = role === ChatMessageRoleEnum.USER ? <User/> : <Bot/>
    return (
        <div className={"flex items-center gap-4 w-full pt-4 pb-4 pl-15 pr-15" + (role === ChatMessageRoleEnum.USER ? " flex-row-reverse" : "")}>
            <div className={"min-w-10 min-h-10 flex items-center justify-center rounded-full bg-foreground text-white"}>
                {avatar}
            </div>
            <div className={"bg-background rounded-xl p-4 border border-border shadow-lg"}>
                {content}
            </div>
        </div>

    )
}