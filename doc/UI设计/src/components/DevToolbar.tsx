import { Wrench } from 'lucide-react'
import { cn } from '@/lib/classNames'

/**
 * 右下角固定调试面板。
 * Batch 1：shell 占位，仅展示标题与副标题。
 * Batch 2 再接入 scenario 切换 + 流速控制逻辑。
 */
export function DevToolbar() {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex flex-col gap-1 px-4 py-3',
        'bg-bg-elevated border border-border-subtle',
        'rounded-lg shadow-md',
        'min-w-48',
      )}
    >
      <div className="flex items-center gap-2 text-text-primary font-semibold text-sm">
        <Wrench size={14} className="text-primary" />
        <span>DevToolbar</span>
      </div>
      <p className="text-text-muted text-xs leading-relaxed">
        Batch 1 shell · scenarios 占位
      </p>
    </div>
  )
}
