"use client"
import {Camera, ImagePlus, Send, X} from "lucide-react";
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useConversation} from "@/stores/useConversation";
import ChatMessageProps from "@/screen/chat/props/ChatMessageProps";
import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";
import React, {useState, useRef} from "react";
import Image from "next/image";

export default function ChatInput() {

    const [message, setMessage] = useState("");
    const cameraInputRef = useRef<HTMLInputElement | null>(null);
    const albumInputRef = useRef<HTMLInputElement | null>(null);
    const {sendMessage, generateId} = useConversation(state => state);
    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState("");

    const handleSendMessage = () => {
        if (message.trim() === "" && selectedImage === null) return;
        if (message.trim()) {
            sendMessage(new ChatMessageProps(generateId(), ChatMessageRoleEnum.USER, message));
            setMessage("");
        }
        if (selectedImage) {
            fetch("/api/oss/sign-for-upload", { method: "GET" })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error("获取签名失败");
                    }
                    return response.json();
                })
                .then((data) => {
                    const formData = new FormData();
                    formData.append("success_action_status", "200");
                    formData.append("policy", data.policy);
                    formData.append("x-oss-signature", data.signature);
                    formData.append("x-oss-signature-version", "OSS4-HMAC-SHA256");
                    formData.append("x-oss-credential", data.x_oss_credential);
                    formData.append("x-oss-date", data.x_oss_date);
                    formData.append("key", data.dir + selectedImage.name); // 文件名
                    formData.append("x-oss-security-token", data.security_token);
                    formData.append("file", selectedImage); // file 必须为最后一个表单域

                    return fetch(data.host, {
                        method: "POST",
                        body: formData
                    });
                })
                .then((response) => {
                    if (response.ok) {
                        console.log("上传成功");
                        console.log(response);
                    } else {
                        console.log("上传失败", response);
                    }
                })
                .catch((error) => {
                    console.error("发生错误:", error);
                });
        }
    }
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSendMessage();
        }
    }

    const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        // 关键：清空 value，否则同一张图再次选择不会触发 onChange（iOS/部分安卓常见）
        e.target.value = "";
    };

    const handleImageRemove = () => {
        setSelectedImage(null);
        setImagePreview("");
    }


    return (
        <div className={"pl-5 pr-5"}>
            {
                imagePreview && (
                    <div className="max-w-2xl mx-auto h-20 border-border border-t rounded-t-2xl bg-background p-5 relative">
                        <Image  src={imagePreview} alt={"预览"} className={"rounded-lg"} width={100} height={100} objectFit={"cover"}/>
                        <Button className={"icon-button absolute left-25 top-2"} onClick={handleImageRemove}><X className={"small-icon"}/></Button>
                    </div>
                )
            }
            <div className={"max-w-2xl mx-auto h-20 border-border bg-background flex justify-center items-center " + (imagePreview ? "" : "border-t rounded-t-2xl")}>
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
                <Button disabled={message.trim() === ""}
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