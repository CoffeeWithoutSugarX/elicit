/**
 * Mock 会话数据。
 * SidebarConversation：侧边栏列表（学生端）。
 * AdminConversation：Admin 跨用户列表。
 * 类型定义内联于此文件，不污染 types.ts。
 */
import type { PolyaPhase } from './types'

// ──────────────────────────────────────────────────────────────
// 类型定义
// ──────────────────────────────────────────────────────────────

/** 侧边栏会话列表项 */
export interface SidebarConversation {
  id: string
  /** 题目摘要（通常取第一行内容） */
  title: string
  createdAt: string
  hasResolved: boolean
}

/** Admin 视角的会话记录 */
export interface AdminConversation {
  id: string
  userEmail: string
  title: string
  currentPhase: PolyaPhase
  hasResolved: boolean
  createdAt: string
  /** 消息总条数（仅用于展示，不含完整列表） */
  messageCount: number
}

// ──────────────────────────────────────────────────────────────
// 学生端侧边栏会话（6~8 条）
// ──────────────────────────────────────────────────────────────

export const MOCK_CONVERSATIONS: SidebarConversation[] = [
  {
    id: 'fixture-p105-done-0001',
    title: '二次函数三参数代入法',
    createdAt: '2026-05-22T15:00:00.000Z',
    hasResolved: true,
  },
  {
    id: 'fixture-history-resume-0001',
    title: '一元二次方程：$x^2-5x+6=0$',
    createdAt: '2026-05-20T08:00:00.000Z',
    hasResolved: true,
  },
  {
    id: 'fixture-p104-multi-sub-0001',
    title: '$f(x)=x^2-4x+3$ 三小问综合',
    createdAt: '2026-05-22T11:00:00.000Z',
    hasResolved: false,
  },
  {
    id: 'fixture-p104-stuck-0001',
    title: '二次函数三参数求值（卡死案例）',
    createdAt: '2026-05-22T08:00:00.000Z',
    hasResolved: false,
  },
  {
    id: 'fixture-p104-plan-dev-0001',
    title: '独立事件概率 $P(A\\cup B)$',
    createdAt: '2026-05-22T10:00:00.000Z',
    hasResolved: false,
  },
  {
    id: 'fixture-p105-partial-0001',
    title: '△ABC 几何三小问（部分未完成）',
    createdAt: '2026-05-22T16:00:00.000Z',
    hasResolved: true,
  },
  {
    id: 'fixture-p104-review-0001',
    title: '代数展开：$(2x+3)^2-(x-1)^2$',
    createdAt: '2026-05-22T14:00:00.000Z',
    hasResolved: false,
  },
  {
    id: 'fixture-long-conv-0001',
    title: '$f(x)=-x^2+4x-3$ 图像与性质深度探讨',
    createdAt: '2026-05-22T08:00:00.000Z',
    hasResolved: false,
  },
]

// ──────────────────────────────────────────────────────────────
// Admin 跨用户会话列表（8 条，涵盖不同阶段）
// ──────────────────────────────────────────────────────────────

export const MOCK_ADMIN_CONVERSATIONS: AdminConversation[] = [
  {
    id: 'fixture-p105-done-0001',
    userEmail: 'student_a@example.com',
    title: '二次函数三参数代入法',
    currentPhase: 'REVIEW',
    hasResolved: true,
    createdAt: '2026-05-22T15:00:00.000Z',
    messageCount: 8,
  },
  {
    id: 'fixture-history-resume-0001',
    userEmail: 'student_b@example.com',
    title: '一元二次方程 $x^2-5x+6=0$',
    currentPhase: 'REVIEW',
    hasResolved: true,
    createdAt: '2026-05-20T08:00:00.000Z',
    messageCount: 9,
  },
  {
    id: 'fixture-p104-multi-sub-0001',
    userEmail: 'student_a@example.com',
    title: '$f(x)=x^2-4x+3$ 三小问综合',
    currentPhase: 'EXECUTE',
    hasResolved: false,
    createdAt: '2026-05-22T11:00:00.000Z',
    messageCount: 4,
  },
  {
    id: 'fixture-p104-stuck-0001',
    userEmail: 'student_c@example.com',
    title: '二次函数三参数求值（卡死案例）',
    currentPhase: 'PLAN',
    hasResolved: false,
    createdAt: '2026-05-22T08:00:00.000Z',
    messageCount: 4,
  },
  {
    id: 'fixture-p104-plan-dev-0001',
    userEmail: 'student_d@example.com',
    title: '独立事件概率 $P(A\\cup B)$',
    currentPhase: 'PLAN',
    hasResolved: false,
    createdAt: '2026-05-22T10:00:00.000Z',
    messageCount: 4,
  },
  {
    id: 'fixture-p105-partial-0001',
    userEmail: 'student_b@example.com',
    title: '△ABC 几何三小问（部分未完成）',
    currentPhase: 'REVIEW',
    hasResolved: true,
    createdAt: '2026-05-22T16:00:00.000Z',
    messageCount: 3,
  },
  {
    id: 'fixture-p104-review-0001',
    userEmail: 'student_e@example.com',
    title: '代数展开 $(2x+3)^2-(x-1)^2$',
    currentPhase: 'REVIEW',
    hasResolved: false,
    createdAt: '2026-05-22T14:00:00.000Z',
    messageCount: 8,
  },
  {
    id: 'fixture-long-conv-0001',
    userEmail: 'student_c@example.com',
    title: '$f(x)=-x^2+4x-3$ 图像与性质',
    currentPhase: 'EXECUTE',
    hasResolved: false,
    createdAt: '2026-05-22T08:00:00.000Z',
    messageCount: 50,
  },
]
