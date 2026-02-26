/**
 * MCP (Model Context Protocol) 类型定义
 * 
 * 参考规范: https://modelcontextprotocol.io/specification/
 */

import type { ToolDefinition } from '../tools/types'

// ============================================
// MCP 基础类型
// ============================================

/** MCP 协议版本 */
export type MCPVersion = '2024-11-05'

/** MCP 工具定义 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

/** MCP 资源定义 */
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

/** MCP 提示词定义 */
export interface MCPPrompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

// ============================================
// MCP Server 配置
// ============================================

/** MCP Server 传输类型 */
export type MCPTransportType = 'stdio' | 'sse' | 'http'

/** MCP Server 基础配置 */
export interface MCPServerBaseConfig {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 描述 */
  description?: string
  /** 传输类型 */
  transport: MCPTransportType
  /** 是否启用 */
  enabled: boolean
  /** 图标（可选） */
  icon?: string
  /** 分类 */
  category?: 'social' | 'code' | 'dev' | 'productivity' | 'other'
}

/** Stdio 传输配置 */
export interface MCPStdioConfig extends MCPServerBaseConfig {
  transport: 'stdio'
  /** 命令 */
  command: string
  /** 参数 */
  args?: string[]
  /** 环境变量 */
  env?: Record<string, string>
  /** 工作目录 */
  cwd?: string
}

/** SSE/HTTP 传输配置 */
export interface MCPHttpConfig extends MCPServerBaseConfig {
  transport: 'sse' | 'http'
  /** 服务器 URL */
  url: string
  /** 请求头 */
  headers?: Record<string, string>
  /** 超时时间（毫秒） */
  timeout?: number
}

/** MCP Server 配置联合类型 */
export type MCPServerConfig = MCPStdioConfig | MCPHttpConfig

// ============================================
// MCP 连接状态
// ============================================

/** 连接状态 */
export type MCPConnectionStatus = 
  | 'disconnected'   // 未连接
  | 'connecting'     // 连接中
  | 'connected'      // 已连接
  | 'error'          // 连接错误
  | 'reconnecting'   // 重连中

/** MCP Server 运行时状态 */
export interface MCPServerState {
  id: string
  config: MCPServerConfig
  status: MCPConnectionStatus
  error?: string
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
  lastConnectedAt?: number
  lastErrorAt?: number
  connectAttempts: number
}

// ============================================
// MCP 预设配置
// ============================================

/** 预设 MCP 配置 */
export interface MCPPreset {
  id: string
  name: string
  description: string
  icon: string
  category: MCPServerBaseConfig['category']
  config: Omit<MCPServerConfig, 'id' | 'enabled'>
  /** 需要用户配置的字段 */
  requiredConfig?: Array<{
    key: string
    label: string
    type: 'string' | 'number' | 'password' | 'select'
    description?: string
    options?: string[]
    defaultValue?: string
  }>
}

// ============================================
// MCP 消息协议
// ============================================

/** JSON-RPC 请求 */
export interface MCPJSONRPCRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: any
}

/** JSON-RPC 响应 */
export interface MCPJSONRPCResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: {
    code: number
    message: string
    data?: any
  }
}

/** MCP 能力声明 */
export interface MCPCapabilities {
  tools?: { listChanged?: boolean }
  resources?: { subscribe?: boolean; listChanged?: boolean }
  prompts?: { listChanged?: boolean }
  logging?: {}
}

/** MCP 初始化参数 */
export interface MCPInitializeParams {
  protocolVersion: MCPVersion
  capabilities: MCPCapabilities
  clientInfo: {
    name: string
    version: string
  }
}

/** MCP 初始化结果 */
export interface MCPInitializeResult {
  protocolVersion: MCPVersion
  capabilities: MCPCapabilities
  serverInfo: {
    name: string
    version: string
  }
}

// ============================================
// MCP 工具执行
// ============================================

/** 工具调用参数 */
export interface MCPCallToolParams {
  name: string
  arguments?: Record<string, any>
}

/** 工具调用结果 */
export interface MCPCallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
    resource?: MCPResource
  }>
  isError?: boolean
}

// ============================================
// 存储类型
// ============================================

/** MCP 存储数据 */
export interface MCPStorageData {
  servers: MCPServerConfig[]
  version: string
  lastUpdated: number
}

// ============================================
// 事件类型
// ============================================

/** MCP 事件类型 */
export type MCPEventType = 
  | 'server.connected'
  | 'server.disconnected'
  | 'server.error'
  | 'server.tools.updated'
  | 'tool.executing'
  | 'tool.executed'
  | 'tool.error'

/** MCP 事件回调 */
export type MCPEventCallback = (event: MCPEventType, data: any) => void

/** MCP 事件 */
export interface MCPEvent {
  type: MCPEventType
  serverId: string
  timestamp: number
  data: any
}
