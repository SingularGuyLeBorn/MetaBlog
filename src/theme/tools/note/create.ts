/**
 * ============================================================================
 * 笔记创建工具
 * ============================================================================
 *
 * 提供创建 Markdown 格式笔记并保存到系统笔记库的能力. 
 * 笔记以 .md 文件形式存储在 .notes/ 目录下,支持标题、内容和标签. 
 *
 * @module src/theme/tools/note/create
 */

import type { ToolDefinition, ToolExecutor, ToolResult } from '@/theme/tools/types'
import { createErrorResult, createSuccessResult } from '@/theme/tools/types'

/**
 * 创建笔记工具定义
 */
export const createNoteDef: ToolDefinition = {
  type: 'function',
  function: {
    name: 'createNote',
    description: `创建一条 Markdown 格式的笔记并保存到系统笔记库中. \n\n【什么时候调用】\n- 用户要求"记一下"、"帮我记录"、"保存这个想法"\n- 用户给出需要长期保存的信息、灵感、待办事项、会议纪要等\n- 用户说"写到笔记里"、"做个备忘"\n- 当前对话中产生了有价值的信息,用户或你认为需要归档留存\n\n【不调用的情况】\n- 用户只是临时询问,不需要保存\n- 用户要求发送/发布到外部平台(如飞书、语雀、GitHub),应使用对应平台的工具\n\n【示例用法】\n- createNote(title="项目会议记录", content="讨论了下个季度的技术规划...", tags=["会议", "规划"])\n- createNote(title="待办事项", content="1. 修复登录bug\\n2. 更新文档", tags=["todo"])\n\n【注意事项】\n- title 和 content 为必填项,不能为空\n- tags 是可选的,用于分类和后续检索\n- 笔记以 Markdown 文件形式存储在 .notes/ 目录下\n- 标题会自动清理特殊字符作为文件名`,
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '笔记标题. 要求：非空字符串,简明概括笔记主题. 示例："项目会议记录"、"待办事项清单"'
        },
        content: {
          type: 'string',
          description: '笔记正文内容. 支持 Markdown 格式. 要求：非空字符串. 示例："讨论了下个季度的技术规划,决定优先做..."'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: '标签列表,用于分类和检索. 可选,默认为空数组. 示例：["会议", "规划"]、["todo", "高优先级"]',
          default: []
        }
      },
      required: ['title', 'content']
    }
  }
}

/** 后端 API 基础路径 */
const API_BASE = '/api'

/**
 * 创建笔记并保存到系统笔记库
 *
 * 将笔记内容格式化为 Markdown,通过 /api/files/save 接口保存到 .notes/ 目录. 
 * 文件名基于当前时间戳和清理后的标题生成. 
 *
 * @param args - 包含 title、content、tags 参数
 * @returns 创建结果
 */
export const createNote: ToolExecutor = async (args): Promise<ToolResult> => {
  const { title, content, tags = [] } = args

  if (!title || !content) {
    return createErrorResult(
      'Missing required parameters',
      '请提供标题和内容',
      '示例: createNote(title="笔记标题", content="笔记内容", tags=["tag1"])'
    )
  }

  try {
    const noteContent = `# ${title}\n\n${content}\n\n---\n标签: ${tags.join(', ') || '无'}\n创建时间: ${new Date().toLocaleString('zh-CN')}\n`

    const response = await fetch(`${API_BASE}/files/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: `.notes/${Date.now()}-${title.replace(/[^\w\u4e00-\u9fa5]/g, '_')}.md`,
        content: noteContent
      })
    })

    if (!response.ok) {
      return createErrorResult(
        `HTTP ${response.status}`,
        '保存笔记失败',
        '请稍后重试'
      )
    }

    return createSuccessResult(
      { title, tags },
      `笔记创建成功: ${title}`,
      'createNote'
    )
  } catch (error: any) {
    return createErrorResult(
      error.message,
      '创建笔记失败',
      '请检查网络连接'
    )
  }
}
