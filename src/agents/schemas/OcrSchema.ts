import { z } from "zod";

const SubProblemDefinitionSchema = z.object({
    index:           z.number().int().min(0),
    goal:            z.string().min(1).max(50),
    givenConditions: z.array(z.string()).default([]),
    milestones:      z.array(z.string()).max(4).default([]),
});

const SanitizedQuestionSchema = z.object({
    index:              z.number().int().min(0).max(4),
    topic:              z.string().min(1).max(30),
    latexFull:          z.string(),
    givenConditions:    z.array(z.string()).default([]),
    implicitConditions: z.array(z.string()).default([]),
    goal:               z.string().min(1).max(30),
    milestones:         z.array(z.string()).max(4).default([]),
    visualFeaturesNeeded: z.boolean().default(false),
    visualDescription:    z.string().default(''),
    subProblems: z.array(SubProblemDefinitionSchema).min(1).max(5),
});

const SolvableOcrSchema = z.object({
    isSolvable:            z.literal(true),
    subject:               z.literal('math'),
    grade:                 z.enum(['小学', '初中', '高中', '其他']).nullable(),
    questions:             z.array(SanitizedQuestionSchema).min(1).max(5),
    selectedQuestionIndex: z.number().int().min(0).max(4).optional(),
    isMulti:               z.boolean(),
    visualFeaturesNeeded:  z.boolean().default(false),
    errorReason:           z.null().default(null),
});

const UnsolvableOcrSchema = z.object({
    isSolvable:  z.literal(false),
    subject:     z.string(),
    questions:   z.array(SanitizedQuestionSchema).length(0),
    errorReason: z.enum(['BLURRY', 'NOT_SOLVABLE', 'TIMEOUT', 'PARSE_FAIL']),
});

export const OcrSchema = z.discriminatedUnion('isSolvable', [SolvableOcrSchema, UnsolvableOcrSchema]);

export type OcrResult              = z.infer<typeof OcrSchema>;
export type SanitizedQuestion      = z.infer<typeof SanitizedQuestionSchema>;
export type SubProblemDefinition   = z.infer<typeof SubProblemDefinitionSchema>;
