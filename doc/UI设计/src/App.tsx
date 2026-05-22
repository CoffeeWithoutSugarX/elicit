/**
 * 应用路由表 — Batch 3 全部路由（Batch 4 主题系统更新）。
 * 17 scenario 全覆盖：auth / upload / polya / card-overlay / admin。
 * Batch 4：新增 5 主题系统，App 挂载时初始化 data-theme。
 */
import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { DevToolbar } from '@/components/DevToolbar'
import { PHASE_LABEL, SIGNAL_LABEL, colors } from '@/styles/theme'
import { usePreviewStore } from '@/stores/usePreviewStore'
import { ChatLayout } from '@/routes/chat/ChatLayout'
import { P104Phase } from '@/routes/chat/P104Phase'
import { LoginRoute } from '@/routes/LoginRoute'
import { P101Empty } from '@/routes/chat/P101Empty'
import { CameraView } from '@/routes/chat/CameraView'
import { P103MultiQuestion } from '@/routes/chat/P103MultiQuestion'
import { P103SingleQuestion } from '@/routes/chat/P103SingleQuestion'
import { P105Card } from '@/routes/chat/P105Card'
import { P106SwapConfirm } from '@/routes/chat/P106SwapConfirm'
import { HistoryResume } from '@/routes/chat/HistoryResume'
import { LongConversation } from '@/routes/chat/LongConversation'
import { AdminLayout } from '@/routes/admin/AdminLayout'
import { ConversationList } from '@/routes/admin/ConversationList'
import { ConversationDetail } from '@/routes/admin/ConversationDetail'

/** 首页占位卡片：drop-cap "T" + Fraunces 标题 + 数学笔记本色板预览 */
function HomePage() {
  return (
    <main
      className="min-h-screen bg-paper-canvas flex items-center justify-center p-8"
    >
      <div
        className="bg-paper-surface border border-ink-line rounded-sm shadow-paper-lg p-8 max-w-lg w-full"
      >
        {/* ≡ ≡ ≡ 顶部装饰 */}
        <div
          className="flex items-center justify-center gap-3 text-ink-line tracking-widest mb-6"
          aria-hidden
        >
          <span style={{ fontSize: '1.2em' }}>≡</span>
          <span style={{ fontSize: '1.2em' }}>≡</span>
          <span style={{ fontSize: '1.2em' }}>≡</span>
        </div>

        {/* 首字下沉标题段落 */}
        <div className="mb-6">
          <p
            className="text-base leading-relaxed text-ink-primary drop-cap"
            style={{ fontFamily: 'var(--font-body)' }}
          >
            The 引思助手 UI 高保真原型，采用数学笔记本 × 钢笔批改美学。
            Batch 3 全部 17 scenario 已落地 · 可通过 DevToolbar 切换，
            或直接访问对应路由查看各页面状态。
          </p>
        </div>

        {/* 章节标题：Fraunces small caps */}
        <h2
          className="text-xs text-ink-secondary mb-3 tracking-widest uppercase"
          style={{
            fontFamily: 'var(--font-display)',
            fontFeatureSettings: '"smcp"',
            letterSpacing: '0.1em',
          }}
        >
          色板预览
        </h2>

        {/* 纸面三层 */}
        <div className="flex gap-2 mb-4">
          <div
            className="flex-1 h-8 rounded-sm border border-ink-line flex items-center justify-center"
            style={{ backgroundColor: colors.paperCanvas }}
          >
            <span className="text-[9px] text-ink-muted" style={{ fontFamily: 'var(--font-mono)' }}>canvas</span>
          </div>
          <div
            className="flex-1 h-8 rounded-sm border border-ink-line flex items-center justify-center"
            style={{ backgroundColor: colors.paperSurface }}
          >
            <span className="text-[9px] text-ink-muted" style={{ fontFamily: 'var(--font-mono)' }}>surface</span>
          </div>
          <div
            className="flex-1 h-8 rounded-sm border border-ink-line flex items-center justify-center"
            style={{ backgroundColor: colors.paperDeep }}
          >
            <span className="text-[9px] text-ink-muted" style={{ fontFamily: 'var(--font-mono)' }}>deep</span>
          </div>
        </div>

        {/* 主色与强调色 */}
        <div className="flex gap-2 mb-4">
          <div
            className="flex-1 h-8 rounded-sm flex items-center justify-center"
            style={{ backgroundColor: colors.inkDeep }}
          >
            <span className="text-[9px] text-paper-surface" style={{ fontFamily: 'var(--font-mono)' }}>ink-deep</span>
          </div>
          <div
            className="flex-1 h-8 rounded-sm flex items-center justify-center"
            style={{ backgroundColor: colors.vermilion }}
          >
            <span className="text-[9px] text-paper-surface" style={{ fontFamily: 'var(--font-mono)' }}>vermilion</span>
          </div>
        </div>

        {/* Pólya 阶段色 */}
        <div className="mb-4">
          <p
            className="text-[9px] text-ink-muted mb-2"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
          >
            PÓLYA PHASES
          </p>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(PHASE_LABEL) as [keyof typeof PHASE_LABEL, string][]).map(([key, label]) => (
              <span
                key={key}
                className="px-3 py-1 rounded-sm text-paper-surface text-xs"
                style={{
                  backgroundColor:
                    key === 'UNDERSTAND' ? colors.phase.understand
                    : key === 'PLAN'      ? colors.phase.plan
                    : key === 'EXECUTE'   ? colors.phase.execute
                    :                       colors.phase.review,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* 信号色 */}
        <div>
          <p
            className="text-[9px] text-ink-muted mb-2"
            style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
          >
            AGENT SIGNALS
          </p>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(SIGNAL_LABEL) as [keyof typeof SIGNAL_LABEL, string][]).map(([key, label]) => (
              <span
                key={key}
                className="px-3 py-1 rounded-sm text-paper-surface text-xs"
                style={{
                  backgroundColor:
                    key === 'COMPLETED' ? colors.signal.completed
                    : key === 'STAY'    ? colors.signal.stay
                    : key === 'ESCALATE'? colors.signal.escalate
                    : key === 'DONE'    ? colors.signal.done
                    :                     colors.signal.blocked,
                  fontFamily: 'var(--font-display)',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* 章节分隔符 */}
        <div className="flex items-center justify-center mt-6 mb-2">
          <span className="text-ink-muted text-xs tracking-widest">——— ※ ———</span>
        </div>

        <p
          className="text-center text-xs text-ink-muted"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          Batch 3 · 17 scenario · Editorial × Mathematical Notebook
        </p>
      </div>
    </main>
  )
}

export function App() {
  const { theme } = usePreviewStore()

  // 初始化 data-theme 到 DOM（避免 SSR / hydration 时缺失）
  useEffect(() => {
    if (theme === 'warm-ai') {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.dataset.theme = theme
    }
  }, [theme])

  return (
    <div className="min-h-screen bg-paper-canvas">
      <Routes>
        {/* 首页 */}
        <Route path="/" element={<HomePage />} />

        {/* 登录页（独立页面，不在 ChatLayout 内） */}
        <Route path="/login" element={<LoginRoute />} />

        {/* 聊天分支：ChatLayout 嵌套 */}
        <Route path="/chat" element={<ChatLayout />}>
          {/* 空对话页 */}
          <Route path="p101-empty" element={<P101Empty />} />

          {/* 拍照视图（inline，取代浮层） */}
          <Route path="p102-upload" element={<CameraView />} />

          {/* OCR 多题 / 单题确认 */}
          <Route path="p103-multi" element={<P103MultiQuestion />} />
          <Route path="p103-single" element={<P103SingleQuestion />} />

          {/* Pólya 四阶段（4 个 scenario 共用 P104Phase，由 useParams scenarioId 区分） */}
          <Route path="p104-understand-oos" element={<P104Phase />} />
          <Route path="p104-plan-deviation" element={<P104Phase />} />
          <Route path="p104-execute-stuck" element={<P104Phase />} />
          <Route path="p104-execute-multi-sub" element={<P104Phase />} />
          <Route path="p104-review" element={<P104Phase />} />

          {/* 知识卡片（2 个 scenario 共用 P105Card） */}
          <Route path="p105-card-done" element={<P105Card />} />
          <Route path="p105-card-partial" element={<P105Card />} />

          {/* 换题确认浮层 */}
          <Route path="p106-swap" element={<P106SwapConfirm />} />

          {/* 历史对话恢复（只读） */}
          <Route path="history-resume" element={<HistoryResume />} />

          {/* 长对话（超 50 条消息） */}
          <Route path="long-conversation" element={<LongConversation />} />

          {/* 通配：旧版 :scenarioId 路由兜底（保持向后兼容） */}
          <Route path=":scenarioId" element={<P104Phase />} />
        </Route>

        {/* Admin 后台 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<ConversationList />} />
          <Route path=":conversationId" element={<ConversationDetail />} />
        </Route>

        {/* 404 → 首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <DevToolbar />
    </div>
  )
}
