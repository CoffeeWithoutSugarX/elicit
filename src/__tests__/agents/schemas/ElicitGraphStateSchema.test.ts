import { describe, it, expect } from 'vitest';
import {
    ElicitGraphStateSchema,
    ElicitGraphInputSchema,
    PolyaPhaseSchema,
    ProblemTypeSchema,
} from '@/agents/schemas/ElicitGraphStateSchema';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { ProblemType } from '@/types/enums/problemType.enum';

// ElicitGraphStateSchema 的最简有效输入（messages 字段可用自定义类型，此处用空数组）
// 注：Zod v4 UUID 校验要求版本号合法（第 3 段首位 1-8），故使用标准格式 UUID
const baseFields = {
    messages: [],
    userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    conversationId: '123e4567-e89b-12d3-a456-426614174000',
};

// hasResolved / currentPhase / lastDeviationAt / subProblems / currentSubProblemIndex
// 使用 .register(registry, { default }) 而非 .default()，
// 因此 Zod .parse() 不会自动补默认值——调用方必须显式提供这些字段。
// LangGraph 运行时（StateGraph channel）通过 registry 补默认值；
// 普通 Zod parse 场景（如本测试）需要手动提供。
const minimalValid = {
    ...baseFields,
    hasResolved: false,
    currentPhase: PolyaPhase.UNDERSTAND,
    lastDeviationAt: null,
    subProblems: [],
    currentSubProblemIndex: 0,
};

describe('ElicitGraphStateSchema — 顶层 schema', () => {
    // ── 1. 最简有效输入 → 解析成功 ────────────────────────────────────────────

    it('最简有效输入（含必填字段 + register 字段）→ 解析成功', () => {
        const result = ElicitGraphStateSchema.parse(minimalValid);

        // 必填字段保留
        expect(result.userId).toBe(minimalValid.userId);
        expect(result.conversationId).toBe(minimalValid.conversationId);

        // 显式提供的 register 字段
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

    // ── 2. register 字段缺失时 Zod .parse() 应报错（无 Zod default）──────────
    // 这是设计意图：默认值由 LangGraph registry 注入，而非 Zod 自身

    it('缺少 hasResolved 时 Zod 报错（非 Zod default，由 LangGraph registry 管理）', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({ ...baseFields, currentPhase: PolyaPhase.UNDERSTAND, lastDeviationAt: null, subProblems: [], currentSubProblemIndex: 0 })
        ).toThrow();
    });

    it('缺少 currentPhase 时 Zod 报错', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({ ...baseFields, hasResolved: false, lastDeviationAt: null, subProblems: [], currentSubProblemIndex: 0 })
        ).toThrow();
    });

    // ── 3. questionImgUrl 接受 OSS key（非完整 URL）──────────────────────────

    it('questionImgUrl 接受非 URL 字符串（OSS object key）', () => {
        const result = ElicitGraphStateSchema.parse({ ...minimalValid, questionImgUrl: 'conv-id/2026-05-25/photo.jpg' });
        expect(result.questionImgUrl).toBe('conv-id/2026-05-25/photo.jpg');
    });

    // ── 4. userId 不是有效 UUID → Zod 报错 ───────────────────────────────────

    it('userId 不是 UUID → 解析失败', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({ ...minimalValid, userId: 'abc' })
        ).toThrow();
    });

    // ── 5. conversationId 不是有效 UUID → Zod 报错 ───────────────────────────

    it('conversationId 不是 UUID → 解析失败', () => {
        expect(() =>
            ElicitGraphStateSchema.parse({ ...minimalValid, conversationId: 'not-uuid' })
        ).toThrow();
    });

    // ── 6. 所有合法的 currentPhase 值 ────────────────────────────────────────

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

    // ── 7. 所有合法的 problemType 值 ─────────────────────────────────────────

    it.each([
        ProblemType.ALGEBRA,
        ProblemType.GEOMETRY,
        ProblemType.FUNCTION,
        ProblemType.OTHER,
    ])('problemType=%i → 合法，解析成功', (pt) => {
        const result = ElicitGraphStateSchema.parse({ ...minimalValid, problemType: pt });
        expect(result.problemType).toBe(pt);
    });

    // ── 8. lastDeviationAt 接受 null 和正整数 ────────────────────────────────

    it('lastDeviationAt=null → 合法', () => {
        const result = ElicitGraphStateSchema.parse({ ...minimalValid, lastDeviationAt: null });
        expect(result.lastDeviationAt).toBeNull();
    });

    it('lastDeviationAt=5 → 合法（messages 长度单位）', () => {
        const result = ElicitGraphStateSchema.parse({ ...minimalValid, lastDeviationAt: 5 });
        expect(result.lastDeviationAt).toBe(5);
    });
});

describe('ElicitGraphInputSchema — 独立 input schema', () => {
    // ElicitGraphInputSchema 只含 HTTP 请求携带的字段（无 hasResolved 等），
    // 确保跨 invoke 时 LangGraph 不会用 default 值覆盖 checkpoint 中的值

    it('最简有效输入 → 解析成功', () => {
        const result = ElicitGraphInputSchema.parse(baseFields);
        expect(result.userId).toBe(baseFields.userId);
        expect(result.conversationId).toBe(baseFields.conversationId);
        expect(result.questionImgUrl).toBeUndefined();
    });

    it('包含 questionImgUrl → 解析成功', () => {
        const result = ElicitGraphInputSchema.parse({ ...baseFields, questionImgUrl: 'path/to/img.jpg' });
        expect(result.questionImgUrl).toBe('path/to/img.jpg');
    });

    it('不含 hasResolved / currentPhase（这些字段不在 input schema 中）', () => {
        // 验证 input schema 没有这些字段（多余字段被 Zod strip 掉）
        const result = ElicitGraphInputSchema.parse({ ...baseFields, hasResolved: true } as unknown as typeof baseFields);
        // Zod 默认 strip 未知字段
        expect((result as Record<string, unknown>)['hasResolved']).toBeUndefined();
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
