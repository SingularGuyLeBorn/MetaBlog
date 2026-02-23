/**
 * 数据源统一配置
 * 
 * 原则：
 * 1. 整个项目只允许一个数据源：后端API
 * 2. 不允许任何硬编码的mock数据
 * 3. 内存只做临时存储，所有数据持久化到后端
 * 4. 空状态由UI处理，不从本地创建默认数据
 */

// 唯一数据源：后端API
export const DATA_SOURCE = 'api' as const

// API基础路径
export const API_BASE = '/api' as const

// API端点 - 与后端 vitepress.config.ts 保持一致
export const API_ENDPOINTS = {
  // Agents
  AGENTS: '/api/agents',                                    // GET / POST
  AGENT_DETAIL: (id: string) => `/api/agents/${id}`,        // GET
  AGENT_CREATE: '/api/agents',                              // POST
  AGENT_UPDATE: '/api/agents/update',                       // POST {id, ...updates}
  AGENT_DELETE: '/api/agents/delete',                       // POST {id}
  ACTIVE_AGENT: '/api/agents/active',                       // GET / POST
  AGENT_TRIGGER: '/api/agents/trigger',                     // POST {agentId, triggerId}
  
  // Skills
  SKILLS: '/api/skills',                                    // GET / POST
  SKILL_DETAIL: (id: string) => `/api/skills/${id}`,        // GET
  SKILL_CREATE: '/api/skills',                              // POST
  SKILL_UPDATE: '/api/skills/update',                       // POST {id, ...updates}
  SKILL_DELETE: '/api/skills/delete',                       // POST {id}
  
  // Sessions/Memory
  SESSIONS: '/api/sessions',
  SESSION_DETAIL: (id: string) => `/api/sessions/${id}`,
  MESSAGES: (sessionId: string) => `/api/sessions/${sessionId}/messages`,
  
  // Chat
  CHAT: '/api/chat',
  CHAT_STREAM: '/api/chat/stream',
  
  // Tools
  TOOLS: '/api/tools',
  TOOL_EXECUTE: (name: string) => `/api/tools/${name}/execute`,
  
  // Files
  FILES_READ: '/api/files/read',
  FILES_WRITE: '/api/files/write',
  FILES_LIST: '/api/files/list',
  FILES_DELETE: '/api/files/delete',
  
  // Articles
  ARTICLES: '/api/articles',
  ARTICLE_DETAIL: (id: string) => `/api/articles/${id}`,
  ARTICLE_SEARCH: '/api/articles/search',
} as const

// 请求配置
export const API_CONFIG = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
} as const

// 调试模式
export const DEBUG_API = false
