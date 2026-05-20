import { createEnum } from './base';

export const PolyaPhase = {
    UNDERSTAND: 0,
    PLAN:       1,
    EXECUTE:    2,
    REVIEW:     3,
    DONE:       4,
} as const;

export type PolyaPhase = typeof PolyaPhase[keyof typeof PolyaPhase];

export const PolyaPhaseEnum = createEnum([
    { code: PolyaPhase.UNDERSTAND, label: '弄清问题' },
    { code: PolyaPhase.PLAN,       label: '拟定方案' },
    { code: PolyaPhase.EXECUTE,    label: '执行方案' },
    { code: PolyaPhase.REVIEW,     label: '回顾' },
    { code: PolyaPhase.DONE,       label: '已完成' },
]);
