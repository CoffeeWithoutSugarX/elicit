"use client"

import {Camera, ImagePlus} from "lucide-react";

export default function ChatInput() {

    return (
        <div className={"pl-5 pr-5"}>
            <div className="
            w-full h-20
            border-border border-t rounded-t-2xl bg-background
            flex justify-center items-center
            ">
                <div className={"icon-button"}>
                    <ImagePlus className={"small-icon"}/>
                </div>
                <div className={"icon-button"}>
                    <Camera className={"small-icon"}/>
                </div>
            </div>
        </div>
    )
}