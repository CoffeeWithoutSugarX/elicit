import { describe, it, expect } from 'vitest';
import { createEnum } from '@/types/enums/base';
import {
  ChatMessageRole,
  ChatMessageRoleEnum,
} from '@/types/enums/chatMessageRole.enum';
import {
  ChatMessageType,
  ChatMessageTypeEnum,
} from '@/types/enums/chatMessageType.enum';

// ——— createEnum 基础工厂测试 ———

describe('createEnum (base)', () => {
  const Fruit = { APPLE: 1, BANANA: 2 } as const;
  const FruitEnum = createEnum([
    { code: Fruit.APPLE,  label: '苹果' },
    { code: Fruit.BANANA, label: '香蕉' },
  ]);

  it('items 数组与输入一致', () => {
    expect(FruitEnum.items).toHaveLength(2);
    expect(FruitEnum.items[0].code).toBe(1);
    expect(FruitEnum.items[1].code).toBe(2);
  });

  it('getLabel 已知 code → 对应 label', () => {
    expect(FruitEnum.getLabel(1)).toBe('苹果');
    expect(FruitEnum.getLabel(2)).toBe('香蕉');
  });

  it('getLabel 未知 code → "未知"', () => {
    expect(FruitEnum.getLabel(999 as never)).toBe('未知');
  });

  it('fromCode 已知 code → 完整枚举项', () => {
    expect(FruitEnum.fromCode(1)).toEqual({ code: 1, label: '苹果' });
  });

  it('fromCode 未知 code → undefined', () => {
    expect(FruitEnum.fromCode(999 as never)).toBeUndefined();
  });
});

// ——— ChatMessageRole ———

describe('ChatMessageRole', () => {
  it('USER = 0', () => expect(ChatMessageRole.USER).toBe(0));
  it('ASSISTANT = 1', () => expect(ChatMessageRole.ASSISTANT).toBe(1));
});

describe('ChatMessageRoleEnum', () => {
  it('items 有 2 个', () => {
    expect(ChatMessageRoleEnum.items).toHaveLength(2);
  });

  it('getLabel(USER) → "用户"', () => {
    expect(ChatMessageRoleEnum.getLabel(ChatMessageRole.USER)).toBe('用户');
  });

  it('getLabel(ASSISTANT) → "助手"', () => {
    expect(ChatMessageRoleEnum.getLabel(ChatMessageRole.ASSISTANT)).toBe('助手');
  });

  it('getLabel 未知值 → "未知"', () => {
    expect(ChatMessageRoleEnum.getLabel(99 as never)).toBe('未知');
  });

  it('fromCode(USER) → 完整枚举项', () => {
    expect(ChatMessageRoleEnum.fromCode(ChatMessageRole.USER)).toEqual({
      code: 0,
      label: '用户',
    });
  });

  it('fromCode 未知 → undefined', () => {
    expect(ChatMessageRoleEnum.fromCode(99 as never)).toBeUndefined();
  });
});

// ——— ChatMessageType ———

describe('ChatMessageType', () => {
  it('TEXT = 1', () => expect(ChatMessageType.TEXT).toBe(1));
  it('IMAGE = 2', () => expect(ChatMessageType.IMAGE).toBe(2));
  it('OCR_CARD = 3', () => expect(ChatMessageType.OCR_CARD).toBe(3));
});

describe('ChatMessageTypeEnum', () => {
  it('items 有 3 个', () => {
    expect(ChatMessageTypeEnum.items).toHaveLength(3);
  });

  it('getLabel(TEXT) → "文本"', () => {
    expect(ChatMessageTypeEnum.getLabel(ChatMessageType.TEXT)).toBe('文本');
  });

  it('getLabel(IMAGE) → "图片"', () => {
    expect(ChatMessageTypeEnum.getLabel(ChatMessageType.IMAGE)).toBe('图片');
  });

  it('getLabel(OCR_CARD) → "题目卡"', () => {
    expect(ChatMessageTypeEnum.getLabel(ChatMessageType.OCR_CARD)).toBe('题目卡');
  });

  it('getLabel 未知值 → "未知"', () => {
    expect(ChatMessageTypeEnum.getLabel(99 as never)).toBe('未知');
  });

  it('fromCode(IMAGE) → 完整枚举项', () => {
    expect(ChatMessageTypeEnum.fromCode(ChatMessageType.IMAGE)).toEqual({
      code: 2,
      label: '图片',
    });
  });

  it('fromCode(OCR_CARD) → 完整枚举项，不回落 TEXT', () => {
    expect(ChatMessageTypeEnum.fromCode(ChatMessageType.OCR_CARD)).toEqual({
      code: 3,
      label: '题目卡',
    });
  });

  it('fromCode 未知 → undefined', () => {
    expect(ChatMessageTypeEnum.fromCode(99 as never)).toBeUndefined();
  });
});
