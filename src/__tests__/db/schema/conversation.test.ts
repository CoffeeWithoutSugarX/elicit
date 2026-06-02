import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { elicitConversations } from '@/db/schema/conversation';

describe('elicitConversations table schema', () => {
    it('is defined and is an object', () => {
        expect(elicitConversations).toBeDefined();
        expect(typeof elicitConversations).toBe('object');
    });

    it('has the correct table name', () => {
        expect(getTableName(elicitConversations)).toBe('elicit_conversations');
    });

    it('exposes all expected columns', () => {
        const cols = Object.keys(elicitConversations);
        const expected = [
            // inherited from commonAuditFields
            'id',
            'version',
            'isDeleted',
            'createdAt',
            'updatedAt',
            'extInfo',
            // business columns
            'conversationId',
            'userId',
            'title',
            'hasResolved',
            'currentPhase',
            'problemType',
        ];

        for (const col of expected) {
            expect(cols, `expected column "${col}" to exist`).toContain(col);
        }
    });
});
