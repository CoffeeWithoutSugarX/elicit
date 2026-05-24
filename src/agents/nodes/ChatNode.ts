import {ElicitGraphState} from "@/agents/schemas/ElicitGraphStateSchema";
import {chatModel} from "@/agents/models/deepseek-model";


/** @deprecated Will be replaced by Pólya PhaseNodes in detailed design D2. */
export const chatNode = async (state: ElicitGraphState) => {
    console.log('ChatNode invoked with messages:', state.messages)
    const result = await chatModel.invoke(state.messages);

    return {
        messages: [result]
    }
}

export const chatNodeName = 'chatNode'