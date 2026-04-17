/**
 * 网络工具集
 * 包含：网页搜索、URL 获取等功能
 */

export { webSearch, fetchUrl } from './executors'
export { webSearchDef, fetchUrlDef } from './definitions'

// 搜索子模块导出（方便外部扩展新搜索引擎）
export { searchWeb, getAvailableEngines } from './search'
export type { SearchResult, SearchOptions } from './search'
