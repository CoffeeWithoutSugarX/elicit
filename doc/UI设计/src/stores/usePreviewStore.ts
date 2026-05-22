/**
 * 原型预览全局状态。
 * 管理 DevToolbar 驱动的 scenario 切换 / 流速档位 / 强制信号 / 面板折叠态 / 主题。
 * 不持久化（页面刷新复位）。
 */
import { create } from 'zustand'
import type { PhaseSignal } from '@/mock/types'
import type { ThemeKey } from '@/styles/theme'

export type { ThemeKey }
export type StreamSpeed = 'slow' | 'normal' | 'instant'

interface PreviewState {
  scenarioId: string
  streamSpeed: StreamSpeed
  /** 强制覆盖下一条 response.signalAtEnd，null 表示不覆盖 */
  forceSignal: PhaseSignal | null
  devToolbarCollapsed: boolean
  /** 当前主题，默认 warm-ai */
  theme: ThemeKey
}

interface PreviewActions {
  setScenario(id: string): void
  setStreamSpeed(speed: StreamSpeed): void
  setForceSignal(signal: PhaseSignal | null): void
  toggleCollapsed(): void
  /** 消费并清除 forceSignal，返回原来的值 */
  consumeAndClearForceSignal(): PhaseSignal | null
  /** 切换主题，同步写 document.documentElement.dataset.theme */
  setTheme(theme: ThemeKey): void
}

type PreviewStore = PreviewState & PreviewActions

export const usePreviewStore = create<PreviewStore>()((set, get) => ({
  scenarioId: 'p104-execute-stuck',
  streamSpeed: 'normal',
  forceSignal: null,
  devToolbarCollapsed: false,
  theme: 'warm-ai',

  setScenario(id) {
    set({ scenarioId: id })
  },

  setStreamSpeed(speed) {
    set({ streamSpeed: speed })
  },

  setForceSignal(signal) {
    set({ forceSignal: signal })
  },

  toggleCollapsed() {
    set((s) => ({ devToolbarCollapsed: !s.devToolbarCollapsed }))
  },

  consumeAndClearForceSignal() {
    const current = get().forceSignal
    if (current !== null) {
      set({ forceSignal: null })
    }
    return current
  },

  setTheme(theme) {
    set({ theme })
    // 同步到 DOM，CSS 变量切换立即生效
    if (typeof document !== 'undefined') {
      if (theme === 'warm-ai') {
        // warm-ai 是默认主题，移除 data-theme 属性即可
        document.documentElement.removeAttribute('data-theme')
      } else {
        document.documentElement.dataset.theme = theme
      }
    }
  },
}))
