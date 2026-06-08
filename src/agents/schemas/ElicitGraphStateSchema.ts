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

// messages 通道：state 与 input schema 共享同一个 zod 对象，
// 避免 StateGraph._addSchema 在 input schema 添加时抛 "channel already exists with a different type"
const messagesChannel = z.array(z.custom<BaseMessage>()).register(registry, {
    ...MessagesZodMeta,
    default: () => [],
});

export const ElicitGraphStateSchema = z.object({
    messages:       messagesChannel,
    userId:         z.string().uuid(),
    conversationId: z.string().uuid(),
    questionImgUrl: z.string().optional(),

    // "跨 invoke 持久化且有默认值"的字段统一用 .register(registry, { default: () => v }) 而非 .default(v)。
    // 原因：graph.stream(partialInput) 时，LangGraph 会用 input schema 的 .partial().parse() 并给
    // 缺省字段补 default 值写回 channel，从而覆盖 checkpoint 中的值（经 MemorySaver 实证）。
    // 独立的 input schema（见下方 ElicitGraphInputSchema）只含 HTTP 输入携带的字段，
    // 其余字段不在 input schema 中出现，就不会被 parse 时的 default 值覆盖。
    hasResolved:    z.boolean().register(registry, { default: () => false }),
    ocrResult:      OcrSchema.optional(),

    currentPhase:       PolyaPhaseSchema.register(registry, { default: () => PolyaPhase.UNDERSTAND }),
    problemType:        ProblemTypeSchema.optional(),
    // 单位：messages 长度（用来判断与上一次偏离之间隔了几轮）
    lastDeviationAt:    z.number().int().nullable().register(registry, { default: () => null }),

    subProblems:            z.array(SubProblemStateSchema).register(registry, { default: () => [] }),
    currentSubProblemIndex: z.number().int().min(0).register(registry, { default: () => 0 }),
});

// 独立 input schema：只含真正由 HTTP 请求携带的字段。
// 其余字段（hasResolved / currentPhase / subProblems 等）不在这里出现，
// 确保跨 invoke 时 LangGraph 不会用 default 值覆盖 checkpoint 里已 updateState 写入的值。
export const ElicitGraphInputSchema = z.object({
    messages:       messagesChannel,
    userId:         z.string().uuid(),
    conversationId: z.string().uuid(),
    questionImgUrl: z.string().optional(),
});

export type ElicitGraphState = z.infer<typeof ElicitGraphStateSchema>;
export type SubProblemState  = z.infer<typeof SubProblemStateSchema>;
