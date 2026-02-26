/**
 * MCP Manager
 * 
 * 统一管理多个 MCP Server 的连接和工具调用
 */

import type {
  MCPServerConfig,
  MCPServerState,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPEvent,
  MCPEventCallback,
  MCPConnectionStatus,
  MCPStorageData,
  MCPPreset
} from './types'
import { MCPClient, type MCPClientOptions } from './client'
import { getPresetById } from './presets'
import type { ToolDefinition, ToolExecutor } from '../tools/types'
import { registerTool } from '../tools/registry'

/** MCP 工具包装器选项 */
interface MCPToolWrapperOptions {
  serverId: string
  tool: MCPTool
  client: MCPClient
}

/** 创建 MCP 工具定义 */
function createMCPToolDefinition(options: MCPToolWrapperOptions): ToolDefinition {
  const { serverId, tool } = options
  
  return {
    type: 'function',
    function: {
      name: `${serverId}_${tool.name}`,
      description: `[${serverId}] ${tool.description}`,
      parameters: tool.inputSchema
    }
  }
}

/** 创建 MCP 工具执行器 */
function createMCPToolExecutor(options: MCPToolWrapperOptions): ToolExecutor {
  const { serverId, tool, client } = options
  
  return async (args: Record<string, any>): Promise<string> => {
    try {
      const result = await client.callTool(tool.name, args)
      
      if (result.isError) {
        return `❌ MCP 工具执行失败: ${serverId}/${tool.name}\n\n错误信息请查看返回内容`
      }

      // 将 MCP 结果转换为字符串
      const contents = result.content.map(c => {
        if (c.type === 'text') return c.text || ''
        if (c.type === 'image') return `[图片: ${c.mimeType}]`
        if (c.type === 'resource') return `[资源: ${c.resource?.uri}]`
        return ''
      })

      return contents.join('\n')
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      return `❌ MCP 工具调用失败: ${serverId}/${tool.name}\n\n${errorMsg}\n\n建议：\n1. 检查 MCP Server 是否正常运行\n2. 查看网络连接状态\n3. 验证配置参数是否正确`
    }
  }
}

/** MCP Manager 类 */
export class MCPManager {
  private servers: Map<string, MCPServerState> = new Map()
  private clients: Map<string, MCPClient> = new Map()
  private eventListeners: Set<MCPEventCallback> = new Set()
  private storageKey = 'metablog_mcp_servers'

  constructor() {
    this.loadFromStorage()
  }

  // ============================================
  // 事件系统
  // ============================================

  /** 添加事件监听器 */
  onEvent(callback: MCPEventCallback): () => void {
    this.eventListeners.add(callback)
    return () => this.eventListeners.delete(callback)
  }

  /** 触发事件 */
  private emit(event: MCPEvent): void {
    this.eventListeners.forEach(cb => cb(event.type, event))
  }

  // ============================================
  // Server 管理
  // ============================================

  /** 添加 MCP Server */
  async addServer(config: MCPServerConfig): Promise<MCPServerState> {
    const state: MCPServerState = {
      id: config.id,
      config,
      status: 'disconnected',
      tools: [],
      resources: [],
      prompts: [],
      connectAttempts: 0
    }

    this.servers.set(config.id, state)
    this.saveToStorage()

    this.emit({
      type: 'server.disconnected',
      serverId: config.id,
      timestamp: Date.now(),
      data: { state }
    })

    return state
  }

  /** 从预设添加 Server */
  async addServerFromPreset(presetId: string, customConfig?: Record<string, string>): Promise<MCPServerState> {
    const preset = getPresetById(presetId)
    if (!preset) {
      throw new Error(`预设不存在: ${presetId}`)
    }

    const config: MCPServerConfig = {
      ...preset.config,
      id: `${presetId}_${Date.now()}`,
      name: preset.name,
      description: preset.description,
      icon: preset.icon,
      category: preset.category,
      enabled: false
    } as MCPServerConfig

    // 应用自定义配置
    if (customConfig && config.transport === 'stdio') {
      config.env = { ...config.env, ...customConfig }
    } else if (customConfig && (config.transport === 'sse' || config.transport === 'http')) {
      Object.entries(customConfig).forEach(([key, value]) => {
        if (key === 'url') {
          (config as any).url = value
        } else {
          config.headers = config.headers || {}
          config.headers[key] = value
        }
      })
    }

    return this.addServer(config)
  }

  /** 移除 MCP Server */
  async removeServer(serverId: string): Promise<void> {
    // 断开连接
    await this.disconnectServer(serverId)

    // 移除状态
    this.servers.delete(serverId)
    this.clients.delete(serverId)

    this.saveToStorage()
  }

  /** 更新 Server 配置 */
  async updateServer(serverId: string, updates: Partial<MCPServerConfig>): Promise<MCPServerState> {
    const state = this.servers.get(serverId)
    if (!state) {
      throw new Error(`Server 不存在: ${serverId}`)
    }

    // 如果正在运行，先断开
    if (state.status === 'connected') {
      await this.disconnectServer(serverId)
    }

    state.config = { ...state.config, ...updates } as MCPServerConfig
    this.servers.set(serverId, state)
    this.saveToStorage()

    return state
  }

  // ============================================
  // 连接管理
  // ============================================

  /** 连接 Server */
  async connectServer(serverId: string): Promise<void> {
    const state = this.servers.get(serverId)
    if (!state) {
      throw new Error(`Server 不存在: ${serverId}`)
    }

    if (state.status === 'connected' || state.status === 'connecting') {
      return
    }

    state.status = 'connecting'
    state.connectAttempts++
    this.servers.set(serverId, state)

    this.emit({
      type: 'server.disconnected',
      serverId,
      timestamp: Date.now(),
      data: { state }
    })

    try {
      // 目前只支持 HTTP/SSE 传输
      if (state.config.transport === 'stdio') {
        throw new Error('Stdio 传输类型需要在后端支持')
      }

      const clientOptions: MCPClientOptions = {
        name: 'metablog-mcp-client',
        version: '1.0.0',
        timeout: state.config.timeout || 30000
      }

      const client = new MCPClient(state.config, clientOptions)
      
      // 监听状态变化
      client.onStatus((status, error) => {
        this.updateServerStatus(serverId, status, error)
      })

      await client.connect()
      this.clients.set(serverId, client)

      // 获取工具并注册到系统
      const tools = client.getTools()
      state.tools = tools
      
      // 注册工具到 Agent 系统
      this.registerToolsToAgent(serverId, tools, client)

      state.status = 'connected'
      state.lastConnectedAt = Date.now()
      this.servers.set(serverId, state)
      this.saveToStorage()

      this.emit({
        type: 'server.connected',
        serverId,
        timestamp: Date.now(),
        data: { state, toolCount: tools.length }
      })

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      state.status = 'error'
      state.error = errorMsg
      state.lastErrorAt = Date.now()
      this.servers.set(serverId, state)
      this.saveToStorage()

      this.emit({
        type: 'server.error',
        serverId,
        timestamp: Date.now(),
        data: { error: errorMsg }
      })

      throw error
    }
  }

  /** 断开 Server */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId)
    if (client) {
      client.disconnect()
      this.clients.delete(serverId)
    }

    const state = this.servers.get(serverId)
    if (state) {
      state.status = 'disconnected'
      state.tools = []
      state.resources = []
      state.prompts = []
      this.servers.set(serverId, state)
      this.saveToStorage()

      // 注销已注册的工具
      this.unregisterToolsFromAgent(serverId)
    }

    this.emit({
      type: 'server.disconnected',
      serverId,
      timestamp: Date.now(),
      data: {}
    })
  }

  /** 更新 Server 状态 */
  private updateServerStatus(serverId: string, status: MCPConnectionStatus, error?: string): void {
    const state = this.servers.get(serverId)
    if (!state) return

    state.status = status
    if (error) state.error = error
    this.servers.set(serverId, state)

    if (status === 'error') {
      this.emit({
        type: 'server.error',
        serverId,
        timestamp: Date.now(),
        data: { error }
      })
    }
  }

  // ============================================
  // 工具集成
  // ============================================

  /** 注册 MCP 工具到 Agent 系统 */
  private registerToolsToAgent(serverId: string, tools: MCPTool[], client: MCPClient): void {
    tools.forEach(tool => {
      const definition = createMCPToolDefinition({ serverId, tool, client })
      const executor = createMCPToolExecutor({ serverId, tool, client })
      
      // 注册到工具系统
      registerTool(definition.function.name, definition, executor)
    })

    console.log(`[MCP] 已注册 ${tools.length} 个工具: ${serverId}`)
  }

  /** 注销 MCP 工具 */
  private unregisterToolsFromAgent(serverId: string): void {
    // 注意：这里需要工具系统支持注销工具
    // 目前简单处理，实际实现需要添加 unregisterTool 函数
    console.log(`[MCP] Server 断开，工具已失效: ${serverId}`)
  }

  /** 获取所有可用的 MCP 工具定义 */
  getAllToolDefinitions(): ToolDefinition[] {
    const definitions: ToolDefinition[] = []
    
    this.servers.forEach((state, serverId) => {
      if (state.status !== 'connected') return
      
      const client = this.clients.get(serverId)
      if (!client) return

      state.tools.forEach(tool => {
        definitions.push(createMCPToolDefinition({ serverId, tool, client }))
      })
    })

    return definitions
  }

  // ============================================
  // 查询
  // ============================================

  /** 获取所有 Server 状态 */
  getAllServers(): MCPServerState[] {
    return Array.from(this.servers.values())
  }

  /** 获取指定 Server */
  getServer(serverId: string): MCPServerState | undefined {
    return this.servers.get(serverId)
  }

  /** 获取已连接的 Servers */
  getConnectedServers(): MCPServerState[] {
    return this.getAllServers().filter(s => s.status === 'connected')
  }

  /** 检查 Server 是否已连接 */
  isConnected(serverId: string): boolean {
    return this.servers.get(serverId)?.status === 'connected'
  }

  // ============================================
  // 存储
  // ============================================

  /** 保存到本地存储 */
  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return

    const data: MCPStorageData = {
      servers: Array.from(this.servers.values()).map(s => s.config),
      version: '1.0.0',
      lastUpdated: Date.now()
    }

    localStorage.setItem(this.storageKey, JSON.stringify(data))
  }

  /** 从本地存储加载 */
  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return

    try {
      const raw = localStorage.getItem(this.storageKey)
      if (!raw) return

      const data: MCPStorageData = JSON.parse(raw)
      
      data.servers.forEach(config => {
        const state: MCPServerState = {
          id: config.id,
          config,
          status: 'disconnected',
          tools: [],
          resources: [],
          prompts: [],
          connectAttempts: 0
        }
        this.servers.set(config.id, state)
      })

      console.log(`[MCP] 从存储加载了 ${data.servers.length} 个 Server 配置`)
    } catch (error) {
      console.error('[MCP] 加载存储失败:', error)
    }
  }

  /** 导出配置 */
  exportConfig(): string {
    const data: MCPStorageData = {
      servers: Array.from(this.servers.values()).map(s => s.config),
      version: '1.0.0',
      lastUpdated: Date.now()
    }
    return JSON.stringify(data, null, 2)
  }

  /** 导入配置 */
  importConfig(json: string): void {
    try {
      const data: MCPStorageData = JSON.parse(json)
      
      // 清空现有配置
      this.servers.clear()
      this.clients.clear()

      // 加载新配置
      data.servers.forEach(config => {
        const state: MCPServerState = {
          id: config.id,
          config,
          status: 'disconnected',
          tools: [],
          resources: [],
          prompts: [],
          connectAttempts: 0
        }
        this.servers.set(config.id, state)
      })

      this.saveToStorage()
      console.log(`[MCP] 导入了 ${data.servers.length} 个 Server 配置`)
    } catch (error) {
      throw new Error('导入配置失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }
}

// 导出单例
export const mcpManager = new MCPManager()

/** 初始化 MCP 系统 */
export function initializeMCP(): void {
  console.log('[MCP] 系统已初始化')
  console.log(`[MCP] 已加载 ${mcpManager.getAllServers().length} 个 Server 配置`)
}
