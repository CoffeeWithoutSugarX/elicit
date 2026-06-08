import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryConversation } from '@/stores/useHistoryConversation';

describe('useHistoryConversation', () => {
    beforeEach(() => {
        useHistoryConversation.setState({ isOpen: false });
    });

    it('初始状态 isOpen 为 false', () => {
        expect(useHistoryConversation.getState().isOpen).toBe(false);
    });

    it('open() 将 isOpen 设置为 true', () => {
        useHistoryConversation.getState().open();
        expect(useHistoryConversation.getState().isOpen).toBe(true);
    });

    it('close() 将 isOpen 设置为 false', () => {
        useHistoryConversation.setState({ isOpen: true });
        useHistoryConversation.getState().close();
        expect(useHistoryConversation.getState().isOpen).toBe(false);
    });

    it('close() 在已关闭时调用仍保持 false', () => {
        useHistoryConversation.getState().close();
        expect(useHistoryConversation.getState().isOpen).toBe(false);
    });

    it('toggle() 从 false 切换到 true', () => {
        useHistoryConversation.getState().toggle();
        expect(useHistoryConversation.getState().isOpen).toBe(true);
    });

    it('toggle() 从 true 切换到 false', () => {
        useHistoryConversation.setState({ isOpen: true });
        useHistoryConversation.getState().toggle();
        expect(useHistoryConversation.getState().isOpen).toBe(false);
    });

    it('连续 toggle() 两次回到初始状态', () => {
        useHistoryConversation.getState().toggle();
        useHistoryConversation.getState().toggle();
        expect(useHistoryConversation.getState().isOpen).toBe(false);
    });

    it('open() 后再 close() 回到 false', () => {
        useHistoryConversation.getState().open();
        useHistoryConversation.getState().close();
        expect(useHistoryConversation.getState().isOpen).toBe(false);
    });
});
