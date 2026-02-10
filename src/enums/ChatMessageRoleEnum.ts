enum ChatMessageRoleEnum {
    USER = 'user',
    ASSISTANT = 'assistant',
}

export default ChatMessageRoleEnum;

export function isValidRole(role: string): role is ChatMessageRoleEnum {
    return Object.values(ChatMessageRoleEnum).includes(role as ChatMessageRoleEnum);
}