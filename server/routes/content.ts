import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";

import { clearSidebarCache } from "../../.vitepress/utils/global-sidebar";
import { scanDocStructure, toSidebarFormat, toDirectoryTree, type DocNode } from "../../.vitepress/utils/doc-structure";
export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

export function registerContentRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
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

}
