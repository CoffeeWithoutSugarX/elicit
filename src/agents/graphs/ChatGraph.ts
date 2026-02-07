import {END, START, StateGraph} from "@langchain/langgraph";
import {chatNode} from "@/agents/nodes/ChatNode";
import {chatSchema} from "@/agents/schemas/ChatSchema";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";


const chatStatGraph = new StateGraph({
    state: chatSchema
});

const DB_URI = "postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable";
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await checkpointer.setup();


chatStatGraph
    .addNode("llmNode", chatNode)
    .addEdge(START, "llmNode")
    .addEdge("llmNode", END);

export const compiledChatGraph = chatStatGraph.compile({
    checkpointer
});