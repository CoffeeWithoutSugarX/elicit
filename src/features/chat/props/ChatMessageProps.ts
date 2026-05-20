import { ChatMessageRole } from "@/types/enums/chatMessageRole.enum";
import { ChatMessageType } from "@/types/enums/chatMessageType.enum";

export default class ChatMessageProps {
    id: string;
    conversationId: string;
    role: ChatMessageRole;
    message: string;
    type: ChatMessageType;
    imgUrl?: string | null;

    constructor(id: string, conversationId: string, role: ChatMessageRole, message: string, type: ChatMessageType, imgUrl?: string | null) {
        this.id = id;
        this.conversationId = conversationId;
        this.role = role;
        this.message = message;
        this.type = type;
        this.imgUrl = imgUrl;
    }
}
