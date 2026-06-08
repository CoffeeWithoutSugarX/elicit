import { withAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/adminAuth';
import { BaseResponse } from '@/types/response/BaseResponse';

export const GET = withAuth(async (_req, { user }) => {
    try {
        if (!user.email || !isAdmin(user.email)) {
            return Response.json(BaseResponse.ofError('无权限'), { status: 403 });
        }

        // 动态导入，避免构建期初始化 Supabase 客户端（service_role key 仅运行时可用）
        const { getAdminSupabase } = await import('@/lib/adminDb');
        const adminSupabase = getAdminSupabase();

        const { data, error } = await adminSupabase
            .from('elicit_conversations')
            .select('conversation_id, title, user_id, created_at, current_phase, has_resolved')
            .order('created_at', { ascending: false })
            .limit(200);

        if (error) {
            console.error('Admin conversations GET error:', error);
            return Response.json(BaseResponse.ofError('查询失败'), { status: 500 });
        }

        const conversations = (data ?? []).map(row => ({
            conversationId: row.conversation_id,
            title: row.title,
            userId: row.user_id,
            createdAt: row.created_at,
            currentPhase: row.current_phase,
            hasResolved: row.has_resolved,
        }));

        return Response.json(BaseResponse.ofSuccess({ conversations }));
    } catch (err) {
        console.error('Admin conversations GET 未知错误:', err);
        return Response.json(BaseResponse.ofError('服务器内部错误'), { status: 500 });
    }
});
