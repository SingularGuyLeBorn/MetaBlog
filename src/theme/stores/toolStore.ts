/**
 * ============================================================================
 * Pinia Store - toolStore
 * ============================================================================
 *
 * 工具生命周期 Store,管理 AI 消息中的工具调用链.
 *
 * 解决的问题：
 * 1. 工具调用状态分散在 message.metadata.thinkingSteps 中,难以追踪当前活跃工具
 * 2. 多工具并行时 UI 无法展示每个工具的独立进度
 * 3. 工具结果与消息存储耦合,ToolResultSidebar 难以获取数据
 *
 * 与 chatStore 的关系：
 * - chatStore 负责持久化 toolRecords 到消息中
 * - toolStore 负责维护工具调用的实时状态和链式关系
 * - 流式结束后,toolStore 的数据可用于构建 ToolResultSidebar 的展示
 *
 * @module src/theme/stores
 */

import { addLog } from '@/theme/api/services/logger'
import type { DocumentLinkItem, SearchResultItem, ToolChain, ToolChainItem, ToolResultView } from '@/theme/types'
import { computed, reactive, ref } from 'vue'

// ==================== 状态 ====================

/** 按 "sessionId:groupId" 存储工具链 */
const toolChains = reactive<Record<string, ToolChain>>({})

/** 当前激活的工具链 key */
const activeChainKey = ref<string | null>(null)

/** 当前在 ToolResultSidebar 中查看的工具ID */
const inspectedToolId = ref<string | null>(null)

// ==================== 辅助函数 ====================

function buildChainKey(sessionId: string, groupId: string): string {
  return `${sessionId}:${groupId}`
}

function createToolChain(sessionId: string, groupId: string): ToolChain {
  return {
    groupId,
    sessionId,
    items: [],
    activeItemId: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

function getOrCreateChain(sessionId: string, groupId: string): ToolChain {
  const key = buildChainKey(sessionId, groupId)
  if (!toolChains[key]) {
    toolChains[key] = createToolChain(sessionId, groupId)
  }
  return toolChains[key]
}

// ==================== 核心逻辑 ====================

/**
 * 开始一个工具调用
 */
function startToolCall(
  sessionId: string,
  groupId: string,
  params: {
    id: string
    stepId: string
    name: string
    arguments: Record<string, any>
    round: number
    index: number
  }
): ToolChainItem {
  const chain = getOrCreateChain(sessionId, groupId)

  const item: ToolChainItem = {
    id: params.id,
    stepId: params.stepId,
    name: params.name,
    arguments: params.arguments,
    status: 'calling',
    startTime: Date.now(),
    round: params.round,
    index: params.index
  }

  chain.items.push(item)
  chain.activeItemId = item.id
  chain.updatedAt = Date.now()
  activeChainKey.value = buildChainKey(sessionId, groupId)

  addLog({
    level: 'debug',
    category: 'tool',
    event: 'tool_call_start',
    message: `工具调用开始: ${params.name}`,
    sessionId,
    data: { toolName: params.name, toolId: params.id, round: params.round }
  })

  return item
}

/**
 * 更新工具调用状态(进入 running 或更新进度)
 */
function updateToolCall(
  sessionId: string,
  groupId: string,
  toolId: string,
  updates: Partial<Pick<ToolChainItem, 'status' | 'progressText' | 'result'>>
): ToolChainItem | null {
  const chain = toolChains[buildChainKey(sessionId, groupId)]
  if (!chain) return null

  const item = chain.items.find(i => i.id === toolId)
  if (!item) return null

  Object.assign(item, updates)
  chain.updatedAt = Date.now()

  if (updates.status === 'running') {
    chain.activeItemId = item.id
  }

  return item
}

/**
 * 标记工具调用成功完成
 */
function completeToolCall(
  sessionId: string,
  groupId: string,
  toolId: string,
  result: any
): ToolChainItem | null {
  const chain = toolChains[buildChainKey(sessionId, groupId)]
  if (!chain) return null

  const item = chain.items.find(i => i.id === toolId)
  if (!item) return null

  item.status = 'success'
  item.result = result
  item.endTime = Date.now()
  item.duration = item.endTime - item.startTime
  chain.updatedAt = Date.now()

  addLog({
    level: 'debug',
    category: 'tool',
    event: 'tool_call_complete',
    message: `工具调用完成: ${item.name}`,
    sessionId,
    data: { toolName: item.name, toolId, duration: item.duration }
  })

  return item
}

/**
 * 标记工具调用失败
 */
function errorToolCall(
  sessionId: string,
  groupId: string,
  toolId: string,
  error: string
): ToolChainItem | null {
  const chain = toolChains[buildChainKey(sessionId, groupId)]
  if (!chain) return null

  const item = chain.items.find(i => i.id === toolId)
  if (!item) return null

  item.status = 'error'
  item.error = error
  item.endTime = Date.now()
  item.duration = item.endTime - item.startTime
  chain.updatedAt = Date.now()

  addLog({
    level: 'error',
    category: 'tool',
    event: 'tool_call_error',
    message: `工具调用失败: ${item.name} - ${error}`,
    sessionId,
    data: { toolName: item.name, toolId, error }
  })

  return item
}

/**
 * 清空指定消息组的工具链
 */
function clearToolChain(sessionId: string, groupId: string): void {
  const key = buildChainKey(sessionId, groupId)
  delete toolChains[key]
  if (activeChainKey.value === key) {
    activeChainKey.value = null
    inspectedToolId.value = null
  }
}

/**
 * 清空整个会话的工具链
 */
function clearSessionToolChains(sessionId: string): void {
  Object.keys(toolChains).forEach(key => {
    if (key.startsWith(`${sessionId}:`)) {
      delete toolChains[key]
    }
  })
  if (activeChainKey.value?.startsWith(`${sessionId}:`)) {
    activeChainKey.value = null
    inspectedToolId.value = null
  }
}

// ==================== ToolResultSidebar 相关 ====================

/**
 * 设置当前查看的工具ID
 */
function inspectTool(toolId: string | null): void {
  inspectedToolId.value = toolId
}

/**
 * 从工具结果中提取搜索结果
 */
function extractSearchResults(result: any): SearchResultItem[] {
  if (!result) return []

  // 处理 webSearch 等搜索工具的返回格式
  const data = typeof result === 'string' ? tryParseJson(result) : result
  if (!data) return []

  // 常见搜索返回格式 1: { success: true, data: { results: [...] } }
  if (data.success && Array.isArray(data.data?.results)) {
    return data.data.results.map((r: any) => ({
      title: r.title || '无标题',
      snippet: r.snippet || r.description || r.summary || '',
      url: r.url || r.link || '',
      domain: r.domain || extractDomain(r.url || r.link),
      source: r.source || extractDomain(r.url || r.link)
    }))
  }

  // 常见搜索返回格式 2: { success: true, data: [...] }
  if (data.success && Array.isArray(data.data)) {
    return data.data.map((r: any) => ({
      title: r.title || '无标题',
      snippet: r.snippet || r.description || r.summary || r.content?.substring(0, 200) || '',
      url: r.url || r.link || '',
      domain: r.domain || extractDomain(r.url || r.link),
      source: r.source || extractDomain(r.url || r.link)
    }))
  }

  // 常见搜索返回格式 3: 直接是数组
  if (Array.isArray(data)) {
    return data.map((r: any) => ({
      title: r.title || '无标题',
      snippet: r.snippet || r.description || r.summary || '',
      url: r.url || r.link || '',
      domain: r.domain || extractDomain(r.url || r.link),
      source: r.source || extractDomain(r.url || r.link)
    }))
  }

  return []
}

/**
 * 从工具结果中提取文档链接
 */
function extractDocumentLinks(result: any): DocumentLinkItem[] {
  if (!result) return []

  const data = typeof result === 'string' ? tryParseJson(result) : result
  if (!data) return []

  const links: DocumentLinkItem[] = []
  const results = data.success ? data.data : data

  // 递归扫描对象中的所有 URL 字段
  scanForUrls(results, links)

  return links
}

/**
 * 从工具结果构建 ToolResultView
 */
function buildToolResultView(item: ToolChainItem): ToolResultView | null {
  if (!item.result) return null

  const result = typeof item.result === 'string' ? tryParseJson(item.result) : item.result

  // 搜索工具
  const searchResults = extractSearchResults(result)
  if (searchResults.length > 0) {
    return { type: 'search', results: searchResults }
  }

  // 文档链接
  const docLinks = extractDocumentLinks(result)
  if (docLinks.length > 0) {
    return { type: 'documents', links: docLinks }
  }

  // 代码执行
  if (item.name.includes('code') || item.name.includes('python') || item.name.includes('execute')) {
    return {
      type: 'code',
      execution: {
        code: item.arguments?.code || item.arguments?.script || '',
        language: item.arguments?.language || 'python',
        stdout: result?.stdout || result?.output || result?.data?.output || '',
        stderr: result?.stderr || result?.error || '',
        exitCode: result?.exitCode ?? result?.exit_code ?? 0
      }
    }
  }

  // 通用
  return { type: 'generic', data: result }
}

// ==================== 辅助函数 ====================

function tryParseJson(str: string): any {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function extractDomain(url: string | undefined): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return undefined
  }
}

function scanForUrls(obj: any, links: DocumentLinkItem[], depth = 0): void {
  if (depth > 5) return
  if (!obj || typeof obj !== 'object') return

  if (Array.isArray(obj)) {
    obj.forEach(item => scanForUrls(item, links, depth + 1))
    return
  }

  // 检查当前对象是否是链接对象
  const url = obj.url || obj.link || obj.href || obj.web_url || obj.url_list?.[0]
  if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    const type = detectLinkType(url)
    // 去重
    if (!links.some(l => l.url === url)) {
      links.push({
        type,
        title: obj.title || obj.name || '未命名文档',
        url,
        icon: type === 'feishu' ? '📄' : type === 'yuque' ? '📖' : type === 'github' ? '🔗' : '📎',
        description: obj.description || obj.summary || obj.snippet || ''
      })
    }
  }

  // 递归扫描所有字段
  Object.values(obj).forEach(val => scanForUrls(val, links, depth + 1))
}

function detectLinkType(url: string): DocumentLinkItem['type'] {
  if (url.includes('feishu.cn') || url.includes('larksuite.com')) return 'feishu'
  if (url.includes('yuque.com')) return 'yuque'
  if (url.includes('github.com')) return 'github'
  if (url.includes('notion.so')) return 'notion'
  return 'generic'
}

// ==================== 查询 / Getter ====================

function getToolChain(sessionId: string, groupId: string): ToolChain | null {
  return toolChains[buildChainKey(sessionId, groupId)] || null
}

function getActiveToolItem(sessionId: string, groupId: string): ToolChainItem | null {
  const chain = getToolChain(sessionId, groupId)
  if (!chain || !chain.activeItemId) return null
  return chain.items.find(i => i.id === chain.activeItemId) || null
}

function getToolItem(sessionId: string, groupId: string, toolId: string): ToolChainItem | null {
  const chain = getToolChain(sessionId, groupId)
  if (!chain) return null
  return chain.items.find(i => i.id === toolId) || null
}

function getRunningToolItems(sessionId: string, groupId: string): ToolChainItem[] {
  const chain = getToolChain(sessionId, groupId)
  if (!chain) return []
  return chain.items.filter(i => i.status === 'running' || i.status === 'calling')
}

function getCompletedToolItems(sessionId: string, groupId: string): ToolChainItem[] {
  const chain = getToolChain(sessionId, groupId)
  if (!chain) return []
  return chain.items.filter(i => i.status === 'success' || i.status === 'error')
}

// ==================== 导出 ====================

export function useToolStore() {
  return {
    // 状态(只读)
    toolChains: computed(() => toolChains),
    activeChainKey: computed(() => activeChainKey.value),
    inspectedToolId: computed(() => inspectedToolId.value),

    // 核心操作
    startToolCall,
    updateToolCall,
    completeToolCall,
    errorToolCall,
    clearToolChain,
    clearSessionToolChains,

    // Sidebar 相关
    inspectTool,
    extractSearchResults,
    extractDocumentLinks,
    buildToolResultView,

    // 查询
    getToolChain,
    getActiveToolItem,
    getToolItem,
    getRunningToolItems,
    getCompletedToolItems
  }
}
