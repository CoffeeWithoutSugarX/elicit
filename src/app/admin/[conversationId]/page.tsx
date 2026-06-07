'use client';

// 家长后台：单条会话详情（Client Component，只读）
// 通过 admin API（带 Bearer token）读取会话消息，鉴权由 API 白名单完成

import { useEffect, useState } from 'react';
import { use } from 'react';
import Link from 'next/link';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { markdownComponents } from '@/lib/markdownComponents';
import { normalizeLatexDelimiters } from '@/lib/katexHelpers';
import { ChatMessageType } from '@/types/enums/chatMessageType.enum';
import { ossRequest } from '@/services/api-client/OssRequest';
import {
    adminRequest,
    AdminMessage,
    AdminConversation,
    AdminUnauthorizedError,
} from '@/services/api-client/AdminRequest';
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { KnowledgeCard } from '@/agents/schemas/KnowledgeCardSchema';
import { KnowledgeCard as KnowledgeCardComponent } from '@/features/chat/components/KnowledgeCard';

// ── 图片签名子组件（client 端挂载后签名，避免 server-only OssService） ──────────

function AdminMessageImage({ imgUrl }: { imgUrl: string }) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        ossRequest.signImageForPreview(imgUrl)
            .then(url => setSignedUrl(url))
            .catch(err => {
                console.error('Admin: 图片签名失败', imgUrl, err);
                setFailed(true);
            });
    }, [imgUrl]);

    if (failed) {
        return <p className="text-xs text-muted-foreground mb-2">图片不可用</p>;
    }

    if (!signedUrl) {
        return <p className="text-xs text-muted-foreground mb-2">图片加载中…</p>;
    }

    return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
            src={signedUrl}
            alt="用户上传图片"
            className="max-h-40 object-contain mb-2 rounded border border-border"
        />
    );
}

// ── 页面类型定义 ─────────────────────────────────────────────────────────────

type PageState = 'loading' | 'unauthorized' | 'not_found' | 'error' | 'success';

interface PageProps {
    params: Promise<{ conversationId: string }>;
}

export default function AdminConversationDetailPage({ params }: PageProps) {
    // Next.js 16 client 页面的 params 用 use() 解包（同 src/app/chat/[conversationId]/page.tsx）
    const { conversationId } = use(params);

    const [state, setState] = useState<PageState>('loading');
    const [conversation, setConversation] = useState<AdminConversation | null>(null);
    const [messages, setMessages] = useState<AdminMessage[]>([]);

    useEffect(() => {
        adminRequest.getConversationDetail(conversationId)
            .then(data => {
                setConversation(data.conversation);
                setMessages(data.messages);
                setState('success');
            })
            .catch(err => {
                if (err instanceof AdminUnauthorizedError) {
                    setState('unauthorized');
                } else if (err instanceof Error && err.message === 'NOT_FOUND') {
                    setState('not_found');
                } else {
                    console.error('Admin: 拉取会话详情失败', err);
                    setState('error');
                }
            });
    }, [conversationId]);

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

            {/* 消息列表（只读） */}
            <div className="flex flex-col gap-3">
                {messages.length === 0 && (
                    <p className="text-muted-foreground text-sm">该会话暂无消息记录。</p>
                )}
                {messages.map(msg => {
                    // role: 0=USER, 1=ASSISTANT（与 ChatMessageRole 枚举对齐）
                    const isUser = msg.role === 0;

                    // type=3 OCR_CARD：渲染只读题目卡，JSON.parse 失败则回落纯文本
                    if (msg.type === ChatMessageType.OCR_CARD) {
                        try {
                            const { question } = JSON.parse(msg.content) as { question: SanitizedQuestion };
                            return (
                                <div key={msg.messageId} className="flex justify-start">
                                    <div className="max-w-[80%] border border-border rounded-lg px-4 py-3 bg-background text-foreground text-sm leading-relaxed">
                                        {/* 角色标签 */}
                                        <p className="text-[10px] text-muted-foreground mb-1 font-mono">引思助手</p>
                                        {/* 题目卡标签 */}
                                        <p className="text-[10px] text-muted-foreground mb-2 font-mono font-medium tracking-wide">
                                            题目卡
                                        </p>
                                        {/* 题目主题 */}
                                        <p className="font-semibold text-sm mb-1">{question.topic}</p>
                                        {/* 题干（走 Markdown + KaTeX 渲染，支持 $...$ 数学公式） */}
                                        <div className="break-words text-sm">
                                            <Markdown
                                                remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                                                rehypePlugins={[rehypeKatex]}
                                                components={markdownComponents}
                                            >
                                                {normalizeLatexDelimiters(question.latexFull)}
                                            </Markdown>
                                        </div>
                                        {/* 时间戳 */}
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            {new Date(msg.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                    </div>
                                </div>
                            );
                        } catch {
                            // JSON.parse 失败：数据损坏时回落纯文本，不整页崩溃
                            return (
                                <div key={msg.messageId} className="flex justify-start">
                                    <div className="max-w-[80%] border border-border rounded-lg px-4 py-3 bg-background text-foreground text-sm leading-relaxed">
                                        <p className="text-[10px] text-muted-foreground mb-1 font-mono">引思助手</p>
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {new Date(msg.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                    }

                    // type=4 KNOWLEDGE_CARD：渲染只读知识卡，JSON.parse 失败则回落纯文本
                    if (msg.type === ChatMessageType.KNOWLEDGE_CARD) {
                        try {
                            const { card } = JSON.parse(msg.content) as { card: KnowledgeCard };
                            return (
                                <div key={msg.messageId} className="flex justify-start">
                                    <div className="max-w-[80%]">
                                        {/* 角色标签 */}
                                        <p className="text-[10px] text-muted-foreground mb-1 font-mono">引思助手</p>
                                        {/* 知识卡标签 */}
                                        <p className="text-[10px] text-muted-foreground mb-2 font-mono font-medium tracking-wide">
                                            知识卡
                                        </p>
                                        {/* 只读知识卡，不传 onRetry */}
                                        <KnowledgeCardComponent data={card} />
                                        {/* 时间戳 */}
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            {new Date(msg.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                    </div>
                                </div>
                            );
                        } catch {
                            // JSON.parse 失败：数据损坏时回落纯文本，不整页崩溃
                            return (
                                <div key={msg.messageId} className="flex justify-start">
                                    <div className="max-w-[80%] border border-border rounded-lg px-4 py-3 bg-background text-foreground text-sm leading-relaxed">
                                        <p className="text-[10px] text-muted-foreground mb-1 font-mono">引思助手</p>
                                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-1">
                                            {new Date(msg.createdAt).toLocaleString('zh-CN')}
                                        </p>
                                    </div>
                                </div>
                            );
                        }
                    }

                    return (
                        <div
                            key={msg.messageId}
                            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[80%] px-4 py-3 rounded-lg text-sm leading-relaxed ${
                                    isUser
                                        ? 'bg-muted text-foreground'
                                        : 'bg-background border border-border text-foreground'
                                }`}
                            >
                                {/* 角色标签 */}
                                <p className="text-[10px] text-muted-foreground mb-1 font-mono">
                                    {isUser ? '用户' : '引思助手'}
                                </p>

                                {/* 图片（如有）：client 端签名（AdminMessageImage 子组件） */}
                                {msg.imgUrl ? (
                                    <AdminMessageImage imgUrl={msg.imgUrl} />
                                ) : null}

                                {/* 消息正文：user 用纯文本，assistant 用 Markdown+KaTeX */}
                                {isUser ? (
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                ) : (
                                    <div className="break-words">
                                        <Markdown
                                            remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={markdownComponents}
                                        >
                                            {normalizeLatexDelimiters(msg.content)}
                                        </Markdown>
                                    </div>
                                )}

                                {/* 时间戳 */}
                                <p className="text-[10px] text-muted-foreground mt-1">
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
