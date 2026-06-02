import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { User } from '@supabase/auth-js';

// Use vi.hoisted to ensure mock variables are initialized before vi.mock hoisting
const { mockSignInWithPassword, mockSignOut, mockGetUser } = vi.hoisted(() => ({
    mockSignInWithPassword: vi.fn(),
    mockSignOut: vi.fn(),
    mockGetUser: vi.fn(),
}));

vi.mock('@/db/supabase/supabase', () => ({
    supabase: {
        auth: {
            signInWithPassword: mockSignInWithPassword,
            signOut: mockSignOut,
            getUser: mockGetUser,
        },
    },
}));

// Import after mocks are set up
import { useUserInfo } from '@/stores/useUserInfo';

const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    factors: [],
    updated_at: '2024-01-01T00:00:00Z',
};

describe('useUserInfo', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useUserInfo.setState({ userInfo: null });
    });

    describe('初始状态', () => {
        it('userInfo 初始值为 null', () => {
            expect(useUserInfo.getState().userInfo).toBeNull();
        });
    });

    describe('login()', () => {
        it('登录成功时设置 userInfo', async () => {
            mockSignInWithPassword.mockResolvedValueOnce({
                data: { user: mockUser, session: {} },
                error: null,
            });

            await useUserInfo.getState().login('test@example.com', 'password123');

            expect(mockSignInWithPassword).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
            expect(useUserInfo.getState().userInfo).toEqual(mockUser);
        });

        it('登录失败时不改变 userInfo 并打印错误', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockSignInWithPassword.mockResolvedValueOnce({
                data: { user: null, session: null },
                error: { message: 'Invalid credentials' },
            });

            await useUserInfo.getState().login('bad@example.com', 'wrongpass');

            expect(useUserInfo.getState().userInfo).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Login error:', 'Invalid credentials');
            consoleSpy.mockRestore();
        });

        it('登录抛出异常时向上抛出', async () => {
            mockSignInWithPassword.mockRejectedValueOnce(new Error('Network error'));

            await expect(
                useUserInfo.getState().login('test@example.com', 'pass')
            ).rejects.toThrow('Network error');

            expect(useUserInfo.getState().userInfo).toBeNull();
        });
    });

    describe('logout()', () => {
        it('退出成功时将 userInfo 设置为 null', async () => {
            useUserInfo.setState({ userInfo: mockUser });
            mockSignOut.mockResolvedValueOnce({ error: null });

            await useUserInfo.getState().logout();

            expect(mockSignOut).toHaveBeenCalled();
            expect(useUserInfo.getState().userInfo).toBeNull();
        });

        it('退出失败时保留 userInfo 并打印错误', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            useUserInfo.setState({ userInfo: mockUser });
            mockSignOut.mockResolvedValueOnce({
                error: { message: 'Sign out failed' },
            });

            await useUserInfo.getState().logout();

            expect(useUserInfo.getState().userInfo).toEqual(mockUser);
            expect(consoleSpy).toHaveBeenCalledWith('Logout error:', 'Sign out failed');
            consoleSpy.mockRestore();
        });
    });

    describe('whoAmI()', () => {
        it('成功时设置并返回 userInfo', async () => {
            mockGetUser.mockResolvedValueOnce({
                data: { user: mockUser },
                error: null,
            });

            const result = await useUserInfo.getState().whoAmI();

            expect(useUserInfo.getState().userInfo).toEqual(mockUser);
            expect(result).toEqual(mockUser);
        });

        it('getUser 报错时返回 null 并打印错误', async () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            mockGetUser.mockResolvedValueOnce({
                data: { user: null },
                error: { message: 'Not authenticated' },
            });

            const result = await useUserInfo.getState().whoAmI();

            expect(result).toBeNull();
            expect(useUserInfo.getState().userInfo).toBeNull();
            expect(consoleSpy).toHaveBeenCalledWith('Who am i error:', 'Not authenticated');
            consoleSpy.mockRestore();
        });

        it('成功后 userInfo 被更新为新值', async () => {
            useUserInfo.setState({ userInfo: null });
            mockGetUser.mockResolvedValueOnce({
                data: { user: mockUser },
                error: null,
            });

            const result = await useUserInfo.getState().whoAmI();
            expect(result).toEqual(mockUser);
            expect(useUserInfo.getState().userInfo?.id).toBe('user-123');
        });
    });
});
