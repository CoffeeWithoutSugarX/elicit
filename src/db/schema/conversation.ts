import { pgTable, uuid, varchar, boolean, smallint } from "drizzle-orm/pg-core";
import { commonAuditFields } from "./_common";

export const elicitConversations = pgTable("elicit_conversations", {
    ...commonAuditFields,

    conversationId: uuid("conversation_id").defaultRandom().unique().notNull(),
    userId:         uuid("user_id").notNull(),

    title:        varchar("title", { length: 64 }), // 首条用户消息前 10 字
    hasResolved:  boolean("has_resolved").notNull().default(false),
    currentPhase: smallint("current_phase").notNull().default(0),
    problemType:  smallint("problem_type"), // null 直到 ClassifyNode 写入
});
