import { createEnum } from './base';

export const PolyaPhase = {
    UNDERSTAND: 0,
    PLAN:       1,
    EXECUTE:    2,
    REVIEW:     3,
    DONE:       4,
} as const;

export type PolyaPhase = typeof PolyaPhase[keyof typeof PolyaPhase];

/** 阶段名（字符串 key）联合类型，对应 SSE chunk 中的字符串形态 */
export type PolyaPhaseName = 'UNDERSTAND' | 'PLAN' | 'EXECUTE' | 'REVIEW' | 'DONE';

export const PolyaPhaseEnum = createEnum([
    { code: PolyaPhase.UNDERSTAND, label: '理解题意', shortLabel: '理解', name: 'UNDERSTAND' as PolyaPhaseName },
    { code: PolyaPhase.PLAN,       label: '拟定计划', shortLabel: '规划', name: 'PLAN'       as PolyaPhaseName },
    { code: PolyaPhase.EXECUTE,    label: '执行',     shortLabel: '执行', name: 'EXECUTE'    as PolyaPhaseName },
    { code: PolyaPhase.REVIEW,     label: '回顾',     shortLabel: '回顾', name: 'REVIEW'     as PolyaPhaseName },
    { code: PolyaPhase.DONE,       label: '已完成',   shortLabel: '完成', name: 'DONE'       as PolyaPhaseName },
]);

/** 根据阶段名（字符串 key）查 label；找不到返回原字符串，保持向后兼容 */
export function polyaPhaseLabel(name: string): string {
    const item = PolyaPhaseEnum.items.find(i => i.name === name);
    return item?.label ?? name;
}

/** 根据阶段名（字符串 key）查 shortLabel；找不到返回原字符串 */
export function polyaPhaseShortLabel(name: string): string {
    const item = PolyaPhaseEnum.items.find(i => i.name === name);
    return item?.shortLabel ?? name;
}
