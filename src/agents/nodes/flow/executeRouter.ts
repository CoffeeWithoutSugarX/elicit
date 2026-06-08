import { END } from '@langchain/langgraph';
import { type ElicitGraphState } from '@/agents/schemas/ElicitGraphStateSchema';
import { understandNodeName } from '@/agents/nodes/phases/UnderstandNode';
import { planNodeName } from '@/agents/nodes/phases/PlanNode';
import { reviewNodeName } from '@/agents/nodes/phases/ReviewNode';
import { PolyaPhase } from '@/types/enums/polyaPhase.enum';

/**
 * LangGraph 条件边函数：在 executeNode 执行后决定下一跳。
 *
 * executeNode 在返回前已完成以下 state 写入（Router 据此判断）：
 *   - STAY              → currentPhase 保持 EXECUTE，currentSubProblem.status = 'pending'
 *   - ESCALATE          → currentPhase = PLAN
 *   - SUB_PROBLEM_DONE / PROBLEM_BLOCKED + 后续有 pending 子问题
 *                       → currentPhase = UNDERSTAND，currentSubProblemIndex 已推进
 *   - SUB_PROBLEM_DONE / PROBLEM_BLOCKED + 无更多 pending 子问题
 *                       → currentPhase 保持 EXECUTE，currentSubProblem.status = 'done'/'blocked'
 *
 * 路由规则：
 *   1. currentPhase === PLAN        → planNode（ESCALATE 洞察回路）
 *   2. currentPhase === UNDERSTAND  → understandNode（推进到下一子问题）
 *   3. currentSubProblem.status === 'done' | 'blocked'（且无 pending 后续）→ reviewNode
 *   4. 其他（STAY）                 → END（等待下一条用户消息）
 */
export function executeRouter(state: ElicitGraphState): string {
  // —— 1. ESCALATE：currentPhase 已回退到 PLAN ——
  if (state.currentPhase === PolyaPhase.PLAN) {
    return planNodeName;
  }

  // —— 2. 已推进到下一子问题：currentPhase 已重置为 UNDERSTAND ——
  if (state.currentPhase === PolyaPhase.UNDERSTAND) {
    return understandNodeName;
  }

  // —— 3. 最后一个子问题完成 / 阻塞（currentPhase 仍为 EXECUTE）——
  const current = state.subProblems[state.currentSubProblemIndex];
  if (current && (current.status === 'done' || current.status === 'blocked')) {
    return reviewNodeName;
  }

  // —— 4. STAY / 兜底 → 等待下一条用户消息 ——
  return END;
}
