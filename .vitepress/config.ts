import { defineConfig, loadEnv } from "vitepress";
import { fileURLToPath, URL } from "node:url";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import https from "https";
import http from "http";
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";

// 数据目录
const DATA_DIR = path.join(process.cwd(), ".data");

// 加载 .env 文件
const env = loadEnv("", process.cwd(), "VITE_");
const serverEnv = loadEnv("", process.cwd(), "LLM_");

// 合并环境变量到 process.env
Object.assign(process.env, env, serverEnv);
import {
  generateSectionSidebar,
  clearSidebarCache,
} from "./utils/global-sidebar";
import {
  scanDocStructure,
  toSidebarFormat,
  toDirectoryTree,
  DocNode,
} from "./utils/doc-structure";
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

// Helper to calculate word count
const getWordCount = (content: string) => {
  return content.split(/\s+/g).length;
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

/**
 * Format a name for breadcrumb display
 */
function formatBreadcrumbName(name: string): string {
  let formatted = name.replace(/[_-]/g, " ");
  formatted = formatted.replace(/^(\d+)\s*/, "$1 ");
  return formatted
    .split(" ")
    .map((word) => {
      if (!word) return "";
      if (/^\d+$/.test(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ")
    .trim();
}

/**
 * Generate all rewrites for the strict nest architecture
 * This handles the "pair rule": folder-name/folder-name.md -> folder-name/index.md
 */
function generateRewrites(): Record<string, string> {
  const rewrites: Record<string, string> = {};
  const sectionsPath = path.resolve(process.cwd(), "docs/sections");

  if (!fs.existsSync(sectionsPath)) return rewrites;

  // Scan all sections
  const sections = fs
    .readdirSync(sectionsPath, { withFileTypes: true })
    .filter((d) => d.isDirectory());

  for (const section of sections) {
    const sectionPath = path.join(sectionsPath, section.name);
    scanForRewrites(sectionPath, `sections/${section.name}`, rewrites);
  }

  return rewrites;
}

/**
 * Recursively scan directory for rewrites
 */
function scanForRewrites(
  dirPath: string,
  relativePath: string,
  rewrites: Record<string, string>,
): void {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const dirName = path.basename(dirPath);

  // Check for same-name.md (pair rule)
  const sameNameMd = path.join(dirPath, `${dirName}.md`);
  const indexMd = path.join(dirPath, "index.md");

  if (fs.existsSync(sameNameMd)) {
    // Rewrite: folder-name/folder-name.md -> folder-name/index.md
    // This makes /folder-name/ work correctly
    const source = `${relativePath}/${dirName}.md`;
    const target = `${relativePath}/index.md`;
    rewrites[source] = target;
  }

  // Recurse into subdirectories
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      scanForRewrites(
        path.join(dirPath, entry.name),
        `${relativePath}/${entry.name}`,
        rewrites,
      );
    }
  }
}

export default defineConfig({
  // Source directory for content files
  srcDir: "./docs",

  lang: "zh-CN",
  title: "MetaUniverse Blog",
  description: "数字孪生级知识管理系统",
  base: "/",
  cleanUrls: false,
  ignoreDeadLinks: true,

  // Generate rewrites dynamically
  // 支持中文文件名：确保中文路径正确处理
  rewrites: generateRewrites(),

  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
      {
        text: "AI 助手",
        link: "/chat",
        activeMatch: "/chat",
      },
      {
        text: "文章列表",
        link: "/sections/posts/",
        activeMatch: "/sections/posts/",
      },
      {
        text: "知识库",
        link: "/sections/knowledge/",
        activeMatch: "/sections/knowledge/",
      },
      {
        text: "公开资源",
        link: "/sections/resources/",
        activeMatch: "/sections/resources/",
      },
      {
        text: "关于我",
        link: "/sections/about/",
        activeMatch: "/sections/about/",
      },
    ],
    sidebar: {
      "/sections/knowledge/": toSidebarFormat(
        scanDocStructure(
          path.resolve(process.cwd(), "docs/sections/knowledge"),
        ),
      ),
      "/sections/posts/": toSidebarFormat(
        scanDocStructure(path.resolve(process.cwd(), "docs/sections/posts")),
      ),
      "/sections/resources/": toSidebarFormat(
        scanDocStructure(
          path.resolve(process.cwd(), "docs/sections/resources"),
        ),
      ),
      "/sections/about/": toSidebarFormat(
        scanDocStructure(path.resolve(process.cwd(), "docs/sections/about")),
      ),
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" },
    ],
    docFooter: { prev: false, next: false },
    outline: {
      label: "页面导航",
      level: [2, 4], // Show headers from h2 to h4
    },
    lastUpdated: { text: "最后更新于" },
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
  },

  markdown: {
    config: (md: MarkdownIt) => {
      md.use(mathjax3);

      const defaultRender =
        md.renderer.rules.text ||
        function (tokens: any, idx: any, options: any, env: any, self: any) {
          return self.renderToken(tokens, idx, options);
        };

      md.renderer.rules.text = function (
        tokens: any,
        idx: any,
        options: any,
        env: any,
        self: any,
      ) {
        let content = tokens[idx].content;
        const wikiLinkRegex = /\[\[(.*?)\]\]/g;
        if (wikiLinkRegex.test(content)) {
          return content.replace(wikiLinkRegex, (match: any, p1: any) => {
            const [link, text] = p1.split("|");
            const displayText = text || link;
            const url = `/sections/posts/${link.trim().replace(/\s+/g, "-").toLowerCase()}/`;
            return `<a href="${url}">${displayText}</a>`;
          });
        }
        return defaultRender(tokens, idx, options, env, self);
      };
    },
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag: string) => tag.startsWith("mjx-"),
      },
    },
  },
  vite: {
    base: "/",
    envPrefix: ["VITE_", "LLM_"],
    optimizeDeps: {
      force: true,
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("../src", import.meta.url)),
        },
        {
          find: "@docs",
          replacement: fileURLToPath(new URL("../docs", import.meta.url)),
        },
      ],
    },
    // Exclude visual scene modules from SSR - they use browser-only APIs
    ssr: {
      noExternal: ["three"],
    },
    // P1-8 修复：排除 Agent 数据目录和日志目录，避免 Vite HMR OOM
    server: {
      watch: {
        ignored: [
          "**/data/memory/**",
          "**/data/logs/**",
          "**/data/sessions/**",
          "**/data/history/**",
          "**/.trash/**",
        ],
      },
      // 修复 MIME 类型错误
      fs: {
        strict: false,
      },
    },
    plugins: [
      {
        name: "meta-blog-routing",
        configureServer(server) {
          /**
           * Bug Fix: Task 1 - 叶子文档变文件夹后的路由处理
           *
           * 问题：当 A.md 变成 A/A.md 后，访问 /sections/posts/A/ 报 404
           * 原因：VitePress 的 rewrites 在启动时生成，运行时不会更新
           * 解决：在请求到达 VitePress 之前，动态检测 folder-note 模式，
           *      将请求重写到 VitePress 的 @fs 路径，让其直接渲染文件
           */

          // 辅助函数：检查路径是否是 folder-note 模式，返回实际文件路径
          function getFolderNoteInfo(
            urlPath: string,
          ): { filePath: string; folderName: string } | null {
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
                return { filePath: folderNoteFile, folderName };
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
                // 重写为 VitePress 路由路径（不用 @fs，因为 @fs 绕过了 Markdown 渲染管线）
                // VitePress 能识别 /sections/posts/.../folder/folder 并找到 folder/folder.md 渲染
                const urlWithoutSlash = url.replace(/\/$/, "");
                const folderName = urlWithoutSlash.split("/").pop();
                const newUrl = `${urlWithoutSlash}/${folderName}`;

                console.log("[Routing] Folder-note detected:", {
                  original: url,
                  rewriteTo: newUrl,
                  filePath: folderInfo.filePath,
                  exists: fs.existsSync(folderInfo.filePath),
                });

                req.url = newUrl;

                system.debug(
                  "routing.rewrite",
                  `Runtime folder-note rewrite: ${url} -> ${newUrl}`,
                  {
                    metadata: {
                      originalUrl: url,
                      newUrl,
                      filePath: folderInfo.filePath,
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
      },
      {
        name: "meta-blog-bff",
        configureServer(server) {
          // BFF API Server 初始化
          system.info("server.init", "BFF API Server 初始化完成");

          // 初始化 LLM Manager (简化版)
          const llmManager = null;
          try {
            // 旧版 agent 模块已移除，使用 ai-chat 模块的简化实现
            console.log("[INFO] LLM Manager 初始化跳过（使用 ai-chat 模块）");
            const defaultProvider =
              process.env.LLM_DEFAULT_PROVIDER || "deepseek";
            const dailyBudget = parseFloat(
              process.env.LLM_DAILY_BUDGET || "10",
            );

            // 辅助函数：去除引号并清理
            const clean = (v: string | undefined) =>
              v?.trim().replace(/^["']|["']$/g, "");

            // 构建 providers 配置
            const providers: Record<string, any> = {};

            // DeepSeek
            const deepseekKey = clean(process.env.VITE_DEEPSEEK_API_KEY);
            if (deepseekKey && !deepseekKey.includes("your-api-key")) {
              providers.deepseek = {
                apiKey: deepseekKey,
                model:
                  clean(process.env.VITE_DEEPSEEK_MODEL) || "deepseek-chat",
                baseURL: clean(process.env.VITE_DEEPSEEK_BASE_URL),
              };
            }

            // OpenAI
            const openaiKey = clean(process.env.VITE_OPENAI_API_KEY);
            if (openaiKey && !openaiKey.includes("your-api-key")) {
              providers.openai = {
                apiKey: openaiKey,
                model: clean(process.env.VITE_OPENAI_MODEL) || "gpt-4o",
                baseURL: clean(process.env.VITE_OPENAI_BASE_URL),
              };
            }

            // Anthropic
            const anthropicKey = clean(process.env.VITE_ANTHROPIC_API_KEY);
            if (anthropicKey && !anthropicKey.includes("your-api-key")) {
              providers.anthropic = {
                apiKey: anthropicKey,
                model:
                  clean(process.env.VITE_ANTHROPIC_MODEL) ||
                  "claude-3-5-sonnet",
                baseURL: clean(process.env.VITE_ANTHROPIC_BASE_URL),
              };
            }

            // Gemini
            const geminiKey = clean(process.env.VITE_GEMINI_API_KEY);
            if (geminiKey && !geminiKey.includes("your-api-key")) {
              providers.gemini = {
                apiKey: geminiKey,
                model: clean(process.env.VITE_GEMINI_MODEL) || "gemini-1.5-pro",
                baseURL: clean(process.env.VITE_GEMINI_BASE_URL),
              };
            }

            // Zhipu
            const zhipuKey = clean(process.env.VITE_ZHIPU_API_KEY);
            if (zhipuKey && !zhipuKey.includes("your-api-key")) {
              providers.zhipu = {
                apiKey: zhipuKey,
                model: clean(process.env.VITE_ZHIPU_MODEL) || "glm-4",
                baseURL: clean(process.env.VITE_ZHIPU_BASE_URL),
              };
            }

            // Qwen
            const qwenKey = clean(process.env.VITE_QWEN_API_KEY);
            if (qwenKey && !qwenKey.includes("your-api-key")) {
              providers.qwen = {
                apiKey: qwenKey,
                model: clean(process.env.VITE_QWEN_MODEL) || "qwen-plus",
                baseURL: clean(process.env.VITE_QWEN_BASE_URL),
              };
            }

            // Kimi
            const kimiKey = clean(process.env.VITE_KIMI_API_KEY);
            if (kimiKey && !kimiKey.includes("your-api-key")) {
              providers.kimi = {
                apiKey: kimiKey,
                model: clean(process.env.VITE_KIMI_MODEL) || "kimi-k2.5",
                baseURL: clean(process.env.VITE_KIMI_BASE_URL),
              };
            }

            console.log("[LLM] Providers config:", Object.keys(providers));

            if (Object.keys(providers).length === 0) {
              system.warn("server.llm", "没有配置任何 LLM Provider");
            } else {
              // createLLMManager({
              //   dailyBudget,
              //   defaultProvider,
              //   providers
              // });

              system.info(
                "server.llm",
                `LLM Manager 初始化完成，Provider: ${Object.keys(providers).join(", ")}, 默认: ${defaultProvider}`,
              );
            }
          } catch (e) {
            system.error("server.llm", "LLM Manager 初始化失败: " + String(e));
          }

          // 后台任务调度器已移除（随 agent 模块一起移除）

          // 热更新辅助函数
          const triggerReload = () => {
            console.log(
              "[HMR] Trigger reload called, server.ws exists:",
              !!server.ws,
            );
            setTimeout(() => {
              if (server.ws) {
                try {
                  server.ws.send({ type: "full-reload" });
                  console.log("[HMR] Triggered full reload successfully");
                } catch (e) {
                  console.error("[HMR] Failed to send reload:", e);
                }
              } else {
                console.log(
                  "[HMR] WebSocket not available, falling back to file watcher",
                );
              }
            }, 500); // 延迟500ms确保文件系统操作完成并稳定
          };

          // API请求日志中间件 - 使用 system 日志（版本2 - 绕过缓存问题）
          server.middlewares.use("/api/", (req, res, next) => {
            const startTime = Date.now();
            const url = req.url || "";

            // 记录请求开始
            system.debug("api.request", `${req.method} ${url}`, {
              metadata: { method: req.method, url },
            });

            // 监听响应完成
            const originalEnd = res.end.bind(res);
            res.end = function (...args: any[]) {
              const duration = Date.now() - startTime;
              const status = res.statusCode || 200;

              // 记录响应
              if (status >= 400) {
                system.error(
                  "api.response",
                  `${req.method} ${url} - ${status} (${duration}ms)`,
                );
              } else {
                system.success(
                  "api.response",
                  `${req.method} ${url} - ${status} (${duration}ms)`,
                );
              }

              return originalEnd(...args);
            };

            next();
          });

          server.middlewares.use(
            "/api/files/read",
            (req: any, res: any, next: any) => {
              if (req.method === "GET") {
                try {
                  const url = new URL(
                    req.url || "",
                    `http://${req.headers.host}`,
                  );
                  // FIX: URL decode the path to handle Chinese characters
                  let filePath = url.searchParams.get("path");
                  if (!filePath) return next();

                  // Decode URI components to handle Chinese characters
                  filePath = decodeURIComponent(filePath);

                  // P0-CK: 支持 .vitepress/agent/ 路径（checkpoint 存储）
                  const isAgentPath =
                    filePath.startsWith(".vitepress/") ||
                    filePath.startsWith(".vitepress\\");
                  const basePath = isAgentPath
                    ? process.cwd()
                    : path.join(process.cwd(), "docs");
                  const fullPath = path.resolve(
                    basePath,
                    filePath.replace(/^\//, ""),
                  );
                  if (fs.existsSync(fullPath)) {
                    res.setHeader("Content-Type", "text/plain");
                    res.end(fs.readFileSync(fullPath, "utf-8"));
                  } else {
                    res.statusCode = 404;
                    res.end("File not found");
                  }
                } catch (e) {
                  res.statusCode = 500;
                  res.end(String(e));
                }
              } else next();
            },
          );

          server.middlewares.use("/api/files/save", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                const startTime = Date.now();
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: filePath, content } = body;

                  if (!filePath) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Path required",
                      }),
                    );
                    return;
                  }

                  // P0-CK: 支持 .vitepress/agent/ 路径（checkpoint 存储）
                  const isAgentPath =
                    filePath.startsWith(".vitepress/") ||
                    filePath.startsWith(".vitepress\\");
                  const basePath = isAgentPath
                    ? process.cwd()
                    : path.join(process.cwd(), "docs");
                  const fullPath = path.resolve(
                    basePath,
                    filePath.replace(/^\//, ""),
                  );

                  // 确保目录存在
                  const dir = path.dirname(fullPath);
                  await fs.promises.mkdir(dir, { recursive: true });

                  // 写入文件
                  await fs.promises.writeFile(fullPath, content, "utf-8");

                  const duration = Date.now() - startTime;

                  // 记录文件系统事件（暂时使用 system 日志）
                  system.debug("file.saved", `File saved: ${filePath}`, {
                    metadata: {
                      path: filePath,
                      size: content.length,
                      duration,
                    },
                  });

                  // Git 操作
                  gitCommit(
                    fullPath,
                    `content: 更新 ${path.basename(fullPath)}`,
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, message: "Saved" }));

                  // 触发热更新
                  triggerReload();
                } catch (error) {
                  console.error("[API] Save file error:", error);
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: (error as Error).message,
                    }),
                  );
                }
              });
            } else next();
          });

          // Rename file - 真正的文件重命名（修改文件名本身）
          server.middlewares.use("/api/files/rename", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const {
                    path: filePath,
                    newName,
                    updateFrontmatter = true,
                  } = body;

                  const dir = path.dirname(filePath);
                  const ext = path.extname(filePath);
                  const newFileName =
                    newName
                      .toLowerCase()
                      .replace(/[^\w\s-]/g, "")
                      .replace(/\s+/g, "_") + ext;
                  const newPath = path.join(dir, newFileName);

                  const fullOldPath = path.resolve(
                    process.cwd(),
                    "docs",
                    filePath.replace(/^\//, ""),
                  );
                  const fullNewPath = path.resolve(
                    process.cwd(),
                    "docs",
                    newPath.replace(/^\//, ""),
                  );

                  // Check if file exists
                  if (!fs.existsSync(fullOldPath)) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "File not found",
                      }),
                    );
                    return;
                  }

                  // Check if target already exists
                  if (fs.existsSync(fullNewPath)) {
                    res.statusCode = 409;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Target file already exists",
                      }),
                    );
                    return;
                  }

                  let content = fs.readFileSync(fullOldPath, "utf-8");

                  // Update frontmatter title if requested
                  if (updateFrontmatter) {
                    if (content.startsWith("---")) {
                      if (content.match(/title:\s*.+/)) {
                        content = content.replace(
                          /title:\s*.+/,
                          `title: ${newName}`,
                        );
                      } else {
                        content = content.replace(
                          /---\n/,
                          `---\ntitle: ${newName}\n`,
                        );
                      }
                    } else {
                      content = `---\ntitle: ${newName}\n---\n\n${content}`;
                    }
                  }

                  // Write to new file
                  fs.writeFileSync(fullNewPath, content);

                  // Delete old file
                  fs.unlinkSync(fullOldPath);

                  // Git operations
                  gitCommit(
                    [fullOldPath, fullNewPath],
                    `content: 重命名 ${path.basename(filePath)} -> ${newFileName}`,
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        oldPath: filePath,
                        newPath: newPath.replace(/\\/g, "/"),
                        newName: newFileName,
                        displayName: newName,
                      },
                    }),
                  );

                  // 触发热更新
                  triggerReload();
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // Move file
          server.middlewares.use("/api/files/move", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { from: fromPath, to: toPath } = body;
                  const fullFromPath = path.resolve(
                    process.cwd(),
                    "docs",
                    fromPath.replace(/^\//, ""),
                  );
                  const fullToPath = path.resolve(
                    process.cwd(),
                    "docs",
                    toPath.replace(/^\//, ""),
                  );

                  // Ensure target directory exists
                  fs.mkdirSync(path.dirname(fullToPath), { recursive: true });

                  // Move file
                  fs.renameSync(fullFromPath, fullToPath);

                  // Git operations
                  gitCommit(
                    [fullFromPath, fullToPath],
                    `content: 移动 ${path.basename(fromPath)} -> ${path.basename(toPath)}`,
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: { toPath } }));

                  // 触发热更新
                  triggerReload();
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });

          // Delete file (支持软删除)
          server.middlewares.use("/api/files/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: filePath, permanent = false } = body;

                  // FIX: URL decode the path
                  let decodedPath = filePath;
                  try {
                    decodedPath = decodeURIComponent(filePath);
                  } catch (e) {}

                  const fullPath = path.resolve(
                    process.cwd(),
                    "docs",
                    decodedPath.replace(/^\//, ""),
                  );

                  if (!fs.existsSync(fullPath)) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "File not found",
                      }),
                    );
                    return;
                  }

                  if (permanent) {
                    // 永久删除
                    fs.unlinkSync(fullPath);
                    gitCommit(
                      fullPath,
                      `content: 永久删除 ${path.basename(decodedPath)}`,
                    );
                  } else {
                    // 软删除：移动到 .trash 文件夹
                    const trashDir = path.join(process.cwd(), "docs", ".trash");
                    if (!fs.existsSync(trashDir)) {
                      fs.mkdirSync(trashDir, { recursive: true });
                    }

                    // 生成 trash 文件名：原文件名_时间戳
                    const timestamp = new Date()
                      .toISOString()
                      .replace(/[:.]/g, "-");
                    const originalName = path.basename(decodedPath);
                    const trashFileName = `${originalName}.${timestamp}.trash`;
                    const trashPath = path.join(trashDir, trashFileName);

                    // 移动文件
                    fs.renameSync(fullPath, trashPath);

                    // 保存元数据
                    const metaPath = `${trashPath}.meta.json`;
                    const metaData = {
                      originalPath: decodedPath,
                      deletedAt: new Date().toISOString(),
                      expiresAt: new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1000,
                      ).toISOString(), // 30天后过期
                      originalName,
                    };
                    fs.writeFileSync(
                      metaPath,
                      JSON.stringify(metaData, null, 2),
                    );

                    gitCommit(
                      [fullPath, trashPath, metaPath].filter((p) =>
                        fs.existsSync(p),
                      ),
                      `content: 删除(回收站) ${originalName}`,
                    );
                  }

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));

                  // 触发热更新
                  triggerReload();
                } catch (e) {
                  console.error("[API] Delete error:", e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });

          // 获取回收站列表
          server.middlewares.use("/api/files/trash", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const trashDir = path.join(process.cwd(), "docs", ".trash");
                if (!fs.existsSync(trashDir)) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: [] }));
                  return;
                }

                const files = fs.readdirSync(trashDir);
                const trashItems = [];

                for (const file of files) {
                  if (file.endsWith(".meta.json")) continue;

                  const metaPath = path.join(trashDir, `${file}.meta.json`);
                  const fullPath = path.join(trashDir, file);
                  const stats = fs.statSync(fullPath);

                  let meta: any = {};
                  if (fs.existsSync(metaPath)) {
                    try {
                      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
                    } catch (e) {}
                  }

                  trashItems.push({
                    id: file,
                    name: file.replace(/\.\d{4}-\d{2}-\d{2}T.*$/, ""),
                    deletedAt: meta.deletedAt || stats.mtime.toISOString(),
                    expiresAt:
                      meta.expiresAt ||
                      new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1000,
                      ).toISOString(),
                    originalPath: meta.originalPath || "unknown",
                    size: stats.size,
                  });
                }

                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: trashItems }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // 恢复文件
          server.middlewares.use("/api/files/restore", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { trashId } = body;

                  const trashDir = path.join(process.cwd(), "docs", ".trash");
                  const trashPath = path.join(trashDir, trashId);
                  const metaPath = `${trashPath}.meta.json`;

                  if (!fs.existsSync(trashPath)) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Trash item not found",
                      }),
                    );
                    return;
                  }

                  // 读取元数据
                  let originalPath = "";
                  if (fs.existsSync(metaPath)) {
                    try {
                      const meta = JSON.parse(
                        fs.readFileSync(metaPath, "utf-8"),
                      );
                      originalPath = meta.originalPath;
                    } catch (e) {}
                  }

                  // 如果没有元数据，尝试从文件名解析
                  if (!originalPath) {
                    originalPath = trashId.replace(
                      /\.\d{4}-\d{2}-\d{2}T.*\.trash$/,
                      "",
                    );
                  }

                  const restoredPath = path.resolve(
                    process.cwd(),
                    "docs",
                    originalPath.replace(/^\//, ""),
                  );

                  // 确保目标目录存在
                  fs.mkdirSync(path.dirname(restoredPath), { recursive: true });

                  // 移动文件回原位置
                  fs.renameSync(trashPath, restoredPath);

                  // 删除元数据文件
                  if (fs.existsSync(metaPath)) {
                    fs.unlinkSync(metaPath);
                  }

                  gitCommit(
                    [restoredPath],
                    `content: 恢复文件 ${path.basename(originalPath)}`,
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: { restoredPath: originalPath },
                    }),
                  );

                  // 触发热更新
                  triggerReload();
                } catch (e) {
                  console.error("[API] Restore error:", e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // Get file content (for export)
          server.middlewares.use("/api/files/content", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`,
                );
                let filePath = url.searchParams.get("path");

                if (!filePath) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({ success: false, error: "Path required" }),
                  );
                  return;
                }

                // FIX: URL decode the path to handle Chinese characters
                try {
                  filePath = decodeURIComponent(filePath);
                } catch (e) {
                  // If decoding fails, use original path
                }

                // Security: prevent directory traversal
                const cleanPath = filePath
                  .replace(/\.\./g, "")
                  .replace(/^\//, "");
                const fullPath = path.resolve(process.cwd(), "docs", cleanPath);

                console.log("[API] Export content:", {
                  cleanPath,
                  fullPath,
                  exists: fs.existsSync(fullPath),
                });

                if (!fs.existsSync(fullPath)) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "File not found: " + cleanPath,
                    }),
                  );
                  return;
                }

                const content = fs.readFileSync(fullPath, "utf-8");
                res.setHeader("Content-Type", "text/plain; charset=utf-8");
                res.end(content);
              } catch (error) {
                console.error("[API] Get content error:", error);
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: (error as Error).message,
                  }),
                );
              }
            } else next();
          });

          // Batch export articles
          server.middlewares.use(
            "/api/articles/batch-export",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { paths, format = "md" } = body;

                    if (!paths || !Array.isArray(paths) || paths.length === 0) {
                      res.statusCode = 400;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: "Paths array required",
                        }),
                      );
                      return;
                    }

                    const JSZip = await import("jszip").then((m) => m.default);
                    const zip = new JSZip();

                    // Add each file to zip
                    for (const filePath of paths) {
                      try {
                        const cleanPath = filePath
                          .replace(/\.html$/, ".md")
                          .replace(/^\//, "");
                        const fullPath = path.resolve(
                          process.cwd(),
                          "docs",
                          cleanPath,
                        );

                        if (fs.existsSync(fullPath)) {
                          const content = fs.readFileSync(fullPath, "utf-8");
                          const fileName = path.basename(cleanPath);
                          zip.file(fileName, content);
                        }
                      } catch (e) {
                        console.error(
                          `[API] Failed to add file ${filePath}:`,
                          e,
                        );
                      }
                    }

                    // Generate zip
                    const zipContent = await zip.generateAsync({
                      type: "nodebuffer",
                    });

                    res.setHeader("Content-Type", "application/zip");
                    res.setHeader(
                      "Content-Disposition",
                      `attachment; filename="articles-export-${Date.now()}.zip"`,
                    );
                    res.end(zipContent);
                  } catch (error) {
                    console.error("[API] Batch export error:", error);
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: (error as Error).message,
                      }),
                    );
                  }
                });
              } else next();
            },
          );

          // ============================================
          // Files API - 目录操作
          // ============================================

          // 创建目录
          server.middlewares.use("/api/files/mkdir", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: dirPath } = body;

                  if (!dirPath) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Path required",
                      }),
                    );
                    return;
                  }

                  // 支持 .skills 等配置目录
                  const isConfigPath =
                    dirPath.startsWith(".") || dirPath.startsWith("_");
                  const basePath = isConfigPath
                    ? process.cwd()
                    : path.join(process.cwd(), "docs");
                  const fullPath = path.resolve(basePath, dirPath);

                  // 安全检查
                  if (!fullPath.startsWith(basePath)) {
                    res.statusCode = 403;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Access denied",
                      }),
                    );
                    return;
                  }

                  await fs.promises.mkdir(fullPath, { recursive: true });

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // 列出目录内容
          server.middlewares.use("/api/files/list", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`,
                );
                let dirPath = url.searchParams.get("path") || ".";

                // 解码URL编码的路径
                try {
                  dirPath = decodeURIComponent(dirPath);
                } catch (e) {
                  // 解码失败使用原路径
                }

                // 支持 .skills 等配置目录
                const isConfigPath =
                  dirPath.startsWith(".") || dirPath.startsWith("_");
                const basePath = isConfigPath
                  ? process.cwd()
                  : path.join(process.cwd(), "docs");
                
                // 如果 dirPath 已经是 basePath 的子目录，不要重复拼接
                const resolvedDirPath = path.resolve(dirPath);
                const resolvedBasePath = path.resolve(basePath);
                let fullPath: string;
                if (resolvedDirPath.startsWith(resolvedBasePath)) {
                  fullPath = resolvedDirPath;
                } else {
                  fullPath = path.resolve(basePath, dirPath);
                }

                // 安全检查
                if (!fullPath.startsWith(basePath)) {
                  res.statusCode = 403;
                  res.end(
                    JSON.stringify({ success: false, error: "Access denied" }),
                  );
                  return;
                }

                if (!fs.existsSync(fullPath)) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Directory not found",
                    }),
                  );
                  return;
                }

                const stats = fs.statSync(fullPath);
                if (!stats.isDirectory()) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Path is not a directory",
                    }),
                  );
                  return;
                }

                const entries = fs.readdirSync(fullPath, {
                  withFileTypes: true,
                });
                const items = entries.map((entry) => ({
                  name: entry.name,
                  isDirectory: entry.isDirectory(),
                  isFile: entry.isFile(),
                  path: path.join(dirPath, entry.name).replace(/\\/g, "/"),
                }));

                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: items }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // ============================================
          // Agent API Routes - AI-Native Operations
          // ============================================

          // Agent 任务提交（区分人工操作）
          server.middlewares.use("/api/agent/task", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const {
                    taskId,
                    content: fileContent,
                    path: filePath,
                    metadata,
                  } = body;

                  const fullPath = path.resolve(
                    process.cwd(),
                    "docs",
                    filePath.replace(/^\//, ""),
                  );
                  fs.writeFileSync(fullPath, fileContent);

                  // Agent 特定的 Git 提交格式
                  const commitMessage = `agent(${taskId}): ${metadata?.description || "Auto update"}${metadata?.skill ? ` [${metadata.skill}]` : ""}
>
> Author: agent
> Model: ${metadata?.model || "unknown"}
> Skill: ${metadata?.skill || "unknown"}
> Tokens: ${metadata?.tokens || 0}
> Cost: $${metadata?.cost || 0}
> Parent-Task: ${taskId}`;

                  try {
                    execSync(`git add "${fullPath}"`);
                    execSync(`git commit -m "${commitMessage}"`);
                  } catch (e) {
                    console.error("Git commit failed:", e);
                  }

                  // 保存任务状态到 .vitepress/agent/memory/tasks/
                  const taskDir = path.resolve(
                    process.cwd(),
                    ".vitepress/agent/memory/tasks",
                  );
                  if (!fs.existsSync(taskDir)) {
                    fs.mkdirSync(taskDir, { recursive: true });
                  }
                  const taskFile = path.join(taskDir, `${taskId}.json`);
                  fs.writeFileSync(
                    taskFile,
                    JSON.stringify(
                      {
                        id: taskId,
                        status: "completed",
                        path: filePath,
                        metadata,
                        timestamp: new Date().toISOString(),
                      },
                      null,
                      2,
                    ),
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, taskId }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });

          // Agent 上下文初始化
          server.middlewares.use(
            "/api/agent/context/init",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { path: filePath } = body;

                    // 读取文件历史和相关实体
                    const contextDir = path.resolve(
                      process.cwd(),
                      ".vitepress/agent/memory",
                    );
                    let entities: any[] = [];
                    let history: any[] = [];

                    // 尝试读取实体
                    const entitiesPath = path.join(
                      contextDir,
                      "entities/concepts.json",
                    );
                    if (fs.existsSync(entitiesPath)) {
                      const entitiesData = JSON.parse(
                        fs.readFileSync(entitiesPath, "utf-8"),
                      );
                      entities = Object.values(entitiesData).filter((e: any) =>
                        e.sources?.includes(filePath),
                      );
                    }

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        context: {
                          path: filePath,
                          entities: entities.slice(0, 5),
                          relatedArticles: entities.length,
                        },
                      }),
                    );
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: String(e) }));
                  }
                });
              } else next();
            },
          );

          // Agent 任务状态查询
          server.middlewares.use("/api/agent/task/status", (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const taskId = url.searchParams.get("id");

              if (!taskId) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing task ID" }));
                return;
              }

              const taskFile = path.resolve(
                process.cwd(),
                ".vitepress/agent/memory/tasks",
                `${taskId}.json`,
              );

              if (fs.existsSync(taskFile)) {
                const taskData = JSON.parse(fs.readFileSync(taskFile, "utf-8"));
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(taskData));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Task not found" }));
              }
            } else next();
          });

          // Git 提交 API（用于 Agent 等场景真实提交日志）
          server.middlewares.use("/api/git/commit", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { files, message } = body;
                  gitCommit(files, message);
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // Slugify API（支持中文转换）
          server.middlewares.use("/api/utils/slugify", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { text } = body;

                  let slug = text;
                  try {
                    const pinyinFn = require("pinyin");
                    slug = (
                      typeof pinyinFn === "function"
                        ? pinyinFn(text, { style: "normal" })
                        : pinyinFn.default
                          ? pinyinFn.default(text, { style: "normal" })
                          : text
                    )
                      .flat()
                      .join("-");
                  } catch (e) {
                    // Fallback if pinyin fails
                  }

                  slug = slug
                    .toLowerCase()
                    .replace(/[^\w\s-]/g, "")
                    .replace(/\s+/g, "-")
                    .substring(0, 50);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ slug }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // Git 日志 API（区分人工和 Agent）
          server.middlewares.use("/api/git/log", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const logOutput = execSync(
                  'git log --pretty=format:\'{"hash":"%H","message":"%s","date":"%ai","author":"%an"}\' -20',
                  { encoding: "utf-8", cwd: process.cwd() },
                );
                const logs = logOutput
                  .split("\n")
                  .filter((line) => line.trim())
                  .map((line) => {
                    try {
                      return JSON.parse(line);
                    } catch {
                      return null;
                    }
                  })
                  .filter(Boolean);

                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(logs));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Failed to get git log" }));
              }
            } else next();
          });

          // ============================================
          // Dynamic Sidebar API - 动态侧边栏
          // ============================================

          // 动态 Sidebar API - 返回实时的文件结构
          server.middlewares.use("/api/sidebar", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`,
                );
                const section = url.searchParams.get("section") || "posts";

                // 使用新的文档结构扫描
                const nodes = scanDocStructure(
                  path.resolve(process.cwd(), "docs/sections", section),
                );
                const sidebarData = toSidebarFormat(nodes);

                res.setHeader("Content-Type", "application/json");
                res.setHeader("Cache-Control", "no-cache");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: sidebarData,
                    timestamp: Date.now(),
                  }),
                );
              } catch (e) {
                console.error("[API] Sidebar error:", e);
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: "Failed to generate sidebar",
                  }),
                );
              }
            } else next();
          });

          // 目录树 API - 返回前端选择器需要的格式
          server.middlewares.use(
            "/api/directory-tree",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const url = new URL(
                    req.url || "",
                    `http://${req.headers.host}`,
                  );
                  const section = url.searchParams.get("section") || "posts";

                  const nodes = scanDocStructure(
                    path.resolve(process.cwd(), "docs/sections", section),
                  );
                  const treeData = toDirectoryTree(nodes);

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: treeData,
                    }),
                  );
                } catch (e) {
                  console.error("[API] Directory tree error:", e);
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to generate directory tree",
                    }),
                  );
                }
              } else next();
            },
          );

          // ============================================
          // Articles API - 文章管理
          // ============================================

          const SECTIONS_PATH = path.join(process.cwd(), "docs/sections");

          // 生成 URL 友好的 slug（保留中文）
          function generateSlug(title: string): string {
            if (!title || !title.trim()) return "untitled";

            // 只替换不安全的文件系统字符，保留中文
            // 替换: / \ : * ? " < > | 为 -
            let result = title
              .trim()
              .replace(/[\\/*?:"<>|]/g, "-") // 替换非法字符为连字符
              .replace(/\s+/g, "-") // 空格转连字符
              .replace(/-+/g, "-") // 多个连字符合并
              .replace(/^-|-$/g, "") // 去除首尾连字符
              .substring(0, 100); // 限制长度

            return result || "untitled";
          }

          // 递归扫描文章
          async function scanArticles(
            dir: string,
            basePath: string = "",
          ): Promise<any[]> {
            const articles: any[] = [];
            try {
              const entries = await fs.promises.readdir(dir, {
                withFileTypes: true,
              });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.join(basePath, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith(".")) {
                  const subArticles = await scanArticles(
                    fullPath,
                    relativePath,
                  );
                  articles.push(...subArticles);
                } else if (
                  entry.isFile() &&
                  entry.name.endsWith(".md") &&
                  entry.name !== "index.md"
                ) {
                  const content = await fs.promises.readFile(fullPath, "utf-8");
                  const meta = extractArticleMeta(content, relativePath);
                  articles.push(meta);
                }
              }
            } catch (e) {}
            return articles;
          }

          // 提取文章元数据
          function extractArticleMeta(content: string, relativePath: string) {
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            const meta: any = {};
            if (frontmatterMatch) {
              frontmatterMatch[1].split("\n").forEach((line: string) => {
                const match = line.match(/^(\w+):\s*(.+)$/);
                if (match)
                  meta[match[1]] = match[2].replace(/^["']|["']$/g, "");
              });
            }
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title =
              meta.title ||
              titleMatch?.[1] ||
              path.basename(relativePath, ".md");
            return {
              path: relativePath.replace(/\\/g, "/"),
              title,
              description: meta.description,
              tags: meta.tags
                ? meta.tags.split(",").map((t: string) => t.trim())
                : [],
              date: meta.date,
              updatedAt: meta.updatedAt,
              wordCount: content.replace(/\s+/g, "").length,
              isPublished: !relativePath.includes("/drafts/"),
            };
          }

          // 辅助函数：从 DocNode 树扁平化为文章列表
          function flattenArticles(nodes: DocNode[]): any[] {
            const articles: any[] = [];

            for (const node of nodes) {
              if (node.type === "file") {
                // 叶子文件
                articles.push({
                  path: node.path,
                  title: node.title,
                  isLeaf: true,
                });
              } else if (node.type === "folder" && node.children) {
                // 递归处理子项
                articles.push(...flattenArticles(node.children));
              }
            }

            return articles;
          }

          // 辅助函数：轻量级扫描文章列表（用于 @ 引用）
          async function scanArticlesForList(
            dir: string,
            section: string,
            results: Array<{ path: string; title: string; section: string }>,
          ): Promise<void> {
            try {
              const entries = await fs.promises.readdir(dir, {
                withFileTypes: true,
              });

              for (const entry of entries) {
                if (entry.name.startsWith(".")) continue;

                const fullPath = path.join(dir, entry.name);
                const relativePath = fullPath
                  .replace(SECTIONS_PATH + path.sep, "")
                  .replace(/\\/g, "/");

                if (entry.isDirectory()) {
                  await scanArticlesForList(fullPath, section, results);
                } else if (entry.isFile() && entry.name.endsWith(".md")) {
                  // 读取标题
                  let title = entry.name.replace(".md", "");
                  try {
                    const content = await fs.promises.readFile(
                      fullPath,
                      "utf-8",
                    );
                    const frontmatterMatch = content.match(
                      /^---\n([\s\S]*?)\n---/,
                    );
                    if (frontmatterMatch) {
                      const titleMatch =
                        frontmatterMatch[1].match(/^title:\s*(.+)$/m);
                      if (titleMatch) title = titleMatch[1].trim();
                    }
                    // 如果没有 frontmatter 标题，尝试从内容中提取
                    if (!title || title === entry.name.replace(".md", "")) {
                      const contentTitleMatch = content.match(/^#\s+(.+)$/m);
                      if (contentTitleMatch)
                        title = contentTitleMatch[1].trim();
                    }
                  } catch {
                    // 忽略读取错误
                  }

                  results.push({
                    path: relativePath,
                    title,
                    section,
                  });
                }
              }
            } catch {
              // 目录不存在或无法访问
            }
          }

          // 文章列表
          server.middlewares.use(
            "/api/articles/list",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  // 扫描所有 section，包含完整元数据
                  const allArticles: any[] = [];
                  const sections = ["posts", "knowledge", "resources", "about"];

                  for (const section of sections) {
                    const sectionPath = path.join(SECTIONS_PATH, section);
                    if (fs.existsSync(sectionPath)) {
                      // 使用 scanArticles 获取完整元数据（包括日期）
                      const articles = await scanArticles(sectionPath);
                      // 添加 section 前缀到 path
                      articles.forEach((a) => {
                        a.path = `${section}/${a.path}`;
                      });
                      allArticles.push(...articles);
                    }
                  }

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: allArticles,
                    }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to list articles",
                    }),
                  );
                }
              } else next();
            },
          );

          // 获取所有文章列表（用于 @ 引用，轻量级）
          server.middlewares.use(
            "/api/articles/list-all",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const articles: Array<{
                    path: string;
                    title: string;
                    section: string;
                  }> = [];
                  const sections = ["posts", "knowledge", "resources", "about"];

                  for (const section of sections) {
                    const sectionPath = path.join(SECTIONS_PATH, section);
                    if (fs.existsSync(sectionPath)) {
                      await scanArticlesForList(sectionPath, section, articles);
                    }
                  }

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: articles,
                    }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to list articles",
                    }),
                  );
                }
              } else next();
            },
          );

          // 搜索文章
          server.middlewares.use(
            "/api/articles/search",
            async (req, res, next) => {
              if (req.method === "GET") {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`,
                );
                const q = url.searchParams.get("q");
                try {
                  const articles = await scanArticles(SECTIONS_PATH);
                  const query = (q || "").toLowerCase();
                  const results = articles.filter(
                    (a) =>
                      a.title.toLowerCase().includes(query) ||
                      a.description?.toLowerCase().includes(query),
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: results }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to search articles",
                    }),
                  );
                }
              } else next();
            },
          );

          // 获取文章详情
          server.middlewares.use(
            "/api/articles/detail",
            async (req, res, next) => {
              if (req.method === "GET") {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`,
                );
                const articlePath = url.searchParams.get("path");
                if (!articlePath) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({ success: false, error: "Path required" }),
                  );
                  return;
                }
                try {
                  const fullPath = path.join(SECTIONS_PATH, articlePath);
                  const content = fs.readFileSync(fullPath, "utf-8");
                  const meta = extractArticleMeta(content, articlePath);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: { ...meta, content },
                    }),
                  );
                } catch (e) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Article not found",
                    }),
                  );
                }
              } else next();
            },
          );

          // 创建文章
          server.middlewares.use("/api/articles/create", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                (async () => {
                  try {
                    const bodyText = Buffer.concat(chunks).toString();
                    console.log("[API] Raw body:", bodyText.substring(0, 200));

                    let body;
                    try {
                      body = JSON.parse(bodyText);
                    } catch (parseErr) {
                      console.error("[API] JSON parse error:", parseErr);
                      res.statusCode = 400;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: "Invalid JSON",
                        }),
                      );
                      return;
                    }

                    const {
                      title,
                      content = "",
                      section = "posts",
                      tags = [],
                      parentPath,
                      isChildDoc,
                    } = body;
                    console.log("[API] Creating article:", {
                      title,
                      section,
                      isChildDoc,
                      parentPath,
                    });

                    if (!title) {
                      res.statusCode = 400;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: "Title required",
                        }),
                      );
                      return;
                    }

                    // 生成 slug
                    const slug = generateSlug(title);

                    const date = new Date().toISOString().split("T")[0];
                    const filename = `${slug}.md`;

                    let targetDir: string;
                    let filePath: string;

                    // 处理子文档创建
                    if (isChildDoc && parentPath) {
                      // 解析父文档路径
                      // 处理可能的 .html 或 .md 后缀，以及开头的 / 和末尾的 /
                      let cleanParentPath = parentPath
                        .replace(/\.(html|md)$/i, "")
                        .replace(/^\//, "")
                        .replace(/\/$/, "");
                      // 如果路径以 sections/ 开头，去掉它（因为 SECTIONS_PATH 已经包含）
                      if (cleanParentPath.startsWith("sections/")) {
                        cleanParentPath = cleanParentPath.substring(
                          "sections/".length,
                        );
                      }
                      // 确保路径不包含 .md 后缀（前面已处理，这里再次确认）
                      cleanParentPath = cleanParentPath.replace(/\.md$/i, "");

                      // 提取父文档名称（路径的最后一部分）
                      const parentName = path.basename(cleanParentPath);
                      // 父文档的完整文件路径
                      const parentFullPath =
                        path.join(SECTIONS_PATH, cleanParentPath) + ".md";
                      // 父文档所在目录
                      const parentDir = path.dirname(parentFullPath);
                      // 父文档对应的文件夹路径（用于存放子文档）
                      const parentFolderPath = path.join(parentDir, parentName);

                      console.log("[API] Parent info:", {
                        parentFullPath,
                        parentDir,
                        parentName,
                        parentFolderPath,
                      });

                      // 检查父文档是否为叶子文档（即是否存在同名文件夹）
                      const isLeafDoc = !fs.existsSync(parentFolderPath);

                      if (isLeafDoc) {
                        // 叶子文档：需要创建同名文件夹并移动原文档
                        console.log(
                          "[API] Parent is leaf document, creating folder and moving...",
                        );

                        // 1. 创建同名文件夹
                        await fs.promises.mkdir(parentFolderPath, {
                          recursive: true,
                        });

                        // 2. 将原文档移动到文件夹内（使用 index.md，VitePress 原生支持 /folder/ → folder/index.md）
                        const targetParentPath = path.join(
                          parentFolderPath,
                          "index.md",
                        );
                        if (fs.existsSync(parentFullPath)) {
                          await fs.promises.rename(
                            parentFullPath,
                            targetParentPath,
                          );
                          console.log(
                            "[API] Moved parent doc to:",
                            targetParentPath,
                          );
                        }

                        // 3. 在文件夹内创建子文档
                        targetDir = parentFolderPath;
                      } else {
                        // 非叶子文档：直接在已有文件夹内创建
                        console.log(
                          "[API] Parent already has folder, creating inside...",
                        );
                        targetDir = parentFolderPath;
                      }

                      filePath = path.join(targetDir, filename);
                    } else {
                      // 普通文档创建
                      targetDir = path.join(SECTIONS_PATH, section);
                      filePath = path.join(targetDir, filename);
                    }

                    console.log("[API] Target path:", { targetDir, filePath });

                    // 确保目录存在
                    await fs.promises.mkdir(targetDir, { recursive: true });

                    // 创建文章
                    const frontmatter = `---
title: ${title}
date: ${date}
tags:
${tags.map((t: string) => `  - ${t}`).join("\n")}
---

${content}`;

                    await fs.promises.writeFile(filePath, frontmatter, "utf-8");
                    console.log("[API] File written successfully:", filePath);

                    // 清除 sidebar 缓存
                    clearSidebarCache(section);

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        data: {
                          path: path
                            .relative(SECTIONS_PATH, filePath)
                            .replace(/\\/g, "/"),
                          title,
                          date,
                          fullPath: filePath,
                        },
                      }),
                    );

                    // 触发热更新
                    triggerReload();
                  } catch (e) {
                    console.error("[API] Create article error:", e);
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error:
                          "Failed to create article: " + (e as Error).message,
                      }),
                    );
                  }
                })();
              });
            } else {
              next();
            }
          });

          // 更新文章
          server.middlewares.use(
            "/api/articles/update",
            async (req, res, next) => {
              if (req.method === "PUT") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { path: articlePath, content } = body;
                    const fullPath = path.join(SECTIONS_PATH, articlePath);
                    await fs.promises.writeFile(fullPath, content, "utf-8");
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        message: "Article updated",
                      }),
                    );

                    // 触发热更新
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to update article",
                      }),
                    );
                  }
                });
              } else next();
            },
          );

          // 发布文章
          server.middlewares.use(
            "/api/articles/publish",
            async (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { path: articlePath } = body;
                    const sourcePath = path.join(SECTIONS_PATH, articlePath);
                    const targetPath = articlePath.replace(
                      "/drafts/",
                      "/posts/",
                    );
                    const destPath = path.join(SECTIONS_PATH, targetPath);
                    await fs.promises.mkdir(path.dirname(destPath), {
                      recursive: true,
                    });
                    await fs.promises.rename(sourcePath, destPath);

                    // 清除相关 section 的缓存
                    clearSidebarCache("drafts");
                    clearSidebarCache("posts");

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        data: { newPath: targetPath },
                      }),
                    );

                    // 触发热更新
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to publish article",
                      }),
                    );
                  }
                });
              } else next();
            },
          );

          // 删除文章
          server.middlewares.use(
            "/api/articles/delete",
            async (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { path: articlePath } = body;
                    const fullPath = path.join(SECTIONS_PATH, articlePath);

                    // 获取 section 名称用于清除缓存
                    const section = articlePath.split("/")[0];

                    await fs.promises.unlink(fullPath);

                    // 清除 sidebar 缓存
                    clearSidebarCache(section);

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        message: "Article deleted",
                      }),
                    );

                    // 触发热更新
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to delete article",
                      }),
                    );
                  }
                });
              } else next();
            },
          );

          // 移动/重命名文章
          server.middlewares.use(
            "/api/articles/move",
            async (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { from, to } = body;
                    const sourcePath = path.join(SECTIONS_PATH, from);
                    const destPath = path.join(SECTIONS_PATH, to);

                    // 获取 section 名称用于清除缓存
                    const fromSection = from.split("/")[0];
                    const toSection = to.split("/")[0];

                    await fs.promises.mkdir(path.dirname(destPath), {
                      recursive: true,
                    });
                    await fs.promises.rename(sourcePath, destPath);

                    // 清除相关 section 的缓存
                    clearSidebarCache(fromSection);
                    if (fromSection !== toSection) {
                      clearSidebarCache(toSection);
                    }

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({ success: true, data: { newPath: to } }),
                    );

                    // 触发热更新
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to move article",
                      }),
                    );
                  }
                });
              } else next();
            },
          );

          // ============================================
          // Logs API - 日志系统（使用LogSystem）
          // ============================================

          // 添加日志
          server.middlewares.use("/api/logs/add", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  // 使用 StructuredLogger 持久化日志
                  const level = (body.level || "info").toLowerCase();
                  const event = body.event || "system";
                  const message = body.message;
                  const metadata = {
                    actor: body.actor || "system",
                    source: body.source,
                    taskId: body.taskId,
                    skillName: body.skillName,
                    duration: body.duration,
                    ...body.metadata,
                  };
                  switch (level) {
                    case "debug":
                      structuredLog.debug(event, message, metadata);
                      break;
                    case "warn":
                    case "warning":
                      structuredLog.warn(event, message, metadata);
                      break;
                    case "error":
                      structuredLog.error(event, message, metadata);
                      break;
                    case "success":
                      structuredLog.success(event, message, metadata);
                      break;
                    default:
                      structuredLog.info(event, message, metadata);
                  }
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // 获取日志
          server.middlewares.use("/api/logs/recent", async (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const count = parseInt(url.searchParams.get("count") || "100");
              const level = url.searchParams.get("level") as any;
              const logs =
                (await (structuredLog as any).getRecentLogs?.(count, level)) ||
                [];
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: logs }));
            } else next();
          });

          // 获取日志统计
          server.middlewares.use("/api/logs/stats", async (req, res, next) => {
            if (req.method === "GET") {
              const stats = (await (structuredLog as any).getStats?.()) || {};
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: stats }));
            } else next();
          });

          // 查询日志 (支持过滤)
          server.middlewares.use("/api/logs/query", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`,
                );
                const LOGS_DIR = path.join(process.cwd(), ".logs");

                if (!fs.existsSync(LOGS_DIR)) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: [] }));
                  return;
                }

                // 读取所有日志文件
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
                      const level = url.searchParams.get("level");
                      const category = url.searchParams.get("category");
                      const component = url.searchParams.get("component");
                      const keyword = url.searchParams.get("keyword");

                      if (level && log.level !== level) continue;
                      if (category && log.category !== category) continue;
                      if (component && log.component !== component) continue;
                      if (
                        keyword &&
                        !JSON.stringify(log)
                          .toLowerCase()
                          .includes(keyword.toLowerCase())
                      )
                        continue;

                      allLogs.push(log);
                    } catch (e) {
                      // 跳过无效行
                    }
                  }
                }

                // 按时间倒序排序
                allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

                // 分页
                const limit = parseInt(url.searchParams.get("limit") || "100");
                const offset = parseInt(url.searchParams.get("offset") || "0");
                const paginatedLogs = allLogs.slice(offset, offset + limit);

                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: paginatedLogs,
                    total: allLogs.length,
                  }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // 批量添加日志
          server.middlewares.use("/api/logs/batch", async (req, res, next) => {
            if (req.method === "POST") {
              try {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const logs = body.logs || [];

                    // 确保日志目录存在
                    const LOGS_DIR = path.join(process.cwd(), ".logs");
                    if (!fs.existsSync(LOGS_DIR)) {
                      fs.mkdirSync(LOGS_DIR, { recursive: true });
                    }

                    // 按日期分组写入
                    const logsByDate = new Map<string, any[]>();
                    for (const log of logs) {
                      const date = new Date(log.timestamp || Date.now())
                        .toISOString()
                        .split("T")[0];
                      if (!logsByDate.has(date)) {
                        logsByDate.set(date, []);
                      }
                      logsByDate.get(date)!.push(log);
                    }

                    for (const [date, dateLogs] of logsByDate) {
                      const filePath = path.join(LOGS_DIR, `${date}.jsonl`);
                      const lines =
                        dateLogs.map((l: any) => JSON.stringify(l)).join("\n") +
                        "\n";
                      fs.appendFileSync(filePath, lines);
                    }

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({ success: true, count: logs.length }),
                    );
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({ success: false, error: String(e) }),
                    );
                  }
                });
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // 清理日志
          server.middlewares.use(
            "/api/logs/cleanup",
            async (req, res, next) => {
              if (req.method === "POST") {
                try {
                  const chunks: Buffer[] = [];
                  req.on("data", (chunk) => chunks.push(chunk));
                  req.on("end", async () => {
                    try {
                      const body = JSON.parse(Buffer.concat(chunks).toString());
                      const days = body.days ?? 7; // 默认保留7天，days=0表示清空所有

                      // 获取日志目录
                      const LOGS_DIR = path.join(process.cwd(), ".logs");

                      if (!fs.existsSync(LOGS_DIR)) {
                        res.setHeader("Content-Type", "application/json");
                        res.end(
                          JSON.stringify({
                            success: true,
                            message: "No logs to cleanup",
                          }),
                        );
                        return;
                      }

                      const files = fs.readdirSync(LOGS_DIR);
                      const now = Date.now();
                      const cutoffTime =
                        days > 0 ? now - days * 24 * 60 * 60 * 1000 : now;

                      let deletedCount = 0;
                      for (const file of files) {
                        // 跳过审计文件和隐藏文件
                        if (file.startsWith(".") || !file.endsWith(".jsonl"))
                          continue;

                        const filePath = path.join(LOGS_DIR, file);
                        const stats = fs.statSync(filePath);

                        // 如果 days=0 或文件修改时间早于 cutoffTime，则删除
                        if (days === 0 || stats.mtime.getTime() < cutoffTime) {
                          fs.unlinkSync(filePath);
                          deletedCount++;
                        }
                      }

                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          success: true,
                          message:
                            days === 0
                              ? "All logs cleared"
                              : `Logs older than ${days} days cleaned up`,
                          deletedCount,
                        }),
                      );
                    } catch (e) {
                      res.statusCode = 500;
                      res.end(
                        JSON.stringify({ success: false, error: String(e) }),
                      );
                    }
                  });
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );

          // ============================================
          // API Debug Logs - 完整 API 交互记录
          // ============================================

          // POST /api/logs/api-debug - 保存 API 调试日志
          server.middlewares.use(
            "/api/logs/api-debug",
            async (req, res, next) => {
              if (req.method === "POST") {
                try {
                  const chunks: Buffer[] = [];
                  req.on("data", (chunk) => chunks.push(chunk));
                  req.on("end", async () => {
                    try {
                      const body = JSON.parse(Buffer.concat(chunks).toString());
                      const {
                        sessionId,
                        startTime,
                        endTime,
                        totalRounds,
                        entries,
                      } = body;

                      if (!sessionId || !entries) {
                        res.statusCode = 400;
                        res.end(
                          JSON.stringify({
                            success: false,
                            error:
                              "Missing required fields: sessionId, entries",
                          }),
                        );
                        return;
                      }

                      // 创建调试日志目录
                      const debugDir = path.join(
                        process.cwd(),
                        ".logs",
                        "api-debug",
                      );
                      if (!fs.existsSync(debugDir)) {
                        fs.mkdirSync(debugDir, { recursive: true });
                      }

                      // 生成文件名：timestamp-sessionId.json
                      const timestamp = new Date()
                        .toISOString()
                        .replace(/[:.]/g, "-");
                      const filename = `${timestamp}-${sessionId}.json`;
                      const filepath = path.join(debugDir, filename);

                      // 构建完整的调试数据
                      const debugData = {
                        sessionId,
                        startTime,
                        endTime: endTime || new Date().toISOString(),
                        totalRounds,
                        entryCount: entries.length,
                        entries,
                      };

                      // 写入文件
                      fs.writeFileSync(
                        filepath,
                        JSON.stringify(debugData, null, 2),
                        "utf-8",
                      );

                      console.log(
                        `[API Debug] Saved to ${filename} (${entries.length} entries)`,
                      );

                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          success: true,
                          data: {
                            filename,
                            entryCount: entries.length,
                          },
                        }),
                      );
                    } catch (e) {
                      res.statusCode = 500;
                      res.end(
                        JSON.stringify({ success: false, error: String(e) }),
                      );
                    }
                  });
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );

          // GET /api/logs/api-debug/list - 列出所有调试日志文件
          server.middlewares.use(
            "/api/logs/api-debug/list",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const debugDir = path.join(
                    process.cwd(),
                    ".logs",
                    "api-debug",
                  );

                  if (!fs.existsSync(debugDir)) {
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ success: true, data: [] }));
                    return;
                  }

                  const files = fs
                    .readdirSync(debugDir)
                    .filter((f) => f.endsWith(".json"));

                  // 获取文件信息
                  const fileInfos = files.map((filename) => {
                    const filepath = path.join(debugDir, filename);
                    const stats = fs.statSync(filepath);
                    return {
                      filename,
                      size: stats.size,
                      createdAt: stats.ctime.toISOString(),
                    };
                  });

                  // 按创建时间倒序
                  fileInfos.sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime(),
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: fileInfos }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );

          // POST /api/logs/session - 保存 Session 日志
          server.middlewares.use(
            "/api/logs/session",
            async (req, res, next) => {
              if (req.method === "POST") {
                try {
                  const chunks: Buffer[] = [];
                  req.on("data", (chunk) => chunks.push(chunk));
                  req.on("end", async () => {
                    try {
                      const sessionLog = JSON.parse(
                        Buffer.concat(chunks).toString(),
                      );

                      // 保存到 .logs/sessions 目录
                      const sessionsDir = path.join(
                        process.cwd(),
                        ".logs",
                        "sessions",
                      );
                      if (!fs.existsSync(sessionsDir)) {
                        fs.mkdirSync(sessionsDir, { recursive: true });
                      }

                      // 生成文件名
                      const filename =
                        sessionLog.filename || `session-${Date.now()}.json`;
                      const filepath = path.join(sessionsDir, filename);

                      // 写入文件
                      fs.writeFileSync(
                        filepath,
                        JSON.stringify(sessionLog, null, 2),
                        "utf-8",
                      );

                      console.log(
                        `[Session Log] Saved to ${filename} (${sessionLog.entries?.length || 0} entries)`,
                      );

                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          success: true,
                          data: { filename, path: filepath },
                        }),
                      );
                    } catch (e) {
                      console.error("[Session Log] Error saving:", e);
                      res.statusCode = 500;
                      res.end(
                        JSON.stringify({ success: false, error: String(e) }),
                      );
                    }
                  });
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );

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

          // ============================================
          // Background Tasks API - 简化版（模拟数据）
          // ============================================
          // 注意: BackgroundTaskManager 模块未实现，以下 API 返回模拟数据

          // 模拟任务模板
          const MOCK_TASK_TEMPLATES = [
            {
              id: "sync-knowledge",
              name: "同步知识库",
              description: "从外部源同步知识库内容",
              icon: "🔄",
              category: "system",
              params: [
                {
                  name: "source",
                  type: "string",
                  required: true,
                  description: "数据源 URL",
                },
                {
                  name: "force",
                  type: "boolean",
                  required: false,
                  description: "强制同步",
                },
              ],
            },
            {
              id: "generate-index",
              name: "生成索引",
              description: "为知识库生成搜索索引",
              icon: "📇",
              category: "system",
              params: [
                {
                  name: "sections",
                  type: "array",
                  required: false,
                  description: "指定章节",
                },
              ],
            },
            {
              id: "backup-data",
              name: "备份数据",
              description: "备份所有数据到指定位置",
              icon: "💾",
              category: "maintenance",
              params: [
                {
                  name: "destination",
                  type: "string",
                  required: true,
                  description: "备份目标路径",
                },
              ],
            },
            {
              id: "clean-cache",
              name: "清理缓存",
              description: "清理过期缓存文件",
              icon: "🧹",
              category: "maintenance",
              params: [],
            },
          ];

          // 获取任务模板列表
          server.middlewares.use(
            "/api/agent/tasks/templates",
            (req, res, next) => {
              if (req.method === "GET") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: MOCK_TASK_TEMPLATES,
                    message: "Task system not available - returning mock data",
                  }),
                );
              } else next();
            },
          );

          // 触发任务
          server.middlewares.use(
            "/api/agent/tasks/trigger",
            (req, res, next) => {
              if (req.method === "POST") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available",
                    data: {
                      id: `mock-task-${Date.now()}`,
                      type: "mock",
                      name: "Mock Task",
                      status: "not_available",
                      createdAt: new Date().toISOString(),
                    },
                  }),
                );
              } else next();
            },
          );

          // 批量触发任务
          server.middlewares.use(
            "/api/agent/tasks/trigger-batch",
            (req, res, next) => {
              if (req.method === "POST") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available",
                    data: [],
                  }),
                );
              } else next();
            },
          );

          // 获取任务列表
          server.middlewares.use("/api/agent/tasks", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Task system not available - returning mock data",
                  data: [],
                  stats: {
                    total: 0,
                    pending: 0,
                    running: 0,
                    completed: 0,
                    failed: 0,
                    cancelled: 0,
                  },
                }),
              );
            } else next();
          });

          // 获取单个任务详情
          server.middlewares.use(
            "/api/agent/tasks/detail",
            (req, res, next) => {
              if (req.method === "GET") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available",
                    data: null,
                  }),
                );
              } else next();
            },
          );

          // 取消任务
          server.middlewares.use(
            "/api/agent/tasks/cancel",
            (req, res, next) => {
              if (req.method === "POST") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available - no task to cancel",
                  }),
                );
              } else next();
            },
          );

          // 重试任务
          server.middlewares.use("/api/agent/tasks/retry", (req, res, next) => {
            if (req.method === "POST") {
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Task system not available",
                  data: null,
                }),
              );
            } else next();
          });

          // 删除任务
          server.middlewares.use(
            "/api/agent/tasks/delete",
            (req, res, next) => {
              if (req.method === "POST") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available - no task to delete",
                  }),
                );
              } else next();
            },
          );

          // ============================================
          // Chat API - 流式消息发送
          // ============================================
          server.middlewares.use("/api/chat", async (req, res, next) => {
            if (req.method !== "POST") return next();

            const chunks: Buffer[] = [];
            req.on("data", (chunk: any) => chunks.push(chunk));
            req.on("end", async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { messages, model, temperature, maxTokens, stream } =
                  body;

                console.log("[API Chat] Request received:", {
                  model,
                  messages: messages?.length,
                  stream,
                });

                // 导入 LLM Manager
                // const { getLLMManager } = await import('./agent/llm');
                // const llm = getLLMManager();
                const llm: any = {
                  chat: async () => ({ content: "Not Implemented" }),
                  chatStream: async (opts: any, cb: any) =>
                    cb({ finishReason: "unsupported" }),
                };

                // 非流式响应
                if (stream === false) {
                  console.log("[API Chat] Non-streaming request");
                  const response = await llm.chat({
                    messages,
                    model,
                    temperature,
                    maxTokens,
                  });

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        content: response.content,
                        model: response.model,
                        usage: response.usage,
                      },
                    }),
                  );
                  return;
                }

                // 流式响应
                console.log("[API Chat] Starting streaming response");
                res.setHeader("Content-Type", "text/event-stream");
                res.setHeader("Cache-Control", "no-cache");
                res.setHeader("Connection", "keep-alive");

                const abortController = new AbortController();
                let isEnded = false;
                let chunkCount = 0;

                req.on("close", () => {
                  console.log("[API Chat] Request closed by client");
                  abortController.abort();
                  isEnded = true;
                });

                try {
                  await llm.chatStream(
                    {
                      messages,
                      model,
                      temperature,
                      maxTokens,
                      stream: true,
                      signal: abortController.signal,
                    },
                    (chunk: any) => {
                      if (isEnded) return;

                      chunkCount++;
                      if (chunkCount <= 3 || chunk.finishReason) {
                        console.log(`[API Chat] Chunk ${chunkCount}:`, {
                          content: chunk.content?.substring(0, 50),
                          finishReason: chunk.finishReason,
                        });
                      }

                      const data: any = {
                        content: chunk.content,
                        reasoning: chunk.reasoning,
                        isReasoning: !!chunk.reasoning,
                      };

                      if (chunk.finishReason) {
                        data.finishReason = chunk.finishReason;
                        data.usage = chunk.usage;
                      }

                      res.write(`data: ${JSON.stringify(data)}\n\n`);

                      if (chunk.finishReason) {
                        res.write("data: [DONE]\n\n");
                        res.end();
                        isEnded = true;
                        console.log(
                          "[API Chat] Stream finished, total chunks:",
                          chunkCount,
                        );
                      }
                    },
                  );

                  if (!isEnded) {
                    console.log("[API Chat] Stream ended without finishReason");
                    res.write("data: [DONE]\n\n");
                    res.end();
                  }
                } catch (streamError) {
                  console.error("[API Chat] Stream error:", streamError);
                  throw streamError;
                }
              } catch (error) {
                console.error("[API Chat Error]", error);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: false,
                      error:
                        error instanceof Error ? error.message : "Chat failed",
                    }),
                  );
                } else {
                  res.write(
                    `data: ${JSON.stringify({ error: String(error) })}\n\n`,
                  );
                  res.end();
                }
              }
            });
          });

          // ============================================
          // Health & System API
          // ============================================
          server.middlewares.use("/api/health", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  data: {
                    llm: true,
                    memory: true,
                    files: true,
                    git: false,
                  },
                }),
              );
            } else next();
          });

          server.middlewares.use("/api/system/resources", (req, res, next) => {
            if (req.method === "GET") {
              // 模拟资源使用数据
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  data: {
                    memory: Math.floor(35 + Math.random() * 30),
                    cpu: Math.floor(20 + Math.random() * 40),
                    latency: Math.floor(30 + Math.random() * 50),
                  },
                }),
              );
            } else next();
          });

          // ============================================
          // Agent CRUD API - 持久化存储
          // ============================================

          const AGENTS_FILE = path.join(process.cwd(), ".data", "agents.json");

          // 确保数据目录存在
          if (!fs.existsSync(path.dirname(AGENTS_FILE))) {
            fs.mkdirSync(path.dirname(AGENTS_FILE), { recursive: true });
          }

          // 读取 Agents
          function readAgents(): any[] {
            try {
              if (fs.existsSync(AGENTS_FILE)) {
                const data = fs.readFileSync(AGENTS_FILE, "utf-8");
                const agents = JSON.parse(data);
                // 为每个 agent 添加默认值
                return agents.map((agent: any) => ({
                  ...agent,
                  capabilities: agent.capabilities || {
                    mode: "raw",
                    skillIds: [],
                    toolIds: [],
                    customSystemPrompt: "你是一个 helpful 的 AI 助手。",
                  },
                  memory: agent.memory || {
                    enabled: true,
                    content: "",
                    autoExtract: true,
                    maxTokens: 2000,
                  },
                  permissions: agent.permissions || [],
                  callCount: agent.callCount || 0,
                  isDefault: agent.isDefault || false,
                  status: agent.status || "online",
                  seat: agent.seat || 1,
                  lastActiveAt: agent.lastActiveAt || Date.now(),
                }));
              }
            } catch (e) {
              console.error("[API] Failed to read agents:", e);
            }
            return [];
          }

          // 写入 Agents
          function writeAgents(agents: any[]) {
            try {
              fs.writeFileSync(
                AGENTS_FILE,
                JSON.stringify(agents, null, 2),
                "utf-8",
              );
            } catch (e) {
              console.error("[API] Failed to write agents:", e);
            }
          }

          // 初始化默认 Agent（如果没有数据）
          function initializeDefaultAgent() {
            const agents = readAgents();
            if (agents.length === 0) {
              const defaultAgent = {
                id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: "Meta 助手",
                avatar: "🤖",
                description:
                  "基于 DeepSeek 大模型的通用 AI 助手，为您提供专业智能对话体验",
                level: "meta",
                status: "online",
                seat: 1,
                capabilities: {
                  mode: "raw",
                  skillIds: [],
                  toolIds: [],
                  customSystemPrompt:
                    "你是一个 helpful 的 AI 助手，擅长回答问题、提供建议和协助完成各种任务。",
                },
                memory: {
                  enabled: true,
                  content: "",
                  autoExtract: true,
                  maxTokens: 2000,
                },
                permissions: [],
                callCount: 0,
                isDefault: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastActiveAt: Date.now(),
              };
              writeAgents([defaultAgent]);
              console.log("[API] Initialized default agent");
            }
          }

          // 执行初始化
          initializeDefaultAgent();

          // GET /api/agents - 获取所有 Agents
          // POST /api/agents - 创建 Agent（只处理精确路径，不包括子路径）
          server.middlewares.use("/api/agents", (req, res, next) => {
            const url = req.url || "";
            // 只处理精确路径 /api/agents 或 /api/agents/（不包括 /api/agents/update 等子路径）
            if (url !== "/" && url !== "" && !url.startsWith("?")) {
              return next();
            }

            if (req.method === "GET") {
              const agents = readAgents();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: agents }));
            } else if (req.method === "POST") {
              // POST /api/agents - 创建 Agent
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const agents = readAgents();

                  const newAgent = {
                    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    name: body.name || "New Agent",
                    avatar: body.avatar || "🤖",
                    description: body.description || "A helpful AI agent",
                    level: body.level || "custom",
                    status: "online",
                    seat: 1,
                    capabilities: body.capabilities || {
                      mode: "raw",
                      skillIds: [],
                      toolIds: [],
                      customSystemPrompt: "你是一个 helpful 的 AI 助手。",
                    },
                    memory: body.memory || {
                      enabled: true,
                      content: "",
                      autoExtract: true,
                      maxTokens: 2000,
                    },
                    permissions: [],
                    callCount: 0,
                    isDefault: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    lastActiveAt: Date.now(),
                  };

                  agents.push(newAgent);
                  writeAgents(agents);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: newAgent }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // PUT /api/agents/:id - 更新 Agent
          server.middlewares.use("/api/agents/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;

                  const agents = readAgents();
                  const index = agents.findIndex((a: any) => a.id === id);

                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Agent not found",
                      }),
                    );
                    return;
                  }

                  agents[index] = {
                    ...agents[index],
                    ...updates,
                    updatedAt: Date.now(),
                  };
                  writeAgents(agents);

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: agents[index] }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // DELETE /api/agents/:id - 删除 Agent
          server.middlewares.use("/api/agents/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;

                  let agents = readAgents();
                  agents = agents.filter((a: any) => a.id !== id);
                  writeAgents(agents);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // POST /api/agents/trigger - 触发 Agent 执行
          server.middlewares.use("/api/agents/trigger", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { agentId, triggerId } = body;

                  let agents = readAgents();
                  const agent = agents.find((a: any) => a.id === agentId);

                  if (!agent) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Agent not found",
                      }),
                    );
                    return;
                  }

                  // 更新触发统计
                  if (agent.triggers) {
                    const trigger = agent.triggers.find(
                      (t: any) => t.id === triggerId,
                    );
                    if (trigger) {
                      trigger.lastTriggered = new Date().toISOString();
                      trigger.triggerCount = (trigger.triggerCount || 0) + 1;
                    }
                  }

                  // 更新 Agent 运行统计
                  agent.totalRuns = (agent.totalRuns || 0) + 1;
                  agent.lastRunAt = Date.now();
                  agent.status = "running";
                  agent.updatedAt = Date.now();

                  writeAgents(agents);

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: { agent, triggered: true },
                    }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // GET /api/agents/:id - 获取单个 Agent
          server.middlewares.use("/api/agents/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 只处理 /api/agents/:id 格式，排除其他子路径如 /active
            if (
              parts.length !== 1 ||
              parts[0] === "active" ||
              req.method !== "GET"
            )
              return next();

            const id = parts[0].split("?")[0];

            try {
              const agents = readAgents();
              const agent = agents.find((a: any) => a.id === id);

              if (!agent) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Agent not found" }),
                );
                return;
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: agent }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(e) }));
            }
          });

          // GET/POST /api/agents/active - 活跃 Agent 管理
          const ACTIVE_AGENT_FILE = path.join(
            process.cwd(),
            ".data",
            "active-agent.json",
          );

          server.middlewares.use("/api/agents/active", (req, res, next) => {
            if (req.method === "GET") {
              // 获取活跃 Agent ID
              try {
                let activeId = null;
                if (fs.existsSync(ACTIVE_AGENT_FILE)) {
                  const data = JSON.parse(
                    fs.readFileSync(ACTIVE_AGENT_FILE, "utf-8"),
                  );
                  activeId = data.id;
                }
                // 如果没有设置，返回第一个 agent
                if (!activeId) {
                  const agents = readAgents();
                  activeId = agents[0]?.id || null;
                }
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: { id: activeId } }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else if (req.method === "POST") {
              // 设置活跃 Agent ID
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;

                  fs.writeFileSync(
                    ACTIVE_AGENT_FILE,
                    JSON.stringify({ id, updatedAt: Date.now() }),
                    "utf-8",
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // ============================================
          // Skills API - 技能管理
          // ============================================

          const SKILLS_FILE = path.join(process.cwd(), ".data", "skills.json");

          // 确保数据目录存在
          if (!fs.existsSync(path.dirname(SKILLS_FILE))) {
            fs.mkdirSync(path.dirname(SKILLS_FILE), { recursive: true });
          }

          // Skills 目录路径
          const SKILLS_DIR = path.join(process.cwd(), ".skills");

          // 确保 Skills 目录存在
          function ensureSkillsDir() {
            if (!fs.existsSync(SKILLS_DIR)) {
              fs.mkdirSync(SKILLS_DIR, { recursive: true });
            }
          }

          // 解析 SKILL.md 文件
          function parseSkillMd(
            content: string,
            skillId: string,
            dirName: string,
          ): any {
            const lines = content.split("\n");
            const skill: any = {
              id: skillId,
              name: dirName.replace(/-/g, " "),
              icon: "🔧",
              description: "",
              content: "",
              systemPrompt: "",
              category: "custom",
              version: "1.0.0",
              isBuiltIn: false,
              enabled: true,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              tags: [],
              tools: [],
              usageScenarios: [],
              author: "user",
            };

            let section = "";
            let promptLines: string[] = [];
            let inPrompt = false;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];

              // 解析标题
              if (line.startsWith("# ") && !line.startsWith("## ")) {
                skill.name = line.substring(2).trim();
                continue;
              }

              // 解析章节
              if (line.startsWith("## ")) {
                section = line.substring(3).trim().toLowerCase();
                inPrompt = false;
                continue;
              }

              // 解析元数据
              if (section === "元数据" || section === "metadata") {
                if (line.startsWith("- **")) {
                  const match = line.match(/- \*\*(\w+)\*\*:\s*`?(.+?)`?$/);
                  if (match) {
                    const [, key, value] = match;
                    switch (key.toLowerCase()) {
                      case "id":
                        skill.id = value;
                        break;
                      case "图标":
                      case "icon":
                        skill.icon = value;
                        break;
                      case "分类":
                      case "category":
                        skill.category = value;
                        break;
                      case "版本":
                      case "version":
                        skill.version = value;
                        break;
                      case "标签":
                      case "tags":
                        skill.tags = value.split(",").map((t) => t.trim());
                        break;
                      case "作者":
                      case "author":
                        skill.author = value;
                        break;
                      case "内置":
                      case "built-in":
                        skill.isBuiltIn = value === "true";
                        break;
                      case "启用":
                      case "enabled":
                        skill.enabled = value !== "false";
                        break;
                    }
                  }
                }
              }

              // 解析描述
              if (section === "描述" || section === "description") {
                if (line.trim() && !line.startsWith("-")) {
                  skill.description = line.trim();
                }
              }

              // 解析使用场景
              if (
                section === "使用场景" ||
                section === "usage scenarios" ||
                section === "usagescenarios"
              ) {
                if (line.startsWith("- ")) {
                  skill.usageScenarios.push(line.substring(2).trim());
                }
              }

              // 解析可用工具
              if (section === "可用工具" || section === "tools") {
                if (line.startsWith("- ")) {
                  skill.tools.push(line.substring(2).trim());
                }
              }

              // 解析 Prompt
              if (section === "prompt" || (line.startsWith("---") && section)) {
                if (line.startsWith("---")) {
                  inPrompt = true;
                  continue;
                }
                if (inPrompt || section === "prompt") {
                  promptLines.push(line);
                }
              }
            }

            skill.content = promptLines.join("\n").trim();
            skill.systemPrompt = skill.content;
            return skill;
          }

          // 生成 SKILL.md 内容
          function generateSkillMd(skill: any): string {
            const usageScenarios = skill.usageScenarios || [];
            return `# ${skill.name}

## 描述
${skill.description || ""}

## 元数据
- **ID**: \`${skill.id}\`
- **图标**: ${skill.icon || "🔧"}
- **分类**: ${skill.category || "custom"}
- **版本**: ${skill.version || "1.0.0"}
- **标签**: ${(skill.tags || []).join(", ")}
- **作者**: ${skill.author || ""}
- **内置**: ${skill.isBuiltIn || false}
- **启用**: ${skill.enabled ?? true}

## 使用场景
${usageScenarios.map((s: string) => `- ${s}`).join("\n") || "- 暂无使用场景"}

## 可用工具
${(skill.tools || []).map((t: string) => `- ${t}`).join("\n") || "- 暂无工具"}

---

## Prompt

${skill.content || skill.systemPrompt || ""}
`;
          }

          // 读取所有 Skills (从 SKILL.md 文件)
          function readSkills(): any[] {
            ensureSkillsDir();
            const skills: any[] = [];

            try {
              const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

              for (const dir of dirs) {
                if (dir.isDirectory()) {
                  const skillFile = path.join(SKILLS_DIR, dir.name, "SKILL.md");
                  if (fs.existsSync(skillFile)) {
                    const content = fs.readFileSync(skillFile, "utf-8");
                    const stat = fs.statSync(skillFile);
                    const skill = parseSkillMd(content, dir.name, dir.name);
                    skill.createdAt = stat.birthtimeMs;
                    skill.updatedAt = stat.mtimeMs;
                    skills.push(skill);
                  }
                }
              }
            } catch (e) {
              console.error("[API] Failed to read skills:", e);
            }

            return skills.sort((a, b) => b.updatedAt - a.updatedAt);
          }

          // 写入 Skill (创建/更新 SKILL.md 文件)
          function writeSkill(skill: any): void {
            ensureSkillsDir();
            const dirName =
              skill.id || skill.name.toLowerCase().replace(/\s+/g, "-");
            const skillDir = path.join(SKILLS_DIR, dirName);

            if (!fs.existsSync(skillDir)) {
              fs.mkdirSync(skillDir, { recursive: true });
            }

            const skillFile = path.join(skillDir, "SKILL.md");
            const content = generateSkillMd(skill);
            fs.writeFileSync(skillFile, content, "utf-8");
          }

          // 删除 Skill (删除目录)
          function deleteSkillDir(skillId: string): boolean {
            const skillDir = path.join(SKILLS_DIR, skillId);
            if (fs.existsSync(skillDir)) {
              fs.rmSync(skillDir, { recursive: true, force: true });
              return true;
            }
            return false;
          }

          // GET /api/skills - 获取所有 Skills
          server.middlewares.use("/api/skills", (req, res, next) => {
            const url = req.url || "";
            if (url !== "/" && url !== "" && !url.startsWith("?")) {
              return next();
            }

            if (req.method === "GET") {
              const skills = readSkills();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: skills }));
            } else if (req.method === "POST") {
              // POST /api/skills - 创建 Skill
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());

                  const newSkill = {
                    id:
                      body.id ||
                      `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    ...body,
                    // 字段映射：支持 content 和 systemPrompt 两种字段名
                    systemPrompt: body.content || body.systemPrompt || "",
                    usageScenarios: body.usageScenarios || [],
                    isBuiltIn: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };

                  writeSkill(newSkill);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: newSkill }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // GET /api/skills/:id - 获取单个 Skill
          server.middlewares.use("/api/skills/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 只处理单个 ID 的情况，排除 update/delete 等子路径
            if (
              parts.length !== 1 ||
              ["update", "delete"].includes(parts[0]) ||
              req.method !== "GET"
            ) {
              return next();
            }

            const id = parts[0].split("?")[0];
            try {
              const skills = readSkills();
              const skill = skills.find((s: any) => s.id === id);

              if (!skill) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Skill not found" }),
                );
                return;
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: skill }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(e) }));
            }
          });

          // POST /api/skills/update - 更新 Skill
          server.middlewares.use("/api/skills/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;

                  const skills = readSkills();
                  const index = skills.findIndex((s: any) => s.id === id);

                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Skill not found",
                      }),
                    );
                    return;
                  }

                  // 不允许修改内置技能标记和ID
                  delete updates.isBuiltIn;
                  delete updates.id;

                  // 字段映射
                  if (updates.content !== undefined) {
                    updates.systemPrompt = updates.content;
                  }
                  if (updates.usageScenarios === undefined) {
                    updates.usageScenarios = skills[index].usageScenarios || [];
                  }

                  const updatedSkill = {
                    ...skills[index],
                    ...updates,
                    updatedAt: Date.now(),
                  };
                  writeSkill(updatedSkill);

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: updatedSkill }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // POST /api/skills/delete - 删除 Skill
          server.middlewares.use("/api/skills/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;

                  const skills = readSkills();
                  const skill = skills.find((s: any) => s.id === id);

                  if (skill && skill.isBuiltIn) {
                    res.statusCode = 403;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Cannot delete built-in skill",
                      }),
                    );
                    return;
                  }

                  deleteSkillDir(id);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // ============================================
          // Memory API - 记忆管理
          // ============================================

          const MEMORIES_FILE = path.join(
            process.cwd(),
            ".data",
            "memories.json",
          );

          function readMemories(): any[] {
            try {
              if (fs.existsSync(MEMORIES_FILE)) {
                return JSON.parse(fs.readFileSync(MEMORIES_FILE, "utf-8"));
              }
            } catch (e) {
              console.error("[API] Failed to read memories:", e);
            }
            return [];
          }

          function writeMemories(memories: any[]) {
            try {
              fs.writeFileSync(
                MEMORIES_FILE,
                JSON.stringify(memories, null, 2),
                "utf-8",
              );
            } catch (e) {
              console.error("[API] Failed to write memories:", e);
            }
          }

          // GET /api/memories - 获取所有记忆
          // POST /api/memories - 创建记忆
          server.middlewares.use("/api/memories", (req, res, next) => {
            const url = req.url || "";
            if (url !== "/" && url !== "" && !url.startsWith("?")) {
              return next();
            }

            if (req.method === "GET") {
              const memories = readMemories();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: memories }));
            } else if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const memories = readMemories();

                  // FIX: 添加 enabled 默认值 true
                  const newMemory = {
                    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    enabled: true,
                    ...body,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };

                  memories.push(newMemory);
                  writeMemories(memories);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: newMemory }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // GET /api/memories/:id - 获取单个记忆
          server.middlewares.use("/api/memories/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 只处理单个 ID 的情况，排除 update/delete/search/stats/clear 等子路径
            const reservedPaths = [
              "update",
              "delete",
              "search",
              "stats",
              "clear",
            ];
            if (
              parts.length !== 1 ||
              reservedPaths.includes(parts[0]) ||
              req.method !== "GET"
            ) {
              return next();
            }

            const id = parts[0].split("?")[0];
            try {
              const memories = readMemories();
              const memory = memories.find((m: any) => m.id === id);

              if (!memory) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Memory not found" }),
                );
                return;
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: memory }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(e) }));
            }
          });

          // POST /api/memories/update - 更新记忆
          server.middlewares.use("/api/memories/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;

                  const memories = readMemories();
                  const index = memories.findIndex((m: any) => m.id === id);

                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Memory not found",
                      }),
                    );
                    return;
                  }

                  memories[index] = {
                    ...memories[index],
                    ...updates,
                    updatedAt: Date.now(),
                  };
                  writeMemories(memories);

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: memories[index] }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // POST /api/memories/delete - 删除记忆
          server.middlewares.use("/api/memories/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;

                  let memories = readMemories();
                  memories = memories.filter((m: any) => m.id !== id);
                  writeMemories(memories);

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: { id, deleted: true },
                    }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // POST /api/memories/search - 搜索记忆
          server.middlewares.use("/api/memories/search", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { query, category, minImportance, limit = 50 } = body;

                  let memories = readMemories();

                  if (category) {
                    memories = memories.filter(
                      (m: any) => m.category === category,
                    );
                  }

                  if (minImportance !== undefined) {
                    memories = memories.filter(
                      (m: any) => m.importance >= minImportance,
                    );
                  }

                  if (query) {
                    const q = query.toLowerCase();
                    memories = memories.filter((m: any) =>
                      m.content.toLowerCase().includes(q),
                    );
                  }

                  memories = memories.slice(0, limit);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: memories }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // GET /api/memories/stats - 获取记忆统计
          server.middlewares.use("/api/memories/stats", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const memories = readMemories();
                const byCategory: Record<string, number> = {};

                memories.forEach((m: any) => {
                  byCategory[m.category] = (byCategory[m.category] || 0) + 1;
                });

                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: {
                      total: memories.length,
                      enabled: memories.filter((m: any) => m.enabled).length,
                      byCategory,
                    },
                  }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // POST /api/memories/clear - 清空所有记忆
          server.middlewares.use("/api/memories/clear", (req, res, next) => {
            if (req.method === "POST") {
              try {
                writeMemories([]);
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: { cleared: true } }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // ============================================
          // MCP Servers API - MCP 服务器管理
          // ============================================

          const MCP_SERVERS_FILE = path.join(
            process.cwd(),
            ".data",
            "mcp-servers.json",
          );

          function readMCPServers(): any[] {
            try {
              if (fs.existsSync(MCP_SERVERS_FILE)) {
                return JSON.parse(fs.readFileSync(MCP_SERVERS_FILE, "utf-8"));
              }
            } catch (e) {
              console.error("[API] Failed to read MCP servers:", e);
            }
            return [];
          }

          function writeMCPServers(servers: any[]) {
            try {
              fs.writeFileSync(
                MCP_SERVERS_FILE,
                JSON.stringify(servers, null, 2),
                "utf-8",
              );
            } catch (e) {
              console.error("[API] Failed to write MCP servers:", e);
            }
          }

          // GET /api/mcp/servers - 获取所有 MCP 服务器
          // POST /api/mcp/servers - 创建 MCP 服务器
          server.middlewares.use("/api/mcp/servers", (req, res, next) => {
            const url = req.url || "";
            if (url !== "/" && url !== "" && !url.startsWith("?")) {
              return next();
            }

            if (req.method === "GET") {
              const servers = readMCPServers();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: servers }));
            } else if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const servers = readMCPServers();

                  // FIX: 统一生成一个 ID，避免 server.id 和 server.config.id 不一致
                  const serverId =
                    body.id ||
                    `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                  const newServer = {
                    id: serverId,
                    config: { ...body, id: serverId },
                    status: "disconnected",
                    tools: [],
                    resources: [],
                    prompts: [],
                    connectAttempts: 0,
                  };

                  servers.push(newServer);
                  writeMCPServers(servers);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: newServer }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // GET /api/mcp/servers/:id - 获取单个 MCP 服务器
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 只处理单个 ID 的情况，排除 update/delete/connect/disconnect/tools 等子路径
            const reservedPaths = [
              "update",
              "delete",
              "connect",
              "disconnect",
              "tools",
            ];
            if (
              parts.length !== 1 ||
              reservedPaths.includes(parts[0]) ||
              req.method !== "GET"
            ) {
              return next();
            }

            const id = parts[0].split("?")[0];
            try {
              const servers = readMCPServers();
              const server = servers.find((s: any) => s.id === id);

              if (!server) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Server not found" }),
                );
                return;
              }

              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: server }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(e) }));
            }
          });

          // POST /api/mcp/servers/update - 更新 MCP 服务器
          server.middlewares.use(
            "/api/mcp/servers/update",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { id, ...configUpdates } = body;

                    if (!id) {
                      res.statusCode = 400;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: "Server ID required",
                        }),
                      );
                      return;
                    }

                    const servers = readMCPServers();
                    const index = servers.findIndex((s: any) => s.id === id);

                    if (index === -1) {
                      res.statusCode = 404;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: "Server not found",
                        }),
                      );
                      return;
                    }

                    // FIX: 只将 configUpdates 合并到 config 中
                    servers[index] = {
                      ...servers[index],
                      config: { ...servers[index].config, ...configUpdates },
                      updatedAt: Date.now(),
                    };
                    writeMCPServers(servers);

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({ success: true, data: servers[index] }),
                    );
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({ success: false, error: String(e) }),
                    );
                  }
                });
              } else next();
            },
          );

          // POST /api/mcp/servers/delete - 删除 MCP 服务器
          server.middlewares.use(
            "/api/mcp/servers/delete",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { id } = body;

                    let servers = readMCPServers();
                    servers = servers.filter((s: any) => s.id !== id);
                    writeMCPServers(servers);

                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ success: true }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({ success: false, error: String(e) }),
                    );
                  }
                });
              } else next();
            },
          );

          // POST /api/mcp/servers/:id/connect - 连接 MCP Server
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 处理 /:id/connect 路径 (parts = [id, 'connect'])
            if (parts.length !== 2 || parts[1] !== "connect") return next();

            const id = parts[0].split("?")[0];

            if (req.method === "POST") {
              try {
                const servers = readMCPServers();
                const index = servers.findIndex((s: any) => s.id === id);

                if (index === -1) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "MCP server not found",
                    }),
                  );
                  return;
                }

                // 更新连接状态为 connected
                servers[index].status = "connected";
                servers[index].lastConnectedAt = Date.now();
                writeMCPServers(servers);

                console.log(
                  `[API] MCP server connected: ${servers[index].name}`,
                );
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: servers[index] }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // POST /api/mcp/servers/:id/disconnect - 断开 MCP Server
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 处理 /:id/disconnect 路径 (parts = [id, 'disconnect'])
            if (parts.length !== 2 || parts[1] !== "disconnect") return next();

            const id = parts[0].split("?")[0];

            if (req.method === "POST") {
              try {
                const servers = readMCPServers();
                const index = servers.findIndex((s: any) => s.id === id);

                if (index === -1) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "MCP server not found",
                    }),
                  );
                  return;
                }

                // 更新连接状态为 disconnected
                servers[index].status = "disconnected";
                writeMCPServers(servers);

                console.log(
                  `[API] MCP server disconnected: ${servers[index].name}`,
                );
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: servers[index] }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // POST /api/mcp/servers/:id/tools/:toolName/execute - 执行 MCP 工具
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 处理 /:id/tools/:toolName/execute 路径 (parts = [id, 'tools', toolName, 'execute'])
            if (
              parts.length !== 4 ||
              parts[1] !== "tools" ||
              parts[3] !== "execute"
            )
              return next();

            const id = parts[0].split("?")[0];
            const toolName = parts[2];

            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const args = JSON.parse(Buffer.concat(chunks).toString());
                  const servers = readMCPServers();
                  const server = servers.find((s: any) => s.id === id);

                  if (!server) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "MCP server not found",
                      }),
                    );
                    return;
                  }

                  if (server.status !== "connected") {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "MCP server not connected",
                      }),
                    );
                    return;
                  }

                  // 检查工具是否存在
                  const tool = server.tools?.find(
                    (t: any) => t.name === toolName,
                  );
                  if (!tool) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: `Tool '${toolName}' not found`,
                      }),
                    );
                    return;
                  }

                  // 模拟工具执行（实际项目中这里应该调用 MCP 客户端）
                  console.log(
                    `[API] Executing MCP tool: ${server.name}/${toolName}`,
                    args,
                  );

                  // 返回模拟成功响应
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        success: true,
                        result: JSON.stringify({
                          executed: true,
                          tool: toolName,
                          args,
                        }),
                      },
                    }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // ============================================
          // Chat Sessions API - 聊天会话管理
          // ============================================

          const SESSIONS_FILE = path.join(
            process.cwd(),
            ".data",
            "sessions.json",
          );
          const SESSION_MESSAGES_FILE = path.join(
            process.cwd(),
            ".data",
            "session-messages.json",
          );

          function readSessions(): any[] {
            try {
              if (fs.existsSync(SESSIONS_FILE)) {
                return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
              }
            } catch (e) {
              console.error("[API] Failed to read sessions:", e);
            }
            return [];
          }

          function writeSessions(sessions: any[]) {
            try {
              fs.writeFileSync(
                SESSIONS_FILE,
                JSON.stringify(sessions, null, 2),
                "utf-8",
              );
            } catch (e) {
              console.error("[API] Failed to write sessions:", e);
            }
          }

          function readSessionMessages(): Record<string, any[]> {
            try {
              if (fs.existsSync(SESSION_MESSAGES_FILE)) {
                const content = fs.readFileSync(SESSION_MESSAGES_FILE, "utf-8");
                // 处理空文件的情况
                if (!content || content.trim() === "") {
                  return {};
                }
                return JSON.parse(content);
              }
            } catch (e) {
              console.error("[API] Failed to read session messages:", e);
            }
            return {};
          }

          function writeSessionMessages(messages: Record<string, any[]>) {
            try {
              fs.writeFileSync(
                SESSION_MESSAGES_FILE,
                JSON.stringify(messages, null, 2),
                "utf-8",
              );
            } catch (e) {
              console.error("[API] Failed to write session messages:", e);
            }
          }

          // GET /api/sessions - 获取所有会话
          // POST /api/sessions - 创建会话
          server.middlewares.use("/api/sessions", (req, res, next) => {
            const url = req.url || "";
            if (url !== "/" && url !== "" && !url.startsWith("?")) {
              return next();
            }

            if (req.method === "GET") {
              const sessions = readSessions();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: sessions }));
            } else if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const sessions = readSessions();

                  const newSession = {
                    id:
                      body.id ||
                      `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    title: body.title || "新对话",
                    config: {
                      model: "deepseek-chat",
                      temperature: 0.7,
                      maxTokens: 2048,
                      systemPrompt: "",
                      enableReasoning: false,
                      streaming: true,
                      ...body.config,
                    },
                    stats: { messageCount: 0, totalTokens: 0, ...body.stats },
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };

                  sessions.unshift(newSession);
                  writeSessions(sessions);

                  // 初始化消息组
                  const messages = readSessionMessages();
                  messages[newSession.id] = [];
                  writeSessionMessages(messages);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: newSession }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // ============================================
          // Sessions Message API - 按特定性排序（最具体的优先）
          // ============================================

          // POST /api/sessions/:id/messages/batch - 批量保存消息组 (3 parts - 最具体)
          server.middlewares.use("/api/sessions/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 处理 /:id/messages/batch 路径 (parts = [id, 'messages', 'batch'])
            if (
              parts.length !== 3 ||
              parts[1] !== "messages" ||
              parts[2] !== "batch"
            )
              return next();

            const sessionId = parts[0];

            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const messages = readSessionMessages();

                  if (body.groups) {
                    messages[sessionId] = body.groups;
                    writeSessionMessages(messages);
                  }

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // GET /api/sessions/:id/messages - 获取会话消息
          // POST /api/sessions/:id/messages - 保存会话消息 (2 parts)
          server.middlewares.use("/api/sessions/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 处理 /:id/messages 路径 (parts = [id, 'messages'])
            if (parts.length !== 2 || parts[1] !== "messages") return next();

            const sessionId = parts[0];

            if (req.method === "GET") {
              try {
                const messages = readSessionMessages();
                const sessionMessages = messages[sessionId] || [];

                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: sessionMessages }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const messages = readSessionMessages();

                  if (body.groups) {
                    messages[sessionId] = body.groups;
                  } else if (body.group) {
                    if (!messages[sessionId]) messages[sessionId] = [];
                    messages[sessionId].push(body.group);
                  }

                  writeSessionMessages(messages);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // GET /api/sessions/:id - 获取单个会话
          // PUT /api/sessions/:id - 更新会话
          // DELETE /api/sessions/:id - 删除会话 (1 part - 最通用)
          server.middlewares.use("/api/sessions/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            // 只处理单个 ID 的情况
            if (parts.length !== 1) return next();

            const id = parts[0].split("?")[0];

            if (req.method === "GET") {
              try {
                const sessions = readSessions();
                const session = sessions.find((s: any) => s.id === id);

                if (!session) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Session not found",
                    }),
                  );
                  return;
                }

                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: session }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else if (req.method === "PUT") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const sessions = readSessions();
                  const index = sessions.findIndex((s: any) => s.id === id);

                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Session not found",
                      }),
                    );
                    return;
                  }

                  sessions[index] = {
                    ...sessions[index],
                    ...body,
                    updatedAt: Date.now(),
                  };
                  writeSessions(sessions);

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: sessions[index] }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else if (req.method === "DELETE") {
              try {
                let sessions = readSessions();
                sessions = sessions.filter((s: any) => s.id !== id);
                writeSessions(sessions);

                // 同时删除消息
                const messages = readSessionMessages();
                delete messages[id];
                writeSessionMessages(messages);

                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // ============================================
          // Agent Chat Sessions API - Agent 独立会话
          // ============================================

          const AGENT_CHAT_SESSIONS_FILE = path.join(
            process.cwd(),
            ".data",
            "agent-chat-sessions.json",
          );

          function readAgentChatSessions(): Record<string, any[]> {
            try {
              if (fs.existsSync(AGENT_CHAT_SESSIONS_FILE)) {
                return JSON.parse(
                  fs.readFileSync(AGENT_CHAT_SESSIONS_FILE, "utf-8"),
                );
              }
            } catch (e) {
              console.error("[API] Failed to read agent chat sessions:", e);
            }
            return {};
          }

          function writeAgentChatSessions(sessions: Record<string, any[]>) {
            try {
              fs.writeFileSync(
                AGENT_CHAT_SESSIONS_FILE,
                JSON.stringify(sessions, null, 2),
                "utf-8",
              );
            } catch (e) {
              console.error("[API] Failed to write agent chat sessions:", e);
            }
          }

          // GET /api/agent-chat/sessions - 获取所有 Agent 会话列表
          server.middlewares.use(
            "/api/agent-chat/sessions",
            (req, res, next) => {
              const url = req.url || "";
              if (url !== "/" && url !== "" && !url.startsWith("?")) {
                return next();
              }

              if (req.method === "GET") {
                try {
                  const sessions = readAgentChatSessions();
                  const list = Object.entries(sessions).map(
                    ([agentId, messages]) => ({
                      agentId,
                      messageCount: messages.length,
                      lastUpdated:
                        messages.length > 0
                          ? messages[messages.length - 1].timestamp
                          : 0,
                    }),
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: list }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );

          // GET /api/agent-chat/sessions/:agentId/messages - 获取 Agent 会话消息
          // POST /api/agent-chat/sessions/:agentId/messages - 保存 Agent 会话消息
          // DELETE /api/agent-chat/sessions/:agentId - 清空 Agent 会话
          server.middlewares.use(
            "/api/agent-chat/sessions/",
            (req, res, next) => {
              const url = req.url || "";
              const parts = url.split("/").filter(Boolean);
              // 处理 /:agentId/messages 路径 (parts = [agentId, 'messages'])
              // 或 /:agentId 路径 (parts = [agentId]) 用于 DELETE
              if (parts.length < 1 || parts.length > 2) return next();
              if (parts.length === 2 && parts[1] !== "messages") return next();

              const agentId = parts[0].split("?")[0];
              const isMessagesPath =
                parts.length === 2 && parts[1] === "messages";

              // GET /api/agent-chat/sessions/:agentId/messages
              if (req.method === "GET" && isMessagesPath) {
                try {
                  const sessions = readAgentChatSessions();
                  const messages = sessions[agentId] || [];

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: messages }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              }
              // POST /api/agent-chat/sessions/:agentId/messages
              else if (req.method === "POST" && isMessagesPath) {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const sessions = readAgentChatSessions();

                    sessions[agentId] = body.messages || [];
                    writeAgentChatSessions(sessions);

                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ success: true }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({ success: false, error: String(e) }),
                    );
                  }
                });
              }
              // DELETE /api/agent-chat/sessions/:agentId
              else if (req.method === "DELETE" && !isMessagesPath) {
                try {
                  const sessions = readAgentChatSessions();
                  delete sessions[agentId];
                  writeAgentChatSessions(sessions);

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );
        },
      },
    ],
    define: {
      VDITOR_VERSION: JSON.stringify("3.11.2"),
    },
  },

  async transformPageData(pageData: any) {
    pageData.frontmatter.wordCount = getWordCount(pageData.content || "");

    // Generate breadcrumbs from the actual file path
    const relativePath = pageData.relativePath;
    const parts = relativePath.split("/");
    const breadcrumbs: { title: string; link?: string }[] = [];

    let accumulatedPath = "";
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      if (!part) continue;

      // Remove .md extension
      if (part.endsWith(".md")) {
        part = part.replace(".md", "");
      }

      // Skip index files in breadcrumb (they represent the folder itself)
      if (part === "index") {
        continue;
      }

      accumulatedPath += "/" + part;

      // Format the breadcrumb name
      const title = formatBreadcrumbName(part);

      // Check if this is the last meaningful part
      const remainingParts = parts
        .slice(i + 1)
        .filter((p: string) => p && p !== "index.md" && !p.endsWith(".md"));
      const isLastItem = remainingParts.length === 0;

      breadcrumbs.push({
        title,
        link: isLastItem ? undefined : accumulatedPath + "/",
      });
    }

    pageData.frontmatter.breadcrumb = breadcrumbs;
    pageData.title =
      pageData.frontmatter.title ||
      (breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].title : "");
  },
});
