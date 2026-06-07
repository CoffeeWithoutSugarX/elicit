import { withAuth } from '@/lib/auth';
import { isAdmin } from '@/lib/adminAuth';
import { BaseResponse } from '@/types/response/BaseResponse';

export const GET = withAuth(async (_req, { params, user }) => {
    try {
        if (!user.email || !isAdmin(user.email)) {
            return Response.json(BaseResponse.ofError('无权限'), { status: 403 });
        }

        const { conversationId } = await (params as Promise<{ conversationId: string }>);

        // 动态导入，避免构建期初始化 Supabase 客户端（service_role key 仅运行时可用）
        const { getAdminSupabase } = await import('@/lib/adminDb');
        const adminSupabase = getAdminSupabase();

        // 拉取会话元信息
        const { data: convData, error: convError } = await adminSupabase
            .from('elicit_conversations')
            .select('conversation_id, title, user_id, created_at, current_phase, has_resolved')
            .eq('conversation_id', conversationId)
            .single();

        if (convError || !convData) {
            return Response.json(BaseResponse.ofError('会话不存在'), { status: 404 });
        }

        // 拉取该会话的所有消息
        const { data: msgData, error: msgError } = await adminSupabase
            .from('elicit_messages')
            .select('message_id, role, content, img_url, created_at, type')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: true });

        if (msgError) {
            console.error('Admin conversation detail GET error:', msgError);
            return Response.json(BaseResponse.ofError('消息查询失败'), { status: 500 });
        }

        return Response.json(BaseResponse.ofSuccess({
            conversation: {
                conversationId: convData.conversation_id,
                title: convData.title,
                userId: convData.user_id,
                createdAt: convData.created_at,
                currentPhase: convData.current_phase,
                hasResolved: convData.has_resolved,
            },
            messages: (msgData ?? []).map(msg => ({
                messageId: msg.message_id,
                role: msg.role,
                content: msg.content,
                imgUrl: msg.img_url,
                createdAt: msg.created_at,
                type: msg.type,
            })),
        }));
    } catch (err) {
        console.error('Admin conversation detail GET 未知错误:', err);
        return Response.json(BaseResponse.ofError('服务器内部错误'), { status: 500 });
    }
});
