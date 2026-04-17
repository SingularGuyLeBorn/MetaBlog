/**
 * 网络搜索类型定义
 */

export interface SearchResult {
  title: string
  url: string
  displayUrl: string
  snippet: string
}

export interface SearchEngine {
  name: string
  search(query: string, maxResults: number): Promise<SearchResult[]>
}

export interface SearchOptions {
  query: string
  num_results?: number
  engine?: string
}
