/**
 * 章节分隔符 — 用于消息流中阶段切换边界。
 * 笔记本系主题（notebook / notebook-pro / dark-scholar）：显示 ——— ※ ———
 * 其他主题（minimal / warm-ai）：显示细横线
 * 通过 CSS class（globals.css 中 [data-theme] 块控制 display）实现，无需 JS 读取主题。
 */

export function SectionDivider() {
  return (
    <div className="my-6">
      {/* 笔记本系主题：※ 分隔符（CSS 控制显隐） */}
      <div
        className="section-divider-symbol flex items-center justify-center"
        aria-hidden
      >
        <span
          className="text-ink-muted text-xs tracking-widest select-none"
        >
          ——— ※ ———
        </span>
      </div>

      {/* 其他主题：细横线（CSS 控制显隐） */}
      <hr
        className="section-divider-hr border-none border-t border-ink-line"
        style={{ height: '1px', background: 'var(--color-ink-line)' }}
        aria-hidden
      />
    </div>
  )
}
