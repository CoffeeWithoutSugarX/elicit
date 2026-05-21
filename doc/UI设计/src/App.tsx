import { Routes, Route } from 'react-router'
import { DevToolbar } from '@/components/DevToolbar'
import { PHASE_LABEL, SIGNAL_LABEL } from '@/styles/theme'

/** 临时占位首页：验证主题 token + Tailwind v4 正常工作 */
function HomePage() {
  return (
    <main className="min-h-screen bg-bg-canvas flex items-center justify-center p-8">
      <div
        className="bg-bg-elevated border border-border-subtle rounded-lg shadow-md p-8 max-w-lg w-full"
      >
        <h1 className="text-2xl font-bold text-text-primary mb-2">
          引思助手 UI 高保真原型
        </h1>
        <p className="text-text-muted text-sm mb-6">Batch 1 OK · 主题 token 验证</p>

        {/* 主色/辅色色板 */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 h-10 rounded-md bg-primary flex items-center justify-center text-white text-xs font-medium">
            primary
          </div>
          <div className="flex-1 h-10 rounded-md bg-accent flex items-center justify-center text-white text-xs font-medium">
            accent
          </div>
        </div>

        {/* Pólya 阶段色 */}
        <div className="mb-4">
          <p className="text-xs text-text-muted mb-2 font-medium">Pólya 阶段</p>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(PHASE_LABEL) as [keyof typeof PHASE_LABEL, string][]).map(([key, label]) => (
              <span
                key={key}
                className="px-3 py-1 rounded-pill text-white text-xs font-medium"
                style={{
                  backgroundColor:
                    key === 'UNDERSTAND' ? 'var(--color-phase-understand)'
                    : key === 'PLAN'      ? 'var(--color-phase-plan)'
                    : key === 'EXECUTE'   ? 'var(--color-phase-execute)'
                    :                       'var(--color-phase-review)',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* 信号色 */}
        <div>
          <p className="text-xs text-text-muted mb-2 font-medium">Agent 信号</p>
          <div className="flex gap-2 flex-wrap">
            {(Object.entries(SIGNAL_LABEL) as [keyof typeof SIGNAL_LABEL, string][]).map(([key, label]) => (
              <span
                key={key}
                className="px-3 py-1 rounded-pill text-white text-xs font-medium"
                style={{
                  backgroundColor:
                    key === 'COMPLETED' ? 'var(--color-signal-completed)'
                    : key === 'STAY'    ? 'var(--color-signal-stay)'
                    : key === 'ESCALATE'? 'var(--color-signal-escalate)'
                    : key === 'DONE'    ? 'var(--color-signal-done)'
                    :                     'var(--color-signal-blocked)',
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-bg-canvas">
      <Routes>
        <Route path="/" element={<HomePage />} />
      </Routes>
      <DevToolbar />
    </div>
  )
}
