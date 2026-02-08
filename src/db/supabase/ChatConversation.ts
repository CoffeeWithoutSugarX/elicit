import {supabase} from "@/db/supabase/supabase";
import ChatConversationProps from "@/screen/chat/props/ChatConversationProps";


export const loadAllChatConversation = async () => {

    const {data, error} = await supabase
        .from('elicit_conversations')
        .select(`
            *,
            elicit_messages(count)
        `);

    if (error) {
        console.error('Error loading chat conversations:', error);
        return [];
    }
    return data?.map((conversation) => {
        const createdAtDate = new Date(conversation.created_at);
        // Supabase 返回聚合结果的默认格式是数组：[{ count: number }]
        // 虽然在 SQL 里它是聚合的，但在 JS 返回值里它保持了关联表的层级结构
        const messageCount = (conversation.elicit_messages)?.[0]?.count ?? 0;
        return new ChatConversationProps(conversation.conversation_id, conversation.title ?? '', createdAtDate, messageCount);
    });
}

