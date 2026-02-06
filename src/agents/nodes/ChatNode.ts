import {ChatSchema} from "@/agents/schemas/ChatSchema";
import {ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate} from "@langchain/core/prompts";
import {chatModel} from "@/agents/models/deppseek-model";


export const llmNode = async (state: ChatSchema) => {
    const assistantPrompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate("你是一个健谈的中文AI助手，请结合上下文，用中文回答用户问题"),
        new MessagesPlaceholder("messages")
    ]);

    const chain = assistantPrompt.pipe(chatModel);

    const result = await chain.invoke({messages: state.messages});

    return {
        messages: [result]
    }
}