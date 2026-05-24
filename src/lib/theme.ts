/**
 * 设计 token TS 镜像 — 简约白（minimal）主题
 * MVP 阶段仅使用 minimal 主题，与 globals.css @theme 块保持一致。
 * 组件直接 import 使用；Tailwind class（text-vermilion 等）是首选，
 * TS 镜像仅在需要内联 style 传色时使用（如 PhaseSignalBadge）。
 */

/** Pólya 四阶段 */
export const PHASE_LABEL = {
  UNDERSTAND: '理解题意',
  PLAN: '拟定计划',
  EXECUTE: '执行',
  REVIEW: '回顾',
} as const

export type PolyaPhase = keyof typeof PHASE_LABEL

/** Agent 信号 */
export const SIGNAL_LABEL = {
  COMPLETED: '已完成',
  STAY: '待机',
  ESCALATE: '升级',
  DONE: '知识点达成',
  BLOCKED: '受阻',
} as const

export type AgentSignal = keyof typeof SIGNAL_LABEL

/** 简约白主题色板（与 globals.css @theme 对应） */
export const colors = {
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
} as const

/** 圆角（与 globals.css @theme 对应） */
export const radius = {
  sm:   '6px',
  md:   '10px',
  lg:   '12px',
  pill: '9999px',
} as const

/** 阴影（与 globals.css @theme 对应） */
export const shadow = {
  paperSm: '0 1px 2px rgb(0 0 0 / 0.04)',
  paperMd: '0 1px 3px rgb(0 0 0 / 0.06), 0 4px 8px rgb(0 0 0 / 0.04)',
  paperLg: '0 4px 16px rgb(0 0 0 / 0.08)',
} as const

/** 字阶（与 globals.css @theme 对应） */
export const fontSize = {
  xs:   '0.75rem',
  sm:   '0.875rem',
  base: '1rem',
  lg:   '1.125rem',
  xl:   '1.375rem',
  '2xl': '1.75rem',
  '3xl': '2.25rem',
} as const
