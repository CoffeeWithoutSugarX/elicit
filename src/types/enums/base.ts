// 通用枚举工厂
// 为所有枚举提供一致的 getLabel / fromCode / items 接口，模拟 Java enum 行为

export interface EnumItem<T extends number | string = number> {
  code: T
  label: string
}

/**
 * 创建一个具有统一 API 的枚举对象。
 * @param items 枚举项数组，可扩展自定义字段（泛型 I extends EnumItem<T>）
 * @returns 包含 items / getLabel / fromCode 的枚举对象
 */
export function createEnum<T extends number | string, I extends EnumItem<T> = EnumItem<T>>(items: I[]) {
  const map = new Map<T, I>(items.map(i => [i.code, i]))
  return {
    items,
    /** 根据 code 获取 label，找不到时返回 '未知' */
    getLabel: (code: T): string => map.get(code)?.label ?? '未知',
    /** 根据 code 获取完整枚举项，找不到时返回 undefined */
    fromCode: (code: T): I | undefined => map.get(code),
  }
}
