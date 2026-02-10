import {supabase} from "@/db/browers/supabase/supabase";
import ChatConversationProps from "@/screen/chat/props/ChatConversationProps";


export const loadAllChatConversation = async () => {

    const {data, error} = await supabase
        .from('elicit_conversations')
        .select(`
            *
        `)
        .order('created_at', {ascending: false});

    if (error) {
        console.error('Error loading chat conversations:', error);
        return [];
    }

    return data?.map((conversation) => {
        const createdAtDate = new Date(conversation.created_at);
        return new ChatConversationProps(conversation.conversation_id, conversation.title ?? '', createdAtDate);
    }) ?? [];
}

