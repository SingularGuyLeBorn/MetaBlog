/**
 * 工具系统统一入口 - 生产环境
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

// 平台解析工具
export {
  platformParserDefinitions,
  platformParserExecutors,
  parseZhihuExecutor,
  parseXiaohongshuExecutor,
  parseWechatExecutor,
  ocrImageExecutor
} from './platform-parsers'

// 为了向后兼容，保留原有导出
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
  formatText,
  readFile,
  writeFile,
  listFiles,
  webSearch,
  fetchUrl,
  // GitHub 工具
  githubGetRepo,
  githubListRepoContents,
  githubGetFileContent,
  githubSearchCode,
  githubGetCommitHistory,
  githubGetIssues,
  calculate,
  translateText,
  executeCode,
  analyzeCode,
  queryKnowledge,
  getWeather,
  createNote,
  listNotes
} from './executors-legacy'

// 保留原有定义导出（向后兼容）
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
  readFileDef,
  writeFileDef,
  listFilesDef,
  webSearchDef,
  fetchUrlDef,
  // GitHub 工具
  githubGetRepoDef,
  githubListRepoContentsDef,
  githubGetFileContentDef,
  githubSearchCodeDef,
  githubGetCommitHistoryDef,
  githubGetIssuesDef,
  calculateDef,
  translateTextDef,
  executeCodeDef,
  analyzeCodeDef,
  queryKnowledgeDef,
  getWeatherDef,
  createNoteDef,
  listNotesDef,
  allToolDefinitions
} from './definitions'

// 导入
import { registerTools } from './registry'
import * as definitions from './definitions'
import * as executors from './executors-legacy'
import { platformParserDefinitions, platformParserExecutors } from './platform-parsers'

/**
 * 初始化所有默认工具（向后兼容）
 * 在应用启动时调用，注册所有内置工具
 */
export function initializeDefaultTools(): void {
  const tools = [
    // 文章管理工具
    { name: 'get_article_content', definition: definitions.getArticleContentDef, executor: executors.getArticleContent },
    { name: 'search_articles', definition: definitions.searchArticlesDef, executor: executors.searchArticles },
    { name: 'list_articles', definition: definitions.listArticlesDef, executor: executors.listArticles },
    { name: 'create_article', definition: definitions.createArticleDef, executor: executors.createArticle },
    { name: 'update_article', definition: definitions.updateArticleDef, executor: executors.updateArticle },
    { name: 'delete_article', definition: definitions.deleteArticleDef, executor: executors.deleteArticle },
    
    // 文件管理工具
    { name: 'read_file', definition: definitions.readFileDef, executor: executors.readFile },
    { name: 'write_file', definition: definitions.writeFileDef, executor: executors.writeFile },
    { name: 'list_files', definition: definitions.listFilesDef, executor: executors.listFiles },
    
    // 网络工具
    { name: 'web_search', definition: definitions.webSearchDef, executor: executors.webSearch },
    { name: 'fetch_url', definition: definitions.fetchUrlDef, executor: executors.fetchUrl },
    
    // 计算与转换工具
    { name: 'calculate', definition: definitions.calculateDef, executor: executors.calculate },
    { name: 'translate_text', definition: definitions.translateTextDef, executor: executors.translateText },
    { name: 'summarize_text', definition: definitions.summarizeTextDef, executor: executors.summarizeText },
    { name: 'format_text', definition: definitions.formatTextDef, executor: executors.formatText },
    
    // 代码工具
    { name: 'execute_code', definition: definitions.executeCodeDef, executor: executors.executeCode },
    { name: 'analyze_code', definition: definitions.analyzeCodeDef, executor: executors.analyzeCode },
    
    // 知识与笔记工具
    { name: 'query_knowledge', definition: definitions.queryKnowledgeDef, executor: executors.queryKnowledge },
    { name: 'create_note', definition: definitions.createNoteDef, executor: executors.createNote },
    { name: 'list_notes', definition: definitions.listNotesDef, executor: executors.listNotes },
    
    // GitHub 工具
    { name: 'github_get_repo', definition: definitions.githubGetRepoDef, executor: executors.githubGetRepo },
    { name: 'github_list_repo_contents', definition: definitions.githubListRepoContentsDef, executor: executors.githubListRepoContents },
    { name: 'github_get_file_content', definition: definitions.githubGetFileContentDef, executor: executors.githubGetFileContent },
    { name: 'github_search_code', definition: definitions.githubSearchCodeDef, executor: executors.githubSearchCode },
    { name: 'github_get_commit_history', definition: definitions.githubGetCommitHistoryDef, executor: executors.githubGetCommitHistory },
    { name: 'github_get_issues', definition: definitions.githubGetIssuesDef, executor: executors.githubGetIssues },
    
    // 其他工具
    { name: 'get_current_time', definition: definitions.getCurrentTimeDef, executor: executors.getCurrentTime },
    { name: 'get_weather', definition: definitions.getWeatherDef, executor: executors.getWeather },
    { name: 'test_echo', definition: definitions.testEchoDef, executor: executors.testEcho },
    
    // 平台解析工具
    { name: 'parse_zhihu', definition: platformParserDefinitions[0], executor: platformParserExecutors.parse_zhihu },
    { name: 'parse_xiaohongshu', definition: platformParserDefinitions[1], executor: platformParserExecutors.parse_xiaohongshu },
    { name: 'parse_wechat', definition: platformParserDefinitions[2], executor: platformParserExecutors.parse_wechat },
    { name: 'ocr_image', definition: platformParserDefinitions[3], executor: platformParserExecutors.ocr_image }
  ]
  
  registerTools(tools)
  
  console.log(`[ToolSystem] ${tools.length} 个工具已初始化`)
}

// 自动初始化（如果在浏览器环境）
if (typeof window !== 'undefined') {
  initializeDefaultTools()
}
