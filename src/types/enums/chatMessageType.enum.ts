import { createEnum } from './base';

export const ChatMessageType = {
    TEXT:          1,
    IMAGE:         2,
    OCR_CARD:      3,
    KNOWLEDGE_CARD: 4,
} as const;

export type ChatMessageType = typeof ChatMessageType[keyof typeof ChatMessageType];

export const ChatMessageTypeEnum = createEnum([
    { code: ChatMessageType.TEXT,           label: '文本' },
    { code: ChatMessageType.IMAGE,          label: '图片' },
    { code: ChatMessageType.OCR_CARD,       label: '题目卡' },
    { code: ChatMessageType.KNOWLEDGE_CARD, label: '知识卡' },
]);
