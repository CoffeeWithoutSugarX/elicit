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

export const ElicitGraphStateSchema = z.object({
    messages: z.array(z.custom<BaseMessage>()).register(registry, {
        ...MessagesZodMeta,
        default: () => [],
    }),
    userId:         z.string().uuid(),
    conversationId: z.string().uuid(),
    questionImgUrl: z.string().url().optional(),
    hasResolved:    z.boolean().default(false),
    ocrResult:      OcrSchema.optional(),

    currentPhase:       PolyaPhaseSchema.default(PolyaPhase.UNDERSTAND),
    problemType:        ProblemTypeSchema.optional(),
    stuckCountPerPhase: StuckCountSchema.default(() => ({
        understand: 0, plan: 0, execute: 0, review: 0,
    })),
    probedQuestionIds:  z.array(z.number().int().min(1).max(5)).default(() => []),
    // 单位：messages 长度（用来判断与上一次偏离之间隔了几轮）
    lastDeviationAt:    z.number().int().nullable().default(null),
});

export type ElicitGraphState = z.infer<typeof ElicitGraphStateSchema>;
