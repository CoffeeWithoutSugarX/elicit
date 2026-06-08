import { describe, it, expect } from 'vitest';
import { filterKnowledgePointsCsvByGradeTerm, knowledgePoints } from '@/agents/data/loadKnowledgePoints';

describe('filterKnowledgePointsCsvByGradeTerm', () => {
    // ── 1. "7B" → 含七上/七下，不含八上及之后 ─────────────────────────────────
    it('"7B" 过滤结果含 KP-013（七下）', () => {
        const csv = filterKnowledgePointsCsvByGradeTerm('7B');
        expect(csv).toContain('KP-013');
        expect(csv).toContain('变量之间的关系');
    });

    it('"7B" 过滤结果不含 KP-014（八上）及之后的行', () => {
        const csv = filterKnowledgePointsCsvByGradeTerm('7B');
        expect(csv).not.toContain('KP-014');
        expect(csv).not.toContain('KP-022');
        expect(csv).not.toContain('KP-039');
    });

    it('"7B" 过滤结果含表头', () => {
        const csv = filterKnowledgePointsCsvByGradeTerm('7B');
        const firstLine = csv.split('\n')[0];
        expect(firstLine).toContain('ID');
        expect(firstLine).toContain('知识点');
    });

    it('"7B" 过滤结果含七上所有行（KP-001 ~ KP-006）', () => {
        const csv = filterKnowledgePointsCsvByGradeTerm('7B');
        for (let i = 1; i <= 6; i++) {
            expect(csv).toContain(`KP-00${i}`);
        }
    });

    // ── 2. "7A" → 只含七上 ───────────────────────────────────────────────────
    it('"7A" 只含七上知识点（KP-001 ~ KP-006），不含七下', () => {
        const csv = filterKnowledgePointsCsvByGradeTerm('7A');
        for (let i = 1; i <= 6; i++) {
            expect(csv).toContain(`KP-00${i}`);
        }
        expect(csv).not.toContain('KP-007'); // 七下
        expect(csv).not.toContain('KP-013'); // 七下
    });

    // ── 3. "9B" → 全部 39 行（不含表头）───────────────────────────────────────
    it('"9B" 包含全部 39 个知识点', () => {
        const csv = filterKnowledgePointsCsvByGradeTerm('9B');
        const dataLines = csv.split('\n').filter(l => l.trim() && !l.startsWith('ID'));
        expect(dataLines.length).toBe(39);
    });

    // ── 4. "8B" → 含八下，不含九上 ──────────────────────────────────────────
    it('"8B" 含 KP-028（八下），不含 KP-029（九上）', () => {
        const csv = filterKnowledgePointsCsvByGradeTerm('8B');
        expect(csv).toContain('KP-028');
        expect(csv).not.toContain('KP-029');
    });
});

describe('knowledgePoints（新 CSV 39 行）', () => {
    it('knowledgePoints 共 39 条', () => {
        expect(knowledgePoints).toHaveLength(39);
    });

    it('KP-001 名称为「丰富的图形世界」', () => {
        const kp = knowledgePoints.find(k => k.id === 'KP-001');
        expect(kp?.name).toBe('丰富的图形世界');
    });

    it('KP-032 别名包含「选学」标记', () => {
        const kp = knowledgePoints.find(k => k.id === 'KP-032');
        // 别名列：根与系数关系(选学*)  — 不含英文逗号，split('/') 后有 1 个元素
        expect(kp?.aliases.join('/')).toContain('选学');
    });

    it('KP-022 出处为「八下 §1.4」', () => {
        const kp = knowledgePoints.find(k => k.id === 'KP-022');
        expect(kp?.textbookRef).toBe('八下 §1.4');
    });
});
