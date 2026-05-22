/**
 * 图片按钮三态：
 * - active：可点击，灰色图标 + hover 浅底
 * - triggers-P106：可点击但会触发换题浮层（深墨色 + hover tooltip）
 * - disabled：灰化 + 不可点
 *
 * 纸面调性：圆形小图标，无 border，无朱砂色，融入新盒子容器风格。
 * Batch 4+：图标 Camera size 16，圆形 w-8 h-8，hover 浅底灰色。
 */
import { Camera } from 'lucide-react'
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
          : '上传题目（拍照 / 相册）'
      }
      className={cn(
        'w-8 h-8 rounded-full inline-flex items-center justify-center',
        'bg-transparent transition-colors',
        state === 'disabled'
          ? 'text-ink-muted opacity-40 cursor-not-allowed'
          : state === 'triggers-P106'
          ? 'text-ink-deep hover:bg-paper-deep cursor-pointer'
          : 'text-ink-secondary hover:text-ink-primary hover:bg-paper-deep cursor-pointer',
      )}
    >
      <Camera size={16} />
    </button>
  )
}
