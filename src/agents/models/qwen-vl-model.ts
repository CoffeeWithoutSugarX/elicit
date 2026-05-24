import { ChatOpenAI } from "@langchain/openai";

export const visionModel = new ChatOpenAI({
    model: "qwen-vl-max",
    temperature: 0,
    apiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    },
    maxTokens: 1024,
});
