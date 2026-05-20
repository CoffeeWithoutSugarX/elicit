import { createEnum } from './base';

export const ProblemType = {
    ALGEBRA:  0,
    GEOMETRY: 1,
    FUNCTION: 2,
    OTHER:    3,
} as const;

export type ProblemType = typeof ProblemType[keyof typeof ProblemType];

export const ProblemTypeEnum = createEnum([
    { code: ProblemType.ALGEBRA,  label: '代数' },
    { code: ProblemType.GEOMETRY, label: '几何' },
    { code: ProblemType.FUNCTION, label: '函数' },
    { code: ProblemType.OTHER,    label: '其他' },
]);
