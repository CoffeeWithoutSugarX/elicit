import ChatMessageRoleEnum from "@/enums/ChatMessageRoleEnum";

export default class ChatMessageProps {
    id: string;
    role: ChatMessageRoleEnum;
    content: string;

    constructor(id: string, role: ChatMessageRoleEnum, content: string) {
        this.id = id;
        this.role = role;
        this.content = content;
    }
}