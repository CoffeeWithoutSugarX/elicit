import {ChatDeepSeek} from "@langchain/deepseek";


export const chatModel = new ChatDeepSeek({
    model: "deepseek-chat",
    temperature: 0.7,
    apiKey: process.env.DEEPSEEK_API_KEY,
})
