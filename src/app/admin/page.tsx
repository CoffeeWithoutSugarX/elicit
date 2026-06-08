'use client';

// 家长后台：会话列表（Client Component）
// 通过 admin API（带 Bearer token）拉取会话记录，鉴权由 API 白名单完成

import Link from 'next/link';
import { PolyaPhaseEnum } from '@/types/enums/polyaPhase.enum';
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
import { adminRequest, AdminConversation } from '@/services/api-client/AdminRequest';
import { useAdminFetch } from '@/app/admin/_hooks';

export default function AdminPage() {
    const { state, data: conversations } = useAdminFetch<AdminConversation[]>(
        () => adminRequest.getConversations(),
        [],
    );

    if (state === 'loading') {
        return <p className="text-sm text-muted-foreground">加载中…</p>;
    }

    if (state === 'unauthorized') {
        return (
            <p className="text-sm text-muted-foreground">
                无权限：请先用管理员账号登录后再访问
            </p>
        );
    }

    if (state === 'error') {
        return <p className="text-sm text-muted-foreground">加载失败，请刷新重试。</p>;
    }

    const convList = conversations ?? [];

    return (
        <div>
            <p className="text-sm text-muted-foreground mb-4">
                共 {convList.length} 条会话记录
            </p>

            {convList.length === 0 ? (
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
                            {convList.map(conv => (
                                <TableRow key={conv.conversationId}>
                                    {/* 标题列：截断超长标题 */}
                                    <TableCell className="px-4 py-3 max-w-xs truncate">
                                        {conv.title ?? '（无标题）'}
                                    </TableCell>
                                    {/* 用户 ID 列：等宽字体，只展示前 8 位 */}
                                    <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                        {conv.userId.slice(0, 8)}…
                                    </TableCell>
                                    {/* 阶段列：用 outline Badge 保持黑白中性；PolyaPhaseEnum.getLabel 找不到时自动返回 '未知' */}
                                    <TableCell className="px-4 py-3">
                                        <Badge variant="outline">
                                            {PolyaPhaseEnum.getLabel(conv.currentPhase)}
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
