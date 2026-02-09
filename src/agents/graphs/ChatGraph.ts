import {END, START, StateGraph} from "@langchain/langgraph";
import {chatNode} from "@/agents/nodes/ChatNode";
import {chatSchema} from "@/agents/schemas/ChatSchema";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import {createConversationNode, shouldCreateConversation} from "@/agents/nodes/ConversationNode";


const chatStatGraph = new StateGraph({
    state: chatSchema
});

const DB_URI = process.env.POSTGRES_URL!;
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await checkpointer.setup();


chatStatGraph
    .addNode("llmNode", chatNode)
    .addNode("createConversationNode", createConversationNode)
    .addConditionalEdges(START, shouldCreateConversation, {
        create: "createConversationNode",
        skip: "llmNode"
    })
    .addEdge("createConversationNode", "llmNode")
    .addEdge("llmNode", END);

export const compiledChatGraph = chatStatGraph.compile({
    checkpointer
});