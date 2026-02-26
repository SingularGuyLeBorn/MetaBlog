/**
 * MCP Client 实现
 * 
 * 支持 SSE 和 HTTP 传输协议
 */

import type {
  MCPServerConfig,
  MCPHttpConfig,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPCallToolParams,
  MCPCallToolResult,
  MCPJSONRPCRequest,
  MCPJSONRPCResponse,
  MCPCapabilities,
  MCPConnectionStatus
} from './types'

/** MCP Client 选项 */
export interface MCPClientOptions {
  /** 客户端名称 */
  name: string
  /** 客户端版本 */
  version: string
  /** 连接超时（毫秒） */
  timeout?: number
  /** 重试次数 */
  retries?: number
}

/** MCP Client 类 */
export class MCPClient {
  private config: MCPHttpConfig
  private options: Required<MCPClientOptions>
  private sessionId: string | null = null
  private tools: MCPTool[] = []
  private resources: MCPResource[] = []
  private prompts: MCPPrompt[] = []
  private eventSource: EventSource | null = null
  private messageQueue: Map<string, { resolve: (value: any) => void; reject: (reason: any) => void }> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private status: MCPConnectionStatus = 'disconnected'
  private onStatusChange?: (status: MCPConnectionStatus, error?: string) => void

  constructor(config: MCPHttpConfig, options: MCPClientOptions) {
    this.config = config
    this.options = {
      name: options.name,
      version: options.version,
      timeout: options.timeout || 30000,
      retries: options.retries || 3
    }
  }

  /** 获取当前状态 */
  getStatus(): MCPConnectionStatus {
    return this.status
  }

  /** 设置状态变更回调 */
  onStatus(callback: (status: MCPConnectionStatus, error?: string) => void): void {
    this.onStatusChange = callback
  }

  /** 更新状态 */
  private setStatus(status: MCPConnectionStatus, error?: string): void {
    this.status = status
    this.onStatusChange?.(status, error)
  }

  /** 连接到 MCP Server */
  async connect(): Promise<void> {
    if (this.status === 'connected' || this.status === 'connecting') {
      return
    }

    this.setStatus('connecting')

    try {
      // 初始化连接
      const initResult = await this.initialize()
      
      if (initResult) {
        this.sessionId = crypto.randomUUID()
        this.setStatus('connected')
        this.reconnectAttempts = 0
        
        // 加载可用资源
        await this.loadCapabilities()
        
        // 如果是 SSE 模式，建立事件流连接
        if (this.config.transport === 'sse') {
          this.connectSSE()
        }
      }
    } catch (error) {
      this.setStatus('error', error instanceof Error ? error.message : String(error))
      throw error
    }
  }

  /** 初始化 MCP 连接 */
  private async initialize(): Promise<MCPInitializeResult | null> {
    const params: MCPInitializeParams = {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: { listChanged: true },
        logging: {}
      },
      clientInfo: {
        name: this.options.name,
        version: this.options.version
      }
    }

    const response = await this.sendRequest('initialize', params)
    return response as MCPInitializeResult
  }

  /** 加载能力列表 */
  private async loadCapabilities(): Promise<void> {
    try {
      // 加载工具列表
      const toolsResponse = await this.sendRequest('tools/list', {})
      if (toolsResponse?.tools) {
        this.tools = toolsResponse.tools
      }

      // 加载资源列表
      const resourcesResponse = await this.sendRequest('resources/list', {})
      if (resourcesResponse?.resources) {
        this.resources = resourcesResponse.resources
      }

      // 加载提示词列表
      const promptsResponse = await this.sendRequest('prompts/list', {})
      if (promptsResponse?.prompts) {
        this.prompts = promptsResponse.prompts
      }
    } catch (error) {
      console.warn('[MCP] 加载能力列表失败:', error)
    }
  }

  /** 建立 SSE 连接 */
  private connectSSE(): void {
    if (!this.sessionId) return

    const sseUrl = new URL('/sse', this.config.url)
    sseUrl.searchParams.set('sessionId', this.sessionId)

    this.eventSource = new EventSource(sseUrl.toString())

    this.eventSource.onopen = () => {
      console.log('[MCP] SSE 连接已建立')
    }

    this.eventSource.onmessage = (event) => {
      this.handleSSEMessage(event.data)
    }

    this.eventSource.onerror = (error) => {
      console.error('[MCP] SSE 连接错误:', error)
      this.handleReconnect()
    }
  }

  /** 处理 SSE 消息 */
  private handleSSEMessage(data: string): void {
    try {
      const message = JSON.parse(data) as MCPJSONRPCResponse
      
      if (message.id && this.messageQueue.has(String(message.id))) {
        const { resolve, reject } = this.messageQueue.get(String(message.id))!
        this.messageQueue.delete(String(message.id))

        if (message.error) {
          reject(new Error(message.error.message))
        } else {
          resolve(message.result)
        }
      }
    } catch (error) {
      console.error('[MCP] 解析 SSE 消息失败:', error)
    }
  }

  /** 处理重连 */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.setStatus('error', '重连次数超过最大限制')
      return
    }

    this.reconnectAttempts++
    this.setStatus('reconnecting')

    setTimeout(() => {
      console.log(`[MCP] 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
      this.connect().catch(() => {
        this.handleReconnect()
      })
    }, 2000 * this.reconnectAttempts)
  }

  /** 发送 JSON-RPC 请求 */
  private async sendRequest(method: string, params: any): Promise<any> {
    const id = crypto.randomUUID()
    const request: MCPJSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params
    }

    // 构建请求 URL
    const url = new URL(this.config.url)
    if (!url.pathname.endsWith('/mcp')) {
      url.pathname = url.pathname.replace(/\/?$/, '/mcp')
    }

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...this.config.headers
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json() as MCPJSONRPCResponse

    if (result.error) {
      throw new Error(result.error.message)
    }

    return result.result
  }

  /** 调用工具 */
  async callTool(name: string, args?: Record<string, any>): Promise<MCPCallToolResult> {
    if (this.status !== 'connected') {
      throw new Error('MCP 客户端未连接')
    }

    const params: MCPCallToolParams = { name, arguments: args }
    const result = await this.sendRequest('tools/call', params)
    return result as MCPCallToolResult
  }

  /** 获取工具列表 */
  getTools(): MCPTool[] {
    return [...this.tools]
  }

  /** 获取资源列表 */
  getResources(): MCPResource[] {
    return [...this.resources]
  }

  /** 获取提示词列表 */
  getPrompts(): MCPPrompt[] {
    return [...this.prompts]
  }

  /** 断开连接 */
  disconnect(): void {
    this.eventSource?.close()
    this.eventSource = null
    this.sessionId = null
    this.setStatus('disconnected')
    this.messageQueue.clear()
  }

  /** 检查连接是否活跃 */
  async ping(): Promise<boolean> {
    try {
      await this.sendRequest('ping', {})
      return true
    } catch {
      return false
    }
  }
}

/** 创建 MCP Client */
export function createMCPClient(config: MCPHttpConfig, options: MCPClientOptions): MCPClient {
  return new MCPClient(config, options)
}
