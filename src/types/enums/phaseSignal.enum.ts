import { createEnum } from './base';

/** Agent 在每个 phase 结束后输出的协议信号（字符串 code，与 SSE wire 一致） */
export const PhaseSignal = {
    COMPLETED:        'COMPLETED',
    STAY:             'STAY',
    ESCALATE:         'ESCALATE',
    SUB_PROBLEM_DONE: 'SUB_PROBLEM_DONE',
    PROBLEM_BLOCKED:  'PROBLEM_BLOCKED',
} as const;

export type PhaseSignal = typeof PhaseSignal[keyof typeof PhaseSignal];

export const PhaseSignalEnum = createEnum<PhaseSignal>([
    { code: PhaseSignal.COMPLETED,        label: '已完成' },
    { code: PhaseSignal.STAY,             label: '待机' },
    { code: PhaseSignal.ESCALATE,         label: '升级' },
    { code: PhaseSignal.SUB_PROBLEM_DONE, label: '知识点达成' },
    { code: PhaseSignal.PROBLEM_BLOCKED,  label: '受阻' },
]);
