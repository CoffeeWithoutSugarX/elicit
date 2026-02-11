import 'server-only'
import {db} from "@/db";
import {elicitConversations} from "@/db/schema/conversation";
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
        console.log('ConversationMapper.findById invoked with conversationId:', conversationId)
        const result = await db.select()
            .from(elicitConversations)
            .where(eq(elicitConversations.conversationId, conversationId))
            .limit(1);
        console.log('ConversationMapper.findById result:', result)
        return result[0];
    }

}


export const conversationMapper = new ConversationMapper();