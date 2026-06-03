'use client'

/**
 * 聊天输入框：现代 AI chat 单盒子风格（shadcn 组件版）。
 * 整个输入区是一个统一的圆角大盒子，内部上下分区：
 * - 上区：Textarea（透明无边框，融入外层盒子）
 * - 下区：左下图片按钮（ghost icon）+ 右下 ArrowUp 发送按钮（default icon）
 *
 * 外层 bg-background，无 border-t，与对话区无硬切。
 * 聚焦时盒子 border 加深（focus-within），不给 Textarea 加 ring。
 * 回车发送，Shift+Enter 换行；disabled 时整体灰化。
 */
import { useState, useRef, useEffect } from 'react'
import { ArrowUp, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConversation } from '@/stores/useConversation'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface Props {
  onSendMessage: (text: string, imageUrl?: string) => void
  disabled?: boolean
  placeholder?: string
  showImageButton?: boolean
  onImageUpload?: (file: File) => Promise<string>
}

export function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = '回复 agent…',
  showImageButton = true,
  onImageUpload,
}: Props) {
  const [text, setText] = useState('')
  const [pendingImageUrl, setPendingImageUrl] = useState<string | undefined>()
  const [pendingImagePreview, setPendingImagePreview] = useState<string | undefined>()
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const draftMessage = useConversation(state => state.draftMessage)

  // 发送失败回滚：将草稿内容还原到输入框
  useEffect(() => {
    if (!draftMessage) return
    setText(draftMessage.text)
    if (draftMessage.imgUrl) {
      setPendingImageUrl(draftMessage.imgUrl)
    }
    // 还原后清除 store 中的草稿，避免重复触发
    useConversation.setState({ draftMessage: null })
  }, [draftMessage])

  function handleSubmit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSendMessage(trimmed, pendingImageUrl)
    setText('')
    if (pendingImagePreview) URL.revokeObjectURL(pendingImagePreview)
    setPendingImageUrl(undefined)
    setPendingImagePreview(undefined)
    // 复位高度
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  function handleInput(e: React.FormEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget
    // 自适应高度（最多 200px）
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }

  async function handleImageButtonClick() {
    if (!showImageButton) return
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (onImageUpload) {
      setPendingImagePreview(URL.createObjectURL(file))
      setIsUploading(true)
      try {
        const url = await onImageUpload(file)
        setPendingImageUrl(url)
      } finally {
        setIsUploading(false)
      }
    }
    // 重置 input，允许重复选同一文件
    e.target.value = ''
  }

  const canSend = !!text.trim() && !disabled && !isUploading

  return (
    /* 外层容器：bg-background，无 border-t，与对话区无硬切 */
    <div className={cn('bg-background px-4 py-4', disabled && 'opacity-60 pointer-events-none')}>
      {/* 内层限宽居中 */}
      <div className="max-w-[768px] mx-auto">
        {/* 图片预览区（有待上传图片时显示） */}
        {pendingImagePreview ? (
          <div className="mb-2 flex items-center gap-2 px-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImagePreview}
              alt="待发送图片"
              className="h-16 w-16 object-cover rounded border border-border"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                URL.revokeObjectURL(pendingImagePreview)
                setPendingImageUrl(undefined)
                setPendingImagePreview(undefined)
              }}
              className="text-xs text-muted-foreground"
            >
              移除
            </Button>
          </div>
        ) : null}

        {/* 盒子：圆角、border、shadow，focus-within 时 border 加深 */}
        <div
          className={cn(
            'flex flex-col',
            'bg-background border border-border rounded-2xl shadow-sm',
            'focus-within:border-ring transition-colors',
          )}
        >
          {/* 上区：Textarea，覆盖 shadcn 默认边框/ring/圆角，使其融入外层盒子 */}
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className={cn(
              // 移除 shadcn 默认的 border、shadow、ring、圆角、min-height，融入外层盒子
              'border-0 shadow-none focus-visible:ring-0 focus-visible:border-transparent rounded-none',
              // 布局与间距
              'w-full bg-transparent resize-none',
              'px-4 pt-3 pb-1',
              'min-h-[44px] max-h-[200px] overflow-y-auto',
              // 移除 field-sizing-content（由 onInput 手动控制高度）
              '[field-sizing:unset]',
            )}
          />

          {/* 下区：操作行 */}
          <div className="flex items-center justify-between px-2 pb-2">
            {/* 左侧：图片按钮（可选） */}
            {showImageButton ? (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={handleImageButtonClick}
                      disabled={disabled || isUploading}
                      aria-label="上传图片"
                      className="rounded-full"
                    >
                      <Camera size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isUploading ? '上传中…' : '上传题目（拍照 / 相册）'}
                  </TooltipContent>
                </Tooltip>
                {/* 隐藏文件 input，实际由图片按钮触发 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </>
            ) : (
              <div /> /* 占位，保持右侧按钮靠右 */
            )}

            {/* 右侧：发送按钮（圆形，ArrowUp，default variant = bg-primary） */}
            <Button
              type="button"
              variant="default"
              size="icon-sm"
              onClick={handleSubmit}
              disabled={!canSend}
              aria-label="发送"
              className="rounded-full"
            >
              <ArrowUp size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
