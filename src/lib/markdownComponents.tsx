// 共享 react-markdown components 映射：黑白灰水墨排版，无彩色
// 供 ChatBubble（client）和 admin 详情页（RSC）共同复用
// 注意：不加 'use client'，必须能被 Server Component 直接导入

import type Markdown from 'react-markdown';

/** react-markdown components 映射：黑白灰水墨排版，无彩色 */
export const markdownComponents: React.ComponentProps<typeof Markdown>['components'] = {
  // 段落：上下留白，首段顶部 / 末段底部不留空
  p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
  // 强调：加粗即可，不改色
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  // 斜体
  em: ({ children }) => <em>{children}</em>,
  // 无序列表
  ul: ({ children }) => <ul className="list-disc pl-5 my-2">{children}</ul>,
  // 有序列表
  ol: ({ children }) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
  // 列表项
  li: ({ children }) => <li className="my-0.5">{children}</li>,
  // 行内代码
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 text-[0.9em] font-mono">{children}</code>
  ),
  // 链接：下划线，不改色
  a: ({ children, href }) => (
    <a href={href} className="underline underline-offset-2" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  // 标题降级为加粗小标题（聊天气泡不需要大标题层级）
  h1: ({ children }) => <p className="text-base font-semibold my-2">{children}</p>,
  h2: ({ children }) => <p className="text-base font-semibold my-2">{children}</p>,
  h3: ({ children }) => <p className="text-base font-semibold my-2">{children}</p>,
  h4: ({ children }) => <p className="text-base font-semibold my-2">{children}</p>,
  // 引用块：左边框 + muted 色
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 text-muted-foreground my-2">
      {children}
    </blockquote>
  ),
}
