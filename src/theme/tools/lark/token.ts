/**
 * ============================================================================
 * Token 管理工具
 * ============================================================================
 *
 * @module src/theme/tools/lark
 */

import type { ToolDefinition, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

const API_BASE = '/api/lark'

async function larkApi(method: string, path: string): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, { method })
  const data = await res.json()
  // 后端 translateLarkError 已经把 details 精确拼接到 msg 中了，
  // 前端不需要再追加，避免信息重复/冗长。
  return data
}

// ============ 工具定义 ============

export const feishuTokenRefreshDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuTokenRefresh',
    description: '【功能】手动刷新 user_access_token(使用 refresh_token 获取新的 access_token 和 refresh_token). 【触发条件】当飞书 API 返回以下错误时立即调用：99991677(token过期)、99991679(权限不足)、20037(refresh_token过期). 用户主动说"刷新token"、"续期token"时也调用. 【注意】1) 后端通常会自动刷新,只有在自动刷新失败时才需要手动调用;2) 刷新成功后会自动保存到 .data/config/feishu_oauth.json,无需额外操作;3) 如果 refresh_token 也已过期(用户授权满365天),会返回需要重新授权的错误,此时必须去 notebook 中重新扫码授权. ',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
}

export const feishuTokenStatusDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'feishuTokenStatus',
    description: '【功能】查询当前 user_access_token 的状态(是否存在、是否过期、refresh_token 是否可用). 【使用场景】用户询问"token 还有多久过期"、"我的授权状态如何"、"检查一下 token"时调用. 【注意】只查询状态,不会刷新 token. ',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
}

// ============ 工具实现 ============

export async function feishuTokenRefresh(): Promise<ToolResult> {
  try {
    const result = await larkApi('POST', '/token/refresh')
    if (result.code === 0) {
      const data = result.data
      return createSuccessResult({
        message: 'Token 刷新成功',
        access_token_preview: data.access_token ? data.access_token.slice(0, 30) + '...' : '',
        refresh_token_preview: data.refresh_token ? data.refresh_token.slice(0, 30) + '...' : '',
        expires_in: data.expires_in,
        detail: result,
      })
    }
    return createErrorResult(result.msg || '刷新失败', `后端返回: ${JSON.stringify(result)}`)
  } catch (e: any) {
    return createErrorResult(`刷新失败: ${e.message}`)
  }
}

export async function feishuTokenStatus(): Promise<ToolResult> {
  try {
    const result = await larkApi('GET', '/token/status')
    if (result.code === 0) {
      const s = result.data
      const messages: string[] = []
      if (!s.exists) {
        messages.push('❌ 没有找到 token 缓存文件')
        messages.push('请先在 notebook 中运行授权流程获取 token')
      } else {
        messages.push(s.access_token_valid ? '✅ access_token 有效' : '⚠️ access_token 已过期或即将过期')
        messages.push(`   剩余有效期: ${s.access_token_expire_in}s (${Math.round(s.access_token_expire_in / 60)} 分钟)`)
        messages.push(s.refresh_token_exists ? '✅ refresh_token 存在' : '⚠️ 没有 refresh_token(无法自动续期)')
        if (s.refresh_token_expire_in !== undefined) {
          messages.push(`   refresh_token 剩余: ${s.refresh_token_expire_in}s (${Math.round(s.refresh_token_expire_in / 86400)} 天)`)
        }
      }
      messages.push(`缓存路径: ${s.cache_path}`)
      return createSuccessResult({
        message: messages.join('\n'),
        status: s,
      })
    }
    return createErrorResult(result.msg || '查询失败', `后端返回: ${JSON.stringify(result)}`)
  } catch (e: any) {
    return createErrorResult(`查询失败: ${e.message}`)
  }
}
