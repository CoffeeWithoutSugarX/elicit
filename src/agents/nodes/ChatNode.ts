import {ChatSchema} from "@/agents/schemas/ChatSchema";
import {
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate
} from "@langchain/core/prompts";
import {chatModel} from "@/agents/models/deppseek-model";


export const llmNode = async (state: ChatSchema) => {
    const assistantPrompt = ChatPromptTemplate.fromMessages([
        SystemMessagePromptTemplate.fromTemplate(
            [
                "你是一个健谈的中文AI助手。",
                "你会收到两部分信息：history(历史对话) 和 input(当前用户问题)。",
                "请优先回答 input，并在需要时参考 history；不要把 history 当成当前问题。 history:{history}",
            ].join("\n")
        ),
        HumanMessagePromptTemplate.fromTemplate("input: {input}"),
    ]);

    const chain = assistantPrompt.pipe(chatModel);

    const result = await chain.invoke({
        history: state.messages.slice(0, -1),
        input: state.messages.at(-1)?.content ?? "",
    });

    return {
        messages: [result]
    }
}