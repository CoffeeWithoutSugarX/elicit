import {create} from "zustand";
import ChatMessageProps from "@/features/chat/props/ChatMessageProps";
import { ChatMessageRole } from "@/types/enums/chatMessageRole.enum";
import ChatConversationProps from "@/features/chat/props/ChatConversationProps";
import {loadAllChatConversation} from "@/db/models/ChatConversation";
import {insertChatMessageRequest, insertChatMessagesRequest, loadChatMessagesByConversationIdRequest} from "@/db/models/ChatMessage";
import { ChatMessageType } from "@/types/enums/chatMessageType.enum";
import {generateId} from "@/lib/utils";
import {chatRequest} from "@/services/api-client/ChatRequest";
import {streamIterator} from "@/lib/utils";
import {supabase} from "@/db/supabase/supabase";
import {getAuthHeaders} from "@/services/api-client/getAuthHeaders";
import type { SanitizedQuestion } from "@/agents/schemas/OcrSchema";
import type { CustomChunk, ChunkMessage } from "@/types/sse/ChunkTypes";

// re-export 供历史 importer（@/stores/useConversation）保持兼容
export type { ChunkMessage };

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

// state hydration 辅助函数：从 LangGraph checkpoint 回填 Pólya 展示态
// 竞态守卫：回填前校验 id 是否仍是当前激活会话
const hydrateConversationState = async (
    id: string,
    get: () => ConversationStore,
    set: (partial: Partial<ConversationStore>) => void,
) => {
    try {
        const {data: {session}} = await supabase.auth.getSession();
        const response = await fetch(`/api/conversation/${id}/state`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session?.access_token}`,
            },
        });
        if (!response.ok) {
            console.warn(`[useConversation] state hydration 失败: ${response.status}`);
            return;
        }
        const body = await response.json() as {
            status: number;
            data: {
                currentPhase: number;
                currentSubProblemIndex: number;
                totalSubProblems: number;
                insightPoints: string[];
                hasResolved: boolean;
            };
        };
        const data = body.data;
        // 竞态守卫：用户可能已再次切会话，只在 id 仍是当前会话时才回填
        if (get().currentConversationId !== id) return;
        set({
            currentPhase: data.currentPhase,
            currentSubProblemIndex: data.currentSubProblemIndex,
            totalSubProblems: data.totalSubProblems,
            currentInsightPoints: data.insightPoints,
            hasResolved: data.hasResolved,
        });
    } catch (err) {
        // 网络错误等失败情况：静默保留重置后的默认值，不打断消息加载
        console.warn('[useConversation] state hydration 异常，保留默认值', err);
    }
};

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
        try {
            // 已是当前激活会话：不重载、不用 DB 覆盖内存中的乐观消息（修复发消息时用户气泡被冲掉的竞态）
            if (id !== "" && id === get().currentConversationId) return;
            set({currentConversationId: id});
            if (id === "") {
                // 避免上一会话的进度/卡片串台到新会话
                resetForNewConversation();
                set({chatMessages: [defaultMessage]});
                return;
            }
            // 切到不同会话时，先重置 Pólya 进度展示态（避免串台），
            // 随后并发发起 state hydration + 消息加载，将服务端 checkpoint 中的真实阶段回填回来
            // （hasResolved 也由 hydration 从服务端回填，checkpoint 是唯一事实源）。
            // pendingQuestions/isMultiQuestion 关系到 OCR/选题流程，不在此处重置。
            set({
                currentPhase: 0,
                currentSubProblemIndex: 0,
                totalSubProblems: 0,
                currentInsightPoints: [],
            });

            // 并发加载：消息列表 + 服务端 state hydration（互不依赖，不串行延迟）
            const [chatMessageList] = await Promise.all([
                loadChatMessagesByConversationIdRequest(id),
                hydrateConversationState(id, get, set),
            ]);

            set({chatMessages: [defaultMessage, ...chatMessageList]});
        } catch (err) {
            // 切会话异常（如网络故障）：打印日志，UI 维持当前状态，不让异常向上扩散
            console.warn('[useConversation] setCurrentConversationId 异常', err);
            set({ sendError: '切换会话失败，请重试' });
        }
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
        const msgs = get().chatMessages;
        const lastChatMessage = msgs[msgs.length - 1];
        if (lastChatMessage.id === message.id) {
            lastChatMessage.message += message.delta;
            set(state => ({chatMessages: [...state.chatMessages.slice(0, state.chatMessages.length - 1), lastChatMessage]}));
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
                    // 新会话刚创建，用当前时间作为 createdAt（与服务端插入时间几乎一致）
                    set({chatConversation: [new ChatConversationProps(custom.conversationId, custom.title, new Date().toISOString()), ...get().chatConversation]});
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
                // P-105：知识卡片消息化（格式对齐 OCR_CARD 的 JSON.stringify({question}) 模式），
                // 落库由流结束后的批量落库逻辑统一处理，无需此处单独 insert
                set(state => ({
                    chatMessages: [
                        ...state.chatMessages,
                        new ChatMessageProps(
                            generateId(),
                            get().currentConversationId,
                            ChatMessageRole.ASSISTANT,
                            JSON.stringify({ card: custom.card }),
                            ChatMessageType.KNOWLEDGE_CARD,
                        ),
                    ],
                    // data-custom 分支不触发普通 isWaitingFirstChunk 复位，此处手动复位
                    isWaitingFirstChunk: false,
                }));
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

    // 流结束后批量落库本轮新增的 ASSISTANT 消息（TEXT + KNOWLEDGE_CARD）
    // startLen：processStream 调用前记录的 chatMessages 长度，用于 slice 出本轮新增消息
    const persistNewAssistantMessages = async (startLen: number) => {
        const newMsgs = get().chatMessages.slice(startLen).filter(m =>
            m.role === ChatMessageRole.ASSISTANT &&
            (m.type === ChatMessageType.TEXT || m.type === ChatMessageType.KNOWLEDGE_CARD)
        );
        await insertChatMessagesRequest(newMsgs);
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
            // 记录流开始前的消息列表长度，流结束后 slice 出本轮新增消息批量落库
            const startLen = get().chatMessages.length;
            await processStream(response);
            await persistNewAssistantMessages(startLen);
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

        // 捕获乐观更新前的 pendingQuestions，供 catch 回滚时恢复交互卡
        const prevPendingQuestions = get().pendingQuestions;

        // 捕获侧边栏中对应会话的原 title，供 catch 回滚时恢复
        const prevConversationTitle = get().chatConversation.find(c => c.id === conversationId)?.title;

        // 乐观原子更新：hasResolved + cardMsg 追加进 chatMessages + pendingQuestions 清空
        // + 侧边栏对应会话 title 更新为 confirmedQuestion.topic（如存在）
        // 四者合并为一次 set，消除网络往返期间的闪烁空窗期
        set(state => ({
            hasResolved: true,
            isStreaming: true,
            isWaitingFirstChunk: true,
            chatMessages: [...state.chatMessages, cardMsg],
            pendingQuestions: [],
            // 仅当 topic 非空且侧边栏中找得到该会话时更新 title；找不到则保持列表不变
            ...(confirmedQuestion.topic
                ? {
                    chatConversation: state.chatConversation.map(c =>
                        c.id === conversationId
                            ? new ChatConversationProps(c.id, confirmedQuestion.topic, c.createdAt)
                            : c
                    ),
                }
                : {}
            ),
        }));
        try {
            const response = await fetch(`/api/conversation/${conversationId}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...await getAuthHeaders(),
                },
                body: JSON.stringify({selectedQuestionIndex: index}),
            });
            // 4xx/5xx 或 body 缺失均视为失败
            if (!response.ok || !response.body) {
                throw new Error(`resolve 请求失败: ${response.status}`);
            }
            // 落库确认卡（type=3，供刷新后复现）；cardMsg 已在乐观 set 时追加进 chatMessages
            await insertChatMessageRequest(cardMsg);

            // 记录流开始前的消息列表长度，流结束后 slice 出本轮新增消息批量落库
            // OCR_CARD（type=3）在乐观更新时已单独 insert，不在批量范围内
            const startLen = get().chatMessages.length;
            await processStream(response);
            await persistNewAssistantMessages(startLen);
        } catch (error) {
            console.error('confirmSelectedQuestion failed:', error);
            // 回滚乐观状态；isStreaming/isWaitingFirstChunk 由 finally 复位
            // 同时移除已乐观追加的确认卡，并恢复捕获的 pendingQuestions，
            // 使交互卡重新显示，让用户可以重试；侧边栏 title 也回滚为原值
            set(state => ({
                hasResolved: false,
                sendError: '选题失败，请重试',
                chatMessages: state.chatMessages.filter(m => m.id !== cardMsg.id),
                pendingQuestions: prevPendingQuestions,
                // 回滚侧边栏 title：找得到该会话且原 title 有值时才恢复
                ...(prevConversationTitle !== undefined
                    ? {
                        chatConversation: state.chatConversation.map(c =>
                            c.id === conversationId
                                ? new ChatConversationProps(c.id, prevConversationTitle, c.createdAt)
                                : c
                        ),
                    }
                    : {}
                ),
            }));
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
            // 加载历史会话失败：给出用户可感知的错误提示（与 sendMessage 错误处理模式一致）
            set({ sendError: '加载历史会话失败，请刷新后重试' });
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
