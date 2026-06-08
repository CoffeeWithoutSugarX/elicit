import { describe, it, expect } from 'vitest';
import {
    GRADE_TERMS,
    BSD_MATH_CATALOG,
    confusionNotes,
    type GradeTerm,
} from '@/agents/data/bsdMathCatalog';

describe('bsdMathCatalog', () => {
    // ── 1. 六学期齐全，顺序正确 ───────────────────────────────────────────────
    it('GRADE_TERMS 包含六个学期且顺序正确', () => {
        expect(GRADE_TERMS).toEqual(['7A', '7B', '8A', '8B', '9A', '9B']);
    });

    it('BSD_MATH_CATALOG 长度 = 6', () => {
        expect(BSD_MATH_CATALOG).toHaveLength(6);
    });

    it('BSD_MATH_CATALOG 各 term 与 GRADE_TERMS 顺序一一对应', () => {
        BSD_MATH_CATALOG.forEach((tc, i) => {
            expect(tc.term).toBe(GRADE_TERMS[i]);
        });
    });

    // ── 2. 版本标注正确 ───────────────────────────────────────────────────────
    it('7A/7B/8A/8B 为 2024新版，9A/9B 为旧版', () => {
        const editions: Record<GradeTerm, '2024新版' | '旧版'> = {
            '7A': '2024新版',
            '7B': '2024新版',
            '8A': '2024新版',
            '8B': '2024新版',
            '9A': '旧版',
            '9B': '旧版',
        };
        BSD_MATH_CATALOG.forEach(tc => {
            expect(tc.edition).toBe(editions[tc.term]);
        });
    });

    // ── 3. label 正确 ─────────────────────────────────────────────────────────
    it('各学期 label 正确', () => {
        const labels: Record<GradeTerm, string> = {
            '7A': '七年级上册',
            '7B': '七年级下册',
            '8A': '八年级上册',
            '8B': '八年级下册',
            '9A': '九年级上册',
            '9B': '九年级下册',
        };
        BSD_MATH_CATALOG.forEach(tc => {
            expect(tc.label).toBe(labels[tc.term]);
        });
    });

    // ── 4. 7B 第五章：印刷版章名「图形的轴对称」，含「简单的轴对称图形」节 ──
    it('7B 含「图形的轴对称」章（印刷版修正后）', () => {
        const term7B = BSD_MATH_CATALOG.find(tc => tc.term === '7B')!;
        const ch5 = term7B.chapters.find(ch => ch.title.includes('轴对称'));
        expect(ch5).toBeDefined();
        expect(ch5!.title).toBe('第五章 图形的轴对称');
    });

    it('7B 第五章的 sections 含「简单的轴对称图形」', () => {
        const term7B = BSD_MATH_CATALOG.find(tc => tc.term === '7B')!;
        const ch5 = term7B.chapters.find(ch => ch.title.includes('轴对称'))!;
        expect(ch5.sections).toContain('2 简单的轴对称图形');
    });

    // ── 5. 各学期有章节数据 ───────────────────────────────────────────────────
    it('每个学期至少有 3 个章', () => {
        BSD_MATH_CATALOG.forEach(tc => {
            expect(tc.chapters.length).toBeGreaterThanOrEqual(3);
        });
    });

    it('每个章至少有 1 个节', () => {
        BSD_MATH_CATALOG.forEach(tc => {
            tc.chapters.forEach(ch => {
                expect(ch.sections.length).toBeGreaterThanOrEqual(1);
            });
        });
    });

    // ── 6. confusionNotes：4 条，含关键词 ────────────────────────────────────
    it('confusionNotes 有 4 条', () => {
        expect(confusionNotes).toHaveLength(4);
    });

    it('confusionNotes[0] 包含「垂直平分线」和「判定定理」', () => {
        expect(confusionNotes[0]).toContain('垂直平分线');
        expect(confusionNotes[0]).toContain('判定定理');
    });

    it('confusionNotes[3] 包含「韦达定理」和「选学」', () => {
        expect(confusionNotes[3]).toContain('韦达定理');
        expect(confusionNotes[3]).toContain('选学');
    });
});
