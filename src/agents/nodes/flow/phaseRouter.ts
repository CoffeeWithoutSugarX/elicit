import { PolyaPhase } from '@/types/enums/polyaPhase.enum';
import { understandNodeName } from '@/agents/nodes/phases/UnderstandNode';
import { planNodeName } from '@/agents/nodes/phases/PlanNode';
import { executeNodeName } from '@/agents/nodes/phases/ExecuteNode';
import { reviewNodeName } from '@/agents/nodes/phases/ReviewNode';

/**
 * 将 PolyaPhase 数值映射到对应的节点名称字符串。
 * 供 startFinOutNode 内联调用，也供需要显式相变的节点导入。
 */
export function phaseRouter(currentPhase: number): string {
  switch (currentPhase) {
    case PolyaPhase.UNDERSTAND: return understandNodeName;
    case PolyaPhase.PLAN:       return planNodeName;
    case PolyaPhase.EXECUTE:    return executeNodeName;
    case PolyaPhase.REVIEW:     return reviewNodeName;
    default:                    return understandNodeName;
  }
}
