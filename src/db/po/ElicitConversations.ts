import {pgTable, serial, text, timestamp, uuid, jsonb, integer, varchar, bigint} from 'drizzle-orm/pg-core';

// 1. 会话表：存储逻辑上下文
export const conversations = pgTable('elicit_conversations', {
    id: bigint('id', {mode: 'bigint'}), // bigint -> TS bigint
    createdAt: timestamp('created_at', {withTimezone: true}), // timestamptz
    updatedAt: timestamp('updated_at',{withTimezone: true}), // timestamp (no tz)
    conversationId: uuid('conversation_id'),
    title: varchar('title'),
});