import {ElicitGraphState} from "@/agents/schemas/ElicitGraphStateSchema";
import {conversationMapper} from "@/db/mappers/ConversationMapper";
import {getWriter} from "@langchain/langgraph";


export const shouldCreateConversation = async (state: ElicitGraphState): Promise<'create' | 'skip'> => {
    const conversation = await conversationMapper.findById(state.conversationId);
    console.log('shouldCreateConversation invoked with conversation:', conversation)
    return conversation ? 'skip' : 'create';

}

export const createConversationNode = async (state: ElicitGraphState) => {
    console.log('createConversationNode invoked with messages:', state.messages)
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

    console.log('createConversationNode created conversation:', conversation)
    return {
        conversationId: conversation.conversationId
    };
}