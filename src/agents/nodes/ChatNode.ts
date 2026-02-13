import {ElicitGraphState} from "@/agents/schemas/ElicitGraphStateSchema";
import {chatModel} from "@/agents/models/deepseek-model";


export const chatNode = async (state: ElicitGraphState) => {
    console.log('ChatNode invoked with messages:', state.messages)
    const result = await chatModel.invoke(state.messages);

    return {
        messages: [result]
    }
}