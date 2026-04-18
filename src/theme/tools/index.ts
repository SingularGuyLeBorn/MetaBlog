/**
 * 工具系统统一入口
 * 
 * 按功能分类的工具集合：
 * - article: 文章管理
 * - academic: 学术研究
 * - file: 文件操作
 * - platform: 平台解析
 * - github: GitHub 操作
 * - kb: 知识库
 * - note: 笔记
 * - text: 文本处理
 * - code: 代码工具
 * - network: 网络工具
 * - system: 系统工具
 */

// ==================== 类型导出 ====================
export type {
  ToolDefinition,
  ToolCall,
  ToolExecutor,
  ToolRegistration,
  ToolCallRecord,
  ThinkingStep,
  ToolResult
} from './types'

export { createSuccessResult, createErrorResult } from './types'

// ==================== 注册表导出 ====================
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
  clearTools,
  getToolCallRecord,
  getAllToolCallRecords,
  clearToolCallRecords
} from './registry'

// ==================== 文章工具 ====================
export {
  createArticle,
  getArticleContent,
  updateArticle,
  deleteArticle,
  listArticles,
  searchArticles,
  createArticleDef,
  getArticleContentDef,
  updateArticleDef,
  deleteArticleDef,
  listArticlesDef,
  searchArticlesDef
} from './article'

// ==================== 学术工具 ====================
export {
  searchArxiv,
  fetchArxiv,
  searchOpenReview,
  fetchOpenReview,
  searchHuggingFace,
  fetchHuggingFaceModel,
  searchPapersWithCode,
  searchSemanticScholar,
  searchArxivDef,
  fetchArxivDef,
  searchOpenReviewDef,
  fetchOpenReviewDef,
  searchHuggingFaceDef,
  fetchHuggingFaceModelDef,
  searchPapersWithCodeDef,
  searchSemanticScholarDef
} from './academic'

// ==================== 文件工具 ====================
export {
  readFile,
  writeFile,
  listFiles,
  readFileDef,
  writeFileDef,
  listFilesDef
} from './file'

// ==================== 平台解析工具 ====================
export {
  parseZhihu,
  parseXiaohongshu,
  parseWechat,
  parsePlatformLink,
  ocrImage,
  processImage,
  parseZhihuDef,
  parseXiaohongshuDef,
  parseWechatDef,
  parsePlatformLinkDef,
  ocrImageDef,
  processImageDef
} from './platform'

// ==================== GitHub 工具 ====================
export {
  githubGetRepo,
  githubListRepoContents,
  githubGetFileContent,
  githubSearchCode,
  githubGetCommitHistory,
  githubGetIssues,
  githubGetRepoDef,
  githubListRepoContentsDef,
  githubGetFileContentDef,
  githubSearchCodeDef,
  githubGetCommitHistoryDef,
  githubGetIssuesDef
} from './github'

// ==================== 知识库工具 ====================
export {
  kbList,
  kbCreate,
  kbDelete,
  kbQuery,
  kbListDocuments,
  kbDocumentAdd,
  kbDocumentDelete,
  kbListDef,
  kbCreateDef,
  kbDeleteDef,
  kbQueryDef,
  kbListDocumentsDef,
  kbDocumentAddDef,
  kbDocumentDeleteDef
} from './kb'

// ==================== 笔记工具 ====================
export {
  createNote,
  listNotes,
  queryKnowledge,
  createNoteDef,
  listNotesDef,
  queryKnowledgeDef
} from './note'

// ==================== 文本工具 ====================
export {
  summarizeText,
  formatText,
  translateText,
  summarizeTextDef,
  formatTextDef,
  translateTextDef
} from './text'

// ==================== 代码工具 ====================
export {
  executeCode,
  analyzeCode,
  executeCodeDef,
  analyzeCodeDef
} from './code'

// ==================== 网络工具 ====================
export {
  webSearch,
  fetchUrl,
  webSearchDef,
  fetchUrlDef
} from './network'

// ==================== 系统工具 ====================
export {
  getCurrentTime,
  testEcho,
  calculate,
  getWeather,
  getCurrentTimeDef,
  testEchoDef,
  calculateDef,
  getWeatherDef
} from './system'

// ==================== 导入用于初始化 ====================
import { registerTools, getRegisteredToolNames } from './registry'

// 文章工具
import {
  createArticle, getArticleContent, updateArticle, deleteArticle, listArticles, searchArticles,
  createArticleDef, getArticleContentDef, updateArticleDef, deleteArticleDef, listArticlesDef, searchArticlesDef
} from './article'

// 学术工具
import {
  searchArxiv, fetchArxiv, searchOpenReview, fetchOpenReview, searchHuggingFace, fetchHuggingFaceModel, searchPapersWithCode, searchSemanticScholar,
  searchArxivDef, fetchArxivDef, searchOpenReviewDef, fetchOpenReviewDef, searchHuggingFaceDef, fetchHuggingFaceModelDef, searchPapersWithCodeDef, searchSemanticScholarDef
} from './academic'

// 文件工具
import { readFile, writeFile, listFiles, readFileDef, writeFileDef, listFilesDef } from './file'

// 平台解析工具
import {
  parseZhihu, parseXiaohongshu, parseWechat, parsePlatformLink, ocrImage, processImage,
  parseZhihuDef, parseXiaohongshuDef, parseWechatDef, parsePlatformLinkDef, ocrImageDef, processImageDef
} from './platform'

// GitHub 工具
import {
  githubGetRepo, githubListRepoContents, githubGetFileContent, githubSearchCode, githubGetCommitHistory, githubGetIssues,
  githubGetRepoDef, githubListRepoContentsDef, githubGetFileContentDef, githubSearchCodeDef, githubGetCommitHistoryDef, githubGetIssuesDef
} from './github'

// 知识库工具
import {
  kbList, kbCreate, kbDelete, kbQuery, kbListDocuments, kbDocumentAdd, kbDocumentDelete,
  kbListDef, kbCreateDef, kbDeleteDef, kbQueryDef, kbListDocumentsDef, kbDocumentAddDef, kbDocumentDeleteDef
} from './kb'

// 笔记工具
import { createNote, listNotes, queryKnowledge, createNoteDef, listNotesDef, queryKnowledgeDef } from './note'

// 文本工具
import { summarizeText, formatText, translateText, summarizeTextDef, formatTextDef, translateTextDef } from './text'

// 代码工具
import { executeCode, analyzeCode, executeCodeDef, analyzeCodeDef } from './code'

// 网络工具
import { webSearch, fetchUrl, webSearchDef, fetchUrlDef } from './network'

// 系统工具
import { getCurrentTime, testEcho, calculate, getWeather, getCurrentTimeDef, testEchoDef, calculateDef, getWeatherDef } from './system'

// 飞书工具
import {
  runLarkCli, larkSendMessage, larkSearchDocs, larkCalendarEvents, larkSearchUser,
  runLarkCliDef, larkSendMessageDef, larkSearchDocsDef, larkCalendarEventsDef, larkSearchUserDef
} from './lark'

// ==================== 初始化函数 ====================

let defaultToolsInitialized = false

/**
 * 初始化所有默认工具
 * 在应用启动时调用，注册所有内置工具
 */
export function initializeDefaultTools(): void {
  if (defaultToolsInitialized) return
  defaultToolsInitialized = true

  // 文章管理工具（6个）
  registerTools([
    { name: 'create_article', definition: createArticleDef, executor: createArticle },
    { name: 'get_article_content', definition: getArticleContentDef, executor: getArticleContent },
    { name: 'update_article', definition: updateArticleDef, executor: updateArticle },
    { name: 'delete_article', definition: deleteArticleDef, executor: deleteArticle },
    { name: 'list_articles', definition: listArticlesDef, executor: listArticles },
    { name: 'search_articles', definition: searchArticlesDef, executor: searchArticles }
  ])
  
  // 学术研究工具（8个）
  registerTools([
    { name: 'search_arxiv', definition: searchArxivDef, executor: searchArxiv },
    { name: 'fetch_arxiv', definition: fetchArxivDef, executor: fetchArxiv },
    { name: 'search_openreview', definition: searchOpenReviewDef, executor: searchOpenReview },
    { name: 'fetch_openreview', definition: fetchOpenReviewDef, executor: fetchOpenReview },
    { name: 'search_huggingface', definition: searchHuggingFaceDef, executor: searchHuggingFace },
    { name: 'fetch_huggingface_model', definition: fetchHuggingFaceModelDef, executor: fetchHuggingFaceModel },
    { name: 'search_paperswithcode', definition: searchPapersWithCodeDef, executor: searchPapersWithCode },
    { name: 'search_semantic_scholar', definition: searchSemanticScholarDef, executor: searchSemanticScholar }
  ])
  
  // 文件管理工具（3个）
  registerTools([
    { name: 'read_file', definition: readFileDef, executor: readFile },
    { name: 'write_file', definition: writeFileDef, executor: writeFile },
    { name: 'list_files', definition: listFilesDef, executor: listFiles }
  ])
  
  // 平台解析工具（6个）
  registerTools([
    { name: 'parse_zhihu', definition: parseZhihuDef, executor: parseZhihu },
    { name: 'parse_xiaohongshu', definition: parseXiaohongshuDef, executor: parseXiaohongshu },
    { name: 'parse_wechat', definition: parseWechatDef, executor: parseWechat },
    { name: 'parse_platform_link', definition: parsePlatformLinkDef, executor: parsePlatformLink },
    { name: 'ocr_image', definition: ocrImageDef, executor: ocrImage },
    { name: 'process_image', definition: processImageDef, executor: processImage }
  ])
  
  // GitHub 工具（6个）
  registerTools([
    { name: 'github_get_repo', definition: githubGetRepoDef, executor: githubGetRepo },
    { name: 'github_list_repo_contents', definition: githubListRepoContentsDef, executor: githubListRepoContents },
    { name: 'github_get_file_content', definition: githubGetFileContentDef, executor: githubGetFileContent },
    { name: 'github_search_code', definition: githubSearchCodeDef, executor: githubSearchCode },
    { name: 'github_get_commit_history', definition: githubGetCommitHistoryDef, executor: githubGetCommitHistory },
    { name: 'github_get_issues', definition: githubGetIssuesDef, executor: githubGetIssues }
  ])
  
  // 知识库工具（7个）
  registerTools([
    { name: 'kb_list', definition: kbListDef, executor: kbList },
    { name: 'kb_create', definition: kbCreateDef, executor: kbCreate },
    { name: 'kb_delete', definition: kbDeleteDef, executor: kbDelete },
    { name: 'kb_query', definition: kbQueryDef, executor: kbQuery },
    { name: 'kb_list_documents', definition: kbListDocumentsDef, executor: kbListDocuments },
    { name: 'kb_document_add', definition: kbDocumentAddDef, executor: kbDocumentAdd },
    { name: 'kb_document_delete', definition: kbDocumentDeleteDef, executor: kbDocumentDelete }
  ])
  
  // 笔记工具（3个）
  registerTools([
    { name: 'create_note', definition: createNoteDef, executor: createNote },
    { name: 'list_notes', definition: listNotesDef, executor: listNotes },
    { name: 'query_knowledge', definition: queryKnowledgeDef, executor: queryKnowledge }
  ])
  
  // 文本处理工具（3个）
  registerTools([
    { name: 'summarize_text', definition: summarizeTextDef, executor: summarizeText },
    { name: 'format_text', definition: formatTextDef, executor: formatText },
    { name: 'translate_text', definition: translateTextDef, executor: translateText }
  ])
  
  // 代码工具（2个）
  registerTools([
    { name: 'execute_code', definition: executeCodeDef, executor: executeCode },
    { name: 'analyze_code', definition: analyzeCodeDef, executor: analyzeCode }
  ])
  
  // 网络工具（2个）
  registerTools([
    { name: 'web_search', definition: webSearchDef, executor: webSearch },
    { name: 'fetch_url', definition: fetchUrlDef, executor: fetchUrl }
  ])
  
  // 系统工具（4个）
  registerTools([
    { name: 'get_current_time', definition: getCurrentTimeDef, executor: getCurrentTime },
    { name: 'get_weather', definition: getWeatherDef, executor: getWeather },
    { name: 'calculate', definition: calculateDef, executor: calculate },
    { name: 'test_echo', definition: testEchoDef, executor: testEcho }
  ])

  // 飞书 Lark 工具（5个）
  registerTools([
    { name: 'run_lark_cli', definition: runLarkCliDef, executor: runLarkCli },
    { name: 'lark_send_message', definition: larkSendMessageDef, executor: larkSendMessage },
    { name: 'lark_search_docs', definition: larkSearchDocsDef, executor: larkSearchDocs },
    { name: 'lark_calendar_events', definition: larkCalendarEventsDef, executor: larkCalendarEvents },
    { name: 'lark_search_user', definition: larkSearchUserDef, executor: larkSearchUser }
  ])
  
  // 飞书 Lark 工具（5个）
  registerTools([
    { name: 'run_lark_cli', definition: runLarkCliDef, executor: runLarkCli },
    { name: 'lark_send_message', definition: larkSendMessageDef, executor: larkSendMessage },
    { name: 'lark_search_docs', definition: larkSearchDocsDef, executor: larkSearchDocs },
    { name: 'lark_calendar_events', definition: larkCalendarEventsDef, executor: larkCalendarEvents },
    { name: 'lark_search_user', definition: larkSearchUserDef, executor: larkSearchUser }
  ])

  console.log(`[ToolSystem] ${getRegisteredToolNames().length} 个工具已初始化`)
}

// 自动初始化（如果在浏览器环境）
if (typeof window !== 'undefined') {
  initializeDefaultTools()
}
