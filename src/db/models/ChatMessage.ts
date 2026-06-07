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

/**
 * 批量落库多条消息（一次 upsert，减少 N+1 往返）。
 * 空数组时直接返回 true，单条可复用此函数。
 */
export const insertChatMessagesRequest = async (messages: ChatMessageProps[]): Promise<boolean> => {
    if (messages.length === 0) return true;
    const rows = messages.map(m => ({
        message_id:      m.id,
        conversation_id: m.conversationId,
        role:            m.role,
        content:         m.message,
        type:            m.type,
        img_url:         m.imgUrl,
    }));
    const { error } = await supabase.from('elicit_messages')
        .upsert(rows, { onConflict: 'conversation_id,message_id', ignoreDuplicates: true });
    if (error) {
        console.error("Failed to batch insert chat messages:", error);
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
