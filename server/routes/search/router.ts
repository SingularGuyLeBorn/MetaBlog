/**
 * ============================================================================
 * 搜索路由 - router
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes/search
 */


import type { SearchEngineConfig, SearchEngineName, SearchResponse, SearchResult } from "./types";
import {
  searchBaiduQianfan,
  searchBocha,
  searchBrave,
  searchBing,
  searchBingCrawler,
  searchDuckDuckGo,
  searchLangSearch,
  searchMetaso,
  searchSearXNG,
  searchTavily,
} from "./engines";

// ==================== 配置读取 ====================

/** 默认引擎优先级(国内优先) */
const DEFAULT_PRIORITY: SearchEngineName[] = [
  "baidu_qianfan",
  "metaso",
  "bocha",
  "langsearch",
  "tavily",
  "brave",
  "bing",
  "bing_crawler",
  "duckduckgo",
  "searxng",
];

/** 读取环境变量 */
function env(key: string, fallback = ""): string {
  return process.env[key] || process.env[key.replace("SEARCH_", "")] || fallback;
}

/** 初始化引擎配置 */
function initEngineConfigs(): Map<SearchEngineName, SearchEngineConfig> {
  const configs = new Map<SearchEngineName, SearchEngineConfig>();

  // 从环境变量读取用户自定义优先级
  const customPriority = env("SEARCH_ENGINE_PRIORITY")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean) as SearchEngineName[];

  const priorityList = customPriority.length > 0 ? customPriority : DEFAULT_PRIORITY;

  for (let i = 0; i < priorityList.length; i++) {
    const name = priorityList[i];
    const apiKey = getApiKeyForEngine(name);

    configs.set(name, {
      name,
      enabled: true,
      apiKey: apiKey || undefined,
      priority: i,
      failCount: 0,
      lastFailTime: 0,
      disabledUntil: 0,
    });
  }

  return configs;
}

/** 获取引擎对应的 API Key */
function getApiKeyForEngine(name: SearchEngineName): string {
  const keyMap: Record<SearchEngineName, string[]> = {
    baidu_qianfan: ["SEARCH_BAIDU_QIANFAN_API_KEY", "BAIDU_QIANFAN_API_KEY", "QIANFAN_API_KEY"],
    metaso: ["SEARCH_METASO_API_KEY", "METASO_API_KEY"],
    bocha: ["SEARCH_BOCHA_API_KEY", "BOCHA_API_KEY"],
    langsearch: ["SEARCH_LANGSEARCH_API_KEY", "LANGSEARCH_API_KEY"],
    tavily: ["SEARCH_TAVILY_API_KEY", "TAVILY_API_KEY"],
    brave: ["SEARCH_BRAVE_API_KEY", "BRAVE_API_KEY"],
    bing: ["SEARCH_BING_API_KEY", "BING_API_KEY"],
    bing_crawler: [],
    duckduckgo: [],
    searxng: [],
  };

  for (const key of keyMap[name] || []) {
    const value = env(key);
    if (value && value.length > 5 && !value.includes("your-")) {
      return value;
    }
  }
  return "";
}

// ==================== 引擎执行器 ====================

/** 执行单个引擎搜索 */
async function executeEngine(
  name: SearchEngineName,
  query: string,
  limit: number,
  apiKey?: string
): Promise<SearchResult[]> {
  switch (name) {
    case "baidu_qianfan":
      if (!apiKey) throw new Error("API Key not configured");
      return await searchBaiduQianfan(query, limit, apiKey);
    case "metaso":
      if (!apiKey) throw new Error("API Key not configured");
      return await searchMetaso(query, limit, apiKey);
    case "bocha":
      if (!apiKey) throw new Error("API Key not configured");
      return await searchBocha(query, limit, apiKey);
    case "langsearch":
      if (!apiKey) throw new Error("API Key not configured");
      return await searchLangSearch(query, limit, apiKey);
    case "tavily":
      if (!apiKey) throw new Error("API Key not configured");
      return await searchTavily(query, limit, apiKey);
    case "brave":
      if (!apiKey) throw new Error("API Key not configured");
      return await searchBrave(query, limit, apiKey);
    case "bing":
      if (!apiKey) throw new Error("API Key not configured");
      return await searchBing(query, limit, apiKey);
    case "bing_crawler":
      return await searchBingCrawler(query, limit);
    case "duckduckgo":
      return await searchDuckDuckGo(query, limit);
    case "searxng":
      return await searchSearXNG(query, limit);
    default:
      throw new Error(`Unknown engine: ${name}`);
  }
}

// ==================== 健康度管理 ====================

const MAX_FAIL_COUNT = 3;
const DISABLE_DURATION_MS = 10 * 60 * 1000; // 禁用 10 分钟

/** 更新引擎健康状态 */
function recordSuccess(config: SearchEngineConfig): void {
  config.failCount = 0;
  config.disabledUntil = 0;
}

function recordFailure(config: SearchEngineConfig, error: string): void {
  config.failCount++;
  config.lastFailTime = Date.now();

  if (config.failCount >= MAX_FAIL_COUNT) {
    config.disabledUntil = Date.now() + DISABLE_DURATION_MS;
    console.warn(
      `[SearchRouter] 引擎 ${config.name} 连续失败 ${MAX_FAIL_COUNT} 次,临时禁用 ${DISABLE_DURATION_MS / 60000} 分钟. 错误: ${error}`
    );
  }
}

function isAvailable(config: SearchEngineConfig): boolean {
  if (!config.enabled) return false;
  if (config.disabledUntil > Date.now()) return false;
  return true;
}

// ==================== 主路由器 ====================

const engineConfigs = initEngineConfigs();

/**
 * 智能搜索 - 多引擎路由
 *
 * @param query 搜索关键词
 * @param limit 返回结果数量上限
 * @param preferredEngine 优先使用的引擎(可选)
 * @returns 搜索结果
 */
export async function smartSearch(
  query: string,
  limit: number = 10,
  preferredEngine?: SearchEngineName
): Promise<SearchResponse> {
  if (!query || query.trim() === "") {
    throw new Error("query is required");
  }

  // 构建候选引擎列表
  const candidates: SearchEngineConfig[] = [];

  // 如果指定了优先引擎,先尝试
  if (preferredEngine && engineConfigs.has(preferredEngine)) {
    const cfg = engineConfigs.get(preferredEngine)!;
    if (isAvailable(cfg)) {
      candidates.push(cfg);
    }
  }

  // 按优先级添加其他可用引擎
  const sorted = Array.from(engineConfigs.values()).sort((a, b) => a.priority - b.priority);
  for (const cfg of sorted) {
    if (cfg.name !== preferredEngine && isAvailable(cfg)) {
      candidates.push(cfg);
    }
  }

  if (candidates.length === 0) {
    throw new Error("所有搜索引擎均不可用,请检查网络连接或 API Key 配置");
  }

  // 依次尝试每个引擎
  const errors: string[] = [];

  for (const cfg of candidates) {
    try {
      console.log(`[SearchRouter] 尝试引擎: ${cfg.name} (优先级 ${cfg.priority})`);
      const results = await executeEngine(cfg.name, query, limit, cfg.apiKey);

      if (results.length > 0) {
        recordSuccess(cfg);
        console.log(`[SearchRouter] ✓ 引擎 ${cfg.name} 返回 ${results.length} 条结果`);
        return {
          query,
          results,
          engine: cfg.name,
          total: results.length,
        };
      } else {
        errors.push(`${cfg.name}: 返回空结果`);
        recordFailure(cfg, "empty results");
      }
    } catch (error: any) {
      const msg = error.message || String(error);
      errors.push(`${cfg.name}: ${msg}`);
      recordFailure(cfg, msg);
      console.warn(`[SearchRouter] ✗ 引擎 ${cfg.name} 失败: ${msg}`);
    }
  }

  // 所有引擎都失败了
  throw new Error(`搜索失败,所有引擎均不可用:\n${errors.join("\n")}`);
}

/**
 * 获取当前搜索引擎状态(用于调试)
 */
export function getEngineStatus(): Array<{
  name: string;
  enabled: boolean;
  hasKey: boolean;
  available: boolean;
  failCount: number;
  disabledUntil?: string;
}> {
  return Array.from(engineConfigs.values())
    .sort((a, b) => a.priority - b.priority)
    .map((cfg) => ({
      name: cfg.name,
      enabled: cfg.enabled,
      hasKey: !!cfg.apiKey,
      available: isAvailable(cfg),
      failCount: cfg.failCount,
      disabledUntil: cfg.disabledUntil > Date.now() ? new Date(cfg.disabledUntil).toISOString() : undefined,
    }));
}
