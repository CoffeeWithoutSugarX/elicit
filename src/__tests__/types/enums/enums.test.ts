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
import {
  PolyaPhase,
  PolyaPhaseEnum,
  polyaPhaseLabel,
  polyaPhaseShortLabel,
} from '@/types/enums/polyaPhase.enum';
import {
  PhaseSignal,
  PhaseSignalEnum,
} from '@/types/enums/phaseSignal.enum';

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
  it('KNOWLEDGE_CARD = 4', () => expect(ChatMessageType.KNOWLEDGE_CARD).toBe(4));
});

describe('ChatMessageTypeEnum', () => {
  it('items 有 4 个', () => {
    expect(ChatMessageTypeEnum.items).toHaveLength(4);
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

  it('getLabel(KNOWLEDGE_CARD) → "知识卡"', () => {
    expect(ChatMessageTypeEnum.getLabel(ChatMessageType.KNOWLEDGE_CARD)).toBe('知识卡');
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

// ——— PolyaPhase ———

describe('PolyaPhase', () => {
  it('UNDERSTAND = 0', () => expect(PolyaPhase.UNDERSTAND).toBe(0));
  it('PLAN = 1',       () => expect(PolyaPhase.PLAN).toBe(1));
  it('EXECUTE = 2',    () => expect(PolyaPhase.EXECUTE).toBe(2));
  it('REVIEW = 3',     () => expect(PolyaPhase.REVIEW).toBe(3));
  it('DONE = 4',       () => expect(PolyaPhase.DONE).toBe(4));
});

describe('PolyaPhaseEnum', () => {
  it('items 有 5 个（4 阶段 + 终态）', () => {
    expect(PolyaPhaseEnum.items).toHaveLength(5);
  });

  it('getLabel 使用学生友好版文案', () => {
    expect(PolyaPhaseEnum.getLabel(PolyaPhase.UNDERSTAND)).toBe('理解题意');
    expect(PolyaPhaseEnum.getLabel(PolyaPhase.PLAN)).toBe('拟定计划');
    expect(PolyaPhaseEnum.getLabel(PolyaPhase.EXECUTE)).toBe('执行');
    expect(PolyaPhaseEnum.getLabel(PolyaPhase.REVIEW)).toBe('回顾');
    expect(PolyaPhaseEnum.getLabel(PolyaPhase.DONE)).toBe('已完成');
  });

  it('getLabel 未知值 → "未知"', () => {
    expect(PolyaPhaseEnum.getLabel(99 as never)).toBe('未知');
  });

  it('fromCode(UNDERSTAND) 含 shortLabel 和 name 字段', () => {
    const item = PolyaPhaseEnum.fromCode(PolyaPhase.UNDERSTAND);
    expect(item?.shortLabel).toBe('理解');
    expect(item?.name).toBe('UNDERSTAND');
  });

  it('fromCode(PLAN) shortLabel → 规划', () => {
    expect(PolyaPhaseEnum.fromCode(PolyaPhase.PLAN)?.shortLabel).toBe('规划');
  });

  it('fromCode(DONE) shortLabel → 完成', () => {
    expect(PolyaPhaseEnum.fromCode(PolyaPhase.DONE)?.shortLabel).toBe('完成');
  });
});

describe('polyaPhaseLabel', () => {
  it('已知 name 字符串 → 对应 label', () => {
    expect(polyaPhaseLabel('UNDERSTAND')).toBe('理解题意');
    expect(polyaPhaseLabel('PLAN')).toBe('拟定计划');
    expect(polyaPhaseLabel('EXECUTE')).toBe('执行');
    expect(polyaPhaseLabel('REVIEW')).toBe('回顾');
    expect(polyaPhaseLabel('DONE')).toBe('已完成');
  });

  it('未知 name → 原样透传（向后兼容）', () => {
    expect(polyaPhaseLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

describe('polyaPhaseShortLabel', () => {
  it('已知 name 字符串 → 对应 shortLabel', () => {
    expect(polyaPhaseShortLabel('UNDERSTAND')).toBe('理解');
    expect(polyaPhaseShortLabel('PLAN')).toBe('规划');
    expect(polyaPhaseShortLabel('EXECUTE')).toBe('执行');
    expect(polyaPhaseShortLabel('REVIEW')).toBe('回顾');
    expect(polyaPhaseShortLabel('DONE')).toBe('完成');
  });

  it('未知 name → 原样透传', () => {
    expect(polyaPhaseShortLabel('UNKNOWN')).toBe('UNKNOWN');
  });
});

// ——— PhaseSignal ———

describe('PhaseSignal', () => {
  it('COMPLETED = "COMPLETED"', () => expect(PhaseSignal.COMPLETED).toBe('COMPLETED'));
  it('STAY = "STAY"',           () => expect(PhaseSignal.STAY).toBe('STAY'));
  it('ESCALATE = "ESCALATE"',   () => expect(PhaseSignal.ESCALATE).toBe('ESCALATE'));
  it('SUB_PROBLEM_DONE = "SUB_PROBLEM_DONE"', () => expect(PhaseSignal.SUB_PROBLEM_DONE).toBe('SUB_PROBLEM_DONE'));
  it('PROBLEM_BLOCKED = "PROBLEM_BLOCKED"',   () => expect(PhaseSignal.PROBLEM_BLOCKED).toBe('PROBLEM_BLOCKED'));
});

describe('PhaseSignalEnum', () => {
  it('items 有 5 个', () => {
    expect(PhaseSignalEnum.items).toHaveLength(5);
  });

  it('getLabel 显示文案与 PhaseSignalBadge 一致', () => {
    expect(PhaseSignalEnum.getLabel(PhaseSignal.COMPLETED)).toBe('已完成');
    expect(PhaseSignalEnum.getLabel(PhaseSignal.STAY)).toBe('待机');
    expect(PhaseSignalEnum.getLabel(PhaseSignal.ESCALATE)).toBe('升级');
    expect(PhaseSignalEnum.getLabel(PhaseSignal.SUB_PROBLEM_DONE)).toBe('知识点达成');
    expect(PhaseSignalEnum.getLabel(PhaseSignal.PROBLEM_BLOCKED)).toBe('受阻');
  });

  it('getLabel 未知值 → "未知"', () => {
    expect(PhaseSignalEnum.getLabel('INVALID' as never)).toBe('未知');
  });

  it('fromCode(COMPLETED) → 完整枚举项', () => {
    expect(PhaseSignalEnum.fromCode(PhaseSignal.COMPLETED)).toEqual({
      code: 'COMPLETED',
      label: '已完成',
    });
  });
});
