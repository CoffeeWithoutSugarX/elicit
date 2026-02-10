import {create} from "zustand";
import ChatMessageProps from "@/screen/chat/props/ChatMessageProps";
import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";
import ChatConversationProps from "@/screen/chat/props/ChatConversationProps";
import {supabase} from "@/db/browers/supabase/supabase";
import {loadAllChatConversation} from "@/db/browers/ChatConversation";
import {insertChatMessage, loadChatMessagesByConversationId} from "@/db/browers/ChatMessage";
import ChatMessageTypeEnum from "@/enums/ChatMessageTypeEnum";
import {generateId} from "@/lib/utils";

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

type ChunkMessage = {
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
        const chatMessageList = await loadChatMessagesByConversationId(id);
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
        if (currentConversationId === "") {
            set({currentConversationId: generateId()})
            message.conversationId = get().currentConversationId;
        }
        set(state => ({chatMessages: [...state.chatMessages, message]}));
        set({isWaitingFirstChunk: true});

        const {data: {session}} = await supabase.auth.getSession();



        const response = await fetch(`/api/chat/${get().currentConversationId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify(message)
        })

        if (!response.body) {
            set({isWaitingFirstChunk: false});
            return;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let result = await reader.read();
        set({isStreaming: true, isWaitingFirstChunk: true});
        let receivedFirstChunk = false;
        while (!result.done) {
            const text = decoder.decode(result.value, {stream: true});
            text.split('\n').forEach(line => {
                line = line.replaceAll("data:", "");
                if (line.trim() === "") return;
                try {
                    const parse: ChunkMessage = JSON.parse(line);
                    if (parse.type === 'data-custom' && parse.data?.conversationId === get().currentConversationId) {
                        set({chatConversation: [...get().chatConversation, new ChatConversationProps(parse.data.conversationId, parse.data.title, new Date())]});
                        insertChatMessage(message);
                    }
                    if (!parse.delta || parse.delta.trim() === "") return;
                    if (!receivedFirstChunk) {
                        receivedFirstChunk = true;
                        set({isWaitingFirstChunk: false});
                    }
                    upsetChatMessage(parse);
                } catch (ignore) {

                }

            });
            result = await reader.read();
        }
        await insertChatMessage(get().chatMessages[get().chatMessages.length - 1]);
        set({isStreaming: false, isWaitingFirstChunk: false});
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
        setCurrentConversationId,
        isStreaming,
        isWaitingFirstChunk,
        chatMessages,
        sendMessage,
        loadAllConversation
    }
})
