/**
 * ============================================================================
 * GitHub BFF 路由
 * ============================================================================
 *
 * 双模式架构：
 * 1. 显式路由(推荐)：POST /api/github/tools/execute
 *    - 后端执行业务逻辑(参数校验、错误翻译、结果格式化)
 *    - 前端工具只需调用统一端点
 * 2. 透明代理(fallback)：/api/github/*
 *    - 直接透传到 https://api.github.com/*
 *    - 用于未被显式路由覆盖的端点
 *
 * 安全：GITHUB_TOKEN 仅从服务端环境变量读取，不暴露到前端构建产物。
 */

import type { ViteDevServer } from "vite";
import { github } from "../../config/env";
import { createBffCache } from "../../middleware/bff-cache";
import { rateLimitExternal } from "../../middleware/rate-limit";
import { translateGitHubError } from "../../utils/github-error-translator";
import { executeGitHubTool, listGitHubTools } from "../../utils/github-tool-executor";

/** GitHub REST API 根地址 */
const GITHUB_API_BASE = "https://api.github.com";

/**
 * 读取请求体的辅助函数
 */
function readRequestBody(req: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * 发送 JSON 错误响应
 */
function sendJson(res: any, status: number, data: any): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

/**
 * 启动时验证 GitHub Token 有效性
 */
async function validateGitHubToken(token: string): Promise<void> {
  try {
    const resp = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "MetaBlog-AI-Chat",
      },
    });
    if (resp.ok) {
      const user = await resp.json();
      console.log(
        `[GitHub BFF] Token 验证通过，用户: ${user.login || "unknown"}`
      );
    } else {
      console.error(
        `[GitHub BFF] Token 验证失败，HTTP ${resp.status}。请检查 GITHUB_TOKEN 是否有效或已过期。`
      );
    }
  } catch (e: any) {
    console.error(`[GitHub BFF] Token 验证出错: ${e.message}`);
  }
}

/**
 * 注册 GitHub BFF 路由
 */
export function registerGitHubRoutes(server: ViteDevServer): void {
  const token = github.token;

  if (!token) {
    console.warn(
      "[GitHub BFF] GITHUB_TOKEN(或 VITE_GITHUB_TOKEN)环境变量未配置，GitHub API 请求将以匿名身份发送(受严格速率限制)"
    );
  } else {
    // 异步验证 Token(延迟到下一个事件循环，避免干扰单元测试)
    setTimeout(() => validateGitHubToken(token), 0);
  }

  // 创建 BFF 缓存实例(GET 响应缓存 30 秒)
  const cache = createBffCache(30000, (req) =>
    req.method === "GET" ? `GET:${req.url}` : null
  );

  // 应用速率限制中间件
  server.middlewares.use("/api/github", rateLimitExternal);

  // ═══════════════════════════════════════════════════════════════════════════
  // 模式 1：显式工具执行端点(后端重逻辑)
  // ═══════════════════════════════════════════════════════════════════════════
  server.middlewares.use("/api/github/tools/execute", async (req, res, next) => {
    if (req.method !== "POST") {
      next();
      return;
    }

    try {
      const bodyBuf = await readRequestBody(req);
      const bodyStr = bodyBuf.toString();
      const { tool, params } = JSON.parse(bodyStr || "{}") as { tool?: string; params?: any };

      if (!tool) {
        sendJson(res, 400, { success: false, error: "Missing 'tool' field" });
        return;
      }

      const result = await executeGitHubTool(tool, params || {});
      sendJson(res, result.success ? 200 : 400, result);
    } catch (error: any) {
      console.error("[GitHub BFF] Tool execution error:", error);
      sendJson(res, 500, {
        success: false,
        error: error.message,
        message: "GitHub 工具执行出错",
        suggestion: "请检查参数格式是否正确",
      });
    }
  });

  // 工具列表端点(供前端发现可用工具)
  server.middlewares.use("/api/github/tools", async (req, res, next) => {
    if (req.method !== "GET") {
      next();
      return;
    }
    sendJson(res, 200, { success: true, tools: listGitHubTools() });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 模式 2：透明代理(fallback)
  // ═══════════════════════════════════════════════════════════════════════════
  server.middlewares.use("/api/github", async (req, res, next) => {
    // 只处理以 /api/github 开头的请求
    if (!req.url?.startsWith("/api/github")) {
      next();
      return;
    }

    // 尝试从缓存读取(GET 命中则直接返回)
    if (cache.tryRead(req, res)) {
      return;
    }

    try {
      // 提取目标路径：/api/github/repos/... → /repos/...
      const targetPath = req.url.replace("/api/github", "");
      const targetUrl = `${GITHUB_API_BASE}${targetPath}`;

      // 构建转发 headers
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "MetaBlog-AI-Chat",
      };

      // 注入服务端 Token
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // 透传 Content-Type(POST/PUT/PATCH 需要)
      const contentType = req.headers["content-type"];
      if (contentType) {
        headers["Content-Type"] = contentType as string;
      }

      // 透传请求体
      let body: Buffer | undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        body = await readRequestBody(req);
      }

      // 转发到 GitHub API
      const response = await fetch(targetUrl, {
        method: req.method,
        headers,
        body: body && body.length > 0 ? new Uint8Array(body) : undefined,
      });

      // 收集响应 headers(排除 hop-by-hop headers)
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey !== "content-encoding" &&
          lowerKey !== "transfer-encoding" &&
          lowerKey !== "connection"
        ) {
          responseHeaders[key] = value;
          res.setHeader(key, value);
        }
      });

      // 读取响应体
      const responseBody = await response.text();

      // 写入缓存(仅 GET 2xx)
      cache.write(req, response.status, responseHeaders, responseBody);

      // 错误响应：添加翻译信息
      if (response.status >= 400) {
        const translated = translateGitHubError(
          `HTTP ${response.status}: ${responseBody.slice(0, 500)}`
        );
        let original: any;
        try { original = JSON.parse(responseBody); } catch { original = responseBody; }
        sendJson(res, response.status, {
          success: false,
          error: `GitHub API ${response.status}: ${response.statusText}`,
          message: translated.message,
          suggestion: translated.suggestion,
          code: translated.code,
          original,
        });
        return;
      }

      // 正常响应：透传
      res.statusCode = response.status;
      res.end(responseBody);
    } catch (error: any) {
      console.error("[GitHub BFF] Proxy error:", error);
      const translated = translateGitHubError(error.message);
      sendJson(res, 500, {
        success: false,
        error: `GitHub BFF 代理错误: ${error.message}`,
        message: translated.message,
        msg: `GitHub BFF 代理错误: ${error.message}`,
        suggestion: translated.suggestion,
        code: -1,
      });
    }
  });
}
