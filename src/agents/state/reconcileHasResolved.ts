import 'server-only';
import { conversationMapper } from '@/db/mappers/ConversationMapper';

export async function reconcileHasResolved(
    conversationId: string,
    state: { hasResolved: boolean; currentPhase: number; problemType?: number }
): Promise<void> {
    try {
        const dbRecord = await conversationMapper.findById(conversationId);
        if (!dbRecord) return; // No DB record yet — nothing to reconcile

        // If graph says resolved but DB doesn't, update DB
        if (state.hasResolved && !dbRecord.hasResolved) {
            await conversationMapper.update(conversationId, {
                hasResolved: true,
                currentPhase: state.currentPhase,
                ...(state.problemType !== undefined ? { problemType: state.problemType } : {}),
            });
            console.log('reconcileHasResolved: DB updated to match graph state', { conversationId });
        }

        // If DB says resolved but graph doesn't — trust the graph (checkpoint is authoritative)
        // This case shouldn't happen in normal flow, just log it
        if (dbRecord.hasResolved && !state.hasResolved) {
            console.log('reconcileHasResolved: DB ahead of graph (unusual)', { conversationId });
        }
    } catch (error) {
        // Non-fatal — log and continue
        console.log('reconcileHasResolved error (non-fatal)', error);
    }
}
