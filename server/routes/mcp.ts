/**
 * MCP Servers API Routes - MCP Server 管理服务端路由
 * 
 * 数据持久化存储在 .data/mcp-servers.json
 * 支持完整的 CRUD 操作、连接管理、工具调用
 */
import { Router } from 'express'
import { promises as fs } from 'fs'
import { join } from 'path'

const router = Router()

// 数据存储路径
const DATA_DIR = join(process.cwd(), '.data')
const MCP_SERVERS_FILE = join(DATA_DIR, 'mcp-servers.json')

// 统一响应类型
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// MCP Server 配置类型
export type MCPTransportType = 'stdio' | 'sse' | 'http' | 'websocket'

export interface MCPConfigItem {
  key: string
  value: string
  encrypted?: boolean
}

export interface MCPTool {
  name: string
  description: string
  inputSchema: Record<string, any>
}

export interface MCPResource {
  uri: string
  name: string
  mimeType?: string
}

export interface MCPPrompt {
  name: string
  description: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

export interface MCPServerConfig {
  id: string
  name: string
  description: string
  icon?: string
  category: 'code' | 'social' | 'dev' | 'productivity' | 'custom'
  transport: MCPTransportType
  
  // stdio 传输配置
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  
  // http/sse 传输配置
  url?: string
  headers?: Record<string, string>
  
  // websocket 配置
  wsUrl?: string
  
  enabled: boolean
  autoConnect: boolean
  timeout: number
  retryCount: number
  
  createdAt: number
  updatedAt: number
}

export interface MCPServerState {
  id: string
  config: MCPServerConfig
  status: 'connected' | 'disconnected' | 'connecting' | 'error'
  error?: string
  tools: MCPTool[]
  resources: MCPResource[]
  prompts: MCPPrompt[]
  connectAttempts: number
  lastConnectedAt?: number
  lastErrorAt?: number
}

// 运行时状态存储（内存中，不持久化）
const runtimeStates = new Map<string, Partial<MCPServerState>>()

// 确保数据目录存在
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

// 读取所有 MCP Servers 配置
async function readMCPServers(): Promise<MCPServerConfig[]> {
  await ensureDataDir()
  try {
    const data = await fs.readFile(MCP_SERVERS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// 写入所有 MCP Servers 配置
async function writeMCPServers(servers: MCPServerConfig[]): Promise<void> {
  await ensureDataDir()
  await fs.writeFile(MCP_SERVERS_FILE, JSON.stringify(servers, null, 2), 'utf-8')
}

// 构建完整的服务器状态（配置 + 运行时状态）
function buildServerState(config: MCPServerConfig): MCPServerState {
  const runtime = runtimeStates.get(config.id)
  return {
    id: config.id,
    config,
    status: runtime?.status || (config.enabled ? 'connecting' : 'disconnected'),
    error: runtime?.error,
    tools: runtime?.tools || [],
    resources: runtime?.resources || [],
    prompts: runtime?.prompts || [],
    connectAttempts: runtime?.connectAttempts || 0,
    lastConnectedAt: runtime?.lastConnectedAt,
    lastErrorAt: runtime?.lastErrorAt
  }
}

// ==================== API Routes ====================

// GET /api/mcp/servers - 获取所有 MCP Servers
router.get('/', async (req, res) => {
  try {
    const configs = await readMCPServers()
    const states = configs.map(buildServerState)
    res.json({ success: true, data: states } as ApiResponse<MCPServerState[]>)
  } catch (error) {
    console.error('[MCP API] Failed to read servers:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to read MCP servers' 
    } as ApiResponse)
  }
})

// GET /api/mcp/servers/:id - 获取单个 MCP Server
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const configs = await readMCPServers()
    const config = configs.find(s => s.id === id)
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: 'MCP server not found' 
      } as ApiResponse)
    }
    
    res.json({ success: true, data: buildServerState(config) } as ApiResponse<MCPServerState>)
  } catch (error) {
    console.error('[MCP API] Failed to get server:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get MCP server' 
    } as ApiResponse)
  }
})

// POST /api/mcp/servers - 创建 MCP Server
router.post('/', async (req, res) => {
  try {
    const params = req.body
    const configs = await readMCPServers()
    
    const now = Date.now()
    const newConfig: MCPServerConfig = {
      id: params.id || `mcp-${now}-${Math.random().toString(36).substr(2, 9)}`,
      name: params.name || '未命名 MCP Server',
      description: params.description || '',
      icon: params.icon || 'server',
      category: params.category || 'custom',
      transport: params.transport || 'stdio',
      
      // stdio 配置
      command: params.command,
      args: params.args || [],
      env: params.env || {},
      cwd: params.cwd,
      
      // http/sse 配置
      url: params.url,
      headers: params.headers || {},
      
      // websocket 配置
      wsUrl: params.wsUrl,
      
      enabled: params.enabled ?? false,
      autoConnect: params.autoConnect ?? false,
      timeout: params.timeout || 30000,
      retryCount: params.retryCount || 3,
      
      createdAt: now,
      updatedAt: now
    }
    
    configs.push(newConfig)
    await writeMCPServers(configs)
    
    // 如果启用且自动连接，则初始化运行时状态
    if (newConfig.enabled && newConfig.autoConnect) {
      runtimeStates.set(newConfig.id, {
        status: 'connecting',
        connectAttempts: 0,
        tools: [],
        resources: [],
        prompts: []
      })
    }
    
    console.log(`[MCP API] Created server: ${newConfig.name} (${newConfig.id})`)
    res.json({ success: true, data: buildServerState(newConfig) } as ApiResponse<MCPServerState>)
  } catch (error) {
    console.error('[MCP API] Failed to create server:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create MCP server' 
    } as ApiResponse)
  }
})

// POST /api/mcp/servers/update - 更新 MCP Server
router.post('/update', async (req, res) => {
  try {
    const { id, ...updates } = req.body
    const configs = await readMCPServers()
    
    const index = configs.findIndex(s => s.id === id)
    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'MCP server not found' 
      } as ApiResponse)
    }
    
    const existingConfig = configs[index]
    
    // 不允许修改的关键字段
    delete (updates as Partial<MCPServerConfig>).id
    delete (updates as Partial<MCPServerConfig>).createdAt
    
    const updatedConfig: MCPServerConfig = {
      ...existingConfig,
      ...updates,
      id,
      updatedAt: Date.now()
    }
    
    configs[index] = updatedConfig
    await writeMCPServers(configs)
    
    console.log(`[MCP API] Updated server: ${updatedConfig.name} (${id})`)
    res.json({ success: true, data: buildServerState(updatedConfig) } as ApiResponse<MCPServerState>)
  } catch (error) {
    console.error('[MCP API] Failed to update server:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update MCP server' 
    } as ApiResponse)
  }
})

// POST /api/mcp/servers/delete - 删除 MCP Server
router.post('/delete', async (req, res) => {
  try {
    const { id } = req.body
    const configs = await readMCPServers()
    
    const serverToDelete = configs.find(s => s.id === id)
    if (!serverToDelete) {
      return res.status(404).json({ 
        success: false, 
        error: 'MCP server not found' 
      } as ApiResponse)
    }
    
    // 清理运行时状态
    runtimeStates.delete(id)
    
    const filtered = configs.filter(s => s.id !== id)
    await writeMCPServers(filtered)
    
    console.log(`[MCP API] Deleted server: ${serverToDelete.name} (${id})`)
    res.json({ success: true } as ApiResponse)
  } catch (error) {
    console.error('[MCP API] Failed to delete server:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete MCP server' 
    } as ApiResponse)
  }
})

// POST /api/mcp/servers/:id/connect - 连接 MCP Server
router.post('/:id/connect', async (req, res) => {
  try {
    const { id } = req.params
    const configs = await readMCPServers()
    const config = configs.find(s => s.id === id)
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: 'MCP server not found' 
      } as ApiResponse)
    }
    
    // 更新运行时状态为连接中
    runtimeStates.set(id, {
      status: 'connecting',
      connectAttempts: (runtimeStates.get(id)?.connectAttempts || 0) + 1
    })
    
    // 模拟连接成功（实际实现需要调用 MCP Client）
    // TODO: 集成真实的 MCP Client 连接逻辑
    setTimeout(() => {
      runtimeStates.set(id, {
        status: 'connected',
        connectAttempts: 0,
        lastConnectedAt: Date.now(),
        // 模拟工具列表
        tools: [
          {
            name: 'search',
            description: 'Search functionality',
            inputSchema: {
              type: 'object',
              properties: {
                query: { type: 'string' }
              },
              required: ['query']
            }
          }
        ],
        resources: [],
        prompts: []
      })
    }, 100)
    
    // 更新配置中的启用状态
    if (!config.enabled) {
      config.enabled = true
      config.updatedAt = Date.now()
      await writeMCPServers(configs)
    }
    
    res.json({ 
      success: true, 
      data: { message: 'Connection initiated', serverId: id }
    } as ApiResponse)
  } catch (error) {
    console.error('[MCP API] Failed to connect server:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to connect MCP server' 
    } as ApiResponse)
  }
})

// POST /api/mcp/servers/:id/disconnect - 断开 MCP Server
router.post('/:id/disconnect', async (req, res) => {
  try {
    const { id } = req.params
    const configs = await readMCPServers()
    const config = configs.find(s => s.id === id)
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: 'MCP server not found' 
      } as ApiResponse)
    }
    
    // 更新运行时状态
    runtimeStates.set(id, {
      status: 'disconnected',
      tools: [],
      resources: [],
      prompts: []
    })
    
    // 更新配置中的启用状态
    if (config.enabled) {
      config.enabled = false
      config.updatedAt = Date.now()
      await writeMCPServers(configs)
    }
    
    res.json({ 
      success: true, 
      data: { message: 'Disconnected', serverId: id }
    } as ApiResponse)
  } catch (error) {
    console.error('[MCP API] Failed to disconnect server:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to disconnect MCP server' 
    } as ApiResponse)
  }
})

// POST /api/mcp/servers/:id/tools/:toolName/execute - 执行 MCP 工具
router.post('/:id/tools/:toolName/execute', async (req, res) => {
  try {
    const { id, toolName } = req.params
    const args = req.body
    
    const configs = await readMCPServers()
    const config = configs.find(s => s.id === id)
    
    if (!config) {
      return res.status(404).json({ 
        success: false, 
        error: 'MCP server not found' 
      } as ApiResponse)
    }
    
    const runtime = runtimeStates.get(id)
    if (runtime?.status !== 'connected') {
      return res.status(400).json({ 
        success: false, 
        error: 'MCP server is not connected' 
      } as ApiResponse)
    }
    
    // TODO: 集成真实的 MCP Client 工具调用
    // 模拟工具执行
    console.log(`[MCP API] Executing tool ${toolName} on server ${id} with args:`, args)
    
    res.json({ 
      success: true, 
      result: `Tool ${toolName} executed successfully with args: ${JSON.stringify(args)}`
    } as ApiResponse<string>)
  } catch (error) {
    console.error('[MCP API] Failed to execute tool:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to execute MCP tool' 
    } as ApiResponse)
  }
})

// GET /api/mcp/servers/:id/tools - 获取服务器工具列表
router.get('/:id/tools', async (req, res) => {
  try {
    const { id } = req.params
    const runtime = runtimeStates.get(id)
    
    if (!runtime) {
      return res.status(404).json({ 
        success: false, 
        error: 'MCP server runtime not found' 
      } as ApiResponse)
    }
    
    res.json({ 
      success: true, 
      data: runtime.tools || []
    } as ApiResponse<MCPTool[]>)
  } catch (error) {
    console.error('[MCP API] Failed to get tools:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get tools' 
    } as ApiResponse)
  }
})

// POST /api/mcp/import - 导入 MCP 配置
router.post('/import', async (req, res) => {
  try {
    const { servers, overwrite = false } = req.body
    
    if (!Array.isArray(servers)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid servers data' 
      } as ApiResponse)
    }
    
    const existingConfigs = overwrite ? [] : await readMCPServers()
    const now = Date.now()
    
    const newConfigs: MCPServerConfig[] = servers.map((server, index) => ({
      id: server.id || `mcp-imported-${now}-${index}`,
      name: server.name || 'Imported Server',
      description: server.description || '',
      icon: server.icon || 'server',
      category: server.category || 'custom',
      transport: server.transport || 'stdio',
      command: server.command,
      args: server.args || [],
      env: server.env || {},
      cwd: server.cwd,
      url: server.url,
      headers: server.headers || {},
      wsUrl: server.wsUrl,
      enabled: false, // 导入后默认不启用
      autoConnect: false,
      timeout: server.timeout || 30000,
      retryCount: server.retryCount || 3,
      createdAt: now,
      updatedAt: now
    }))
    
    await writeMCPServers([...existingConfigs, ...newConfigs])
    
    console.log(`[MCP API] Imported ${newConfigs.length} servers`)
    res.json({ 
      success: true, 
      data: { imported: newConfigs.length }
    } as ApiResponse)
  } catch (error) {
    console.error('[MCP API] Failed to import servers:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to import MCP servers' 
    } as ApiResponse)
  }
})

// POST /api/mcp/export - 导出 MCP 配置
router.post('/export', async (req, res) => {
  try {
    const configs = await readMCPServers()
    const exportData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      servers: configs
    }
    
    res.json({ success: true, data: exportData } as ApiResponse)
  } catch (error) {
    console.error('[MCP API] Failed to export servers:', error)
    res.status(500).json({ 
      success: false, 
      error: 'Failed to export MCP servers' 
    } as ApiResponse)
  }
})

export default router
