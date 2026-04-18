/**
 * 飞书 Lark CLI 工具定义
 */

import type { ToolDefinition } from '@/theme/tools/types'

export const runLarkCliDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'run_lark_cli',
    description: `执行飞书 Lark CLI 命令，操作飞书生态（消息、文档、日历、通讯录等）。

使用此工具前，请确认：
1. 用户已完成飞书 OAuth 登录（lark-cli auth login）
2. 命令和参数符合 lark-cli 规范

常用命令示例：
- 发送消息: run_lark_cli(command="im message create", args=["--receive_id_type", "open_id", "--receive_id", "xxx", "--msg_type", "text", "--content", '{"text":"hello"}'])
- 查询日程: run_lark_cli(command="calendar events instance_view", args=["--params", '{"calendar_id":"primary"}'])
- 搜索文档: run_lark_cli(command="docs search", args=["--query", "项目计划"])
- 获取用户信息: run_lark_cli(command="contact user", args=["--user_id", "xxx"])
- 列出多维表格: run_lark_cli(command="base list", args=[])

完整命令列表可用 "/" 查看: im, docs, calendar, contact, drive, wiki, sheets, base, task 等。
输出格式默认为 JSON，方便解析。`,
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'lark-cli 命令，如 "im message create"、"calendar events list"、"docs search"'
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: '命令参数列表，如 ["--receive_id", "xxx", "--content", "hello"]',
          default: []
        },
        timeout: {
          type: 'number',
          description: '超时时间（毫秒），默认 30000',
          default: 30000
        }
      },
      required: ['command']
    }
  }
}

// 原子工具：发送飞书消息
export const larkSendMessageDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'lark_send_message',
    description: '发送飞书即时消息。支持单聊和群聊。',
    parameters: {
      type: 'object',
      properties: {
        receive_id: {
          type: 'string',
          description: '接收者 ID（open_id 或 chat_id）'
        },
        receive_id_type: {
          type: 'string',
          enum: ['open_id', 'user_id', 'union_id', 'email', 'chat_id'],
          description: '接收者 ID 类型',
          default: 'open_id'
        },
        msg_type: {
          type: 'string',
          enum: ['text', 'post', 'image', 'file', 'interactive'],
          description: '消息类型',
          default: 'text'
        },
        content: {
          type: 'string',
          description: '消息内容。text 类型直接传字符串；其他类型传 JSON 字符串'
        }
      },
      required: ['receive_id', 'content']
    }
  }
}

// 原子工具：搜索飞书文档
export const larkSearchDocsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'lark_search_docs',
    description: '搜索飞书知识库中的文档',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词'
        },
        page_size: {
          type: 'number',
          description: '每页结果数',
          default: 10
        }
      },
      required: ['query']
    }
  }
}

// 原子工具：查询日程
export const larkCalendarEventsDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'lark_calendar_events',
    description: '查询飞书日历中的日程事件',
    parameters: {
      type: 'object',
      properties: {
        start_time: {
          type: 'string',
          description: '开始时间戳（秒），如未提供则查询未来 7 天'
        },
        end_time: {
          type: 'string',
          description: '结束时间戳（秒）'
        },
        calendar_id: {
          type: 'string',
          description: '日历 ID，默认 primary',
          default: 'primary'
        }
      },
      required: []
    }
  }
}

// 原子工具：搜索用户
export const larkSearchUserDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'lark_search_user',
    description: '搜索飞书通讯录中的用户',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: '搜索关键词（姓名、邮箱、部门等）'
        }
      },
      required: ['query']
    }
  }
}
