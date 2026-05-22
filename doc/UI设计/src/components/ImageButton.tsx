/**
 * 图片按钮三态：
 * - active：可点击，朱砂色
 * - triggers-P106：可点击但会触发换题浮层（朱砂 + hover tooltip）
 * - disabled：灰化 + 不可点
 *
 * 纸面调性：无背景填充，仅图标色区分状态。
 */
import { ImagePlus } from 'lucide-react'
import { cn } from '@/lib/classNames'

interface Props {
  state: 'active' | 'triggers-P106' | 'disabled'
  onClick?: () => void
}

export function ImageButton({ state, onClick }: Props) {
  const isDisabled = state === 'disabled'

  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      title={
        state === 'triggers-P106'
          ? '已有题目——点击将进入换题确认'
          : state === 'disabled'
          ? '当前无法上传图片'
          : '上传题目图片'
      }
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-sm',
        'transition-colors',
        state === 'disabled'
          ? 'text-ink-muted opacity-40 cursor-not-allowed bg-transparent'
          : 'text-vermilion hover:bg-paper-deep cursor-pointer',
      )}
    >
      <ImagePlus size={18} />
    </button>
  )
}
