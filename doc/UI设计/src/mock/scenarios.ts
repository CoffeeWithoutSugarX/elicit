/**
 * Scenario 注册表。
 * 17 个 scenario，按 SPEC §4 表覆盖全部 PRD 分支。
 * Batch 2 只填满 p104-execute-stuck；其余 16 项为 stub，Batch 3 再填。
 */
import type { Scenario, ConversationState, Message } from './types'
import {
  initialConversation as p104StuckConv,
  initialMessages as p104StuckMsgs,
  responses as p104StuckResponses,
} from './messages/p104-execute-stuck'

// ──────────────────────────────────────────────────────────────
// Stub 工厂：Batch 3 前占位用
// ──────────────────────────────────────────────────────────────

function stubConversation(id: string): ConversationState {
  return {
    conversationId: `stub-${id}`,
    userId: 'mock-user-0001',
    hasResolved: false,
    subProblems: [
      {
        id: 'sub-0',
        goal: '（stub 占位，Batch 3 填写）',
        status: 'pending',
        insightPoints: [],
        stuckCountPerPhase: { UNDERSTAND: 0, PLAN: 0, EXECUTE: 0, REVIEW: 0 },
        probedQuestionIds: [],
      },
    ],
    currentSubProblemIndex: 0,
    currentPhase: 'UNDERSTAND',
    problemType: 'OTHER',
  }
}

const stubMessages: Message[] = []

// ──────────────────────────────────────────────────────────────
// 完整注册表
// ──────────────────────────────────────────────────────────────

export const SCENARIOS: Record<string, Scenario> = {
  // ── auth ─────────────────────────────────────────
  login: {
    id: 'login',
    group: 'auth',
    label: '登录页',
    prdAnchor: 'P5（PRD §9）',
    route: '/login',
    initialConversation: stubConversation('login'),
    initialMessages: stubMessages,
    responses: [],
  },

  // ── upload ───────────────────────────────────────
  'p101-empty': {
    id: 'p101-empty',
    group: 'upload',
    label: 'P-101 空对话页',
    prdAnchor: 'P-101',
    route: '/chat/p101-empty',
    initialConversation: stubConversation('p101-empty'),
    initialMessages: stubMessages,
    responses: [],
  },
  'p102-upload': {
    id: 'p102-upload',
    group: 'upload',
    label: 'P-102 上传图片',
    prdAnchor: 'P-102 / US-001 / US-002',
    route: '/chat/p102-upload',
    initialConversation: stubConversation('p102-upload'),
    initialMessages: stubMessages,
    responses: [],
  },
  'p103-multi': {
    id: 'p103-multi',
    group: 'upload',
    label: 'P-103 多题列表',
    prdAnchor: 'P-103 / US-004 / US-005',
    route: '/chat/p103-multi',
    initialConversation: stubConversation('p103-multi'),
    initialMessages: stubMessages,
    responses: [],
  },
  'p103-single': {
    id: 'p103-single',
    group: 'upload',
    label: 'P-103 单题直接确认',
    prdAnchor: 'P-103',
    route: '/chat/p103-single',
    initialConversation: stubConversation('p103-single'),
    initialMessages: stubMessages,
    responses: [],
  },

  // ── polya ────────────────────────────────────────
  'p104-understand-oos': {
    id: 'p104-understand-oos',
    group: 'polya',
    label: 'P-104 阶段① 学科外拒答',
    prdAnchor: '阶段① + US-014',
    route: '/chat/p104-understand-oos',
    initialConversation: stubConversation('p104-understand-oos'),
    initialMessages: stubMessages,
    responses: [],
  },
  'p104-plan-deviation': {
    id: 'p104-plan-deviation',
    group: 'polya',
    label: 'P-104 阶段② 偏题引回',
    prdAnchor: '阶段② + US-008',
    route: '/chat/p104-plan-deviation',
    initialConversation: stubConversation('p104-plan-deviation'),
    initialMessages: stubMessages,
    responses: [],
  },

  // ── polya：Batch 2 完整填充 ──────────────────────
  'p104-execute-stuck': {
    id: 'p104-execute-stuck',
    group: 'polya',
    label: 'P-104 阶段③ 卡死探路',
    prdAnchor: '阶段③ + US-009 + B4 双层',
    route: '/chat/p104-execute-stuck',
    initialConversation: p104StuckConv,
    initialMessages: p104StuckMsgs,
    responses: p104StuckResponses,
  },

  'p104-execute-multi-sub': {
    id: 'p104-execute-multi-sub',
    group: 'polya',
    label: 'P-104 阶段③ 多小问推进',
    prdAnchor: '阶段③ B4',
    route: '/chat/p104-execute-multi-sub',
    initialConversation: stubConversation('p104-execute-multi-sub'),
    initialMessages: stubMessages,
    responses: [],
  },
  'p104-review': {
    id: 'p104-review',
    group: 'polya',
    label: 'P-104 阶段④ 回顾汇总',
    prdAnchor: '阶段④',
    route: '/chat/p104-review',
    initialConversation: stubConversation('p104-review'),
    initialMessages: stubMessages,
    responses: [],
  },

  // ── card-overlay ──────────────────────────────────
  'p105-card-done': {
    id: 'p105-card-done',
    group: 'card-overlay',
    label: 'P-105 知识卡 全done',
    prdAnchor: 'P-105 全 done',
    route: '/chat/p105-card-done',
    initialConversation: stubConversation('p105-card-done'),
    initialMessages: stubMessages,
    responses: [],
  },
  'p105-card-partial': {
    id: 'p105-card-partial',
    group: 'card-overlay',
    label: 'P-105 知识卡 部分blocked',
    prdAnchor: 'P-105 partial blocked',
    route: '/chat/p105-card-partial',
    initialConversation: stubConversation('p105-card-partial'),
    initialMessages: stubMessages,
    responses: [],
  },
  'p106-swap': {
    id: 'p106-swap',
    group: 'card-overlay',
    label: 'P-106 换题确认浮层',
    prdAnchor: 'P-106 / US-016',
    route: '/chat/p106-swap',
    initialConversation: stubConversation('p106-swap'),
    initialMessages: stubMessages,
    responses: [],
  },
  'history-resume': {
    id: 'history-resume',
    group: 'card-overlay',
    label: '历史对话恢复',
    prdAnchor: 'US-010 / US-017',
    route: '/chat/history-resume',
    initialConversation: stubConversation('history-resume'),
    initialMessages: stubMessages,
    responses: [],
  },
  'long-conversation': {
    id: 'long-conversation',
    group: 'card-overlay',
    label: '长对话警示',
    prdAnchor: 'PRD §10 (≥ 50 轮)',
    route: '/chat/long-conversation',
    initialConversation: stubConversation('long-conversation'),
    initialMessages: stubMessages,
    responses: [],
  },

  // ── admin ─────────────────────────────────────────
  'admin-list': {
    id: 'admin-list',
    group: 'admin',
    label: 'Admin 会话列表',
    prdAnchor: 'US-015',
    route: '/admin',
    initialConversation: stubConversation('admin-list'),
    initialMessages: stubMessages,
    responses: [],
  },
  'admin-detail': {
    id: 'admin-detail',
    group: 'admin',
    label: 'Admin 会话详情',
    prdAnchor: 'US-015',
    route: '/admin/detail',
    initialConversation: stubConversation('admin-detail'),
    initialMessages: stubMessages,
    responses: [],
  },
}

/** DevToolbar 分组顺序表 */
export const SCENARIO_GROUPS: { key: string; label: string }[] = [
  { key: 'auth', label: '登录' },
  { key: 'upload', label: '上传 OCR' },
  { key: 'polya', label: 'Pólya 阶段' },
  { key: 'card-overlay', label: '卡片与浮层' },
  { key: 'admin', label: 'Admin' },
]
