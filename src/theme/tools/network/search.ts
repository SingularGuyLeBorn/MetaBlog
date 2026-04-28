/**
 * 网络搜索核心模块
 * 调用后端 /api/search（DuckDuckGo 免费搜索）
 */

export interface SearchOptions {
  query: string;
  num_results?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  results: SearchResult[];
  formatted: string;
}

/**
 * 获取可用搜索引擎列表
 */
export function getAvailableEngines(): string[] {
  return ['duckduckgo'];
}

/**
 * 执行网络搜索
 */
export async function searchWeb(options: SearchOptions): Promise<SearchResponse> {
  const { query, num_results = 5 } = options;

  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: num_results }),
  });

  if (!response.ok) {
    throw new Error(`Search failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Search failed');
  }

  const results: SearchResult[] = data.data?.results || [];

  if (results.length === 0) {
    throw new Error('No search results found');
  }

  // 格式化为文本
  const formatted = results
    .map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`)
    .join('\n\n');

  return {
    results,
    formatted,
  };
}
