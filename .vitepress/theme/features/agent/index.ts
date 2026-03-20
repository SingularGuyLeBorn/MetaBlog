/**
 * Agent System - 统一入口
 * 
 * 使用示例:
 * 
 * ```typescript
 * import { createAgentSystem } from './agent-system'
 * 
 * const system = createAgentSystem({
 *   basePath: '/path/to/project'
 * })
 * 
 * // 处理用户发送的链接
 * await system.handleUrl('https://xiaohongshu.com/xxx', {
 *   section: 'social',
 *   autoPublish: false
 * })
 * 
 * // 创建定时工作流
 * const workflowId = system.createWorkflow({
 *   name: '每日小红书采集',
 *   source: {
 *     type: 'search',
 *     platforms: ['xiaohongshu'],
 *     searchQuery: 'AI 工具'
 *   },
 *   target: {
 *     section: 'social',
 *     autoPublish: false
 *   },
 *   schedule: {
 *     enabled: true,
 *     cron: '0 9 * * *'  // 每天9点
 *   }
 * })
 * 
 * // 启动离线托管
 * system.startHosting()
 * ```
 */

export { ContentAgent, createContentAgent } from './agents/ContentAgent'
export { StorageAgent, createStorageAgent } from './agents/StorageAgent'
export { MetaAgent, createMetaAgent } from './orchestrator/MetaAgent'

export { urlFetcher, URLFetcherTool } from './mcp-tools/url-fetcher'
export { socialMediaReader, SocialMediaReaderTool } from './mcp-tools/social-media-reader'
export { FileOperatorTool, createFileOperator } from './mcp-tools/file-operator'
export { scheduler, CronPresets, SchedulerTool } from './mcp-tools/scheduler'

import { MetaAgent, MetaAgentConfig } from './orchestrator/MetaAgent'
import { ContentAgent, ContentAgentConfig } from './agents/ContentAgent'
import { StorageAgent, StorageAgentConfig } from './agents/StorageAgent'

export interface AgentSystemConfig {
  basePath: string
  contentAgent?: ContentAgentConfig
  storageAgent?: Partial<StorageAgentConfig>
  metaAgent?: Partial<MetaAgentConfig>
}

export interface AgentSystem {
  metaAgent: MetaAgent
  contentAgent: ContentAgent
  storageAgent: StorageAgent
  
  // 快捷方法
  handleUrl: (url: string, options?: {
    section?: string
    platform?: string
    autoPublish?: boolean
  }) => Promise<any>
  
  createWorkflow: (workflow: any) => string
  executeWorkflow: (workflowId: string) => Promise<any>
  
  startHosting: () => void
  stopHosting: () => void
  
  getStatus: () => any
}

export function createAgentSystem(config: AgentSystemConfig): AgentSystem {
  // 创建 Agent 实例
  const contentAgent = new ContentAgent(config.contentAgent)
  
  const storageAgent = new StorageAgent({
    basePath: config.basePath,
    ...config.storageAgent,
  })
  
  const metaAgent = new MetaAgent({
    contentAgent,
    storageAgent,
    ...config.metaAgent,
  })

  return {
    metaAgent,
    contentAgent,
    storageAgent,
    
    // 快捷方法
    handleUrl: (url, options) => metaAgent.handleUrlCommand(url, options),
    createWorkflow: (workflow) => metaAgent.createWorkflow(workflow),
    executeWorkflow: (id) => metaAgent.executeWorkflow(id),
    startHosting: () => metaAgent.startHosting(),
    stopHosting: () => metaAgent.stopHosting(),
    getStatus: () => metaAgent.getStatus(),
  }
}

// 默认导出
export default {
  createAgentSystem,
}
