import {END, START, StateGraph} from "@langchain/langgraph";
import {llmNode} from "@/agents/nodes/ChatNode";
import {chatSchema} from "@/agents/schemas/ChatSchema";


const chatStatGraph = new StateGraph({
    state: chatSchema
});


chatStatGraph
    .addNode("llmNode", llmNode)
    .addEdge(START, "llmNode")
    .addEdge("llmNode", END);

export const compiledChatGraph = chatStatGraph.compile();