import { supabase } from "@/db/supabase/supabase";
import ChatConversationProps from "@/features/chat/props/ChatConversationProps";

export const loadAllChatConversation = async () => {
    const { data, error } = await supabase
        .from('elicit_conversations')
        .select(`
            conversation_id,
            title,
            created_at
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error loading chat conversations:', error);
        return [];
    }

    return data?.map((conversation) =>
        new ChatConversationProps(conversation.conversation_id, conversation.title ?? '', conversation.created_at)
    ) ?? [];
};
