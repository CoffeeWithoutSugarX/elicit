import {create} from "zustand";
import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import { ChatMessageRole } from "@/types/enums/chatMessageRole.enum";
import ChatConversationProps from "@/features/chat/props/ChatConversationProps";
import {loadAllChatConversation} from "@/db/models/ChatConversation";
import {insertChatMessageRequest, loadChatMessagesByConversationIdRequest} from "@/db/models/ChatMessage";
import { ChatMessageType } from "@/types/enums/chatMessageType.enum";
import {generateId} from "@/lib/utils";
import {chatRequest} from "@/services/api-client/ChatRequest";
import {streamIterator} from "@/lib/utils";
import {supabase} from "@/db/supabase/supabase";
import type { SanitizedQuestion } from "@/agents/schemas/OcrSchema";
import type { KnowledgeCard } from "@/agents/schemas/KnowledgeCardSchema";
import type { CustomChunk } from "@/types/sse/ChunkTypes";

type ConversationStore = {
    chatMessages: ChatMessageProps[];
    chatConversation: ChatConversationProps[];
    currentConversationId: string;
    tempConversationId: string;
    isStreaming: boolean;
    isWaitingFirstChunk: boolean;

    // Polya 解题流程状态
    currentPhase: number;              // PolyaPhase 枚举值，默认 0 = UNDERSTAND
    currentSubProblemIndex: number;    // 当前子问题下标，默认 0
    totalSubProblems: number;          // 子问题总数，默认 0
    pendingQuestions: SanitizedQuestion[];  // OCR 检测到的候选题目，等待用户选择
    isMultiQuestion: boolean;          // 是否需要 P-103 多题选择流程
    currentInsightPoints: string[];    // 当前子问题的 insight points
    knowledgeCard: KnowledgeCard | null;   // 最终知识卡片
    hasResolved: boolean;              // 用户是否已选定题目

    // 方法
    setCurrentConversationId: (id: string) => void;
    setTempConversationId: () => string;
    sendMessage: (message: ChatMessageProps) => void;
    loadAllConversation: () => Promise<boolean>;
    confirmSelectedQuestion: (index: number) => Promise<void>;
    resetForNewConversation: () => void;
}

export type ChunkMessage = {
    id: string;
    type: string;
    delta: string;
    data?: Record<string, unknown>;
}

export const useConversation = create<ConversationStore>((set, get) => {

    const chatMessages: ChatMessageProps[] = [];
    const chatConversation: ChatConversationProps[] = [];
    const isStreaming = false;
    const isWaitingFirstChunk = false;
    const currentConversationId = "";
    const tempConversationId = "";

    const defaultMessage = new ChatMessageProps("conv-1-1", "conv-1", ChatMessageRole.ASSISTANT, "你好呀！我是引思助手\n\n遇到不会的题目了吗？把题目拍照发给我，我会一步步引导你思考，帮你找到解题思路！\n\n记住：我不会直接给你答案，但我会陪你一起分析，让你真正学会解题方法", ChatMessageType.TEXT);
    chatMessages.push(defaultMessage);

    const setCurrentConversationId = async (id: string) => {
        set({currentConversationId: id});
        if (id === "") {
            set({chatMessages: [defaultMessage]});
            return;
        }
        const chatMessageList = await loadChatMessagesByConversationIdRequest(id);
        set({chatMessages: [defaultMessage, ...chatMessageList]});
    };

    const setTempConversationId = () => {
        if (get().currentConversationId.trim() === "") {
            set({tempConversationId: generateId()});
        } else {
            set({tempConversationId: get().currentConversationId});
        }
        return get().tempConversationId;
    };

    // 向 chatMessages 追加或追加内容到最后一条消息（SSE 文本增量）
    const upsetChatMessage = (message: ChunkMessage) => {
        const lastChatMessage = get().chatMessages[get().chatMessages.length - 1];
        if (lastChatMessage.id === message.id) {
            lastChatMessage.message += message.delta;
            set(state => ({chatMessages: [...state.chatMessages.slice(0, get().chatMessages.length - 1), lastChatMessage]}));
        } else {
            set(state => ({chatMessages: [...state.chatMessages, new ChatMessageProps(message.id, get().currentConversationId, ChatMessageRole.ASSISTANT, message.delta, ChatMessageType.TEXT)]}));
        }
    };

    // 处理 data-custom chunk，按 kind 分发；兼容无 kind 的旧版 conversation_created 格式
    const handleCustomChunk = async (chunk: ChunkMessage) => {
        const data = chunk.data;
        if (!data) return;

        // 旧版兼容：ConversationNode 推送 {conversationId, title}，无 kind 字段
        if (!('kind' in data)) {
            const legacyConvId = data.conversationId as string | undefined;
            const legacyTitle  = data.title as string | undefined;
            if (legacyConvId && legacyTitle && legacyConvId === get().currentConversationId) {
                set({chatConversation: [new ChatConversationProps(legacyConvId, legacyTitle), ...get().chatConversation]});
                await insertChatMessageRequest(get().chatMessages[get().chatMessages.length - 1]);
            }
            return;
        }

        // 有 kind 字段，强制转换为 CustomChunk 并按类型分发
        const custom = data as unknown as CustomChunk;
        switch (custom.kind) {
            case 'conversation_created':
                // 新会话已在服务端创建，将其插入侧边栏列表最前面
                if (custom.conversationId === get().currentConversationId) {
                    set({chatConversation: [new ChatConversationProps(custom.conversationId, custom.title), ...get().chatConversation]});
                    await insertChatMessageRequest(get().chatMessages[get().chatMessages.length - 1]);
                }
                break;
            case 'phase_changed':
                set({currentPhase: custom.phase});
                break;
            case 'knowledge_card':
                set({knowledgeCard: custom.card});
                break;
            case 'questions_detected':
                set({pendingQuestions: custom.questions, isMultiQuestion: custom.isMulti});
                // 单题时自动确认，跳过 P-103 多题选择流程
                if (!custom.isMulti) {
                    confirmSelectedQuestion(0);
                }
                break;
            case 'sub_problem_changed':
                set({currentSubProblemIndex: custom.currentIndex, totalSubProblems: custom.totalCount});
                break;
            default:
                // 未知 kind，静默忽略（CR-005 兼容性）
                break;
        }
    };

    // 复用的流解析主循环，适用于 /chat 和 /resolve 两条 SSE 路径
    const processStream = async (response: Response) => {
        for await (const chunk of streamIterator(response)) {
            if (chunk.type === 'data-custom') {
                await handleCustomChunk(chunk);
                continue;
            }
            if (!chunk.delta || chunk.delta.trim() === "") continue;
            if (get().isWaitingFirstChunk) {
                set({isWaitingFirstChunk: false});
            }
            upsetChatMessage(chunk);
        }
    };

    const sendMessage = async (message: ChatMessageProps) => {
        if (get().currentConversationId === "") {
            if (get().tempConversationId) {
                set({currentConversationId: get().tempConversationId});
            } else {
                set({currentConversationId: generateId()});
            }
            message.conversationId = get().currentConversationId;
        } else {
            await insertChatMessageRequest(message);
        }
        set(state => ({chatMessages: [...state.chatMessages, message]}));
        set({isStreaming: true, isWaitingFirstChunk: true});
        try {
            const response = await chatRequest.getRawResponse(message);
            await processStream(response);
            await insertChatMessageRequest(get().chatMessages[get().chatMessages.length - 1]);
        } finally {
            set({isStreaming: false, isWaitingFirstChunk: false});
        }
    };

    // 用户确认选择某道题（P-103 多题选择流程），调用 /resolve 接口并处理 SSE 回包
    const confirmSelectedQuestion = async (index: number) => {
        const conversationId = get().currentConversationId;
        set({hasResolved: true, isStreaming: true, isWaitingFirstChunk: true});
        try {
            const {data: {session}} = await supabase.auth.getSession();
            const response = await fetch(`/api/conversation/${conversationId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({selectedQuestionIndex: index}),
            });
            if (!response.body) {
                throw new Error("Failed to get resolve response");
            }
            await processStream(response);
            await insertChatMessageRequest(get().chatMessages[get().chatMessages.length - 1]);
        } finally {
            set({isStreaming: false, isWaitingFirstChunk: false});
        }
    };

    // 重置所有 Polya 流程相关状态，用于新会话开始时
    const resetForNewConversation = () => {
        set({
            currentPhase: 0,
            currentSubProblemIndex: 0,
            totalSubProblems: 0,
            pendingQuestions: [],
            isMultiQuestion: false,
            currentInsightPoints: [],
            knowledgeCard: null,
            hasResolved: false,
        });
    };

    const loadAllConversation = async () => {
        try {
            const conversations = await loadAllChatConversation();
            if (conversations) {
                set({chatConversation: conversations});
            }
        } catch (error) {
            console.error("Failed to load all conversations:", error);
            return false;
        }
        return true;
    };

    return {
        currentConversationId,
        tempConversationId,
        chatConversation,
        isStreaming,
        isWaitingFirstChunk,
        chatMessages,

        // Polya 流程状态初始值
        currentPhase: 0,
        currentSubProblemIndex: 0,
        totalSubProblems: 0,
        pendingQuestions: [],
        isMultiQuestion: false,
        currentInsightPoints: [],
        knowledgeCard: null,
        hasResolved: false,

        // 方法
        setCurrentConversationId,
        setTempConversationId,
        sendMessage,
        loadAllConversation,
        confirmSelectedQuestion,
        resetForNewConversation,
    };
});
