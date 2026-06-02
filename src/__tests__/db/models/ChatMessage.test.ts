import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock supabase client ─────────────────────────────────────────────────────
// All mock fns must be defined via vi.hoisted when referenced in vi.mock factory.
const { mockUpsert, mockOrder, mockEq } = vi.hoisted(() => ({
    mockUpsert: vi.fn(),
    mockOrder: vi.fn(),
    mockEq: vi.fn(),
}));

vi.mock('@/db/supabase/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            upsert: mockUpsert,
            select: vi.fn(() => ({
                eq: mockEq,
            })),
        })),
    },
}));

import { supabase } from '@/db/supabase/supabase';
import { insertChatMessageRequest, loadChatMessagesByConversationIdRequest } from '@/db/models/ChatMessage';
import ChatMessageProps from '@/features/chat/props/ChatMessageProps';
import { ChatMessageRole } from '@/types/enums/chatMessageRole.enum';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';

const mockFrom = vi.mocked(supabase.from);

// ── Helpers ───────────────────────────────────────────────────────────────────

function resetFromForUpsert() {
    mockFrom.mockReturnValue({
        upsert: mockUpsert,
    } as ReturnType<typeof supabase.from>);
}

function resetFromForSelect() {
    mockEq.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({
        select: vi.fn(() => ({ eq: mockEq })),
    } as ReturnType<typeof supabase.from>);
}

// ── Shared fixtures ───────────────────────────────────────────────────────────

const sampleMessage = new ChatMessageProps(
    'msg-001',
    'conv-001',
    ChatMessageRole.USER,
    'Hello world',
    ChatMessageType.TEXT,
    null,
);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('insertChatMessageRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetFromForUpsert();
    });

    it('成功 upsert → 返回 true', async () => {
        mockUpsert.mockResolvedValue({ error: null });
        const result = await insertChatMessageRequest(sampleMessage);
        expect(result).toBe(true);
    });

    it('upsert 返回 error → 打印错误并返回 false', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockUpsert.mockResolvedValue({ error: { message: 'duplicate key' } });

        const result = await insertChatMessageRequest(sampleMessage);
        expect(result).toBe(false);
        expect(consoleSpy).toHaveBeenCalledWith(
            'Failed to insert chat message:',
            expect.objectContaining({ message: 'duplicate key' }),
        );
        consoleSpy.mockRestore();
    });

    it('upsert 调用时传入正确字段', async () => {
        mockUpsert.mockResolvedValue({ error: null });
        const msgWithImg = new ChatMessageProps(
            'msg-002',
            'conv-002',
            ChatMessageRole.ASSISTANT,
            'Assistant reply',
            ChatMessageType.IMAGE,
            'https://example.com/img.png',
        );
        await insertChatMessageRequest(msgWithImg);

        expect(mockUpsert).toHaveBeenCalledWith(
            {
                message_id:      'msg-002',
                conversation_id: 'conv-002',
                role:            ChatMessageRole.ASSISTANT,
                content:         'Assistant reply',
                type:            ChatMessageType.IMAGE,
                img_url:         'https://example.com/img.png',
            },
            { onConflict: 'conversation_id,message_id', ignoreDuplicates: true },
        );
    });
});

describe('loadChatMessagesByConversationIdRequest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetFromForSelect();
    });

    it('成功加载并映射数据行 → 返回 ChatMessageProps 数组', async () => {
        const dbRows = [
            {
                message_id:      'msg-1',
                conversation_id: 'conv-abc',
                role:            ChatMessageRole.USER,
                content:         'hi',
                type:            ChatMessageType.TEXT,
                img_url:         null,
            },
            {
                message_id:      'msg-2',
                conversation_id: 'conv-abc',
                role:            ChatMessageRole.ASSISTANT,
                content:         'hello',
                type:            ChatMessageType.TEXT,
                img_url:         null,
            },
        ];
        mockOrder.mockResolvedValue({ data: dbRows, error: null });

        const result = await loadChatMessagesByConversationIdRequest('conv-abc');
        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(ChatMessageProps);
        expect(result[0].id).toBe('msg-1');
        expect(result[0].role).toBe(ChatMessageRole.USER);
        expect(result[1].id).toBe('msg-2');
        expect(result[1].role).toBe(ChatMessageRole.ASSISTANT);
    });

    it('未知 role code → 回退到 ChatMessageRole.USER', async () => {
        const dbRows = [
            {
                message_id:      'msg-x',
                conversation_id: 'conv-abc',
                role:            99,
                content:         'unknown',
                type:            ChatMessageType.TEXT,
                img_url:         null,
            },
        ];
        mockOrder.mockResolvedValue({ data: dbRows, error: null });

        const result = await loadChatMessagesByConversationIdRequest('conv-abc');
        expect(result[0].role).toBe(ChatMessageRole.USER);
    });

    it('未知 type code → 回退到 ChatMessageType.TEXT', async () => {
        const dbRows = [
            {
                message_id:      'msg-y',
                conversation_id: 'conv-abc',
                role:            ChatMessageRole.USER,
                content:         'text',
                type:            99,
                img_url:         null,
            },
        ];
        mockOrder.mockResolvedValue({ data: dbRows, error: null });

        const result = await loadChatMessagesByConversationIdRequest('conv-abc');
        expect(result[0].type).toBe(ChatMessageType.TEXT);
    });

    it('查询返回 error → 打印错误并返回空数组', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockOrder.mockResolvedValue({ data: null, error: { message: 'db error' } });

        const result = await loadChatMessagesByConversationIdRequest('conv-abc');
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
            'Failed to load chat messages:',
            expect.objectContaining({ message: 'db error' }),
        );
        consoleSpy.mockRestore();
    });

    it('查询返回 data 为 null（无 error）→ 返回空数组', async () => {
        mockOrder.mockResolvedValue({ data: null, error: null });

        const result = await loadChatMessagesByConversationIdRequest('conv-abc');
        expect(result).toEqual([]);
    });

    it('order 调用时传入 ascending: true', async () => {
        mockOrder.mockResolvedValue({ data: [], error: null });

        await loadChatMessagesByConversationIdRequest('conv-abc');
        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: true });
    });
});
