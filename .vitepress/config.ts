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
const feishuEnv = loadEnv("", process.cwd(), "FEISHU_");
const larkEnv = loadEnv("", process.cwd(), "LARK_");
const yuqueEnv = loadEnv("", process.cwd(), "YUQUE_");

// 合并环境变量到 process.env
Object.assign(process.env, env, serverEnv, feishuEnv, larkEnv, yuqueEnv);
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
import { getTaskManager } from "../server/mcp-tools/task-manager";
import { getAgentRuntimeManager } from "../server/mcp-tools/agent-runtime-manager";
import { getMetaAgentManager } from "../server/mcp-tools/meta-agent-manager";
import { getReportAgentManager } from "../server/mcp-tools/report-agent-manager";
import { metaBlogRoutingPlugin, metaBlogBffPlugin } from "../server/vitepress-integration";


// Helper to calculate word count
const getWordCount = (content: string) => {
  return content.split(/\s+/g).length;
};


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

  head: [
    ["link", { rel: "icon", href: "data:," }],
  ],

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
      metaBlogRoutingPlugin(),
      metaBlogBffPlugin(),
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
