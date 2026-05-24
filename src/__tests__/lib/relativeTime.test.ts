import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { formatRelativeTime } from '@/lib/relativeTime';

/**
 * 将 Date 对象序列化为 ISO 字符串（模拟数据库返回值）
 */
function iso(d: Date): string {
  return d.toISOString();
}

describe('formatRelativeTime', () => {
  let fakeNow: Date;

  beforeEach(() => {
    // 固定当前时间为 2026-05-24 10:00:00 UTC
    fakeNow = new Date('2026-05-24T10:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('undefined → 空字符串', () => {
    expect(formatRelativeTime(undefined)).toBe('');
  });

  it('无效日期字符串 → 空字符串', () => {
    expect(formatRelativeTime('not-a-date')).toBe('');
  });

  it('差 0 秒（now）→ "刚才"', () => {
    expect(formatRelativeTime(iso(fakeNow))).toBe('刚才');
  });

  it('差 30 秒 → "刚才"', () => {
    const d = new Date(fakeNow.getTime() - 30_000);
    expect(formatRelativeTime(iso(d))).toBe('刚才');
  });

  it('差 59 秒 → "刚才"', () => {
    const d = new Date(fakeNow.getTime() - 59_000);
    expect(formatRelativeTime(iso(d))).toBe('刚才');
  });

  it('差 1 分钟 → "1 分钟前"', () => {
    const d = new Date(fakeNow.getTime() - 60_000);
    expect(formatRelativeTime(iso(d))).toBe('1 分钟前');
  });

  it('差 5 分钟 → "5 分钟前"', () => {
    const d = new Date(fakeNow.getTime() - 5 * 60_000);
    expect(formatRelativeTime(iso(d))).toBe('5 分钟前');
  });

  it('差 59 分钟 → "59 分钟前"', () => {
    const d = new Date(fakeNow.getTime() - 59 * 60_000);
    expect(formatRelativeTime(iso(d))).toBe('59 分钟前');
  });

  it('同一天内、差超过 60 分钟 → "今天 HH:mm"', () => {
    // 在 fakeNow（10:00 UTC）的基础上减 2 小时，确保仍然同一天（本地日期）
    const d = new Date(fakeNow.getTime() - 2 * 3_600_000);
    const result = formatRelativeTime(iso(d));
    // 格式为 "今天 HH:mm"，HH:mm 具体值依赖本地时区，只验证格式
    expect(result).toMatch(/^今天 \d{2}:\d{2}$/);
    // 验证小时与分钟位数正确（HH 为两位数字）
    const timeMatch = result.match(/今天 (\d{2}):(\d{2})/);
    expect(timeMatch).not.toBeNull();
    const hh = parseInt(timeMatch![1], 10);
    const mm = parseInt(timeMatch![2], 10);
    expect(hh).toBeGreaterThanOrEqual(0);
    expect(hh).toBeLessThan(24);
    expect(mm).toBeGreaterThanOrEqual(0);
    expect(mm).toBeLessThan(60);
  });

  it('差 1 天（昨天）→ "1 天前"', () => {
    const d = new Date(fakeNow.getTime() - 25 * 3_600_000); // 昨天
    const result = formatRelativeTime(iso(d));
    expect(result).toBe('1 天前');
  });

  it('差 3 天 → "3 天前"', () => {
    const d = new Date(fakeNow.getTime() - 3 * 86_400_000);
    expect(formatRelativeTime(iso(d))).toBe('3 天前');
  });

  it('差 6 天 → "6 天前"', () => {
    const d = new Date(fakeNow.getTime() - 6 * 86_400_000);
    expect(formatRelativeTime(iso(d))).toBe('6 天前');
  });

  it('差超过 7 天 → "MM-DD HH:mm" 格式', () => {
    // 减 10 天 = 2026-05-14
    const d = new Date(fakeNow.getTime() - 10 * 86_400_000);
    const result = formatRelativeTime(iso(d));
    expect(result).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/);
  });

  it('空字符串 → 空字符串', () => {
    expect(formatRelativeTime('')).toBe('');
  });
});
