import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import {supabase} from "@/db/supabase/supabase";
import ChatMessageRoleEnum, {isValidRole} from "@/types/enums/ChatMessageRoleEnum";


export const insertChatMessageRequest = async (message: ChatMessageProps) => {
    const {error} = await supabase.from('elicit_messages')
        .insert({
            message_id: message.id,
            conversation_id: message.conversationId,
            role: message.role,
            content: message.message,
            type: message.type,
            img_url: message.imgUrl
        })
    if (error) {
        console.error("Failed to insert chat message:", error);
        return false;
    }
    return true;
}

export const loadChatMessagesByConversationIdRequest = async (conversationId: string) => {
    const {data, error} = await supabase.from('elicit_messages')
        .select(`
            *
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', {ascending: true});
    if (error) {
        console.error("Failed to load chat messages:", error);
        return [];
    }
    return data?.map((message) => new ChatMessageProps(
        message.message_id,
        message.conversation_id,
        isValidRole(message.role) ? message.role : ChatMessageRoleEnum.USER,
        message.content,
        message.type,
        message.img_url
    )) ?? [];
}