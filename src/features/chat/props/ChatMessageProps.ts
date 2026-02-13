import ChatMessageRoleEnum from "@/types/enums/ChatMessageRoleEnum";
import ChatMessageTypeEnum from "@/types/enums/ChatMessageTypeEnum";

export default class ChatMessageProps {
    id: string;
    conversationId: string;
    role: ChatMessageRoleEnum;
    message: string;
    type: ChatMessageTypeEnum;
    imgUrl?: string | null;


    constructor(id: string, conversationId: string, role: ChatMessageRoleEnum, message: string, type: ChatMessageTypeEnum, imgUrl?: string | null) {
        this.id = id;
        this.conversationId = conversationId;
        this.role = role;
        this.message = message;
        this.type = type;
        this.imgUrl = imgUrl;
    }
}
