import 'server-only'
import {db} from "@/db/server";
import {elicitConversations} from "@/db/server/schema/conversation";
import {eq} from "drizzle-orm";

class ConversationMapper {

    async create(conversationId: string, userId: string, title: string) {
        const result = await db.insert(elicitConversations).values({
            conversationId,
            userId,
            title,
        }).returning();
        return result[0];
    }

    async findById(conversationId: string) {
        const result = await db.select().from(elicitConversations).where(eq(elicitConversations.conversationId, conversationId)).limit(1);
        return result[0];
    }

}


export const conversationMapper = new ConversationMapper();