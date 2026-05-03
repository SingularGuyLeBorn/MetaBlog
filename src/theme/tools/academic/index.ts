/**
 * ============================================================================
 * 主题入口导出
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme
 */


// ArXiv
export {
  fetchArxiv, fetchArxivDef, searchArxiv, searchArxivDef
} from './arxiv'
export type { ArxivPaper } from './arxiv'

// OpenReview
export {
  fetchOpenReview, fetchOpenReviewDef, searchOpenReview, searchOpenReviewDef
} from './openreview'

// HuggingFace
export {
  fetchHuggingFaceModel, fetchHuggingFaceModelDef, searchHuggingFace, searchHuggingFaceDef
} from './huggingface'

// Papers With Code & Semantic Scholar
export {
  searchPapersWithCode, searchPapersWithCodeDef, searchSemanticScholar, searchSemanticScholarDef
} from './other'

// 聚合定义
import { fetchArxivDef, searchArxivDef } from './arxiv'
import { fetchHuggingFaceModelDef, searchHuggingFaceDef } from './huggingface'
import { fetchOpenReviewDef, searchOpenReviewDef } from './openreview'
import { searchPapersWithCodeDef, searchSemanticScholarDef } from './other'

/**
 * 学术工具定义聚合对象
 *
 * 将所有学术搜索工具的定义汇总到一个对象中,
 * 便于在工具注册系统中统一注册. 
 */
export const academicToolDefinitions = {
  searchArxiv: searchArxivDef,
  fetchArxiv: fetchArxivDef,
  searchHuggingface: searchHuggingFaceDef,
  fetchHuggingfaceModel: fetchHuggingFaceModelDef,
  searchPaperswithcode: searchPapersWithCodeDef,
  searchSemanticScholar: searchSemanticScholarDef,
  searchOpenreview: searchOpenReviewDef,
  fetchOpenreview: fetchOpenReviewDef
}

/**
 * 学术工具名称列表
 *
 * 从 academicToolDefinitions 中自动提取的工具名称数组,
 * 用于权限控制、日志记录等需要枚举工具名的场景. 
 */
export const academicToolNames = Object.keys(academicToolDefinitions)
