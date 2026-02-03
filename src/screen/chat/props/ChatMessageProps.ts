import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";

export default class ChatMessageProps {
    id: string;
    role: ChatMessageRoleEnum;
    message: string;

    constructor(id: string, role: ChatMessageRoleEnum, message: string) {
        this.id = id;
        this.role = role;
        this.message = message;
    }
}