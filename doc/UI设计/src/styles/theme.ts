/**
 * 设计 token TS 镜像 — 5 主题系统
 * 与 globals.css 各 [data-theme] 块保持一致。
 * 组件直接 import 使用；Tailwind class（text-vermilion 等）是首选，
 * TS 镜像仅在需要内联 style 传色时使用（如 PhaseSignalBadge）。
 *
 * themeTokens[key].colors — 各主题完整色板
 * colors                  — 向后兼容导出，默认指向 warm-ai（默认主题）
 */

export type ThemeKey = 'notebook' | 'notebook-pro' | 'minimal' | 'warm-ai' | 'dark-scholar' | 'warm-ink-green' | 'cool-mist' | 'violet-quiet'

export interface ThemeTokenSet {
  colors: {
    paperCanvas: string
    paperSurface: string
    paperDeep: string
    inkPrimary: string
    inkSecondary: string
    inkMuted: string
    inkLine: string
    inkDeep: string
    vermilion: string
    signal: {
      completed: string
      stay: string
      escalate: string
      done: string
      blocked: string
    }
    phase: {
      understand: string
      plan: string
      execute: string
      review: string
    }
  }
  radius: {
    sm: string
    md: string
    lg: string
  }
}

export const themeTokens: Record<ThemeKey, ThemeTokenSet> = {
  // T0：数学笔记本 × 钢笔批改
  'notebook': {
    colors: {
      paperCanvas:   '#F8F4ED',
      paperSurface:  '#FCFAF4',
      paperDeep:     '#E8E2D6',
      inkPrimary:    '#1A1818',
      inkSecondary:  '#5C5852',
      inkMuted:      '#8B8278',
      inkLine:       '#D8D2C8',
      inkDeep:       '#1B2A3A',
      vermilion:     '#C13B2A',
      signal: {
        completed: '#3D5A3D',
        stay:      '#A88532',
        escalate:  '#C13B2A',
        done:      '#3E5C7A',
        blocked:   '#8B2C1F',
      },
      phase: {
        understand: '#7A9CB8',
        plan:       '#6B5B95',
        execute:    '#C13B2A',
        review:     '#5A7548',
      },
    },
    radius: { sm: '2px', md: '4px', lg: '6px' },
  },

  // T1：笔记本优化版
  'notebook-pro': {
    colors: {
      paperCanvas:   '#F4EFE5',
      paperSurface:  '#FBF8F1',
      paperDeep:     '#E5DFD2',
      inkPrimary:    '#0F1419',
      inkSecondary:  '#4A4640',
      inkMuted:      '#7A716A',
      inkLine:       '#D0CABE',
      inkDeep:       '#15212E',
      vermilion:     '#9C2B1F',
      signal: {
        completed: '#344E34',
        stay:      '#957528',
        escalate:  '#9C2B1F',
        done:      '#344E5C',
        blocked:   '#722217',
      },
      phase: {
        understand: '#6B8FAA',
        plan:       '#5E5085',
        execute:    '#9C2B1F',
        review:     '#4D6840',
      },
    },
    radius: { sm: '3px', md: '6px', lg: '8px' },
  },

  // T2：极简白 / Linear 风
  'minimal': {
    colors: {
      paperCanvas:   '#FFFFFF',
      paperSurface:  '#FAFAFA',
      paperDeep:     '#F4F4F5',
      inkPrimary:    '#0A0A0A',
      inkSecondary:  '#525252',
      inkMuted:      '#A3A3A3',
      inkLine:       '#E5E5E5',
      inkDeep:       '#2563EB',
      vermilion:     '#2563EB',
      signal: {
        completed: '#10B981',
        stay:      '#F59E0B',
        escalate:  '#EF4444',
        done:      '#3B82F6',
        blocked:   '#DC2626',
      },
      phase: {
        understand: '#3B82F6',
        plan:       '#8B5CF6',
        execute:    '#F59E0B',
        review:     '#10B981',
      },
    },
    radius: { sm: '6px', md: '10px', lg: '12px' },
  },

  // T3：暖白 AI（Claude 风，默认）
  'warm-ai': {
    colors: {
      paperCanvas:   '#FAF9F7',
      paperSurface:  '#FFFFFF',
      paperDeep:     '#F0EEE9',
      inkPrimary:    '#1A1A1A',
      inkSecondary:  '#5C5C5C',
      inkMuted:      '#8E8E8E',
      inkLine:       '#ECEAE5',
      inkDeep:       '#1A1A1A',
      vermilion:     '#D97757',
      signal: {
        completed: '#5A7A55',
        stay:      '#B89055',
        escalate:  '#D97757',
        done:      '#5A7595',
        blocked:   '#A85745',
      },
      phase: {
        understand: '#6B8FAA',
        plan:       '#8B7AA8',
        execute:    '#D97757',
        review:     '#7A9070',
      },
    },
    radius: { sm: '6px', md: '8px', lg: '10px' },
  },

  // T4：深色学术
  'dark-scholar': {
    colors: {
      paperCanvas:   '#1E2A28',
      paperSurface:  '#25332F',
      paperDeep:     '#1A2522',
      inkPrimary:    '#E8E2D6',
      inkSecondary:  '#B8B0A0',
      inkMuted:      '#807868',
      inkLine:       '#3A4844',
      inkDeep:       '#2D3D38',
      vermilion:     '#C9A961',
      signal: {
        completed: '#88B070',
        stay:      '#D4B560',
        escalate:  '#C9A961',
        done:      '#88AAC8',
        blocked:   '#D08570',
      },
      phase: {
        understand: '#88AAC8',
        plan:       '#A89AC0',
        execute:    '#C9A961',
        review:     '#88B070',
      },
    },
    radius: { sm: '3px', md: '4px', lg: '6px' },
  },

  // T5：暖墨绿
  'warm-ink-green': {
    colors: {
      paperCanvas:   '#F7F5F0',
      paperSurface:  '#FFFFFF',
      paperDeep:     '#EDE9E0',
      inkPrimary:    '#1A1F1B',
      inkSecondary:  '#4D584F',
      inkMuted:      '#8E948A',
      inkLine:       '#E5E0D5',
      inkDeep:       '#3F5847',
      vermilion:     '#A04A3F',
      signal: {
        completed: '#5A7060',
        stay:      '#B89055',
        escalate:  '#A04A3F',
        done:      '#5A7595',
        blocked:   '#8B4A40',
      },
      phase: {
        understand: '#6B8FAA',
        plan:       '#8B7AA8',
        execute:    '#A04A3F',
        review:     '#5A7060',
      },
    },
    radius: { sm: '6px', md: '10px', lg: '14px' },
  },

  // T6：雾青
  'cool-mist': {
    colors: {
      paperCanvas:   '#F5F7F8',
      paperSurface:  '#FFFFFF',
      paperDeep:     '#E8ECEE',
      inkPrimary:    '#15212A',
      inkSecondary:  '#4A5560',
      inkMuted:      '#8590A0',
      inkLine:       '#DDE3E8',
      inkDeep:       '#4A6B7A',
      vermilion:     '#C9986F',
      signal: {
        completed: '#5E8378',
        stay:      '#B89055',
        escalate:  '#C9986F',
        done:      '#4A6B7A',
        blocked:   '#A85745',
      },
      phase: {
        understand: '#6B8FAA',
        plan:       '#8B7AA8',
        execute:    '#C9986F',
        review:     '#5E8378',
      },
    },
    radius: { sm: '6px', md: '10px', lg: '14px' },
  },

  // T7：紫罗兰静谧
  'violet-quiet': {
    colors: {
      paperCanvas:   '#F8F5F8',
      paperSurface:  '#FFFFFF',
      paperDeep:     '#EFE9F0',
      inkPrimary:    '#1F1A23',
      inkSecondary:  '#534D5C',
      inkMuted:      '#8E8995',
      inkLine:       '#E5DFE6',
      inkDeep:       '#6B5B95',
      vermilion:     '#D4A574',
      signal: {
        completed: '#5A7A55',
        stay:      '#B89055',
        escalate:  '#D4A574',
        done:      '#5A7595',
        blocked:   '#A85745',
      },
      phase: {
        understand: '#6B8FAA',
        plan:       '#8B7AA8',
        execute:    '#D4A574',
        review:     '#7A9070',
      },
    },
    radius: { sm: '6px', md: '10px', lg: '14px' },
  },
}

/** 向后兼容：默认指向 warm-ai（当前默认主题） */
export const colors = themeTokens['warm-ai'].colors
export const radius = { ...themeTokens['warm-ai'].radius, pill: '9999px' }

export const shadow = {
  paperSm: '0 1px 2px rgb(0 0 0 / 0.04)',
  paperMd: '0 1px 3px rgb(0 0 0 / 0.06), 0 4px 8px rgb(0 0 0 / 0.04)',
  paperLg: '0 4px 16px rgb(0 0 0 / 0.08)',
} as const

export const fontSize = {
  xs:   '0.75rem',
  sm:   '0.875rem',
  base: '1rem',
  lg:   '1.125rem',
  xl:   '1.375rem',
  '2xl': '1.75rem',
  '3xl': '2.25rem',
} as const

/** Pólya 阶段 → 中文标签 */
export const PHASE_LABEL = {
  UNDERSTAND: '理解题意',
  PLAN: '拟定计划',
  EXECUTE: '执行',
  REVIEW: '回顾',
} as const

export type PolyaPhase = keyof typeof PHASE_LABEL

/** Agent 信号 → 中文标签 */
export const SIGNAL_LABEL = {
  COMPLETED: '已完成',
  STAY: '待机',
  ESCALATE: '升级',
  DONE: '知识点达成',
  BLOCKED: '受阻',
} as const

export type AgentSignal = keyof typeof SIGNAL_LABEL
