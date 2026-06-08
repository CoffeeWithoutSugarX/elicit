import { ElicitGraphState } from "@/agents/schemas/ElicitGraphStateSchema";
import { visionNode, visionNodeName } from "@/agents/nodes/flow/VisionNode";

// shouldOcr: 当 hasResolved=false 且存在 questionImgUrl 时才跑 OCR 节点
export const shouldOcr = (state: ElicitGraphState): string[] => {
    if (state.hasResolved || !state.questionImgUrl) {
        return [];
    }
    return [ocrNodeName];
}

// 保持与 ChatGraph.ts 的向后兼容——名字与实现均委托给 VisionNode
export const ocrNodeName = visionNodeName;
export const ocrNode = visionNode;
