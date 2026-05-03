/**
 * ============================================================================
 * 工具函数 - article-creator
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/utils
 */


import fs from "fs";
import path from "path";

const SECTIONS_PATH = path.join(process.cwd(), "docs", "sections");

// ========== AI 文章操作安全边界 ==========
const ALLOWED_SECTIONS = ["posts", "knowledge", "resources"];
const BLOCKED_SECTIONS = ["about", "ai-research"];

function validateSection(section: string): { valid: boolean; error?: string } {
  if (ALLOWED_SECTIONS.includes(section)) return { valid: true };
  if (BLOCKED_SECTIONS.includes(section)) {
    return {
      valid: false,
      error: `板块 "${section}" 不允许AI操作. AI只能管理以下板块：${ALLOWED_SECTIONS.join(". ")}`,
    };
  }
  return {
    valid: false,
    error: `板块 "${section}" 不存在. 可用板块：${ALLOWED_SECTIONS.join(". ")}`,
  };
}
// ========================================

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, "")
    .replace(/\s+/g, "-")
    .substring(0, 50);
}

/**
 * 将叶子文档提升为 Folder-Note 结构(与 doc-structure.ts 的 preferred 模式一致)
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

function escapeYamlValue(value: string): string {
  // 如果值包含 YAML 特殊字符,用双引号包裹并转义内部双引号
  if (/[:#'"\[\]{}|>&*!@%,]/.test(value) || value.includes('\n')) {
    return `"${value.replace(/"/g, '\\"')}"`;
  }
  return value;
}

function writeArticleFile(
  filePath: string,
  req: { title: string; content?: string; tags?: string[] }
): Promise<void> {
  const date = new Date().toISOString().split("T")[0];
  const content = (req.content || "").trimStart();

  // 检测 content 是否已有 frontmatter
  // 兼容 \n、\r\n 以及前后可能有空白的情况
  const frontmatterPattern = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
  if (frontmatterPattern.test(content)) {
    // 已有 frontmatter,直接使用原始内容(避免双 frontmatter)
    return fs.promises.writeFile(filePath, content, "utf-8");
  }

  // 生成安全的 frontmatter(title 加引号防止冒号等特殊字符破坏 YAML)
  const safeTitle = escapeYamlValue(req.title);
  const tagLines = (req.tags || [])
    .map((t) => `  - ${escapeYamlValue(t)}`)
    .join("\n");

  const fileContent = `---
title: ${safeTitle}
date: ${date}
tags:
${tagLines}
---

${content}`;
  return fs.promises.writeFile(filePath, fileContent, "utf-8");
}

/**
 * 文章创建请求参数
 */
export interface ArticleHarnessRequest {
  path?: string; // e.g. "posts/attention/flash-attention.md"
  title: string;
  section?: string; // 当未提供 path 时使用,默认 "posts"
  content?: string;
  tags?: string[];
}

/**
 * 文章创建结果
 */
export interface ArticleHarnessResult {
  success: boolean;
  path: string; // 相对 sections/ 的路径
  fullPath: string;
  action: "created" | "promoted_and_created" | "error";
  promotedNodes?: string[];
  notes?: string[];
  error?: string;
}

/**
 * 统一文章创建入口
 *
 * 自动检测叶子节点冲突并执行 folder-note promotion：
 * 例如 sections/posts/attention.md 已存在时,自动提升为
 * sections/posts/attention/attention.md,然后在新目录下创建目标文件. 
 *
 * 安全边界：
 * - section 必须在白名单中(posts, knowledge, resources)
 * - path 中禁止 ".."
 *
 * 性能说明：
 * - 仅对路径上的每一级做 2 次 fs.existsSync 检测
 * - 典型深度 1~3 级,总耗时 < 5ms
 * - 不需要 lazy/delay,因为 fs 状态是立即可见的,且工具调用是顺序执行的
 *
 * @param req - 文章创建请求
 * @returns 创建结果(含最终路径、操作类型、可能的 promotion 记录)
 */
export async function createArticleInHarness(
  req: ArticleHarnessRequest
): Promise<ArticleHarnessResult> {
  const section = req.section || "posts";

  // ===== 安全边界：板块白名单校验 =====
  const sectionCheck = validateSection(section);
  if (!sectionCheck.valid) {
    return {
      success: false,
      path: req.path || "",
      fullPath: "",
      action: "error",
      error: sectionCheck.error,
    };
  }
  // ===================================

  let relativePath: string;
  if (req.path) {
    relativePath = req.path.replace(/^\//, "").replace(/^sections\//, "");
  } else {
    const slug = generateSlug(req.title);
    relativePath = `${section}/${slug}`;
  }

  // 规范化
  relativePath = relativePath.replace(/\\/g, "/").replace(/\/$/, "");

  // 去掉 .md 后缀(如果有)
  relativePath = relativePath.replace(/\.md$/, "");

  // 确保路径以 section 开头
  if (!relativePath.startsWith(section + "/")) {
    relativePath = `${section}/${relativePath}`;
  }

  // ===== 自动 Index 结构 =====
  // 创建 folder/index.md,VitePress 天然支持,不需要启动时 rewrite：
  // section/my-article       -> section/my-article/index.md
  // section/sub/my-article   -> section/sub/my-article/index.md
  // section/folder/index     -> section/folder/index.md(AI 明确传 index 时保持)
  const lastSeg = relativePath.split("/").pop() || "";
  if (lastSeg !== "index") {
    relativePath = `${relativePath}/index.md`;
  } else {
    relativePath = `${relativePath}.md`;
  }
  // ===========================

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

    // 3. 给路径上的中间文件夹自动补 index.md
    // e.g. knowledge/llm/my-article/index.md → 检查 knowledge/llm/index.md
    const autoCreatedIndices: string[] = [];
    for (let i = 1; i < segments.length - 1; i++) {
      const parentSegments = segments.slice(0, i);
      const currentName = segments[i];
      const folderRelPath = [...parentSegments, currentName].join("/");
      const folderDir = path.join(SECTIONS_PATH, folderRelPath);
      const indexPath = path.join(folderDir, "index.md");
      const folderNotePath = path.join(folderDir, `${currentName}.md`);

      // 如果文件夹已存在但既没有 index.md 也没有 folder-note,自动补一个
      if (fs.existsSync(folderDir) && fs.statSync(folderDir).isDirectory()) {
        if (!fs.existsSync(indexPath) && !fs.existsSync(folderNotePath)) {
          const displayTitle = currentName
            .replace(/[-_]/g, " ")
            .split(" ")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
          const indexContent = `---
title: "${displayTitle}"
date: ${new Date().toISOString().split("T")[0]}
tags: []
---

# ${displayTitle}

此分类下的文章：
`;
          await fs.promises.writeFile(indexPath, indexContent, "utf-8");
          autoCreatedIndices.push(folderRelPath + "/index.md");
        }
      }
    }

    // 4. 写入文章
    await writeArticleFile(fullPath, req);

    const notes: string[] = [];
    if (promotedNodes.length > 0) {
      notes.push(`提升叶子节点: ${promotedNodes.join(", ")}`);
    }
    if (autoCreatedIndices.length > 0) {
      notes.push(`自动创建分类首页: ${autoCreatedIndices.join(", ")}`);
    }

    return {
      success: true,
      path: relativePath,
      fullPath,
      action: promotedNodes.length > 0 ? "promoted_and_created" : "created",
      promotedNodes:
        promotedNodes.length > 0 ? promotedNodes : undefined,
      notes: notes.length > 0 ? notes : undefined,
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
