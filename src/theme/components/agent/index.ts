/**
 * ============================================================================
 * 组件逻辑 - index
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/components
 */


// Vue Components
export { default as AgentAdmin } from './AgentAdmin.vue'
export { default as AgentCard } from './AgentCard.vue'
export { default as AgentChatDialog } from './AgentChatDialog.vue'
export { default as AgentConfigPanel } from './AgentConfigPanel.vue'
export { default as AgentDashboard } from './AgentDashboard.vue'
export { default as AgentDetail } from './AgentDetail.vue'
export { default as AgentManager } from './AgentManager.vue'
export { default as ArticleManager } from './ArticleManager.vue'
export { default as FileManager } from './FileManager.vue'
export { default as GitManager } from './GitManager.vue'
export { default as LogViewer } from './LogViewer.vue'
export { default as MCPConfigPanel } from './MCPConfigPanel.vue'
export { default as MemoryManager } from './MemoryManager.vue'
export { default as ModelPanel } from './ModelPanel.vue'
export { default as RuntimePanel } from './RuntimePanel.vue'
export { default as SettingsPlaceholder } from './SettingsPlaceholder.vue'
export { default as SkillDetailModal } from './SkillDetailModal.vue'
export { default as SkillsManager } from './SkillsManager.vue'
export { default as SkillsPanel } from './SkillsPanel.vue'
export { default as SystemConsole } from './SystemConsole.vue'
export { default as TaskManager } from './TaskManager.vue'
export { default as TriggerPanel } from './TriggerPanel.vue'

// Agent Classes
export { ContentAgent, createContentAgent } from './agents/ContentAgent'
export { createStorageAgent, StorageAgent } from './agents/StorageAgent'
export { createMetaAgent, MetaAgent } from './orchestrator/MetaAgent'

// Note: MCP tools (url-fetcher, social-media-reader, file-operator, scheduler) 
// have been moved to server/mcp-tools/ as they use Node.js-only APIs (fs, etc.)

import { ContentAgent, ContentAgentConfig } from './agents/ContentAgent'
import { StorageAgent, StorageAgentConfig } from './agents/StorageAgent'
import { MetaAgent, MetaAgentConfig } from './orchestrator/MetaAgent'

/**
 * AgentSystemConfig 接口定义
 *
 */
export interface AgentSystemConfig {
  basePath: string
  contentAgent?: ContentAgentConfig
  storageAgent?: Partial<StorageAgentConfig>
  metaAgent?: Partial<MetaAgentConfig>
}

/**
 * AgentSystem 接口定义
 *
 */
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

/**
 * 创建AgentSystem
 *
 * @param config - 参数(AgentSystemConfig)
 * @returns 返回值(AgentSystem)
 */
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
