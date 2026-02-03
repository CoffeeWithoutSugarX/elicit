import {initChatModel} from "langchain";


export const chatModel = await initChatModel(
    "deepseek-chat",
    {
        temperature: 0.7,
        apiKey: process.env.DEEPSEEK_API_KEY
    }
);
