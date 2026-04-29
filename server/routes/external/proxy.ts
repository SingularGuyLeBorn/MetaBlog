import type { ViteDevServer } from "vite";
import { translateGitHubError } from "../../utils/github-error-translator";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

/**
 * 通用 HTTP 错误翻译器
 * 为任意外部网站的 HTTP 错误提供中文解释
 */
function translateHttpError(status: number, statusText: string, url: string): { message: string; suggestion: string } {
  const hostname = new URL(url).hostname;
  switch (status) {
    case 400:
      return { message: `请求格式错误 (${hostname})`, suggestion: "请检查 URL 参数、请求头或请求体格式是否正确" };
    case 401:
      return { message: `未授权 (${hostname})`, suggestion: "该资源需要认证，请检查是否需要登录或提供 API Key/Token" };
    case 403:
      return { message: `访问被拒绝 (${hostname})`, suggestion: "服务器拒绝了访问请求，可能是 IP 被封禁、缺少权限或触发了反爬虫机制。请检查是否需要添加 User-Agent 或其他请求头" };
    case 404:
      return { message: `页面或资源不存在 (${hostname})`, suggestion: "请检查 URL 是否正确，或该页面是否已被删除/移动" };
    case 405:
      return { message: `HTTP 方法不被允许 (${hostname})`, suggestion: "请确认使用的请求方法(GET/POST 等)被该 URL 支持" };
    case 408:
      return { message: `请求超时 (${hostname})`, suggestion: "服务器在预定时间内未收到完整请求，请稍后重试" };
    case 409:
      return { message: `资源冲突 (${hostname})`, suggestion: "请求与服务器当前状态冲突，请稍后重试" };
    case 410:
      return { message: `资源已永久删除 (${hostname})`, suggestion: "该资源已被永久删除，无法访问" };
    case 429:
      return { message: `请求过于频繁 (${hostname})`, suggestion: "触发了速率限制，请降低请求频率，稍后重试。建议增加请求间隔或使用缓存" };
    case 500:
      return { message: `服务器内部错误 (${hostname})`, suggestion: "目标服务器异常，请稍后重试" };
    case 502:
      return { message: `网关错误 (${hostname})`, suggestion: "目标服务器上游异常或暂时不可用，请稍后重试" };
    case 503:
      return { message: `服务不可用 (${hostname})`, suggestion: "目标服务器可能正在维护或过载，请稍后重试" };
    case 504:
      return { message: `网关超时 (${hostname})`, suggestion: "目标服务器响应超时，请稍后重试或尝试缩短请求内容" };
    default:
      return { message: `HTTP ${status} ${statusText} (${hostname})`, suggestion: `目标服务器返回了 ${status} 状态码，请检查 URL 和请求参数是否正确` };
  }
}

export function registerProxyRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;

  // ============================================
  // Image Proxy - 图片代理（绕过防盗链）
  // ============================================
  server.middlewares.use("/api/image-proxy", async (req, res, next) => {
    if (req.method !== "GET") return next();

    const urlParam = new URL(req.url || "", `http://localhost`).searchParams.get("url");
    if (!urlParam) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: "Missing url parameter" }));
      return;
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(urlParam);
    } catch {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: "Invalid URL format" }));
      return;
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: "Only HTTP/HTTPS allowed" }));
      return;
    }

    // 根据目标域名设置合适的 Referer，绕过防盗链
    const hostname = targetUrl.hostname;
    let referer = targetUrl.origin + "/";
    if (hostname.includes("mp.weixin.qq.com") || hostname.includes("mmbiz.qpic.cn") || hostname.includes("mmbiz.qlogo.cn")) {
      referer = "https://mp.weixin.qq.com/";
    } else if (hostname.includes("zhimg.com")) {
      referer = "https://zhuanlan.zhihu.com/";
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const fetchResponse = await fetch(urlParam, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
          Referer: referer,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!fetchResponse.ok) {
        res.statusCode = fetchResponse.status;
        res.end(JSON.stringify({ success: false, error: `HTTP ${fetchResponse.status}` }));
        return;
      }

      const blob = await fetchResponse.blob();
      const contentType = fetchResponse.headers.get("content-type") || blob.type || "image/png";
      const buffer = Buffer.from(await blob.arrayBuffer());

      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.end(buffer);
    } catch (err: any) {
      console.error("[ImageProxy] Failed:", err.message);
      res.statusCode = 502;
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
  });

  // ============================================
  // Proxy API - 网络抓取代理
  // ============================================

  server.middlewares.use("/api/proxy/fetch", async (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      let reqError: Error | null = null;
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("error", (err) => { reqError = err; });
      req.on("end", async () => {
        if (reqError) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: reqError.message }));
          return;
        }
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { url, timeout = 15000, headers: customHeaders = {}, retries = 2 } = body;

          if (!url) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({ success: false, error: "URL required" }),
            );
            return;
          }

          // 验证 URL 格式
          let targetUrl: URL;
          try {
            targetUrl = new URL(url);
          } catch {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error: "Invalid URL format",
              }),
            );
            return;
          }

          // 只允许 http/https
          if (!["http:", "https:"].includes(targetUrl.protocol)) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error: "Only HTTP/HTTPS allowed",
              }),
            );
            return;
          }

          structuredLog.info("proxy.fetch.started", `Fetching ${url}`, {
            url,
            timeout,
            retries,
          });

          // 重试辅助
          const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
          const jitter = () => Math.floor(Math.random() * 300);

          let lastError: any = null;
          let attempt = 0;
          while (attempt <= retries) {
            attempt++;
            if (attempt > 1) {
              const delay = 500 * (attempt - 1) + jitter();
              structuredLog.info("proxy.fetch.retry", `Retry ${attempt}/${retries + 1} for ${url} after ${delay}ms`);
              await sleep(delay);
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            try {
              const fetchResponse = await fetch(url, {
                method: "GET",
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                  Accept:
                    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                  "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                  ...customHeaders,
                },
                signal: controller.signal,
                // @ts-ignore - undici/node fetch option
                keepalive: false,
              });

              clearTimeout(timeoutId);

              if (!fetchResponse.ok) {
                // 对可重试状态码进行重试
                const retryable = [429, 502, 503, 504].includes(fetchResponse.status);
                if (retryable && attempt <= retries) {
                  lastError = { status: fetchResponse.status, statusText: fetchResponse.statusText };
                  continue;
                }
                structuredLog.warn(
                  "proxy.fetch.failed",
                  `Failed to fetch ${url}`,
                  { status: fetchResponse.status },
                );
                const translated = translateHttpError(fetchResponse.status, fetchResponse.statusText, url);
                res.statusCode = fetchResponse.status;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`,
                    message: translated.message,
                    suggestion: translated.suggestion,
                    code: fetchResponse.status,
                    url,
                  }),
                );
                return;
              }

              const data = await fetchResponse.text();
              structuredLog.success(
                "proxy.fetch.completed",
                `Fetched ${url}`,
                { size: data.length, attempts: attempt },
              );

              res.setHeader(
                "Content-Type",
                fetchResponse.headers.get("content-type") ||
                "text/plain; charset=utf-8",
              );
              res.end(data);
              return;
            } catch (fetchError: any) {
              clearTimeout(timeoutId);
              const isTimeout =
                fetchError.name === "AbortError" ||
                fetchError.message?.includes("timeout");
              const isRetryable = !isTimeout || attempt <= retries;
              lastError = fetchError;

              if (isRetryable && attempt <= retries) {
                structuredLog.warn("proxy.fetch.retryable", `Attempt ${attempt} failed for ${url}: ${fetchError.message}`);
                continue;
              }

              const errorMsg = isTimeout
                ? `请求超时 (${timeout}ms)`
                : `请求失败: ${fetchError.message}`;

              structuredLog.error(
                "proxy.fetch.error",
                `Error fetching ${url}`,
                {
                  error: fetchError.message,
                  isTimeout,
                  attempts: attempt,
                },
              );

              const translated = isTimeout
                ? { message: `请求超时 (${targetUrl.hostname})`, suggestion: `目标服务器在 ${timeout}ms 内未响应，请稍后重试或增加超时时间` }
                : { message: `网络请求失败 (${targetUrl.hostname})`, suggestion: `请求无法完成，可能是 DNS 解析失败、网络断开或目标服务器拒绝连接。错误信息：${fetchError.message}` };
              res.statusCode = isTimeout ? 504 : 502;
              res.end(
                JSON.stringify({
                  success: false,
                  error: errorMsg,
                  message: translated.message,
                  suggestion: translated.suggestion,
                  code: isTimeout ? 504 : 502,
                  details: {
                    url,
                    hostname: targetUrl.hostname,
                    isTimeout,
                    rawError: fetchError.message,
                  },
                }),
              );
              return;
            }
          }
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // ============================================
  // MCP API - 执行 MCP 工具
  // ============================================

  // 列出所有 MCP 工具
  server.middlewares.use("/api/mcp/tools", async (req, res, next) => {
    if (req.method === "GET") {
      try {
        // MCP 模块暂未迁移到新路径
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, data: [], message: 'MCP module not available' }));
      } catch (e) {
        res.statusCode = 500;
        res.end(
          JSON.stringify({
            success: false,
            error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
    } else next();
  });

  // 执行 MCP 工具
  server.middlewares.use("/api/mcp/execute", async (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { serverId, toolName, args = {} } = body;

          // MCP 模块暂未迁移到新路径
          const result = { error: 'MCP module not available', serverId, toolName, args };

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: result }));
        } catch (e) {
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              success: false,
              error: e instanceof Error ? e.message : String(e),
            }),
          );
        }
      });
    } else next();
  });

  // ============================================
  // GitHub API 代理 - 避免前端直接调用
  // ============================================

  // 获取仓库信息 - /api/github/repo/{owner}/{repo}
  // URL 格式: /api/github/repo/facebook/react
  server.middlewares.use(
    "/api/github/repo/",
    async (req, res, next) => {
      if (req.method === "GET") {
        try {
          // req.url 是相对路径，如 "facebook/react" 或 "/facebook/react"
          const url = req.url || "";
          const cleanUrl = url.split("?")[0].replace(/^\//, ""); // 移除 query string 和开头的 /
          const parts = cleanUrl.split("/").filter(Boolean);

          structuredLog.info("github.repo.request", `Request: ${url}`, {
            cleanUrl,
            parts,
          });

          if (parts.length < 2) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error: "Missing owner or repo",
              }),
            );
            return;
          }
          const [owner, repo] = parts;

          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}`,
            {
              headers: {
                "User-Agent": "MetaBlog-ToolTester/1.0",
                Accept: "application/vnd.github.v3+json",
              },
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            const translated = translateGitHubError(`HTTP ${response.status}: ${errorText.slice(0, 500)}`);
            let original: any;
            try { original = JSON.parse(errorText); } catch { original = errorText; }
            res.statusCode = response.status;
            res.end(
              JSON.stringify({
                success: false,
                error: `GitHub API ${response.status}: ${response.statusText}`,
                message: translated.message,
                suggestion: translated.suggestion,
                code: translated.code,
                original,
              }),
            );
            return;
          }

          const data = await response.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } catch (e) {
          const translated = translateGitHubError(e instanceof Error ? e.message : String(e));
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              success: false,
              error: e instanceof Error ? e.message : String(e),
              message: translated.message,
              suggestion: translated.suggestion,
              code: -1,
            }),
          );
        }
      } else next();
    },
  );

  // 获取文件内容 - /api/github/file/{owner}/{repo}/{ref}/{path}`
  // URL 格式: /api/github/file/octocat/Hello-World/main/README
  server.middlewares.use(
    "/api/github/file/",
    async (req, res, next) => {
      if (req.method === "GET") {
        try {
          // req.url 是相对路径，如 "octocat/Hello-World/main/README"
          const url = req.url || "";
          const cleanUrl = url.split("?")[0].replace(/^\//, "");
          const parts = cleanUrl.split("/").filter(Boolean);

          structuredLog.info("github.file.request", `Request: ${url}`, {
            cleanUrl,
            parts,
          });

          if (parts.length < 4) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error: "Missing owner, repo, ref or path",
              }),
            );
            return;
          }
          // 格式: owner/repo/ref/path
          const [owner, repo, ref, ...pathParts] = parts;
          const path = pathParts.join("/");

          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
            {
              headers: {
                "User-Agent": "MetaBlog-ToolTester/1.0",
                Accept: "application/vnd.github.v3+json",
              },
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            const translated = translateGitHubError(`HTTP ${response.status}: ${errorText.slice(0, 500)}`);
            let original: any;
            try { original = JSON.parse(errorText); } catch { original = errorText; }
            res.statusCode = response.status;
            res.end(
              JSON.stringify({
                success: false,
                error: `GitHub API ${response.status}: ${response.statusText}`,
                message: translated.message,
                suggestion: translated.suggestion,
                code: translated.code,
                original,
              }),
            );
            return;
          }

          const data = await response.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } catch (e) {
          const translated = translateGitHubError(e instanceof Error ? e.message : String(e));
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              success: false,
              error: e instanceof Error ? e.message : String(e),
              message: translated.message,
              suggestion: translated.suggestion,
              code: -1,
            }),
          );
        }
      } else next();
    },
  );

  // 获取提交历史 - /api/github/commits/{owner}/{repo}/{ref}`
  // URL 格式: /api/github/commits/octocat/Hello-World/main
  server.middlewares.use(
    "/api/github/commits/",
    async (req, res, next) => {
      if (req.method === "GET") {
        try {
          // req.url 是相对路径，如 "octocat/Hello-World/main" 或 "octocat/Hello-World"
          const url = req.url || "";
          const cleanUrl = url.split("?")[0].replace(/^\//, "");
          const parts = cleanUrl.split("/").filter(Boolean);

          structuredLog.info(
            "github.commits.request",
            `Request: ${url}`,
            { cleanUrl, parts },
          );

          if (parts.length < 2) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error: "Missing owner or repo",
              }),
            );
            return;
          }
          // 格式: owner/repo 或 owner/repo/ref
          const [owner, repo, ref = "main"] = parts;
          const per_page =
            new URL(url, `http://localhost`).searchParams.get(
              "per_page",
            ) || "5";

          const response = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/commits?sha=${ref}&per_page=${per_page}`,
            {
              headers: {
                "User-Agent": "MetaBlog-ToolTester/1.0",
                Accept: "application/vnd.github.v3+json",
              },
            },
          );

          if (!response.ok) {
            const errorText = await response.text();
            const translated = translateGitHubError(`HTTP ${response.status}: ${errorText.slice(0, 500)}`);
            let original: any;
            try { original = JSON.parse(errorText); } catch { original = errorText; }
            res.statusCode = response.status;
            res.end(
              JSON.stringify({
                success: false,
                error: `GitHub API ${response.status}: ${response.statusText}`,
                message: translated.message,
                suggestion: translated.suggestion,
                code: translated.code,
                original,
              }),
            );
            return;
          }

          const data = await response.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
        } catch (e) {
          const translated = translateGitHubError(e instanceof Error ? e.message : String(e));
          res.statusCode = 500;
          res.end(
            JSON.stringify({
              success: false,
              error: e instanceof Error ? e.message : String(e),
              message: translated.message,
              suggestion: translated.suggestion,
              code: -1,
            }),
          );
        }
      } else next();
    },
  );

}
