import {create} from "zustand";
import ChatMessageProps from "@/screen/chat/props/ChatMessageProps";
import ChatMessageRoleEnum from "@/screen/chat/enums/ChatMessageRoleEnum";

type ConversationStore = {
    chatMessages: ChatMessageProps[],
    addMessage: (message: ChatMessageProps) => void,
    generateId: () => string
}

export const useConversation = create<ConversationStore>((set) => {

    const chatMessages: ChatMessageProps[] = [];

    const defaultMessage = new ChatMessageProps("conv-1-1", ChatMessageRoleEnum.ASSISTANT, "你好呀！我是引思助手\n\n遇到不会的题目了吗？把题目拍照发给我，我会一步步引导你思考，帮你找到解题思路！\n\n记住：我不会直接给你答案，但我会陪你一起分析，让你真正学会解题方法");
    chatMessages.push(defaultMessage);

    const addMessage = (message: ChatMessageProps) => {
        set(state => ({chatMessages: [...state.chatMessages, message]}))
    }
    const generateId = () => "conv-1-" + chatMessages.length + 1;

    return {
        chatMessages,
        addMessage,
        generateId
    }
})