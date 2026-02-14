import {ElicitGraphState} from "@/agents/schemas/ElicitGraphStateSchema";

export const shouldOcr =  (state: ElicitGraphState): string[] => {
    if (state.hasResolved) {
        return [];
    }
    return [ocrNodeName];
}

export const ocrNodeName = 'ocrNode'

export const ocrNode = async (state: ElicitGraphState) => {
    return {

    }
}