import { Routes, Route } from 'react-router'
import { DevToolbar } from '@/components/DevToolbar'
import { PHASE_LABEL, SIGNAL_LABEL, colors } from '@/styles/theme'
import { ChatLayout } from '@/routes/chat/ChatLayout'
import { P104Phase } from '@/routes/chat/P104Phase'

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
            Batch 2 OK · 可通过 DevToolbar 切换 scenario，
            或直接访问 /chat/p104-execute-stuck 查看主流程。
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
          Batch 3 · Editorial × Mathematical Notebook
        </p>
      </div>
    </main>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-paper-canvas">
      <Routes>
        <Route path="/" element={<HomePage />} />

        {/* 聊天分支：嵌套布局 + scenarioId 路由参数 */}
        <Route path="/chat" element={<ChatLayout />}>
          <Route path=":scenarioId" element={<P104Phase />} />
        </Route>
      </Routes>
      <DevToolbar />
    </div>
  )
}
