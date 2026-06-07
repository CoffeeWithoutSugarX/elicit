'use client';

// admin 页面消息渲染子组件
// 将 AdminConversationDetailPage 中三种消息类型分支提取为独立组件，主渲染只做类型分发

import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { markdownComponents } from '@/lib/markdownComponents';
import { normalizeLatexDelimiters } from '@/lib/katexHelpers';
import { ossRequest } from '@/services/api-client/OssRequest';
import { KnowledgeCard as KnowledgeCardComponent } from '@/features/chat/components/KnowledgeCard';
import type { SanitizedQuestion } from '@/agents/schemas/OcrSchema';
import type { KnowledgeCard } from '@/agents/schemas/KnowledgeCardSchema';
import type { AdminMessage } from '@/services/api-client/AdminRequest';

// ── 图片签名子组件（client 端挂载后签名，避免 server-only OssService） ──────────

function AdminMessageImage({ imgUrl }: { imgUrl: string }) {
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const url = await ossRequest.signImageForPreview(imgUrl);
                setSignedUrl(url);
            } catch (err) {
                console.error('Admin: 图片签名失败', imgUrl, err);
                setFailed(true);
            }
        })();
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

// ── 公共消息外壳：role 标签 + 对齐 + 时间戳 ─────────────────────────────────

interface AdminMessageWrapperProps {
    role: string;
    align?: 'start' | 'end';
    children: React.ReactNode;
    createdAt: string;
    extraClass?: string;
}

export function AdminMessageWrapper({ role, align = 'start', children, createdAt, extraClass = '' }: AdminMessageWrapperProps) {
    return (
        <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${extraClass}`}>
                <p className="text-[10px] text-muted-foreground mb-1 font-mono">{role}</p>
                {children}
                <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(createdAt).toLocaleString('zh-CN')}
                </p>
            </div>
        </div>
    );
}

// ── OCR 题目卡消息 ────────────────────────────────────────────────────────────

export function AdminOcrCardMessage({ msg }: { msg: AdminMessage }) {
    // JSON.parse 提前，避免在 JSX return 内 try/catch（lint 规则：no-jsx-in-try-catch）
    let question: SanitizedQuestion | null = null;
    try {
        question = (JSON.parse(msg.content) as { question: SanitizedQuestion }).question;
    } catch {
        // 数据损坏：回落纯文本
    }

    if (!question) {
        return (
            <AdminMessageWrapper
                role="引思助手"
                createdAt={msg.createdAt}
                extraClass="border border-border rounded-lg px-4 py-3 bg-background text-foreground text-sm leading-relaxed"
            >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </AdminMessageWrapper>
        );
    }

    return (
        <AdminMessageWrapper
            role="引思助手"
            createdAt={msg.createdAt}
            extraClass="border border-border rounded-lg px-4 py-3 bg-background text-foreground text-sm leading-relaxed"
        >
            <p className="text-[10px] text-muted-foreground mb-2 font-mono font-medium tracking-wide">
                题目卡
            </p>
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
        </AdminMessageWrapper>
    );
}

// ── 知识卡消息 ────────────────────────────────────────────────────────────────

export function AdminKnowledgeCardMessage({ msg }: { msg: AdminMessage }) {
    // JSON.parse 提前，避免在 JSX return 内 try/catch
    let card: KnowledgeCard | null = null;
    try {
        card = (JSON.parse(msg.content) as { card: KnowledgeCard }).card;
    } catch {
        // 数据损坏：回落纯文本
    }

    if (!card) {
        return (
            <AdminMessageWrapper
                role="引思助手"
                createdAt={msg.createdAt}
                extraClass="border border-border rounded-lg px-4 py-3 bg-background text-foreground text-sm leading-relaxed"
            >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </AdminMessageWrapper>
        );
    }

    return (
        <AdminMessageWrapper role="引思助手" createdAt={msg.createdAt}>
            <p className="text-[10px] text-muted-foreground mb-2 font-mono font-medium tracking-wide">
                知识卡
            </p>
            {/* 只读知识卡，不传 onRetry */}
            <KnowledgeCardComponent data={card} />
        </AdminMessageWrapper>
    );
}

// ── 普通文本消息（用户/助手） ──────────────────────────────────────────────────

export function AdminTextMessage({ msg }: { msg: AdminMessage }) {
    // role: 0=USER, 1=ASSISTANT（与 ChatMessageRole 枚举对齐）
    const isUser = msg.role === 0;

    return (
        <AdminMessageWrapper
            role={isUser ? '用户' : '引思助手'}
            align={isUser ? 'end' : 'start'}
            createdAt={msg.createdAt}
            extraClass={`px-4 py-3 rounded-lg text-sm leading-relaxed ${
                isUser
                    ? 'bg-muted text-foreground'
                    : 'bg-background border border-border text-foreground'
            }`}
        >
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
        </AdminMessageWrapper>
    );
}
