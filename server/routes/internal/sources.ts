/**
 * ============================================================================
 * 内部业务路由 - sources
 * ============================================================================
 *
 * 可靠信源集合管理 API.
 * 供 Agent 维护一个可信的信息来源列表,用于后续信息检索时的信源过滤和引用.
 *
 * @module server/routes/internal
 */

import fs from "fs";
import path from "path";
import type { ViteDevServer } from "vite";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

/**
 * 注册信源管理路由
 *
 * 挂载 /api/sources/* 端点,支持信源的完整生命周期：
 * - 列表：读取 .data/sources/index.json
 * - 读取：解析单条信源
 * - 创建/更新：写回 JSON 文件
 * - 删除：从数组中移除
 * - 搜索：按名称/类型/标签模糊匹配
 *
 * @param server - Vite 开发服务器实例
 * @param ctx    - 路由上下文
 */
export function registerSourcesRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { structuredLog } = ctx;

  const SOURCES_DIR = path.join(process.cwd(), ".data", "sources");
  const SOURCES_FILE = path.join(SOURCES_DIR, "index.json");

  function ensureDir() {
    if (!fs.existsSync(SOURCES_DIR)) {
      fs.mkdirSync(SOURCES_DIR, { recursive: true });
    }
  }

  function readSources(): any[] {
    if (!fs.existsSync(SOURCES_FILE)) return [];
    try {
      return JSON.parse(fs.readFileSync(SOURCES_FILE, "utf-8"));
    } catch {
      return [];
    }
  }

  function writeSources(sources: any[]) {
    ensureDir();
    fs.writeFileSync(SOURCES_FILE, JSON.stringify(sources, null, 2), "utf-8");
  }

  function generateId(): string {
    return `src-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  // 解析请求体
  function parseBody(req: any): Promise<any> {
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

  // 发送 JSON 响应
  function sendJson(res: any, status: number, data: any) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  }

  // ============================================
  // GET/POST /api/sources - 列表/创建
  // ============================================
  server.middlewares.use("/api/sources", (req, res, next) => {
    const url = req.url || "";
    if (url !== "/" && url !== "" && !url.startsWith("?")) {
      return next();
    }

    // GET - 列表
    if (req.method === "GET") {
      const sources = readSources();
      sendJson(res, 200, { success: true, data: sources });
      return;
    }

    // POST - 创建
    if (req.method === "POST") {
      parseBody(req)
        .then((body) => {
          const { name, url: sourceUrl, type, description, reliability, language, tags } = body;

          if (!name || !name.trim()) {
            sendJson(res, 400, { success: false, error: "名称不能为空" });
            return;
          }
          if (!sourceUrl || !sourceUrl.trim()) {
            sendJson(res, 400, { success: false, error: "URL 不能为空" });
            return;
          }

          const sources = readSources();
          const newSource = {
            id: generateId(),
            name: name.trim(),
            url: sourceUrl.trim(),
            type: type || "general",
            description: description || "",
            reliability: Math.max(1, Math.min(5, Number(reliability) || 3)),
            language: language || "auto",
            tags: Array.isArray(tags) ? tags : [],
            enabled: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          sources.push(newSource);
          writeSources(sources);

          structuredLog?.("sources", "create", { id: newSource.id, name: newSource.name });
          sendJson(res, 200, { success: true, data: newSource });
        })
        .catch((err) => {
          sendJson(res, 500, { success: false, error: String(err) });
        });
      return;
    }

    next();
  });

  // ============================================
  // GET /api/sources/:id - 单条
  // ============================================
  server.middlewares.use("/api/sources/", (req, res, next) => {
    const url = req.url || "";
    const match = url.match(/^\/([^\/]+)$/);
    if (!match) return next();

    const id = match[1];
    if (id === "update" || id === "delete" || id === "search") return next();

    if (req.method === "GET") {
      const sources = readSources();
      const source = sources.find((s: any) => s.id === id);
      if (!source) {
        sendJson(res, 404, { success: false, error: "信源不存在" });
        return;
      }
      sendJson(res, 200, { success: true, data: source });
      return;
    }

    next();
  });

  // ============================================
  // POST /api/sources/update - 更新
  // ============================================
  server.middlewares.use("/api/sources/update", (req, res, next) => {
    if (req.method !== "POST") return next();

    parseBody(req)
      .then((body) => {
        const { id } = body;
        if (!id) {
          sendJson(res, 400, { success: false, error: "ID 不能为空" });
          return;
        }

        const sources = readSources();
        const idx = sources.findIndex((s: any) => s.id === id);
        if (idx === -1) {
          sendJson(res, 404, { success: false, error: "信源不存在" });
          return;
        }

        const source = sources[idx];
        if (body.name !== undefined) source.name = body.name.trim();
        if (body.url !== undefined) source.url = body.url.trim();
        if (body.type !== undefined) source.type = body.type;
        if (body.description !== undefined) source.description = body.description;
        if (body.reliability !== undefined) {
          source.reliability = Math.max(1, Math.min(5, Number(body.reliability)));
        }
        if (body.language !== undefined) source.language = body.language;
        if (body.tags !== undefined) source.tags = Array.isArray(body.tags) ? body.tags : [];
        if (body.enabled !== undefined) source.enabled = !!body.enabled;
        source.updatedAt = Date.now();

        writeSources(sources);
        structuredLog?.("sources", "update", { id: source.id, name: source.name });
        sendJson(res, 200, { success: true, data: source });
      })
      .catch((err) => {
        sendJson(res, 500, { success: false, error: String(err) });
      });
  });

  // ============================================
  // POST /api/sources/delete - 删除
  // ============================================
  server.middlewares.use("/api/sources/delete", (req, res, next) => {
    if (req.method !== "POST") return next();

    parseBody(req)
      .then((body) => {
        const { id } = body;
        if (!id) {
          sendJson(res, 400, { success: false, error: "ID 不能为空" });
          return;
        }

        const sources = readSources();
        const idx = sources.findIndex((s: any) => s.id === id);
        if (idx === -1) {
          sendJson(res, 404, { success: false, error: "信源不存在" });
          return;
        }

        const deleted = sources.splice(idx, 1)[0];
        writeSources(sources);
        structuredLog?.("sources", "delete", { id: deleted.id, name: deleted.name });
        sendJson(res, 200, { success: true, data: { id: deleted.id } });
      })
      .catch((err) => {
        sendJson(res, 500, { success: false, error: String(err) });
      });
  });

  // ============================================
  // POST /api/sources/search - 搜索
  // ============================================
  server.middlewares.use("/api/sources/search", (req, res, next) => {
    if (req.method !== "POST") return next();

    parseBody(req)
      .then((body) => {
        const { query, type, tag, minReliability, maxReliability, limit = 50 } = body;
        let sources = readSources();

        // 按名称/URL/描述模糊匹配
        if (query && query.trim()) {
          const q = query.trim().toLowerCase();
          sources = sources.filter(
            (s: any) =>
              (s.name && s.name.toLowerCase().includes(q)) ||
              (s.url && s.url.toLowerCase().includes(q)) ||
              (s.description && s.description.toLowerCase().includes(q))
          );
        }

        // 按类型过滤
        if (type && type.trim()) {
          sources = sources.filter((s: any) => s.type === type.trim());
        }

        // 按标签过滤
        if (tag && tag.trim()) {
          const t = tag.trim().toLowerCase();
          sources = sources.filter(
            (s: any) => s.tags && s.tags.some((tg: string) => tg.toLowerCase() === t)
          );
        }

        // 按可信度范围过滤
        if (minReliability !== undefined) {
          sources = sources.filter((s: any) => s.reliability >= Number(minReliability));
        }
        if (maxReliability !== undefined) {
          sources = sources.filter((s: any) => s.reliability <= Number(maxReliability));
        }

        // 只返回启用的
        sources = sources.filter((s: any) => s.enabled !== false);

        // 限制数量
        const limited = sources.slice(0, Math.min(100, Math.max(1, Number(limit) || 50)));

        sendJson(res, 200, {
          success: true,
          data: limited,
          meta: { total: limited.length, query: query || "" },
        });
      })
      .catch((err) => {
        sendJson(res, 500, { success: false, error: String(err) });
      });
  });
}
