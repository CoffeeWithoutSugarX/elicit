import { describe, it, expect } from 'vitest';
import { OcrSchema } from '@/agents/schemas/OcrSchema';

// ——— 辅助：构建最小合法的 solvable payload ———
function makeSolvablePayload(overrides: Record<string, unknown> = {}) {
    return {
        isSolvable: true,
        subject: 'math',
        grade: '初中',
        questions: [
            {
                index: 0,
                topic: '一元二次方程',
                latexFull: '$x^2 - 4x + 3 = 0$',
                givenConditions: [],
                implicitConditions: [],
                goal: '求 x 的值',
                milestones: ['分解因式', '求根'],
                visualFeaturesNeeded: false,
                visualDescription: '',
                subProblems: [
                    {
                        index: 0,
                        goal: '求 x 的值',
                        givenConditions: [],
                        milestones: ['分解因式', '求根'],
                    },
                ],
            },
        ],
        isMulti: false,
        visualFeaturesNeeded: false,
        errorReason: null,
        ...overrides,
    };
}

// ——— 辅助：构建最小合法的 unsolvable payload ———
function makeUnsolvablePayload(overrides: Record<string, unknown> = {}) {
    return {
        isSolvable: false,
        subject: 'chinese',
        questions: [],
        errorReason: 'NOT_SOLVABLE',
        ...overrides,
    };
}

describe('OcrSchema — 韧性 schema：截断而非 reject', () => {

    // ── 直接复刻线上失败：goal > 30 字的 question 能 parse 成功 ──────────────
    it('【线上复刻】goal > 30 字 → parse 成功，goal 被截断到 ≤60 字', () => {
        // qwen3-vl 真实返回，goal 超过 30 字（原 .max(30) 会 reject 整个 OCR）
        const longGoal = '求函数 f(x) = x^2 - 4x + 3 在区间 [0, 5] 上的最大值和最小值，并分析其单调性';
        expect(longGoal.length).toBeGreaterThan(30);

        const payload = makeSolvablePayload({
            questions: [
                {
                    index: 0,
                    topic: '二次函数值域分析',
                    latexFull: '$f(x) = x^2 - 4x + 3$',
                    givenConditions: ['定义域 [0,5]'],
                    implicitConditions: [],
                    goal: longGoal,
                    milestones: ['求导', '找极值', '比较端点'],
                    visualFeaturesNeeded: false,
                    visualDescription: '',
                    subProblems: [
                        {
                            index: 0,
                            goal: longGoal,
                            givenConditions: [],
                            milestones: ['求导'],
                        },
                    ],
                },
            ],
        });

        // 不抛错
        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);

        if (result.isSolvable) {
            // goal 被截断到 ≤60 字
            expect(result.questions[0].goal.length).toBeLessThanOrEqual(60);
            // subProblem goal 也被截断到 ≤80 字
            expect(result.questions[0].subProblems[0].goal.length).toBeLessThanOrEqual(80);
        }
    });

    // ── topic 超长被截断 ──────────────────────────────────────────────────────
    it('topic > 40 字 → parse 成功，topic 被截断到 ≤40 字', () => {
        const longTopic = '一元二次方程的根与系数关系及判别式综合应用分析，含韦达定理推导过程及典型例题解析验证';
        expect(longTopic.length).toBeGreaterThan(40);

        const payload = makeSolvablePayload({
            questions: [
                {
                    ...makeSolvablePayload().questions[0],
                    topic: longTopic,
                },
            ],
        });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.questions[0].topic.length).toBeLessThanOrEqual(40);
        }
    });

    // ── milestones 超量被 slice ───────────────────────────────────────────────
    it('milestones 超过 6 条 → 被截断到 6 条', () => {
        const manyMilestones = ['步骤1', '步骤2', '步骤3', '步骤4', '步骤5', '步骤6', '步骤7', '步骤8'];
        expect(manyMilestones.length).toBeGreaterThan(6);

        const payload = makeSolvablePayload({
            questions: [
                {
                    ...makeSolvablePayload().questions[0],
                    milestones: manyMilestones,
                },
            ],
        });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.questions[0].milestones.length).toBeLessThanOrEqual(6);
        }
    });

    // ── questions 超量被 slice ────────────────────────────────────────────────
    it('questions 超过 6 道 → 被截断到 6 道（parse 不 reject）', () => {
        const baseQuestion = makeSolvablePayload().questions[0];
        const manyQuestions = Array.from({ length: 8 }, (_, i) => ({ ...baseQuestion, index: i }));

        const payload = makeSolvablePayload({ questions: manyQuestions, isMulti: true });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.questions.length).toBeLessThanOrEqual(6);
        }
    });

    // ── subProblems 超量被 slice ─────────────────────────────────────────────
    it('subProblems 超过 6 个 → 被截断到 6 个（parse 不 reject）', () => {
        const baseSubProblem = { index: 0, goal: '求解', givenConditions: [], milestones: [] };
        const manySubProblems = Array.from({ length: 8 }, (_, i) => ({ ...baseSubProblem, index: i }));

        const payload = makeSolvablePayload({
            questions: [
                {
                    ...makeSolvablePayload().questions[0],
                    subProblems: manySubProblems,
                },
            ],
        });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.questions[0].subProblems.length).toBeLessThanOrEqual(6);
        }
    });

    // ── grade 枚举外值 coerce 成 null ─────────────────────────────────────────
    it('grade 给枚举外值（如"九年级"）→ coerce 成 null，parse 不 reject', () => {
        const payload = makeSolvablePayload({ grade: '九年级' });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.grade).toBeNull();
        }
    });

    // ── grade 为 null 时正常接受 ──────────────────────────────────────────────
    it('grade 为 null → parse 成功', () => {
        const payload = makeSolvablePayload({ grade: null });
        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.grade).toBeNull();
        }
    });

    // ── selectedQuestionIndex 去掉 max：大于 4 的值正常接受 ───────────────────
    it('selectedQuestionIndex > 4 → parse 成功（无 max 限制）', () => {
        const payload = makeSolvablePayload({ selectedQuestionIndex: 5 });
        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.selectedQuestionIndex).toBe(5);
        }
    });

    // ── subProblem goal 超长被截断 ────────────────────────────────────────────
    it('subProblem goal > 80 字 → 被截断到 ≤80 字', () => {
        const longGoal = '求在区间 [0, 5] 上单调递增的二次函数 f(x) = ax^2 + bx + c 的最大值和最小值，并验证对称轴位置是否在区间内，给出完整推导过程，同时分析函数在端点处的取值情况与极值点关系，并用图示说明';
        expect(longGoal.length).toBeGreaterThan(80);

        const payload = makeSolvablePayload({
            questions: [
                {
                    ...makeSolvablePayload().questions[0],
                    subProblems: [
                        { index: 0, goal: longGoal, givenConditions: [], milestones: [] },
                    ],
                },
            ],
        });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(true);
        if (result.isSolvable) {
            expect(result.questions[0].subProblems[0].goal.length).toBeLessThanOrEqual(80);
        }
    });
});

describe('OcrSchema — UnsolvableOcrSchema：errorReason coerce', () => {

    // ── errorReason 为 null → coerce 成 NOT_SOLVABLE ─────────────────────────
    it('errorReason: null → coerce 成 NOT_SOLVABLE，parse 不 reject', () => {
        const payload = makeUnsolvablePayload({ errorReason: null });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(false);
        if (!result.isSolvable) {
            expect(result.errorReason).toBe('NOT_SOLVABLE');
        }
    });

    // ── errorReason 缺失（undefined）→ default 成 NOT_SOLVABLE ───────────────
    it('errorReason 缺失（undefined）→ default NOT_SOLVABLE，parse 不 reject', () => {
        const payload = makeUnsolvablePayload();
        // 删掉 errorReason 字段
        const { errorReason: _, ...payloadWithout } = payload as Record<string, unknown>;
        void _;

        const result = OcrSchema.parse(payloadWithout);
        expect(result.isSolvable).toBe(false);
        if (!result.isSolvable) {
            expect(result.errorReason).toBe('NOT_SOLVABLE');
        }
    });

    // ── errorReason 为枚举外值 → coerce 成 NOT_SOLVABLE ──────────────────────
    it('errorReason 为枚举外值（如"UNKNOWN"）→ coerce 成 NOT_SOLVABLE', () => {
        const payload = makeUnsolvablePayload({ errorReason: 'UNKNOWN' });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(false);
        if (!result.isSolvable) {
            expect(result.errorReason).toBe('NOT_SOLVABLE');
        }
    });

    // ── 合法 BLURRY 仍正常保留 ────────────────────────────────────────────────
    it('errorReason: "BLURRY" → 正常保留', () => {
        const payload = makeUnsolvablePayload({ errorReason: 'BLURRY' });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(false);
        if (!result.isSolvable) {
            expect(result.errorReason).toBe('BLURRY');
        }
    });

    // ── errorReason 为 INCOMPLETE → 正常保留（不被 catch 成 NOT_SOLVABLE）────────
    it('errorReason: "INCOMPLETE" → 正常保留', () => {
        const payload = makeUnsolvablePayload({ errorReason: 'INCOMPLETE' });

        const result = OcrSchema.parse(payload);
        expect(result.isSolvable).toBe(false);
        if (!result.isSolvable) {
            expect(result.errorReason).toBe('INCOMPLETE');
        }
    });
});

describe('OcrSchema — 结构性硬约束仍然有效', () => {

    // ── questions 为空数组时 solvable 分支 reject（min(1) 保留）────────────────
    it('solvable + questions=[] → parse 失败（min(1) 硬约束保留）', () => {
        const payload = makeSolvablePayload({ questions: [] });
        expect(() => OcrSchema.parse(payload)).toThrow();
    });

    // ── subProblems 为空时 reject（min(1) 保留）──────────────────────────────
    it('question.subProblems=[] → parse 失败（min(1) 硬约束保留）', () => {
        const payload = makeSolvablePayload({
            questions: [
                {
                    ...makeSolvablePayload().questions[0],
                    subProblems: [],
                },
            ],
        });
        expect(() => OcrSchema.parse(payload)).toThrow();
    });

    // ── topic/goal 为空字符串时 reject（min(1) 保留）────────────────────────
    it('goal="" → parse 失败（min(1) 硬约束保留）', () => {
        const payload = makeSolvablePayload({
            questions: [
                {
                    ...makeSolvablePayload().questions[0],
                    goal: '',
                },
            ],
        });
        expect(() => OcrSchema.parse(payload)).toThrow();
    });
});
