/**
 * ============================================================================
 * 内部业务路由 - content
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes/internal
 */


import fs from "fs";
import path from "path";
import type { ViteDevServer } from "vite";

import { scanDocStructure, toDirectoryTree, toSidebarFormat, type DocNode } from "../../../.vitepress/utils/doc-structure";
import { clearSidebarCache } from "../../../.vitepress/utils/global-sidebar";
import { createArticleInHarness } from "../../utils/article-creator";
/**
 * RouteContext 接口定义
 *
 */
export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

/**
 * 注册内容管理路由
 *
 * 挂载以下端点：
 * - /api/sidebar —— 动态侧边栏(按板块聚合文章)
 * - /api/directory-tree —— 目录树结构(扁平化,供前端导航)
 * - /api/articles —— 文章列表(仅扫描 ALLOWED_SECTIONS)
 * - /api/articles/:slug —— 单篇文章 CRUD
 * - /api/articles/:slug/publish —— 发布文章到外部平台
 * - /api/search —— 本地文章全文搜索
 *
 * @param server - Vite 开发服务器实例
 * @param ctx    - 路由上下文
 */
export function registerContentRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;

  // ========== AI 文章操作安全边界 ==========
  const ALLOWED_SECTIONS = ["posts", "knowledge", "resources"];
  const BLOCKED_SECTIONS = ["about", "ai-research"];

  function validateSection(section: string): { valid: boolean; error?: string } {
    if (ALLOWED_SECTIONS.includes(section)) return { valid: true };
    if (BLOCKED_SECTIONS.includes(section)) {
      return {
        valid: false,
        error: `板块 "${section}" 不允许AI操作. 可用板块：${ALLOWED_SECTIONS.join(". ")}`,
      };
    }
    return {
      valid: false,
      error: `板块 "${section}" 不存在. 可用板块：${ALLOWED_SECTIONS.join(". ")}`,
    };
  }

  function extractSection(articlePath: string): string | null {
    const normalized = articlePath.replace(/^\//, "").replace(/^sections\//, "");
    const firstSlash = normalized.indexOf("/");
    return firstSlash > 0 ? normalized.substring(0, firstSlash) : normalized;
  }

  function validateArticlePath(articlePath: string): { valid: boolean; error?: string } {
    if (articlePath.includes("..")) {
      return { valid: false, error: '路径中不允许使用 ".."' };
    }
    const section = extractSection(articlePath);
    if (!section) return { valid: false, error: "无法从路径中识别板块" };
    return validateSection(section);
  }
  // ========================================

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

  // 生成 URL 友好的 slug(保留中文)
  function generateSlug(title: string): string {
    if (!title || !title.trim()) return "untitled";

    // 只替换不安全的文件系统字符,保留中文
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
          entry.name.endsWith(".md")
        ) {
          const content = await fs.promises.readFile(fullPath, "utf-8");
          const meta = extractArticleMeta(content, relativePath);
          articles.push(meta);
        }
      }
    } catch (e) { }
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

  // 辅助函数：轻量级扫描文章列表(用于 @ 引用)
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
            // 如果没有 frontmatter 标题,尝试从内容中提取
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
          // 扫描白名单内的 section,包含完整元数据
          const allArticles: any[] = [];

          for (const section of ALLOWED_SECTIONS) {
            const sectionPath = path.join(SECTIONS_PATH, section);
            if (fs.existsSync(sectionPath)) {
              // 使用 scanArticles 获取完整元数据(包括日期)
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

  // 获取所有文章列表(用于 @ 引用,轻量级)
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

          for (const section of ALLOWED_SECTIONS) {
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

  // 搜索文章(只在白名单板块内搜索)
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
          const articles: any[] = [];
          for (const section of ALLOWED_SECTIONS) {
            const sectionPath = path.join(SECTIONS_PATH, section);
            if (fs.existsSync(sectionPath)) {
              const sectionArticles = await scanArticles(sectionPath);
              sectionArticles.forEach((a) => {
                a.path = `${section}/${a.path}`;
              });
              articles.push(...sectionArticles);
            }
          }
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
        // 安全校验
        const pathCheck = validateArticlePath(articlePath);
        if (!pathCheck.valid) {
          res.statusCode = 403;
          res.end(JSON.stringify({ success: false, error: pathCheck.error }));
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
              path: articlePath,
            } = body;

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

            const result = await createArticleInHarness({
              title,
              content,
              section,
              tags,
              path: articlePath,
            });

            if (!result.success) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({
                  success: false,
                  error: result.error || "Failed to create article",
                }),
              );
              return;
            }

            // 清除 sidebar 缓存
            clearSidebarCache(section);

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                data: {
                  path: result.path,
                  title,
                  fullPath: result.fullPath,
                  promotedNodes: result.promotedNodes,
                  notes: result.notes,
                },
              }),
            );
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
            if (!articlePath) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: "Path required" }));
              return;
            }
            // 安全校验
            const pathCheck = validateArticlePath(articlePath);
            if (!pathCheck.valid) {
              res.statusCode = 403;
              res.end(JSON.stringify({ success: false, error: pathCheck.error }));
              return;
            }
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
            // triggerReload();
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
            // triggerReload();
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
            if (!articlePath) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: "Path required" }));
              return;
            }
            // 安全校验
            const pathCheck = validateArticlePath(articlePath);
            if (!pathCheck.valid) {
              res.statusCode = 403;
              res.end(JSON.stringify({ success: false, error: pathCheck.error }));
              return;
            }
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
            // triggerReload();
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
            if (!from || !to) {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: "from and to required" }));
              return;
            }
            // 安全校验
            const fromCheck = validateArticlePath(from);
            if (!fromCheck.valid) {
              res.statusCode = 403;
              res.end(JSON.stringify({ success: false, error: `源路径: ${fromCheck.error}` }));
              return;
            }
            const toCheck = validateArticlePath(to);
            if (!toCheck.valid) {
              res.statusCode = 403;
              res.end(JSON.stringify({ success: false, error: `目标路径: ${toCheck.error}` }));
              return;
            }
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
            // triggerReload();
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

}
