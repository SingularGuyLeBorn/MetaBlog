/**
 * MCP (Model Context Protocol) 系统
 * 
 * 提供标准化的外部工具调用接口，允许 AI 与外部服务交互
 * 参考规范: https://modelcontextprotocol.io/specification/
 * 
 * 功能：
 * - 支持 HTTP/SSE/Stdio 传输
 * - 预设配置快速接入（GitHub/GitLab/知乎/小红书等）
 * - 工具自动注册到 Agent 系统
 * - 连接状态管理
 */

// 导出类型
export type {
  MCPVersion,
  MCPTool,
  MCPResource,
  MCPPrompt,
  MCPServerConfig,
  MCPStdioConfig,
  MCPHttpConfig,
  MCPConnectionStatus,
  MCPServerState,
  MCPPreset,
  MCPStorageData,
  MCPJSONRPCRequest,
  MCPJSONRPCResponse,
  MCPCapabilities,
  MCPInitializeParams,
  MCPInitializeResult,
  MCPCallToolParams,
  MCPCallToolResult,
  MCPEvent,
  MCPEventType,
  MCPEventCallback
} from './types'

// 导出预设
export {
  codePlatformPresets,
  socialMediaPresets,
  devToolPresets,
  productivityPresets,
  allMCPPresets,
  getPresetsByCategory,
  getPresetById
} from './presets'

// 导出 Client
export { MCPClient, createMCPClient, type MCPClientOptions } from './client'

// 导出 Manager
export { MCPManager, mcpManager, initializeMCP } from './manager'

// ============================================
// 便捷函数
// ============================================

import { mcpManager } from './manager'
import { getPresetById } from './presets'
import type { MCPServerState, MCPPreset } from './types'

/**
 * 快速添加 GitHub MCP
 */
export async function addGitHubMCP(token: string): Promise<MCPServerState> {
  return mcpManager.addServerFromPreset('github-official', {
    GITHUB_PERSONAL_ACCESS_TOKEN: token
  })
}

/**
 * 快速添加 GitLab MCP
 */
export async function addGitLabMCP(token: string, url?: string): Promise<MCPServerState> {
  return mcpManager.addServerFromPreset('gitlab-official', {
    GITLAB_TOKEN: token,
    GITLAB_URL: url || 'https://gitlab.com'
  })
}

/**
 * 快速添加知乎 MCP
 */
export async function addZhihuMCP(cookie: string): Promise<MCPServerState> {
  return mcpManager.addServerFromPreset('zhihu-mcp', {
    ZHIHU_COOKIE: cookie
  })
}

/**
 * 快速添加小红书 MCP
 */
export async function addXiaohongshuMCP(cookie: string): Promise<MCPServerState> {
  return mcpManager.addServerFromPreset('xiaohongshu-mcp', {
    XIAOHONGSHU_COOKIE: cookie
  })
}

/**
 * 获取所有已连接的 MCP 工具
 */
export function getAllMCPTools() {
  return mcpManager.getAllToolDefinitions()
}

/**
 * 检查是否有指定平台的 MCP
 */
export function hasMCPForPlatform(platformId: string): boolean {
  return mcpManager.getAllServers().some(s => 
    s.config.id.startsWith(platformId) && s.status === 'connected'
  )
}

/**
 * 获取 MCP 系统统计
 */
export function getMCPStats() {
  const servers = mcpManager.getAllServers()
  const connected = mcpManager.getConnectedServers()
  
  return {
    total: servers.length,
    connected: connected.length,
    error: servers.filter(s => s.status === 'error').length,
    totalTools: connected.reduce((sum, s) => sum + s.tools.length, 0),
    platforms: connected.map(s => ({
      id: s.config.id,
      name: s.config.name,
      category: s.config.category,
      tools: s.tools.length
    }))
  }
}

// ============================================
// 初始化
// ============================================

import { initializeMCP as initMCP } from './manager'
import { allMCPPresets } from './presets'

/** 初始化 MCP 系统 */
export function initializeMCPServers(): void {
  initMCP()
  console.log('[MCP] 系统已初始化，可用预设:', allMCPPresets.length)
}

// 浏览器环境自动初始化
if (typeof window !== 'undefined') {
  initializeMCPServers()
}
