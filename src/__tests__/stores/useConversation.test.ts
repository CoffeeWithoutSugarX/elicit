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

/** Build a minimal mock Response with a body (for confirmSelectedQuestion) */
function makeOkResponse() {
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
        knowledgeCard: null,
        hasResolved: false,
    });
}

// ======================================================
// Tests
// ======================================================

describe('useConversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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
    // handleCustomChunk — legacy conversation_created (no kind)
    // --------------------------------------------------
    describe('handleCustomChunk — 旧版 conversation_created (无 kind 字段)', () => {
        it('legacyConvId 与 currentConversationId 匹配时插入侧边栏并 insert 用户消息', async () => {
            const convId = 'conv-legacy';
            const userMsg = makeUserMsg('u-msg-legacy', convId);
            useConversation.setState({
                currentConversationId: convId,
                chatConversation: [],
                chatMessages: [
                    new ChatMessageProps(DEFAULT_MSG_ID, 'conv-1', ChatMessageRole.ASSISTANT, 'hi', ChatMessageType.TEXT),
                    userMsg,
                ],
            });

            const customChunk: ChunkMessage = {
                id: 'c1',
                type: 'data-custom',
                delta: '',
                data: { conversationId: convId, title: '数学题目' }, // no 'kind'
            };
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([customChunk]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().sendMessage(makeUserMsg('msg-trigger', convId));

            // Sidebar should have the new conversation
            const convs = useConversation.getState().chatConversation;
            expect(convs.find(c => c.id === convId)).toBeDefined();
            expect(convs[0].title).toBe('数学题目');
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
                data: { conversationId: 'conv-other', title: '别的题' }, // mismatch
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

        it('单题时 isMultiQuestion=false 且自动调用 confirmSelectedQuestion 设置 hasResolved=true', async () => {
            // confirmSelectedQuestion is called without await from handleCustomChunk,
            // so we use direct store method call to test this behavior separately.
            // Here we test the state after questions_detected chunk is processed via sendMessage.
            useConversation.setState({ currentConversationId: 'conv-sq', chatConversation: [] });

            mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
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

            // The qChunk triggers confirmSelectedQuestion(0) internally (fire-and-forget)
            // We need fetch to resolve for that internal call
            mockFetch.mockResolvedValue({ body: {} } as unknown as Response);
            mockStreamIterator
                // First call: sendMessage's processStream — yields qChunk
                .mockReturnValueOnce(makeChunkStream([qChunk]))
                // Second call: confirmSelectedQuestion's processStream — empty
                .mockReturnValueOnce(makeChunkStream([]));

            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());

            await useConversation.getState().sendMessage(makeUserMsg('msg-sq', 'conv-sq'));

            // pendingQuestions and isMultiQuestion should be set immediately
            expect(useConversation.getState().isMultiQuestion).toBe(false);
            expect(useConversation.getState().pendingQuestions).toHaveLength(1);
            // hasResolved is set by confirmSelectedQuestion — but it fires async,
            // wait briefly for microtasks to flush
            await new Promise(resolve => setTimeout(resolve, 10));
            expect(useConversation.getState().hasResolved).toBe(true);
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
    // --------------------------------------------------
    describe('handleCustomChunk — knowledge_card', () => {
        it('收到 knowledge_card chunk 时更新 knowledgeCard', async () => {
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

            expect(useConversation.getState().knowledgeCard).toEqual(card);
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
    // handleCustomChunk — unknown kind (silent ignore)
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
            useConversation.setState({ currentConversationId: 'conv-resolve' });
            mockGetSession.mockResolvedValue({ data: { session: { access_token: 'Bearer-token' } } });
            mockFetch.mockResolvedValueOnce({ body: {} } as unknown as Response);
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
            useConversation.setState({ currentConversationId: 'conv-resolve2' });
            mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce({ body: {} } as unknown as Response);
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            expect(useConversation.getState().isStreaming).toBe(false);
        });

        it('处理流式响应并更新消息', async () => {
            useConversation.setState({ currentConversationId: 'conv-resolve3' });
            mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });

            const aiChunks: ChunkMessage[] = [
                { id: 'r-msg-1', type: 'text', delta: '好的，让我来分析' },
            ];
            mockFetch.mockResolvedValueOnce({ body: {} } as unknown as Response);
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(aiChunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            await useConversation.getState().confirmSelectedQuestion(0);

            const msgs = useConversation.getState().chatMessages;
            expect(msgs.find(m => m.id === 'r-msg-1')).toBeDefined();
        });

        it('Authorization header 包含正确的 access_token', async () => {
            useConversation.setState({ currentConversationId: 'conv-auth' });
            mockGetSession.mockResolvedValue({ data: { session: { access_token: 'my-secret-token' } } });
            mockFetch.mockResolvedValueOnce({ body: {} } as unknown as Response);
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

        it('response.body 为 null 时抛出错误，isStreaming 仍重置', async () => {
            useConversation.setState({ currentConversationId: 'conv-nullbody' });
            mockGetSession.mockResolvedValue({ data: { session: { access_token: 'tok' } } });
            mockFetch.mockResolvedValueOnce({ body: null } as unknown as Response);

            // Should not throw (finally resets streaming)
            await expect(
                useConversation.getState().confirmSelectedQuestion(0)
            ).rejects.toThrow('Failed to get resolve response');

            expect(useConversation.getState().isStreaming).toBe(false);
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
                knowledgeCard: {
                    schemaVersion: 1,
                    type: 'knowledge_card',
                    knowledgePoints: [{ name: '方程' }],
                    methods: [{ name: '换元法', category: 1 }],
                    insight: 'test insight',
                },
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
            expect(state.knowledgeCard).toBeNull();
            expect(state.hasResolved).toBe(false);
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
    // assistant message insert after streaming
    // --------------------------------------------------
    describe('流结束后持久化 assistant 消息', () => {
        it('流结束时若最后一条消息 id 不等于用户消息 id，insert 该消息', async () => {
            useConversation.setState({ currentConversationId: 'conv-persist', chatConversation: [] });

            const aiChunks: ChunkMessage[] = [
                { id: 'ai-final', type: 'text', delta: '分析结果' },
            ];
            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream(aiChunks));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const userMsg = makeUserMsg('u-persist', 'conv-persist');
            await useConversation.getState().sendMessage(userMsg);

            // The last message is ai-final (different from user msg id), so it should be inserted
            expect(mockInsertChatMessageRequest).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'ai-final' })
            );
        });

        it('流结束时若没有 AI 消息生成（最后仍是用户消息），不重复 insert', async () => {
            useConversation.setState({ currentConversationId: 'conv-nopersist', chatConversation: [] });

            mockGetRawResponse.mockResolvedValueOnce(makeOkResponse());
            mockStreamIterator.mockReturnValueOnce(makeChunkStream([]));
            mockInsertChatMessageRequest.mockResolvedValue(true);

            const userMsg = makeUserMsg('u-nopersist', 'conv-nopersist');
            await useConversation.getState().sendMessage(userMsg);

            // lastMsg.id === message.id → should NOT insert
            expect(mockInsertChatMessageRequest).not.toHaveBeenCalled();
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
});
