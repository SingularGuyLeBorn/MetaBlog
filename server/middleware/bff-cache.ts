/**
 * ============================================================================
 * BFF 响应缓存中间件
 * ============================================================================
 *
 * 纯服务端内存缓存，**绝不涉及浏览器 localStorage**。
 *
 * 设计目标：
 * - 减少重复的外部 API 调用(GitHub/Lark/Yuque 等)
 * - 只缓存安全的 GET 2xx 响应
 * - 写操作(POST/PUT/PATCH/DELETE)绝不缓存
 *
 * 缓存位置：Node.js 进程内存(Map)
 * 缓存键：  `${method}:${targetUrl}`
 * 默认 TTL：30 秒
 */

interface CacheEntry {
  status: number;
  headers: Record<string, string>;
  body: string;
  expiresAt: number;
}

/**
 * 创建 BFF 缓存中间件
 *
 * 每个实例拥有独立的缓存存储，互不干扰。
 *
 * @param ttlMs 缓存有效期(毫秒)，默认 30000(30 秒)
 * @param keyFn 自定义缓存键生成函数(默认按 method + URL)
 */
export function createBffCache(
  ttlMs = 30000,
  keyFn?: (req: any) => string | null // 返回 null 表示跳过缓存
) {
  const cache = new Map<string, CacheEntry>();

  /** 清理过期缓存条目 */
  function cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) {
        cache.delete(key);
      }
    }
  }

  return {
    /**
     * 尝试从缓存中读取响应
     * 如果命中，直接写入 res 并返回 true
     */
    tryRead(req: any, res: any): boolean {
      if (req.method !== "GET") return false;

      const key = keyFn ? keyFn(req) : `GET:${req.url}`;
      if (!key) return false;

      const entry = cache.get(key);
      if (!entry) return false;

      // 过期则删除并跳过
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return false;
      }

      res.statusCode = entry.status;
      Object.entries(entry.headers).forEach(([k, v]) => res.setHeader(k, v));
      res.end(entry.body);
      return true;
    },

    /**
     * 将响应写入缓存
     * 仅对 GET 2xx 响应进行缓存
     */
    write(req: any, status: number, headers: Record<string, string>, body: string): void {
      if (req.method !== "GET") return;
      if (status < 200 || status >= 300) return;

      const key = keyFn ? keyFn(req) : `GET:${req.url}`;
      if (!key) return;

      cache.set(key, {
        status,
        headers,
        body,
        expiresAt: Date.now() + ttlMs,
      });
    },

    /** 测试用：清空缓存 */
    clear(): void {
      cache.clear();
    },

    /** 测试用：获取缓存大小 */
    size(): number {
      return cache.size;
    },
  };
}

/** 默认 BFF 缓存实例(30 秒 TTL) */
export const bffCache = createBffCache();
