import { supabase } from "@/db/supabase/supabase";

/**
 * 获取当前登录用户的 Authorization 请求头。
 * 供各 api-client 方法 spread 使用，其余 header（Content-Type 等）保留在调用点。
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
        'Authorization': `Bearer ${session?.access_token}`,
    };
}
