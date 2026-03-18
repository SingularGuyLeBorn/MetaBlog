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
  ocrImageExecutor,
  parsePlatformLinkExecutor,
  processImageExecutor
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
  // ArXiv 工具
  fetchArxiv,
  searchArxiv,
  // OpenReview 工具
  fetchOpenReview,
  searchOpenReview,
  // Hugging Face 工具
  fetchHuggingFaceModel,
  searchHuggingFace,
  // GitHub 工具
  githubGetRepo,
  githubListRepoContents,
  githubGetFileContent,
  githubSearchCode,
  githubGetCommitHistory,
  githubGetIssues,
  // Knowledge Base 工具
  kbList,
  kbCreate,
  kbDelete,
  kbQuery,
  kbListDocuments,
  kbDocumentAdd,
  kbDocumentDelete,
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
  // ArXiv 工具
  fetchArxivDef,
  searchArxivDef,
  // OpenReview 工具
  fetchOpenReviewDef,
  searchOpenReviewDef,
  // Hugging Face 工具
  fetchHuggingFaceModelDef,
  searchHuggingFaceDef,
  // GitHub 工具
  githubGetRepoDef,
  githubListRepoContentsDef,
  githubGetFileContentDef,
  githubSearchCodeDef,
  githubGetCommitHistoryDef,
  githubGetIssuesDef,
  // Knowledge Base 工具
  kbListDef,
  kbCreateDef,
  kbDeleteDef,
  kbQueryDef,
  kbListDocumentsDef,
  kbDocumentAddDef,
  kbDocumentDeleteDef,
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

// 新的文章管理工具集
import {
  createArticle,
  getArticle,
  updateArticle,
  deleteArticle,
  listArticles,
  searchArticles
} from './article'
import {
  createArticleDef,
  getArticleDef,
  updateArticleDef,
  deleteArticleDef,
  listArticlesDef,
  searchArticlesDef
} from './article/definitions'

// 新的学术工具集
import {
  searchArxiv,
  fetchArxiv,
  searchOpenReview,
  fetchOpenReview,
  searchHuggingFace,
  fetchHuggingFaceModel,
  searchPapersWithCode,
  searchSemanticScholar
} from './academic'
import {
  searchArxivDef,
  fetchArxivDef,
  searchOpenReviewDef,
  fetchOpenReviewDef,
  searchHuggingFaceDef,
  fetchHuggingFaceModelDef,
  searchPapersWithCodeDef,
  searchSemanticScholarDef
} from './academic/definitions'

/**
 * 初始化所有默认工具（向后兼容）
 * 在应用启动时调用，注册所有内置工具
 */
export function initializeDefaultTools(): void {
  const tools = [
    // 文章管理工具（新版）
    { name: 'create_article', definition: createArticleDef, executor: createArticle },
    { name: 'get_article', definition: getArticleDef, executor: getArticle },
    { name: 'update_article', definition: updateArticleDef, executor: updateArticle },
    { name: 'delete_article', definition: deleteArticleDef, executor: deleteArticle },
    { name: 'list_articles', definition: listArticlesDef, executor: listArticles },
    { name: 'search_articles', definition: searchArticlesDef, executor: searchArticles },
    
    // 文件管理工具
    { name: 'read_file', definition: definitions.readFileDef, executor: executors.readFile },
    { name: 'write_file', definition: definitions.writeFileDef, executor: executors.writeFile },
    { name: 'list_files', definition: definitions.listFilesDef, executor: executors.listFiles },
    
    // 网络工具
    { name: 'web_search', definition: definitions.webSearchDef, executor: executors.webSearch },
    { name: 'fetch_url', definition: definitions.fetchUrlDef, executor: executors.fetchUrl },
    
    // 学术研究工具（新版）
    { name: 'search_arxiv', definition: searchArxivDef, executor: searchArxiv },
    { name: 'fetch_arxiv', definition: fetchArxivDef, executor: fetchArxiv },
    { name: 'search_openreview', definition: searchOpenReviewDef, executor: searchOpenReview },
    { name: 'fetch_openreview', definition: fetchOpenReviewDef, executor: fetchOpenReview },
    { name: 'search_huggingface', definition: searchHuggingFaceDef, executor: searchHuggingFace },
    { name: 'fetch_huggingface_model', definition: fetchHuggingFaceModelDef, executor: fetchHuggingFaceModel },
    { name: 'search_paperswithcode', definition: searchPapersWithCodeDef, executor: searchPapersWithCode },
    { name: 'search_semantic_scholar', definition: searchSemanticScholarDef, executor: searchSemanticScholar },
    
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
    
    // Knowledge Base 工具
    { name: 'kb_list', definition: definitions.kbListDef, executor: executors.kbList },
    { name: 'kb_create', definition: definitions.kbCreateDef, executor: executors.kbCreate },
    { name: 'kb_delete', definition: definitions.kbDeleteDef, executor: executors.kbDelete },
    { name: 'kb_query', definition: definitions.kbQueryDef, executor: executors.kbQuery },
    { name: 'kb_list_documents', definition: definitions.kbListDocumentsDef, executor: executors.kbListDocuments },
    { name: 'kb_document_add', definition: definitions.kbDocumentAddDef, executor: executors.kbDocumentAdd },
    { name: 'kb_document_delete', definition: definitions.kbDocumentDeleteDef, executor: executors.kbDocumentDelete },
    
    // 其他工具
    { name: 'get_current_time', definition: definitions.getCurrentTimeDef, executor: executors.getCurrentTime },
    { name: 'get_weather', definition: definitions.getWeatherDef, executor: executors.getWeather },
    { name: 'test_echo', definition: definitions.testEchoDef, executor: executors.testEcho },
    
    // 平台解析工具
    { name: 'parse_zhihu', definition: platformParserDefinitions[0], executor: platformParserExecutors.parse_zhihu },
    { name: 'parse_xiaohongshu', definition: platformParserDefinitions[1], executor: platformParserExecutors.parse_xiaohongshu },
    { name: 'parse_wechat', definition: platformParserDefinitions[2], executor: platformParserExecutors.parse_wechat },
    { name: 'ocr_image', definition: platformParserDefinitions[3], executor: platformParserExecutors.ocr_image },
    { name: 'parse_platform_link', definition: platformParserDefinitions[4], executor: platformParserExecutors.parse_platform_link },
    { name: 'process_image', definition: platformParserDefinitions[5], executor: platformParserExecutors.process_image }
  ]
  
  registerTools(tools)
  
  console.log(`[ToolSystem] ${tools.length} 个工具已初始化`)
}

// 自动初始化（如果在浏览器环境）
if (typeof window !== 'undefined') {
  initializeDefaultTools()
}
