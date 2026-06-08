export default class ChatConversationProps {
    id: string;
    title: string;
    /** 会话创建时间（ISO 字符串）。默认为空串，保持向后兼容。 */
    createdAt: string;

    constructor(id: string, title: string, createdAt: string = '') {
        this.id = id;
        this.title = title;
        this.createdAt = createdAt;
    }
}
