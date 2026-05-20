import { ChatOpenAI } from "@langchain/openai";

export const qianwenOcrModel = new ChatOpenAI({
    model: "qwen-vl-ocr-latest",
    apiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
        // 北京地域；其他地域改 dashscope-us / dashscope-intl
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
});
