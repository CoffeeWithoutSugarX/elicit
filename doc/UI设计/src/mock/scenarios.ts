/**
 * Scenario 注册表。
 * 18 个 scenario，按 SPEC §4 表覆盖全部 PRD 分支。
 * Batch 3：所有 16 个 stub 已填实，import 各 fixture 文件。
 * v0.1.1：新增 p104-full-flow（4 阶段完整 happy path）
 */
import type { Scenario } from './types'

// ── 已完整填充的 fixture imports ────────────────────────────────────────────

import {
  initialConversation as p104FullFlowConv,
  initialMessages as p104FullFlowMsgs,
  responses as p104FullFlowResponses,
} from './messages/p104-full-flow'

import {
  initialConversation as p104StuckConv,
  initialMessages as p104StuckMsgs,
  responses as p104StuckResponses,
} from './messages/p104-execute-stuck'

import {
  initialConversation as loginConv,
  initialMessages as loginMsgs,
  responses as loginResponses,
} from './messages/login'

import {
  initialConversation as p101Conv,
  initialMessages as p101Msgs,
  responses as p101Responses,
} from './messages/p101-empty'

import {
  initialConversation as p102Conv,
  initialMessages as p102Msgs,
  responses as p102Responses,
} from './messages/p102-upload'

import {
  initialConversation as p103MultiConv,
  initialMessages as p103MultiMsgs,
  responses as p103MultiResponses,
} from './messages/p103-multi'

import {
  initialConversation as p103SingleConv,
  initialMessages as p103SingleMsgs,
  responses as p103SingleResponses,
} from './messages/p103-single'

import {
  initialConversation as p104OosConv,
  initialMessages as p104OosMsgs,
  responses as p104OosResponses,
} from './messages/p104-understand-oos'

import {
  initialConversation as p104PlanConv,
  initialMessages as p104PlanMsgs,
  responses as p104PlanResponses,
} from './messages/p104-plan-deviation'

import {
  initialConversation as p104MultiSubConv,
  initialMessages as p104MultiSubMsgs,
  responses as p104MultiSubResponses,
} from './messages/p104-execute-multi-sub'

import {
  initialConversation as p104ReviewConv,
  initialMessages as p104ReviewMsgs,
  responses as p104ReviewResponses,
} from './messages/p104-review'

import {
  initialConversation as p105DoneConv,
  initialMessages as p105DoneMsgs,
  responses as p105DoneResponses,
} from './messages/p105-card-done'

import {
  initialConversation as p105PartialConv,
  initialMessages as p105PartialMsgs,
  responses as p105PartialResponses,
} from './messages/p105-card-partial'

import {
  initialConversation as p106SwapConv,
  initialMessages as p106SwapMsgs,
  responses as p106SwapResponses,
} from './messages/p106-swap'

import {
  initialConversation as historyResumeConv,
  initialMessages as historyResumeMsgs,
  responses as historyResumeResponses,
} from './messages/history-resume'

import {
  initialConversation as longConvConv,
  initialMessages as longConvMsgs,
  responses as longConvResponses,
} from './messages/long-conversation'

import {
  initialConversation as adminListConv,
  initialMessages as adminListMsgs,
  responses as adminListResponses,
} from './messages/admin-list'

import {
  initialConversation as adminDetailConv,
  initialMessages as adminDetailMsgs,
  responses as adminDetailResponses,
} from './messages/admin-detail'

// ──────────────────────────────────────────────────────────────
// 完整注册表（Batch 3 全部填实）
// ──────────────────────────────────────────────────────────────

export const SCENARIOS: Record<string, Scenario> = {
  // ── auth ─────────────────────────────────────────
  login: {
    id: 'login',
    group: 'auth',
    label: '登录页',
    prdAnchor: 'P5（PRD §9）',
    route: '/login',
    initialConversation: loginConv,
    initialMessages: loginMsgs,
    responses: loginResponses,
  },

  // ── upload ───────────────────────────────────────
  'p101-empty': {
    id: 'p101-empty',
    group: 'upload',
    label: 'P-101 空对话页',
    prdAnchor: 'P-101',
    route: '/chat/p101-empty',
    initialConversation: p101Conv,
    initialMessages: p101Msgs,
    responses: p101Responses,
  },
  'p102-upload': {
    id: 'p102-upload',
    group: 'upload',
    label: 'P-102 上传图片',
    prdAnchor: 'P-102 / US-001 / US-002',
    route: '/chat/p102-upload',
    initialConversation: p102Conv,
    initialMessages: p102Msgs,
    responses: p102Responses,
  },
  'p103-multi': {
    id: 'p103-multi',
    group: 'upload',
    label: 'P-103 多题列表',
    prdAnchor: 'P-103 / US-004 / US-005',
    route: '/chat/p103-multi',
    initialConversation: p103MultiConv,
    initialMessages: p103MultiMsgs,
    responses: p103MultiResponses,
  },
  'p103-single': {
    id: 'p103-single',
    group: 'upload',
    label: 'P-103 单题直接确认',
    prdAnchor: 'P-103',
    route: '/chat/p103-single',
    initialConversation: p103SingleConv,
    initialMessages: p103SingleMsgs,
    responses: p103SingleResponses,
  },

  // ── polya ────────────────────────────────────────
  'p104-full-flow': {
    id: 'p104-full-flow',
    group: 'polya',
    label: 'P-104 4 阶段 happy path',
    prdAnchor: '阶段①②③④ happy path 完整演进 / G2 验收',
    route: '/chat/p104-full-flow',
    initialConversation: p104FullFlowConv,
    initialMessages: p104FullFlowMsgs,
    responses: p104FullFlowResponses,
  },

  'p104-understand-oos': {
    id: 'p104-understand-oos',
    group: 'polya',
    label: 'P-104 阶段① 学科外拒答',
    prdAnchor: '阶段① + US-014',
    route: '/chat/p104-understand-oos',
    initialConversation: p104OosConv,
    initialMessages: p104OosMsgs,
    responses: p104OosResponses,
  },
  'p104-plan-deviation': {
    id: 'p104-plan-deviation',
    group: 'polya',
    label: 'P-104 阶段② 偏题引回',
    prdAnchor: '阶段② + US-008',
    route: '/chat/p104-plan-deviation',
    initialConversation: p104PlanConv,
    initialMessages: p104PlanMsgs,
    responses: p104PlanResponses,
  },

  // ── polya：已完整填充 ─────────────────────────────
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
    initialConversation: p104MultiSubConv,
    initialMessages: p104MultiSubMsgs,
    responses: p104MultiSubResponses,
  },
  'p104-review': {
    id: 'p104-review',
    group: 'polya',
    label: 'P-104 阶段④ 回顾汇总',
    prdAnchor: '阶段④',
    route: '/chat/p104-review',
    initialConversation: p104ReviewConv,
    initialMessages: p104ReviewMsgs,
    responses: p104ReviewResponses,
  },

  // ── card-overlay ──────────────────────────────────
  'p105-card-done': {
    id: 'p105-card-done',
    group: 'card-overlay',
    label: 'P-105 知识卡 全done',
    prdAnchor: 'P-105 全 done',
    route: '/chat/p105-card-done',
    initialConversation: p105DoneConv,
    initialMessages: p105DoneMsgs,
    responses: p105DoneResponses,
  },
  'p105-card-partial': {
    id: 'p105-card-partial',
    group: 'card-overlay',
    label: 'P-105 知识卡 部分blocked',
    prdAnchor: 'P-105 partial blocked',
    route: '/chat/p105-card-partial',
    initialConversation: p105PartialConv,
    initialMessages: p105PartialMsgs,
    responses: p105PartialResponses,
  },
  'p106-swap': {
    id: 'p106-swap',
    group: 'card-overlay',
    label: 'P-106 换题确认浮层',
    prdAnchor: 'P-106 / US-016',
    route: '/chat/p106-swap',
    initialConversation: p106SwapConv,
    initialMessages: p106SwapMsgs,
    responses: p106SwapResponses,
  },
  'history-resume': {
    id: 'history-resume',
    group: 'card-overlay',
    label: '历史对话恢复',
    prdAnchor: 'US-010 / US-017',
    route: '/chat/history-resume',
    initialConversation: historyResumeConv,
    initialMessages: historyResumeMsgs,
    responses: historyResumeResponses,
  },
  'long-conversation': {
    id: 'long-conversation',
    group: 'card-overlay',
    label: '长对话警示',
    prdAnchor: 'PRD §10 (≥ 50 轮)',
    route: '/chat/long-conversation',
    initialConversation: longConvConv,
    initialMessages: longConvMsgs,
    responses: longConvResponses,
  },

  // ── admin ─────────────────────────────────────────
  'admin-list': {
    id: 'admin-list',
    group: 'admin',
    label: 'Admin 会话列表',
    prdAnchor: 'US-015',
    route: '/admin',
    initialConversation: adminListConv,
    initialMessages: adminListMsgs,
    responses: adminListResponses,
  },
  'admin-detail': {
    id: 'admin-detail',
    group: 'admin',
    label: 'Admin 会话详情',
    prdAnchor: 'US-015',
    route: '/admin/detail',
    initialConversation: adminDetailConv,
    initialMessages: adminDetailMsgs,
    responses: adminDetailResponses,
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
