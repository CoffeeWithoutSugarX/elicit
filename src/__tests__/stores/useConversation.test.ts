import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';
import ChatConversationProps from '@/features/chat/props/ChatConversationProps';
import type { ChunkMessage } from '@/stores/useConversation';

// ---- Mocks (must be declared before imports that use them) ----

const mockInsertChatMessageRequest = vi.fn();
const mockLoadChatMessagesByConversationIdRequest = vi.fn();
const mockLoadAllChatConversation = vi.fn();
const mockGetRawResponse = vi.fn();
const mockGetSession = vi.fn();
const mockFetch = vi.fn();

vi.mock('@/db/models/ChatMessage', () => ({
    insertChatMessageRequest: (...args: unknown[]) => mockInsertChatMessageRequest(...args),
    loadChatMessagesByConversationIdRequest: (...args: unknown[]) => mockLoadChatMessagesByConversationIdRequest(...args),
}));

vi.mock('@/db/models/ChatConversation', () => ({
    loadAllChatConversation: () => mockLoadAllChatConversation(),
}));

vi.mock('@/services/api-client/ChatRequest', () => ({
    chatRequest: {
        getRawResponse: (...args: unknown[]) => mockGetRawResponse(...args),
    },
}));

vi.mock('@/db/supabase/supabase', () => ({
    supabase: {
        auth: {
            getSession: () => mockGetSession(),
        },
    },
}));

// Mock streamIterator — we control what chunks come out
const mockStreamIterator = vi.fn();
vi.mock('@/lib/utils', async (importOriginal) => {
    const original = await importOriginal<typeof import('@/lib/utils')>();
    return {
        ...original,
        // Keep generateId real, override streamIterator
        streamIterator: (...args: unknown[]) => mockStreamIterator(...args),
    };
});

// Mock global fetch (used by confirmSelectedQuestion)
global.fetch = mockFetch;

// ---- Import store AFTER mocks ----
import { useConversation } from '@/stores/useConversation';

// ---- Helpers ----

function makeUserMsg(id = 'msg-user-1', convId = 'conv-abc') {
    return new ChatMessageProps(id, convId, ChatMessageRole.USER, '帮我解这道题', ChatMessageType.TEXT);
}

/** Async generator that yields the given chunks */
async function* makeChunkStream(chunks: ChunkMessage[]) {
    for (const c of chunks) {
        yield c;
    }
}

/** Build a minimal mock Response with ok=true and a body (for confirmSelectedQuestion) */
function makeOkResponse() {
    return { ok: true, body: {} } as unknown as Response;
}

/** Build a resolve response: ok=true + body, used for confirmSelectedQuestion success path */
function makeOkResolveResponse() {
    return { ok: true, body: {} } as unknown as Response;
}

const DEFAULT_MSG_ID = 'conv-1-1';

/** Reset store to clean initial state before each test */
function resetStore() {
    const defaultMessage = new ChatMessageProps(
        DEFAULT_MSG_ID,
        'conv-1',
        ChatMessageRole.ASSISTANT,
        '你好呀！我是引思助手\n\n遇到不会的题目了吗？把题目拍照发给我，我会一步步引导你思考，帮你找到解题思路！\n\n记住：我不会直接给你答案，但我会陪你一起分析，让你真正学会解题方法',
        ChatMessageType.TEXT
    );
    useConversation.setState({
        chatMessages: [defaultMessage],
        chatConversation: [],
        currentConversationId: '',
        tempConversationId: '',
        isStreaming: false,
        isWaitingFirstChunk: false,
        draftMessage: null,
        sendError: null,
        currentPhase: 0,
        currentSubProblemIndex: 0,
        totalSubProblems: 0,
        pendingQuestions: [],
        isMultiQuestion: false,
        currentInsightPoints: [],
        hasResolved: false,
    });
}

// ======================================================
// Tests
// ======================================================

describe('useConversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.resetAllMocks();  // 重置 mock 返回值队列，防止 mockReturnValueOnce 泄漏到下一个测试
        resetStore();
    });

    // --------------------------------------------------
    // setCurrentConversationId
    // --------------------------------------------------
    describe('setCurrentConversationId', () => {
        it('设置空字符串时重置 chatMessages 为默认欢迎消息', async () => {
            // Put some messages in first
            useConversation.setState({ chatMessages: [makeUserMsg()] });
            await useConversation.getState().setCurrentConversationId('');
            const msgs = useConversation.getState().chatMessages;
            expect(msgs).toHaveLength(1);
            expect(msgs[0].id).toBe(DEFAULT_MSG_ID);
        });

        it('设置空字符串时不调用 loadChatMessagesByConversationIdRequest', async () => {
            await useConversation.getState().setCurrentConversationId('');
            expect(mockLoadChatMessagesByConversationIdRequest).not.toHaveBeenCalled();
        });

        it('设置有效 ID 时加载消息并追加到默认消息后', async () => {
            const loaded = [makeUserMsg('msg-loaded', 'conv-xyz')];
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce(loaded);

            await useConversation.getState().setCurrentConversationId('conv-xyz');

            expect(mockLoadChatMessagesByConversationIdRequest).toHaveBeenCalledWith('conv-xyz');
            const msgs = useConversation.getState().chatMessages;
            expect(msgs).toHaveLength(2);
            expect(msgs[0].id).toBe(DEFAULT_MSG_ID);
            expect(msgs[1].id).toBe('msg-loaded');
        });

        it('设置有效 ID 时更新 currentConversationId', async () => {
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);
            await useConversation.getState().setCurrentConversationId('conv-999');
            expect(useConversation.getState().currentConversationId).toBe('conv-999');
        });

        it('没有历史消息时只有默认欢迎消息', async () => {
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);
            await useConversation.getState().setCurrentConversationId('conv-empty');
            expect(useConversation.getState().chatMessages).toHaveLength(1);
        });

        it('传入的 id 与当前 currentConversationId 相同（且非空）时，不调用 loadChatMessagesByConversationIdRequest，且不覆盖已有消息（守卫修复竞态）', async () => {
            // 模拟已有乐观 append 的用户消息
            const optimisticMsg = makeUserMsg('msg-optimistic', 'conv-active');
            useConversation.setState({
                currentConversationId: 'conv-active',
                chatMessages: [
                    new ChatMessageProps(DEFAULT_MSG_ID, 'conv-1', ChatMessageRole.ASSISTANT, '你好', ChatMessageType.TEXT),
                    optimisticMsg,
                ],
            });

            // 再次以相同 id 调用 setCurrentConversationId（模拟 useEffect 触发的竞态调用）
            await useConversation.getState().setCurrentConversationId('conv-active');

            // 不应向 DB 发请求
            expect(mockLoadChatMessagesByConversationIdRequest).not.toHaveBeenCalled();
            // 乐观消息不应被清除
            const msgs = useConversation.getState().chatMessages;
            expect(msgs.find(m => m.id === 'msg-optimistic')).toBeDefined();
            expect(msgs).toHaveLength(2);
        });

        it('切到不同有效会话时重置 Pólya 展示态（phase/subProblemIndex/totalSubProblems/insightPoints）', async () => {
            // 预置非零的展示态（模拟正在做一道多子问题的题）
            useConversation.setState({
                currentConversationId: 'conv-a',
                currentPhase: 2,
                currentSubProblemIndex: 1,
                totalSubProblems: 3,
                currentInsightPoints: ['洞察1'],
            });
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);

            // 切到不同会话
            await useConversation.getState().setCurrentConversationId('conv-b');

            // 仅展示态字段应被重置为 0/空
            const state = useConversation.getState();
            expect(state.currentPhase).toBe(0);
            expect(state.currentSubProblemIndex).toBe(0);
            expect(state.totalSubProblems).toBe(0);
            expect(state.currentInsightPoints).toHaveLength(0);
        });

        it('切到不同会话时不重置 hasResolved/pendingQuestions', async () => {
            // 预置 OCR/选题相关字段（这些不应被切会话重置）
            useConversation.setState({
                currentConversationId: 'conv-c',
                hasResolved: true,
                pendingQuestions: [{
                    index: 0,
                    topic: '数',
                    latexFull: 'x=1',
                    givenConditions: [],
                    implicitConditions: [],
                    goal: '求x',
                    milestones: [],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [],
                }],
            });
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);

            await useConversation.getState().setCurrentConversationId('conv-d');

            // 这些字段不应被 setCurrentConversationId 主动清零；
            // 历史会话真实阶段恢复是另一个 feature，暂不在范围。
            const state = useConversation.getState();
            expect(state.hasResolved).toBe(true);
            expect(state.pendingQuestions).toHaveLength(1);
        });
    });

    // --------------------------------------------------
    // setTempConversationId
    // --------------------------------------------------
    describe('setTempConversationId', () => {
        it('当 currentConversationId 为空时生成新 UUID', () => {
            const tempId = useConversation.getState().setTempConversationId();
            expect(tempId).toBeTruthy();
            expect(typeof tempId).toBe('string');
            // Should be a UUID v4 format
            expect(tempId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        });

        it('当 currentConversationId 为空时生成的 ID 存入 tempConversationId', () => {
            const tempId = useConversation.getState().setTempConversationId();
            expect(useConversation.getState().tempConversationId).toBe(tempId);
        });

        it('当 currentConversationId 有值时使用当前 ID', () => {
            useConversation.setState({ currentConversationId: 'conv-existing-123' });
            const tempId = useConversation.getState().setTempConversationId();
            expect(tempId).toBe('conv-existing-123');
            expect(useConversation.getState().tempConversationId).toBe('conv-existing-123');
        });

        it('当 currentConversationId 只有空格时视为空，生成新 ID', () => {
            useConversation.setState({ currentConversationId: '   ' });
            const tempId = useConversation.getState().setTempConversationId();
            // Should be a new UUID, not whitespace
            expect(tempId.trim()).toBeTruthy();
            expect(tempId).not.toBe('   ');
        });
    });

    // --------------------------------------------------
    // sendMessage — new conversation (no currentConversationId)
    // --------------------------------------------------
    describe('sendMessage — 新会话', () => {
        it('新会话时使用 tempConversationId 作为 conversationId', async () => {
            useConversation.setState({ tempConversationId: 'temp-123', currentConversationId: '' });
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const msg = makeUserMsg('msg-new', '');
            await useConversation.getState().sendMessage(msg);

            expect(useConversation.getState().currentConversationId).toBe('temp-123');
        });

        it('新会话时 message.conversationId 被更新为当前 ID', async () => {
            useConversation.setState({ tempConversationId: 'temp-456', currentConversationId: '' });
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const msg = makeUserMsg('msg-x', '');
            await useConversation.getState().sendMessage(msg);

            expect(msg.conversationId).toBe('temp-456');
        });

        it('新会话时不立即调用 insertChatMessageRequest（FK 保护）', async () => {
            useConversation.setState({ tempConversationId: 'temp-789', currentConversationId: '' });
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const msg = makeUserMsg('msg-y', '');
            await useConversation.getState().sendMessage(msg);

            // insertChatMessageRequest should NOT have been called for the user message itself
            // (it's only called for the assistant message after streaming, or via handleCustomChunk)
            // The assistant message insert happens for the last msg if different id
            // Since streamIterator yielded nothing, no assistant message was added
            // So insert was called for the last message (still the user message) only if id differs
            // Actually since no assistant message was emitted, lastMsg === msg, so insert is NOT called
            expect(mockInsertChatMessageRequest).not.toHaveBeenCalledWith(msg);
        });

        it('新会话且 tempConversationId 为空时生成新 UUID', async () => {
            useConversation.setState({ tempConversationId: '', currentConversationId: '' });
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const msg = makeUserMsg('msg-z', '');
            await useConversation.getState().sendMessage(msg);

            const convId = useConversation.getState().currentConversationId;
            expect(convId).toBeTruthy();
            expect(convId).toMatch(/^[0-9a-f]{8}-/i);
        });

        it('发送消息时设置 isStreaming=true，完成后回到 false', async () => {
            useConversation.setState({ tempConversationId: 'temp-a', currentConversationId: '' });
            let streamingDuringCall = false;
            mockGetRawResponse.mockImplementation(async () => {
                streamingDuringCall = useConversation.getState().isStreaming;
                return makeOkResponse();
            });
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg());

            expect(streamingDuringCall).toBe(true);
            expect(useConversation.getState().isStreaming).toBe(false);
        });

        it('发送时将消息追加到 chatMessages', async () => {
            useConversation.setState({ tempConversationId: 'temp-b', currentConversationId: '' });
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const initialCount = useConversation.getState().chatMessages.length;
            const msg = makeUserMsg('msg-append');
            await useConversation.getState().sendMessage(msg);

            expect(useConversation.getState().chatMessages.length).toBeGreaterThan(initialCount);
        });
    });

    // --------------------------------------------------
    // sendMessage — existing conversation in sidebar
    // --------------------------------------------------
    describe('sendMessage — 已有会话（在侧边栏中）', () => {
        it('会话已在侧边栏时立即 insertChatMessageRequest', async () => {
            const conv = new ChatConversationProps('conv-sidebar', '数学题');
            useConversation.setState({
                currentConversationId: 'conv-sidebar',
                chatConversation: [conv],
            });
            mockInsertChatMessageRequest.mockResolvedValue(true);
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));

            const msg = makeUserMsg('msg-existing', 'conv-sidebar');
            await useConversation.getState().sendMessage(msg);

            // Should have been called for the user message immediately
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(msg);
        });
    });

    // --------------------------------------------------
    // sendMessage — temp conversation NOT in sidebar
    // --------------------------------------------------
    describe('sendMessage — 临时会话（未在侧边栏）', () => {
        it('tempConversationId 不在侧边栏时不立即 insert 用户消息', async () => {
            useConversation.setState({
                currentConversationId: 'conv-not-in-sidebar',
                chatConversation: [], // empty sidebar
            });
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const msg = makeUserMsg('msg-fk', 'conv-not-in-sidebar');
            await useConversation.getState().sendMessage(msg);

            // User message should NOT be inserted immediately (FK protection)
            expect(mockInsertChatMessageRequest).not.toHaveBeenCalledWith(msg);
        });
    });

    // --------------------------------------------------
    // sendMessage — failure / rollback
    // --------------------------------------------------
    describe('sendMessage — 失败回滚', () => {
        it('API 请求失败时从 chatMessages 撤销该消息', async () => {
            useConversation.setState({ currentConversationId: 'conv-fail', chatConversation: [] });
            mockGetRawResponse.mockRejectedValueOnce(new Error('Network error'));

            const msg = makeUserMsg('msg-fail', 'conv-fail');
            await useConversation.getState().sendMessage(msg);

            const msgs = useConversation.getState().chatMessages;
            expect(msgs.find(m => m.id === 'msg-fail')).toBeUndefined();
        });

        it('API 请求失败时设置 draftMessage', async () => {
            useConversation.setState({ currentConversationId: 'conv-fail2', chatConversation: [] });
            mockGetRawResponse.mockRejectedValueOnce(new Error('Timeout'));

            const msg = makeUserMsg('msg-fail2', 'conv-fail2');
            msg.message = '这道题怎么解';
            await useConversation.getState().sendMessage(msg);

            expect(useConversation.getState().draftMessage).toEqual({
                text: '这道题怎么解',
                imgUrl: undefined,
            });
        });

        it('API 请求失败时设置 sendError', async () => {
            useConversation.setState({ currentConversationId: 'conv-fail3', chatConversation: [] });
            mockGetRawResponse.mockRejectedValueOnce(new Error('Error'));

            await useConversation.getState().sendMessage(makeUserMsg('msg-fail3', 'conv-fail3'));

            expect(useConversation.getState().sendError).toBe('发送失败，请检查网络后重试');
        });

        it('失败后 isStreaming 仍重置为 false', async () => {
            useConversation.setState({ currentConversationId: 'conv-fail4', chatConversation: [] });
            mockGetRawResponse.mockRejectedValueOnce(new Error('Oops'));

            await useConversation.getState().sendMessage(makeUserMsg('msg-fail4', 'conv-fail4'));

            expect(useConversation.getState().isStreaming).toBe(false);
        });

        it('失败时如果消息有 imgUrl，draftMessage 包含 imgUrl', async () => {
            useConversation.setState({ currentConversationId: 'conv-fail5', chatConversation: [] });
            mockGetRawResponse.mockRejectedValueOnce(new Error('Error'));

            const msg = new ChatMessageProps('msg-img', 'conv-fail5', ChatMessageRole.USER, '图片题', ChatMessageType.IMAGE, 'https://example.com/img.jpg');
            await useConversation.getState().sendMessage(msg);

            expect(useConversation.getState().draftMessage?.imgUrl).toBe('https://example.com/img.jpg');
        });

        it('response.ok===false（服务端 500）时乐观消息被撤销', async () => {
            // 模拟服务端返回 500：fetch 不 reject，但 response.ok=false
            useConversation.setState({ currentConversationId: 'conv-500', chatConversation: [] });
            mockGetRawResponse.mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response);

            const msg = makeUserMsg('msg-500', 'conv-500');
            await useConversation.getState().sendMessage(msg);

            // 乐观渲染的消息应被撤销
            const msgs = useConversation.getState().chatMessages;
            expect(msgs.find(m => m.id === 'msg-500')).toBeUndefined();
        });

        it('response.ok===false 时设置 sendError', async () => {
            useConversation.setState({ currentConversationId: 'conv-500b', chatConversation: [] });
            mockGetRawResponse.mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response);

            await useConversation.getState().sendMessage(makeUserMsg('msg-500b', 'conv-500b'));

            expect(useConversation.getState().sendError).toBe('发送失败，请检查网络后重试');
        });

        it('response.ok===false 时 isStreaming 仍重置为 false', async () => {
            useConversation.setState({ currentConversationId: 'conv-500c', chatConversation: [] });
            mockGetRawResponse.mockResolvedValueOnce({ ok: false, status: 503 } as unknown as Response);

            await useConversation.getState().sendMessage(makeUserMsg('msg-500c', 'conv-500c'));

            expect(useConversation.getState().isStreaming).toBe(false);
        });
    });

    // --------------------------------------------------
    // upsetChatMessage (tested via sendMessage + processStream)
    // --------------------------------------------------
    describe('upsetChatMessage — 消息追加行为', () => {
        it('相同 id 的 chunk 追加到已有消息的 delta', async () => {
            useConversation.setState({ currentConversationId: 'conv-up', chatConversation: [] });

            const chunks: ChunkMessage[] = [
                { id: 'ai-msg-1', type: 'text', delta: 'Hello' },
                { id: 'ai-msg-1', type: 'text', delta: ' World' },
            ];
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(chunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('usr-1', 'conv-up'));

            const msgs = useConversation.getState().chatMessages;
            const aiMsg = msgs.find(m => m.id === 'ai-msg-1');
            expect(aiMsg).toBeDefined();
            expect(aiMsg!.message).toBe('Hello World');
        });

        it('不同 id 的 chunk 创建新消息', async () => {
            useConversation.setState({ currentConversationId: 'conv-up2', chatConversation: [] });

            const chunks: ChunkMessage[] = [
                { id: 'ai-msg-A', type: 'text', delta: 'First' },
                { id: 'ai-msg-B', type: 'text', delta: 'Second' },
            ];
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(chunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('usr-2', 'conv-up2'));

            const msgs = useConversation.getState().chatMessages;
            expect(msgs.find(m => m.id === 'ai-msg-A')).toBeDefined();
            expect(msgs.find(m => m.id === 'ai-msg-B')).toBeDefined();
        });

        it('空 delta 的 chunk 被 processStream 跳过', async () => {
            useConversation.setState({ currentConversationId: 'conv-up3', chatConversation: [] });

            const chunks: ChunkMessage[] = [
                { id: 'ai-skip', type: 'text', delta: '   ' }, // whitespace only → skipped
                { id: 'ai-real', type: 'text', delta: 'Real content' },
            ];
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(chunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('usr-3', 'conv-up3'));

            const msgs = useConversation.getState().chatMessages;
            expect(msgs.find(m => m.id === 'ai-skip')).toBeUndefined();
            expect(msgs.find(m => m.id === 'ai-real')).toBeDefined();
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — 旧版 conversation_created (无 kind 字段)
    // 新行为：store 已删除 legacy 无-kind 分支，无 kind 的 data-custom chunk 走 default: break 静默忽略
    // --------------------------------------------------
    describe('handleCustomChunk — 旧版 conversation_created (无 kind 字段)', () => {
        it('无 kind 的 data-custom chunk 不会插入侧边栏（legacy 分支已删除，静默忽略）', async () => {
            const convId = 'conv-legacy';
            useConversation.setState({
                currentConversationId: convId,
                chatConversation: [],
            });

            const legacyChunk: ChunkMessage = {
                id: 'c1',
                type: 'data-custom',
                delta: '',
                data: { conversationId: convId, title: '数学题目' }, // no 'kind' — legacy format, now ignored
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([legacyChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-trigger', convId));

            // 无 kind → switch(undefined) falls through to default: break → 侧边栏不更新
            const convs = useConversation.getState().chatConversation;
            expect(convs).toHaveLength(0);
        });

        it('legacyConvId 与 currentConversationId 不匹配时不插入侧边栏', async () => {
            useConversation.setState({
                currentConversationId: 'conv-current',
                chatConversation: [],
            });

            const customChunk: ChunkMessage = {
                id: 'c2',
                type: 'data-custom',
                delta: '',
                data: { conversationId: 'conv-other', title: '别的题' }, // mismatch, no kind
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([customChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-mismatch', 'conv-current'));

            expect(useConversation.getState().chatConversation).toHaveLength(0);
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — phase_changed
    // --------------------------------------------------
    describe('handleCustomChunk — phase_changed', () => {
        it('收到 phase_changed chunk 时更新 currentPhase', async () => {
            useConversation.setState({ currentConversationId: 'conv-phase', chatConversation: [] });

            const phaseChunk: ChunkMessage = {
                id: 'c3',
                type: 'data-custom',
                delta: '',
                data: { kind: 'phase_changed', phase: 2 },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([phaseChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-phase', 'conv-phase'));

            expect(useConversation.getState().currentPhase).toBe(2);
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — questions_detected (multi)
    // --------------------------------------------------
    describe('handleCustomChunk — questions_detected', () => {
        it('多题时设置 pendingQuestions 和 isMultiQuestion=true', async () => {
            useConversation.setState({ currentConversationId: 'conv-q', chatConversation: [] });

            const mockQuestions = [
                { index: 0, topic: '数学', latexFull: 'x^2=4', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] },
                { index: 1, topic: '几何', latexFull: 'S=πr²', givenConditions: [], implicitConditions: [], goal: '求S', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求S', givenConditions: [], milestones: [] }] },
            ];
            const qChunk: ChunkMessage = {
                id: 'c4',
                type: 'data-custom',
                delta: '',
                data: { kind: 'questions_detected', questions: mockQuestions, isMulti: true },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([qChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-q', 'conv-q'));

            expect(useConversation.getState().pendingQuestions).toHaveLength(2);
            expect(useConversation.getState().isMultiQuestion).toBe(true);
        });

        it('单题时设置 pendingQuestions 和 isMultiQuestion=false，不自动确认、不调用 /resolve', async () => {
            // 产品变更：单题不再自动确认，弹卡等用户手动点「确认」
            useConversation.setState({ currentConversationId: 'conv-sq', chatConversation: [] });

            mockInsertChatMessageRequest.mockResolvedValue(true);

            const singleQ = [
                { index: 0, topic: '数学', latexFull: 'x+1=2', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] },
            ];
            const qChunk: ChunkMessage = {
                id: 'c5',
                type: 'data-custom',
                delta: '',
                data: { kind: 'questions_detected', questions: singleQ, isMulti: false },
            };

            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([qChunk]));

            await useConversation.getState().sendMessage(makeUserMsg('msg-sq', 'conv-sq'));

            // pendingQuestions 应被设置，isMultiQuestion=false
            expect(useConversation.getState().pendingQuestions).toHaveLength(1);
            expect(useConversation.getState().isMultiQuestion).toBe(false);
            // 不自动触发 /resolve：hasResolved 仍为 false
            expect(useConversation.getState().hasResolved).toBe(false);
            // 未调用 fetch（confirmSelectedQuestion 未被触发）
            expect(mockFetch).not.toHaveBeenCalled();
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — conversation_created (with kind)
    // --------------------------------------------------
    describe('handleCustomChunk — conversation_created (有 kind 字段)', () => {
        it('kind=conversation_created 且 ID 匹配时插入侧边栏', async () => {
            const convId = 'conv-new-kind';
            const userMsg = makeUserMsg('u-nk', convId);
            useConversation.setState({
                currentConversationId: convId,
                chatConversation: [],
                chatMessages: [
                    new ChatMessageProps(DEFAULT_MSG_ID, 'conv-1', ChatMessageRole.ASSISTANT, 'hi', ChatMessageType.TEXT),
                    userMsg,
                ],
            });

            const ccChunk: ChunkMessage = {
                id: 'cc1',
                type: 'data-custom',
                delta: '',
                data: { kind: 'conversation_created', conversationId: convId, title: '新对话' },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([ccChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-cc', convId));

            const convs = useConversation.getState().chatConversation;
            expect(convs[0]?.id).toBe(convId);
            expect(convs[0]?.title).toBe('新对话');
        });

        it('kind=conversation_created 且 ID 不匹配时不插入侧边栏', async () => {
            useConversation.setState({
                currentConversationId: 'conv-mine',
                chatConversation: [],
            });

            const ccChunk: ChunkMessage = {
                id: 'cc2',
                type: 'data-custom',
                delta: '',
                data: { kind: 'conversation_created', conversationId: 'conv-other', title: '别人的' },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([ccChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-cc2', 'conv-mine'));

            expect(useConversation.getState().chatConversation).toHaveLength(0);
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — knowledge_card
    // P-105：知识卡消息化，type=4 落 chatMessages 而不是 set({knowledgeCard})
    // --------------------------------------------------
    describe('handleCustomChunk — knowledge_card', () => {
        it('收到 knowledge_card chunk 时追加一条 type=KNOWLEDGE_CARD 的 assistant 消息', async () => {
            useConversation.setState({ currentConversationId: 'conv-kc', chatConversation: [] });

            const card = {
                schemaVersion: 1 as const,
                type: 'knowledge_card' as const,
                knowledgePoints: [{ name: '一元二次方程' }],
                methods: [{ name: '因式分解', category: 1 as const }],
                insight: '通过因式分解可以快速找到方程的根',
            };
            const kcChunk: ChunkMessage = {
                id: 'kc1',
                type: 'data-custom',
                delta: '',
                data: { kind: 'knowledge_card', card },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([kcChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-kc', 'conv-kc'));

            // 知识卡以 type=4 追加进 chatMessages，而不是写入已删除的 knowledgeCard 字段
            const msgs = useConversation.getState().chatMessages;
            const kcMsg = msgs.find(m => m.type === ChatMessageType.KNOWLEDGE_CARD);
            expect(kcMsg).toBeDefined();
            expect(kcMsg!.role).toBe(ChatMessageRole.ASSISTANT);
            // message 内容是 JSON.stringify({ card: ... })，可解析出原始 card 对象
            const parsed = JSON.parse(kcMsg!.message) as { card: typeof card };
            expect(parsed.card.insight).toBe('通过因式分解可以快速找到方程的根');
            expect(parsed.card.knowledgePoints[0].name).toBe('一元二次方程');
        });

        it('knowledge_card chunk 到来时复位 isWaitingFirstChunk=false', async () => {
            useConversation.setState({
                currentConversationId: 'conv-kc2',
                chatConversation: [],
                isWaitingFirstChunk: true,
            });

            const card = {
                schemaVersion: 1 as const,
                type: 'knowledge_card' as const,
                knowledgePoints: [],
                methods: [],
                insight: '测试',
            };
            const kcChunk: ChunkMessage = {
                id: 'kc2',
                type: 'data-custom',
                delta: '',
                data: { kind: 'knowledge_card', card },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([kcChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-kc2', 'conv-kc2'));

            // isWaitingFirstChunk 应在 handleCustomChunk 内被复位（不等待普通 text delta）
            expect(useConversation.getState().isWaitingFirstChunk).toBe(false);
        });

        it('knowledge_card 消息在流结束后通过批量落库被 insert', async () => {
            useConversation.setState({ currentConversationId: 'conv-kc3', chatConversation: [] });

            const card = {
                schemaVersion: 1 as const,
                type: 'knowledge_card' as const,
                knowledgePoints: [{ name: '积分' }],
                methods: [{ name: '换元法', category: 1 as const }],
                insight: '换元法简化计算',
            };
            const kcChunk: ChunkMessage = {
                id: 'kc3',
                type: 'data-custom',
                delta: '',
                data: { kind: 'knowledge_card', card },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([kcChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-kc3', 'conv-kc3'));

            // 批量落库：知识卡消息（type=4）应被 insertChatMessageRequest 落库
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ type: ChatMessageType.KNOWLEDGE_CARD })
            );
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — sub_problem_changed
    // --------------------------------------------------
    describe('handleCustomChunk — sub_problem_changed', () => {
        it('更新 currentSubProblemIndex 和 totalSubProblems', async () => {
            useConversation.setState({ currentConversationId: 'conv-sub', chatConversation: [] });

            const subChunk: ChunkMessage = {
                id: 'sub1',
                type: 'data-custom',
                delta: '',
                data: { kind: 'sub_problem_changed', currentIndex: 1, totalCount: 3 },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([subChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-sub', 'conv-sub'));

            expect(useConversation.getState().currentSubProblemIndex).toBe(1);
            expect(useConversation.getState().totalSubProblems).toBe(3);
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — assistant_message（新增）
    // phase 节点抑制 token 流，通过 assistant_message chunk 整段下发
    // --------------------------------------------------
    describe('handleCustomChunk — assistant_message', () => {
        it('收到 assistant_message chunk 时新增 ASSISTANT 消息气泡', async () => {
            useConversation.setState({ currentConversationId: 'conv-am', chatConversation: [], isWaitingFirstChunk: true });

            const amChunk: ChunkMessage = {
                id: 'am1',
                type: 'data-custom',
                delta: '',
                data: { kind: 'assistant_message', text: '好的，让我分析一下这道题...' },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([amChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-am', 'conv-am'));

            const msgs = useConversation.getState().chatMessages;
            // 最后一条消息应是包含 assistant_message 文字的 ASSISTANT 气泡
            const lastMsg = msgs[msgs.length - 1];
            expect(lastMsg.role).toBe(ChatMessageRole.ASSISTANT);
            expect(lastMsg.message).toBe('好的，让我分析一下这道题...');
        });

        it('assistant_message chunk 到来时复位 isWaitingFirstChunk=false', async () => {
            useConversation.setState({
                currentConversationId: 'conv-am2',
                chatConversation: [],
                isWaitingFirstChunk: true,
            });

            const amChunk: ChunkMessage = {
                id: 'am2',
                type: 'data-custom',
                delta: '',
                data: { kind: 'assistant_message', text: '分析结果如下' },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([amChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-am2', 'conv-am2'));

            // isWaitingFirstChunk 应在 handleCustomChunk 内部被复位（不等待普通 text delta）
            expect(useConversation.getState().isWaitingFirstChunk).toBe(false);
        });
    });

    // --------------------------------------------------
    // processStream — error chunk（新增）
    // toUIMessageStream 抛错时 emit { type:'error', errorText }
    // --------------------------------------------------
    describe('processStream — error chunk', () => {
        it('收到 error chunk 时设置 sendError 并终止流', async () => {
            useConversation.setState({ currentConversationId: 'conv-err', chatConversation: [] });

            const errorChunk: ChunkMessage = {
                id: '',
                type: 'error',
                delta: '',
                errorText: '模型调用超时，请重试',
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([errorChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-err', 'conv-err'));

            expect(useConversation.getState().sendError).toBe('模型调用超时，请重试');
        });

        it('error chunk 无 errorText 时使用默认错误消息', async () => {
            useConversation.setState({ currentConversationId: 'conv-err2', chatConversation: [] });

            // errorText 为 undefined → 应使用默认文案
            const errorChunk: ChunkMessage = {
                id: '',
                type: 'error',
                delta: '',
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([errorChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-err2', 'conv-err2'));

            expect(useConversation.getState().sendError).toBe('生成失败，请重试');
        });

        it('error chunk 后 isWaitingFirstChunk 被复位为 false', async () => {
            useConversation.setState({
                currentConversationId: 'conv-err3',
                chatConversation: [],
                isWaitingFirstChunk: true,
            });

            const errorChunk: ChunkMessage = { id: '', type: 'error', delta: '', errorText: '出错了' };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([errorChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-err3', 'conv-err3'));

            expect(useConversation.getState().isWaitingFirstChunk).toBe(false);
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — 未知 kind (silent ignore)
    // --------------------------------------------------
    describe('handleCustomChunk — 未知 kind', () => {
        it('未知 kind 静默忽略，不抛出错误', async () => {
            useConversation.setState({ currentConversationId: 'conv-unk', chatConversation: [] });

            const unknownChunk: ChunkMessage = {
                id: 'unk1',
                type: 'data-custom',
                delta: '',
                data: { kind: 'totally_unknown_kind' as never },
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([unknownChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await expect(
                useConversation.getState().sendMessage(makeUserMsg('msg-unk', 'conv-unk'))
            ).resolves.not.toThrow();
        });
    });

    // --------------------------------------------------
    // handleCustomChunk — data is null/undefined
    // --------------------------------------------------
    describe('handleCustomChunk — data 为空', () => {
        it('data 字段为 undefined 时直接返回，不报错', async () => {
            useConversation.setState({ currentConversationId: 'conv-nodata', chatConversation: [] });

            const noDataChunk: ChunkMessage = {
                id: 'nd1',
                type: 'data-custom',
                delta: '',
                // data is undefined
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([noDataChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await expect(
                useConversation.getState().sendMessage(makeUserMsg('msg-nd', 'conv-nodata'))
            ).resolves.not.toThrow();
        });
    });

    // --------------------------------------------------
    // loadAllConversation
    // --------------------------------------------------
    describe('loadAllConversation', () => {
        it('成功时设置 chatConversation 并返回 true', async () => {
            const convs = [
                new ChatConversationProps('c1', '题目一'),
                new ChatConversationProps('c2', '题目二'),
            ];
            mockLoadAllChatConversation.mockResolvedValueOnce(convs);

            const result = await useConversation.getState().loadAllConversation();

            expect(result).toBe(true);
            expect(useConversation.getState().chatConversation).toEqual(convs);
        });

        it('成功但返回空数组时 chatConversation 为 []', async () => {
            mockLoadAllChatConversation.mockResolvedValueOnce([]);

            const result = await useConversation.getState().loadAllConversation();

            expect(result).toBe(true);
            expect(useConversation.getState().chatConversation).toHaveLength(0);
        });

        it('抛出异常时返回 false 并打印错误', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockLoadAllChatConversation.mockRejectedValueOnce(new Error('DB error'));

            const result = await useConversation.getState().loadAllConversation();

            expect(result).toBe(false);
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to load all conversations:',
                expect.any(Error)
            );
            consoleSpy.mockRestore();
        });

        it('loadAllChatConversation 返回 falsy 时不更新状态', async () => {
            // If it returned null/undefined (shouldn't happen but guard)
            mockLoadAllChatConversation.mockResolvedValueOnce(null);
            useConversation.setState({ chatConversation: [] });

            await useConversation.getState().loadAllConversation();
            // Should remain unchanged
            expect(useConversation.getState().chatConversation).toHaveLength(0);
        });
    });

    // --------------------------------------------------
    // confirmSelectedQuestion
    // --------------------------------------------------
    describe('confirmSelectedQuestion', () => {
        it('设置 hasResolved=true 并调用 /resolve 接口', async () => {
            const mockQ = { index: 1, topic: '数学', latexFull: 'x=1', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({ currentConversationId: 'conv-resolve', pendingQuestions: [makeUserMsg(), mockQ] as never });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'Bearer-token' } } });
            // 必须包含 ok:true + body，否则 !response.ok 会触发 throw
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(1);

            expect(useConversation.getState().hasResolved).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/conversation/conv-resolve/resolve',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ selectedQuestionIndex: 1 }),
                })
            );
        });

        it('调用时设置 isStreaming=true，完成后为 false', async () => {
            const mockQ = { index: 0, topic: '数学', latexFull: 'x=1', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({ currentConversationId: 'conv-resolve2', pendingQuestions: [mockQ] });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            expect(useConversation.getState().isStreaming).toBe(false);
        });

        it('处理流式响应并更新消息', async () => {
            const mockQ = { index: 0, topic: '数学', latexFull: 'x=1', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({ currentConversationId: 'conv-resolve3', pendingQuestions: [mockQ] });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });

            const aiChunks: ChunkMessage[] = [
                { id: 'r-msg-1', type: 'text', delta: '好的，让我来分析' },
            ];
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(aiChunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            const msgs = useConversation.getState().chatMessages;
            expect(msgs.find(m => m.id === 'r-msg-1')).toBeDefined();
        });

        it('Authorization header 包含正确的 access_token', async () => {
            const mockQ = { index: 0, topic: '数学', latexFull: 'x=1', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({ currentConversationId: 'conv-auth', pendingQuestions: [mockQ, mockQ, mockQ] });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'my-secret-token' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(2);

            expect(mockFetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer my-secret-token',
                    }),
                })
            );
        });

        it('response.ok=false 时抛出错误并回滚 hasResolved=false + 设置 sendError', async () => {
            const mockQ = { index: 0, topic: '数学', latexFull: 'x=1', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({ currentConversationId: 'conv-badresp', pendingQuestions: [mockQ] });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            // ok=false → 触发 throw
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500, body: {} } as unknown as Response);

            await useConversation.getState().confirmSelectedQuestion(0);

            // 乐观 hasResolved 应被回滚
            expect(useConversation.getState().hasResolved).toBe(false);
            expect(useConversation.getState().sendError).toBe('选题失败，请重试');
            // finally 仍复位流状态
            expect(useConversation.getState().isStreaming).toBe(false);
        });

        it('response.body 为 null 时抛出错误，isStreaming 仍重置', async () => {
            const mockQ = { index: 0, topic: '数学', latexFull: 'x=1', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({ currentConversationId: 'conv-nullbody', pendingQuestions: [mockQ] });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            // ok=true 但 body=null → !response.body 触发 throw
            mockFetch.mockResolvedValueOnce({ ok: true, body: null } as unknown as Response);

            // confirmSelectedQuestion 内部 catch → 不 rethrow，所以不会 reject
            await useConversation.getState().confirmSelectedQuestion(0);

            expect(useConversation.getState().isStreaming).toBe(false);
            // hasResolved 被回滚
            expect(useConversation.getState().hasResolved).toBe(false);
            // sendError 被设置
            expect(useConversation.getState().sendError).toBe('选题失败，请重试');
        });

        it('流结束后批量落库：OCR_CARD（单独落库）和 TEXT assistant 消息（批量落库）各一次', async () => {
            const mockQuestion = { index: 0, topic: '数学', latexFull: 'x+1=2', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({
                currentConversationId: 'conv-guard',
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());

            const aiChunk: ChunkMessage = { id: 'g-msg', type: 'text', delta: 'AI 回复' };
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([aiChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            // 应落库：确认卡（type=3，单独 insert）和妹妹 TEXT 消息（批量落库）
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ type: ChatMessageType.OCR_CARD })
            );
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ role: ChatMessageRole.ASSISTANT, type: ChatMessageType.TEXT })
            );
        });

        it('流结束后无 ASSISTANT 消息时：仅 OCR_CARD 落库（批量落库 slice 为空）', async () => {
            // 初始状态有一条用户消息作为最后一条（流未产出 ASSISTANT 消息）
            const userMsg = makeUserMsg('u-last', 'conv-guard2');
            const mockQuestion = { index: 0, topic: '数学', latexFull: 'x+1=2', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] };
            useConversation.setState({
                currentConversationId: 'conv-guard2',
                chatMessages: [
                    new ChatMessageProps(DEFAULT_MSG_ID, 'conv-1', ChatMessageRole.ASSISTANT, 'hi', ChatMessageType.TEXT),
                    userMsg,
                ],
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            // 空流，不追加任何 AI TEXT 消息
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            // 确认卡应落库（type=3），批量落库 slice 为空（无新 ASSISTANT 消息）
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ type: ChatMessageType.OCR_CARD })
            );
            // insertChatMessageRequest 调用次数恰好 1 次（仅确认卡）
            expect(mockInsertChatMessageRequest).toHaveBeenCalledTimes(1);
        });

        it('确认成功后 chatMessages 中有一条 type=OCR_CARD 消息且 message 可解析出 question', async () => {
            const mockQuestion = { index: 0, topic: '物理', latexFull: 'F=ma', givenConditions: [], implicitConditions: [], goal: '求F', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求F', givenConditions: [], milestones: [] }] };
            useConversation.setState({
                currentConversationId: 'conv-ocr-card',
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            const msgs = useConversation.getState().chatMessages;
            const cardMsg = msgs.find(m => m.type === ChatMessageType.OCR_CARD);
            expect(cardMsg).toBeDefined();
            // message 可解析为含 question 的对象
            const parsed = JSON.parse(cardMsg!.message) as { question: typeof mockQuestion };
            expect(parsed.question.latexFull).toBe('F=ma');
            expect(parsed.question.topic).toBe('物理');
        });

        it('确认成功后 pendingQuestions 被清空', async () => {
            const mockQuestion = { index: 0, topic: '化学', latexFull: 'H2O', givenConditions: [], implicitConditions: [], goal: '求解', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求解', givenConditions: [], milestones: [] }] };
            useConversation.setState({
                currentConversationId: 'conv-clear-q',
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            expect(useConversation.getState().pendingQuestions).toHaveLength(0);
        });

        it('insertChatMessageRequest 被以 type=3(OCR_CARD) 调用', async () => {
            const mockQuestion = { index: 0, topic: '英语', latexFull: 'Hello world', givenConditions: [], implicitConditions: [], goal: '翻译', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '翻译', givenConditions: [], milestones: [] }] };
            useConversation.setState({
                currentConversationId: 'conv-insert-type3',
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ type: 3 })
            );
        });

        // --------------------------------------------------
        // 乐观更新时序：点击「确认」后立即（网络往返期间）
        // chatMessages 已含 OCR_CARD + pendingQuestions 已清空
        // --------------------------------------------------
        it('点击确认后、fetch 尚未 resolve 时，chatMessages 已含 OCR_CARD 且 pendingQuestions 已清空', async () => {
            const mockQuestion = {
                index: 0, topic: '数学', latexFull: 'x^2=4',
                givenConditions: [], implicitConditions: [], goal: '求x',
                milestones: [], visualFeaturesNeeded: false, visualDescription: '',
                subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }],
            };
            useConversation.setState({
                currentConversationId: 'conv-optimistic',
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });

            // 用手动控制的 Promise 让 fetch 挂起，模拟"网络往返中"
            let resolveFetch!: (v: Response) => void;
            const pendingFetch = new Promise<Response>((res) => { resolveFetch = res; });
            mockFetch.mockReturnValueOnce(pendingFetch);

            // 不 await，让 confirmSelectedQuestion 运行到 fetch 阻塞处
            const confirmPromise = useConversation.getState().confirmSelectedQuestion(0);

            // 微任务切换：让同步乐观 set 执行完
            await Promise.resolve();

            // 此时 fetch 尚未返回——断言乐观更新已生效
            const stateBeforeFetch = useConversation.getState();
            expect(stateBeforeFetch.pendingQuestions).toHaveLength(0);
            const ocrCard = stateBeforeFetch.chatMessages.find(m => m.type === ChatMessageType.OCR_CARD);
            expect(ocrCard).toBeDefined();
            expect(ocrCard!.message).toContain('x^2=4');

            // 放行 fetch，让后续逻辑完成
            resolveFetch(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);
            await confirmPromise;
        });

        // --------------------------------------------------
        // fetch 失败回滚：OCR_CARD 移除 + hasResolved 回滚 + pendingQuestions 恢复
        // --------------------------------------------------
        it('fetch 失败时 OCR_CARD 从 chatMessages 移除、hasResolved 回滚为 false、pendingQuestions 恢复原值', async () => {
            const mockQuestion = {
                index: 0, topic: '物理', latexFull: 'F=ma',
                givenConditions: [], implicitConditions: [], goal: '求F',
                milestones: [], visualFeaturesNeeded: false, visualDescription: '',
                subProblems: [{ index: 0, goal: '求F', givenConditions: [], milestones: [] }],
            };
            useConversation.setState({
                currentConversationId: 'conv-rollback',
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            // fetch 返回 500，触发 catch
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500, body: {} } as unknown as Response);

            await useConversation.getState().confirmSelectedQuestion(0);

            const state = useConversation.getState();
            // hasResolved 被回滚
            expect(state.hasResolved).toBe(false);
            // OCR_CARD 已从 chatMessages 移除
            expect(state.chatMessages.find(m => m.type === ChatMessageType.OCR_CARD)).toBeUndefined();
            // pendingQuestions 恢复原值（单题）
            expect(state.pendingQuestions).toHaveLength(1);
            expect(state.pendingQuestions[0].latexFull).toBe('F=ma');
            // sendError 已设置
            expect(state.sendError).toBe('选题失败，请重试');
        });

        // --------------------------------------------------
        // 会话标题更新：确认后侧边栏 title 变为 topic
        // --------------------------------------------------
        it('确认成功后侧边栏对应会话 title 更新为 confirmedQuestion.topic', async () => {
            const mockQuestion = {
                index: 0, topic: '一元二次方程求根', latexFull: 'x^2-3x+2=0',
                givenConditions: [], implicitConditions: [], goal: '求x',
                milestones: [], visualFeaturesNeeded: false, visualDescription: '',
                subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }],
            };
            // 侧边栏中已有该会话，标题为初始第一句话
            useConversation.setState({
                currentConversationId: 'conv-title-update',
                chatConversation: [
                    new ChatConversationProps('conv-title-update', '这道题怎么做'),
                    new ChatConversationProps('conv-other', '另一道题'),
                ],
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            const convs = useConversation.getState().chatConversation;
            const updated = convs.find(c => c.id === 'conv-title-update');
            expect(updated?.title).toBe('一元二次方程求根');
            // 其他会话不受影响
            const other = convs.find(c => c.id === 'conv-other');
            expect(other?.title).toBe('另一道题');
        });

        it('确认后 chatConversation 中找不到对应会话时不插入新项（静默忽略）', async () => {
            const mockQuestion = {
                index: 0, topic: '等差数列', latexFull: 'a_n=a_1+(n-1)d',
                givenConditions: [], implicitConditions: [], goal: '求a_n',
                milestones: [], visualFeaturesNeeded: false, visualDescription: '',
                subProblems: [{ index: 0, goal: '求a_n', givenConditions: [], milestones: [] }],
            };
            // 侧边栏为空（新会话尚未插入）
            useConversation.setState({
                currentConversationId: 'conv-not-in-sidebar',
                chatConversation: [],
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce(makeOkResolveResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            // 不插入新项
            expect(useConversation.getState().chatConversation).toHaveLength(0);
        });

        it('fetch 失败时侧边栏 title 回滚为原值', async () => {
            const mockQuestion = {
                index: 0, topic: '新题目标题', latexFull: 'y=kx+b',
                givenConditions: [], implicitConditions: [], goal: '求k',
                milestones: [], visualFeaturesNeeded: false, visualDescription: '',
                subProblems: [{ index: 0, goal: '求k', givenConditions: [], milestones: [] }],
            };
            const originalTitle = '这道题怎么解';
            useConversation.setState({
                currentConversationId: 'conv-title-rollback',
                chatConversation: [
                    new ChatConversationProps('conv-title-rollback', originalTitle),
                ],
                pendingQuestions: [mockQuestion],
            });
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            // fetch 失败，触发 catch
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500, body: {} } as unknown as Response);

            await useConversation.getState().confirmSelectedQuestion(0);

            const convs = useConversation.getState().chatConversation;
            const rollbacked = convs.find(c => c.id === 'conv-title-rollback');
            // 标题应回滚为原值
            expect(rollbacked?.title).toBe(originalTitle);
        });
    });

    // --------------------------------------------------
    // resetForNewConversation
    // --------------------------------------------------
    describe('resetForNewConversation', () => {
        it('重置所有 Polya 状态到初始值', () => {
            useConversation.setState({
                currentPhase: 3,
                currentSubProblemIndex: 2,
                totalSubProblems: 4,
                pendingQuestions: [{ index: 0, topic: '数', latexFull: 'x=1', givenConditions: [], implicitConditions: [], goal: '求x', milestones: [], visualFeaturesNeeded: false, visualDescription: '', subProblems: [{ index: 0, goal: '求x', givenConditions: [], milestones: [] }] }],
                isMultiQuestion: true,
                currentInsightPoints: ['洞察1', '洞察2'],
                hasResolved: true,
            });

            useConversation.getState().resetForNewConversation();

            const state = useConversation.getState();
            expect(state.currentPhase).toBe(0);
            expect(state.currentSubProblemIndex).toBe(0);
            expect(state.totalSubProblems).toBe(0);
            expect(state.pendingQuestions).toHaveLength(0);
            expect(state.isMultiQuestion).toBe(false);
            expect(state.currentInsightPoints).toHaveLength(0);
            expect(state.hasResolved).toBe(false);
        });
    });

    // --------------------------------------------------
    // setCurrentConversationId("") — Pólya 进度重置（新会话串台修复）
    // --------------------------------------------------
    describe('setCurrentConversationId("") — Pólya 进度重置', () => {
        it('传入空字符串时全套 Pólya 状态均重置为初始值，chatMessages 只剩欢迎消息', async () => {
            // 先把 store 置为非默认状态，模拟上一个会话已经进入「回顾」阶段
            useConversation.setState({
                currentPhase: 3,
                totalSubProblems: 2,
                currentSubProblemIndex: 1,
                currentInsightPoints: ['洞察A', '洞察B'],
                hasResolved: true,
                pendingQuestions: [{
                    index: 0,
                    topic: '数',
                    latexFull: 'x=1',
                    givenConditions: [],
                    implicitConditions: [],
                    goal: '求x',
                    milestones: [],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [],
                }],
                chatMessages: [
                    new ChatMessageProps(DEFAULT_MSG_ID, 'conv-1', ChatMessageRole.ASSISTANT, '你好', ChatMessageType.TEXT),
                    makeUserMsg('u-prev', 'conv-prev'),
                ],
            });

            await useConversation.getState().setCurrentConversationId('');

            const state = useConversation.getState();
            // chatMessages 只剩欢迎消息
            expect(state.chatMessages).toHaveLength(1);
            expect(state.chatMessages[0].id).toBe(DEFAULT_MSG_ID);
            // Pólya 全套状态重置为初始值
            expect(state.currentPhase).toBe(0);
            expect(state.totalSubProblems).toBe(0);
            expect(state.currentSubProblemIndex).toBe(0);
            expect(state.currentInsightPoints).toHaveLength(0);
            expect(state.hasResolved).toBe(false);
            expect(state.pendingQuestions).toHaveLength(0);
            expect(state.isMultiQuestion).toBe(false);
        });
    });

    // --------------------------------------------------
    // clearSendError
    // --------------------------------------------------
    describe('clearSendError', () => {
        it('清除 sendError', () => {
            useConversation.setState({ sendError: '发送失败，请检查网络后重试' });
            useConversation.getState().clearSendError();
            expect(useConversation.getState().sendError).toBeNull();
        });

        it('sendError 已为 null 时调用不报错', () => {
            useConversation.setState({ sendError: null });
            expect(() => useConversation.getState().clearSendError()).not.toThrow();
            expect(useConversation.getState().sendError).toBeNull();
        });
    });

    // --------------------------------------------------
    // 流结束后批量落库 assistant 消息（sendMessage 路径）
    // --------------------------------------------------
    describe('流结束后批量落库 assistant 消息', () => {
        it('流中一条 TEXT assistant 消息：insert 被调用一次', async () => {
            useConversation.setState({ currentConversationId: 'conv-persist', chatConversation: [] });

            const aiChunks: ChunkMessage[] = [
                { id: 'ai-final', type: 'text', delta: '分析结果' },
            ];
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(aiChunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const userMsg = makeUserMsg('u-persist', 'conv-persist');
            await useConversation.getState().sendMessage(userMsg);

            // 流中产生的 assistant TEXT 消息应被落库
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'ai-final', role: ChatMessageRole.ASSISTANT })
            );
        });

        it('流结束时若没有 AI 消息生成，不调用 insertChatMessageRequest', async () => {
            useConversation.setState({ currentConversationId: 'conv-nopersist', chatConversation: [] });

            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const userMsg = makeUserMsg('u-nopersist', 'conv-nopersist');
            await useConversation.getState().sendMessage(userMsg);

            // 没有新 assistant 消息 → 不调用 insert
            expect(mockInsertChatMessageRequest).not.toHaveBeenCalled();
        });

        it('一轮流中两条 assistant_message + 一条 knowledge_card：三条均被落库', async () => {
            // 模拟 ExecuteNode 收尾 + ReviewNode 总结 + 知识卡三者同在一轮流的场景
            useConversation.setState({ currentConversationId: 'conv-multi-persist', chatConversation: [] });

            const card = {
                schemaVersion: 1 as const,
                type: 'knowledge_card' as const,
                knowledgePoints: [{ name: '定积分' }],
                methods: [{ name: '换元法', category: 1 as const }],
                insight: '换元化简积分',
            };
            const chunks: ChunkMessage[] = [
                // ExecuteNode 收尾（assistant_message chunk，整段下发）
                { id: 'am-exec', type: 'data-custom', delta: '', data: { kind: 'assistant_message', text: '本小问分析完毕' } },
                // ReviewNode 总结（assistant_message chunk，整段下发）
                { id: 'am-review', type: 'data-custom', delta: '', data: { kind: 'assistant_message', text: '整体思路总结如下' } },
                // 知识卡（knowledge_card chunk，消息化）
                { id: 'kc-multi', type: 'data-custom', delta: '', data: { kind: 'knowledge_card', card } },
            ];
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(chunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const userMsg = makeUserMsg('u-multi', 'conv-multi-persist');
            await useConversation.getState().sendMessage(userMsg);

            // 三条消息（2 TEXT + 1 KNOWLEDGE_CARD）均应被落库
            expect(mockInsertChatMessageRequest).toHaveBeenCalledTimes(3);
            // 第一条 assistant_message
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ message: '本小问分析完毕', type: ChatMessageType.TEXT })
            );
            // 第二条 assistant_message
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ message: '整体思路总结如下', type: ChatMessageType.TEXT })
            );
            // 知识卡（type=4）
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ type: ChatMessageType.KNOWLEDGE_CARD })
            );
        });
    });

    // --------------------------------------------------
    // isWaitingFirstChunk behavior
    // --------------------------------------------------
    describe('isWaitingFirstChunk', () => {
        it('第一个有效 chunk 到来时设置 isWaitingFirstChunk=false', async () => {
            useConversation.setState({ currentConversationId: 'conv-wait', chatConversation: [] });

            let wasWaiting = false;
            const chunks: ChunkMessage[] = [
                { id: 'wait-msg', type: 'text', delta: 'First chunk' },
            ];

            // Capture state when streamIterator is called
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockImplementationOnce(async function* () {
                for (const c of chunks) {
                    // Before yielding first chunk, isWaitingFirstChunk should be true
                    wasWaiting = useConversation.getState().isWaitingFirstChunk;
                    yield c;
                }
            });
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('u-wait', 'conv-wait'));

            expect(wasWaiting).toBe(true);
            expect(useConversation.getState().isWaitingFirstChunk).toBe(false);
        });
    });

    // --------------------------------------------------
    // setCurrentConversationId — state hydration
    // --------------------------------------------------
    describe('setCurrentConversationId — state hydration', () => {
        it('切会话后 hydration 字段生效（currentPhase/currentSubProblemIndex 等被服务端值覆盖）', async () => {
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    currentPhase: 2,
                    currentSubProblemIndex: 1,
                    totalSubProblems: 3,
                    insightPoints: ['洞察A', '洞察B'],
                    hasResolved: true,
                }),
            } as unknown as Response);

            await useConversation.getState().setCurrentConversationId('conv-hydrate');

            const state = useConversation.getState();
            expect(state.currentPhase).toBe(2);
            expect(state.currentSubProblemIndex).toBe(1);
            expect(state.totalSubProblems).toBe(3);
            expect(state.currentInsightPoints).toEqual(['洞察A', '洞察B']);
            expect(state.hasResolved).toBe(true);
        });

        it('hydration 请求以正确 Authorization header 调用 /state 接口', async () => {
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'secret-tok' } } });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    currentPhase: 0,
                    currentSubProblemIndex: 0,
                    totalSubProblems: 0,
                    insightPoints: [],
                    hasResolved: false,
                }),
            } as unknown as Response);

            await useConversation.getState().setCurrentConversationId('conv-auth-check');

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/conversation/conv-auth-check/state',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer secret-tok',
                    }),
                }),
            );
        });

        it('hydration 返回前再次切会话（竞态守卫）：不回填旧会话数据', async () => {
            // 模拟切到 conv-A 后，hydration 返回之前又切到了 conv-B
            let resolveFetch!: (v: Response) => void;
            const pendingFetch = new Promise<Response>((res) => { resolveFetch = res; });

            mockLoadChatMessagesByConversationIdRequest.mockResolvedValue([]);
            mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
            // 第一次 fetch（conv-A hydration）挂起
            mockFetch.mockReturnValueOnce(pendingFetch);
            // 第二次 fetch（conv-B hydration）立刻返回默认值
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    currentPhase: 0,
                    currentSubProblemIndex: 0,
                    totalSubProblems: 0,
                    insightPoints: [],
                    hasResolved: false,
                }),
            } as unknown as Response);

            // 先切到 conv-A（不等待）
            const switchA = useConversation.getState().setCurrentConversationId('conv-race-A');
            // 立刻再切到 conv-B（此时 conv-A hydration 仍在飞行中）
            await useConversation.getState().setCurrentConversationId('conv-race-B');

            // 现在放行 conv-A 的 hydration 响应（带着 phase=3 的脏数据）
            resolveFetch({
                ok: true,
                json: async () => ({
                    currentPhase: 3,
                    currentSubProblemIndex: 2,
                    totalSubProblems: 5,
                    insightPoints: ['旧洞察'],
                    hasResolved: true,
                }),
            } as unknown as Response);
            await switchA;

            // 竞态守卫应阻止 conv-A 的数据回填，currentConversationId 是 conv-B，phase 应是 0
            const state = useConversation.getState();
            expect(state.currentConversationId).toBe('conv-race-B');
            expect(state.currentPhase).toBe(0);
        });

        it('fetch 失败（非 2xx）时静默保留重置后的默认值', async () => {
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            // 服务端返回 500
            mockFetch.mockResolvedValueOnce({ ok: false, status: 500 } as unknown as Response);

            await useConversation.getState().setCurrentConversationId('conv-hydrate-fail');

            // 回填失败，保留重置后的 0 值（不抛出、不打断消息加载）
            const state = useConversation.getState();
            expect(state.currentPhase).toBe(0);
            expect(state.currentSubProblemIndex).toBe(0);
            expect(state.totalSubProblems).toBe(0);
            expect(state.currentInsightPoints).toHaveLength(0);
        });

        it('fetch 网络异常时静默保留默认值，不打断消息加载', async () => {
            mockLoadChatMessagesByConversationIdRequest.mockResolvedValueOnce([]);
            mockGetSession.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } } });
            // 模拟网络错误
            mockFetch.mockRejectedValueOnce(new Error('Network failure'));

            // 不应抛出异常
            await expect(
                useConversation.getState().setCurrentConversationId('conv-network-err')
            ).resolves.not.toThrow();

            expect(useConversation.getState().currentPhase).toBe(0);
        });
    });
});
