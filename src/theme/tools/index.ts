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
  parseDouyin,
  parseBilibili,
  parseWeibo,
  ocrImage,
  processImage,
  parseZhihuDef,
  parseXiaohongshuDef,
  parseWechatDef,
  parsePlatformLinkDef,
  parseDouyinDef,
  parseBilibiliDef,
  parseWeiboDef,
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
  githubListPulls,
  githubGetPull,
  githubCreateIssue,
  githubListWorkflows,
  githubListWorkflowRuns,
  githubCreateOrUpdateFile,
  githubDeleteFile,
  githubCreatePullRequest,
  githubMergePullRequest,
  githubCreateIssueComment,
  githubUpdateIssue,
  githubCreateBranch,
  githubDeleteBranch,
  githubForkRepo,
  githubCreateRelease,
  githubListBranches,
  githubCompareCommits,
  githubTriggerWorkflow,
  githubGetReadme,
  githubSearchRepos,
  githubSearchIssues,
  githubCreateRepo,
  githubUpdateRepo,
  githubDeleteRepo,
  githubListIssueComments,
  githubGetPullRequestFiles,
  githubCreatePullRequestReview,
  githubGetRateLimit,
  githubGetRepoDef,
  githubListRepoContentsDef,
  githubGetFileContentDef,
  githubSearchCodeDef,
  githubGetCommitHistoryDef,
  githubGetIssuesDef,
  githubListPullsDef,
  githubGetPullDef,
  githubCreateIssueDef,
  githubListWorkflowsDef,
  githubListWorkflowRunsDef,
  githubCreateOrUpdateFileDef,
  githubDeleteFileDef,
  githubCreatePullRequestDef,
  githubMergePullRequestDef,
  githubCreateIssueCommentDef,
  githubUpdateIssueDef,
  githubCreateBranchDef,
  githubDeleteBranchDef,
  githubForkRepoDef,
  githubCreateReleaseDef,
  githubListBranchesDef,
  githubCompareCommitsDef,
  githubTriggerWorkflowDef,
  githubGetReadmeDef,
  githubSearchReposDef,
  githubSearchIssuesDef,
  githubCreateRepoDef,
  githubUpdateRepoDef,
  githubDeleteRepoDef,
  githubListIssueCommentsDef,
  githubGetPullRequestFilesDef,
  githubCreatePullRequestReviewDef,
  githubGetRateLimitDef
} from './github'


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

// ==================== 飞书工具 ====================
export {
  feishuDocCreate, feishuDocRead, feishuDocSearch, feishuDocBlocks, feishuDocAppend,
  feishuDocUpdateBlock, feishuDocDeleteBlock, feishuDocInsertImage, feishuDocShare, feishuDocUnshare,
  feishuImSend, feishuUserSearch,
  feishuWikiSpaceCreate, feishuWikiSpaceList, feishuWikiSpaceGet, feishuWikiSpaceUpdate, feishuWikiSpaceDelete,
  feishuWikiNodeCreate, feishuWikiNodeList, feishuWikiNodeDelete, feishuWikiMoveDoc,
  feishuDocCreateDef, feishuDocReadDef, feishuDocSearchDef, feishuDocBlocksDef, feishuDocAppendDef,
  feishuDocUpdateBlockDef, feishuDocDeleteBlockDef, feishuDocInsertImageDef, feishuDocShareDef,
  feishuDocUnshareDef, feishuImSendDef, feishuUserSearchDef,
  feishuWikiSpaceCreateDef, feishuWikiSpaceListDef, feishuWikiSpaceGetDef, feishuWikiSpaceUpdateDef, feishuWikiSpaceDeleteDef,
  feishuWikiNodeCreateDef, feishuWikiNodeListDef, feishuWikiNodeDeleteDef, feishuWikiMoveDocDef,
} from './lark'

// ==================== 语雀工具 ====================
export {
  yuqueRepoList, yuqueTocGet, yuqueDocList, yuqueDocRead, yuqueDocCreate,
  yuqueDocUpdate, yuqueDocDelete, yuqueImageUpload, yuqueSearch,
  yuqueRepoCreate, yuqueRepoUpdate, yuqueRepoDelete, yuqueRepoGet, yuqueRepoSettingGet, yuqueRepoSettingUpdate,
  yuqueRepoListDef, yuqueTocGetDef, yuqueDocListDef, yuqueDocReadDef, yuqueDocCreateDef,
  yuqueDocUpdateDef, yuqueDocDeleteDef, yuqueImageUploadDef, yuqueSearchDef,
  yuqueRepoCreateDef, yuqueRepoUpdateDef, yuqueRepoDeleteDef, yuqueRepoGetDef, yuqueRepoSettingGetDef, yuqueRepoSettingUpdateDef,
} from './yuque'

// ==================== Skill 加载工具 ====================
export {
  loadSkillDef,
  executeLoadSkill
} from './load_skill'

// ==================== Meta 工具 ====================
export {
  getAllToolsDef,
  getAllSkillsDef,
  executeGetAllTools,
  executeGetAllSkills
} from './meta'

// ==================== 能力搜索工具 ====================
export {
  searchCapabilitiesDef,
  executeSearchCapabilities
} from './search_capabilities'

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
  parseZhihu, parseXiaohongshu, parseWechat, parsePlatformLink, parseDouyin, parseBilibili, parseWeibo, ocrImage, processImage,
  parseZhihuDef, parseXiaohongshuDef, parseWechatDef, parsePlatformLinkDef, parseDouyinDef, parseBilibiliDef, parseWeiboDef, ocrImageDef, processImageDef
} from './platform'

// GitHub 工具
import {
  githubGetRepo, githubListRepoContents, githubGetFileContent, githubSearchCode, githubGetCommitHistory, githubGetIssues,
  githubListPulls, githubGetPull, githubCreateIssue, githubListWorkflows, githubListWorkflowRuns,
  githubCreateOrUpdateFile, githubDeleteFile, githubCreatePullRequest, githubMergePullRequest,
  githubCreateIssueComment, githubUpdateIssue, githubCreateBranch, githubDeleteBranch,
  githubForkRepo, githubCreateRelease, githubListBranches, githubCompareCommits,
  githubTriggerWorkflow, githubGetReadme,
  githubSearchRepos, githubSearchIssues, githubCreateRepo, githubUpdateRepo, githubDeleteRepo,
  githubListIssueComments, githubGetPullRequestFiles, githubCreatePullRequestReview, githubGetRateLimit,
  githubGetRepoDef, githubListRepoContentsDef, githubGetFileContentDef, githubSearchCodeDef, githubGetCommitHistoryDef, githubGetIssuesDef,
  githubListPullsDef, githubGetPullDef, githubCreateIssueDef, githubListWorkflowsDef, githubListWorkflowRunsDef,
  githubCreateOrUpdateFileDef, githubDeleteFileDef, githubCreatePullRequestDef, githubMergePullRequestDef,
  githubCreateIssueCommentDef, githubUpdateIssueDef, githubCreateBranchDef, githubDeleteBranchDef,
  githubForkRepoDef, githubCreateReleaseDef, githubListBranchesDef, githubCompareCommitsDef,
  githubTriggerWorkflowDef, githubGetReadmeDef,
  githubSearchReposDef, githubSearchIssuesDef, githubCreateRepoDef, githubUpdateRepoDef, githubDeleteRepoDef,
  githubListIssueCommentsDef, githubGetPullRequestFilesDef, githubCreatePullRequestReviewDef, githubGetRateLimitDef
} from './github'


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
  feishuDocCreate, feishuDocRead, feishuDocSearch, feishuDocBlocks, feishuDocAppend,
  feishuDocUpdateBlock, feishuDocDeleteBlock, feishuDocInsertImage, feishuDocShare, feishuDocUnshare,
  feishuImSend, feishuUserSearch,
  feishuWikiSpaceCreate, feishuWikiSpaceList, feishuWikiSpaceGet, feishuWikiSpaceUpdate, feishuWikiSpaceDelete,
  feishuWikiNodeCreate, feishuWikiNodeList, feishuWikiNodeDelete, feishuWikiMoveDoc,
  feishuDocCreateDef, feishuDocReadDef, feishuDocSearchDef, feishuDocBlocksDef, feishuDocAppendDef,
  feishuDocUpdateBlockDef, feishuDocDeleteBlockDef, feishuDocInsertImageDef, feishuDocShareDef,
  feishuDocUnshareDef, feishuImSendDef, feishuUserSearchDef,
  feishuWikiSpaceCreateDef, feishuWikiSpaceListDef, feishuWikiSpaceGetDef, feishuWikiSpaceUpdateDef, feishuWikiSpaceDeleteDef,
  feishuWikiNodeCreateDef, feishuWikiNodeListDef, feishuWikiNodeDeleteDef, feishuWikiMoveDocDef,
} from './lark'

// 语雀工具
import {
  yuqueRepoList, yuqueTocGet, yuqueDocList, yuqueDocRead, yuqueDocCreate,
  yuqueDocUpdate, yuqueDocDelete, yuqueImageUpload, yuqueSearch,
  yuqueRepoCreate, yuqueRepoUpdate, yuqueRepoDelete, yuqueRepoGet, yuqueRepoSettingGet, yuqueRepoSettingUpdate,
  yuqueRepoListDef, yuqueTocGetDef, yuqueDocListDef, yuqueDocReadDef, yuqueDocCreateDef,
  yuqueDocUpdateDef, yuqueDocDeleteDef, yuqueImageUploadDef, yuqueSearchDef,
  yuqueRepoCreateDef, yuqueRepoUpdateDef, yuqueRepoDeleteDef, yuqueRepoGetDef, yuqueRepoSettingGetDef, yuqueRepoSettingUpdateDef,
} from './yuque'

// Skill 加载工具
import { loadSkillDef, executeLoadSkill } from './load_skill'

// Meta 工具
import { getAllToolsDef, getAllSkillsDef, executeGetAllTools, executeGetAllSkills } from './meta'

// 能力搜索工具
import { searchCapabilitiesDef, executeSearchCapabilities } from './search_capabilities'

// ==================== 核心工具列表（始终暴露） ====================

/**
 * 核心工具名称列表 - 始终通过 Function Calling schema 暴露
 * 
 * 渐进式披露设计：
 * - 核心工具（~7个）始终暴露
 * - 领域工具（~69个）默认隐藏，通过 search_capabilities / load_skill 动态激活
 * 
 * 参考：OpenAI 建议每轮对话不超过 10-15 个工具，
 * MCP 专家建议不超过 10-15 个，graph-tool-call 项目 248→5 减少 79% token
 */
export const CORE_TOOL_NAMES = [
  'search_capabilities',   // 能力发现器 - 搜索所有工具和 Skills
  'load_skill',            // 工作流加载器 - 加载 Skill 工作流指导
  'get_all_tools',         // 工具目录 - 获取完整工具列表（文本形式）
  'get_all_skills',        // Skill 目录 - 获取完整 Skill 列表（文本形式）
  'get_current_time',      // 通用基础工具
  'calculate',             // 通用基础工具
  'web_search'             // 通用网络搜索
]

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
  
  // 平台解析工具（9个）
  registerTools([
    { name: 'parse_zhihu', definition: parseZhihuDef, executor: parseZhihu },
    { name: 'parse_xiaohongshu', definition: parseXiaohongshuDef, executor: parseXiaohongshu },
    { name: 'parse_wechat', definition: parseWechatDef, executor: parseWechat },
    { name: 'parse_platform_link', definition: parsePlatformLinkDef, executor: parsePlatformLink },
    { name: 'parse_douyin', definition: parseDouyinDef, executor: parseDouyin },
    { name: 'parse_bilibili', definition: parseBilibiliDef, executor: parseBilibili },
    { name: 'parse_weibo', definition: parseWeiboDef, executor: parseWeibo },
    { name: 'ocr_image', definition: ocrImageDef, executor: ocrImage },
    { name: 'process_image', definition: processImageDef, executor: processImage }
  ])
  
  // GitHub 工具（34个）
  registerTools([
    { name: 'github_get_repo', definition: githubGetRepoDef, executor: githubGetRepo },
    { name: 'github_list_repo_contents', definition: githubListRepoContentsDef, executor: githubListRepoContents },
    { name: 'github_get_file_content', definition: githubGetFileContentDef, executor: githubGetFileContent },
    { name: 'github_search_code', definition: githubSearchCodeDef, executor: githubSearchCode },
    { name: 'github_search_repos', definition: githubSearchReposDef, executor: githubSearchRepos },
    { name: 'github_search_issues', definition: githubSearchIssuesDef, executor: githubSearchIssues },
    { name: 'github_get_commit_history', definition: githubGetCommitHistoryDef, executor: githubGetCommitHistory },
    { name: 'github_get_issues', definition: githubGetIssuesDef, executor: githubGetIssues },
    { name: 'github_list_pulls', definition: githubListPullsDef, executor: githubListPulls },
    { name: 'github_get_pull', definition: githubGetPullDef, executor: githubGetPull },
    { name: 'github_get_pull_request_files', definition: githubGetPullRequestFilesDef, executor: githubGetPullRequestFiles },
    { name: 'github_create_pull_request_review', definition: githubCreatePullRequestReviewDef, executor: githubCreatePullRequestReview },
    { name: 'github_create_issue', definition: githubCreateIssueDef, executor: githubCreateIssue },
    { name: 'github_list_issue_comments', definition: githubListIssueCommentsDef, executor: githubListIssueComments },
    { name: 'github_create_issue_comment', definition: githubCreateIssueCommentDef, executor: githubCreateIssueComment },
    { name: 'github_update_issue', definition: githubUpdateIssueDef, executor: githubUpdateIssue },
    { name: 'github_list_workflows', definition: githubListWorkflowsDef, executor: githubListWorkflows },
    { name: 'github_list_workflow_runs', definition: githubListWorkflowRunsDef, executor: githubListWorkflowRuns },
    { name: 'github_create_or_update_file', definition: githubCreateOrUpdateFileDef, executor: githubCreateOrUpdateFile },
    { name: 'github_delete_file', definition: githubDeleteFileDef, executor: githubDeleteFile },
    { name: 'github_create_pull_request', definition: githubCreatePullRequestDef, executor: githubCreatePullRequest },
    { name: 'github_merge_pull_request', definition: githubMergePullRequestDef, executor: githubMergePullRequest },
    { name: 'github_create_branch', definition: githubCreateBranchDef, executor: githubCreateBranch },
    { name: 'github_delete_branch', definition: githubDeleteBranchDef, executor: githubDeleteBranch },
    { name: 'github_fork_repo', definition: githubForkRepoDef, executor: githubForkRepo },
    { name: 'github_create_repo', definition: githubCreateRepoDef, executor: githubCreateRepo },
    { name: 'github_update_repo', definition: githubUpdateRepoDef, executor: githubUpdateRepo },
    { name: 'github_delete_repo', definition: githubDeleteRepoDef, executor: githubDeleteRepo },
    { name: 'github_create_release', definition: githubCreateReleaseDef, executor: githubCreateRelease },
    { name: 'github_list_branches', definition: githubListBranchesDef, executor: githubListBranches },
    { name: 'github_compare_commits', definition: githubCompareCommitsDef, executor: githubCompareCommits },
    { name: 'github_trigger_workflow', definition: githubTriggerWorkflowDef, executor: githubTriggerWorkflow },
    { name: 'github_get_readme', definition: githubGetReadmeDef, executor: githubGetReadme },
    { name: 'github_get_rate_limit', definition: githubGetRateLimitDef, executor: githubGetRateLimit }
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

  // 飞书文档工具（12个）
  registerTools([
    { name: 'feishu_doc_create', definition: feishuDocCreateDef, executor: feishuDocCreate },
    { name: 'feishu_doc_read', definition: feishuDocReadDef, executor: feishuDocRead },
    { name: 'feishu_doc_search', definition: feishuDocSearchDef, executor: feishuDocSearch },
    { name: 'feishu_doc_blocks', definition: feishuDocBlocksDef, executor: feishuDocBlocks },
    { name: 'feishu_doc_append', definition: feishuDocAppendDef, executor: feishuDocAppend },
    { name: 'feishu_doc_update_block', definition: feishuDocUpdateBlockDef, executor: feishuDocUpdateBlock },
    { name: 'feishu_doc_delete_block', definition: feishuDocDeleteBlockDef, executor: feishuDocDeleteBlock },
    { name: 'feishu_doc_insert_image', definition: feishuDocInsertImageDef, executor: feishuDocInsertImage },
    { name: 'feishu_doc_share', definition: feishuDocShareDef, executor: feishuDocShare },
    { name: 'feishu_doc_unshare', definition: feishuDocUnshareDef, executor: feishuDocUnshare },
    { name: 'feishu_im_send', definition: feishuImSendDef, executor: feishuImSend },
    { name: 'feishu_user_search', definition: feishuUserSearchDef, executor: feishuUserSearch }
  ])

  // 飞书 Wiki 知识库工具（8个）
  registerTools([
    { name: 'feishu_wiki_space_create', definition: feishuWikiSpaceCreateDef, executor: feishuWikiSpaceCreate },
    { name: 'feishu_wiki_space_list', definition: feishuWikiSpaceListDef, executor: feishuWikiSpaceList },
    { name: 'feishu_wiki_space_get', definition: feishuWikiSpaceGetDef, executor: feishuWikiSpaceGet },
    { name: 'feishu_wiki_space_update', definition: feishuWikiSpaceUpdateDef, executor: feishuWikiSpaceUpdate },
    { name: 'feishu_wiki_space_delete', definition: feishuWikiSpaceDeleteDef, executor: feishuWikiSpaceDelete },
    { name: 'feishu_wiki_node_create', definition: feishuWikiNodeCreateDef, executor: feishuWikiNodeCreate },
    { name: 'feishu_wiki_node_list', definition: feishuWikiNodeListDef, executor: feishuWikiNodeList },
    { name: 'feishu_wiki_node_delete', definition: feishuWikiNodeDeleteDef, executor: feishuWikiNodeDelete },
    { name: 'feishu_wiki_move_doc', definition: feishuWikiMoveDocDef, executor: feishuWikiMoveDoc },
  ])

  // 语雀文档工具（9个）
  registerTools([
    { name: 'yuque_repo_list', definition: yuqueRepoListDef, executor: yuqueRepoList },
    { name: 'yuque_toc_get', definition: yuqueTocGetDef, executor: yuqueTocGet },
    { name: 'yuque_doc_list', definition: yuqueDocListDef, executor: yuqueDocList },
    { name: 'yuque_doc_read', definition: yuqueDocReadDef, executor: yuqueDocRead },
    { name: 'yuque_doc_create', definition: yuqueDocCreateDef, executor: yuqueDocCreate },
    { name: 'yuque_doc_update', definition: yuqueDocUpdateDef, executor: yuqueDocUpdate },
    { name: 'yuque_doc_delete', definition: yuqueDocDeleteDef, executor: yuqueDocDelete },
    { name: 'yuque_image_upload', definition: yuqueImageUploadDef, executor: yuqueImageUpload },
    { name: 'yuque_search', definition: yuqueSearchDef, executor: yuqueSearch },
  ])

  // 语雀知识库管理工具（6个）
  registerTools([
    { name: 'yuque_repo_create', definition: yuqueRepoCreateDef, executor: yuqueRepoCreate },
    { name: 'yuque_repo_update', definition: yuqueRepoUpdateDef, executor: yuqueRepoUpdate },
    { name: 'yuque_repo_delete', definition: yuqueRepoDeleteDef, executor: yuqueRepoDelete },
    { name: 'yuque_repo_get', definition: yuqueRepoGetDef, executor: yuqueRepoGet },
    { name: 'yuque_repo_setting_get', definition: yuqueRepoSettingGetDef, executor: yuqueRepoSettingGet },
    { name: 'yuque_repo_setting_update', definition: yuqueRepoSettingUpdateDef, executor: yuqueRepoSettingUpdate },
  ])

  // Skill 加载工具（1个）- 让 Agent 主动加载 Skill 内容
  registerTools([
    { name: 'load_skill', definition: loadSkillDef, executor: executeLoadSkill }
  ])

  // Meta 查询工具（2个）- 让 Agent 查询系统能力全貌
  registerTools([
    { name: 'get_all_tools', definition: getAllToolsDef, executor: executeGetAllTools },
    { name: 'get_all_skills', definition: getAllSkillsDef, executor: executeGetAllSkills }
  ])

  // 能力搜索工具（1个）- 让 Agent 通过关键词搜索工具和 Skills
  registerTools([
    { name: 'search_capabilities', definition: searchCapabilitiesDef, executor: executeSearchCapabilities }
  ])

  console.log(`[ToolSystem] ${getRegisteredToolNames().length} 个工具已初始化`)
}

// 自动初始化（如果在浏览器环境）
if (typeof window !== 'undefined') {
  initializeDefaultTools()
}
