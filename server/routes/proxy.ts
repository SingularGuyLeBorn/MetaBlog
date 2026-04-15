import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

export function registerProxyRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // Proxy API - 网络抓取代理
  // ============================================

  server.middlewares.use("/api/proxy/fetch", async (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { url, timeout = 10000 } = body;

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
          });

          // 使用 Node.js fetch (兼容 Node 16+)
          structuredLog.info("proxy.fetch.request", `Fetching ${url}`, {
            hostname: targetUrl.hostname,
          });

          // 创建 AbortController 实现超时（兼容 Node 16）
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            timeout,
          );

          try {
            const fetchResponse = await fetch(url, {
              method: "GET",
              headers: {
                "User-Agent":
                  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept:
                  "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!fetchResponse.ok) {
              structuredLog.warn(
                "proxy.fetch.failed",
                `Failed to fetch ${url}`,
                { status: fetchResponse.status },
              );
              res.statusCode = fetchResponse.status;
              res.end(
                JSON.stringify({
                  success: false,
                  error: `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`,
                }),
              );
              return;
            }

            const data = await fetchResponse.text();
            structuredLog.success(
              "proxy.fetch.completed",
              `Fetched ${url}`,
              { size: data.length },
            );

            res.setHeader(
              "Content-Type",
              fetchResponse.headers.get("content-type") ||
                "text/plain; charset=utf-8",
            );
            res.end(data);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            const isTimeout =
              fetchError.name === "AbortError" ||
              fetchError.message?.includes("timeout");
            const errorMsg = isTimeout
              ? `请求超时 (${timeout}ms)`
              : `请求失败: ${fetchError.message}`;

            structuredLog.error(
              "proxy.fetch.error",
              `Error fetching ${url}`,
              {
                error: fetchError.message,
                isTimeout,
              },
            );

            res.statusCode = isTimeout ? 504 : 502;
            res.end(
              JSON.stringify({
                success: false,
                error: errorMsg,
                details: {
                  url,
                  hostname: targetUrl.hostname,
                  isTimeout,
                },
              }),
            );
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
            res.statusCode = response.status;
            res.end(
              JSON.stringify({
                success: false,
                error: `GitHub API error: ${response.status}`,
              }),
            );
            return;
          }

          const data = await response.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
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
    },
  );

  // 获取文件内容 - /api/github/file/{owner}/{repo}/{ref}/{path}
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
            res.statusCode = response.status;
            res.end(
              JSON.stringify({
                success: false,
                error: `GitHub API error: ${response.status}`,
              }),
            );
            return;
          }

          const data = await response.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
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
    },
  );

  // 获取提交历史 - /api/github/commits/{owner}/{repo}/{ref}
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
            res.statusCode = response.status;
            res.end(
              JSON.stringify({
                success: false,
                error: `GitHub API error: ${response.status}`,
              }),
            );
            return;
          }

          const data = await response.json();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(data));
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
    },
  );

}
