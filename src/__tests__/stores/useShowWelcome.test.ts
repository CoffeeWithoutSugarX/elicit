import { describe, it, expect, beforeEach } from 'vitest';
import { useShowWelcome } from '@/stores/useShowWelcome';

describe('useShowWelcome', () => {
    beforeEach(() => {
        useShowWelcome.setState({ showWelcome: true });
    });

    it('初始状态 showWelcome 为 true', () => {
        expect(useShowWelcome.getState().showWelcome).toBe(true);
    });

    it('toggleWelcome() 从 true 切换到 false', () => {
        useShowWelcome.getState().toggleWelcome();
        expect(useShowWelcome.getState().showWelcome).toBe(false);
    });

    it('toggleWelcome() 从 false 切换到 true', () => {
        useShowWelcome.setState({ showWelcome: false });
        useShowWelcome.getState().toggleWelcome();
        expect(useShowWelcome.getState().showWelcome).toBe(true);
    });

    it('连续两次 toggleWelcome() 回到原始值', () => {
        useShowWelcome.getState().toggleWelcome();
        useShowWelcome.getState().toggleWelcome();
        expect(useShowWelcome.getState().showWelcome).toBe(true);
    });
});
