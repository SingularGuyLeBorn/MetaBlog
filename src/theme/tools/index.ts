/**
 * 工具系统统一入口
 *
 * 按功能分类的工具集合：
 * - article: 文章管理
 * - academic: 学术研究
 * - code: 代码工具
 * - file: 文件操作
 * - github: GitHub 操作
 * - lark: 飞书平台
 * - loadSkill: 技能加载
 * - meta: 元信息查询
 * - network: 网络工具
 * - note: 笔记管理
 * - platform: 平台解析
 * - searchCapabilities: 工具搜索
 * - system: 系统工具
 * - text: 文本处理
 * - yuque: 语雀平台
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

// ==================== 注册表导出====================
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
    feishuDocCreate, feishuDocRead, feishuDocMeta, feishuDocSearch, feishuDocBlocks, feishuDocAppend,
    feishuDocUpdateBlock, feishuDocDeleteBlock, feishuDocInsertImage, feishuDocShare, feishuDocUnshare,
    feishuImSend, feishuUserSearch,
    feishuWikiSpaceCreate, feishuWikiSpaceList, feishuWikiSpaceGet, feishuWikiSpaceUpdate, feishuWikiSpaceDelete,
    feishuWikiNodeCreate, feishuWikiNodeList, feishuWikiNodeDelete, feishuWikiNodeMove, feishuWikiMoveDoc,
    feishuWikiMemberList, feishuWikiMemberAdd, feishuWikiMemberRemove,
    feishuDocCreateDef, feishuDocReadDef, feishuDocMetaDef, feishuDocSearchDef, feishuDocBlocksDef, feishuDocAppendDef,
    feishuDocUpdateBlockDef, feishuDocDeleteBlockDef, feishuDocInsertImageDef, feishuDocShareDef,
    feishuDocUnshareDef, feishuImSendDef, feishuUserSearchDef,
    feishuWikiSpaceCreateDef, feishuWikiSpaceListDef, feishuWikiSpaceGetDef, feishuWikiSpaceUpdateDef, feishuWikiSpaceDeleteDef,
    feishuWikiNodeCreateDef, feishuWikiNodeListDef, feishuWikiNodeDeleteDef, feishuWikiNodeMoveDef, feishuWikiMoveDocDef,
    feishuWikiMemberListDef, feishuWikiMemberAddDef, feishuWikiMemberRemoveDef,
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

// ==================== 导入用于初始化====================
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
    feishuDocCreate, feishuDocRead, feishuDocMeta, feishuDocSearch, feishuDocBlocks, feishuDocAppend,
    feishuDocUpdateBlock, feishuDocDeleteBlock, feishuDocInsertImage, feishuDocShare, feishuDocUnshare,
    feishuImSend, feishuUserSearch,
    feishuWikiSpaceCreate, feishuWikiSpaceList, feishuWikiSpaceGet, feishuWikiSpaceUpdate, feishuWikiSpaceDelete,
    feishuWikiNodeCreate, feishuWikiNodeList, feishuWikiNodeDelete, feishuWikiNodeMove, feishuWikiMoveDoc,
    feishuWikiMemberList, feishuWikiMemberAdd, feishuWikiMemberRemove,
    feishuDocCreateDef, feishuDocReadDef, feishuDocMetaDef, feishuDocSearchDef, feishuDocBlocksDef, feishuDocAppendDef,
    feishuDocUpdateBlockDef, feishuDocDeleteBlockDef, feishuDocInsertImageDef, feishuDocShareDef,
    feishuDocUnshareDef, feishuImSendDef, feishuUserSearchDef,
    feishuWikiSpaceCreateDef, feishuWikiSpaceListDef, feishuWikiSpaceGetDef, feishuWikiSpaceUpdateDef, feishuWikiSpaceDeleteDef,
    feishuWikiNodeCreateDef, feishuWikiNodeListDef, feishuWikiNodeDeleteDef, feishuWikiNodeMoveDef, feishuWikiMoveDocDef,
    feishuWikiMemberListDef, feishuWikiMemberAddDef, feishuWikiMemberRemoveDef,
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
 * - 领域工具（~69个）默认隐藏，通过 searchCapabilities / loadSkill 动态激活 *
 * 参考：OpenAI 建议每轮对话不超过10-15 个工具，
 * MCP 专家建议不超过10-15 个，graph-tool-call 项目 248个 减少 79% token
 */
export const CORE_TOOL_NAMES = [
    'searchCapabilities',   // 能力发现器- 搜索所有工具和 Skills
    'loadSkill',            // 工作流加载器 - 加载 Skill 工作流指南
    'getAllTools',         // 工具目录 - 获取完整工具列表（文本形式）
    'getAllSkills',        // Skill 目录 - 获取完整 Skill 列表（文本形式）
    'getCurrentTime',      // 通用基础工具
    'calculate',             // 通用基础工具
    'webSearch'             // 通用网络搜索
]

// ==================== 初始化函数====================

let defaultToolsInitialized = false

/**
 * 初始化所有默认工具
 * 在应用启动时调用，注册所有内置工具
 */
export function initializeDefaultTools(): void {
    if (defaultToolsInitialized) return
    defaultToolsInitialized = true

    // 文章管理工具（个）
    registerTools([
        { name: 'createArticle', definition: createArticleDef, executor: createArticle },
        { name: 'getArticleContent', definition: getArticleContentDef, executor: getArticleContent },
        { name: 'updateArticle', definition: updateArticleDef, executor: updateArticle },
        { name: 'deleteArticle', definition: deleteArticleDef, executor: deleteArticle },
        { name: 'listArticles', definition: listArticlesDef, executor: listArticles },
        { name: 'searchArticles', definition: searchArticlesDef, executor: searchArticles }
    ])

    // 学术研究工具（个）
    registerTools([
        { name: 'searchArxiv', definition: searchArxivDef, executor: searchArxiv },
        { name: 'fetchArxiv', definition: fetchArxivDef, executor: fetchArxiv },
        { name: 'searchOpenreview', definition: searchOpenReviewDef, executor: searchOpenReview },
        { name: 'fetchOpenreview', definition: fetchOpenReviewDef, executor: fetchOpenReview },
        { name: 'searchHuggingface', definition: searchHuggingFaceDef, executor: searchHuggingFace },
        { name: 'fetchHuggingfaceModel', definition: fetchHuggingFaceModelDef, executor: fetchHuggingFaceModel },
        { name: 'searchPaperswithcode', definition: searchPapersWithCodeDef, executor: searchPapersWithCode },
        { name: 'searchSemanticScholar', definition: searchSemanticScholarDef, executor: searchSemanticScholar }
    ])

    // 文件管理工具（个）
    registerTools([
        { name: 'readFile', definition: readFileDef, executor: readFile },
        { name: 'writeFile', definition: writeFileDef, executor: writeFile },
        { name: 'listFiles', definition: listFilesDef, executor: listFiles }
    ])

    // 平台解析工具（个）
    registerTools([
        { name: 'parseZhihu', definition: parseZhihuDef, executor: parseZhihu },
        { name: 'parseXiaohongshu', definition: parseXiaohongshuDef, executor: parseXiaohongshu },
        { name: 'parseWechat', definition: parseWechatDef, executor: parseWechat },
        { name: 'parsePlatformLink', definition: parsePlatformLinkDef, executor: parsePlatformLink },
        { name: 'parseDouyin', definition: parseDouyinDef, executor: parseDouyin },
        { name: 'parseBilibili', definition: parseBilibiliDef, executor: parseBilibili },
        { name: 'parseWeibo', definition: parseWeiboDef, executor: parseWeibo },
        { name: 'ocrImage', definition: ocrImageDef, executor: ocrImage },
        { name: 'processImage', definition: processImageDef, executor: processImage }
    ])

    // GitHub 工具（4个）
    registerTools([
        { name: 'githubGetRepo', definition: githubGetRepoDef, executor: githubGetRepo },
        { name: 'githubListRepoContents', definition: githubListRepoContentsDef, executor: githubListRepoContents },
        { name: 'githubGetFileContent', definition: githubGetFileContentDef, executor: githubGetFileContent },
        { name: 'githubSearchCode', definition: githubSearchCodeDef, executor: githubSearchCode },
        { name: 'githubSearchRepos', definition: githubSearchReposDef, executor: githubSearchRepos },
        { name: 'githubSearchIssues', definition: githubSearchIssuesDef, executor: githubSearchIssues },
        { name: 'githubGetCommitHistory', definition: githubGetCommitHistoryDef, executor: githubGetCommitHistory },
        { name: 'githubGetIssues', definition: githubGetIssuesDef, executor: githubGetIssues },
        { name: 'githubListPulls', definition: githubListPullsDef, executor: githubListPulls },
        { name: 'githubGetPull', definition: githubGetPullDef, executor: githubGetPull },
        { name: 'githubGetPullRequestFiles', definition: githubGetPullRequestFilesDef, executor: githubGetPullRequestFiles },
        { name: 'githubCreatePullRequestReview', definition: githubCreatePullRequestReviewDef, executor: githubCreatePullRequestReview },
        { name: 'githubCreateIssue', definition: githubCreateIssueDef, executor: githubCreateIssue },
        { name: 'githubListIssueComments', definition: githubListIssueCommentsDef, executor: githubListIssueComments },
        { name: 'githubCreateIssueComment', definition: githubCreateIssueCommentDef, executor: githubCreateIssueComment },
        { name: 'githubUpdateIssue', definition: githubUpdateIssueDef, executor: githubUpdateIssue },
        { name: 'githubListWorkflows', definition: githubListWorkflowsDef, executor: githubListWorkflows },
        { name: 'githubListWorkflowRuns', definition: githubListWorkflowRunsDef, executor: githubListWorkflowRuns },
        { name: 'githubCreateOrUpdateFile', definition: githubCreateOrUpdateFileDef, executor: githubCreateOrUpdateFile },
        { name: 'githubDeleteFile', definition: githubDeleteFileDef, executor: githubDeleteFile },
        { name: 'githubCreatePullRequest', definition: githubCreatePullRequestDef, executor: githubCreatePullRequest },
        { name: 'githubMergePullRequest', definition: githubMergePullRequestDef, executor: githubMergePullRequest },
        { name: 'githubCreateBranch', definition: githubCreateBranchDef, executor: githubCreateBranch },
        { name: 'githubDeleteBranch', definition: githubDeleteBranchDef, executor: githubDeleteBranch },
        { name: 'githubForkRepo', definition: githubForkRepoDef, executor: githubForkRepo },
        { name: 'githubCreateRepo', definition: githubCreateRepoDef, executor: githubCreateRepo },
        { name: 'githubUpdateRepo', definition: githubUpdateRepoDef, executor: githubUpdateRepo },
        { name: 'githubDeleteRepo', definition: githubDeleteRepoDef, executor: githubDeleteRepo },
        { name: 'githubCreateRelease', definition: githubCreateReleaseDef, executor: githubCreateRelease },
        { name: 'githubListBranches', definition: githubListBranchesDef, executor: githubListBranches },
        { name: 'githubCompareCommits', definition: githubCompareCommitsDef, executor: githubCompareCommits },
        { name: 'githubTriggerWorkflow', definition: githubTriggerWorkflowDef, executor: githubTriggerWorkflow },
        { name: 'githubGetReadme', definition: githubGetReadmeDef, executor: githubGetReadme },
        { name: 'githubGetRateLimit', definition: githubGetRateLimitDef, executor: githubGetRateLimit }
    ])

    // 笔记工具（个）
    registerTools([
        { name: 'createNote', definition: createNoteDef, executor: createNote },
        { name: 'listNotes', definition: listNotesDef, executor: listNotes },
        { name: 'queryKnowledge', definition: queryKnowledgeDef, executor: queryKnowledge }
    ])

    // 文本处理工具（个）
    registerTools([
        { name: 'summarizeText', definition: summarizeTextDef, executor: summarizeText },
        { name: 'formatText', definition: formatTextDef, executor: formatText },
        { name: 'translateText', definition: translateTextDef, executor: translateText }
    ])

    // 代码工具（个）
    registerTools([
        { name: 'executeCode', definition: executeCodeDef, executor: executeCode },
        { name: 'analyzeCode', definition: analyzeCodeDef, executor: analyzeCode }
    ])

    // 网络工具（个）
    registerTools([
        { name: 'webSearch', definition: webSearchDef, executor: webSearch },
        { name: 'fetchUrl', definition: fetchUrlDef, executor: fetchUrl }
    ])

    // 系统工具（个）
    registerTools([
        { name: 'getCurrentTime', definition: getCurrentTimeDef, executor: getCurrentTime },
        { name: 'getWeather', definition: getWeatherDef, executor: getWeather },
        { name: 'calculate', definition: calculateDef, executor: calculate },
        { name: 'testEcho', definition: testEchoDef, executor: testEcho }
    ])

    // 飞书文档工具（3个）
    registerTools([
        { name: 'feishuDocCreate', definition: feishuDocCreateDef, executor: feishuDocCreate },
        { name: 'feishuDocRead', definition: feishuDocReadDef, executor: feishuDocRead },
        { name: 'feishuDocMeta', definition: feishuDocMetaDef, executor: feishuDocMeta },
        { name: 'feishuDocSearch', definition: feishuDocSearchDef, executor: feishuDocSearch },
        { name: 'feishuDocBlocks', definition: feishuDocBlocksDef, executor: feishuDocBlocks },
        { name: 'feishuDocAppend', definition: feishuDocAppendDef, executor: feishuDocAppend },
        { name: 'feishuDocUpdateBlock', definition: feishuDocUpdateBlockDef, executor: feishuDocUpdateBlock },
        { name: 'feishuDocDeleteBlock', definition: feishuDocDeleteBlockDef, executor: feishuDocDeleteBlock },
        { name: 'feishuDocInsertImage', definition: feishuDocInsertImageDef, executor: feishuDocInsertImage },
        { name: 'feishuDocShare', definition: feishuDocShareDef, executor: feishuDocShare },
        { name: 'feishuDocUnshare', definition: feishuDocUnshareDef, executor: feishuDocUnshare },
        { name: 'feishuImSend', definition: feishuImSendDef, executor: feishuImSend },
        { name: 'feishuUserSearch', definition: feishuUserSearchDef, executor: feishuUserSearch }
    ])

    // 飞书 Wiki 知识库工具（13个）
    registerTools([
        { name: 'feishuWikiSpaceCreate', definition: feishuWikiSpaceCreateDef, executor: feishuWikiSpaceCreate },
        { name: 'feishuWikiSpaceList', definition: feishuWikiSpaceListDef, executor: feishuWikiSpaceList },
        { name: 'feishuWikiSpaceGet', definition: feishuWikiSpaceGetDef, executor: feishuWikiSpaceGet },
        { name: 'feishuWikiSpaceUpdate', definition: feishuWikiSpaceUpdateDef, executor: feishuWikiSpaceUpdate },
        { name: 'feishuWikiSpaceDelete', definition: feishuWikiSpaceDeleteDef, executor: feishuWikiSpaceDelete },
        { name: 'feishuWikiNodeCreate', definition: feishuWikiNodeCreateDef, executor: feishuWikiNodeCreate },
        { name: 'feishuWikiNodeList', definition: feishuWikiNodeListDef, executor: feishuWikiNodeList },
        { name: 'feishuWikiNodeDelete', definition: feishuWikiNodeDeleteDef, executor: feishuWikiNodeDelete },
        { name: 'feishuWikiNodeMove', definition: feishuWikiNodeMoveDef, executor: feishuWikiNodeMove },
        { name: 'feishuWikiMoveDoc', definition: feishuWikiMoveDocDef, executor: feishuWikiMoveDoc },
        { name: 'feishuWikiMemberList', definition: feishuWikiMemberListDef, executor: feishuWikiMemberList },
        { name: 'feishuWikiMemberAdd', definition: feishuWikiMemberAddDef, executor: feishuWikiMemberAdd },
        { name: 'feishuWikiMemberRemove', definition: feishuWikiMemberRemoveDef, executor: feishuWikiMemberRemove },
    ])

    // 语雀文档工具（个）
    registerTools([
        { name: 'yuqueRepoList', definition: yuqueRepoListDef, executor: yuqueRepoList },
        { name: 'yuqueTocGet', definition: yuqueTocGetDef, executor: yuqueTocGet },
        { name: 'yuqueDocList', definition: yuqueDocListDef, executor: yuqueDocList },
        { name: 'yuqueDocRead', definition: yuqueDocReadDef, executor: yuqueDocRead },
        { name: 'yuqueDocCreate', definition: yuqueDocCreateDef, executor: yuqueDocCreate },
        { name: 'yuqueDocUpdate', definition: yuqueDocUpdateDef, executor: yuqueDocUpdate },
        { name: 'yuqueDocDelete', definition: yuqueDocDeleteDef, executor: yuqueDocDelete },
        { name: 'yuqueImageUpload', definition: yuqueImageUploadDef, executor: yuqueImageUpload },
        { name: 'yuqueSearch', definition: yuqueSearchDef, executor: yuqueSearch },
    ])

    // 语雀知识库管理工具（6个）
    registerTools([
        { name: 'yuqueRepoCreate', definition: yuqueRepoCreateDef, executor: yuqueRepoCreate },
        { name: 'yuqueRepoUpdate', definition: yuqueRepoUpdateDef, executor: yuqueRepoUpdate },
        { name: 'yuqueRepoDelete', definition: yuqueRepoDeleteDef, executor: yuqueRepoDelete },
        { name: 'yuqueRepoGet', definition: yuqueRepoGetDef, executor: yuqueRepoGet },
        { name: 'yuqueRepoSettingGet', definition: yuqueRepoSettingGetDef, executor: yuqueRepoSettingGet },
        { name: 'yuqueRepoSettingUpdate', definition: yuqueRepoSettingUpdateDef, executor: yuqueRepoSettingUpdate },
    ])

    // Skill 加载工具（个）- 供 Agent 主动加载 Skill 内容
    registerTools([
        { name: 'loadSkill', definition: loadSkillDef, executor: executeLoadSkill }
    ])

    // Meta 查询工具（个）- 供 Agent 查询系统能力全貌
    registerTools([
        { name: 'getAllTools', definition: getAllToolsDef, executor: executeGetAllTools },
        { name: 'getAllSkills', definition: getAllSkillsDef, executor: executeGetAllSkills }
    ])

    // 能力搜索工具（个）- 供 Agent 通过关键词搜索工具和 Skills
    registerTools([
        { name: 'searchCapabilities', definition: searchCapabilitiesDef, executor: executeSearchCapabilities }
    ])

    console.log(`[ToolSystem] ${getRegisteredToolNames().length} 个工具已初始化`)
}

// 自动初始化（如果在浏览器环境中）
if (typeof window !== 'undefined') {
    initializeDefaultTools()
}

