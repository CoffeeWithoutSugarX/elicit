import {END, START, StateGraph} from "@langchain/langgraph";
import {chatNode, chatNodeName} from "@/agents/nodes/ChatNode";
import {ElicitGraphStateSchema} from "@/agents/schemas/ElicitGraphStateSchema";
import {PostgresSaver} from "@langchain/langgraph-checkpoint-postgres";
import {conversationNodeName, createConversationNode, shouldCreateConversation} from "@/agents/nodes/ConversationNode";
import {ocrNode, ocrNodeName, shouldOcr} from "@/agents/nodes/OcrNode";


const elicitGraph = new StateGraph({
    state: ElicitGraphStateSchema
});

const DB_URI = process.env.POSTGRES_URL!;
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await checkpointer.setup();


elicitGraph
    .addNode(chatNodeName, chatNode)
    .addNode(conversationNodeName, createConversationNode)
    .addNode(ocrNodeName, ocrNode)
    .addConditionalEdges(START, shouldCreateConversation)
    .addConditionalEdges(START, shouldOcr)
    .addEdge(conversationNodeName, chatNodeName)
    .addEdge(ocrNodeName, chatNodeName)
    .addEdge(chatNodeName, END);

export const compiledElicitGraph = elicitGraph.compile({
    checkpointer
});