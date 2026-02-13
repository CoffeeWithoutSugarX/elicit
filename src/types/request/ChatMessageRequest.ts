import ChatMessageRoleEnum from "@/types/enums/ChatMessageRoleEnum";

export class ChatMessageRequest {

    role: ChatMessageRoleEnum;
    message: string;
    imgUrl?: string;

    constructor(role: ChatMessageRoleEnum, message: string, imgUrl?: string) {
        this.role = role;
        this.message = message;
        this.imgUrl = imgUrl;
    }
}