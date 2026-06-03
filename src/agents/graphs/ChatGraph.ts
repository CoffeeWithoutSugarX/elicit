import { END, START, StateGraph } from "@langchain/langgraph";
import { ElicitGraphStateSchema, ElicitGraphInputSchema } from "@/agents/schemas/ElicitGraphStateSchema";
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


// input schema 只含 HTTP 请求携带的字段（messages/userId/conversationId/questionImgUrl），
// 其余跨 invoke 持久化字段不在 input schema 中，防止每次 stream() 时 LangGraph 用
// default 值覆盖 checkpoint 里已 updateState 写入的值（如 hasResolved/currentPhase/subProblems）。
const elicitGraph = new StateGraph({
    state: ElicitGraphStateSchema,
    input: ElicitGraphInputSchema,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .addConditionalEdges(START, startFinOutNode as any)

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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .addConditionalEdges(executeNodeName, executeRouter as any)
    .addEdge(reviewNodeName, END);

export const compiledElicitGraph = elicitGraph.compile({
    checkpointer
});
