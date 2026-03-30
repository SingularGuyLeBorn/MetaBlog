/**
 * AI Chat Services 入口
 */

export { aiService } from './aiService'
export { storage } from './storage'

// chatStorage - 具名导出避免与 agentStorage 冲突
export {
  getSessions,
  getSession,
  createSession,
  updateSession,
  deleteSession,
  getMessageGroups,
  saveMessageGroup,
  updateMessageGroup,
  deleteMessageGroup,
  saveAllMessageGroups,
  invalidateSessionsCache,
  invalidateMessagesCache,
  isApiAvailable as isChatApiAvailable,
  resetApiStatus as resetChatApiStatus,
  clearCache as clearChatCache,
  initializeStorage as initializeChatStorage,
} from './chatStorage'

// agentStorage - 具名导出，使用别名避免冲突
export {
  getAgents,
  getAgent,
  createAgent,
  updateAgent,
  deleteAgent,
  getActiveAgentId,
  setActiveAgentId,
  getSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  invalidateAgentsCache,
  invalidateSkillsCache,
  isApiAvailable as isAgentApiAvailable,
  resetApiStatus as resetAgentApiStatus,
  clearCache as clearAgentCache,
  initializeStorage as initializeAgentStorage,
} from './agentStorage'

// logger
export * from './logger'

// Skill Integrated Service (Claude Code 风格的 Skills + Tools 整合)
export { 
  skillIntegratedService,
  createSkillMetadata,
  analyzePrompt
} from './skillIntegratedService'
export type { 
  SkillIntegratedConfig,
  SkillActivationResult,
  EnhancedStreamCallbacks
} from './skillIntegratedService'
