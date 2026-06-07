import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const { mockOrder } = vi.hoisted(() => ({
    mockOrder: vi.fn(),
}));

// ── Mock supabase client ─────────────────────────────────────────────────────
vi.mock('@/db/supabase/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({ order: mockOrder })),
        })),
    },
}));

import { loadAllChatConversation } from '@/db/models/ChatConversation';
import ChatConversationProps from '@/features/chat/props/ChatConversationProps';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('loadAllChatConversation', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('成功加载对话列表 → 返回 ChatConversationProps 数组', async () => {
        const dbRows = [
            { conversation_id: 'conv-1', title: '第一个对话', created_at: '2024-01-01T00:00:00Z' },
            { conversation_id: 'conv-2', title: '第二个对话', created_at: '2024-01-02T00:00:00Z' },
        ];
        mockOrder.mockResolvedValue({ data: dbRows, error: null });

        const result = await loadAllChatConversation();
        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(ChatConversationProps);
        expect(result[0].id).toBe('conv-1');
        expect(result[0].title).toBe('第一个对话');
        expect(result[0].createdAt).toBe('2024-01-01T00:00:00Z');
        expect(result[1].id).toBe('conv-2');
        expect(result[1].title).toBe('第二个对话');
    });

    it('title 为 null → 映射为空字符串', async () => {
        const dbRows = [
            { conversation_id: 'conv-3', title: null, created_at: '2024-01-03T00:00:00Z' },
        ];
        mockOrder.mockResolvedValue({ data: dbRows, error: null });

        const result = await loadAllChatConversation();
        expect(result[0].title).toBe('');
    });

    it('查询返回 error → 打印错误并返回空数组', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        mockOrder.mockResolvedValue({ data: null, error: { message: 'connection error' } });

        const result = await loadAllChatConversation();
        expect(result).toEqual([]);
        expect(consoleSpy).toHaveBeenCalledWith(
            'Error loading chat conversations:',
            expect.objectContaining({ message: 'connection error' }),
        );
        consoleSpy.mockRestore();
    });

    it('查询返回 data 为 null（无 error）→ 返回空数组', async () => {
        mockOrder.mockResolvedValue({ data: null, error: null });

        const result = await loadAllChatConversation();
        expect(result).toEqual([]);
    });

    it('查询返回空数组 → 返回空数组', async () => {
        mockOrder.mockResolvedValue({ data: [], error: null });

        const result = await loadAllChatConversation();
        expect(result).toEqual([]);
    });

    it('按 created_at 降序排列（验证 order 调用参数）', async () => {
        mockOrder.mockResolvedValue({ data: [], error: null });

        await loadAllChatConversation();

        expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('created_at 字段正确映射到 createdAt', async () => {
        const dbRows = [
            { conversation_id: 'conv-ts', title: '测试', created_at: '2025-06-01T08:00:00Z' },
        ];
        mockOrder.mockResolvedValue({ data: dbRows, error: null });

        const result = await loadAllChatConversation();
        expect(result[0].createdAt).toBe('2025-06-01T08:00:00Z');
    });
});
