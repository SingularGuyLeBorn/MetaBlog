/**
 * 时间格式化工具
 * 将 Unix 时间戳格式化为人类可读的字符串
 */

export function formatDate(ts: number | string | Date): string {
  const date = typeof ts === 'number' ? new Date(ts) : typeof ts === 'string' ? new Date(ts) : ts
  if (isNaN(date.getTime())) return '无效时间'

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')

  return `${y}-${m}-${d} ${h}:${min}:${s}`
}

export function formatDateShort(ts: number | string | Date): string {
  const date = typeof ts === 'number' ? new Date(ts) : typeof ts === 'string' ? new Date(ts) : ts
  if (isNaN(date.getTime())) return '无效时间'

  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')

  return `${y}-${m}-${d}`
}

export function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (seconds < 10) return '刚刚'
  if (seconds < 60) return `${seconds}秒前`
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDate(ts)
}
