import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import { supabase } from "@/db/supabase/supabase";
import { ChatMessageRole, ChatMessageRoleEnum } from "@/types/enums/chatMessageRole.enum";
import { ChatMessageType, ChatMessageTypeEnum } from "@/types/enums/chatMessageType.enum";

export const insertChatMessageRequest = async (message: ChatMessageProps) => {
    const { error } = await supabase.from('elicit_messages')
        .upsert({
            message_id:      message.id,
            conversation_id: message.conversationId,
            role:            message.role,
            content:         message.message,
            type:            message.type,
            img_url:         message.imgUrl
        }, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
    if (error) {
        console.error("Failed to insert chat message:", error);
        return false;
    }
    return true;
};

export const loadChatMessagesByConversationIdRequest = async (conversationId: string) => {
    const { data, error } = await supabase.from('elicit_messages')
        .select(`
            message_id,
            conversation_id,
            role,
            content,
            type,
            img_url
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
    if (error) {
        console.error("Failed to load chat messages:", error);
        return [];
    }
    return data?.map((message) => new ChatMessageProps(
        message.message_id,
        message.conversation_id,
        ChatMessageRoleEnum.fromCode(message.role)?.code ?? ChatMessageRole.USER,
        message.content,
        ChatMessageTypeEnum.fromCode(message.type)?.code ?? ChatMessageType.TEXT,
        message.img_url
    )) ?? [];
};
