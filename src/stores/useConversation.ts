import {create} from "zustand";
import ChatMessageProps from "@/screen/chat/props/ChatMessageProps";
import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";


type ConversationStore = {
    chatMessages: ChatMessageProps[],
    isStreaming: boolean,
    sendMessage: (message: ChatMessageProps) => void,
    generateId: () => string
}

type ChunkMessage = {
    id: string,
    type: string,
    delta: string
}

export const useConversation = create<ConversationStore>((set, get) => {

    const chatMessages: ChatMessageProps[] = [];

    const isStreaming = false;

    const defaultMessage = new ChatMessageProps("conv-1-1", ChatMessageRoleEnum.ASSISTANT, "你好呀！我是引思助手\n\n遇到不会的题目了吗？把题目拍照发给我，我会一步步引导你思考，帮你找到解题思路！\n\n记住：我不会直接给你答案，但我会陪你一起分析，让你真正学会解题方法");
    chatMessages.push(defaultMessage);

    const sendMessage = async (message: ChatMessageProps) => {
        set(state => ({chatMessages: [...state.chatMessages, message]}));
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify(message)
        })

        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = await reader.read();
        while (!result.done) {
            const text = decoder.decode(result.value, {stream: true});
            text.split('\n').forEach(line => {
                line = line.replaceAll("data:", "");
                if (line.trim() === "") return;
                const parse: ChunkMessage = JSON.parse(line);
                if (!get().isStreaming) {
                    set(state => ({chatMessages: [...state.chatMessages, new ChatMessageProps(parse.id, ChatMessageRoleEnum.ASSISTANT, parse.delta)]}));
                    set({isStreaming: true});
                } else {
                    const lastMessage = get().chatMessages[get().chatMessages.length - 1];
                    set(state => ({chatMessages: [...state.chatMessages.slice(0, -1), new ChatMessageProps(parse.id, ChatMessageRoleEnum.ASSISTANT, lastMessage.content + parse.delta)]}));
                }

            });
            result = await reader.read();
        }
    }
    const generateId = () => "conv-1-" + (get().chatMessages.length + 1);

    return {
        isStreaming,
        chatMessages,
        sendMessage,
        generateId
    }
})