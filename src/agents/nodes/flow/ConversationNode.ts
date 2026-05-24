import {ElicitGraphState} from "@/agents/schemas/ElicitGraphStateSchema";
import {conversationMapper} from "@/db/mappers/ConversationMapper";
import {getWriter} from "@langchain/langgraph";


export const shouldCreateConversation = async (state: ElicitGraphState): Promise<string[]> => {
    const conversation = await conversationMapper.findById(state.conversationId);
    console.log('shouldCreateConversation invoked with conversation:', conversation)
    // 返回空数组表示会话已存在，StartFinoutNode 会处理后续路由
    return conversation ? [] : [conversationNodeName];

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

export const conversationNodeName = 'conversationNode'
