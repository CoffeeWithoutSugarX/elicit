import { z } from "zod";

// 截断到 max 而非 reject——LLM 啰嗦输出不应让整个 OCR 失败
const clampString = (max: number) =>
    z.string().transform((s) => (s.length > max ? s.slice(0, max).trim() : s));
const clampStringMin1 = (max: number) =>
    z.string().min(1).transform((s) => (s.length > max ? s.slice(0, max).trim() : s));
const clampArray = <T extends z.ZodTypeAny>(item: T, max: number) =>
    z.array(item).transform((a) => (a.length > max ? a.slice(0, max) : a));

// clampString 暂未在字段中直接引用，声明供未来扩展（typecheck 会提示未使用，故用 void 消除）
void clampString;

const SubProblemDefinitionSchema = z.object({
    index:           z.number().int().min(0),
    goal:            clampStringMin1(80),
    givenConditions: z.array(z.string()).default([]),
    milestones:      clampArray(z.string(), 6).default([]),
});

const SanitizedQuestionSchema = z.object({
    index:              z.number().int().min(0),   // 去掉 .max(4)——问题 index 越界由节点兜底
    topic:              clampStringMin1(40),
    latexFull:          z.string(),
    givenConditions:    z.array(z.string()).default([]),
    implicitConditions: z.array(z.string()).default([]),
    goal:               clampStringMin1(60),
    milestones:         clampArray(z.string(), 6).default([]),
    visualFeaturesNeeded: z.boolean().default(false),
    visualDescription:    z.string().default(''),
    subProblems: z.array(SubProblemDefinitionSchema).min(1).transform(
        (a) => (a.length > 6 ? a.slice(0, 6) : a)
    ),
});

const SolvableOcrSchema = z.object({
    isSolvable:            z.literal(true),
    subject:               z.literal('math'),
    grade:                 z.enum(['小学', '初中', '高中', '其他']).nullable().catch(null),
    questions:             z.array(SanitizedQuestionSchema).min(1).transform(
        (a) => (a.length > 6 ? a.slice(0, 6) : a)
    ),
    selectedQuestionIndex: z.number().int().min(0).optional(), // 去掉 .max(4)
    isMulti:               z.boolean(),
    visualFeaturesNeeded:  z.boolean().default(false),
    errorReason:           z.null().default(null),
});

const UnsolvableOcrSchema = z.object({
    isSolvable:  z.literal(false),
    subject:     z.string(),
    questions:   z.array(SanitizedQuestionSchema).length(0),
    errorReason: z.enum(['BLURRY', 'NOT_SOLVABLE', 'INCOMPLETE', 'TIMEOUT', 'PARSE_FAIL'])
        .catch('NOT_SOLVABLE')
        .default('NOT_SOLVABLE'), // 缺失/null/枚举外值 coerce 成 NOT_SOLVABLE，不再 reject
});

export const OcrSchema = z.discriminatedUnion('isSolvable', [SolvableOcrSchema, UnsolvableOcrSchema]);

export type OcrResult              = z.infer<typeof OcrSchema>;
export type SanitizedQuestion      = z.infer<typeof SanitizedQuestionSchema>;
export type SubProblemDefinition   = z.infer<typeof SubProblemDefinitionSchema>;
