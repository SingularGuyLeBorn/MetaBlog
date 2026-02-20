/**
 * LLM Stream Utilities - SSE 流处理公共函数
 * 
 * 提取重复的流读取逻辑，供所有 Provider 复用
 */

/**
 * 读取 SSE 流并逐行回调
 * 
 * @param response fetch Response 对象
 * @param signal AbortSignal 用于取消
 * @param onLine 每收到一行 SSE 数据的回调（包含 data: 后的内容）
 */
export async function readSSEStream(
  response: Response,
  signal: AbortSignal | undefined,
  onLine: (line: string) => void
): Promise<void> {
  // 预检查
  if (signal?.aborted) {
    throw new Error('Request aborted')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  // 监听 abort 事件来取消 reader
  const abortHandler = () => {
    reader.cancel('Request aborted').catch(() => {})
  }
  signal?.addEventListener('abort', abortHandler)

  try {
    while (true) {
      // 检查 signal 状态
      if (signal?.aborted) {
        throw new Error('Request aborted')
      }

      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() === '') continue
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue
          onLine(data)
        }
      }
    }
  } finally {
    signal?.removeEventListener('abort', abortHandler)
    reader.releaseLock()
  }
}

/**
 * 带超时的 fetch 请求
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  // 合并外部 signal 和超时 signal
  const originalSignal = options.signal
  if (originalSignal) {
    originalSignal.addEventListener('abort', () => controller.abort())
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}
