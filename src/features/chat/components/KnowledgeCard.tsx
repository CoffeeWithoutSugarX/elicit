'use client'

/**
 * P-105 知识点卡片 — shadcn Card 容器。
 * 顶部 ≡ ≡ ≡ 装饰 / 标题居中
 * 区块标题用 Fraunces small caps / 思路步骤用罗马数字编号
 * 小问进展用图标 + Badge(outline/secondary) 区分状态（全灰阶，无彩色）
 * 「再来一题」使用 shadcn Button default
 */
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Fragment } from 'react'
import { LatexRender } from '@/components/LatexRender'
import { parseLatexSegments } from '@/lib/katexHelpers'
import { toRoman } from '@/lib/numerals'
import type { KnowledgeCard } from '@/agents/schemas/KnowledgeCardSchema'
import { MethodCategoryEnum } from '@/types/enums/methodCategory.enum'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Props {
  data: KnowledgeCard
  onRetry?: () => void
}

/** 渲染含 LaTeX 的混合文本 */
function renderMixed(content: string) {
  const segments = parseLatexSegments(content)
  return segments.map((seg, idx) => {
    if (seg.type === 'latex-block') {
      return <LatexRender key={idx} tex={seg.content} display="block" />
    }
    if (seg.type === 'latex-inline') {
      return <LatexRender key={idx} tex={seg.content} display="inline" />
    }
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

/** Fraunces small caps 区块标题 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-xs text-muted-foreground mb-1.5 tracking-widest uppercase"
      style={{
        fontFamily: 'var(--font-display)',
        fontFeatureSettings: '"smcp"',
        letterSpacing: '0.1em',
      }}
    >
      {children}
    </h3>
  )
}

export function KnowledgeCard({ data, onRetry }: Props) {
  const { knowledgePoints, methods, insight, subProblemSummaries } = data

  return (
    <Card className="w-full max-w-2xl mx-auto gap-5">
      {/* CardHeader：顶部装饰 + 标题 */}
      <CardHeader className="flex-col items-center gap-2 pb-0">
        {/* ≡ ≡ ≡ 顶部装饰 */}
        <div
          className="flex items-center justify-center gap-3 text-border tracking-widest"
          aria-hidden
        >
          <span style={{ fontSize: '1.2em' }}>≡</span>
          <span style={{ fontSize: '1.2em' }}>≡</span>
          <span style={{ fontSize: '1.2em' }}>≡</span>
        </div>

        {/* 标题 */}
        <CardTitle
          className="text-xl text-center text-card-foreground"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
        >
          知识点 + 思路总结
        </CardTitle>
      </CardHeader>

      {/* CardContent：所有正文内容区块 */}
      <CardContent className="flex flex-col gap-5">
        {/* ① 核心思路 insight */}
        <section>
          <SectionTitle>核心思路</SectionTitle>
          <div
            className="text-sm leading-relaxed text-card-foreground"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {renderMixed(insight)}
          </div>
        </section>

        {/* ② 知识点（竖线列表） */}
        <section>
          <SectionTitle>涉及知识点</SectionTitle>
          <ul className="flex flex-col gap-1">
            {knowledgePoints.map((kp, i) => (
              <li
                key={i}
                className="flex items-baseline gap-2 text-sm text-card-foreground"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                <span
                  className="flex-shrink-0 text-xs text-muted-foreground"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  {toRoman(i + 1)}.
                </span>
                <span>
                  {kp.name}
                  {kp.textbookRef ? (
                    <span className="text-muted-foreground text-xs ml-1">（{kp.textbookRef}）</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* ③ 解题方法（罗马数字编号） */}
        <section>
          <SectionTitle>解题方法</SectionTitle>
          <ol className="flex flex-col gap-3">
            {methods.map((method, i) => {
              const categoryLabel = MethodCategoryEnum.getLabel(method.category)
              return (
                <li
                  key={i}
                  className={cn(
                    'flex gap-3 p-3 rounded-sm',
                    'bg-muted border border-border',
                  )}
                >
                  {/* 罗马数字题号（IBM Plex Mono） */}
                  <span
                    className="flex-shrink-0 text-xs text-muted-foreground leading-6"
                    style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, minWidth: '1.5rem' }}
                  >
                    {toRoman(i + 1)}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-medium text-card-foreground mb-0.5"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {method.name}
                    </p>
                    {categoryLabel ? (
                      <p className="text-xs text-muted-foreground" style={{ fontFamily: 'var(--font-body)' }}>
                        {categoryLabel}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>

        {/* ④ 小问汇总（可选） */}
        {subProblemSummaries && subProblemSummaries.length > 0 ? (
          <section>
            <SectionTitle>小问进展</SectionTitle>
            <ul className="flex flex-col gap-2">
              {subProblemSummaries.map((sp) => {
                const isDone = sp.status === 'done'
                return (
                  <li
                    key={sp.index}
                    className={cn(
                      'p-3 rounded-sm border border-border',
                      isDone ? 'bg-muted/40' : 'bg-background',
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {isDone ? (
                        <CheckCircle2 size={13} className="text-foreground" />
                      ) : (
                        <AlertCircle size={13} className="text-muted-foreground" />
                      )}
                      {/* Badge 用 secondary（灰底）表示完成，outline 表示未突破 */}
                      <Badge
                        variant={isDone ? 'secondary' : 'outline'}
                        className="text-xs"
                        style={{ fontFamily: 'var(--font-display)', fontFeatureSettings: '"smcp"' }}
                      >
                        小问 {toRoman(sp.index + 1)} · {isDone ? '已完成' : '（未突破）'}
                      </Badge>
                    </div>
                    {isDone ? (
                      sp.insightPoints.length > 0 ? (
                        <ul className="text-xs text-muted-foreground list-none space-y-0.5 pl-4">
                          {sp.insightPoints.map((p, i) => (
                            <li key={i} className="flex gap-1">
                              <span className="text-muted-foreground" style={{ fontFamily: 'var(--font-mono)' }}>·</span>
                              <span>{renderMixed(p)}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null
                    ) : sp.blockedHint ? (
                      <p className="text-xs text-muted-foreground leading-relaxed pl-4">
                        {renderMixed(sp.blockedHint)}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </CardContent>

      {/* CardFooter：再来一题按钮，右对齐 */}
      <CardFooter className="justify-end pt-0">
        <Button
          type="button"
          variant="default"
          onClick={onRetry}
          style={{
            fontFamily: 'var(--font-display)',
            fontFeatureSettings: '"smcp"',
            letterSpacing: '0.06em',
          }}
        >
          再来一题
        </Button>
      </CardFooter>
    </Card>
  )
}
