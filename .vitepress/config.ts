import { defineConfig } from "vitepress";
import { fileURLToPath, URL } from "node:url";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
// @ts-ignore - markdown-it 类型声明可能缺失
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";
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
import { getStructuredLogger } from "./agent/runtime/StructuredLogger";
import { logSystem } from "./agent/runtime/LogSystemAdapter";
import { bootLogger } from "./agent/runtime/boot-logger";

// 获取结构化日志实例
const structuredLogger = getStructuredLogger();
const system = {
  info: (event: string, message: string, data?: any) => structuredLogger.info(event, message, data),
  debug: (event: string, message: string, data?: any) => structuredLogger.debug(event, message, data),
  warn: (event: string, message: string, data?: any) => structuredLogger.warn(event, message, data),
  error: (event: string, message: string, data?: any) => structuredLogger.error(event, message, data)
};

// 记录配置加载
bootLogger.logConfigLoad("config.ts");

// 简化的日志对象（避免缓存问题）
const structuredLog = {
  info: (event: string, message: string, data?: any) =>
    system.info(event, message, { metadata: data }),
  debug: (event: string, message: string, data?: any) =>
    system.debug(event, message, { metadata: data }),
  warn: (event: string, message: string, data?: any) =>
    system.warn(event, message, { metadata: data }),
  error: (event: string, message: string, data?: any) =>
    system.error(event, message, { metadata: data }),
  success: (event: string, message: string, data?: any) =>
    system.success(event, message, { metadata: data }),
  startRequest: () => {},
  endRequest: () => {},
  logAPIRequest: () => {},
  logFileEvent: () => {},
  logFileOperation: () => {},
  logSkillExecution: () => {},
  startLLMChain: () => {},
  endLLMChain: () => {},
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
  cleanUrls: true,

  // Generate rewrites dynamically
  rewrites: generateRewrites(),

  themeConfig: {
    nav: [
      { text: "首页", link: "/" },
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

      md.renderer.rules.text = function (tokens: any, idx: any, options: any, env: any, self: any) {
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
    envPrefix: ["VITE_", "LLM_"],
    resolve: {
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./theme", import.meta.url)),
        },
      ],
    },
    // P1-8 修复：排除 Agent 数据目录和日志目录，避免 Vite HMR OOM
    server: {
      watch: {
        ignored: [
          '**/.vitepress/agent/memory/data/**',
          '**/.vitepress/agent/logs/**',
          '**/logs/**',
          '**/.trash/**'
        ]
      }
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
            const url = req.url || "";

            // Skip API and asset requests
            if (
              url.startsWith("/api/") ||
              url.includes("_assets") ||
              url.includes("@fs") ||
              url.includes("?") ||
              url.match(
                /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|json)$/,
              )
            ) {
              next();
              return;
            }

            // 处理 sections 路径的动态路由
            if (url.startsWith("/sections/")) {
              console.log("[Routing] Processing:", url);

              // Redirect paths without trailing slash to have trailing slash
              if (!url.endsWith("/") && !url.endsWith(".md")) {
                res.statusCode = 301;
                res.setHeader("Location", url + "/");
                res.end();
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
          // 记录系统启动
          recordSystemStartup();
          bootLogger.logServerStart(5193, "localhost");
          system.info("server.init", "BFF API Server 初始化完成");
          bootLogger.logReady();

          // 启动后台任务调度器
          try {
            const { getTaskScheduler } = require("./agent/core/TaskScheduler");
            const scheduler = getTaskScheduler();
            scheduler.start();
          } catch (e) {
            system.error("server.tasks", "后台调度器启动失败: " + String(e));
          }

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
                  const filePath = url.searchParams.get("path");
                  if (!filePath) return next();

                  const fullPath = path.resolve(
                    process.cwd(),
                    "docs",
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

                  const fullPath = path.resolve(
                    process.cwd(),
                    "docs",
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
                  res.end(JSON.stringify({ success: true }));

                  // 触发热更新
                  triggerReload();
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });

          // Delete file
          server.middlewares.use("/api/files/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: filePath } = body;
                  const fullPath = path.resolve(
                    process.cwd(),
                    "docs",
                    filePath.replace(/^\//, ""),
                  );

                  // Delete file
                  fs.unlinkSync(fullPath);

                  // Git operations
                  gitCommit(
                    fullPath,
                    `content: 删除 ${path.basename(filePath)}`,
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));

                  // 触发热更新
                  triggerReload();
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
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
                const filePath = url.searchParams.get("path");

                if (!filePath) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({ success: false, error: "Path required" }),
                  );
                  return;
                }

                // Security: prevent directory traversal
                const cleanPath = filePath
                  .replace(/\.\./g, "")
                  .replace(/^\//, "");
                const fullPath = path.resolve(process.cwd(), "docs", cleanPath);

                if (!fs.existsSync(fullPath)) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({ success: false, error: "File not found" }),
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
                    const pinyinFn = require('pinyin');
                    slug = (typeof pinyinFn === 'function' ? pinyinFn(text, { style: 'normal' }) : 
                            (pinyinFn.default ? pinyinFn.default(text, { style: 'normal' }) : text)).flat().join('-');
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

          // 文章列表
          server.middlewares.use(
            "/api/articles/list",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  // 扫描所有 section
                  const allArticles: any[] = [];
                  const sections = ["posts", "knowledge", "resources", "about"];

                  for (const section of sections) {
                    const sectionPath = path.join(SECTIONS_PATH, section);
                    if (fs.existsSync(sectionPath)) {
                      const nodes = scanDocStructure(sectionPath);
                      const articles = flattenArticles(nodes).map((a) => ({
                        ...a,
                        path: `${section}/${a.path}`,
                      }));
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
                          'index.md',
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
                  // 使用LogSystem持久化日志
                  await logSystem.add(
                    body.level || "info",
                    body.event || "system",
                    body.message,
                    body.actor || "system",
                    {
                      source: body.source,
                      taskId: body.taskId,
                      skillName: body.skillName,
                      duration: body.duration,
                      ...body.metadata,
                    },
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

          // 获取日志
          server.middlewares.use("/api/logs/recent", async (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const count = parseInt(url.searchParams.get("count") || "100");
              const level = url.searchParams.get("level") as any;
              const logs = await logSystem.getRecent(count, level);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: logs }));
            } else next();
          });

          // 获取日志统计
          server.middlewares.use("/api/logs/stats", async (req, res, next) => {
            if (req.method === "GET") {
              const stats = await logSystem.getStats();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: stats }));
            } else next();
          });

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

                  // 使用 AbortController 实现超时和客户端断开检测
                  const controller = new AbortController();
                  const timeoutId = setTimeout(
                    () => controller.abort(),
                    timeout,
                  );

                  // P0-3 修复：监听客户端断开连接
                  const abortOnClose = () => {
                    controller.abort();
                    clearTimeout(timeoutId);
                    structuredLog.info("proxy.fetch.aborted", `Client disconnected, aborted fetch ${url}`, { url });
                  };
                  req.on("close", abortOnClose);

                  try {
                    const response = await fetch(url, {
                      signal: controller.signal,
                      headers: {
                        "User-Agent":
                          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                      },
                    });

                    clearTimeout(timeoutId);
                    req.removeListener("close", abortOnClose);

                    if (!response.ok) {
                      structuredLog.warn(
                        "proxy.fetch.failed",
                        `Failed to fetch ${url}`,
                        {
                          url,
                          status: response.status,
                        },
                      );
                      res.statusCode = response.status;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: `HTTP ${response.status}: ${response.statusText}`,
                        }),
                      );
                      return;
                    }

                    const content = await response.text();

                    structuredLog.success(
                      "proxy.fetch.completed",
                      `Fetched ${url}`,
                      {
                        url,
                        size: content.length,
                      },
                    );

                    res.setHeader("Content-Type", "text/plain; charset=utf-8");
                    res.end(content);
                  } catch (fetchError) {
                    clearTimeout(timeoutId);

                    const isTimeout =
                      fetchError instanceof Error &&
                      fetchError.name === "AbortError";
                    const errorMsg = isTimeout
                      ? "Request timeout"
                      : String(fetchError);

                    structuredLog.error(
                      "proxy.fetch.error",
                      `Error fetching ${url}`,
                      {
                        url,
                        error: errorMsg,
                        isTimeout,
                      },
                    );

                    res.statusCode = isTimeout ? 504 : 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: errorMsg,
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
          // Background Tasks API - 手动触发的后台任务
          // ============================================

          // 获取任务模板列表
          server.middlewares.use(
            "/api/agent/tasks/templates",
            (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const {
                    TASK_TEMPLATES,
                  } = require("./agent/core/BackgroundTaskManager");
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: TASK_TEMPLATES,
                    }),
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );

          // 触发任务
          server.middlewares.use(
            "/api/agent/tasks/trigger",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const {
                      getBackgroundTaskManager,
                    } = require("./agent/core/BackgroundTaskManager");
                    const taskManager = getBackgroundTaskManager();

                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { type, params, name, description } = body;

                    const task = await taskManager.triggerTask(type, params, {
                      name,
                      description,
                      triggeredBy: "human",
                    });

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        data: {
                          id: task.id,
                          type: task.type,
                          name: task.name,
                          status: task.status,
                          createdAt: task.createdAt,
                        },
                      }),
                    );

                    // 记录到结构化日志
                    structuredLog.info(
                      "task.triggered",
                      `Background task ${task.id} triggered`,
                      {
                        taskId: task.id,
                        type,
                        name: task.name,
                      },
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

          // 批量触发任务
          server.middlewares.use(
            "/api/agent/tasks/trigger-batch",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const {
                      getBackgroundTaskManager,
                    } = require("./agent/core/BackgroundTaskManager");
                    const taskManager = getBackgroundTaskManager();

                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { tasks } = body;

                    const created = await taskManager.triggerBatch(tasks);

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        data: created.map((task: any) => ({
                          id: task.id,
                          type: task.type,
                          name: task.name,
                          status: task.status,
                        })),
                      }),
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

          // 获取任务列表
          server.middlewares.use("/api/agent/tasks", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const {
                  getBackgroundTaskManager,
                } = require("./agent/core/BackgroundTaskManager");
                const taskManager = getBackgroundTaskManager();

                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`,
                );
                const status = url.searchParams.get("status");

                let tasks;
                if (status) {
                  tasks = taskManager.getTasksByStatus(status);
                } else {
                  tasks = taskManager.getAllTasks();
                }

                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: tasks,
                    stats: taskManager.getTaskStats(),
                  }),
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // 获取单个任务详情
          server.middlewares.use(
            "/api/agent/tasks/detail",
            (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const {
                    getBackgroundTaskManager,
                  } = require("./agent/core/BackgroundTaskManager");
                  const taskManager = getBackgroundTaskManager();

                  const url = new URL(
                    req.url || "",
                    `http://${req.headers.host}`,
                  );
                  const taskId = url.searchParams.get("id");

                  if (!taskId) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Task ID required",
                      }),
                    );
                    return;
                  }

                  const task = taskManager.getTask(taskId);
                  if (!task) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Task not found",
                      }),
                    );
                    return;
                  }

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: task }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            },
          );

          // 取消任务
          server.middlewares.use(
            "/api/agent/tasks/cancel",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const {
                      getBackgroundTaskManager,
                    } = require("./agent/core/BackgroundTaskManager");
                    const taskManager = getBackgroundTaskManager();

                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { taskId } = body;

                    const success = await taskManager.cancelTask(taskId);

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success,
                        message: success
                          ? "Task cancelled"
                          : "Cannot cancel task",
                      }),
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

          // 重试任务
          server.middlewares.use("/api/agent/tasks/retry", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const {
                    getBackgroundTaskManager,
                  } = require("./agent/core/BackgroundTaskManager");
                  const taskManager = getBackgroundTaskManager();

                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { taskId } = body;

                  const newTask = await taskManager.retryTask(taskId);

                  if (!newTask) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Cannot retry task",
                      }),
                    );
                    return;
                  }

                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        id: newTask.id,
                        name: newTask.name,
                        status: newTask.status,
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

          // 删除任务
          server.middlewares.use(
            "/api/agent/tasks/delete",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const {
                      getBackgroundTaskManager,
                    } = require("./agent/core/BackgroundTaskManager");
                    const taskManager = getBackgroundTaskManager();

                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { taskId } = body;

                    const success = taskManager.deleteTask(taskId);

                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success,
                        message: success
                          ? "Task deleted"
                          : "Cannot delete running task",
                      }),
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

          server.middlewares.use("/api/agent/tasks", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: [] }));
            } else next();
          });
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
