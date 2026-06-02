import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";
import { MessagesZodMeta } from "@langchain/langgraph";
import { registry } from "@langchain/langgraph/zod";
import { OcrSchema } from "@/agents/schemas/OcrSchema";
import { PolyaPhase } from "@/types/enums/polyaPhase.enum";
import { ProblemType } from "@/types/enums/problemType.enum";

export const PolyaPhaseSchema = z.union([
    z.literal(PolyaPhase.UNDERSTAND),
    z.literal(PolyaPhase.PLAN),
    z.literal(PolyaPhase.EXECUTE),
    z.literal(PolyaPhase.REVIEW),
    z.literal(PolyaPhase.DONE),
]);

export const ProblemTypeSchema = z.union([
    z.literal(ProblemType.ALGEBRA),
    z.literal(ProblemType.GEOMETRY),
    z.literal(ProblemType.FUNCTION),
    z.literal(ProblemType.OTHER),
]);

const StuckCountSchema = z.object({
    understand: z.number().int().min(0).default(0),
    plan:       z.number().int().min(0).default(0),
    execute:    z.number().int().min(0).default(0),
    review:     z.number().int().min(0).default(0),
});

const SubProblemStateSchema = z.object({
    index:           z.number().int().min(0),
    goal:            z.string().min(1).max(50),
    givenConditions: z.array(z.string()).default([]),
    milestones:      z.array(z.string()).max(4).default([]),
    status:             z.enum(['pending', 'done', 'blocked']).default('pending'),
    insightPoints:      z.array(z.string()).default([]),
    stuckCountPerPhase: StuckCountSchema.default(() => ({
        understand: 0, plan: 0, execute: 0, review: 0,
    })),
    probedQuestionIdsPerPhase: z.object({
        understand: z.array(z.number().int().min(1).max(5)).default(() => []),
        plan:       z.array(z.number().int().min(1).max(5)).default(() => []),
        execute:    z.array(z.number().int().min(1).max(5)).default(() => []),
        review:     z.array(z.number().int().min(1).max(5)).default(() => []),
    }).default(() => ({
        understand: [], plan: [], execute: [], review: [],
    })),
});

export const ElicitGraphStateSchema = z.object({
    messages: z.array(z.custom<BaseMessage>()).register(registry, {
        ...MessagesZodMeta,
        default: () => [],
    }),
    userId:         z.string().uuid(),
    conversationId: z.string().uuid(),
    questionImgUrl: z.string().optional(),
    hasResolved:    z.boolean().default(false),
    ocrResult:      OcrSchema.optional(),

    currentPhase:       PolyaPhaseSchema.default(PolyaPhase.UNDERSTAND),
    problemType:        ProblemTypeSchema.optional(),
    // 单位：messages 长度（用来判断与上一次偏离之间隔了几轮）
    lastDeviationAt:    z.number().int().nullable().default(null),

    subProblems:            z.array(SubProblemStateSchema).default(() => []),
    currentSubProblemIndex: z.number().int().min(0).default(0),
});

export type ElicitGraphState = z.infer<typeof ElicitGraphStateSchema>;
export type SubProblemState  = z.infer<typeof SubProblemStateSchema>;
