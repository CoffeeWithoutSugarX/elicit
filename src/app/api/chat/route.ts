import {chatModel} from "@/agents/model/deppseek-model";

export async function POST() {
    const conversation = [
        {role: "system", content: "You are a helpful assistant that translates English to French."},
        {role: "user", content: "Translate: I love programming."},
        {role: "assistant", content: "J'adore la programmation."},
        {role: "user", content: "Translate: I love building applications."},
    ];

    const response = await chatModel.invoke(conversation);
    return Response.json(response.content)
}