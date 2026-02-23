/**
 * MCP (Model Context Protocol) Server 实现
 * 
 * 提供标准化的外部工具调用接口，允许 AI 与外部服务交互
 * 参考：https://github.com/anthropics/anthropic-cookbook/
 */

import type { ToolDefinition } from '../tools/types'

// MCP 工具定义
export interface MCPTool {
  name: string
  description: string
  parameters: Record<string, any>
}

// MCP Server 配置
export interface MCPServerConfig {
  name: string
  version: string
  description: string
  baseUrl?: string
  headers?: Record<string, string>
}

// MCP Server 类
export class MCPServer {
  private config: MCPServerConfig
  private tools: Map<string, MCPTool> = new Map()
  private handlers: Map<string, (args: any) => Promise<any>> = new Map()

  constructor(config: MCPServerConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl || ''
    }
  }

  /**
   * 注册一个 MCP 工具
   */
  registerTool(name: string, tool: MCPTool, handler: (args: any) => Promise<any>): void {
    this.tools.set(name, tool)
    this.handlers.set(name, handler)
    console.log(`[MCP] 工具已注册: ${name}`)
  }

  /**
   * 执行 MCP 工具
   */
  async executeTool(name: string, args: any): Promise<any> {
    const handler = this.handlers.get(name)
    if (!handler) {
      throw new Error(`MCP 工具未找到: ${name}`)
    }

    try {
      const result = await handler(args)
      return {
        success: true,
        data: result,
        tool: name
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        tool: name
      }
    }
  }

  /**
   * 获取所有可用工具
   */
  listTools(): MCPTool[] {
    return Array.from(this.tools.values())
  }

  /**
   * 转换为标准 ToolDefinition 格式
   */
  toToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.entries()).map(([name, tool]) => ({
      type: 'function',
      function: {
        name,
        description: tool.description,
        parameters: tool.parameters
      }
    }))
  }

  /**
   * 获取 Server 信息
   */
  getInfo() {
    return {
      name: this.config.name,
      version: this.config.version,
      description: this.config.description,
      tools: this.tools.size
    }
  }
}

// ============================================
// 内置 MCP 工具集
// ============================================

/**
 * 创建系统信息 MCP Server
 */
export function createSystemInfoMCPServer(): MCPServer {
  const server = new MCPServer({
    name: 'system-info',
    version: '1.0.0',
    description: '系统信息和环境查询'
  })

  // 获取系统信息
  server.registerTool(
    'get_system_info',
    {
      name: 'get_system_info',
      description: '获取当前系统环境和配置信息',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    async () => {
      return {
        platform: typeof window !== 'undefined' ? 'browser' : 'node',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    }
  )

  // 获取内存使用情况
  server.registerTool(
    'get_memory_usage',
    {
      name: 'get_memory_usage',
      description: '获取内存使用情况（浏览器环境）',
      parameters: {
        type: 'object',
        properties: {},
        required: []
      }
    },
    async () => {
      if (typeof window === 'undefined' || !('memory' in performance)) {
        return { error: '当前环境不支持内存查询' }
      }
      const memory = (performance as any).memory
      return {
        usedJSHeapSize: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
        totalJSHeapSize: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
        jsHeapSizeLimit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`
      }
    }
  )

  return server
}

/**
 * 创建数学计算 MCP Server
 */
export function createMathMCPServer(): MCPServer {
  const server = new MCPServer({
    name: 'math-server',
    version: '1.0.0',
    description: '数学计算和统计工具'
  })

  // 基础计算
  server.registerTool(
    'calculate',
    {
      name: 'calculate',
      description: '执行数学表达式计算',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: '数学表达式' }
        },
        required: ['expression']
      }
    },
    async (args: { expression: string }) => {
      try {
        // 安全计算 - 只允许数学运算
        const sanitized = args.expression.replace(/[^0-9+\-*/().\s]/g, '')
        const result = new Function('return ' + sanitized)()
        return { result, expression: args.expression }
      } catch (e) {
        return { error: '计算失败: ' + (e instanceof Error ? e.message : String(e)) }
      }
    }
  )

  // 统计计算
  server.registerTool(
    'statistics',
    {
      name: 'statistics',
      description: '计算数组的统计信息（平均值、中位数、最大值、最小值）',
      parameters: {
        type: 'object',
        properties: {
          numbers: { 
            type: 'array', 
            items: { type: 'number' },
            description: '数字数组'
          }
        },
        required: ['numbers']
      }
    },
    async (args: { numbers: number[] }) => {
      const nums = args.numbers.sort((a, b) => a - b)
      const sum = nums.reduce((a, b) => a + b, 0)
      const avg = sum / nums.length
      const median = nums.length % 2 === 0 
        ? (nums[nums.length / 2 - 1] + nums[nums.length / 2]) / 2
        : nums[Math.floor(nums.length / 2)]
      
      return {
        count: nums.length,
        sum,
        average: avg,
        median,
        min: nums[0],
        max: nums[nums.length - 1]
      }
    }
  )

  return server
}

/**
 * 创建文本处理 MCP Server
 */
export function createTextMCPServer(): MCPServer {
  const server = new MCPServer({
    name: 'text-server',
    version: '1.0.0',
    description: '文本处理和转换工具'
  })

  // 文本统计
  server.registerTool(
    'text_stats',
    {
      name: 'text_stats',
      description: '统计文本信息（字数、行数、字符数）',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要统计的文本' }
        },
        required: ['text']
      }
    },
    async (args: { text: string }) => {
      return {
        length: args.text.length,
        lines: args.text.split('\n').length,
        words: args.text.split(/\s+/).filter(w => w.length > 0).length,
        chineseChars: (args.text.match(/[\u4e00-\u9fa5]/g) || []).length
      }
    }
  )

  // 文本分割
  server.registerTool(
    'split_text',
    {
      name: 'split_text',
      description: '按指定分隔符分割文本',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: '要分割的文本' },
          separator: { type: 'string', description: '分隔符，默认换行' }
        },
        required: ['text']
      }
    },
    async (args: { text: string; separator?: string }) => {
      const sep = args.separator || '\n'
      return {
        parts: args.text.split(sep),
        count: args.text.split(sep).length
      }
    }
  )

  // JSON 格式化
  server.registerTool(
    'format_json',
    {
      name: 'format_json',
      description: '格式化 JSON 字符串',
      parameters: {
        type: 'object',
        properties: {
          json: { type: 'string', description: 'JSON 字符串' },
          indent: { type: 'number', description: '缩进空格数，默认 2' }
        },
        required: ['json']
      }
    },
    async (args: { json: string; indent?: number }) => {
      try {
        const obj = JSON.parse(args.json)
        return {
          formatted: JSON.stringify(obj, null, args.indent || 2),
          valid: true
        }
      } catch (e) {
        return {
          error: '无效的 JSON: ' + (e instanceof Error ? e.message : String(e)),
          valid: false
        }
      }
    }
  )

  return server
}

// ============================================
// MCP Server 管理器
// ============================================

class MCPManager {
  private servers: Map<string, MCPServer> = new Map()

  register(name: string, server: MCPServer): void {
    this.servers.set(name, server)
    console.log(`[MCP] Server 已注册: ${name}`)
  }

  get(name: string): MCPServer | undefined {
    return this.servers.get(name)
  }

  list(): string[] {
    return Array.from(this.servers.keys())
  }

  getAllTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = []
    this.servers.forEach(server => {
      tools.push(...server.toToolDefinitions())
    })
    return tools
  }

  async execute(toolName: string, args: any): Promise<any> {
    for (const [serverName, server] of this.servers) {
      const tools = server.listTools()
      if (tools.some(t => t.name === toolName)) {
        return server.executeTool(toolName, args)
      }
    }
    throw new Error(`MCP 工具未找到: ${toolName}`)
  }
}

// 导出单例
export const mcpManager = new MCPManager()

// 初始化默认 MCP Servers
export function initializeMCPServers(): void {
  mcpManager.register('system', createSystemInfoMCPServer())
  mcpManager.register('math', createMathMCPServer())
  mcpManager.register('text', createTextMCPServer())
  
  console.log(`[MCP] ${mcpManager.list().length} 个 Server 已初始化`)
}

// 浏览器环境自动初始化
if (typeof window !== 'undefined') {
  initializeMCPServers()
}
