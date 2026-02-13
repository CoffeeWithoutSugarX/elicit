import {z} from "zod";

const PolyaLabelSchema = z.enum(["Decoding", "Devising", "Executing", "Reflecting"]);

const HintsSchema = z.object({
    l1: z.string(),
    l2: z.string(),
    l3: z.string(),
});

const MilestoneSchema = z.object({
    id: z.number().int(),
    polyaLabel: PolyaLabelSchema,
    logicGoal: z.string(),
    knowledgePoint: z.string(),
    hints: HintsSchema,
});

const SanitizedContentSchema = z.object({
    topic: z.string(),
    latexFull: z.string(),
    givenConditions: z.array(z.string()),
    implicitConditions: z.array(z.string()),
    goal: z.string(),
});

const SolvableSchema = z.object({
    isSolvable: z.literal(true),
    errorReason: z.null(),
    sanitizedContent: SanitizedContentSchema,
    milestones: z.array(MilestoneSchema),
    fullSolutionLecture: z.string(),
});

const UnsolvableSchema = z.object({
    isSolvable: z.literal(false),
    errorReason: z.string(),
    sanitizedContent: z.null(),
    milestones: z.array(MilestoneSchema).default([]),
    fullSolutionLecture: z.null(),
});

export const OcrSchema = z.discriminatedUnion("isSolvable", [
    SolvableSchema,
    UnsolvableSchema,
]);

export type OcrSchema = z.infer<typeof OcrSchema>
