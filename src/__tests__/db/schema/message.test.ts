import { describe, it, expect } from 'vitest';
import { getTableName } from 'drizzle-orm';
import { elicitMessages, type ElicitMessage, type NewElicitMessage } from '@/db/schema/message';

// Satisfy the TypeScript "unused import" rule by referencing the types in a
// compile-time-only way; the type aliases are tested implicitly through the
// table they are derived from.
type _TypeCheck = ElicitMessage extends Record<string, unknown> ? true : false;
type _TypeCheck2 = NewElicitMessage extends Record<string, unknown> ? true : false;

describe('elicitMessages table schema', () => {
    it('is defined and is an object', () => {
        expect(elicitMessages).toBeDefined();
        expect(typeof elicitMessages).toBe('object');
    });

    it('has the correct table name', () => {
        expect(getTableName(elicitMessages)).toBe('elicit_messages');
    });

    it('exposes all expected columns', () => {
        const cols = Object.keys(elicitMessages);
        const expected = [
            // audit fields
            'id',
            'messageId',
            'version',
            'isDeleted',
            'createdAt',
            'updatedAt',
            'extInfo',
            // tenancy / relation
            'userId',
            'conversationId',
            // message body
            'content',
            // enums
            'role',
            'type',
            // optional
            'imgUrl',
            // phase & metadata
            'phase',
            'metadata',
        ];

        for (const col of expected) {
            expect(cols, `expected column "${col}" to exist`).toContain(col);
        }
    });

    it('exports ElicitMessage and NewElicitMessage type shapes (structural check via column names)', () => {
        // Type aliases exist at compile time; at runtime we verify the table that backs them
        // by checking the column count is consistent with the schema definition
        const colCount = Object.keys(elicitMessages).length;
        // 16 columns defined in message.ts
        expect(colCount).toBe(16);
    });
});
