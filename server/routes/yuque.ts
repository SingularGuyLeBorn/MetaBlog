import type { ViteDevServer } from "vite";
import type { RouteContext } from "./proxy";

// =============================================================================
// 语雀 (Yuque) 内部 Web API 路由
// =============================================================================
//
// 【重要说明】
// 本路由使用语雀的「内部 Web API」，通过浏览器 Cookie 认证。
// 与官方 Open API v2 的区别：
//   - 无需 Personal Access Token（不需要超级会员）
//   - 使用 Cookie: _yuque_session + _ctoken 认证
//   - 端点前缀是 /api/... 而不是 /api/v2/...
//
// 【配置方法】
// 在 .env 文件中添加：
//   YUQUE_SESSION=从浏览器Cookie复制的_yuque_session值
//   YUQUE_CTOKEN=从浏览器Cookie复制的_ctoken值
//
// 【获取 Cookie 步骤】
//   1. 登录语雀网页版 https://www.yuque.com
//   2. 按 F12 打开浏览器开发者工具
//   3. 切换到 Application（应用）标签
//   4. 左侧点击 Cookies → https://www.yuque.com
//   5. 找到 _yuque_session，双击 Value 列复制值
//   6. 找到 _ctoken，双击 Value 列复制值
//   7. 粘贴到 .env 文件中
//
// 【安全提醒】
//   _yuque_session 和 _ctoken 是你的登录凭证，等同于账号密码。
//   切勿泄露给他人，切勿提交到 Git 仓库！
//   .env 文件已被 .gitignore 保护，不会进入版本控制。
//
// 【API 端点总览】
//   读取操作（无需 CSRF）：
//     GET  /api/books                    → 列出知识库
//     GET  /api/books/{id}/toc           → 获取目录
//     GET  /api/docs/{slug}?book_id={id} → 读取文档
//
//   写操作（需要 X-CSRF-Token + Referer）：
//     POST   /api/docs                   → 创建文档
//     PUT    /api/docs/{id}              → 更新文档
//     DELETE /api/docs/{id}?book_id={id} → 删除文档
// =============================================================================

const YUQUE_BASE = "https://www.yuque.com";

// =============================================================================
// 认证相关函数
// =============================================================================

/**
 * 从环境变量获取语雀认证凭据
 *
 * 需要同时配置 YUQUE_SESSION 和 YUQUE_CTOKEN，缺一不可。
 * 如果只配了一个，会抛出错误并提示配置方法。
 */
function getYuqueCredentials(): { session: string; ctoken: string } {
  const session = process.env.YUQUE_SESSION;
  const ctoken = process.env.YUQUE_CTOKEN;

  if (!session || !ctoken) {
    throw new Error(
      "【语雀认证失败】YUQUE_SESSION 或 YUQUE_CTOKEN 未配置。\n\n" +
      "配置方法：\n" +
      "  1. 登录语雀网页版 https://www.yuque.com\n" +
      "  2. F12 → Application → Cookies → https://www.yuque.com\n" +
      "  3. 复制 _yuque_session 和 _ctoken 的 Value\n" +
      "  4. 粘贴到 .env 文件：\n" +
      "       YUQUE_SESSION=xxx\n" +
      "       YUQUE_CTOKEN=xxx\n\n" +
      "注意：这两个值是你的登录凭证，不要泄露给他人！"
    );
  }

  return { session, ctoken };
}

/**
 * 构建 HTTP 请求头
 *
 * 【注意】写操作（POST/PUT/DELETE）必须提供 referer 参数，
 * 否则语雀会返回 403 "missing csrf referer or origin" 错误。
 */
function buildHeaders(ctoken: string, referer?: string): Record<string, string> {
  const headers: Record<string, string> = {
    // 模拟浏览器请求，避免被识别为机器人
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    // 语雀 Web API 返回 JSON
    "Accept": "application/json, text/plain, */*",
    // CSRF 防护：_ctoken 的值必须放在这个 header 里
    "X-CSRF-Token": ctoken,
    // 标记为 Ajax 请求，某些接口需要
    "X-Requested-With": "XMLHttpRequest",
  };

  // 【关键】写操作必须有 Referer，否则 403
  if (referer) {
    headers["Referer"] = referer;
  }

  return headers;
}

// =============================================================================
// 通用 API 调用函数
// =============================================================================

/**
 * 调用语雀内部 Web API
 *
 * @param method  HTTP 方法：GET / POST / PUT / DELETE
 * @param path    API 路径（不含域名前缀）
 * @param body    请求体（POST/PUT 时使用）
 * @param query   URL 查询参数
 * @param referer Referer 头（写操作必需）
 */
async function yuqueApi(
  method: string,
  path: string,
  body?: any,
  query?: Record<string, string>,
  referer?: string
): Promise<any> {
  // 1. 获取认证凭据
  const { session, ctoken } = getYuqueCredentials();

  // 2. 拼接完整 URL
  let url = `${YUQUE_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += "?" + params.toString();
  }

  // 3. 构建请求头
  const headers = buildHeaders(ctoken, referer);
  // Cookie 是认证的核心：_yuque_session 是登录态，_ctoken 是 CSRF token
  headers["Cookie"] = `_yuque_session=${session}; _ctoken=${ctoken}`;

  // 4. 写操作需要 Content-Type
  if (body && method !== "GET" && method !== "DELETE") {
    headers["Content-Type"] = "application/json";
  }

  // 5. 发送请求
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // 6. 解析响应
  const data = await res.json();
  return data;
}

// =============================================================================
// 工具函数
// =============================================================================

/** 解析请求体中的 JSON 数据 */
function parseBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        // 解析失败时返回空对象，避免报错中断
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

// =============================================================================
// 路由注册
// =============================================================================

export function registerYuqueRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { structuredLog } = ctx;

  // ==========================================================================
  // 1. 健康检查
  // ==========================================================================
  // GET /api/yuque/health
  // 用途：验证语雀连接是否正常，返回知识库数量
  // ==========================================================================
  server.middlewares.use("/api/yuque/health", async (req, res, next) => {
    if (req.method !== "GET") { next(); return; }
    try {
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

  // ==========================================================================
  // 2. 知识库：列出
  // ==========================================================================
  // GET /api/yuque/repos
  // 返回当前登录用户的所有知识库（Book/Repo）列表
  //
  // 响应示例：
  //   {"data": [
  //     {"id": 68025057, "slug": "qah8x7", "name": "LLM知识库", ...},
  //     ...
  //   ]}
  // ==========================================================================
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

  // ==========================================================================
  // 3. 知识库：获取目录（TOC）
  // ==========================================================================
  // GET /api/yuque/toc?repo_id={repo_id}
  // 返回知识库的目录结构，包含 TITLE（目录项）和 DOC（文档项）
  //
  // 响应示例：
  //   {"data": {"toc": [
  //     {"uuid": "xxx", "type": "TITLE", "title": "第一章", "level": 0, ...},
  //     {"uuid": "xxx", "type": "DOC", "title": "文档1", "url": "slug123", "level": 1, ...}
  //   ]}}
  // ==========================================================================
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

  // ==========================================================================
  // 4. 文档：读取
  // ==========================================================================
  // GET /api/yuque/doc/read?repo_id={repo_id}&doc_slug={doc_slug}
  // 返回文档详情，包括标题、内容、格式等
  //
  // 【注意】内容字段是 content（Lake 格式 HTML），不是 body 或 body_asl
  //
  // 响应示例：
  //   {"data": {
  //     "id": 266422684,
  //     "title": "文档标题",
  //     "slug": "buslgogeucwcim33",
  //     "content": "<!doctype lake>...",
  //     "format": "lake",
  //     ...
  //   }}
  // ==========================================================================
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

  // ==========================================================================
  // 5. 文档：创建
  // ==========================================================================
  // POST /api/yuque/doc/create
  // Body: { repo_id, title, body?, format?, public? }
  //
  // 【注意】
  //   - body 必须是 Lake 格式 HTML（以 <!doctype lake> 开头）
  //   - 必须提供 Referer，否则 403
  //
  // 响应示例：
  //   {"data": {"id": 266476793, "slug": "nxh6ktx04drq0uft", "title": "...", ...}}
  // ==========================================================================
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

  // ==========================================================================
  // 6. 文档：更新
  // ==========================================================================
  // PUT /api/yuque/doc/update
  // Body: { repo_id, doc_id, title?, body?, format? }
  //
  // 【注意】
  //   - doc_id 是数字 ID，不是 slug
  //   - 必须先调用 read 获取 doc_id
  //   - 必须提供 Referer，否则 403
  // ==========================================================================
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

  // ==========================================================================
  // 7. 文档：删除
  // ==========================================================================
  // DELETE /api/yuque/doc/delete
  // Body: { repo_id, doc_id }
  //
  // 【注意】
  //   - doc_id 是数字 ID，不是 slug
  //   - 必须提供 Referer，否则 403
  // ==========================================================================
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
