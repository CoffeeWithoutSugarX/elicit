import { withAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/adminAuth';

export const GET = withAuth(async (_req, { user }) => {
    if (!user.email || !isAdmin(user.email)) {
        return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 动态导入，避免构建期初始化 Supabase 客户端（service_role key 仅运行时可用）
    const { getAdminSupabase } = await import('@/lib/admin-db');
    const adminSupabase = getAdminSupabase();

    const { data, error } = await adminSupabase
        .from('elicit_conversations')
        .select('conversation_id, title, user_id, created_at, current_phase, has_resolved')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Admin conversations GET error:', error);
        return NextResponse.json({ error: '查询失败' }, { status: 500 });
    }

    const conversations = (data ?? []).map(row => ({
        conversationId: row.conversation_id,
        title: row.title,
        userId: row.user_id,
        createdAt: row.created_at,
        currentPhase: row.current_phase,
        hasResolved: row.has_resolved,
    }));

    return NextResponse.json({ conversations });
});
