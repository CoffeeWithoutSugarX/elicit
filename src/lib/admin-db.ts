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

