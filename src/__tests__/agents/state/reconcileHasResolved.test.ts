import { describe, it, expect, vi, beforeEach } from 'vitest';

// ——— 阻止 server-only 校验 ———
vi.mock('server-only', () => ({}));

// ——— mock ConversationMapper ———
vi.mock('@/db/mappers/ConversationMapper', () => ({
    conversationMapper: {
        findById: vi.fn(),
        update: vi.fn(),
    },
}));

import { reconcileHasResolved } from '@/agents/state/reconcileHasResolved';
import { conversationMapper } from '@/db/mappers/ConversationMapper';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { ProblemType } from '@/types/enums/problemType.enum';

const mockFindById = vi.mocked(conversationMapper.findById);
const mockUpdate = vi.mocked(conversationMapper.update);

const CONV_ID = '00000000-0000-0000-0000-000000000099';

// 辅助：构建最简 DB 记录
const makeDbRecord = (overrides: Record<string, unknown> = {}) => ({
    conversationId: CONV_ID,
    userId: '00000000-0000-0000-0000-000000000001',
    title: 'test',
    hasResolved: false,
    currentPhase: PolyaPhase.UNDERSTAND,
    problemType: undefined,
    ...overrides,
});

describe('reconcileHasResolved', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ── 1. DB 无记录 → 直接返回，不调 update ─────────────────────────────────

    it('DB 无记录 → 不调用 update', async () => {
        mockFindById.mockResolvedValue(null as never);

        await reconcileHasResolved(CONV_ID, {
            hasResolved: true,
            currentPhase: PolyaPhase.UNDERSTAND,
        });

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    // ── 2. graph 已解析，DB 未解析 → 调用 update ─────────────────────────────

    it('graph hasResolved=true, DB hasResolved=false → 调用 update', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: false }) as never);
        mockUpdate.mockResolvedValue(undefined as never);

        await reconcileHasResolved(CONV_ID, {
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
        });

        expect(mockUpdate).toHaveBeenCalledWith(
            CONV_ID,
            expect.objectContaining({ hasResolved: true, currentPhase: PolyaPhase.PLAN })
        );
    });

    // ── 3. update 时同步 problemType（若存在）────────────────────────────────

    it('graph hasResolved=true + problemType → update 包含 problemType', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: false }) as never);
        mockUpdate.mockResolvedValue(undefined as never);

        await reconcileHasResolved(CONV_ID, {
            hasResolved: true,
            currentPhase: PolyaPhase.UNDERSTAND,
            problemType: ProblemType.ALGEBRA,
        });

        expect(mockUpdate).toHaveBeenCalledWith(
            CONV_ID,
            expect.objectContaining({ problemType: ProblemType.ALGEBRA })
        );
    });

    // ── 4. graph hasResolved=false, DB hasResolved=true → 不调 update（仅日志）

    it('graph hasResolved=false, DB hasResolved=true → 不调用 update', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        await reconcileHasResolved(CONV_ID, {
            hasResolved: false,
            currentPhase: PolyaPhase.UNDERSTAND,
        });

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    // ── 5. 两者一致（均为 false）→ 不调 update ───────────────────────────────

    it('graph 和 DB 均 hasResolved=false → 不调 update', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: false }) as never);

        await reconcileHasResolved(CONV_ID, {
            hasResolved: false,
            currentPhase: PolyaPhase.UNDERSTAND,
        });

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    // ── 6. 两者一致（均为 true）→ 不调 update ────────────────────────────────

    it('graph 和 DB 均 hasResolved=true → 不调 update', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: true }) as never);

        await reconcileHasResolved(CONV_ID, {
            hasResolved: true,
            currentPhase: PolyaPhase.PLAN,
        });

        expect(mockUpdate).not.toHaveBeenCalled();
    });

    // ── 7. findById 抛异常 → 非致命，不 throw ─────────────────────────────────

    it('findById 抛出异常 → 函数不 throw（吞掉错误）', async () => {
        mockFindById.mockRejectedValue(new Error('DB connection failed'));

        await expect(
            reconcileHasResolved(CONV_ID, { hasResolved: true, currentPhase: PolyaPhase.UNDERSTAND })
        ).resolves.toBeUndefined();
    });

    // ── 8. update 抛异常 → 非致命，不 throw ──────────────────────────────────

    it('update 抛出异常 → 函数不 throw（吞掉错误）', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: false }) as never);
        mockUpdate.mockRejectedValue(new Error('Update failed'));

        await expect(
            reconcileHasResolved(CONV_ID, { hasResolved: true, currentPhase: PolyaPhase.UNDERSTAND })
        ).resolves.toBeUndefined();
    });

    // ── 9. problemType=undefined → update 不包含 problemType 键 ──────────────

    it('problemType=undefined → update payload 不包含 problemType', async () => {
        mockFindById.mockResolvedValue(makeDbRecord({ hasResolved: false }) as never);
        mockUpdate.mockResolvedValue(undefined as never);

        await reconcileHasResolved(CONV_ID, {
            hasResolved: true,
            currentPhase: PolyaPhase.UNDERSTAND,
            problemType: undefined,
        });

        const updatePayload = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
        expect(updatePayload).not.toHaveProperty('problemType');
    });
});
