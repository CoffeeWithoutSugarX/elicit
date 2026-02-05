"use client"
import {Camera, ImagePlus, Loader2, Send, X} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useConversation} from "@/stores/useConversation";
import ChatMessageProps from "@/screen/chat/props/ChatMessageProps";
import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";
import React, {useState, useRef} from "react";
import Image from "next/image";
import {ossRequest} from "@/request/OssRequest";

export default function ChatInput() {

    const [message, setMessage] = useState("");
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const albumInputRef = useRef<HTMLInputElement | null>(null);
    const {sendMessage, generateId} = useConversation(state => state);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [imagePreview, setImagePreview] = useState("");
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'error'>('idle');

    const handleSendMessage = async () => {
        if (uploadStatus === 'uploading' || uploadStatus === 'error') return;
        if (message.trim()) {
            sendMessage(new ChatMessageProps(generateId(), ChatMessageRoleEnum.USER, message));
            setMessage("");
        }
    }
    const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            await handleSendMessage();
        }
    }

    const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        // 关键：清空 value，否则同一张图再次选择不会触发 onChange（iOS/部分安卓常见）
        e.target.value = "";
        setUploadStatus('uploading');
        try {
            const uploadUrl = await ossRequest.uploadImageToOss(file, "conversationId");
            setSelectedImage(uploadUrl);
            setUploadStatus('idle');
        } catch (e) {
            console.error("上传图片失败", e);
            setUploadStatus('error');
        }
    };

    const handleImageRemove = () => {
        setSelectedImage(null);
        setImagePreview("");
        setUploadStatus('idle');
    }


    return (
        <div className={"pl-5 pr-5"}>
            {
                imagePreview && (
                    <div className="max-w-2xl mx-auto h-20 border-border border-t rounded-t-2xl bg-background p-5 relative">
                        <div className="relative w-25 h-16.25">
                            <Image src={imagePreview} alt={"预览"} className={"rounded-lg object-cover"} fill/>
                            {uploadStatus === 'uploading' && (
                                <div
                                    className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                                    <Loader2 className="w-5 h-5 text-white animate-spin"/>
                                </div>
                            )}
                            {uploadStatus === 'error' && (
                                <div
                                    className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center text-white text-[10px] text-center px-1">
                                    上传失败
                                </div>
                            )}
                        </div>
                        <Button className={"icon-button absolute left-25 top-2"} onClick={handleImageRemove}><X
                            className={"small-icon"}/></Button>
                    </div>
                )
            }
            <div
                className={"max-w-2xl mx-auto h-20 border-border bg-background flex justify-center items-center " + (imagePreview ? "" : "border-t rounded-t-2xl")}>
                <Button className={"icon-button"} onClick={() => albumInputRef.current?.click()}>
                    <ImagePlus className={"small-icon"}/>
                </Button>
                <Button className={"icon-button mr-2"} onClick={() => cameraInputRef.current?.click()}>
                    <Camera className={"small-icon"}/>
                </Button>
                <Input className={"max-w-[70%] text-sm mr-2 bg-muted"}
                       placeholder={"请输入你的想法或问题..."}
                       value={message}
                       onChange={(e) => setMessage(e.target.value)}
                       onKeyDown={handleKeyDown}
                />
                <Button disabled={message.trim() === "" || uploadStatus === 'uploading'}
                        className={"w-10 h-10 rounded-full flex justify-center items-center cursor-pointer"}
                        onClick={handleSendMessage}
                >
                    <Send className={"small-icon text-background"}/>
                </Button>
                {/* 隐藏 input：相机 */}
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleImageSelected}
                />

                {/* 隐藏 input：相册 */}
                <input
                    ref={albumInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelected}
                />
            </div>
        </div>
    )
}