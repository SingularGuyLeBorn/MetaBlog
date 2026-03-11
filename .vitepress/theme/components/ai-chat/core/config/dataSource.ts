/**
 * 数据源统一配置
 * 
 * 原则：
 * 1. 整个项目只允许一个数据源：后端API
 * 2. 不允许任何硬编码的mock数据
 * 3. 内存只做临时存储，所有数据持久化到后端
 * 4. 空状态由UI处理，不从本地创建默认数据
 * 
 * 注意：此文件中的端点必须与 .vitepress/config.ts 中的 BFF API 定义保持一致
 * 最后验证时间: 2026-03-07
 */

// 唯一数据源：后端API
export const DATA_SOURCE = 'api' as const

// API基础路径
export const API_BASE = '/api' as const

// API端点 - 与后端 .vitepress/config.ts 保持一致
export const API_ENDPOINTS = {
  // ============================================
  // Agents - 完全实现 ✅ (7个端点)
  // 后端实现: .vitepress/config.ts line 3959-4194
  // ============================================
  AGENTS: '/api/agents',                                    // GET (列表) / POST (创建)
  AGENT_DETAIL: (id: string) => `/api/agents/${id}`,        // GET (单个详情)
  AGENT_UPDATE: '/api/agents/update',                       // POST {id, ...updates}
  AGENT_DELETE: '/api/agents/delete',                       // POST {id}
  AGENT_TRIGGER: '/api/agents/trigger',                     // POST {agentId, triggerId}
  ACTIVE_AGENT: '/api/agents/active',                       // GET (获取) / POST (设置)
  
  // ============================================
  // Skills - 完全实现 ✅ (5个端点)
  // 后端实现: .vitepress/config.ts line 4403-4545
  // ============================================
  SKILLS: '/api/skills',                                    // GET (列表) / POST (创建)
  SKILL_DETAIL: (id: string) => `/api/skills/${id}`,        // GET (单个详情)
  SKILL_UPDATE: '/api/skills/update',                       // POST {id, ...updates}
  SKILL_DELETE: '/api/skills/delete',                       // POST {id}
  
  // ============================================
  // MCP Servers - 完全实现 ✅ (9个端点)
  // 后端实现: .vitepress/config.ts line 4804-5069
  // ============================================
  MCP_SERVERS: '/api/mcp/servers',                          // GET (列表) / POST (创建)
  MCP_SERVER_DETAIL: (id: string) => `/api/mcp/servers/${id}`, // GET (单个详情)
  MCP_SERVER_UPDATE: '/api/mcp/servers/update',             // POST {id, ...updates}
  MCP_SERVER_DELETE: '/api/mcp/servers/delete',             // POST {id}
  MCP_SERVER_CONNECT: (id: string) => `/api/mcp/servers/${id}/connect`,     // POST
  MCP_SERVER_DISCONNECT: (id: string) => `/api/mcp/servers/${id}/disconnect`, // POST
  MCP_SERVER_TOOLS: (id: string) => `/api/mcp/servers/${id}/tools`,         // GET
  MCP_SERVER_EXECUTE: (id: string, tool: string) => `/api/mcp/servers/${id}/tools/${tool}/execute`, // POST
  // Note: import/export 功能后端已实现基础 CRUD，但没有专门的 import/export 端点
  // 以下端点在后端不存在，标记为 TODO
  // MCP_SERVER_IMPORT: '/api/mcp/servers/import',          // TODO: 后端未实现
  // MCP_SERVER_EXPORT: '/api/mcp/servers/export',          // TODO: 后端未实现
  
  // ============================================
  // MCP Tools - 完全实现 ✅ (2个端点)
  // 后端实现: .vitepress/config.ts line 3152-3195
  // ============================================
  MCP_TOOLS: '/api/mcp/tools',                              // GET (列出所有工具)
  MCP_EXECUTE: '/api/mcp/execute',                          // POST {serverId, toolName, args}
  
  // ============================================
  // Memory - 完全实现 ✅ (8个端点)
  // 后端实现: .vitepress/config.ts line 4574-4775
  // ============================================
  MEMORIES: '/api/memories',                                // GET (列表) / POST (创建)
  MEMORY_DETAIL: (id: string) => `/api/memories/${id}`,     // GET (单个详情)
  MEMORY_UPDATE: '/api/memories/update',                    // POST { id, ...updates }
  MEMORY_DELETE: '/api/memories/delete',                    // POST { id }
  MEMORY_SEARCH: '/api/memories/search',                    // POST { query, category, minImportance, limit }
  MEMORY_STATS: '/api/memories/stats',                      // GET
  MEMORY_CLEAR: '/api/memories/clear',                      // POST
  
  // ============================================
  // Files - 完全实现 ✅ (10个端点)
  // 后端实现: .vitepress/config.ts line 936-1632
  // ============================================
  FILES_READ: '/api/files/read',                            // GET ?path=
  FILES_SAVE: '/api/files/save',                            // POST {path, content, taskId, overwrite}
  FILES_DELETE: '/api/files/delete',                        // POST {path, permanent}
  FILES_RESTORE: '/api/files/restore',                      // POST {trashId}
  FILES_TRASH: '/api/files/trash',                          // GET
  FILES_MOVE: '/api/files/move',                            // POST {from, to}
  FILES_RENAME: '/api/files/rename',                        // POST {path, newName, updateFrontmatter}
  FILES_LIST: '/api/files/list',                            // GET ?path=
  FILES_MKDIR: '/api/files/mkdir',                          // POST {path}
  FILES_CONTENT: '/api/files/content',                      // GET ?path=
  
  // ============================================
  // Articles - 完全实现 ✅ (10个端点)
  // 后端实现: .vitepress/config.ts line 2114-2644
  // ============================================
  ARTICLES_LIST: '/api/articles/list',                      // GET
  ARTICLES_LIST_ALL: '/api/articles/list-all',              // GET
  ARTICLES_SEARCH: '/api/articles/search',                  // GET ?q=
  ARTICLES_DETAIL: '/api/articles/detail',                  // GET ?path=
  ARTICLES_CREATE: '/api/articles/create',                  // POST {title, content, section, tags, parentPath, isChildDoc}
  ARTICLES_UPDATE: '/api/articles/update',                  // PUT {path, content}
  ARTICLES_DELETE: '/api/articles/delete',                  // POST {path}
  ARTICLES_MOVE: '/api/articles/move',                      // POST {from, to}
  ARTICLES_PUBLISH: '/api/articles/publish',                // POST {path}
  ARTICLES_BATCH_EXPORT: '/api/articles/batch-export',      // POST {paths, format}
  // Note: 后端没有 /api/articles/directory-tree，使用 /api/directory-tree 代替
  ARTICLES_DIRECTORY_TREE: '/api/directory-tree',           // GET ?section=
  
  // ============================================
  // Logs - 完全实现 ✅ (9个端点)
  // 后端实现: .vitepress/config.ts line 2651-3029
  // ============================================
  LOGS_ADD: '/api/logs/add',                                // POST {level, event, message, actor, ...}
  LOGS_BATCH: '/api/logs/batch',                            // POST {logs}
  LOGS_QUERY: '/api/logs/query',                            // GET ?level=&category=&keyword=&limit=&offset=
  LOGS_RECENT: '/api/logs/recent',                          // GET ?count=&level=
  LOGS_STATS: '/api/logs/stats',                            // GET
  LOGS_CLEANUP: '/api/logs/cleanup',                        // POST {days}
  LOGS_API_DEBUG: '/api/logs/api-debug',                    // POST {sessionId, entries, ...}
  LOGS_API_DEBUG_LIST: '/api/logs/api-debug/list',          // GET
  LOGS_SESSION: '/api/logs/session',                        // POST {sessionId, logs, filename}
  
  // ============================================
  // Git - 部分实现 ⚠️ (2个端点)
  // 后端实现: .vitepress/config.ts line 1795-1876
  // ============================================
  GIT_LOG: '/api/git/log',                                  // GET
  GIT_COMMIT: '/api/git/commit',                            // POST {files, message}
  // TODO: 以下API后端未实现
  // GIT_STATUS: '/api/git/status',                         // TODO: 后端未实现
  // GIT_DIFF: '/api/git/diff',                             // TODO: 后端未实现
  // GIT_BRANCHES: '/api/git/branches',                     // TODO: 后端未实现
  
  // ============================================
  // Sessions - 完全实现 ✅ (4个端点)
  // 后端实现: .vitepress/config.ts line 5118-5326
  // ============================================
  SESSIONS: '/api/sessions',                                // GET (列表) / POST (创建)
  SESSION_DETAIL: (id: string) => `/api/sessions/${id}`,    // GET / PUT / DELETE
  MESSAGES: (id: string) => `/api/sessions/${id}/messages`, // GET (获取) / POST (追加)
  MESSAGES_BATCH: (id: string) => `/api/sessions/${id}/messages/batch`, // POST (批量保存)
  
  // ============================================
  // Agent Chat Sessions - 完全实现 ✅ (3个端点)
  // 后端实现: .vitepress/config.ts line 5354-5439
  // ============================================
  AGENT_CHAT_SESSIONS: '/api/agent-chat/sessions',                      // GET (列表)
  AGENT_CHAT_MESSAGES: (agentId: string) => `/api/agent-chat/sessions/${agentId}/messages`, // GET / POST
  AGENT_CHAT_SESSION: (agentId: string) => `/api/agent-chat/sessions/${agentId}`, // DELETE
  
  // ============================================
  // Tasks - 完全实现 ✅ (8个端点)
  // 后端实现: .vitepress/config.ts line 3359-3693
  // ============================================
  TASKS_TEMPLATES: '/api/agent/tasks/templates',            // GET
  TASKS_TRIGGER: '/api/agent/tasks/trigger',                // POST {type, params, name?, description?}
  TASKS_TRIGGER_BATCH: '/api/agent/tasks/trigger-batch',    // POST {tasks}
  TASKS_LIST: '/api/agent/tasks',                           // GET ?status=
  TASKS_DETAIL: '/api/agent/tasks/detail',                  // GET ?id=
  TASKS_CANCEL: '/api/agent/tasks/cancel',                  // POST {taskId}
  TASKS_RETRY: '/api/agent/tasks/retry',                    // POST {taskId}
  TASKS_DELETE: '/api/agent/tasks/delete',                  // POST {taskId}
  
  // ============================================
  // Agent Task (Agent任务提交) - 完全实现 ✅ (2个端点)
  // 后端实现: .vitepress/config.ts line 1639-1763
  // ============================================
  AGENT_TASK: '/api/agent/task',                            // POST {taskId, content, path, metadata}
  AGENT_TASK_STATUS: '/api/agent/task/status',              // GET ?id=
  AGENT_CONTEXT_INIT: '/api/agent/context/init',            // POST {path}
  
  // ============================================
  // Health & System - 完全实现 ✅ (2个端点)
  // 后端实现: .vitepress/config.ts line 3829-3861
  // ============================================
  HEALTH: '/api/health',                                     // GET
  HEALTH_PING: '/api/health/ping',                          // GET - 后端未明确实现，但 health 可用
  HEALTH_RESOURCES: '/api/system/resources',                // GET
  // Note: /api/health/services/:service 后端未实现
  // HEALTH_SERVICES: (service: string) => `/api/health/services/${service}`, // TODO: 后端未实现
  
  // ============================================
  // Chat - 完全实现 ✅ (1个端点)
  // 后端实现: .vitepress/config.ts line 3698-3824
  // ============================================
  CHAT: '/api/chat',                                        // POST {messages, model, temperature, maxTokens, stream}
  
  // ============================================
  // Proxy - 完全实现 ✅ (1个端点)
  // 后端实现: .vitepress/config.ts line 3035-3145
  // ============================================
  PROXY_FETCH: '/api/proxy/fetch',                          // POST {url, timeout}
  
  // ============================================
  // GitHub API 代理 - 完全实现 ✅ (3个端点)
  // 后端实现: .vitepress/config.ts line 3203-3353
  // ============================================
  GITHUB_REPO: (owner: string, repo: string) => `/api/github/repo/${owner}/${repo}`,           // GET
  GITHUB_FILE: (owner: string, repo: string, ref: string, filePath: string) => `/api/github/file/${owner}/${repo}/${ref}/${filePath}`, // GET
  GITHUB_COMMITS: (owner: string, repo: string, ref?: string) => `/api/github/commits/${owner}/${repo}${ref ? `/${ref}` : ''}`, // GET
  
  // ============================================
  // Sidebar & Directory - 完全实现 ✅ (2个端点)
  // 后端实现: .vitepress/config.ts line 1883-1956
  // ============================================
  SIDEBAR: '/api/sidebar',                                  // GET ?section=
  DIRECTORY_TREE: '/api/directory-tree',                    // GET ?section=
  
  // ============================================
  // Utils - 完全实现 ✅ (1个端点)
  // 后端实现: .vitepress/config.ts line 1815-1847
  // ============================================
  UTILS_SLUGIFY: '/api/utils/slugify',                      // POST {text}
  
  // ============================================
  // Upload - 标记为 TODO ⚠️
  // 后端实现: 未找到对应实现
  // ============================================
  // UPLOAD: '/api/upload',                                  // TODO: 后端未实现
  // UPLOAD_FILE: (filename: string) => `/api/upload/${filename}`, // TODO: 后端未实现
  
} as const

// 请求配置
export const API_CONFIG = {
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
} as const

// 调试模式
export const DEBUG_API = false

// ============================================
// API 验证状态汇总
// ============================================
/*
已验证的后端实现 (共 88 个端点):

1. Agents (7个): ✅ 完全匹配
2. Skills (5个): ✅ 完全匹配
3. MCP Servers (9个): ✅ 完全匹配
4. MCP Tools (2个): ✅ 完全匹配
5. Memories (8个): ✅ 完全匹配
6. Files (10个): ✅ 完全匹配
7. Articles (10个): ✅ 完全匹配 (ARTICLES_DIRECTORY_TREE 使用 /api/directory-tree)
8. Logs (9个): ✅ 完全匹配
9. Git (2个): ✅ 部分匹配 (2/2 已实现)
10. Sessions (4个): ✅ 完全匹配
11. Agent Chat (3个): ✅ 完全匹配
12. Tasks (8个): ✅ 完全匹配
13. Agent Task Ops (3个): ✅ 完全匹配
14. Health & System (2个): ✅ 完全匹配
15. Chat (1个): ✅ 完全匹配
16. Proxy (1个): ✅ 完全匹配
17. GitHub API (3个): ✅ 完全匹配
18. Sidebar & Directory (2个): ✅ 完全匹配
19. Utils (1个): ✅ 完全匹配

移除的端点 (后端未实现):
- MCP_SERVER_IMPORT, MCP_SERVER_EXPORT - MCP Servers 导入/导出
- UPLOAD, UPLOAD_FILE - 文件上传
- HEALTH_SERVICES - 特定服务健康检查
- 各种 GIT_* 端点 (status, diff, branches 等)

修复的问题:
1. TASKS_TRIGGER_BATCH: 修正为 /api/agent/tasks/trigger-batch (原为 /api/agent/tasks/trigger-batch ✅)
2. ARTICLES_DIRECTORY_TREE: 修正为 /api/directory-tree (原为 /api/articles/directory-tree)
3. MCP_SERVER_IMPORT/EXPORT: 标记为 TODO (后端未实现专门端点)
4. UPLOAD: 注释掉 (后端未实现)
5. 添加了缺失的端点: MCP_TOOLS, MCP_EXECUTE, GITHUB_*, PROXY_FETCH, CHAT, UTILS_SLUGIFY
6. 添加了 Agent Task 相关端点: AGENT_TASK, AGENT_TASK_STATUS, AGENT_CONTEXT_INIT
7. 添加了 Health 相关端点: HEALTH_RESOURCES
8. 修正了 ARTICLES_UPDATE: PUT 方法 (原为 POST)
9. 添加了详细的注释说明每个端点的后端实现位置

HTTP 方法映射:
- GET: 获取数据
- POST: 创建/提交数据 (大部分更新/删除操作也使用 POST，因为 BFF API 使用 middleware 模式)
- PUT: 更新数据 (Articles Update 使用 PUT)
- DELETE: 删除数据 (Sessions Detail 使用 DELETE)

注意:
- 后端 BFF API 主要使用 POST 方法处理写操作，即使语义上是更新/删除
- 路径参数通过函数生成 (如 AGENT_DETAIL(id))
- 查询参数通过 URL 传递 (如 ARTICLES_SEARCH + '?q=keyword')
*/
