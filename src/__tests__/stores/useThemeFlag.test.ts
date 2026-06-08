import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeFlag } from '@/stores/useThemeFlag';

describe('useThemeFlag', () => {
    beforeEach(() => {
        useThemeFlag.setState({ isDark: false });
    });

    it('初始状态 isDark 为 false（MVP 固定浅色主题）', () => {
        expect(useThemeFlag.getState().isDark).toBe(false);
    });

    it('themeToggle() 是一个函数', () => {
        expect(typeof useThemeFlag.getState().themeToggle).toBe('function');
    });

    it('themeToggle() 调用后 isDark 仍为 false（MVP 空操作）', () => {
        useThemeFlag.getState().themeToggle();
        expect(useThemeFlag.getState().isDark).toBe(false);
    });

    it('多次调用 themeToggle() 也不改变状态', () => {
        useThemeFlag.getState().themeToggle();
        useThemeFlag.getState().themeToggle();
        useThemeFlag.getState().themeToggle();
        expect(useThemeFlag.getState().isDark).toBe(false);
    });

    it('可通过 setState 强制设置 isDark（测试框架能力验证）', () => {
        useThemeFlag.setState({ isDark: true });
        expect(useThemeFlag.getState().isDark).toBe(true);
    });
});
