import ChatMessageProps from "@/screen/chat/props/ChatMessageProps";
import {supabase} from "@/db/browers/supabase/supabase";
import ChatMessageRoleEnum, {isValidRole} from "@/enums/ChatMessageRoleEnum";


export const insertChatMessage = async (message: ChatMessageProps) => {
    const {error} = await supabase.from('elicit_messages')
        .insert({
            message_id: message.id,
            conversation_id: message.conversationId,
            role: message.role,
            content: message.message,
            type: message.type
        })
    if (error) {
        console.error("Failed to insert chat message:", error);
        return false;
    }
    return true;
}

export const loadChatMessagesByConversationId = async (conversationId: string) => {
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
        message.type
    )) ?? [];
}