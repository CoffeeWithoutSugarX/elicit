/**
 * 设计 token TS 镜像
 * 与 globals.css @theme inline 块保持一致；组件直接 import 使用。
 */

export const colors = {
  primary: '#F97316',
  accent: '#0EA5E9',
  bgCanvas: '#FAFAF9',
  bgElevated: '#FFFFFF',
  textPrimary: '#1C1917',
  textMuted: '#78716C',
  borderSubtle: '#E7E5E4',
  signal: {
    completed: '#059669',
    stay: '#D97706',
    escalate: '#EA580C',
    done: '#0284C7',
    blocked: '#E11D48',
  },
  phase: {
    understand: '#0284C7',
    plan: '#7C3AED',
    execute: '#EA580C',
    review: '#059669',
  },
} as const

export const radius = {
  sm: '4px',
  md: '8px',
  lg: '16px',
  pill: '9999px',
} as const

export const shadow = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
  overlay: '0 20px 25px -5px rgb(0 0 0 / 0.10), 0 8px 10px -6px rgb(0 0 0 / 0.10)',
} as const

export const fontSize = {
  xs: '0.75rem',
  sm: '0.875rem',
  base: '1rem',
  lg: '1.125rem',
  xl: '1.25rem',
  '2xl': '1.5rem',
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
