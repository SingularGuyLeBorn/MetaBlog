/**
 * ============================================================================
 * 工具函数 - tokenEstimator
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/utils
 */


import { Tiktoken } from 'js-tiktoken/lite'
import cl100k_base from 'js-tiktoken/ranks/cl100k_base'

// ==================== 编码器缓存 ====================

let cachedEncoder: Tiktoken | null = null

function getEncoder(): Tiktoken {
  if (!cachedEncoder) {
    cachedEncoder = new Tiktoken(cl100k_base)
  }
  return cachedEncoder
}

// ==================== 基础估算 ====================

/**
 * 估算单段文本的 token 数
 */
export function estimateTextTokens(text: string): number {
  if (!text || text.length === 0) return 0
  try {
    const encoder = getEncoder()
    return encoder.encode(text).length
  } catch {
    // 回退：字符数/3(保守估算)
    return Math.ceil(text.length / 3)
  }
}

/**
 * 估算消息数组的 token 数(含 OpenAI 风格的消息开销)
 *
 * 消息格式开销(OpenAI 风格)：
 * - 每条消息：4 tokens(<|im_start|>{role}\n{content}<|im_end|>\n)
 * - 最后回复前缀：3 tokens(<|im_start|>assistant\n)
 * - 系统提示：按普通消息计算
 */
export function estimateChatTokens(
  messages: Array<{ role: string; content?: string | any[] }>
): number {
  if (!messages || messages.length === 0) return 0

  let total = 3 // 最后回复前缀开销

  for (const msg of messages) {
    total += 4 // 消息格式开销

    if (typeof msg.content === 'string') {
      total += estimateTextTokens(msg.content)
    } else if (Array.isArray(msg.content)) {
      // 多模态消息：文本部分 + 图片/附件占位
      for (const part of msg.content) {
        if (part.type === 'text' && part.text) {
          total += estimateTextTokens(part.text)
        } else if (part.type === 'image_url' || part.type === 'image') {
          total += 500 // 图片占位 token(实际取决于分辨率,这里用保守值)
        }
      }
    }
  }

  return total
}

/**
 * 估算工具定义的 token 数(用于计算系统提示词中的工具定义占用)
 */
export function estimateToolDefinitionsTokens(toolDefs: any[]): number {
  if (!toolDefs || toolDefs.length === 0) return 0
  const json = JSON.stringify(toolDefs)
  return estimateTextTokens(json)
}

// ==================== 截断辅助 ====================

/**
 * 按 token 截断文本
 * @returns { text: 截断后文本, wasTruncated: 是否截断, originalTokens: 原始token数 }
 */
export function truncateTextByTokens(
  text: string,
  maxTokens: number
): { text: string; wasTruncated: boolean; originalTokens: number } {
  if (!text || maxTokens <= 0) {
    return { text: '', wasTruncated: false, originalTokens: 0 }
  }

  try {
    const encoder = getEncoder()
    const tokens = encoder.encode(text)

    if (tokens.length <= maxTokens) {
      return { text, wasTruncated: false, originalTokens: tokens.length }
    }

    const truncated = tokens.slice(0, maxTokens)
    const decodedText = encoder.decode(truncated)

    return {
      text: decodedText,
      wasTruncated: true,
      originalTokens: tokens.length
    }
  } catch {
    // 回退：按字符截断(近似)
    const approxChars = maxTokens * 3
    if (text.length <= approxChars) {
      return { text, wasTruncated: false, originalTokens: Math.ceil(text.length / 3) }
    }
    return {
      text: text.substring(0, approxChars),
      wasTruncated: true,
      originalTokens: Math.ceil(text.length / 3)
    }
  }
}

// ==================== 格式化 ====================

/**
 * 格式化 token 数为人类可读字符串
 * 1234 → "1.2k"
 * 12345 → "12.3k"
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) return String(count)
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`
  if (count < 1000000) return `${Math.round(count / 1000)}k`
  return `${(count / 1000000).toFixed(1)}M`
}

/**
 * 计算用量百分比
 */
export function calculateUsagePercent(used: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(Math.round((used / total) * 100), 100)
}

/**
 * 获取用量状态颜色
 */
export function getUsageStatus(percent: number): {
  color: string
  label: string
  isDanger: boolean
} {
  if (percent < 50) return { color: '#22c55e', label: '正常', isDanger: false }
  if (percent < 80) return { color: '#eab308', label: '注意', isDanger: false }
  if (percent < 95) return { color: '#f97316', label: '警告', isDanger: false }
  return { color: '#ef4444', label: '危险', isDanger: true }
}
