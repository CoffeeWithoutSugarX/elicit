import { AIMessage } from "@langchain/core/messages";
import { getWriter } from "@langchain/langgraph";
import type { GuardAction } from "@/agents/nodes/guards/runGuardChain";
import type { ElicitGraphState } from "@/agents/schemas/ElicitGraphStateSchema";

// 终态文案集中管理，与各节点保持一致
const VISION_FAILURE_TEXT = '（图片识别失败，无法继续引导，请重新上传清晰的题目图片）';
const OUT_OF_SCOPE_TEXT = '（这道题超出了初中数学的范围，我只能帮你解决初中数学题哦）';

/**
 * 处理 VISION_FAILURE / OUT_OF_SCOPE 两种终态 guard。
 * nostream 模式下前端收不到 messages 流，需主动推干净正文。
 *
 * @param guardAction runGuardChain 返回的 GuardAction（非 null）
 * @param nodeName    调用节点的名称，用于日志格式对齐（`NodeName guard fired: KIND`）
 * @returns 终态时返回 Partial<ElicitGraphState>，非终态（PULL_BACK 等）返回 null
 */
export function handleTerminalGuard(
    guardAction: GuardAction,
    nodeName: string,
): Partial<ElicitGraphState> | null {
    if (guardAction.kind === 'VISION_FAILURE') {
        console.log(`${nodeName} guard fired: VISION_FAILURE`);
        // nostream 模式下前端收不到 messages 流，需主动推干净正文
        getWriter()?.({ kind: 'assistant_message', text: VISION_FAILURE_TEXT });
        return { messages: [new AIMessage(VISION_FAILURE_TEXT)] };
    }

    if (guardAction.kind === 'OUT_OF_SCOPE') {
        console.log(`${nodeName} guard fired: OUT_OF_SCOPE`);
        // nostream 模式下前端收不到 messages 流，需主动推干净正文
        getWriter()?.({ kind: 'assistant_message', text: OUT_OF_SCOPE_TEXT });
        return { messages: [new AIMessage(OUT_OF_SCOPE_TEXT)] };
    }

    return null;
}
