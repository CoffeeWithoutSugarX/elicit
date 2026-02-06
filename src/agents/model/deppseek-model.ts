import {ChatOpenAI} from "@langchain/openai";


export const chatModel = new ChatOpenAI({
    model: "deepseek-chat",
    temperature: 0.7,
    apiKey: process.env.DEEPSEEK_API_KEY,
    configuration: {
        baseURL: "https://api.deepseek.com/v1"
    }
})
