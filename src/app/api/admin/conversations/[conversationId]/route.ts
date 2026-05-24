import { withAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

// 管理员邮箱白名单（逗号分隔，不区分大小写）
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim().toLowerCase());
const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());

export const GET = withAuth(async (_req, { params, user }) => {
    if (!user.email || !isAdmin(user.email)) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { conversationId } = await (params as Promise<{ conversationId: string }>);

    // 动态导入，避免构建期初始化 Supabase 客户端（service_role key 仅运行时可用）
    const { getAdminSupabase } = await import('@/lib/admin-db');
    const adminSupabase = getAdminSupabase();

    // 拉取会话元信息
    const { data: convData, error: convError } = await adminSupabase
        .from('elicit_conversations')
        .select('conversation_id, title, user_id, created_at, current_phase, has_resolved')
        .eq('conversation_id', conversationId)
        .single();

    if (convError || !convData) {
        return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    // 拉取该会话的所有消息
    const { data: msgData, error: msgError } = await adminSupabase
        .from('elicit_messages')
        .select('message_id, role, content, img_url, created_at, type')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (msgError) {
        console.error('Admin conversation detail GET error:', msgError);
        return NextResponse.json({ error: '消息查询失败' }, { status: 500 });
    }

    return NextResponse.json({
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
    });
});
