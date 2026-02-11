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

export function getCreatedAtString(date: Date): string {
    // 以当前时间为准转换为xx分钟前，xx小时前，xx天前
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) {
        return '刚刚';
    } else if (diff < hour) {
        return `${Math.floor(diff / minute)}分钟前`;
    } else if (diff < day) {
        return `${Math.floor(diff / hour)}小时前`;
    } else {
        return `${Math.floor(diff / day)}天前`;
    }
}