// 家长后台：会话列表（Server Component）
// 通过 admin API 拉取所有用户的会话记录并展示

import Link from 'next/link';
import { getAdminSupabase } from '@/lib/admin-db';
import {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
            <p className="text-sm text-muted-foreground mb-4">
                共 {conversations.length} 条会话记录
            </p>

            {conversations.length === 0 ? (
                <p className="text-muted-foreground text-sm">暂无会话记录。</p>
            ) : (
                <div className="rounded border border-border">
                    {/* shadcn Table：自带 overflow-x-auto 容器、bg-muted/50 表头、border-border 分割线 */}
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="px-4 py-3">标题</TableHead>
                                <TableHead className="px-4 py-3">用户 ID</TableHead>
                                <TableHead className="px-4 py-3">阶段</TableHead>
                                <TableHead className="px-4 py-3">创建时间</TableHead>
                                <TableHead className="px-4 py-3">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {conversations.map(conv => (
                                <TableRow key={conv.conversationId}>
                                    {/* 标题列：截断超长标题 */}
                                    <TableCell className="px-4 py-3 max-w-xs truncate">
                                        {conv.title ?? '（无标题）'}
                                    </TableCell>
                                    {/* 用户 ID 列：等宽字体，只展示前 8 位 */}
                                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {conv.userId.slice(0, 8)}…
                                    </TableCell>
                                    {/* 阶段列：用 outline Badge 保持黑白中性 */}
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline">
                                            {PHASE_LABELS[conv.currentPhase] ?? conv.currentPhase}
                                        </Badge>
                                    </TableCell>
                                    {/* 创建时间列 */}
                                    <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                        {new Date(conv.createdAt).toLocaleString('zh-CN')}
                                    </TableCell>
                                    {/* 操作列：ghost Button 包裹 Link */}
                                    <TableCell className="px-4 py-3">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/admin/${conv.conversationId}`}>
                                                查看
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
