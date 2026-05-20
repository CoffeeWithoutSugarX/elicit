import { ChatMessageRole } from "@/types/enums/chatMessageRole.enum";

export class ChatMessageRequest {
    role: ChatMessageRole;
    message: string;
    imgUrl?: string;

    constructor(role: ChatMessageRole, message: string, imgUrl?: string) {
        this.role = role;
        this.message = message;
        this.imgUrl = imgUrl;
    }
}
