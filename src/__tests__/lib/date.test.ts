import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatDateToUTC, padTo2Digits, getCreatedAtString } from '@/lib/date';

describe('padTo2Digits', () => {
    it('pads single digit numbers to 2 digits', () => {
        expect(padTo2Digits(0)).toBe('00');
        expect(padTo2Digits(1)).toBe('01');
        expect(padTo2Digits(9)).toBe('09');
    });

    it('leaves two-digit numbers unchanged', () => {
        expect(padTo2Digits(10)).toBe('10');
        expect(padTo2Digits(59)).toBe('59');
        expect(padTo2Digits(99)).toBe('99');
    });
});

describe('formatDateToUTC', () => {
    it('formats a known UTC datetime correctly', () => {
        // 2024-03-15 12:34:56 UTC
        const date = new Date(Date.UTC(2024, 2, 15, 12, 34, 56));
        expect(formatDateToUTC(date)).toBe('20240315T123456Z');
    });

    it('formats midnight UTC correctly', () => {
        const date = new Date(Date.UTC(2023, 0, 1, 0, 0, 0));
        expect(formatDateToUTC(date)).toBe('20230101T000000Z');
    });

    it('formats end of year (Dec 31 23:59:59) correctly', () => {
        const date = new Date(Date.UTC(2023, 11, 31, 23, 59, 59));
        expect(formatDateToUTC(date)).toBe('20231231T235959Z');
    });

    it('pads single-digit month and day', () => {
        const date = new Date(Date.UTC(2024, 0, 5, 9, 3, 7));
        expect(formatDateToUTC(date)).toBe('20240105T090307Z');
    });

    it('handles end-of-month date (Feb 29 leap year)', () => {
        const date = new Date(Date.UTC(2024, 1, 29, 11, 0, 0));
        expect(formatDateToUTC(date)).toBe('20240229T110000Z');
    });

    it('always produces the ISO 8601 compact format with trailing Z', () => {
        const date = new Date(Date.UTC(2025, 5, 15, 8, 0, 0));
        const result = formatDateToUTC(date);
        // Format: YYYYMMDDTHHmmssZ
        expect(result).toMatch(/^\d{8}T\d{6}Z$/);
    });

    it('year component is not padded (4 digits already)', () => {
        const date = new Date(Date.UTC(2024, 0, 1, 0, 0, 0));
        expect(formatDateToUTC(date).startsWith('2024')).toBe(true);
    });
});

describe('getCreatedAtString', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns "刚刚" when less than 1 minute has passed', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
        expect(getCreatedAtString(thirtySecondsAgo)).toBe('刚刚');
    });

    it('returns "刚刚" when exactly 0 ms has passed', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);
        expect(getCreatedAtString(now)).toBe('刚刚');
    });

    it('returns minutes when between 1 minute and 1 hour', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        expect(getCreatedAtString(fiveMinutesAgo)).toBe('5分钟前');
    });

    it('returns 1 minute when exactly 1 minute has passed', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        expect(getCreatedAtString(oneMinuteAgo)).toBe('1分钟前');
    });

    it('returns 59 minutes for just under 1 hour', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const fiftyNineMinutesAgo = new Date(now.getTime() - 59 * 60 * 1000);
        expect(getCreatedAtString(fiftyNineMinutesAgo)).toBe('59分钟前');
    });

    it('returns hours when between 1 hour and 1 day', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);
        expect(getCreatedAtString(threeHoursAgo)).toBe('3小时前');
    });

    it('returns 1 hour when exactly 1 hour has passed', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        expect(getCreatedAtString(oneHourAgo)).toBe('1小时前');
    });

    it('returns days when 24 or more hours have passed', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
        expect(getCreatedAtString(twoDaysAgo)).toBe('2天前');
    });

    it('returns 1 day when exactly 1 day has passed', () => {
        const now = new Date('2024-01-01T12:00:00Z');
        vi.setSystemTime(now);

        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        expect(getCreatedAtString(oneDayAgo)).toBe('1天前');
    });
});
