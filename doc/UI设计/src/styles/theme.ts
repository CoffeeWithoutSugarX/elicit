/**
 * 设计 token TS 镜像 — 数学笔记本 × 钢笔批改风
 * 与 globals.css @theme inline 块保持一致；组件直接 import 使用。
 */

export const colors = {
  /* 纸面 */
  paperCanvas:   '#F8F4ED',
  paperSurface:  '#FCFAF4',
  paperDeep:     '#E8E2D6',

  /* 墨色系 */
  inkPrimary:    '#1A1818',
  inkSecondary:  '#5C5852',
  inkMuted:      '#8B8278',
  inkLine:       '#D8D2C8',

  /* 主色强调 */
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
} as const

export const radius = {
  sm:   '2px',
  md:   '4px',
  lg:   '6px',
  pill: '9999px',
} as const

export const shadow = {
  paperSm: '0 1px 0 rgb(26 24 24 / 0.04), 0 1px 2px rgb(26 24 24 / 0.06)',
  paperMd: '0 1px 0 rgb(26 24 24 / 0.06), 0 4px 12px rgb(26 24 24 / 0.08)',
  paperLg: '0 1px 0 rgb(26 24 24 / 0.08), 0 12px 32px rgb(26 24 24 / 0.10)',
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
