// 业务表公共字段集——沿用 qian-quest 公共字段惯例（v0.1 7 字段）。
// 通过对象展开复用：
//   pgTable("elicit_xxx", { ...commonAuditFields, {biz}Id: uuid("{biz}_id")..., ...业务字段 })
//
// 注意：
// - {biz}_id 因命名因表而异，各表自己声明（不进 helper）
// - user_id 是业务字段（多租户隔离），各表按需声明（不进 helper）
import { bigint, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const commonAuditFields = {
    id:        bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
    version:   integer("version").notNull().default(0),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    extInfo:   jsonb("ext_info").$type<Record<string, unknown>>().notNull().default({}),
};
