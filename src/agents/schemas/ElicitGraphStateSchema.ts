import {z} from "zod";
import {BaseMessage} from "@langchain/core/messages";
import {MessagesZodMeta} from "@langchain/langgraph";
import {registry} from "@langchain/langgraph/zod";
import {OcrSchema} from "@/agents/schemas/OcrSchema";


export const ElicitGraphStateSchema = z.object({
    messages: z.array(z.custom<BaseMessage>()).register(registry, {
        ...MessagesZodMeta,
        default: () => []
    }),
    userId: z.string(),
    conversationId: z.string(),
    questionImgUrl: z.string().optional(),
    hasResolved: z.boolean().default(false),
    ocrResult: OcrSchema,
})

export type ElicitGraphState = z.infer<typeof ElicitGraphStateSchema>