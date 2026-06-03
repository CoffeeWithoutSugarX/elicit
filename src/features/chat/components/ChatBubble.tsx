'use client'

/**
 * 三态消息气泡：user / assistant / system。
 * 支持内嵌 LaTeX：检测 $...$ / $$...$$ 分隔符并分段渲染。
 * isStreaming=true 时在尾部显示块状光标（▍，primary 色闪烁）。
 *
 * 设计：
 * - user：右对齐，bg-muted 圆角软包 + 右侧 Avatar（bg-muted/text-foreground，衬线"妹"），无 border / shadow
 * - assistant：左对齐，Avatar（bg-foreground/text-background，衬线"引"）+ 右侧纯文字内容，无气泡背景
 * - system：居中纯文字，无气泡
 *
 * imgUrl（可选）：OSS 对象 key，仅在 user 气泡中渲染。
 * 使用 IntersectionObserver 懒加载，进入视口后调用 ossRequest.signImageForPreview() 获取签名 URL。
 */
import { Fragment, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { parseLatexSegments } from '@/lib/katexHelpers'
import { LatexRender } from '@/components/LatexRender'
import { PHASE_LABEL } from '@/lib/theme'
import type { PolyaPhase } from '@/lib/theme'
import { ossRequest } from '@/services/api-client/OssRequest'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Props {
  role: 'user' | 'assistant' | 'system'
  content: string
  imgUrl?: string | null
  phaseLabel?: string
  timestamp?: Date
  isStreaming?: boolean
}

/** 将一段含 LaTeX 的字符串渲染为 React 节点序列 */
function renderContent(content: string) {
  const segments = parseLatexSegments(content)
  return segments.map((seg, idx) => {
    if (seg.type === 'latex-block') {
      return <LatexRender key={idx} tex={seg.content} display="block" />
    }
    if (seg.type === 'latex-inline') {
      return <LatexRender key={idx} tex={seg.content} display="inline" />
    }
    // 普通文本：保留换行
    return (
      <Fragment key={idx}>
        {seg.content.split('\n').map((line, i, arr) => (
          <Fragment key={i}>
            {line}
            {i < arr.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </Fragment>
    )
  })
}

/** 将 Date 格式化为中文相对时间描述 */
function formatTimestamp(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return '刚才'
  if (diffMin < 60) return `${diffMin} 分钟前`

  // 同一天（按本地日期判断）
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isSameDay) {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `今天 ${hh}:${mm}`
  }

  if (diffDays < 7) return `${diffDays} 天前`

  // 超过 7 天：MM-DD HH:mm
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}

/** agent 气泡顶部阶段 badge（可选） */
function PhaseBadge({ phaseLabel }: { phaseLabel: string }) {
  return (
    <div
      className="inline-flex items-center mb-1.5 text-muted-foreground rounded bg-muted"
      style={{
        fontSize: '11px',
        fontFamily: 'var(--font-display)',
        letterSpacing: '0.04em',
        padding: '2px 8px',
      }}
    >
      {phaseLabel}
    </div>
  )
}

export function ChatBubble({ role, content, imgUrl, phaseLabel, timestamp, isStreaming }: Props) {
  // 图片懒加载：IntersectionObserver + OSS 签名（仅 user 气泡有 imgUrl）
  const imageWrapperRef = useRef<HTMLDivElement | null>(null)
  const [isInView, setIsInView] = useState(false)
  const [signedImageUrl, setSignedImageUrl] = useState<string | null>(null)
  const isSigningRef = useRef(false)

  // Effect 1：挂载 IntersectionObserver，进入视口时标记 isInView
  useEffect(() => {
    if (!imgUrl) return
    const node = imageWrapperRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true)
        }
      },
      { root: null, rootMargin: '120px', threshold: 0.1 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [imgUrl])

  // Effect 2：isInView 后签名 OSS URL
  useEffect(() => {
    if (!imgUrl || !isInView || signedImageUrl || isSigningRef.current) return
    let isCancelled = false
    isSigningRef.current = true
    ossRequest
      .signImageForPreview(imgUrl)
      .then((url) => {
        if (!isCancelled) setSignedImageUrl(url)
      })
      .catch((error) => {
        console.error('获取图片预览签名失败', error)
      })
      .finally(() => {
        isSigningRef.current = false
      })
    return () => {
      isCancelled = true
    }
  }, [imgUrl, isInView, signedImageUrl])

  // system 消息：居中纯文字，无气泡背景
  if (role === 'system') {
    return (
      <div className="flex justify-center my-3">
        <span
          className="text-muted-foreground text-xs tracking-wide px-2"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {content}
        </span>
      </div>
    )
  }

  const isUser = role === 'user'
  const timestampStr = timestamp ? formatTimestamp(timestamp) : ''

  // 从 PHASE_LABEL 解析阶段标签（支持传入已解析的 phaseLabel 或原始 PolyaPhase key）
  const resolvedPhaseLabel = phaseLabel
    ? (PHASE_LABEL[phaseLabel as PolyaPhase] ?? phaseLabel)
    : undefined

  if (isUser) {
    return (
      <div className="group flex w-full my-6 justify-end items-start gap-3">
        {/* 气泡内容区：浅灰 muted 圆角软包，max-w-[78%] 保留 */}
        <div className="relative max-w-[78%]">
          <div
            className="px-4 py-3 text-base leading-relaxed rounded-lg bg-muted text-foreground"
            style={{
              fontFamily: 'var(--font-body)',
            }}
          >
            {/* 图片预览区：仅 user 气泡有 imgUrl 时渲染 */}
            {imgUrl ? (
              <div
                ref={imageWrapperRef}
                className="relative mb-3 w-56 sm:w-64 rounded-lg overflow-hidden bg-background"
                style={{
                  aspectRatio: '4/3',
                }}
              >
                {signedImageUrl ? (
                  <Image
                    src={signedImageUrl}
                    alt="图片预览"
                    fill
                    sizes="(max-width: 768px) 70vw, 320px"
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                    {isInView ? '图片加载中...' : '图片待加载'}
                  </div>
                )}
              </div>
            ) : null}
            <div className="break-words">
              {renderContent(content)}
            </div>
          </div>
          {/* hover 时右下角显示时间戳 */}
          {timestampStr ? (
            <div
              className={cn(
                'absolute -bottom-4 right-0',
                'text-[10px] text-muted-foreground',
                'opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap',
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {timestampStr}
            </div>
          ) : null}
        </div>
        {/* 32px 圆形用户头像，右侧，浅灰底 + 深墨字（与 agent 头像反色对称） */}
        <Avatar aria-hidden className="border border-border">
          <AvatarFallback className="bg-muted text-foreground text-base font-medium">
            妹
          </AvatarFallback>
        </Avatar>
      </div>
    )
  }

  // assistant 气泡：32px 圆形水墨头像（衬线"引"）+ 右侧纯文字内容，无气泡背景
  return (
    <div className="group flex w-full my-6 justify-start items-start gap-3">
      {/* 32px 圆形头像，固定水墨色（实心黑底白字） */}
      <Avatar aria-hidden>
        <AvatarFallback className="bg-foreground text-background text-base font-medium">
          引
        </AvatarFallback>
      </Avatar>
      {/* 右侧内容区：纯文字，无背景无边框 */}
      <div className="relative flex-1 min-w-0 py-1">
        <div
          className="text-base leading-relaxed text-foreground"
          style={{
            fontFamily: 'var(--font-body)',
          }}
        >
          {resolvedPhaseLabel ? <PhaseBadge phaseLabel={resolvedPhaseLabel} /> : null}
          <div className="break-words">
            {renderContent(content)}
            {isStreaming ? (
              // 块状光标，foreground 色闪烁
              <span
                className="inline-block ml-0.5 align-middle animate-pulse text-foreground"
                style={{ fontSize: '1em', lineHeight: 1 }}
                aria-hidden
              >
                ▍
              </span>
            ) : null}
          </div>
        </div>
        {/* hover 时右下角显示时间戳 */}
        {timestampStr ? (
          <div
            className={cn(
              'absolute -bottom-4 right-0',
              'text-[10px] text-muted-foreground',
              'opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {timestampStr}
          </div>
        ) : null}
      </div>
    </div>
  )
}
