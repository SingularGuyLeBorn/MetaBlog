/**
 * ============================================================================
 * 搜索路由 - index
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes/search
 */


import type { ViteDevServer } from "vite";
import type { RouteContext } from "../platform/types";
import { smartSearch, getEngineStatus } from "./router";
import type { SearchEngineName } from "./types";

async function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

/**
 * 注册搜索聚合路由
 *
 * 挂载 /api/search 端点,作为智能搜索的统一入口. 
 * 实际搜索逻辑由 search/router.ts 中的 smartSearch 处理,
 * 支持多引擎优先级调度、自动故障转移和健康追踪. 
 *
 * @param server - Vite 开发服务器实例
 * @param _ctx   - 路由上下文(预留)
 */
export function registerSearchRoutes(server: ViteDevServer, _ctx: RouteContext) {
  // ============================================
  // 搜索主接口
  // ============================================
  server.middlewares.use("/api/search", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      const body = await readBody(req);
      const { query, limit = 10, engine } = body;

      if (!query || typeof query !== "string") {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "query is required" }));
        return;
      }

      const preferredEngine = engine as SearchEngineName | undefined;
      const result = await smartSearch(query, Math.min(limit, 30), preferredEngine);

      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          data: {
            query: result.query,
            results: result.results,
            engine: result.engine,
            total: result.total,
          },
        })
      );
    } catch (error: any) {
      console.error("[Search] Error:", error);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: false,
          error: error.message || "Search failed",
        })
      );
    }
  });

  // ============================================
  // 搜索引擎状态接口(调试用)
  // ============================================
  server.middlewares.use("/api/search/status", async (req, res, next) => {
    if (req.method !== "GET") return next();

    try {
      const status = getEngineStatus();
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          data: status,
        })
      );
    } catch (error: any) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  });
}
