/**
 * MCP Manager
 * 
 * 统一管理多个 MCP Server 的连接和工具调用
 * 数据源：后端API（唯一数据源）
 */

import type {
  MCPServerConfig,
  MCPServerState,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPEvent,
  MCPEventCallback,
  MCPStorageData,
  MCPPreset
} from './types'
import { MCPClient, type MCPClientOptions } from './client'
import { getPresetById } from './presets'
import type { ToolDefinition, ToolExecutor } from '../tools/types'
import { registerTool } from '../tools/registry'
import * as mcpStorage from '../services/mcpStorage'

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
  private initialized = false

  constructor() {
    // 不再从 localStorage 加载，改为异步初始化
  }

  /** 异步初始化 - 从后端加载 */
  async init(): Promise<void> {
    if (this.initialized) return
    
    try {
      const servers = await mcpStorage.getMCPServers()
      this.servers.clear()
      
      servers.forEach(state => {
        this.servers.set(state.id, state)
      })
      
      this.initialized = true
      console.log(`[MCP] 从后端加载了 ${servers.length} 个 Server 配置`)
    } catch (error) {
      console.error('[MCP] 初始化失败:', error)
    }
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
    const state = await mcpStorage.createMCPServer({
      ...config,
      enabled: false
    })
    
    if (!state) {
      throw new Error('创建 MCP Server 失败')
    }

    this.servers.set(state.id, state)

    this.emit({
      type: 'server.disconnected',
      serverId: state.id,
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

    const config: Omit<MCPServerConfig, 'id' | 'createdAt' | 'updatedAt'> = {
      ...preset.config,
      name: preset.name,
      description: preset.description,
      icon: preset.icon,
      category: preset.category,
      enabled: false
    }

    // 应用自定义配置
    if (customConfig && config.transport === 'stdio') {
      (config as any).env = { ...(config as any).env, ...customConfig }
    } else if (customConfig && (config.transport === 'sse' || config.transport === 'http')) {
      Object.entries(customConfig).forEach(([key, value]) => {
        if (key === 'url') {
          (config as any).url = value
        }
      })
    }

    return this.addServer(config as MCPServerConfig)
  }

  /** 更新 Server 配置 */
  async updateServer(serverId: string, updates: Partial<MCPServerConfig>): Promise<MCPServerState | null> {
    const state = await mcpStorage.updateMCPServer(serverId, updates)
    
    if (state) {
      this.servers.set(serverId, state)
      
      this.emit({
        type: 'server.configUpdated',
        serverId,
        timestamp: Date.now(),
        data: { state, updates }
      })
    }
    
    return state
  }

  /** 删除 Server */
  async removeServer(serverId: string): Promise<boolean> {
    // 先断开连接
    await this.disconnect(serverId)

    const success = await mcpStorage.deleteMCPServer(serverId)
    
    if (success) {
      this.servers.delete(serverId)
      this.clients.delete(serverId)

      this.emit({
        type: 'server.disconnected',
        serverId,
        timestamp: Date.now(),
        data: {}
      })
    }

    return success
  }

  /** 获取单个 Server */
  getServer(serverId: string): MCPServerState | undefined {
    return this.servers.get(serverId)
  }

  /** 获取所有 Servers */
  getAllServers(): MCPServerState[] {
    return Array.from(this.servers.values())
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
  // 连接管理
  // ============================================

  /** 连接到 Server */
  async connect(serverId: string): Promise<MCPServerState> {
    const state = this.servers.get(serverId)
    if (!state) {
      throw new Error(`Server 不存在: ${serverId}`)
    }

    if (state.status === 'connected') {
      return state
    }

    // 更新状态为 connecting
    this.updateServerState(serverId, { status: 'connecting' })

    try {
      // 调用后端连接
      const updatedState = await mcpStorage.connectMCPServer(serverId)
      
      if (!updatedState) {
        throw new Error('连接失败')
      }

      this.servers.set(serverId, updatedState)

      // 注册工具到系统
      updatedState.tools.forEach(tool => {
        const wrapper: MCPToolWrapperOptions = {
          serverId,
          tool,
          client: null as any // 后端执行，前端不需要 client
        }

        registerTool(
          `${serverId}_${tool.name}`,
          createMCPToolDefinition(wrapper),
          async (args) => {
            // 通过后端执行工具
            const result = await mcpStorage.executeMCPTool(serverId, tool.name, args)
            if (!result.success) {
              throw new Error(result.error || '工具执行失败')
            }
            return result.result || ''
          }
        )
      })

      this.emit({
        type: 'server.connected',
        serverId,
        timestamp: Date.now(),
        data: { 
          state: updatedState,
          toolCount: updatedState.tools.length,
          resourceCount: updatedState.resources.length
        }
      })

      return updatedState
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      this.updateServerState(serverId, { 
        status: 'error', 
        error: errorMsg 
      })

      this.emit({
        type: 'server.error',
        serverId,
        timestamp: Date.now(),
        data: { error: errorMsg }
      })

      throw error
    }
  }

  /** 断开 Server 连接 */
  async disconnect(serverId: string): Promise<void> {
    const state = this.servers.get(serverId)
    if (!state || state.status === 'disconnected') {
      return
    }

    try {
      await mcpStorage.disconnectMCPServer(serverId)
      
      // 注销工具
      state.tools.forEach(tool => {
        // 从注册表中移除
        const toolName = `${serverId}_${tool.name}`
        // TODO: 实现 unregisterTool
      })

      this.updateServerState(serverId, { status: 'disconnected', error: undefined })

      this.emit({
        type: 'server.disconnected',
        serverId,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error(`[MCP] 断开连接失败 ${serverId}:`, error)
    }
  }

  /** 断开所有 Server */
  async disconnectAll(): Promise<void> {
    await Promise.all(
      this.getConnectedServers().map(s => this.disconnect(s.id))
    )
  }

  /** 重新连接 Server */
  async reconnect(serverId: string): Promise<MCPServerState> {
    await this.disconnect(serverId)
    return this.connect(serverId)
  }

  /** 更新 Server 状态 */
  private updateServerState(serverId: string, updates: Partial<MCPServerState>): void {
    const state = this.servers.get(serverId)
    if (state) {
      Object.assign(state, updates)
    }
  }

  // ============================================
  // 工具调用
  // ============================================

  /** 调用工具 */
  async callTool(serverId: string, toolName: string, args: Record<string, any>): Promise<string> {
    const result = await mcpStorage.executeMCPTool(serverId, toolName, args)
    
    if (!result.success) {
      throw new Error(result.error || '工具执行失败')
    }
    
    return result.result || ''
  }

  /** 获取所有可用工具 */
  getAllTools(): MCPTool[] {
    const tools: MCPTool[] = []
    this.getConnectedServers().forEach(server => {
      server.tools.forEach(tool => {
        tools.push({
          ...tool,
          name: `${server.id}_${tool.name}`
        })
      })
    })
    return tools
  }

  /** 获取所有工具定义（兼容旧接口） */
  getAllToolDefinitions(): ToolDefinition[] {
    return this.getAllTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema
      }
    }))
  }

  /** 执行工具（兼容旧接口） */
  async execute(serverId: string, toolName: string, args: Record<string, any>): Promise<string> {
    return this.callTool(serverId, toolName, args)
  }

  /** 连接服务器（兼容旧接口） */
  async connectServer(serverId: string): Promise<MCPServerState> {
    return this.connect(serverId)
  }

  /** 断开服务器（兼容旧接口） */
  async disconnectServer(serverId: string): Promise<void> {
    return this.disconnect(serverId)
  }

  // ============================================
  // 导入/导出
  // ============================================

  /** 导出配置 */
  async exportConfig(): Promise<string> {
    const servers = await mcpStorage.getMCPServers()
    const data: MCPStorageData = {
      servers: servers.map(s => s.config),
      version: '1.0.0',
      lastUpdated: Date.now()
    }
    return JSON.stringify(data, null, 2)
  }

  /** 导入配置 */
  async importConfig(json: string): Promise<void> {
    try {
      const data: MCPStorageData = JSON.parse(json)
      
      // 清空现有配置
      await Promise.all(
        this.getAllServers().map(s => mcpStorage.deleteMCPServer(s.id))
      )

      // 加载新配置
      for (const config of data.servers) {
        await mcpStorage.createMCPServer({
          ...config,
          enabled: false
        })
      }

      // 重新加载
      await this.init()
      
      console.log(`[MCP] 导入了 ${data.servers.length} 个 Server 配置`)
    } catch (error) {
      throw new Error('导入配置失败: ' + (error instanceof Error ? error.message : String(error)))
    }
  }
}

// 导出单例
export const mcpManager = new MCPManager()

/** 初始化 MCP 系统 */
export async function initializeMCP(): Promise<void> {
  await mcpManager.init()
  console.log('[MCP] 系统已初始化')
  console.log(`[MCP] 已加载 ${mcpManager.getAllServers().length} 个 Server 配置`)
}

// 重新导出存储服务
export { mcpStorage }
