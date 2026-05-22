/**
 * 相对时间格式化工具。
 * 不依赖第三方库，仅用于原型展示。
 */

/**
 * 将 ISO 时间字符串格式化为中文相对时间描述。
 *
 * 规则：
 * - undefined → ""
 * - 与 now 差 < 1 分钟 → "刚才"
 * - < 60 分钟 → "{n} 分钟前"
 * - 同一天（< 24h 且日期相同）→ "今天 HH:mm"
 * - < 7 天 → "{n} 天前"
 * - 其他 → "MM-DD HH:mm"
 */
export function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return ''

  const date = new Date(iso)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return '刚才'
  if (diffMin < 60) return `${diffMin} 分钟前`

  // 同一天（按本地日期判断）
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()

  if (isSameDay) {
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `今天 ${hh}:${mm}`
  }

  if (diffDays < 7) return `${diffDays} 天前`

  // 超过 7 天：MM-DD HH:mm
  const mo = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${mo}-${dd} ${hh}:${mm}`
}
