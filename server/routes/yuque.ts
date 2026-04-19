import type { ViteDevServer } from "vite";
import type { RouteContext } from "./proxy";

/**
 * 语雀 (Yuque) Open API 直连路由
 * 使用 Personal Access Token 直接调用语雀 REST API
 * 需要在 .env 中设置 YUQUE_TOKEN
 */

const YUQUE_BASE = "https://www.yuque.com/api/v2";

/** 获取语雀 Token */
function getYuqueToken(): string {
  const token = process.env.YUQUE_TOKEN;
  if (!token) {
    throw new Error(
      "YUQUE_TOKEN 未配置。请在 .env 中设置: YUQUE_TOKEN=your_personal_access_token"
    );
  }
  return token;
}

/** 通用语雀 API 调用 */
async function yuqueApi(
  method: string,
  path: string,
  body?: any,
  query?: Record<string, string>
): Promise<any> {
  const token = getYuqueToken();

  let url = `${YUQUE_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += "?" + params.toString();
  }

  const headers: Record<string, string> = {
    "X-Auth-Token": token,
    "Content-Type": "application/json",
  };

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  return data;
}

/** 解析 JSON body */
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

/** 发送 JSON 响应 */
function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

export function registerYuqueRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { structuredLog } = ctx;

  // ============================================
  // 健康检查
  // GET /api/yuque/health
  // ============================================
  server.middlewares.use("/api/yuque/health", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const token = getYuqueToken();
      const result = await yuqueApi("GET", "/user");
      sendJson(res, 200, {
        success: true,
        connected: true,
        token_valid: !!token,
        user: result.data?.login || null,
        hint: "语雀 API 连接正常",
      });
    } catch (e: any) {
      sendJson(res, 200, {
        success: false,
        connected: false,
        error: e.message,
        hint: "请检查 YUQUE_TOKEN 配置",
      });
    }
  });

  // ============================================
  // 知识库: 列出用户知识库
  // GET /api/yuque/repos?login=:login
  // ============================================
  server.middlewares.use("/api/yuque/repos", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const login = url.searchParams.get("login");
      if (!login) {
        sendJson(res, 400, { code: -1, msg: "缺少 login 参数（用户/团队登录名）" });
        return;
      }

      structuredLog.info("yuque.repos", "列出语雀知识库", { login });
      const result = await yuqueApi("GET", `/users/${login}/repos`);
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 知识库: 获取知识库 TOC（目录结构）
  // GET /api/yuque/toc?repo_id=:repo_id
  // ============================================
  server.middlewares.use("/api/yuque/toc", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const repoId = url.searchParams.get("repo_id");
      if (!repoId) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 参数" });
        return;
      }

      structuredLog.info("yuque.toc", "获取语雀目录", { repo_id: repoId });
      const result = await yuqueApi("GET", `/repos/${repoId}/toc`);
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 列出知识库文档
  // GET /api/yuque/docs?repo_id=:repo_id
  // ============================================
  server.middlewares.use("/api/yuque/docs", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const repoId = url.searchParams.get("repo_id");
      if (!repoId) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 参数" });
        return;
      }

      structuredLog.info("yuque.docs", "列出语雀文档", { repo_id: repoId });
      const result = await yuqueApi("GET", `/repos/${repoId}/docs`);
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 读取
  // GET /api/yuque/doc/read?repo_id=:repo_id&doc_id=:doc_id
  // ============================================
  server.middlewares.use("/api/yuque/doc/read", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const repoId = url.searchParams.get("repo_id");
      const docId = url.searchParams.get("doc_id");
      if (!repoId || !docId) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 doc_id 参数" });
        return;
      }

      structuredLog.info("yuque.doc.read", "读取语雀文档", { repo_id: repoId, doc_id: docId });
      const result = await yuqueApi("GET", `/repos/${repoId}/docs/${docId}`);
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 创建
  // POST /api/yuque/doc/create
  // Body: { repo_id, title, body, format?, slug?, public? }
  // ============================================
  server.middlewares.use("/api/yuque/doc/create", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const { repo_id, title, body: docBody, format = "markdown", slug, public: isPublic } = body;

      if (!repo_id || !title) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 title 参数" });
        return;
      }

      const payload: any = {
        title: String(title),
        format: String(format),
      };
      if (docBody !== undefined) payload.body = String(docBody);
      if (slug) payload.slug = String(slug);
      if (isPublic !== undefined) payload.public = Number(isPublic);

      structuredLog.info("yuque.doc.create", "创建语雀文档", { repo_id, title });
      const result = await yuqueApi("POST", `/repos/${repo_id}/docs`, payload);
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 更新
  // PUT /api/yuque/doc/update
  // Body: { repo_id, doc_id, title?, body?, format? }
  // ============================================
  server.middlewares.use("/api/yuque/doc/update", async (req, res, next) => {
    if (req.method !== "PUT" && req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const { repo_id, doc_id, title, body: docBody, format = "markdown" } = body;

      if (!repo_id || !doc_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 doc_id 参数" });
        return;
      }

      const payload: any = { format: String(format) };
      if (title !== undefined) payload.title = String(title);
      if (docBody !== undefined) payload.body = String(docBody);

      structuredLog.info("yuque.doc.update", "更新语雀文档", { repo_id, doc_id });
      const result = await yuqueApi("PUT", `/repos/${repo_id}/docs/${doc_id}`, payload);
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 删除
  // DELETE /api/yuque/doc/delete
  // Body: { repo_id, doc_id }
  // ============================================
  server.middlewares.use("/api/yuque/doc/delete", async (req, res, next) => {
    if (req.method !== "DELETE" && req.method !== "POST") {
      next();
      return;
    }
    try {
      const body = await parseBody(req);
      const { repo_id, doc_id } = body;

      if (!repo_id || !doc_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 doc_id 参数" });
        return;
      }

      structuredLog.info("yuque.doc.delete", "删除语雀文档", { repo_id, doc_id });
      const result = await yuqueApi("DELETE", `/repos/${repo_id}/docs/${doc_id}`);
      sendJson(res, result.data !== undefined ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 搜索
  // GET /api/yuque/search?q=:query&type=:type
  // ============================================
  server.middlewares.use("/api/yuque/search", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const q = url.searchParams.get("q");
      const type = url.searchParams.get("type") || "doc";
      if (!q) {
        sendJson(res, 400, { code: -1, msg: "缺少 q 参数（搜索关键词）" });
        return;
      }

      structuredLog.info("yuque.search", "搜索语雀", { q, type });
      const result = await yuqueApi("GET", "/search", undefined, {
        q: String(q),
        type: String(type),
      });
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });
}
