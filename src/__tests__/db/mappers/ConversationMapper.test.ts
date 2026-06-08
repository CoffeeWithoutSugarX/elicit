import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Prevent server-only from throwing in test environment ────────────────────
vi.mock('server-only', () => ({}));

// ── Hoisted mocks (referenced inside vi.mock factories, which are hoisted) ──
const { mockInsert, mockSelect, mockUpdate } = vi.hoisted(() => {
    return {
        mockInsert: vi.fn(),
        mockSelect: vi.fn(),
        mockUpdate: vi.fn(),
    };
});

// ── Mock Drizzle db client ───────────────────────────────────────────────────
vi.mock('@/db', () => ({
    db: {
        insert: mockInsert,
        select: mockSelect,
        update: mockUpdate,
    },
}));

// ── Mock drizzle-orm eq so it's a no-op identity ────────────────────────────
vi.mock('drizzle-orm', () => ({
    eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

// ── Mock schema (values don't matter for mapper unit tests) ─────────────────
vi.mock('@/db/schema/conversation', () => ({
    elicitConversations: { conversationId: 'conversationId', userId: 'userId' },
}));

import { conversationMapper } from '@/db/mappers/ConversationMapper';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ConversationMapper', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── create ───────────────────────────────────────────────────────────────

    describe('create', () => {
        it('成功创建对话记录 → 返回新建行', async () => {
            const fakeRow = {
                conversationId: 'conv-new',
                userId: 'user-1',
                title: '新对话',
            };
            const mockReturning = vi.fn().mockResolvedValue([fakeRow]);
            const mockValues = vi.fn(() => ({ returning: mockReturning }));
            mockInsert.mockReturnValue({ values: mockValues });

            const result = await conversationMapper.create('conv-new', 'user-1', '新对话');

            expect(mockInsert).toHaveBeenCalledOnce();
            expect(mockValues).toHaveBeenCalledWith({
                conversationId: 'conv-new',
                userId: 'user-1',
                title: '新对话',
            });
            expect(result).toEqual(fakeRow);
        });

        it('insert 返回空数组 → result[0] 为 undefined', async () => {
            const mockReturning = vi.fn().mockResolvedValue([]);
            const mockValues = vi.fn(() => ({ returning: mockReturning }));
            mockInsert.mockReturnValue({ values: mockValues });

            const result = await conversationMapper.create('conv-x', 'user-x', 'title');
            expect(result).toBeUndefined();
        });
    });

    // ── findById ─────────────────────────────────────────────────────────────

    describe('findById', () => {
        it('找到对应记录 → 返回第一行', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const fakeRow = { conversationId: 'conv-abc', userId: 'user-1', title: 'found' };

            const mockLimit = vi.fn().mockResolvedValue([fakeRow]);
            const mockWhere = vi.fn(() => ({ limit: mockLimit }));
            const mockFrom = vi.fn(() => ({ where: mockWhere }));
            mockSelect.mockReturnValue({ from: mockFrom });

            const result = await conversationMapper.findById('conv-abc');

            expect(result).toEqual(fakeRow);
            expect(mockLimit).toHaveBeenCalledWith(1);
            consoleSpy.mockRestore();
        });

        it('未找到记录 → 返回 undefined', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const mockLimit = vi.fn().mockResolvedValue([]);
            const mockWhere = vi.fn(() => ({ limit: mockLimit }));
            const mockFrom = vi.fn(() => ({ where: mockWhere }));
            mockSelect.mockReturnValue({ from: mockFrom });

            const result = await conversationMapper.findById('conv-missing');
            expect(result).toBeUndefined();
            consoleSpy.mockRestore();
        });
    });

    // ── update ───────────────────────────────────────────────────────────────

    describe('update', () => {
        it('成功更新 hasResolved → 返回更新后的行数组', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
            const updatedRow = { conversationId: 'conv-upd', hasResolved: true };

            const mockReturning = vi.fn().mockResolvedValue([updatedRow]);
            const mockWhere = vi.fn(() => ({ returning: mockReturning }));
            const mockSet = vi.fn(() => ({ where: mockWhere }));
            mockUpdate.mockReturnValue({ set: mockSet });

            const result = await conversationMapper.update('conv-upd', { hasResolved: true });

            expect(mockSet).toHaveBeenCalledWith({ hasResolved: true });
            expect(result).toEqual([updatedRow]);
            consoleSpy.mockRestore();
        });

        it('成功更新 currentPhase 和 problemType', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            const mockReturning = vi.fn().mockResolvedValue([]);
            const mockWhere = vi.fn(() => ({ returning: mockReturning }));
            const mockSet = vi.fn(() => ({ where: mockWhere }));
            mockUpdate.mockReturnValue({ set: mockSet });

            await conversationMapper.update('conv-upd', { currentPhase: 2, problemType: 1 });

            expect(mockSet).toHaveBeenCalledWith({ currentPhase: 2, problemType: 1 });
            consoleSpy.mockRestore();
        });

        it('update 抛出异常 → 向上传播', async () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

            mockUpdate.mockImplementation(() => {
                throw new Error('DB connection failed');
            });

            await expect(
                conversationMapper.update('conv-err', { hasResolved: false }),
            ).rejects.toThrow('DB connection failed');

            consoleSpy.mockRestore();
        });
    });
});
