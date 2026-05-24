// elicit_messages 的 Drizzle schema 镜像。
// 用途：类型派生 + ADR 漂移检测。
// 运行时查询走浏览器侧 Supabase 客户端，不经此 schema。
//
// 注意：此表字段语义与 conversations 不同，不展开 commonAuditFields，
// 所有字段单独声明（见 doc §7.3.1）。
import {
    pgTable,
    bigint,
    uuid,
    integer,
    boolean,
    timestamp,
    jsonb,
    text,
    smallint,
    varchar,
    uniqueIndex,
    index,
} from "drizzle-orm/pg-core";

export const elicitMessages = pgTable(
    "elicit_messages",
    {
        // ── 公共审计字段（因语义差异，不展开 commonAuditFields）──
        id:        bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
        messageId: uuid("message_id").defaultRandom().notNull(),
        version:   integer("version").notNull().default(0),
        isDeleted: boolean("is_deleted").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
        extInfo:   jsonb("ext_info").$type<Record<string, unknown>>().notNull().default({}),

        // ── 多租户 / 关联字段 ──
        userId:         uuid("user_id").notNull(),
        conversationId: uuid("conversation_id").notNull(), // 无默认值（CR-001）

        // ── 消息主体 ──
        content: text("content").notNull(),

        // ── 枚举字段（smallint）──
        // role: 0=user, 1=assistant; check in (0,1)
        role: smallint("role").notNull(),
        // type: 1=text, 2=image; check in (1,2)
        type: smallint("type").notNull(),

        // ── 可选字段 ──
        imgUrl: varchar("img_url", { length: 512 }), // nullable，仅 type=2 时有值

        // ── 阶段与元数据 ──
        // phase: null 或 in (0,1,2,3,4)
        phase:    smallint("phase"),
        metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    },
    (table) => [
        // 唯一索引：(conversation_id, message_id) 幂等保护
        uniqueIndex("elicit_messages_message_id_unique").on(
            table.conversationId,
            table.messageId,
        ),
        // 普通索引：(conversation_id, created_at asc) 历史消息加载
        index("elicit_messages_conversation_id_idx").on(
            table.conversationId,
            table.createdAt,
        ),
    ],
);

// 从 schema 派生的 TypeScript 类型
export type ElicitMessage    = typeof elicitMessages.$inferSelect;
export type NewElicitMessage = typeof elicitMessages.$inferInsert;
