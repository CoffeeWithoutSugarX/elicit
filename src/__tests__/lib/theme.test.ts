import { describe, it, expect } from 'vitest';
import { PHASE_LABEL, SIGNAL_LABEL, colors, radius, shadow, fontSize } from '@/lib/theme';

describe('PHASE_LABEL', () => {
  it('包含 4 个 Pólya 阶段 + 终态 DONE，共 5 个 key', () => {
    expect(Object.keys(PHASE_LABEL)).toHaveLength(5);
    expect(Object.keys(PHASE_LABEL)).toEqual(
      expect.arrayContaining(['UNDERSTAND', 'PLAN', 'EXECUTE', 'REVIEW', 'DONE'])
    );
  });

  it('各阶段 label 非空字符串', () => {
    for (const label of Object.values(PHASE_LABEL)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('UNDERSTAND → 理解题意', () => expect(PHASE_LABEL.UNDERSTAND).toBe('理解题意'));
  it('PLAN → 拟定计划', () => expect(PHASE_LABEL.PLAN).toBe('拟定计划'));
  it('EXECUTE → 执行', () => expect(PHASE_LABEL.EXECUTE).toBe('执行'));
  it('REVIEW → 回顾', () => expect(PHASE_LABEL.REVIEW).toBe('回顾'));
  it('DONE → 已完成', () => expect(PHASE_LABEL.DONE).toBe('已完成'));
});

describe('SIGNAL_LABEL', () => {
  it('包含 5 个 Agent 信号的 key', () => {
    expect(Object.keys(SIGNAL_LABEL)).toHaveLength(5);
    expect(Object.keys(SIGNAL_LABEL)).toEqual(
      expect.arrayContaining(['COMPLETED', 'STAY', 'ESCALATE', 'DONE', 'BLOCKED'])
    );
  });

  it('各信号 label 非空字符串', () => {
    for (const label of Object.values(SIGNAL_LABEL)) {
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it('COMPLETED → 已完成', () => expect(SIGNAL_LABEL.COMPLETED).toBe('已完成'));
  it('STAY → 待机', () => expect(SIGNAL_LABEL.STAY).toBe('待机'));
  it('ESCALATE → 升级', () => expect(SIGNAL_LABEL.ESCALATE).toBe('升级'));
  it('DONE → 知识点达成', () => expect(SIGNAL_LABEL.DONE).toBe('知识点达成'));
  it('BLOCKED → 受阻', () => expect(SIGNAL_LABEL.BLOCKED).toBe('受阻'));
});

describe('colors', () => {
  it('包含顶层 paper 和 ink 颜色', () => {
    expect(colors.paperCanvas).toBeDefined();
    expect(colors.paperSurface).toBeDefined();
    expect(colors.paperDeep).toBeDefined();
    expect(colors.inkPrimary).toBeDefined();
    expect(colors.inkSecondary).toBeDefined();
    expect(colors.inkMuted).toBeDefined();
    expect(colors.inkLine).toBeDefined();
  });

  it('所有顶层颜色值均为 # 开头的十六进制字符串', () => {
    // vermilion 已从 colors 对象移除（迁移至 shadcn --color-foreground）
    const topLevelColors = [
      colors.paperCanvas,
      colors.paperSurface,
      colors.paperDeep,
      colors.inkPrimary,
      colors.inkSecondary,
      colors.inkMuted,
      colors.inkLine,
      colors.inkDeep,
    ];
    for (const c of topLevelColors) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it('signal 子对象包含 5 个信号颜色', () => {
    expect(colors.signal).toBeDefined();
    expect(Object.keys(colors.signal)).toHaveLength(5);
    expect(Object.keys(colors.signal)).toEqual(
      expect.arrayContaining(['completed', 'stay', 'escalate', 'done', 'blocked'])
    );
  });

  it('phase 子对象包含 4 个阶段颜色', () => {
    expect(colors.phase).toBeDefined();
    expect(Object.keys(colors.phase)).toHaveLength(4);
    expect(Object.keys(colors.phase)).toEqual(
      expect.arrayContaining(['understand', 'plan', 'execute', 'review'])
    );
  });
});

describe('radius', () => {
  it('包含 sm / md / lg / pill 四个圆角值', () => {
    expect(radius.sm).toBeDefined();
    expect(radius.md).toBeDefined();
    expect(radius.lg).toBeDefined();
    expect(radius.pill).toBeDefined();
  });

  it('pill → "9999px"', () => expect(radius.pill).toBe('9999px'));

  it('所有值均为 CSS 长度字符串', () => {
    for (const v of Object.values(radius)) {
      expect(v).toMatch(/^\d+px$/);
    }
  });
});

describe('shadow', () => {
  it('包含 paperSm / paperMd / paperLg', () => {
    expect(shadow.paperSm).toBeDefined();
    expect(shadow.paperMd).toBeDefined();
    expect(shadow.paperLg).toBeDefined();
  });

  it('所有阴影值均为非空字符串', () => {
    for (const v of Object.values(shadow)) {
      expect(typeof v).toBe('string');
      expect(v.length).toBeGreaterThan(0);
    }
  });
});

describe('fontSize', () => {
  it('包含 xs / sm / base / lg / xl / 2xl / 3xl', () => {
    expect(fontSize.xs).toBeDefined();
    expect(fontSize.sm).toBeDefined();
    expect(fontSize.base).toBeDefined();
    expect(fontSize.lg).toBeDefined();
    expect(fontSize.xl).toBeDefined();
    expect(fontSize['2xl']).toBeDefined();
    expect(fontSize['3xl']).toBeDefined();
  });

  it('base → "1rem"', () => expect(fontSize.base).toBe('1rem'));

  it('所有字阶值均为 rem 单位', () => {
    for (const v of Object.values(fontSize)) {
      expect(v).toMatch(/^\d+(\.\d+)?rem$/);
    }
  });
});
