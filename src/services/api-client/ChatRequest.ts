import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import { getAuthHeaders } from "@/services/api-client/getAuthHeaders";


class ChatRequest {

    // 返回原始 Response，供调用方自行驱动 processStream（推荐路径）
    getRawResponse = async (message: ChatMessageProps): Promise<Response> => {
        const response = await fetch(`/api/chat/${message.conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...await getAuthHeaders(),
            },
            body: JSON.stringify(message)
        });

        if (!response.ok || !response.body) {
            throw new Error("Failed to get chat response");
        }

        return response;
    }

}

export const chatRequest = new ChatRequest();