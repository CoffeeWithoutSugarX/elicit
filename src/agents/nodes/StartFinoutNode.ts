import {ElicitGraphState} from "@/agents/schemas/ElicitGraphStateSchema";
import {conversationNodeName, shouldCreateConversation} from "@/agents/nodes/ConversationNode";
import {ocrNodeName, shouldOcr} from "@/agents/nodes/OcrNode";
import {chatNodeName} from "@/agents/nodes/ChatNode";


export const startFinOutNode = async (state: ElicitGraphState) => {
    const selectedNode: string[] = [];

    const convNodes = await shouldCreateConversation(state);
    // 只有当建议去 conversationNodeName 时才加入（如果是 chatNode 则忽略，因为后面会统一处理）
    if (convNodes.includes(conversationNodeName)) {
        selectedNode.push(conversationNodeName);
    }

    // 获取 OCR 的建议路径
    const ocrNodes = shouldOcr(state);
    if (ocrNodes.includes(ocrNodeName)) {
        selectedNode.push(ocrNodeName);
    }

    // 如果没有任何前置异步任务（OCR或建会话），则直接进入聊天节点
    if (selectedNode.length === 0) {
        return [chatNodeName];
    }

    return selectedNode;
}