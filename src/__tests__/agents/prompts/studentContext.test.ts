import { describe, it, expect } from 'vitest';
import { buildStudentContext } from '@/agents/prompts/studentContext';

describe('buildStudentContext', () => {
    // ── 1. "7B" — 七年级下册场景 ─────────────────────────────────────────────
    describe('"7B" 当前学期', () => {
        const ctx = buildStudentContext('7B');

        it('包含学情块标志文本「知识边界 — 硬约束」', () => {
            expect(ctx).toContain('知识边界 — 硬约束');
        });

        it('当前就读标注为「七年级下册」', () => {
            expect(ctx).toContain('七年级下册');
        });

        it('【已学完】段含「七年级上册」', () => {
            expect(ctx).toContain('【已学完】');
            expect(ctx).toContain('七年级上册');
        });

        it('【正在学】段含「七年级下册」', () => {
            expect(ctx).toContain('【正在学】');
            expect(ctx).toContain('七年级下册');
        });

        // 细节层级：正在学（七下）列节名，已学完（七上）不列节名
        it('【正在学】七下含节名「简单的轴对称图形」「乘法公式」', () => {
            expect(ctx).toContain('简单的轴对称图形');
            expect(ctx).toContain('乘法公式');
        });

        it('【已学完】七上只列章标题，不含七上节名（如「认识有理数」「有理数的混合运算」）', () => {
            // 「认识有理数」「有理数的混合运算」是七上 §2 的节名，仅出现在节级细节中
            expect(ctx).not.toContain('认识有理数');
            expect(ctx).not.toContain('有理数的混合运算');
        });

        it('【已学完】七上仍含章标题「有理数及其运算」', () => {
            expect(ctx).toContain('有理数及其运算');
        });

        it('【未学】段含八上、八下、九上、九下章标题', () => {
            expect(ctx).toContain('【未学，严禁在引导与解题路线中使用】');
            expect(ctx).toContain('八年级上册');
            expect(ctx).toContain('八年级下册');
            expect(ctx).toContain('九年级上册');
            expect(ctx).toContain('九年级下册');
        });

        it('含宽容条款文本', () => {
            expect(ctx).toContain('宽容条款');
            expect(ctx).toContain('顺势肯定');
        });

        it('含易混点（4 条）', () => {
            expect(ctx).toContain('易混点');
            expect(ctx).toContain('垂直平分线');
            expect(ctx).toContain('韦达定理');
        });

        it('不含 "undefined"', () => {
            expect(ctx).not.toContain('undefined');
        });
    });

    // ── 2. "7A" — 七年级上册（无已学完）────────────────────────────────────
    describe('"7A" 当前学期', () => {
        const ctx = buildStudentContext('7A');

        it('不含【已学完】段（无已完成学期）', () => {
            expect(ctx).not.toContain('【已学完】');
        });

        it('【正在学】含「七年级上册」', () => {
            expect(ctx).toContain('七年级上册');
        });

        it('【未学】含七年级下册', () => {
            expect(ctx).toContain('七年级下册');
        });
    });

    // ── 3. "8A" — 八年级上册 ─────────────────────────────────────────────────
    describe('"8A" 当前学期', () => {
        const ctx = buildStudentContext('8A');

        it('【已学完】包含七上和七下', () => {
            expect(ctx).toContain('七年级上册');
            expect(ctx).toContain('七年级下册');
        });

        it('【正在学】含「八年级上册」', () => {
            expect(ctx).toContain('【正在学】');
            expect(ctx).toContain('八年级上册');
        });

        // 细节层级：8A 正在学（八上）列节名，已学完（七上/七下）不列节名
        it('【正在学】八上含节名「探索勾股定理」', () => {
            expect(ctx).toContain('探索勾股定理');
        });

        it('已学完（七下）只列章标题，不含七下节名「简单的轴对称图形」', () => {
            expect(ctx).not.toContain('简单的轴对称图形');
        });

        it('【未学】含八下、九上、九下', () => {
            expect(ctx).toContain('八年级下册');
            expect(ctx).toContain('九年级上册');
            expect(ctx).toContain('九年级下册');
        });
    });

    // ── 4. "9B" — 九年级下册（无未学） ──────────────────────────────────────
    describe('"9B" 当前学期', () => {
        const ctx = buildStudentContext('9B');

        it('【已学完】含全部前五学期', () => {
            expect(ctx).toContain('七年级上册');
            expect(ctx).toContain('九年级上册');
        });

        it('不含【未学】段（无后续学期）', () => {
            expect(ctx).not.toContain('【未学，严禁');
        });
    });

    // ── 5. 输出不含 "undefined" ───────────────────────────────────────────────
    it.each(['7A', '7B', '8A', '8B', '9A', '9B'] as const)(
        'buildStudentContext("%s") 不含 "undefined"',
        (term) => {
            expect(buildStudentContext(term)).not.toContain('undefined');
        }
    );

    // ── 6. token 预算护栏：7B 学情块字符数 ≤ 900（约 ≤560 token）────────────────
    // 互换层级后「正在学」列全节名（约 330 字符）+ 4 条易混点（约 199 字符），
    // 与「≤400 token」不可同时满足（见随附报告）。此护栏防止未来无意中再膨胀。
    it('"7B" 学情块字符数 ≤ 900（约 ≤560 token，防膨胀护栏）', () => {
        const ctx = buildStudentContext('7B');
        expect(ctx.length).toBeLessThanOrEqual(900);
    });
});
