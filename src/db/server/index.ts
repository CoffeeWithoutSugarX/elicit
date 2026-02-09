
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as conversationSchema from "@/db/server/schema/conversation";

// 注意：在服务端使用连接池端口 6543 或直接连接 5432
const connectionString = process.env.POSTGRES_URL!;

const schema = {
    ...conversationSchema,
};

// 禁用预取以兼容 Supabase 的连接池 (Supavisor)
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, {
    schema,
});