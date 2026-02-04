"use client"
import {Bot, User} from "lucide-react";
import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";
import ChatMessageProps from "@/screen/chat/props/ChatMessageProps";

export default function ChatMessage({role, message}: ChatMessageProps) {
    const avatar = role === ChatMessageRoleEnum.USER ? <User/> : <Bot/>
    const messageLines = message.split("\n");
    return (
        <div
            className={"flex gap-4 w-full pt-4 pb-4 pl-15 pr-15" + (role === ChatMessageRoleEnum.USER ? " flex-row-reverse" : "")}>
            <div
                className={"min-w-10 min-h-10 w-10 h-10 flex items-center justify-center rounded-full bg-foreground text-background"}>
                {avatar}
            </div>
            <div className={"bg-background rounded-xl p-4 border border-border shadow-lg text-sm"}>
                {messageLines.map((line, index) => (
                        <div key={index} className={index != messageLines.length - 1 ? "mb-4" : ""}>
                            {line}
                        </div>
                    )
                )}
            </div>
        </div>

    )
}