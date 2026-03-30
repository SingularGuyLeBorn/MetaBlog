/**
 * 学术研究工具集
 * 包含：ArXiv、OpenReview、HuggingFace、PapersWithCode、Semantic Scholar
 * 所有工具均使用免费公开 API，无需认证
 */

// 导出执行器
export {
  searchArxiv,
  fetchArxiv,
  searchOpenReview,
  fetchOpenReview,
  searchHuggingFace,
  fetchHuggingFaceModel,
  searchPapersWithCode,
  searchSemanticScholar
} from './executors'

// 导出定义
export {
  searchArxivDef,
  fetchArxivDef,
  searchOpenReviewDef,
  fetchOpenReviewDef,
  searchHuggingFaceDef,
  fetchHuggingFaceModelDef,
  searchPapersWithCodeDef,
  searchSemanticScholarDef,
  academicToolDefinitions,
  academicToolNames
} from './definitions'

// 导出类型
export type { ArxivPaper } from './executors'
