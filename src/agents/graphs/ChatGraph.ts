import { END, START, StateGraph } from "@langchain/langgraph";
import { ElicitGraphStateSchema } from "@/agents/schemas/ElicitGraphStateSchema";
import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import { conversationNodeName, createConversationNode } from "@/agents/nodes/flow/ConversationNode";
import { ocrNode, ocrNodeName } from "@/agents/nodes/flow/OcrNode";
import { startFinOutNode } from "@/agents/nodes/flow/StartFinoutNode";
import { classifyNode, classifyNodeName } from "@/agents/nodes/phases/ClassifyNode";
import { understandNode, understandNodeName } from "@/agents/nodes/phases/UnderstandNode";
import { planNode, planNodeName } from "@/agents/nodes/phases/PlanNode";
import { executeNode, executeNodeName } from "@/agents/nodes/phases/ExecuteNode";
import { reviewNode, reviewNodeName } from "@/agents/nodes/phases/ReviewNode";
import { executeRouter } from "@/agents/nodes/flow/executeRouter";


const elicitGraph = new StateGraph({
    state: ElicitGraphStateSchema
});

const DB_URI = process.env.POSTGRES_URL!;
const checkpointer = PostgresSaver.fromConnString(DB_URI);
// await checkpointer.setup();


elicitGraph
    // 注册所有节点
    .addNode(conversationNodeName, createConversationNode)
    .addNode(ocrNodeName, ocrNode)
    .addNode(classifyNodeName, classifyNode)
    .addNode(understandNodeName, understandNode)
    .addNode(planNodeName, planNode)
    .addNode(executeNodeName, executeNode)
    .addNode(reviewNodeName, reviewNode)

    // 入口：条件 fan-out
    .addConditionalEdges(START, startFinOutNode)

    // 首次 invoke 路径：建会话 → OCR → END（等待用户选题）
    .addEdge(conversationNodeName, ocrNodeName)
    .addEdge(ocrNodeName, END)

    // 第二次 invoke 路径（post /resolve）：分类 → 理解 → END
    .addEdge(classifyNodeName, understandNodeName)
    .addEdge(understandNodeName, END)

    // 后续 invoke：各阶段节点 → END（等待下一条用户消息）
    .addEdge(planNodeName, END)
    // executeNode 使用条件边：SUB_PROBLEM_DONE/PROBLEM_BLOCKED → understandNode/reviewNode，
    // ESCALATE → planNode，STAY → END
    .addConditionalEdges(executeNodeName, executeRouter)
    .addEdge(reviewNodeName, END);

export const compiledElicitGraph = elicitGraph.compile({
    checkpointer
});
