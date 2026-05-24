import { ElicitGraphState } from "@/agents/schemas/ElicitGraphStateSchema";
import { conversationNodeName, shouldCreateConversation } from "@/agents/nodes/flow/ConversationNode";
import { ocrNodeName, shouldOcr } from "@/agents/nodes/flow/OcrNode";
import { classifyNodeName } from "@/agents/nodes/phases/ClassifyNode";
import { understandNodeName } from "@/agents/nodes/phases/UnderstandNode";
import { planNodeName } from "@/agents/nodes/phases/PlanNode";
import { executeNodeName } from "@/agents/nodes/phases/ExecuteNode";
import { reviewNodeName } from "@/agents/nodes/phases/ReviewNode";
import { PolyaPhase } from "@/types/enums/polyaPhase.enum";
import { reconcileHasResolved } from "@/agents/state/reconcileHasResolved";


export const startFinOutNode = async (state: ElicitGraphState) => {
    // C9 reconcile on entry
    await reconcileHasResolved(state.conversationId, {
        hasResolved: state.hasResolved,
        currentPhase: state.currentPhase,
        problemType: state.problemType,
    });

    const selectedNodes: string[] = [];

    // 检查会话是否需要创建
    const convNodes = await shouldCreateConversation(state);
    if (convNodes.includes(conversationNodeName)) {
        selectedNodes.push(conversationNodeName);
    }

    // 检查 OCR 是否需要运行（首次 invoke 且有图片，且尚未解析）
    const ocrNodes = shouldOcr(state);
    if (ocrNodes.includes(ocrNodeName)) {
        selectedNodes.push(ocrNodeName);
    }

    // 如果有前置任务（建会话或 OCR），先执行这些
    if (selectedNodes.length > 0) {
        return selectedNodes;
    }

    // 第二次 invoke（hasResolved=true，problemType 尚未写入）→ 走分类节点
    if (state.hasResolved && state.problemType === undefined) {
        return [classifyNodeName];
    }

    // 后续 invoke：根据 currentPhase 路由到对应阶段节点
    if (state.hasResolved && state.problemType !== undefined) {
        return [phaseRouter(state)];
    }

    // 兜底：无图片的纯文字首次消息，路由到理解节点
    return [understandNodeName];
};

function phaseRouter(state: ElicitGraphState): string {
    switch (state.currentPhase) {
        case PolyaPhase.UNDERSTAND:
            return understandNodeName;
        case PolyaPhase.PLAN:
            return planNodeName;
        case PolyaPhase.EXECUTE:
            return executeNodeName;
        case PolyaPhase.REVIEW:
            return reviewNodeName;
        default:
            return understandNodeName;
    }
}
