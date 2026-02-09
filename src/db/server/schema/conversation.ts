import { pgTable, bigint, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const elicitConversations = pgTable("elicit_conversations", {
    // id 是自增的 bigint
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),
    // 业务层面的 UUID
    conversationId: uuid("conversation_id").defaultRandom().notNull(),
    userId: uuid("user_id").notNull(),
    title: varchar("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});