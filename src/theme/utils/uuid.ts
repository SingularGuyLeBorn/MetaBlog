/**
 * ============================================================================
 * 工具函数 - uuid
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/utils
 */


export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 生成短 UUID(用于文件名,更简洁)
 * 格式：时间戳-随机数
 */
export function generateShortUUID(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${timestamp}-${random}`
}

/**
 * 生成人类可读的文件名
 * 格式：YYYYMMDD-HHMMSS-模型名-短UUID
 */
export function generateReadableFilename(
  model: string,
  prefix: string = 'session'
): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '')
  const shortId = generateShortUUID()
  const cleanModel = model.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

  return `${date}-${time}-${prefix}-${cleanModel}-${shortId}`
}

/**
 * 生成 Session ID(持久化标识)
 * 格式：sess-UUID
 */
export function generateSessionId(): string {
  return `sess-${generateUUID()}`
}

/**
 * 验证是否为有效的 Session ID
 */
export function isValidSessionId(id: string): boolean {
  return /^sess-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}
