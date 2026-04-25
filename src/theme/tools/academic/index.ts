/**
 * 学术研究工具集
 * 包含：ArXiv、OpenReview、HuggingFace、PapersWithCode、Semantic Scholar
 * 所有工具均使用免费公开 API，无需认证
 */

// ArXiv
export {
  searchArxiv,
  fetchArxiv,
  searchArxivDef,
  fetchArxivDef
} from './arxiv'
export type { ArxivPaper } from './arxiv'

// OpenReview
export {
  searchOpenReview,
  fetchOpenReview,
  searchOpenReviewDef,
  fetchOpenReviewDef
} from './openreview'

// HuggingFace
export {
  searchHuggingFace,
  fetchHuggingFaceModel,
  searchHuggingFaceDef,
  fetchHuggingFaceModelDef
} from './huggingface'

// Papers With Code & Semantic Scholar
export {
  searchPapersWithCode,
  searchSemanticScholar,
  searchPapersWithCodeDef,
  searchSemanticScholarDef
} from './other'

// 聚合定义
import { searchArxivDef, fetchArxivDef } from './arxiv'
import { searchHuggingFaceDef, fetchHuggingFaceModelDef } from './huggingface'
import { searchPapersWithCodeDef, searchSemanticScholarDef } from './other'
import { searchOpenReviewDef, fetchOpenReviewDef } from './openreview'

export const academicToolDefinitions = {
  search_arxiv: searchArxivDef,
  fetch_arxiv: fetchArxivDef,
  search_huggingface: searchHuggingFaceDef,
  fetch_huggingface_model: fetchHuggingFaceModelDef,
  search_paperswithcode: searchPapersWithCodeDef,
  search_semantic_scholar: searchSemanticScholarDef,
  search_openreview: searchOpenReviewDef,
  fetch_openreview: fetchOpenReviewDef
}

export const academicToolNames = Object.keys(academicToolDefinitions)
