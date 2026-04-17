import type { Plugin } from "vite";
import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { clearSidebarCache } from "../.vitepress/utils/global-sidebar";
import { scanDocStructure, toSidebarFormat, toDirectoryTree, type DocNode } from "../.vitepress/utils/doc-structure";
import { getTaskManager } from "./mcp-tools/task-manager";
import { getAgentRuntimeManager } from "./mcp-tools/agent-runtime-manager";
import { getMetaAgentManager } from "./mcp-tools/meta-agent-manager";
import { getReportAgentManager } from "./mcp-tools/report-agent-manager";
import { registerInitRoutes } from "./routes/init";
import { registerFilesRoutes } from "./routes/files";
import { registerAgentNativeRoutes } from "./routes/agent-native";
import { registerContentRoutes } from "./routes/content";
import { registerLogsRoutes } from "./routes/logs";
import { registerProxyRoutes } from "./routes/proxy";
import { registerAgentSystemRoutes } from "./routes/agent-system";
import { registerSkillsRoutes } from "./routes/skills";
import { registerMemoriesRoutes } from "./routes/memories";
import { registerMcpRoutes } from "./routes/mcp";
import { registerSessionsRoutes } from "./routes/sessions";


// 简化的日志系统
const system = {
  info: (event: string, message: string, data?: any) =>
    console.info(`[INFO] ${event}: ${message}`, data || ""),
  debug: (event: string, message: string, data?: any) =>
    console.debug(`[DEBUG] ${event}: ${message}`, data || ""),
  warn: (event: string, message: string, data?: any) =>
    console.warn(`[WARN] ${event}: ${message}`, data || ""),
  error: (event: string, message: string, data?: any) =>
    console.error(`[ERROR] ${event}: ${message}`, data || ""),
  success: (event: string, message: string, data?: any) =>
    console.log(`[SUCCESS] ${event}: ${message}`, data || ""),
};

const structuredLog = {
  info: (event: string, message: string, data?: any) =>
    system.info(event, message, data),
  debug: (event: string, message: string, data?: any) =>
    system.debug(event, message, data),
  warn: (event: string, message: string, data?: any) =>
    system.warn(event, message, data),
  error: (event: string, message: string, data?: any) =>
    system.error(event, message, data),
  success: (event: string, message: string, data?: any) =>
    system.success(event, message, data),
  startRequest: () => {},
  endRequest: () => {},
  logAPIRequest: () => {},
  logFileEvent: () => {},
  logFileOperation: () => {},
  logSkillExecution: () => {},
  startLLMChain: () => {},
  endLLMChain: () => {},

  // 获取最近日志
  getRecentLogs: async (count: number = 100, level?: string) => {
    try {
      const LOGS_DIR = path.join(process.cwd(), ".logs");
      if (!fs.existsSync(LOGS_DIR)) return [];

      const files = fs
        .readdirSync(LOGS_DIR)
        .filter((f) => f.endsWith(".jsonl"));
      let allLogs: any[] = [];

      for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            if (!level || log.level === level) {
              allLogs.push(log);
            }
          } catch (e) {
            // 跳过无效行
          }
        }
      }

      // 按时间倒序排序并限制数量
      allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return allLogs.slice(0, count);
    } catch (e) {
      console.error("[Logs] Failed to get recent logs:", e);
      return [];
    }
  },

  // 获取日志统计
  getStats: async () => {
    try {
      const LOGS_DIR = path.join(process.cwd(), ".logs");
      if (!fs.existsSync(LOGS_DIR)) {
        return { total: 0, byLevel: {}, byComponent: {} };
      }

      const files = fs
        .readdirSync(LOGS_DIR)
        .filter((f) => f.endsWith(".jsonl"));
      let total = 0;
      const byLevel: Record<string, number> = {};
      const byComponent: Record<string, number> = {};

      for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            total++;
            byLevel[log.level] = (byLevel[log.level] || 0) + 1;
            byComponent[log.component || "unknown"] =
              (byComponent[log.component || "unknown"] || 0) + 1;
          } catch (e) {
            // 跳过无效行
          }
        }
      }

      return { total, byLevel, byComponent };
    } catch (e) {
      console.error("[Logs] Failed to get stats:", e);
      return { total: 0, byLevel: {}, byComponent: {} };
    }
  },

  // 查询日志（支持过滤）
  queryLogs: async (filter: any) => {
    try {
      const LOGS_DIR = path.join(process.cwd(), ".logs");
      if (!fs.existsSync(LOGS_DIR)) return [];

      const files = fs
        .readdirSync(LOGS_DIR)
        .filter((f) => f.endsWith(".jsonl"));
      let allLogs: any[] = [];

      for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            // 应用过滤条件
            if (filter.level && log.level !== filter.level) continue;
            if (filter.component && log.component !== filter.component)
              continue;
            if (filter.event && log.event !== filter.event) continue;
            if (
              filter.keyword &&
              !JSON.stringify(log)
                .toLowerCase()
                .includes(filter.keyword.toLowerCase())
            )
              continue;
            allLogs.push(log);
          } catch (e) {
            // 跳过无效行
          }
        }
      }

      allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return allLogs;
    } catch (e) {
      console.error("[Logs] Failed to query logs:", e);
      return [];
    }
  },
};
/**
 * Git operations helper
 */
function gitCommit(files: string | string[], message: string) {
  try {
    const fileList = Array.isArray(files) ? files : [files];
    execSync(`git add ${fileList.map((f) => `"${f}"`).join(" ")}`);
    execSync(`git commit -m "${message}"`);
  } catch (e) {
    // Git操作失败不阻断主流程
  }

}

export const metaBlogRoutingPlugin = (): Plugin => ({
  name: "meta-blog-routing",
  configureServer(server: ViteDevServer) {
      /**
       * Bug Fix: Task 1 - 叶子文档变文件夹后的路由处理
       *
       * 问题：当 A.md 变成 A/A.md 后，访问 /sections/posts/A/ 报 404
       * 原因：VitePress 的 rewrites 在启动时生成，运行时不会更新
       * 解决：在请求到达 VitePress 之前，动态检测 folder-note 模式，
       *      将请求重写到 VitePress 的 @fs 路径，让其直接渲染文件
       */

      // 辅助函数：检查路径是否是 folder-note 模式
      function getFolderNoteInfo(
        urlPath: string,
      ): { folderName: string } | null {
        if (!urlPath.startsWith("/sections/")) return null;

        const pathParts = urlPath
          .replace(/\/$/, "")
          .split("/")
          .filter(Boolean);
        if (pathParts.length < 3) return null;

        const section = pathParts[1];
        const folderPath = pathParts.slice(2).join("/");
        const targetDir = path.resolve(
          process.cwd(),
          "docs/sections",
          section,
          folderPath,
        );
        const folderName = path.basename(targetDir);
        const folderNoteFile = path.join(targetDir, `${folderName}.md`);
        const indexFile = path.join(targetDir, "index.md");

        // 如果是 folder-note 模式（有同名 md 文件但没有 index.md）
        if (
          fs.existsSync(targetDir) &&
          fs.statSync(targetDir).isDirectory()
        ) {
          if (fs.existsSync(folderNoteFile) && !fs.existsSync(indexFile)) {
            return { folderName };
          }
        }
        return null;
      }

      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url || "";

        // FIX: Remove query string for routing logic
        const urlWithoutQuery = rawUrl.split("?")[0];

        // FIX: Decode URL to handle Chinese characters
        let url = urlWithoutQuery;
        try {
          url = decodeURIComponent(urlWithoutQuery);
        } catch (e) {
          // If decoding fails, use original URL
        }

        // Skip API and asset requests (use original rawUrl to check query params)
        if (
          rawUrl.startsWith("/api/") ||
          rawUrl.includes("_assets") ||
          rawUrl.includes("@fs") ||
          rawUrl.match(
            /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|json)(\?|$)/,
          )
        ) {
          // 对于 API 请求，直接调用 next()，让后续的 BFF 中间件处理
          // 不要在此时返回，以确保请求继续传递到下一个中间件
          if (rawUrl.startsWith("/api/")) {
            next();
            return;
          }
          next();
          return;
        }

        // 处理 sections 路径的动态路由
        if (url.startsWith("/sections/")) {
          console.log("[Routing] Processing:", url);

          // Redirect paths without trailing slash to have trailing slash
          // FIX: 只处理 folder-note 模式的目录路径，不处理 .html 文件
          // cleanUrls: false 时，叶子节点 URL 是 /path/file.html
          const isFile = url.match(/\.(html|md)$/);
          if (!url.endsWith("/") && !isFile) {
            res.statusCode = 301;
            // Re-encode the URL and preserve query string
            const queryString = rawUrl.includes("?")
              ? "?" + rawUrl.split("?")[1]
              : "";
            res.setHeader("Location", encodeURI(url + "/") + queryString);
            res.end();
            return;
          }

          // Skip .md and .html files (Vite internal requests)
          if (isFile) {
            next();
            return;
          }

          // 运行时 folder-note 热更新处理
          const folderInfo = getFolderNoteInfo(url);
          if (folderInfo) {
            // 重写为 VitePress 路由路径，让 VitePress 正常渲染 markdown
            // （不用 @fs，@fs 会绕过 VitePress 的 frontmatter 解析和页面数据生成）
            const urlWithoutSlash = url.replace(/\/$/, "");
            const folderName = urlWithoutSlash.split("/").pop();
            const newUrl = `${urlWithoutSlash}/${folderName}`;

            console.log("[Routing] Folder-note detected:", {
              original: url,
              rewriteTo: newUrl,
            });

            req.url = newUrl;

            system.debug(
              "routing.rewrite",
              `Runtime folder-note rewrite: ${url} -> ${newUrl}`,
              {
                metadata: {
                  originalUrl: url,
                  newUrl,
                },
              },
            );
          } else {
            console.log("[Routing] Not a folder-note:", url);
          }
        }

        next();
      });
  },
});

export const metaBlogBffPlugin = (): Plugin => ({
  name: "meta-blog-bff",
  configureServer(server: ViteDevServer) {
    const triggerReload = () => {
      // 已禁用 full-reload，避免聊天页面状态丢失
      console.log("[HMR] Trigger reload ignored to preserve SPA state");
    };

    const ctx = { system, structuredLog, gitCommit, triggerReload };

    registerInitRoutes(server, ctx);
    registerFilesRoutes(server, ctx);
    registerAgentNativeRoutes(server, ctx);
    registerContentRoutes(server, ctx);
    registerLogsRoutes(server, ctx);
    registerProxyRoutes(server, ctx);
    registerAgentSystemRoutes(server, ctx);
    registerSkillsRoutes(server, ctx);
    registerMemoriesRoutes(server, ctx);
    registerMcpRoutes(server, ctx);
    registerSessionsRoutes(server, ctx);
  },
  handleHotUpdate({ file }) {
    // 只忽略数据目录的变更，避免不必要的 HMR
    // 正常的 markdown 文件变更让 VitePress 自行处理，确保 frontmatter 更新后页面数据正确刷新
    if (file.includes(path.sep + "data" + path.sep) || file.includes(path.sep + ".trash" + path.sep)) {
      return [];
    }
    // 其他文件（包括 docs 下的 markdown）按 Vite 默认行为处理
  },
});
