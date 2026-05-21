import { create } from 'zustand'

type StreamSpeed = 'slow' | 'normal' | 'instant'

interface PreviewState {
  scenarioId: string
  streamSpeed: StreamSpeed
  setScenario: (id: string) => void
  setStreamSpeed: (speed: StreamSpeed) => void
}

/**
 * 原型预览全局状态。
 * 管理 DevToolbar 驱动的 scenario 切换 + 流速档位。
 * 不持久化（页面刷新复位）。
 */
export const usePreviewStore = create<PreviewState>()((set) => ({
  scenarioId: 'default',
  streamSpeed: 'normal',
  setScenario: (id) => set({ scenarioId: id }),
  setStreamSpeed: (speed) => set({ streamSpeed: speed }),
}))
