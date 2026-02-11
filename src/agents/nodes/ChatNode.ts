import {ChatSchema} from "@/agents/schemas/ChatSchema";
import {chatModel} from "@/agents/models/deepseek-model";


export const chatNode = async (state: ChatSchema) => {
    console.log('ChatNode invoked with messages:', state.messages)
    const result = await chatModel.invoke(state.messages);

    return {
        messages: [result]
    }
}