// 用于 P-105 知识卡片 metadata.knowledgeCard.methods[].category
import { createEnum } from './base';

export const MethodCategory = {
    ALGEBRAIC:   0,
    GEOMETRIC:   1,
    FUNCTIONAL:  2,
    STATISTICAL: 3,
    OTHER:       4,
} as const;

export type MethodCategory = typeof MethodCategory[keyof typeof MethodCategory];

export const MethodCategoryEnum = createEnum([
    { code: MethodCategory.ALGEBRAIC,   label: '代数变形' },
    { code: MethodCategory.GEOMETRIC,   label: '几何辅助线' },
    { code: MethodCategory.FUNCTIONAL,  label: '函数性质' },
    { code: MethodCategory.STATISTICAL, label: '统计分析' },
    { code: MethodCategory.OTHER,       label: '其他' },
]);
