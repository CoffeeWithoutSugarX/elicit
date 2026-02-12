import {create} from "zustand";
import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import ChatMessageRoleEnum from "@/types/enums/ChatMessageRoleEnum";
import ChatConversationProps from "@/features/chat/props/ChatConversationProps";
import {loadAllChatConversation} from "@/db/models/ChatConversation";
import {insertChatMessageRequest, loadChatMessagesByConversationIdRequest} from "@/db/models/ChatMessage";
import ChatMessageTypeEnum from "@/types/enums/ChatMessageTypeEnum";
import {generateId} from "@/lib/utils";
import {chatRequest} from "@/services/api-client/ChatRequest";

type ConversationStore = {
    chatMessages: ChatMessageProps[],
    chatConversation: ChatConversationProps[],
    currentConversationId: string,
    setCurrentConversationId: (id: string) => void,
    isStreaming: boolean,
    isWaitingFirstChunk: boolean,
    sendMessage: (message: ChatMessageProps) => void,
    loadAllConversation: () => Promise<boolean>
}

export type ChunkMessage = {
    id: string,
    type: string,
    delta: string,
    data?: {
        conversationId: string,
        title: string
    }
}

export const useConversation = create<ConversationStore>((set, get) => {

    const chatMessages: ChatMessageProps[] = [];

    const chatConversation: ChatConversationProps[] = [];

    const isStreaming = false;
    const isWaitingFirstChunk = false;
    const currentConversationId = "";

    const defaultMessage = new ChatMessageProps("conv-1-1", "conv-1", ChatMessageRoleEnum.ASSISTANT, "你好呀！我是引思助手\n\n遇到不会的题目了吗？把题目拍照发给我，我会一步步引导你思考，帮你找到解题思路！\n\n记住：我不会直接给你答案，但我会陪你一起分析，让你真正学会解题方法", ChatMessageTypeEnum.TEXT);
    chatMessages.push(defaultMessage);

    const setCurrentConversationId = async (id: string) => {
        set({currentConversationId: id});
        if (id === "") {
            set({chatMessages: [defaultMessage]});
            return
        }
        const chatMessageList = await loadChatMessagesByConversationIdRequest(id);
        set({chatMessages: [defaultMessage, ...chatMessageList]});
    };

    const upsetChatMessage = (message: ChunkMessage) => {
        const lastChatMessage = get().chatMessages[get().chatMessages.length - 1]
        if (lastChatMessage.id === message.id) {
            lastChatMessage.message += message.delta;
            set(state => ({chatMessages: [...state.chatMessages.slice(0, get().chatMessages.length - 1), lastChatMessage]}));
        } else {
            set(state => ({chatMessages: [...state.chatMessages, new ChatMessageProps(message.id, get().currentConversationId, ChatMessageRoleEnum.ASSISTANT, message.delta, ChatMessageTypeEnum.TEXT)]}));
        }
    }

    const sendMessage = async (message: ChatMessageProps) => {
        if (get().currentConversationId === "") {
            set({currentConversationId: generateId()})
            message.conversationId = get().currentConversationId;
        } else {
            await insertChatMessageRequest(message);
        }
        set(state => ({chatMessages: [...state.chatMessages, message]}));
        set({isStreaming: true, isWaitingFirstChunk: true});
        try {
            for await (const chunk of await chatRequest.getChatResponse(message)) {
                if (chunk.type === 'data-custom' && chunk.data?.conversationId === get().currentConversationId) {
                    set({chatConversation: [new ChatConversationProps(chunk.data.conversationId, chunk.data.title, new Date()), ...get().chatConversation]});
                    await insertChatMessageRequest(message);
                }
                if (!chunk.delta || chunk.delta.trim() === "") continue;
                if (get().isWaitingFirstChunk) {
                    set({isWaitingFirstChunk: false});
                }
                upsetChatMessage(chunk);
            }
            await insertChatMessageRequest(get().chatMessages[get().chatMessages.length - 1]);
        } finally {
            set({isStreaming: false, isWaitingFirstChunk: false});
        }
    }


    const loadAllConversation = async () => {
        try {
            const conversations = await loadAllChatConversation()
            if (conversations) {
                set({chatConversation: conversations})
            }
        } catch (error) {
            console.error("Failed to load all conversations:", error);
            return false
        }
        return true
    }

    return {
        currentConversationId,
        chatConversation,
        isStreaming,
        isWaitingFirstChunk,
        chatMessages,
        setCurrentConversationId,
        sendMessage,
        loadAllConversation
    }
})
