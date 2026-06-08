import 'server-only';

// 管理员邮箱白名单（逗号分隔，不区分大小写）
// 读取 env 放在模块级，与 admin route 中的原有语义一致
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase());

export const isAdmin = (email: string) => ADMIN_EMAILS.includes(email.toLowerCase());
