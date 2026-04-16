import fs from "fs";
import path from "path";

const SECTIONS_PATH = path.join(process.cwd(), "docs", "sections");

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/**
 * 将叶子文档提升为 Folder-Note 结构（与 doc-structure.ts 的 preferred 模式一致）
 * e.g. sections/posts/attention.md -> sections/posts/attention/attention.md
 */
async function promoteLeafToFolderNote(leafPath: string): Promise<void> {
  const folderPath = leafPath.replace(/\.md$/, "");
  const folderName = path.basename(folderPath);
  const folderNotePath = path.join(folderPath, `${folderName}.md`);

  if (fs.existsSync(folderNotePath)) return; // 已经是 folder-note

  await fs.promises.mkdir(folderPath, { recursive: true });
  await fs.promises.rename(leafPath, folderNotePath);
}

function writeArticleFile(
  filePath: string,
  req: { title: string; content?: string; tags?: string[] },
): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const frontmatter = `---
title: ${req.title}
date: ${date}
tags:
${(req.tags || []).map((t: string) => `  - ${t}`).join("\n")}
---

${req.content || ""}`;
  return fs.promises.writeFile(filePath, frontmatter, "utf-8");
}

export interface ArticleHarnessRequest {
  path?: string; // e.g. "posts/attention/flash-attention.md"
  title: string;
  section?: string; // 当未提供 path 时使用，默认 "posts"
  content?: string;
  tags?: string[];
}

export interface ArticleHarnessResult {
  success: boolean;
  path: string; // 相对 sections/ 的路径
  fullPath: string;
  action: "created" | "promoted_and_created" | "error";
  promotedNodes?: string[];
  error?: string;
}

/**
 * Article Creation Harness
 * 统一文章创建入口，自动检测叶子节点冲突并执行 folder-note promotion。
 *
 * 性能说明：
 * - 仅对路径上的每一级做 2 次 fs.existsSync 检测
 * - 典型深度 1~3 级，总耗时 < 5ms
 * - 不需要 lazy/delay，因为 fs 状态是立即可见的，且工具调用是顺序执行的
 */
export async function createArticleInHarness(
  req: ArticleHarnessRequest,
): Promise<ArticleHarnessResult> {
  const section = req.section || "posts";

  let relativePath: string;
  if (req.path) {
    relativePath = req.path.replace(/^\//, "").replace(/^sections\//, "");
  } else {
    const slug = generateSlug(req.title);
    relativePath = `${section}/${slug}.md`;
  }

  // 规范化
  relativePath = relativePath.replace(/\\/g, "/");
  if (!relativePath.endsWith(".md")) {
    relativePath += ".md";
  }
  if (!relativePath.startsWith(section + "/")) {
    relativePath = `${section}/${relativePath}`;
  }

  const fullPath = path.join(SECTIONS_PATH, relativePath);
  const promotedNodes: string[] = [];

  try {
    // 1. 自动检测并提升路径上的叶子节点
    const segments = relativePath.split("/");
    for (let i = 1; i < segments.length - 1; i++) {
      const parentDir = segments.slice(0, i).join("/");
      const currentName = segments[i];
      const leafPath = path.join(SECTIONS_PATH, parentDir, `${currentName}.md`);
      const folderPath = path.join(SECTIONS_PATH, parentDir, currentName);

      if (fs.existsSync(leafPath) && !fs.existsSync(folderPath)) {
        await promoteLeafToFolderNote(leafPath);
        promotedNodes.push(
          path.relative(SECTIONS_PATH, leafPath).replace(/\\/g, "/"),
        );
      }
    }

    // 2. 确保目录存在
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

    // 3. 写入文章
    await writeArticleFile(fullPath, req);

    return {
      success: true,
      path: relativePath,
      fullPath,
      action: promotedNodes.length > 0 ? "promoted_and_created" : "created",
      promotedNodes:
        promotedNodes.length > 0 ? promotedNodes : undefined,
    };
  } catch (e) {
    return {
      success: false,
      path: relativePath,
      fullPath,
      action: "error",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
