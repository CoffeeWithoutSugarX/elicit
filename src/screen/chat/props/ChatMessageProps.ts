import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";
import ChatMessageTypeEnum from "@/enums/ChatMessageTypeEnum";

export default class ChatMessageProps {
    id: string;
    conversationId: string;
    role: ChatMessageRoleEnum;
    message: string;
    type: ChatMessageTypeEnum

    constructor(id: string, conversationId: string, role: ChatMessageRoleEnum, message: string, type: ChatMessageTypeEnum) {
        this.id = id;
        this.conversationId = conversationId;
        this.role = role;
        this.message = message;
        this.type = type;
    }
}