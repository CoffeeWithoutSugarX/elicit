/**
 * 家长后台统一布局。
 * 顶栏：Fraunces "家长后台" + 用户邮箱 + 退出按钮。
 * 主区域：Outlet（子路由渲染）。
 * 纸面调性：纯纸面 + 浅边线，不用 backdrop-blur 等现代效果。
 * 对应 PRD US-015（家长/监护人后台）。
 */
import { Outlet } from 'react-router'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/classNames'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-paper-canvas flex flex-col">
      {/* 顶栏 */}
      <header
        className={cn(
          'flex items-center justify-between px-6 py-3',
          'bg-paper-surface border-b border-ink-line',
        )}
      >
        {/* 左：品牌 + 模块名 */}
        <div className="flex items-center gap-3">
          <h1
            className="text-base text-ink-primary"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            引思助手
          </h1>
          <span className="text-ink-line" aria-hidden>|</span>
          <span
            className="text-xs text-ink-secondary tracking-widest"
            style={{
              fontFamily: 'var(--font-mono)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
            }}
          >
            家长后台
          </span>
        </div>

        {/* 右：邮箱 + 退出 */}
        <div className="flex items-center gap-4">
          <span
            className="text-xs text-ink-muted"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            parent@example.com
          </span>
          <button
            type="button"
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5',
              'text-xs text-ink-secondary rounded-sm',
              'border border-ink-line bg-paper-canvas',
              'hover:text-vermilion hover:border-vermilion transition-colors',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            <LogOut size={12} />
            退出
          </button>
        </div>
      </header>

      {/* 主区域 */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
