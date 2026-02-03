"use client"

import {Camera, ImagePlus, Send} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "../ui/button";
import {useState} from "react";

export default function ChatInput() {

    const [message, setMessage] = useState("")

    return (
        <div className={"pl-5 pr-5"}>
            <div className="
            max-w-2xl mx-auto h-20
            border-border border-t rounded-t-2xl bg-background
            flex justify-center items-center
            ">
                <div className={"icon-button"}>
                    <ImagePlus className={"small-icon"}/>
                </div>
                <div className={"icon-button mr-2"}>
                    <Camera className={"small-icon"}/>
                </div>
                <Input className={"max-w-[70%] text-sm mr-2 bg-muted"}
                       placeholder={"请输入你的想法或问题..."}
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}/>
                <Button disabled={message.trim() === ""} className={"w-10 h-10 rounded-full flex justify-center items-center"}>
                    <Send className={"small-icon text-background"}/>
                </Button>
            </div>
        </div>
    )
}