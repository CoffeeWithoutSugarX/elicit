// 覆盖 ali-oss 内部模块的类型声明，避免 TypeScript 直接加载其 .ts 源文件（与 strict 模式不兼容）
// 原始签名来自 ali-oss/lib/common/utils/policy2Str.d.ts
export declare function policy2Str(policy: string | object): string;
