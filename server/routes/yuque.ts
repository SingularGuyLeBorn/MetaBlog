import type { ViteDevServer } from "vite";
import type { RouteContext } from "./proxy";

/**
 * 语雀 (Yuque) 内部 Web API 路由
 * 使用浏览器 Cookie (_yuque_session + _ctoken) 直接调用语雀内部 Web API
 * 无需 Personal Access Token（无需超级会员）
 *
 * 配置方法：
 * 1. 登录语雀网页版
 * 2. F12 → Application → Cookies → https://www.yuque.com
 * 3. 复制 _yuque_session 和 _ctoken 的值到 .env：
 *    YUQUE_SESSION=xxx
 *    YUQUE_CTOKEN=xxx
 */

const YUQUE_BASE = "https://www.yuque.com";

/** 获取语雀认证凭据 */
function getYuqueCredentials(): { session: string; ctoken: string } {
  const session = process.env.YUQUE_SESSION;
  const ctoken = process.env.YUQUE_CTOKEN;

  if (!session || !ctoken) {
    throw new Error(
      "YUQUE_SESSION 或 YUQUE_CTOKEN 未配置。\n" +
      "获取方法: 登录语雀网页版 → F12 → Application → Cookies → https://www.yuque.com\n" +
      "复制 _yuque_session 和 _ctoken 的值到 .env"
    );
  }

  return { session, ctoken };
}

/** 构建通用请求头 */
function buildHeaders(ctoken: string, referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json, text/plain, */*",
    "X-CSRF-Token": ctoken,
    "X-Requested-With": "XMLHttpRequest",
  };
  if (referer) {
    headers["Referer"] = referer;
  }
  return headers;
}

/** 通用语雀 Web API 调用 */
async function yuqueApi(
  method: string,
  path: string,
  body?: any,
  query?: Record<string, string>,
  referer?: string
): Promise<any> {
  const { session, ctoken } = getYuqueCredentials();

  let url = `${YUQUE_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += "?" + params.toString();
  }

  const headers = buildHeaders(ctoken, referer);
  headers["Cookie"] = `_yuque_session=${session}; _ctoken=${ctoken}`;

  if (body && method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

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
        resolve({});
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
    if (req.method !== "GET") { next(); return; }
    try {
      const { session, ctoken } = getYuqueCredentials();
      const result = await yuqueApi("GET", "/api/books");
      const books = result.data || [];
      sendJson(res, 200, {
        success: true,
        connected: true,
        token_valid: true,
        books_count: books.length,
        hint: "语雀 Web API 连接正常",
      });
    } catch (e: any) {
      sendJson(res, 200, {
        success: false,
        connected: false,
        error: e.message,
        hint: "请检查 YUQUE_SESSION 和 YUQUE_CTOKEN 配置",
      });
    }
  });

  // ============================================
  // 知识库: 列出用户知识库
  // GET /api/yuque/repos
  // ============================================
  server.middlewares.use("/api/yuque/repos", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      structuredLog.info("yuque.repos", "列出语雀知识库");
      const result = await yuqueApi("GET", "/api/books");
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 知识库: 获取 TOC（目录结构）
  // GET /api/yuque/toc?repo_id=:repo_id
  // ============================================
  server.middlewares.use("/api/yuque/toc", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const repoId = url.searchParams.get("repo_id");
      if (!repoId) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 参数" });
        return;
      }

      structuredLog.info("yuque.toc", "获取语雀目录", { repo_id: repoId });
      const result = await yuqueApi("GET", `/api/books/${repoId}/toc`);
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 读取
  // GET /api/yuque/doc/read?repo_id=:repo_id&doc_slug=:doc_slug
  // ============================================
  server.middlewares.use("/api/yuque/doc/read", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
      const url = new URL(req.url!, `http://localhost`);
      const repoId = url.searchParams.get("repo_id");
      const docSlug = url.searchParams.get("doc_slug");
      if (!repoId || !docSlug) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 doc_slug 参数" });
        return;
      }

      structuredLog.info("yuque.doc.read", "读取语雀文档", { repo_id: repoId, doc_slug: docSlug });
      const result = await yuqueApi("GET", `/api/docs/${docSlug}`, undefined, { book_id: repoId });
      sendJson(res, result.data ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });

  // ============================================
  // 文档: 创建
  // POST /api/yuque/doc/create
  // Body: { repo_id, title, body, format?, public? }
  // ============================================
  server.middlewares.use("/api/yuque/doc/create", async (req, res, next) => {
    if (req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const { repo_id, title, body: docBody, format = "lake", public: isPublic } = body;

      if (!repo_id || !title) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 title 参数" });
        return;
      }

      const payload: any = {
        book_id: Number(repo_id),
        title: String(title),
        format: String(format),
      };
      if (docBody !== undefined) payload.body = String(docBody);
      if (isPublic !== undefined) payload.public = Number(isPublic);

      structuredLog.info("yuque.doc.create", "创建语雀文档", { repo_id, title });
      const result = await yuqueApi(
        "POST",
        "/api/docs",
        payload,
        undefined,
        `${YUQUE_BASE}/${repo_id}`
      );
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
    if (req.method !== "PUT" && req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const { repo_id, doc_id, title, body: docBody, format = "lake" } = body;

      if (!repo_id || !doc_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 doc_id 参数" });
        return;
      }

      const payload: any = { format: String(format) };
      if (title !== undefined) payload.title = String(title);
      if (docBody !== undefined) payload.body = String(docBody);

      structuredLog.info("yuque.doc.update", "更新语雀文档", { repo_id, doc_id });
      const result = await yuqueApi(
        "PUT",
        `/api/docs/${doc_id}`,
        payload,
        undefined,
        `${YUQUE_BASE}/${repo_id}`
      );
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
    if (req.method !== "DELETE" && req.method !== "POST") { next(); return; }
    try {
      const body = await parseBody(req);
      const { repo_id, doc_id } = body;

      if (!repo_id || !doc_id) {
        sendJson(res, 400, { code: -1, msg: "缺少 repo_id 或 doc_id 参数" });
        return;
      }

      structuredLog.info("yuque.doc.delete", "删除语雀文档", { repo_id, doc_id });
      const result = await yuqueApi(
        "DELETE",
        `/api/docs/${doc_id}`,
        undefined,
        { book_id: String(repo_id) },
        `${YUQUE_BASE}/${repo_id}`
      );
      sendJson(res, result.data !== undefined ? 200 : 400, result);
    } catch (e: any) {
      sendJson(res, 500, { code: -1, msg: e.message });
    }
  });
}
