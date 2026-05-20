import { createEnum } from './base';

export const ChatMessageType = {
    TEXT:  1,
    IMAGE: 2,
} as const;

export type ChatMessageType = typeof ChatMessageType[keyof typeof ChatMessageType];

export const ChatMessageTypeEnum = createEnum([
    { code: ChatMessageType.TEXT,  label: '文本' },
    { code: ChatMessageType.IMAGE, label: '图片' },
]);
