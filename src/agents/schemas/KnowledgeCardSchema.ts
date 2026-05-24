import { z } from "zod";
import { MethodCategory } from "@/types/enums/methodCategory.enum";

export const CURRENT_CARD_VERSION = 1;

const KnowledgePointSchema = z.object({
    name: z.string().min(1).max(40),
    textbookRef: z.string().max(40).optional(),
});

const MethodSchema = z.object({
    name: z.string().min(1).max(40),
    category: z.union([
        z.literal(MethodCategory.ALGEBRAIC),
        z.literal(MethodCategory.GEOMETRIC),
        z.literal(MethodCategory.FUNCTIONAL),
        z.literal(MethodCategory.STATISTICAL),
        z.literal(MethodCategory.OTHER),
    ]),
});

const SubProblemSummarySchema = z.object({
    index: z.number().int().min(0),
    status: z.enum(['done', 'blocked']),
    insightPoints: z.array(z.string()).default([]),
    blockedHint: z.string().max(40).optional(),
});

export const KnowledgeCardSchema = z.object({
    schemaVersion: z.literal(1),
    type: z.literal("knowledge_card"),
    knowledgePoints: z.array(KnowledgePointSchema).min(1).max(3),
    methods: z.array(MethodSchema).min(1).max(2),
    insight: z.string().min(1).max(150),
    subProblemSummaries: z.array(SubProblemSummarySchema).optional(),
});

export type KnowledgeCard = z.infer<typeof KnowledgeCardSchema>;

export const MessageMetadataSchema = z.object({
    knowledgeCard: KnowledgeCardSchema.optional(),
}).default({});
