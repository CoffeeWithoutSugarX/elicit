'use client';

// admin 页面公共 hook
// 封装 fetch + PageState 状态机逻辑，供 /admin 与 /admin/[conversationId] 页面复用

import { useState, useEffect } from 'react';
import { AdminUnauthorizedError } from '@/services/api-client/AdminRequest';
import type { PageState } from '@/app/admin/_types';

/**
 * 通用 admin 数据拉取 hook。
 * 接收一个异步 fetcher 函数，在 deps 变化时自动触发，统一管理 PageState 与数据。
 *
 * @param fetcher 返回数据的异步函数（依赖 AdminRequest 方法）
 * @param deps    useEffect 依赖数组（如 conversationId）
 */
export function useAdminFetch<T>(
    fetcher: () => Promise<T>,
    deps: React.DependencyList = [],
): { state: PageState; data: T | null } {
    const [state, setState] = useState<PageState>('loading');
    const [data, setData] = useState<T | null>(null);

    useEffect(() => {
        // async IIFE：避免 useEffect 直接接收 async 函数
        (async () => {
            setState('loading');
            try {
                const result = await fetcher();
                setData(result);
                setState('success');
            } catch (err) {
                if (err instanceof AdminUnauthorizedError) {
                    setState('unauthorized');
                } else if (err instanceof Error && err.message === 'NOT_FOUND') {
                    setState('not_found');
                } else {
                    console.error('Admin: 数据拉取失败', err);
                    setState('error');
                }
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { state, data };
}
