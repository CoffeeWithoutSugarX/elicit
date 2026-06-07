import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('studentProfile', () => {
    // 由于 studentProfile.ts 在模块顶层立即执行，需要通过 vi.resetModules() + 动态 import 测试 env 变量
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    // ── 1. 合法值透传 ────────────────────────────────────────────────────────
    it('STUDENT_GRADE_TERM="8B" → studentGradeTerm = "8B"', async () => {
        vi.stubEnv('STUDENT_GRADE_TERM', '8B');
        const { studentGradeTerm } = await import('@/agents/data/studentProfile');
        expect(studentGradeTerm).toBe('8B');
    });

    it('STUDENT_GRADE_TERM="7A" → studentGradeTerm = "7A"', async () => {
        vi.stubEnv('STUDENT_GRADE_TERM', '7A');
        const { studentGradeTerm } = await import('@/agents/data/studentProfile');
        expect(studentGradeTerm).toBe('7A');
    });

    it('STUDENT_GRADE_TERM="9B" → studentGradeTerm = "9B"', async () => {
        vi.stubEnv('STUDENT_GRADE_TERM', '9B');
        const { studentGradeTerm } = await import('@/agents/data/studentProfile');
        expect(studentGradeTerm).toBe('9B');
    });

    // ── 2. 非法值 → fallback "7B" + console.warn ─────────────────────────────
    it('STUDENT_GRADE_TERM="invalid" → fallback "7B" 且 console.warn 被调用', async () => {
        vi.stubEnv('STUDENT_GRADE_TERM', 'invalid');
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { studentGradeTerm } = await import('@/agents/data/studentProfile');
        expect(studentGradeTerm).toBe('7B');
        expect(warnSpy).toHaveBeenCalledOnce();
        expect(warnSpy.mock.calls[0][0]).toContain('[studentProfile]');
    });

    it('STUDENT_GRADE_TERM 缺失（undefined）→ fallback "7B" 且 console.warn 被调用', async () => {
        vi.stubEnv('STUDENT_GRADE_TERM', undefined as unknown as string);
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { studentGradeTerm } = await import('@/agents/data/studentProfile');
        expect(studentGradeTerm).toBe('7B');
        expect(warnSpy).toHaveBeenCalledOnce();
    });

    it('STUDENT_GRADE_TERM="" （空字符串）→ fallback "7B"', async () => {
        vi.stubEnv('STUDENT_GRADE_TERM', '');
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { studentGradeTerm } = await import('@/agents/data/studentProfile');
        expect(studentGradeTerm).toBe('7B');
    });
});
