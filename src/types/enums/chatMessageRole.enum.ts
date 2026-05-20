import { createEnum } from './base';

export const ChatMessageRole = {
    USER:      0,
    ASSISTANT: 1,
} as const;

export type ChatMessageRole = typeof ChatMessageRole[keyof typeof ChatMessageRole];

export const ChatMessageRoleEnum = createEnum([
    { code: ChatMessageRole.USER,      label: '用户' },
    { code: ChatMessageRole.ASSISTANT, label: '助手' },
]);
