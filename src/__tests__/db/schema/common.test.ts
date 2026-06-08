import { describe, it, expect } from 'vitest';
import { commonAuditFields } from '@/db/schema/_common';

describe('commonAuditFields', () => {
    it('exports an object with exactly the 6 expected field keys', () => {
        const keys = Object.keys(commonAuditFields);
        expect(keys).toContain('id');
        expect(keys).toContain('version');
        expect(keys).toContain('isDeleted');
        expect(keys).toContain('createdAt');
        expect(keys).toContain('updatedAt');
        expect(keys).toContain('extInfo');
        // Confirm no extra undocumented fields are silently added
        expect(keys).toHaveLength(6);
    });

    it('each field value is a Drizzle column builder (has a columnType property)', () => {
        // Drizzle column builder 的 columnType 在 col.config.columnType 上（非实例直接属性）
        for (const [key, col] of Object.entries(commonAuditFields)) {
            expect(col, `field "${key}" should be a drizzle column`).toBeDefined();
            expect(col).toHaveProperty('config.columnType');
        }
    });
});
