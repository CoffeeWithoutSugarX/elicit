

// 格式化日期为符合ISO 8601标准的UTC时间字符串格式
export function padTo2Digits(num: number): string {
    return num.toString().padStart(2, '0');
}

export function formatDateToUTC(date: Date): string {
    return (
        date.getUTCFullYear() +
        padTo2Digits(date.getUTCMonth() + 1) +
        padTo2Digits(date.getUTCDate()) +
        'T' +
        padTo2Digits(date.getUTCHours()) +
        padTo2Digits(date.getUTCMinutes()) +
        padTo2Digits(date.getUTCSeconds()) +
        'Z'
    );
}