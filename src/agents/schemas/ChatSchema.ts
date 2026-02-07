import {z} from "zod";
import {BaseMessage} from "@langchain/core/messages";
import {MessagesZodMeta} from "@langchain/langgraph";
import {registry} from "@langchain/langgraph/zod";


export const chatSchema = z.object({
    messages: z.array(z.custom<BaseMessage>()).register(registry, {
        ...MessagesZodMeta,
        default: () => []
    })
})

export type ChatSchema = z.infer<typeof chatSchema>