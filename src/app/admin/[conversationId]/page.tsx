'use client';

// 家长后台：单条会话详情（Client Component，只读）
// 通过 admin API（带 Bearer token）读取会话消息，鉴权由 API 白名单完成

import { use } from 'react';
import Link from 'next/link';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import {
    adminRequest,
    AdminConversationDetail,
} from '@/services/api-client/AdminRequest';
import { useAdminFetch } from '@/app/admin/_hooks';
import {
    AdminOcrCardMessage,
    AdminKnowledgeCardMessage,
    AdminTextMessage,
} from '@/app/admin/_components';

interface PageProps {
    params: Promise<{ conversationId: string }>;
}

export default function AdminConversationDetailPage({ params }: PageProps) {
    // Next.js 16 client 页面的 params 用 use() 解包（同 src/app/chat/[conversationId]/page.tsx）
    const { conversationId } = use(params);

    const { state, data } = useAdminFetch<AdminConversationDetail>(
        () => adminRequest.getConversationDetail(conversationId),
        [conversationId],
    );

    const conversation = data?.conversation ?? null;
    const messages = data?.messages ?? [];

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

    if (state === 'not_found') {
        return <p className="text-sm text-muted-foreground">会话不存在</p>;
    }

    if (state === 'error') {
        return <p className="text-sm text-muted-foreground">加载失败，请刷新重试。</p>;
    }

    return (
        <div className="max-w-3xl">
            {/* 返回链接 */}
            <div className="mb-4">
                <Link
                    href="/admin"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                >
                    ← 返回会话列表
                </Link>
            </div>

            {/* 会话元信息 */}
            <div className="mb-6 p-4 bg-muted/30 border border-border rounded">
                <h2 className="text-lg font-semibold text-foreground mb-1">
                    {conversation?.title ?? '（无标题）'}
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                    会话 ID：{conversation?.conversationId}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    用户 ID：{conversation?.userId}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                    创建时间：{conversation ? new Date(conversation.createdAt).toLocaleString('zh-CN') : ''}
                </p>
            </div>

            {/* 消息列表（只读）：按 type 分发到对应子组件 */}
            <div className="flex flex-col gap-3">
                {messages.length === 0 && (
                    <p className="text-muted-foreground text-sm">该会话暂无消息记录。</p>
                )}
                {messages.map(msg => {
                    if (msg.type === ChatMessageType.OCR_CARD) {
                        return <AdminOcrCardMessage key={msg.messageId} msg={msg} />;
                    }
                    if (msg.type === ChatMessageType.KNOWLEDGE_CARD) {
                        return <AdminKnowledgeCardMessage key={msg.messageId} msg={msg} />;
                    }
                    return <AdminTextMessage key={msg.messageId} msg={msg} />;
                })}
            </div>
        </div>
    );
}
