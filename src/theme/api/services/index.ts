/**
 * ============================================================================
 * 后端服务 - index
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/services
 */


export { aiService } from './aiService'
export { storage } from './storage'

// chatStorage - 具名导出避免与 agentStorage 冲突
export {
  clearCache as clearChatCache, createSession, deleteMessageGroup, deleteSession,
  getMessageGroups, getSession, getSessions, initializeStorage as initializeChatStorage, invalidateMessagesCache, invalidateSessionsCache, isApiAvailable as isChatApiAvailable,
  resetApiStatus as resetChatApiStatus, saveAllMessageGroups, saveMessageGroup,
  updateMessageGroup, updateSession
} from './chatStorage'

// agentStorage - 具名导出,使用别名避免冲突
export {
  clearCache as clearAgentCache, createAgent, createSkill, deleteAgent, deleteSkill, getActiveAgentId, getAgent, getAgents, getSkill, getSkills, initializeStorage as initializeAgentStorage, invalidateAgentsCache,
  invalidateSkillsCache,
  isApiAvailable as isAgentApiAvailable,
  resetApiStatus as resetAgentApiStatus, setActiveAgentId, updateAgent, updateSkill
} from './agentStorage'

// logger
export * from './logger'

// Skill Integrated Service (Claude Code 风格的 Skills + Tools 整合)
export {
  analyzePrompt, createSkillMetadata, skillIntegratedService
} from './skillIntegratedService'
export type {
  EnhancedStreamCallbacks, SkillActivationResult, SkillIntegratedConfig
} from './skillIntegratedService'

