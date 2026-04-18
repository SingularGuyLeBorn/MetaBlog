/**
 * 飞书 Lark CLI 工具执行器
 */

import type { ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createSuccessResult, createErrorResult } from '@/theme/tools/types'

const API_BASE = '/api'

interface LarkExecResponse {
  success: boolean
  stdout: string
  stderr: string
  exitCode: number | null
  parsed: any
  duration: number
  error?: string
}

/**
 * 通用 Lark CLI 执行
 */
export const runLarkCli = async (args: Record<string, any>): Promise<ToolResult> => {
  const { command, args: cmdArgs = [], timeout = 30000 } = args

  if (!command) {
    return createErrorResult(
      'Missing command parameter',
      '请提供 lark-cli 命令',
      '示例: run_lark_cli(command="im message create", args=["--receive_id", "xxx", "--content", "hello"])'
    )
  }

  try {
    const response = await fetch(`${API_BASE}/lark/exec`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        command: String(command),
        args: Array.isArray(cmdArgs) ? cmdArgs.map(String) : [],
        timeout: Math.min(Number(timeout), 120000),
        format: 'json'
      })
    })

    const result: LarkExecResponse = await response.json()

    if (!result.success) {
      const errorHint = result.exitCode !== 0
        ? `lark-cli 退出码: ${result.exitCode}`
        : '命令执行失败'
      return createErrorResult(
        result.stderr || result.stdout || errorHint,
        '飞书命令执行失败',
        result.stderr?.includes('auth')
          ? '请先运行 "lark-cli auth login" 完成飞书 OAuth 登录'
          : '请检查命令参数是否正确'
      )
    }

    // 尝试使用解析后的 JSON 输出
    const output = result.parsed || result.stdout
    const formatted = typeof output === 'string'
      ? output.slice(0, 8000)
      : JSON.stringify(output, null, 2).slice(0, 8000)

    return createSuccessResult(
      {
        command,
        args: cmdArgs,
        output,
        exitCode: result.exitCode,
        duration: result.duration,
      },
      formatted,
      'run_lark_cli'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '飞书命令请求失败',
      '请检查网络连接或后端服务是否正常'
    )
  }
}

/**
 * 发送飞书消息（原子工具）
 */
export const larkSendMessage = async (args: Record<string, any>): Promise<ToolResult> => {
  const {
    receive_id,
    receive_id_type = 'open_id',
    msg_type = 'text',
    content
  } = args

  if (!receive_id || !content) {
    return createErrorResult(
      'Missing required parameters',
      '缺少必要参数',
      '需要 receive_id 和 content'
    )
  }

  let messageContent: string
  if (msg_type === 'text') {
    messageContent = JSON.stringify({ text: content })
  } else {
    messageContent = content
  }

  return runLarkCli({
    command: 'im message create',
    args: [
      '--receive_id_type', String(receive_id_type),
      '--receive_id', String(receive_id),
      '--msg_type', String(msg_type),
      '--content', messageContent
    ]
  })
}

/**
 * 搜索飞书文档（原子工具）
 */
export const larkSearchDocs = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query, page_size = 10 } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: lark_search_docs(query="项目计划")'
    )
  }

  return runLarkCli({
    command: 'docs search',
    args: ['--query', String(query), '--page_size', String(page_size)]
  })
}

/**
 * 查询飞书日程（原子工具）
 */
export const larkCalendarEvents = async (args: Record<string, any>): Promise<ToolResult> => {
  const { start_time, end_time, calendar_id = 'primary' } = args

  const params: Record<string, string> = { calendar_id: String(calendar_id) }

  if (start_time) {
    params.start_time = String(start_time)
  } else {
    // 默认查询未来 7 天
    const now = Math.floor(Date.now() / 1000)
    params.start_time = String(now)
    params.end_time = String(now + 7 * 24 * 3600)
  }

  if (end_time) {
    params.end_time = String(end_time)
  }

  return runLarkCli({
    command: 'calendar events instance_view',
    args: ['--params', JSON.stringify(params)]
  })
}

/**
 * 搜索飞书用户（原子工具）
 */
export const larkSearchUser = async (args: Record<string, any>): Promise<ToolResult> => {
  const { query } = args

  if (!query) {
    return createErrorResult(
      'Missing query parameter',
      '请提供搜索关键词',
      '示例: lark_search_user(query="张三")'
    )
  }

  return runLarkCli({
    command: 'contact search-user',
    args: ['--query', String(query)]
  })
}
