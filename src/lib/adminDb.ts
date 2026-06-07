import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/db/supabase/type';

/**
 * Service-role Supabase 客户端（模块级懒单例）。
 * 绕过 RLS，仅在服务端 admin API 路由 / Server Component 中使用。
 * 禁止在客户端组件或浏览器端导入此模块（server-only 保护）。
 *
 * 懒单例模式：首次调用时初始化，后续复用同一实例，避免重复创建连接。
 */
let _client: ReturnType<typeof createClient<Database>> | undefined;

export function getAdminSupabase() {
    return (_client ??= createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    ));
}
