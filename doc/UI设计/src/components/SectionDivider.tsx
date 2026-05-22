/**
 * 章节分隔符 ※ — 用于消息流中阶段切换边界。
 * 风格：钢笔批注横线 + 星章符。
 */

export function SectionDivider() {
  return (
    <div className="flex items-center justify-center my-6">
      <span
        className="text-ink-muted text-xs tracking-widest select-none"
        aria-hidden
      >
        ——— ※ ———
      </span>
    </div>
  )
}
