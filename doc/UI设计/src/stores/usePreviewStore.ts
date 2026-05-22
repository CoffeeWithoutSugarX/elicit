/**
 * 原型预览全局状态。
 * 管理 DevToolbar 驱动的 scenario 切换 / 流速档位 / 强制信号 / 面板折叠态。
 * 不持久化（页面刷新复位）。
 */
import { create } from 'zustand'
import type { PhaseSignal } from '@/mock/types'

export type StreamSpeed = 'slow' | 'normal' | 'instant'

interface PreviewState {
  scenarioId: string
  streamSpeed: StreamSpeed
  /** 强制覆盖下一条 response.signalAtEnd，null 表示不覆盖 */
  forceSignal: PhaseSignal | null
  devToolbarCollapsed: boolean
}

interface PreviewActions {
  setScenario(id: string): void
  setStreamSpeed(speed: StreamSpeed): void
  setForceSignal(signal: PhaseSignal | null): void
  toggleCollapsed(): void
  /** 消费并清除 forceSignal，返回原来的值 */
  consumeAndClearForceSignal(): PhaseSignal | null
}

type PreviewStore = PreviewState & PreviewActions

export const usePreviewStore = create<PreviewStore>()((set, get) => ({
  scenarioId: 'p104-execute-stuck',
  streamSpeed: 'normal',
  forceSignal: null,
  devToolbarCollapsed: false,

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
}))
