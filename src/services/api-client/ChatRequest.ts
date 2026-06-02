import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import {supabase} from "@/db/supabase/supabase";
import {streamIterator} from "@/lib/utils";


class ChatRequest {

    // 返回原始 Response，供调用方自行驱动 processStream（推荐路径）
    getRawResponse = async (message: ChatMessageProps): Promise<Response> => {
        const {data: {session}} = await supabase.auth.getSession();
        const response = await fetch(`/api/chat/${message.conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify(message)
        });

        if (!response.ok || !response.body) {
            throw new Error("Failed to get chat response");
        }

        return response;
    }

    // 保留旧接口以兼容现有调用方（内部复用 getRawResponse）
    getChatResponse = async (message: ChatMessageProps) => {
        const response = await this.getRawResponse(message);
        return streamIterator(response);
    }
}

export const chatRequest = new ChatRequest();