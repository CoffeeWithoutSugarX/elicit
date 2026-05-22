/**
 * CameraView — 拍照 / 相册上传入口（inline，占据整个 main 区域）。
 * 取代原 P102Upload 浮层卡片版。
 *
 * 状态机：
 *   idle     — 默认取景框（深色矩形 + 十字线 + L 形定位角）
 *   gallery  — 相册缩略图 grid（mock 4 张）
 *   preview  — 拍后 / 选图后预览（图片 + 重拍 + 确认上传）
 *   done     — 确认上传成功提示
 *
 * 不调摄像头 API，全部为 mock 视觉。
 * 对应 PRD P-102 / US-001 / US-002。
 */
import { useState } from 'react'
import { X, Camera, Images, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/classNames'

type ViewState = 'idle' | 'gallery' | 'preview' | 'done'

/** mock 相册缩略图列表 */
const GALLERY_ITEMS = [
  { id: 1, src: '/mock-images/sample-quadratic.svg', label: '二次函数题' },
  { id: 2, src: '/mock-images/sample-geometry.svg',  label: '几何题' },
  { id: 3, src: '/mock-images/sample-quadratic.svg', label: '二次函数题 2' },
  { id: 4, src: '/mock-images/sample-geometry.svg',  label: '几何题 2' },
]

export function CameraView() {
  const navigate = useNavigate()
  const [viewState, setViewState] = useState<ViewState>('idle')
  const [selectedImage, setSelectedImage] = useState<string>('/mock-images/sample-quadratic.svg')

  function handleCancel() {
    navigate('/chat/p101-empty')
  }

  function handleShutter() {
    // 快门：进入预览态（使用 mock 图片）
    setSelectedImage('/mock-images/sample-quadratic.svg')
    setViewState('preview')
  }

  function handleGallerySelect(src: string) {
    setSelectedImage(src)
    setViewState('preview')
  }

  function handleRetake() {
    setViewState('idle')
  }

  function handleConfirmUpload() {
    setViewState('done')
  }

  if (viewState === 'done') {
    return (
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-paper-canvas">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xs w-full bg-paper-surface border border-ink-line rounded-md shadow-paper-md p-8 text-center">
            <p
              className="text-3xl text-vermilion mb-3"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              ✓
            </p>
            <p
              className="text-sm text-ink-primary mb-1"
              style={{ fontFamily: 'var(--font-body)', fontWeight: 500 }}
            >
              上传成功！
            </p>
            <p
              className="text-xs text-ink-muted"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              OCR 识别中…
            </p>
            <button
              type="button"
              onClick={() => setViewState('idle')}
              className="mt-5 text-xs text-ink-muted underline"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              返回演示
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-ink-primary">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-ink-primary border-b border-ink-line/20">
        {/* 左：取消按钮 */}
        <button
          type="button"
          onClick={handleCancel}
          className="w-9 h-9 inline-flex items-center justify-center rounded-sm text-paper-surface hover:text-paper-deep transition-colors"
          aria-label="取消，返回"
        >
          <X size={20} />
        </button>

        {/* 中：标题 */}
        <h1
          className="text-sm font-medium text-paper-surface"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {viewState === 'gallery' ? '从相册选择' : '拍照'}
        </h1>

        {/* 右：占位（保持对称） */}
        <div className="w-9" aria-hidden />
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col items-center justify-between py-6 px-4">

        {/* 取景框 / 相册 / 预览 */}
        <div className="flex-1 flex items-center justify-center w-full">
          {viewState === 'idle' && <Viewfinder />}
          {viewState === 'gallery' && (
            <GalleryGrid onSelect={handleGallerySelect} />
          )}
          {viewState === 'preview' && (
            <ImagePreview src={selectedImage} />
          )}
        </div>

        {/* 底部控制区 */}
        <div className="w-full mt-6">
          {viewState === 'idle' && (
            <IdleControls
              onShutter={handleShutter}
              onGallery={() => setViewState('gallery')}
            />
          )}
          {viewState === 'gallery' && (
            <GalleryControls onBack={() => setViewState('idle')} />
          )}
          {viewState === 'preview' && (
            <PreviewControls
              onRetake={handleRetake}
              onConfirm={handleConfirmUpload}
            />
          )}
        </div>
      </div>
    </div>
  )
}

/** 取景框：深色矩形 + 十字线 + 四角 L 形定位线 */
function Viewfinder() {
  return (
    <div
      className="relative w-full"
      style={{ aspectRatio: '4/3', maxWidth: '480px' }}
    >
      {/* 取景框主体 */}
      <div className="w-full h-full bg-ink-deep/60 rounded-md flex items-center justify-center relative overflow-hidden">
        {/* 十字线 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          {/* 水平线 */}
          <div
            className="absolute w-8 h-px"
            style={{ background: 'rgba(255,255,255,0.4)' }}
          />
          {/* 垂直线 */}
          <div
            className="absolute h-8 w-px"
            style={{ background: 'rgba(255,255,255,0.4)' }}
          />
        </div>

        {/* 四角 L 形定位线 */}
        {/* 左上 */}
        <div className="absolute top-3 left-3" aria-hidden>
          <div className="w-5 h-px bg-paper-surface/70" />
          <div className="w-px h-5 bg-paper-surface/70 mt-0" />
        </div>
        {/* 右上 */}
        <div className="absolute top-3 right-3" aria-hidden>
          <div className="w-5 h-px bg-paper-surface/70 ml-auto" />
          <div className="w-px h-5 bg-paper-surface/70 ml-auto" />
        </div>
        {/* 左下 */}
        <div className="absolute bottom-3 left-3" aria-hidden>
          <div className="w-px h-5 bg-paper-surface/70" />
          <div className="w-5 h-px bg-paper-surface/70" />
        </div>
        {/* 右下 */}
        <div className="absolute bottom-3 right-3" aria-hidden>
          <div className="w-px h-5 bg-paper-surface/70 ml-auto" />
          <div className="w-5 h-px bg-paper-surface/70 ml-auto" />
        </div>

        {/* 提示文字 */}
        <p
          className="text-paper-surface/50 text-xs text-center px-4"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          将题目对准取景框
        </p>
      </div>
    </div>
  )
}

/** 相册 grid：mock 4 张图 */
function GalleryGrid({ onSelect }: { onSelect: (src: string) => void }) {
  return (
    <div className="w-full" style={{ maxWidth: '480px' }}>
      <div className="grid grid-cols-2 gap-2">
        {GALLERY_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.src)}
            className={cn(
              'rounded-md overflow-hidden border-2 border-transparent',
              'hover:border-vermilion transition-all',
              'bg-paper-deep aspect-[4/3]',
            )}
          >
            <img
              src={item.src}
              alt={item.label}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  )
}

/** 图片预览 */
function ImagePreview({ src }: { src: string }) {
  return (
    <div
      className="w-full rounded-md overflow-hidden border border-ink-line/30 image-preview-container"
      style={{ maxWidth: '480px', aspectRatio: '4/3' }}
    >
      <img
        src={src}
        alt="题目图片预览"
        className="w-full h-full object-contain bg-paper-deep"
      />
    </div>
  )
}

/** 取景框底部控制：快门 + 从相册 */
function IdleControls({
  onShutter,
  onGallery,
}: {
  onShutter: () => void
  onGallery: () => void
}) {
  return (
    <div className="flex items-center justify-center relative">
      {/* 中央快门按钮 */}
      <button
        type="button"
        onClick={onShutter}
        className={cn(
          'w-16 h-16 rounded-full',
          'border-4 border-paper-surface',
          'bg-vermilion',
          'hover:opacity-90 active:scale-95 transition-all',
          'shadow-paper-lg',
        )}
        aria-label="拍照"
      />

      {/* 右下角：从相册 */}
      <button
        type="button"
        onClick={onGallery}
        className={cn(
          'absolute right-0',
          'inline-flex flex-col items-center gap-1',
          'text-paper-surface/80 hover:text-paper-surface transition-colors',
        )}
        aria-label="从相册选择"
      >
        <Images size={20} />
        <span className="text-[10px]" style={{ fontFamily: 'var(--font-body)' }}>
          从相册
        </span>
      </button>
    </div>
  )
}

/** 相册模式底部控制：返回 */
function GalleryControls({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={onBack}
        className={cn(
          'px-6 py-2.5 text-sm rounded-md',
          'border border-ink-line/40 text-paper-surface/80',
          'bg-ink-deep/60 hover:bg-ink-deep/80 transition-colors',
        )}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        返回拍照
      </button>
    </div>
  )
}

/** 预览模式底部控制：重拍 + 确认上传 */
function PreviewControls({
  onRetake,
  onConfirm,
}: {
  onRetake: () => void
  onConfirm: () => void
}) {
  return (
    <div className="flex gap-3 justify-center">
      {/* 重拍（次级） */}
      <button
        type="button"
        onClick={onRetake}
        className={cn(
          'inline-flex items-center gap-2',
          'px-5 py-2.5 text-sm rounded-md',
          'border border-ink-line/40 text-paper-surface/80',
          'bg-ink-deep/60 hover:bg-ink-deep/80 transition-colors',
        )}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <RefreshCw size={15} />
        重拍
      </button>

      {/* 确认上传（CTA） */}
      <button
        type="button"
        onClick={onConfirm}
        className={cn(
          'inline-flex items-center gap-2',
          'px-6 py-2.5 text-sm rounded-md',
          'bg-vermilion text-paper-surface',
          'hover:opacity-90 active:scale-95 transition-all',
          'shadow-paper-sm font-medium',
        )}
        style={{ fontFamily: 'var(--font-body)' }}
      >
        <Camera size={15} />
        确认上传
      </button>
    </div>
  )
}
