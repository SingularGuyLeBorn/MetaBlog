/**
 * ============================================================================
 * 文章管理工具 — 共享辅助函数
 * ============================================================================
 *
 * 安全边界、路径处理、API 响应处理等通用逻辑。
 */

import type { ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/** 后端 API 基础路径 */
export const API_BASE = '/api'

/** AI 可操作的板块白名单 */
export const ALLOWED_SECTIONS = ['posts', 'knowledge', 'resources']

/** AI 禁止操作的板块黑名单 */
export const BLOCKED_SECTIONS = ['about', 'ai-research']

/**
 * 从文件路径中提取板块名
 * e.g. "sections/posts/my-article.md" -> "posts"
 */
export function extractSection(filePath: string): string | null {
  const normalized = filePath.replace(/^sections\//, '').replace(/^\//, '')
  const firstSlash = normalized.indexOf('/')
  return firstSlash > 0 ? normalized.substring(0, firstSlash) : normalized
}

/**
 * 校验板块是否在白名单内
 */
export function validateSectionPath(filePath: string): { valid: boolean; error?: string } {
  const section = extractSection(filePath)
  if (!section) return { valid: false, error: '无法从路径中识别板块' }
  if (ALLOWED_SECTIONS.includes(section)) return { valid: true }
  if (BLOCKED_SECTIONS.includes(section)) {
    return {
      valid: false,
      error: `板块 "${section}" 不允许AI操作。AI只能管理以下板块：${ALLOWED_SECTIONS.join('、')}`
    }
  }
  return {
    valid: false,
    error: `板块 "${section}" 不存在。可用板块：${ALLOWED_SECTIONS.join('、')}`
  }
}

/**
 * 校验路径是否包含目录遍历(..)
 */
export function validateNoTraversal(filePath: string): { valid: boolean; error?: string } {
  if (filePath.includes('..')) {
    return { valid: false, error: '路径中不允许使用 ".."' }
  }
  return { valid: true }
}

/**
 * 标准化 API 响应处理
 */
export async function handleApiResponse(response: Response, action: string): Promise<ToolResult> {
  if (!response.ok) {
    const errorText = await response.text()
    return createErrorResult(
      `HTTP ${response.status}: ${errorText}`,
      `${action}失败(${response.status})`,
      response.status === 404 ? '文件不存在，请检查路径' : '请稍后重试'
    )
  }

  try {
    const data = await response.json()
    if (data.success === false) {
      return createErrorResult(
        data.error || 'Unknown error',
        `${action}失败`,
        '请检查参数后重试'
      )
    }
    return createSuccessResult(data.data || data, `${action}成功`, action)
  } catch {
    // 非 JSON 响应(如 read 返回纯文本)
    const text = await response.text()
    return createSuccessResult(text, `${action}成功`, action)
  }
}

/**
 * 将 URL 路径转换为文件路径
 *
 * 规则：
 * - 以 / 开头的路径去掉 /
 * - 以 / 结尾的路径自动补 index.md
 * - 无 .md 后缀的路径自动转为 folder/index.md 模式
 * - 不以 sections/ 开头的路径自动加前缀
 */
export function normalizeFilePath(inputPath: string): string {
  if (!inputPath) return ''

  let path = inputPath

  if (path.startsWith('/')) {
    path = path.slice(1)
  }

  if (path.endsWith('/')) {
    path = path + 'index.md'
  } else if (!path.endsWith('.md')) {
    // 新文件使用 index 模式：folder/index.md
    // 如果 AI 明确传了 .md 后缀，保持原样(兼容旧 folder-note 文件)
    path = path + '/index.md'
  }

  if (!path.startsWith('sections/')) {
    path = 'sections/' + path
  }

  return path
}
