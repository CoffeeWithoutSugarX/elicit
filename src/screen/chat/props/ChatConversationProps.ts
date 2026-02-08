export default class ChatConversationProps {
    id: string;
    title: string;
    createdAt: Date;
    messageCount: number;

    constructor(id: string, title: string, createdAt: Date, messageCount: number) {
        this.id = id;
        this.title = title;
        this.createdAt = createdAt;
        this.messageCount = messageCount;
    }
}