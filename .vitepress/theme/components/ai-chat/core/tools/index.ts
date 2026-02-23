/**
 * 工具系统统一入口
 * 
 * 提供工具注册、执行、查询等功能的统一导出
 */

// 类型导出
export type {
  ToolDefinition,
  ToolCall,
  ToolExecutor,
  ToolRegistration,
  ToolCallRecord,
  ThinkingStep
} from './types'

// 注册表功能导出
export {
  registerTool,
  registerTools,
  getTool,
  hasTool,
  executeTool,
  executeToolWithRecord,
  getToolDefinitions,
  getRegisteredToolNames,
  getToolCount,
  unregisterTool,
  clearTools
} from './registry'

// 工具定义导出
export {
  getArticleContentDef,
  searchArticlesDef,
  listArticlesDef,
  createArticleDef,
  updateArticleDef,
  deleteArticleDef,
  getCurrentTimeDef,
  testEchoDef,
  summarizeTextDef,
  formatTextDef,
  allToolDefinitions
} from './definitions'

// 执行器导出
export {
  getArticleContent,
  searchArticles,
  listArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getCurrentTime,
  testEcho,
  summarizeText,
  formatText
} from './executors'

import { registerTools } from './registry'
import * as definitions from './definitions'
import * as executors from './executors'

/**
 * 初始化所有默认工具
 * 在应用启动时调用，注册所有内置工具
 */
export function initializeDefaultTools(): void {
  const tools = [
    { name: 'get_article_content', definition: definitions.getArticleContentDef, executor: executors.getArticleContent },
    { name: 'search_articles', definition: definitions.searchArticlesDef, executor: executors.searchArticles },
    { name: 'list_articles', definition: definitions.listArticlesDef, executor: executors.listArticles },
    { name: 'create_article', definition: definitions.createArticleDef, executor: executors.createArticle },
    { name: 'update_article', definition: definitions.updateArticleDef, executor: executors.updateArticle },
    { name: 'delete_article', definition: definitions.deleteArticleDef, executor: executors.deleteArticle },
    { name: 'get_current_time', definition: definitions.getCurrentTimeDef, executor: executors.getCurrentTime },
    { name: 'test_echo', definition: definitions.testEchoDef, executor: executors.testEcho },
    { name: 'summarize_text', definition: definitions.summarizeTextDef, executor: executors.summarizeText },
    { name: 'format_text', definition: definitions.formatTextDef, executor: executors.formatText }
  ]
  
  registerTools(tools)
  
  console.log(`[ToolSystem] ${tools.length} 个工具已初始化`)
}

// 自动初始化（如果在浏览器环境）
if (typeof window !== 'undefined') {
  initializeDefaultTools()
}
