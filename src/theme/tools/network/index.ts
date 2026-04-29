/**
 * 网络工具集
 * 包含：网页搜索等功能
 */

export { webSearch, webSearchDef } from './web-search'

// 搜索子模块导出(方便外部扩展新搜索引擎)
export { getAvailableEngines, searchWeb } from './search'
export type { SearchOptions, SearchResult } from './search'
