import {ChatSchema} from "@/agents/schemas/ChatSchema";
import {chatModel} from "@/agents/models/deppseek-model";


export const chatNode = async (state: ChatSchema) => {

    const result = await chatModel.invoke(state.messages);

    return {
        messages: [result]
    }
}