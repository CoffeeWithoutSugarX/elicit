import { ElicitGraphState } from "@/agents/schemas/ElicitGraphStateSchema";
import { conversationNodeName, shouldCreateConversation } from "@/agents/nodes/flow/ConversationNode";
import { ocrNodeName, shouldOcr } from "@/agents/nodes/flow/OcrNode";
import { classifyNodeName } from "@/agents/nodes/phases/ClassifyNode";
import { understandNodeName } from "@/agents/nodes/phases/UnderstandNode";
import { reconcileHasResolved } from "@/agents/state/reconcileHasResolved";
import { phaseRouter } from "@/agents/nodes/flow/phaseRouter";


export const startFinOutNode = async (state: ElicitGraphState) => {
    console.log('StartFinOutNode invoked with', { conversationId: state.conversationId, hasResolved: state.hasResolved });
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
        return [phaseRouter(state.currentPhase)];
    }

    // 兜底：无图片的纯文字首次消息，路由到理解节点
    return [understandNodeName];
};
