import {z} from "zod";
import {BaseMessage} from "@langchain/core/messages";


export const chatSchema = z.object({
    messages: z.array(z.custom<BaseMessage>())
})

export type ChatSchema = z.infer<typeof chatSchema>