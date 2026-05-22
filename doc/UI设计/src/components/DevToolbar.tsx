/**
 * DevToolbar 完整版（Batch 3 更新）— 便签夹样式。
 * 右下角浮动面板，5 区：Theme / Scenario / Stream Speed / Force Signal / 重置。
 * 可折叠：折叠时只显示 Wrench 图标按钮。
 *
 * 纸面调性：paper-surface 底 + ink-line 边框 + paper-lg 阴影
 * section 标题：mono + tracking-widest
 * scenario 选中态：vermilion 左竖线
 */
import {
  Wrench,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Gauge,
  Zap,
  Palette,
} from 'lucide-react'
import { useNavigate } from 'react-router'
import { cn } from '@/lib/classNames'
import { usePreviewStore, type StreamSpeed, type ThemeKey } from '@/stores/usePreviewStore'
import { useConversationStore } from '@/stores/useConversationStore'
import { SCENARIOS, SCENARIO_GROUPS } from '@/mock/scenarios'
import type { PhaseSignal } from '@/mock/types'

const SPEED_OPTIONS: { value: StreamSpeed; label: string }[] = [
  { value: 'slow', label: '慢' },
  { value: 'normal', label: '正常' },
  { value: 'instant', label: '瞬时' },
]

const SIGNALS: PhaseSignal[] = [
  'COMPLETED',
  'STAY',
  'ESCALATE',
  'SUB_PROBLEM_DONE',
  'PROBLEM_BLOCKED',
]

const SIGNAL_SHORT: Record<PhaseSignal, string> = {
  COMPLETED: '完成',
  STAY: '待机',
  ESCALATE: '升级',
  SUB_PROBLEM_DONE: '小问done',
  PROBLEM_BLOCKED: '受阻',
}

const THEME_OPTIONS: { value: ThemeKey; label: string }[] = [
  { value: 'warm-ai', label: '暖白 AI' },
  { value: 'notebook', label: '笔记本' },
  { value: 'notebook-pro', label: '笔记本 Pro' },
  { value: 'minimal', label: '极简白' },
  { value: 'dark-scholar', label: '深色学术' },
  { value: 'warm-ink-green', label: '暖墨绿' },
  { value: 'cool-mist', label: '雾青' },
  { value: 'violet-quiet', label: '紫罗兰' },
]

/** 便签夹 section 标题 */
function ToolbarSectionTitle({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h3
      className="text-[10px] text-ink-muted flex items-center gap-1 mb-1"
      style={{
        fontFamily: 'var(--font-mono)',
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
      }}
    >
      {icon}
      {children}
    </h3>
  )
}

export function DevToolbar() {
  const navigate = useNavigate()

  const {
    scenarioId,
    streamSpeed,
    forceSignal,
    devToolbarCollapsed,
    theme,
    setScenario,
    setStreamSpeed,
    setForceSignal,
    toggleCollapsed,
    setTheme,
  } = usePreviewStore()

  const { loadScenario, reset } = useConversationStore()

  const currentScenario = SCENARIOS[scenarioId]

  // 折叠态：仅 Wrench 图标按钮（便签夹图钉）
  if (devToolbarCollapsed) {
    return (
      <button
        type="button"
        onClick={toggleCollapsed}
        className={cn(
          'fixed bottom-4 right-4 z-50',
          'w-10 h-10 inline-flex items-center justify-center',
          'rounded-sm bg-paper-surface border border-ink-line',
          'shadow-paper-md text-ink-secondary hover:text-vermilion hover:border-vermilion transition-all',
        )}
        aria-label="展开 DevToolbar"
      >
        <Wrench size={15} />
      </button>
    )
  }

  function handleSelectScenario(id: string) {
    const sc = SCENARIOS[id]
    if (!sc) return
    setScenario(id)
    loadScenario({
      initialConversation: sc.initialConversation,
      initialMessages: sc.initialMessages,
    })
    navigate(sc.route)
  }

  function handleResetCurrent() {
    if (!currentScenario) return
    reset()
    loadScenario({
      initialConversation: currentScenario.initialConversation,
      initialMessages: currentScenario.initialMessages,
    })
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'flex flex-col gap-3 p-4',
        'bg-paper-surface border border-ink-line',
        'rounded-sm shadow-paper-lg',
        'w-80 max-h-[80vh] overflow-y-auto',
      )}
    >
      {/* 头部：便签夹标题 + 折叠按钮 */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-ink-line">
        <div className="flex items-center gap-1.5 min-w-0">
          <Wrench size={13} className="text-vermilion flex-shrink-0" />
          <span
            className="text-sm text-ink-primary truncate"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
            title={currentScenario?.label}
          >
            DevToolbar
          </span>
        </div>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="text-ink-muted hover:text-ink-primary transition-colors"
          aria-label="折叠"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* 当前 scenario 标签 */}
      {currentScenario ? (
        <p
          className="text-xs text-ink-secondary truncate -mt-1"
          style={{ fontFamily: 'var(--font-body)' }}
          title={currentScenario.label}
        >
          当前：{currentScenario.label}
        </p>
      ) : null}

      {/* 主题切换 */}
      <section className="flex flex-col gap-1">
        <ToolbarSectionTitle icon={<Palette size={10} />}>Theme</ToolbarSectionTitle>
        <div className="flex flex-wrap gap-1">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                'px-2 py-1 text-[11px] rounded-sm',
                'border transition-colors',
                theme === opt.value
                  ? 'bg-ink-deep text-paper-surface border-ink-deep'
                  : 'bg-paper-canvas text-ink-secondary border-ink-line hover:border-ink-secondary',
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* Scenario 切换：按 group 分组 */}
      <section className="flex flex-col gap-2">
        <ToolbarSectionTitle>Scenario</ToolbarSectionTitle>
        {SCENARIO_GROUPS.map((g) => {
          const items = Object.values(SCENARIOS).filter((s) => s.group === g.key)
          if (items.length === 0) return null
          return (
            <div key={g.key} className="flex flex-col gap-1">
              <p
                className="text-[9px] text-ink-muted mb-0.5"
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}
              >
                {g.label}
              </p>
              <div className="flex flex-wrap gap-1">
                {items.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSelectScenario(s.id)}
                    className={cn(
                      'px-2 py-1 text-[11px] text-left',
                      'border transition-colors rounded-sm',
                      s.id === scenarioId
                        ? 'bg-paper-canvas text-vermilion border-ink-line pl-2'
                        : 'bg-paper-canvas text-ink-secondary border-ink-line hover:text-ink-primary',
                    )}
                    style={
                      s.id === scenarioId
                        ? {
                            borderLeft: '2px solid var(--color-vermilion)',
                            fontFamily: 'var(--font-body)',
                          }
                        : { fontFamily: 'var(--font-body)' }
                    }
                    title={s.prdAnchor}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </section>

      {/* 流速档位 */}
      <section className="flex flex-col gap-1">
        <ToolbarSectionTitle icon={<Gauge size={10} />}>Stream Speed</ToolbarSectionTitle>
        <div className="flex gap-1">
          {SPEED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStreamSpeed(opt.value)}
              className={cn(
                'flex-1 px-2 py-1 text-xs rounded-sm',
                'border transition-colors',
                streamSpeed === opt.value
                  ? 'bg-ink-deep text-paper-surface border-ink-deep'
                  : 'bg-paper-canvas text-ink-secondary border-ink-line hover:border-ink-secondary',
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {/* 强制下一信号 */}
      <section className="flex flex-col gap-1">
        <ToolbarSectionTitle icon={<Zap size={10} />}>Force Signal</ToolbarSectionTitle>
        <div className="flex flex-wrap gap-1">
          {SIGNALS.map((sig) => (
            <button
              key={sig}
              type="button"
              onClick={() => setForceSignal(sig)}
              className={cn(
                'px-2 py-1 text-[11px] rounded-sm',
                'border transition-colors',
                forceSignal === sig
                  ? 'bg-ink-deep text-paper-surface border-ink-deep'
                  : 'bg-paper-canvas text-ink-secondary border-ink-line hover:border-ink-secondary',
              )}
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {SIGNAL_SHORT[sig]}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setForceSignal(null)}
            className={cn(
              'px-2 py-1 text-[11px] rounded-sm',
              'border border-ink-line text-ink-muted',
              'hover:border-ink-secondary transition-colors bg-paper-canvas',
            )}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            清除
          </button>
        </div>
        {forceSignal ? (
          <p className="text-[10px] text-ink-muted mt-0.5" style={{ fontFamily: 'var(--font-body)' }}>
            下次信号 →{' '}
            <span className="text-vermilion font-medium">
              {SIGNAL_SHORT[forceSignal]}
            </span>
          </p>
        ) : null}
      </section>

      {/* 重置当前 scenario */}
      <section>
        <button
          type="button"
          onClick={handleResetCurrent}
          className={cn(
            'w-full inline-flex items-center justify-center gap-1.5',
            'px-3 py-2 rounded-sm text-xs',
            'bg-paper-canvas border border-ink-line text-ink-secondary',
            'hover:border-ink-secondary hover:text-ink-primary transition-colors',
          )}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          <RotateCcw size={11} />
          重置当前 scenario
        </button>
      </section>

      {/* 收起按钮 */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex items-center justify-center gap-1 text-[10px] text-ink-muted hover:text-ink-primary transition-colors"
        style={{ fontFamily: 'var(--font-mono)' }}
      >
        <ChevronUp size={10} />
        收起面板
      </button>
    </div>
  )
}
