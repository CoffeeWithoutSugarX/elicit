import { describe, it, expect } from 'vitest';
import {
    ElicitGraphStateSchema,
    PolyaPhaseSchema,
    ProblemTypeSchema,
} from '@/agents/schemas/ElicitGraphStateSchema';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { ProblemType } from '@/types/enums/problemType.enum';

// ElicitGraphStateSchema 的最简有效输入（messages 字段可用自定义类型，此处用空数组）
// 注：Zod v4 UUID 校验要求版本号合法（第 3 段首位 1-8），故使用标准格式 UUID
const minimalValid = {
    messages: [],
    userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    conversationId: '123e4567-e89b-12d3-a456-426614174000',
};

describe('ElicitGraphStateSchema — 顶层 schema', () => {
    // ── 1. 最简有效输入 → 默认值填充 ─────────────────────────────────────────

    it('最简有效输入（只含必填字段）→ 解析成功，默认值填充', () => {
        const result = ElicitGraphStateSchema.parse(minimalValid);

        // 必填字段保留
        expect(result.userId).toBe(minimalValid.userId);
        expect(result.conversationId).toBe(minimalValid.conversationId);

        // 默认值
        expect(result.hasResolved).toBe(false);
        expect(result.currentPhase).toBe(PolyaPhase.UNDERSTAND);
        expect(result.lastDeviationAt).toBeNull();
        expect(result.subProblems).toEqual([]);
        expect(result.currentSubProblemIndex).toBe(0);

        // 可选字段
        expect(result.questionImgUrl).toBeUndefined();
        expect(result.ocrResult).toBeUndefined();
        expect(result.problemType).toBeUndefined();
    });

    // ── 2. questionImgUrl 接受 OSS key（非完整 URL）──────────────────────────

    it('questionImgUrl 接受非 URL 字符串（OSS object key）', () => {
        const result = ElicitGraphStateSchema.parse({ ...minimalValid, questionImgUrl: 'conv-id/2026-05-25/photo.jpg' });
        expect(result.questionImgUrl).toBe('conv-id/2026-05-25/photo.jpg');
    });

    // ── 3. userId 不是有效 UUID → Zod 报错 ───────────────────────────────────

    it('userId 不是 UUID → 解析失败', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({ ...minimalValid, userId: 'abc' })
        ).toThrow();
    });

    // ── 4. conversationId 不是有效 UUID → Zod 报错 ───────────────────────────

    it('conversationId 不是 UUID → 解析失败', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({ ...minimalValid, conversationId: 'not-uuid' })
        ).toThrow();
    });

    // ── 5. 所有合法的 currentPhase 值 ────────────────────────────────────────

    it.each([
        PolyaPhase.UNDERSTAND,
        PolyaPhase.PLAN,
        PolyaPhase.EXECUTE,
        PolyaPhase.REVIEW,
        PolyaPhase.DONE,
    ])('currentPhase=%i → 合法，解析成功', (phase) => {
        const result = ElicitGraphStateSchema.parse({ ...minimalValid, currentPhase: phase });
        expect(result.currentPhase).toBe(phase);
    });

    // ── 6. 所有合法的 problemType 值 ─────────────────────────────────────────

    it.each([
        ProblemType.ALGEBRA,
        ProblemType.GEOMETRY,
        ProblemType.FUNCTION,
        ProblemType.OTHER,
    ])('problemType=%i → 合法，解析成功', (pt) => {
        const result = ElicitGraphStateSchema.parse({ ...minimalValid, problemType: pt });
        expect(result.problemType).toBe(pt);
    });
});

describe('PolyaPhaseSchema', () => {
    it('UNDERSTAND(0) → 合法', () => {
        expect(() => PolyaPhaseSchema.parse(PolyaPhase.UNDERSTAND)).not.toThrow();
    });

    it('PLAN(1) → 合法', () => {
        expect(() => PolyaPhaseSchema.parse(PolyaPhase.PLAN)).not.toThrow();
    });

    it('EXECUTE(2) → 合法', () => {
        expect(() => PolyaPhaseSchema.parse(PolyaPhase.EXECUTE)).not.toThrow();
    });

    it('REVIEW(3) → 合法', () => {
        expect(() => PolyaPhaseSchema.parse(PolyaPhase.REVIEW)).not.toThrow();
    });

    it('DONE(4) → 合法', () => {
        expect(() => PolyaPhaseSchema.parse(PolyaPhase.DONE)).not.toThrow();
    });

    it('无效值 99 → Zod 报错', () => {
        expect(() => PolyaPhaseSchema.parse(99)).toThrow();
    });

    it('字符串 "UNDERSTAND" → Zod 报错（期望数字）', () => {
        expect(() => PolyaPhaseSchema.parse('UNDERSTAND')).toThrow();
    });
});

describe('ProblemTypeSchema', () => {
    it('ALGEBRA(0) → 合法', () => {
        expect(() => ProblemTypeSchema.parse(ProblemType.ALGEBRA)).not.toThrow();
    });

    it('GEOMETRY(1) → 合法', () => {
        expect(() => ProblemTypeSchema.parse(ProblemType.GEOMETRY)).not.toThrow();
    });

    it('FUNCTION(2) → 合法', () => {
        expect(() => ProblemTypeSchema.parse(ProblemType.FUNCTION)).not.toThrow();
    });

    it('OTHER(3) → 合法', () => {
        expect(() => ProblemTypeSchema.parse(ProblemType.OTHER)).not.toThrow();
    });

    it('无效值 99 → Zod 报错', () => {
        expect(() => ProblemTypeSchema.parse(99)).toThrow();
    });
});

describe('SubProblemStateSchema（通过 ElicitGraphStateSchema.subProblems 间接测试）', () => {
    const validSubProblem = {
        index: 0,
        goal: '求解方程',
    };

    it('最简 SubProblem（仅 index + goal）→ 默认值填充', () => {
        const result = ElicitGraphStateSchema.parse({
            ...minimalValid,
            subProblems: [validSubProblem],
        });

        const sp = result.subProblems[0];
        expect(sp.status).toBe('pending');
        expect(sp.givenConditions).toEqual([]);
        expect(sp.milestones).toEqual([]);
        expect(sp.insightPoints).toEqual([]);
        expect(sp.stuckCountPerPhase).toEqual({ understand: 0, plan: 0, execute: 0, review: 0 });
        expect(sp.probedQuestionIdsPerPhase).toEqual({
            understand: [], plan: [], execute: [], review: [],
        });
    });

    it('SubProblem status → 仅接受 pending/done/blocked', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({
                ...minimalValid,
                subProblems: [{ ...validSubProblem, status: 'invalid' }],
            })
        ).toThrow();
    });

    it('SubProblem goal 为空字符串 → Zod 报错（min(1)）', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({
                ...minimalValid,
                subProblems: [{ index: 0, goal: '' }],
            })
        ).toThrow();
    });

    it('SubProblem milestones 超过 4 条 → Zod 报错（max(4)）', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({
                ...minimalValid,
                subProblems: [{
                    ...validSubProblem,
                    milestones: ['a', 'b', 'c', 'd', 'e'],
                }],
            })
        ).toThrow();
    });
});

describe('StuckCountSchema（通过 SubProblemState 间接测试）', () => {
    it('stuckCountPerPhase 四个字段均默认为 0', () => {
        const result = ElicitGraphStateSchema.parse({
            ...minimalValid,
            subProblems: [{ index: 0, goal: '求 x' }],
        });
        const sc = result.subProblems[0].stuckCountPerPhase;
        expect(sc.understand).toBe(0);
        expect(sc.plan).toBe(0);
        expect(sc.execute).toBe(0);
        expect(sc.review).toBe(0);
    });

    it('stuckCount 负数 → Zod 报错（min(0)）', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({
                ...minimalValid,
                subProblems: [{
                    index: 0,
                    goal: '求 x',
                    stuckCountPerPhase: { understand: -1, plan: 0, execute: 0, review: 0 },
                }],
            })
        ).toThrow();
    });

    it('stuckCount 小数 → Zod 报错（int()）', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({
                ...minimalValid,
                subProblems: [{
                    index: 0,
                    goal: '求 x',
                    stuckCountPerPhase: { understand: 1.5, plan: 0, execute: 0, review: 0 },
                }],
            })
        ).toThrow();
    });
});
