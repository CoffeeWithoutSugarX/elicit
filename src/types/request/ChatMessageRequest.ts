import ChatMessageRoleEnum from "@/types/enums/ChatMessageRoleEnum";

export class ChatMessageRequest {

    role: ChatMessageRoleEnum;
    message: string;

    constructor(role: ChatMessageRoleEnum, message: string) {
        this.role = role;
        this.message = message;
    }
}