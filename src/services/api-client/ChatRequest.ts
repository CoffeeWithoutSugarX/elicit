import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import {supabase} from "@/db/supabase/supabase";
import {streamIterator} from "@/lib/utils";


class ChatRequest {

    getChatResponse = async (message: ChatMessageProps) => {
        const {data: {session}} = await supabase.auth.getSession();
        const response = await fetch(`/api/chat/${message.conversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify(message)
        })

        if (!response.body) {
            throw new Error("Failed to get chat response");
        }

        return streamIterator(response);
    }
}

export const chatRequest = new ChatRequest();