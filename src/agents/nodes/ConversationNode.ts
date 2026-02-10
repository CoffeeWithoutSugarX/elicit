import {ChatSchema} from "@/agents/schemas/ChatSchema";
import {conversationMapper} from "@/db/server/mapper/ConversationMapper";
import {getWriter} from "@langchain/langgraph";


export const shouldCreateConversation = async (state: ChatSchema): Promise<'create' | 'skip'> => {
    const conversation = await conversationMapper.findById(state.userId);
    return conversation ? 'skip' : 'create';

}

export const createConversationNode = async (state: ChatSchema) => {
    const message = state.messages[0];
    let title = message.text;
    if (message.text.length > 10) {
        title = message.text.substring(0, 10);
    }
    const conversation = await conversationMapper.create(state.conversationId, state.userId, title);

    const writer = getWriter();
    if (writer) {
        writer({conversationId: conversation.conversationId, title: conversation.title})
    }

    return {
        conversationId: conversation.conversationId
    };
}