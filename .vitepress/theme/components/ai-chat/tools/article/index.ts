/**
 * 文章管理工具集
 * 提供文章增删改查功能
 */

// 导出执行器
export {
  createArticle,
  getArticle,
  updateArticle,
  deleteArticle,
  listArticles,
  searchArticles
} from './executors'

// 导出定义
export {
  createArticleDef,
  getArticleDef,
  updateArticleDef,
  deleteArticleDef,
  listArticlesDef,
  searchArticlesDef
} from './definitions'

// 导出类型
export type { Article } from './executors'
