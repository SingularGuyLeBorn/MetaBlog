/**
 * ============================================================================
 * 文章管理工具模块
 * ============================================================================
 *
 * 提供博客文章的 CRUD 操作和查询能力。
 * 所有操作均受安全边界限制（只能操作 posts/knowledge/resources 板块）。
 */

// 读取操作
export { getArticleContentDef, getArticleContent } from './read'

// 写入操作
export { createArticleDef, createArticle } from './write'
export { updateArticleDef, updateArticle } from './write'
export { deleteArticleDef, deleteArticle } from './write'

// 查询操作
export { searchArticlesDef, searchArticles } from './query'
export { listArticlesDef, listArticles } from './query'
