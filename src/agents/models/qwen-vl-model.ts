import { ChatOpenAI } from "@langchain/openai";

export const visionModel = new ChatOpenAI({
    model: "qwen3-vl-plus",
    temperature: 0,
    apiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    },
    // 多题富字段 OCR JSON 在 1024 token 会被截断，导致服务端 JSON.parse 抛 "Unterminated string"
    maxTokens: 8192,
});
