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
    draftMessage: { text: string; imgUrl?: string } | null;  // 失败回填
    sendError: string | null;                                  // 错误提示

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
    clearSendError: () => void;                                // 清除错误
}

export type ChunkMessage = {
    id: string;
    type: string;
    delta: string;
    data?: Record<string, unknown>;
    errorText?: string;
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
        // 已是当前激活会话：不重载、不用 DB 覆盖内存中的乐观消息（修复发消息时用户气泡被冲掉的竞态）
        if (id !== "" && id === get().currentConversationId) return;
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

    // 处理 data-custom chunk，按 kind 分发
    const handleCustomChunk = async (chunk: ChunkMessage) => {
        const data = chunk.data;
        if (!data) return;

        // 有 kind 字段，强制转换为 CustomChunk 并按类型分发
        const custom = data as unknown as CustomChunk;
        switch (custom.kind) {
            case 'conversation_created':
                // 新会话已在服务端创建，将其插入侧边栏列表最前面
                if (custom.conversationId === get().currentConversationId) {
                    set({chatConversation: [new ChatConversationProps(custom.conversationId, custom.title), ...get().chatConversation]});
                    const userMsg = get().chatMessages.find(
                        m => m.role === ChatMessageRole.USER && m.conversationId === custom.conversationId
                    );
                    if (userMsg) await insertChatMessageRequest(userMsg);
                }
                break;
            case 'phase_changed':
                set({currentPhase: custom.phase});
                break;
            case 'knowledge_card':
                set({knowledgeCard: custom.card});
                break;
            case 'questions_detected':
                // 无论单题还是多题，都弹卡等用户手动确认，不再自动确认
                set({pendingQuestions: custom.questions, isMultiQuestion: custom.isMulti});
                break;
            case 'sub_problem_changed':
                set({currentSubProblemIndex: custom.currentIndex, totalSubProblems: custom.totalCount});
                break;
            case 'assistant_message':
                // phase 节点抑制 token 流，妹妹回复通过此 chunk 一次性整段下发
                set(state => ({
                    chatMessages: [
                        ...state.chatMessages,
                        new ChatMessageProps(
                            generateId(),
                            get().currentConversationId,
                            ChatMessageRole.ASSISTANT,
                            custom.text,
                            ChatMessageType.TEXT,
                        ),
                    ],
                    // processStream 里 data-custom 走 continue 分支，不会触发现有的 isWaitingFirstChunk 复位，
                    // 必须在此处手动复位，否则「正在思考…」不消失
                    isWaitingFirstChunk: false,
                }));
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
            // graph 节点抛错时 toUIMessageStream 自动 emit { type:'error', errorText }
            // 终止流解析，终止「正在思考…」；外层 finally 负责复位 isStreaming/isWaitingFirstChunk
            if (chunk.type === 'error') {
                set({ sendError: chunk.errorText || '生成失败，请重试', isWaitingFirstChunk: false });
                return;
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
            const conversationExists = get().chatConversation.some(
                c => c.id === get().currentConversationId
            );
            if (conversationExists) {
                await insertChatMessageRequest(message);
            }
        }
        set(state => ({chatMessages: [...state.chatMessages, message]}));
        set({isStreaming: true, isWaitingFirstChunk: true});
        try {
            const response = await chatRequest.getRawResponse(message);
            // 4xx/5xx 时 fetch 不 reject，需手动检查 ok 以触发 catch（撤销乐观渲染 + 回填草稿）
            if (!response.ok) throw new Error('发送失败: ' + response.status);
            await processStream(response);
            const lastMsg = get().chatMessages[get().chatMessages.length - 1];
            if (lastMsg.id !== message.id) {
                await insertChatMessageRequest(lastMsg);
            }
        } catch (error) {
            console.error('sendMessage failed:', error);
            // 1. 撤销乐观渲染
            set(state => ({
                chatMessages: state.chatMessages.filter(m => m.id !== message.id)
            }));
            // 2. 回填草稿 + 设置错误
            set({
                draftMessage: { text: message.message, imgUrl: message.imgUrl ?? undefined },
                sendError: '发送失败，请检查网络后重试',
            });
        } finally {
            set({isStreaming: false, isWaitingFirstChunk: false});
        }
    };

    // 用户确认选择某道题（P-103 多题选择流程），调用 /resolve 接口并处理 SSE 回包
    const confirmSelectedQuestion = async (index: number) => {
        const conversationId = get().currentConversationId;
        // 在乐观更新前，先取出被确认的题目和原题图 key
        const confirmedQuestion = get().pendingQuestions[index];
        const imgKey = [...get().chatMessages].reverse().find(
            m => m.role === ChatMessageRole.USER && m.imgUrl
        )?.imgUrl ?? '';

        // 构建已确认题目卡消息（type=3 OCR_CARD），content 格式：JSON.stringify({question})
        const cardMsg = new ChatMessageProps(
            generateId(),
            conversationId,
            ChatMessageRole.ASSISTANT,
            JSON.stringify({ question: confirmedQuestion }),
            ChatMessageType.OCR_CARD,
            imgKey,
        );

        // 乐观置 hasResolved，catch 里回滚
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
            // 4xx/5xx 或 body 缺失均视为失败
            if (!response.ok || !response.body) {
                throw new Error(`resolve 请求失败: ${response.status}`);
            }
            // fetch 成功后，processStream 之前：把确认卡推入消息流并清空待确认列表
            set(state => ({ chatMessages: [...state.chatMessages, cardMsg], pendingQuestions: [] }));
            // 落库确认卡（type=3，供刷新后复现）
            await insertChatMessageRequest(cardMsg);

            await processStream(response);
            // 成功路径：仅当最后一条消息是 ASSISTANT 且 type=TEXT 时才落库（避免把 OCR_CARD 卡误当妹妹文本落库）
            const lastMsg = get().chatMessages[get().chatMessages.length - 1];
            if (lastMsg && lastMsg.role === ChatMessageRole.ASSISTANT && lastMsg.type === ChatMessageType.TEXT) {
                await insertChatMessageRequest(lastMsg);
            }
        } catch (error) {
            console.error('confirmSelectedQuestion failed:', error);
            // 回滚乐观状态；isStreaming/isWaitingFirstChunk 由 finally 复位
            // pendingQuestions 此时可能已被清空，确认卡已落库——可接受，不强求恢复交互卡
            set({ hasResolved: false, sendError: '选题失败，请重试' });
        } finally {
            set({isStreaming: false, isWaitingFirstChunk: false});
        }
    };

    const clearSendError = () => set({ sendError: null });

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
        draftMessage: null,
        sendError: null,

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
        clearSendError,
    };
});
