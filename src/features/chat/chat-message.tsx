"use client"
import {Bot, User} from "lucide-react";
import ChatMessageRoleEnum from "@/types/enums/ChatMessageRoleEnum";
import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import Image from "next/image";
import {useEffect, useRef, useState} from "react";
import {ossRequest} from "@/services/api-client/OssRequest";

export default function ChatMessage({role, message, imgUrl}: ChatMessageProps) {
    const avatar = role === ChatMessageRoleEnum.USER ? <User/> : <Bot/>
    const messageLines = message.split("\n");
    const imageWrapperRef = useRef<HTMLDivElement | null>(null);
    const [isInView, setIsInView] = useState(false);
    const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null);
    const isSigningRef = useRef(false);

    useEffect(() => {
        if (!imgUrl) return;
        const node = imageWrapperRef.current;
        if (!node) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    setIsInView(true);
                }
            },
            {root: null, rootMargin: "120px", threshold: 0.1}
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [imgUrl]);

    useEffect(() => {
        if (!imgUrl || !isInView || signedImageUrl || isSigningRef.current) return;
        let isCancelled = false;
        isSigningRef.current = true;
        ossRequest.signImageForPreview(imgUrl)
            .then((url) => {
                if (!isCancelled) {
                    setSignedImageUrl(url);
                }
            })
            .catch((error) => {
                console.error("获取图片预览签名失败", error);
            })
            .finally(() => {
                isSigningRef.current = false;
            });
        return () => {
            isCancelled = true;
        };
    }, [imgUrl, isInView, signedImageUrl]);
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
                {imgUrl && (
                    <div ref={imageWrapperRef} className="relative mt-3 w-56 sm:w-64 aspect-4/3 rounded-lg overflow-hidden bg-muted">
                        {signedImageUrl ? (
                            <Image
                                src={signedImageUrl}
                                alt="图片预览"
                                fill
                                sizes="(max-width: 768px) 70vw, 320px"
                                className="object-cover"
                                unoptimized
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                                {isInView ? "图片加载中..." : "图片待加载"}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

    )
}
