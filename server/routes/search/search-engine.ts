/**
 * 免费搜索引擎封装
 * 使用 DuckDuckGo Lite（无需 API Key，无需登录）
 *
 * 代理支持：读取环境变量 HTTPS_PROXY / HTTP_PROXY，自动走代理
 */

import { HttpsProxyAgent } from "https-proxy-agent";

/** 获取代理 Agent（如果配置了环境变量） */
function getProxyAgent(): any | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
  if (!proxyUrl) return undefined;
  return new HttpsProxyAgent(proxyUrl);
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
}

/**
 * 通过 DuckDuckGo Lite 搜索
 * URL: https://html.duckduckgo.com/html/?q=关键词
 * 完全免费，无需 API Key
 */
export async function searchDuckDuckGo(query: string, limit = 10): Promise<SearchResponse> {
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const agent = getProxyAgent();
  const res = await fetch(searchUrl, {
    agent,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    },
  } as any);

  if (!res.ok) {
    throw new Error(`DuckDuckGo search failed: HTTP ${res.status}`);
  }

  const html = await res.text();
  const results = parseDuckDuckGoHtml(html, limit);

  return {
    query,
    results,
  };
}

/**
 * 解析 DuckDuckGo Lite 返回的 HTML
 */
function parseDuckDuckGoHtml(html: string, limit: number): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo Lite 的结果结构：
  // <div class="result results_links results_links_deep web-result">
  //   <h2 class="result__title"><a class="result__a" href="...">标题</a></h2>
  //   <a class="result__url" href="...">显示URL</a>
  //   <div class="result__snippet">摘要</div>
  // </div>

  const resultBlocks = html.match(/<div[^>]*class="result[^"]*"[^>]*>[\s\S]*?<\/div>\s*(?=<div[^>]*class="result|<\/div>\s*<\/div>\s*<\/body>|$)/gi) || [];

  for (const block of resultBlocks) {
    if (results.length >= limit) break;

    // 提取标题和链接
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/i);
    if (!titleMatch) continue;

    const url = decodeHtmlEntities(titleMatch[1].trim());
    const title = stripHtml(titleMatch[2]).trim();

    // 提取摘要
    const snippetMatch = block.match(/<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
    const snippet = snippetMatch ? stripHtml(snippetMatch[1]).trim() : "";

    // 过滤掉广告和无效结果
    if (!url || url.startsWith("/") || !title) continue;
    if (url.includes("duckduckgo.com") || url.includes("duck.co")) continue;

    results.push({
      title,
      url,
      snippet,
      source: "duckduckgo",
    });
  }

  return results;
}

/** 去除 HTML 标签 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 解码 HTML 实体 */
function decodeHtmlEntities(str: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&nbsp;": " ",
  };
  return str.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (match) => entities[match] || match);
}
