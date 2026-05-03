/**
 * ============================================================================
 * 中间件 - rate-limit
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/middleware
 */


/**
 * ============================================================================
 * BFF 速率限制中间件
 * ============================================================================
 *
 * 保护外部 API 不被前端工具滥用,按客户端 IP + 请求路径做滑动窗口限流. 
 *
 * 默认限制：
 * - 窗口：60 秒
 * - 最大请求数：30 次/窗口(外部 API 代理)
 * - 超出返回 429 Too Many Requests
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const limiters = new Map<string, Bucket>();

/** 清理过期的限流记录(防止内存泄漏) */
function cleanupExpired(now: number): void {
  for (const [key, bucket] of limiters.entries()) {
    if (now > bucket.resetAt) {
      limiters.delete(key);
    }
  }
}

/**
 * 创建速率限制中间件
 *
 * @param windowMs   时间窗口(毫秒),默认 60 秒
 * @param maxRequests 窗口内最大请求数,默认 30
 * @param keyFn      自定义限流键生成函数(默认按 IP + URL)
 */
export function createRateLimit(
  windowMs = 60000,
  maxRequests = 30,
  keyFn?: (req: any) => string
) {
  return (req: any, res: any, next: () => void): void => {
    const now = Date.now();

    // 每 100 次请求触发一次清理
    if (Math.random() < 0.01) {
      cleanupExpired(now);
    }

    const key = keyFn
      ? keyFn(req)
      : `${req.socket?.remoteAddress || req.headers["x-forwarded-for"] || "unknown"}:${req.method}:${req.url}`;

    const bucket = limiters.get(key);

    if (!bucket || now > bucket.resetAt) {
      // 新窗口或窗口已过期
      limiters.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      res.statusCode = 429;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded",
          retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
        })
      );
      return;
    }

    bucket.count++;
    next();
  };
}

/**
 * 按外部 API 域名分组的速率限制
 *
 * GitHub 认证用户每小时 5000 次,我们按 60 秒 30 次(约 1800 次/小时)保守限制,
 * 为其他用途(如人工操作、其他工具)保留配额. 
 */
export const rateLimitExternal = createRateLimit(60000, 30);

/**
 * 更宽松的内部 API 限流
 */
export const rateLimitInternal = createRateLimit(60000, 120);
