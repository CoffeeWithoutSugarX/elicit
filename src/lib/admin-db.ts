import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/db/supabase/type';

/**
 * Service-role Supabase 客户端（懒创建）。
 * 绕过 RLS，仅在服务端 admin API 路由 / Server Component 中使用。
 * 禁止在客户端组件或浏览器端导入此模块（server-only 保护）。
 *
 * 工厂函数模式：避免构建期 env var 缺失导致初始化失败。
 */
export function getAdminSupabase() {
    return createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

/**
 * 向后兼容的 adminSupabase 导出：调用方直接使用 adminSupabase，
 * 但实际客户端在首次调用 getAdminSupabase() 时才构建。
 *
 * 注意：此文件被导入时不会立即调用 createClient，
 * 仅当 getAdminSupabase() 被调用（即运行时）时才初始化。
 */
