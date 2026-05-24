// 家长后台：会话列表（Server Component）
// 通过 admin API 拉取所有用户的会话记录并展示

import Link from 'next/link';
import { getAdminSupabase } from '@/lib/admin-db';

// 强制动态渲染：数据来自 DB，不能静态预渲染
export const dynamic = 'force-dynamic';

interface ConversationRow {
    conversationId: string;
    title: string | null;
    userId: string;
    createdAt: string;
    currentPhase: number;
}

async function fetchAdminConversations(): Promise<ConversationRow[]> {
    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
        .from('elicit_conversations')
        .select('conversation_id, title, user_id, created_at, current_phase')
        .order('created_at', { ascending: false })
        .limit(200);

    if (error) {
        console.error('Admin: 拉取会话列表失败', error);
        return [];
    }

    return (data ?? []).map(row => ({
        conversationId: row.conversation_id,
        title: row.title,
        userId: row.user_id,
        createdAt: row.created_at,
        currentPhase: row.current_phase,
    }));
}

const PHASE_LABELS: Record<number, string> = {
    0: '理解',
    1: '规划',
    2: '执行',
    3: '回顾',
};

export default async function AdminPage() {
    const conversations = await fetchAdminConversations();

    return (
        <div>
            <p className="text-sm text-ink-secondary mb-4">
                共 {conversations.length} 条会话记录
            </p>

            {conversations.length === 0 ? (
                <p className="text-ink-muted text-sm">暂无会话记录。</p>
            ) : (
                <div className="overflow-x-auto rounded border border-ink-line">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-paper-deep text-ink-secondary text-left">
                                <th className="px-4 py-3 font-medium">标题</th>
                                <th className="px-4 py-3 font-medium">用户 ID</th>
                                <th className="px-4 py-3 font-medium">阶段</th>
                                <th className="px-4 py-3 font-medium">创建时间</th>
                                <th className="px-4 py-3 font-medium">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {conversations.map((conv, idx) => (
                                <tr
                                    key={conv.conversationId}
                                    className={idx % 2 === 0 ? 'bg-paper-surface' : 'bg-paper-canvas'}
                                    style={{ borderTop: '1px solid var(--color-ink-line)' }}
                                >
                                    <td className="px-4 py-3 text-ink-primary max-w-xs truncate">
                                        {conv.title ?? '（无标题）'}
                                    </td>
                                    <td className="px-4 py-3 text-ink-secondary font-mono text-xs">
                                        {conv.userId.slice(0, 8)}…
                                    </td>
                                    <td className="px-4 py-3 text-ink-secondary">
                                        {PHASE_LABELS[conv.currentPhase] ?? conv.currentPhase}
                                    </td>
                                    <td className="px-4 py-3 text-ink-muted text-xs">
                                        {new Date(conv.createdAt).toLocaleString('zh-CN')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            href={`/admin/${conv.conversationId}`}
                                            className="text-xs text-ink-secondary underline hover:text-ink-primary transition-colors"
                                        >
                                            查看
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
