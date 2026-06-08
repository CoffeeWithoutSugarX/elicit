import 'server-only';
import { conversationMapper } from '@/db/mappers/ConversationMapper';

export async function reconcileHasResolved(
    conversationId: string,
    state: { hasResolved: boolean; currentPhase: number; problemType?: number }
): Promise<void> {
    try {
        const dbRecord = await conversationMapper.findById(conversationId);
        if (!dbRecord) return; // 数据库记录不存在 — 无需对齐

        // 若 graph 标记已解决但 DB 未更新，则补写 DB
        if (state.hasResolved && !dbRecord.hasResolved) {
            await conversationMapper.update(conversationId, {
                hasResolved: true,
                currentPhase: state.currentPhase,
                ...(state.problemType !== undefined ? { problemType: state.problemType } : {}),
            });
            console.log('reconcileHasResolved: DB updated to match graph state', { conversationId });
        }

        // DB 已标记解决但 graph 未更新 — 以 checkpoint 为准（正常流程不应出现，仅记录日志）
        if (dbRecord.hasResolved && !state.hasResolved) {
            console.log('reconcileHasResolved: DB ahead of graph (unusual)', { conversationId });
        }
    } catch (error) {
        // Non-fatal — log and continue
        console.log('reconcileHasResolved error (non-fatal)', error);
    }
}
