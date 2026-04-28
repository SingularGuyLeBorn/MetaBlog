/**
 * ============================================================================
 * 文章管理工具模块
 * ============================================================================
 *
 * 提供博客文章的 CRUD 操作和查询能力。
 * 所有操作均受安全边界限制(只能操作 posts/knowledge/resources 板块)。
 */

// 读取操作
export { getArticleContent, getArticleContentDef } from './read'

// 写入操作
export { createArticle, createArticleDef, deleteArticle, deleteArticleDef, updateArticle, updateArticleDef } from './write'

// 查询操作
export { listArticles, listArticlesDef, searchArticles, searchArticlesDef } from './query'

