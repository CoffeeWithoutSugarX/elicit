import {END, START, StateGraph} from "@langchain/langgraph";
import {chatNode} from "@/agents/nodes/ChatNode";
import {ElicitGraphStateSchema} from "@/agents/schemas/ElicitGraphStateSchema";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import {createConversationNode, shouldCreateConversation} from "@/agents/nodes/ConversationNode";


const elicitGraph = new StateGraph({
    state: ElicitGraphStateSchema
});

const DB_URI = process.env.POSTGRES_URL!;
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await checkpointer.setup();


elicitGraph
    .addNode("llmNode", chatNode)
    .addNode("createConversationNode", createConversationNode)
    .addConditionalEdges(START, shouldCreateConversation, {
        create: "createConversationNode",
        skip: "llmNode"
    })
    .addEdge("createConversationNode", "llmNode")
    .addEdge("llmNode", END);

export const compiledElicitGraph = elicitGraph.compile({
    checkpointer
});