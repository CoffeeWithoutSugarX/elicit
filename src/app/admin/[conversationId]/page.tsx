// 家长后台：单条会话详情（Server Component，只读）
// 通过 service_role 客户端读取任意用户的会话消息

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminSupabase } from '@/lib/admin-db';

// 强制动态渲染：数据来自 DB，不能静态预渲染
export const dynamic = 'force-dynamic';

interface MessageRow {
    messageId: string;
    role: number;
    content: string;
    imgUrl: string | null;
    createdAt: string;
}

interface ConversationDetail {
    conversationId: string;
    title: string | null;
    userId: string;
    createdAt: string;
}

async function fetchConversationDetail(conversationId: string): Promise<ConversationDetail | null> {
    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
        .from('elicit_conversations')
        .select('conversation_id, title, user_id, created_at')
        .eq('conversation_id', conversationId)
        .single();

    if (error || !data) return null;

    return {
        conversationId: data.conversation_id,
        title: data.title,
        userId: data.user_id,
        createdAt: data.created_at,
    };
}

async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
    const adminSupabase = getAdminSupabase();
    const { data, error } = await adminSupabase
        .from('elicit_messages')
        .select('message_id, role, content, img_url, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Admin: 拉取消息列表失败', error);
        return [];
    }

    return (data ?? []).map(row => ({
        messageId: row.message_id,
        role: row.role,
        content: row.content,
        imgUrl: row.img_url,
        createdAt: row.created_at,
    }));
}

interface PageProps {
    params: Promise<{ conversationId: string }>;
}

export default async function AdminConversationDetailPage({ params }: PageProps) {
    const { conversationId } = await params;

    const [conversation, messages] = await Promise.all([
        fetchConversationDetail(conversationId),
        fetchMessages(conversationId),
    ]);

    if (!conversation) {
        notFound();
    }

    return (
        <div className="max-w-3xl">
            {/* 返回链接 */}
            <div className="mb-4">
                <Link
                    href="/admin"
                    className="text-sm text-ink-secondary hover:text-ink-primary transition-colors underline"
                >
                    ← 返回会话列表
                </Link>
            </div>

            {/* 会话元信息 */}
            <div className="mb-6 p-4 bg-paper-surface border border-ink-line rounded">
                <h2 className="text-lg font-semibold text-ink-primary mb-1">
                    {conversation.title ?? '（无标题）'}
                </h2>
                <p className="text-xs text-ink-muted font-mono">
                    会话 ID：{conversation.conversationId}
                </p>
                <p className="text-xs text-ink-muted font-mono mt-0.5">
                    用户 ID：{conversation.userId}
                </p>
                <p className="text-xs text-ink-muted mt-0.5">
                    创建时间：{new Date(conversation.createdAt).toLocaleString('zh-CN')}
                </p>
            </div>

            {/* 消息列表（只读） */}
            <div className="flex flex-col gap-3">
                {messages.length === 0 && (
                    <p className="text-ink-muted text-sm">该会话暂无消息记录。</p>
                )}
                {messages.map(msg => {
                    // role: 0=USER, 1=ASSISTANT（与 ChatMessageRole 枚举对齐）
                    const isUser = msg.role === 0;
                    return (
                        <div
                            key={msg.messageId}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed ${
                                    isUser
                                        ? 'bg-paper-deep text-ink-primary'
                                        : 'bg-paper-surface border border-ink-line text-ink-primary'
                                }`}
                            >
                                {/* 角色标签 */}
                                <p className="text-[10px] text-ink-muted mb-1 font-mono">
                                    {isUser ? '用户' : '引思助手'}
                                </p>

                                {/* 图片（如有） */}
                                {msg.imgUrl && (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                        src={msg.imgUrl}
                                        alt="用户上传图片"
                                        className="max-h-40 object-contain mb-2 rounded border border-ink-line"
                                    />
                                )}

                                {/* 消息文本 */}
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>

                                {/* 时间戳 */}
                                <p className="text-[10px] text-ink-muted mt-1">
                                    {new Date(msg.createdAt).toLocaleString('zh-CN')}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
