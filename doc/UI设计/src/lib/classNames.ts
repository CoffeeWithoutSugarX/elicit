/**
 * 轻量 className 合并工具，无需引入 clsx / tailwind-merge。
 * 用法：cn('base-class', condition && 'conditional-class', undefined, 'another')
 */

export type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  return inputs
    .flat(Infinity as 20)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
}
