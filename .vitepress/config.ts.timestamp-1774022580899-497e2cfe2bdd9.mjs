var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// .vitepress/config.ts
import { defineConfig, loadEnv } from "file:///D:/ALL%20IN%20AI/MetaBlog/node_modules/vitepress/dist/node/index.js";
import { fileURLToPath, URL } from "node:url";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import mathjax3 from "file:///D:/ALL%20IN%20AI/MetaBlog/node_modules/markdown-it-mathjax3/index.js";

// .vitepress/utils/global-sidebar.ts
var manifestCache = /* @__PURE__ */ new Map();
var sidebarCache = /* @__PURE__ */ new Map();
function clearSidebarCache(section) {
  if (section) {
    sidebarCache.delete(section);
    console.log(`[Sidebar] Cache cleared for section: ${section}`);
  } else {
    sidebarCache.clear();
    manifestCache.clear();
    console.log("[Sidebar] All cache cleared");
  }
}

// .vitepress/utils/doc-structure.ts
import { readdirSync, existsSync } from "fs";
import { join, basename } from "path";
function scanDocStructure(sectionPath, sectionName) {
  const nodes = [];
  const secName = sectionName || basename(sectionPath);
  const entries = readdirSync(sectionPath, { withFileTypes: true }).filter((e) => !e.name.startsWith(".") && e.name !== "manifest.json").sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const entry of entries) {
    const fullPath = join(sectionPath, entry.name);
    const relativePath = `${secName}/${entry.name}`;
    if (entry.isDirectory()) {
      let manifest = {};
      try {
        const manifestPath = join(sectionPath, "manifest.json");
        if (existsSync(manifestPath)) {
          manifest = JSON.parse(__require("fs").readFileSync(manifestPath, "utf-8"));
        }
      } catch (e) {
      }
      const folderNode = scanFolder(fullPath, entry.name, relativePath, secName, manifest);
      if (folderNode) nodes.push(folderNode);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (entry.name === `${secName}.md`) continue;
      const fileNode = createFileNode(fullPath, entry.name, relativePath, secName);
      if (fileNode) nodes.push(fileNode);
    }
  }
  return nodes;
}
function scanFolder(dirPath, folderName, relativePath, sectionName, manifest = {}) {
  const folderNotePath = join(dirPath, `${folderName}.md`);
  const indexPath = join(dirPath, "index.md");
  let title = folderName;
  let desc = manifest[folderName]?.description || "";
  let link;
  let folderNotePathUsed;
  if (existsSync(folderNotePath)) {
    title = extractTitle(folderNotePath) || manifest[folderName]?.title || formatDisplayName(folderName);
    desc = desc || extractDesc(folderNotePath) || "";
    link = `/sections/${relativePath}/`;
    folderNotePathUsed = folderNotePath;
  } else if (existsSync(indexPath)) {
    title = extractTitle(indexPath) || manifest[folderName]?.title || formatDisplayName(folderName);
    desc = desc || extractDesc(indexPath) || "";
    link = `/sections/${relativePath}/`;
    folderNotePathUsed = indexPath;
  }
  const children = [];
  const entries = readdirSync(dirPath, { withFileTypes: true }).filter((e) => !e.name.startsWith(".") && e.name !== "manifest.json");
  for (const entry of entries) {
    if (join(dirPath, entry.name) === folderNotePathUsed) continue;
    const childRelativePath = `${relativePath}/${entry.name}`;
    if (entry.isDirectory()) {
      const childNode = scanFolder(
        join(dirPath, entry.name),
        entry.name,
        childRelativePath,
        sectionName
      );
      if (childNode) children.push(childNode);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      const childNode = createFileNode(
        join(dirPath, entry.name),
        entry.name,
        childRelativePath,
        sectionName
      );
      if (childNode) children.push(childNode);
    }
  }
  if (!link && children.length === 0) return null;
  return {
    id: `/sections/${relativePath}/`,
    type: "folder",
    name: folderName,
    title,
    desc,
    path: relativePath,
    link,
    children: children.length > 0 ? children : void 0,
    isLeaf: false,
    collapsed: true
  };
}
function createFileNode(filePath, fileName, relativePath, sectionName) {
  const baseName = fileName.replace(/\.md$/i, "");
  const title = extractTitle(filePath) || formatDisplayName(baseName);
  const desc = extractDesc(filePath) || "";
  const link = `/sections/${relativePath.replace(/\.md$/i, "")}`;
  return {
    id: link,
    type: "file",
    name: baseName,
    title,
    desc,
    path: relativePath.replace(/\.md$/i, ""),
    link,
    isLeaf: true
  };
}
function extractTitle(filePath) {
  try {
    const content = __require("fs").readFileSync(filePath, "utf-8");
    const fmMatch = content.match(/^---\n[\s\S]*?\ntitle:\s*(.+?)\n/);
    if (fmMatch) return fmMatch[1].trim().replace(/^["']|["']$/g, "");
    const h1Match = content.match(/^#\s+(.+)$/m);
    if (h1Match) return h1Match[1].trim();
    return null;
  } catch {
    return null;
  }
}
function extractDesc(filePath) {
  try {
    const content = __require("fs").readFileSync(filePath, "utf-8");
    const fmMatch = content.match(/^---\n[\s\S]*?\ndescription:\s*(.+?)\n/);
    if (fmMatch) return fmMatch[1].trim().replace(/^["']|["']$/g, "");
    return null;
  } catch {
    return null;
  }
}
function formatDisplayName(name) {
  return name.replace(/^\d+[-_]/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function toSidebarFormat(nodes) {
  return nodes.map((node) => {
    const result = {
      text: node.title,
      id: node.id,
      collapsed: node.collapsed ?? false,
      isLeaf: node.isLeaf,
      description: node.desc
    };
    if (node.link) {
      result.link = node.type === "folder" ? node.link.endsWith("/") ? node.link : `${node.link}/` : node.link.replace(/\/$/, "");
    }
    if (node.children) result.items = toSidebarFormat(node.children);
    return result;
  });
}
function toDirectoryTree(nodes) {
  return nodes.map((node) => {
    if (node.type === "folder") {
      return {
        type: "directory",
        path: node.id,
        name: node.name,
        displayName: node.title,
        children: node.children ? toDirectoryTree(node.children) : []
      };
    }
    return {
      type: "article",
      path: node.link,
      name: node.name,
      title: node.title,
      displayName: node.title
    };
  });
}

// .vitepress/config.ts
var __vite_injected_original_import_meta_url = "file:///D:/ALL%20IN%20AI/MetaBlog/.vitepress/config.ts";
var DATA_DIR = path.join(process.cwd(), ".data");
var env = loadEnv("", process.cwd(), "VITE_");
var serverEnv = loadEnv("", process.cwd(), "LLM_");
Object.assign(process.env, env, serverEnv);
var system = {
  info: (event, message, data) => console.info(`[INFO] ${event}: ${message}`, data || ""),
  debug: (event, message, data) => console.debug(`[DEBUG] ${event}: ${message}`, data || ""),
  warn: (event, message, data) => console.warn(`[WARN] ${event}: ${message}`, data || ""),
  error: (event, message, data) => console.error(`[ERROR] ${event}: ${message}`, data || ""),
  success: (event, message, data) => console.log(`[SUCCESS] ${event}: ${message}`, data || "")
};
var structuredLog = {
  info: (event, message, data) => system.info(event, message, data),
  debug: (event, message, data) => system.debug(event, message, data),
  warn: (event, message, data) => system.warn(event, message, data),
  error: (event, message, data) => system.error(event, message, data),
  success: (event, message, data) => system.success(event, message, data),
  startRequest: () => {
  },
  endRequest: () => {
  },
  logAPIRequest: () => {
  },
  logFileEvent: () => {
  },
  logFileOperation: () => {
  },
  logSkillExecution: () => {
  },
  startLLMChain: () => {
  },
  endLLMChain: () => {
  },
  // 获取最近日志
  getRecentLogs: async (count = 100, level) => {
    try {
      const LOGS_DIR = path.join(process.cwd(), ".logs");
      if (!fs.existsSync(LOGS_DIR)) return [];
      const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith(".jsonl"));
      let allLogs = [];
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
          }
        }
      }
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
      const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith(".jsonl"));
      let total = 0;
      const byLevel = {};
      const byComponent = {};
      for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            total++;
            byLevel[log.level] = (byLevel[log.level] || 0) + 1;
            byComponent[log.component || "unknown"] = (byComponent[log.component || "unknown"] || 0) + 1;
          } catch (e) {
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
  queryLogs: async (filter) => {
    try {
      const LOGS_DIR = path.join(process.cwd(), ".logs");
      if (!fs.existsSync(LOGS_DIR)) return [];
      const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith(".jsonl"));
      let allLogs = [];
      for (const file of files) {
        const filePath = path.join(LOGS_DIR, file);
        const content = fs.readFileSync(filePath, "utf-8");
        const lines = content.split("\n").filter(Boolean);
        for (const line of lines) {
          try {
            const log = JSON.parse(line);
            if (filter.level && log.level !== filter.level) continue;
            if (filter.component && log.component !== filter.component)
              continue;
            if (filter.event && log.event !== filter.event) continue;
            if (filter.keyword && !JSON.stringify(log).toLowerCase().includes(filter.keyword.toLowerCase()))
              continue;
            allLogs.push(log);
          } catch (e) {
          }
        }
      }
      allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      return allLogs;
    } catch (e) {
      console.error("[Logs] Failed to query logs:", e);
      return [];
    }
  }
};
var getWordCount = (content) => {
  return content.split(/\s+/g).length;
};
function gitCommit(files, message) {
  try {
    const fileList = Array.isArray(files) ? files : [files];
    execSync(`git add ${fileList.map((f) => `"${f}"`).join(" ")}`);
    execSync(`git commit -m "${message}"`);
  } catch (e) {
  }
}
function formatBreadcrumbName(name) {
  let formatted = name.replace(/[_-]/g, " ");
  formatted = formatted.replace(/^(\d+)\s*/, "$1 ");
  return formatted.split(" ").map((word) => {
    if (!word) return "";
    if (/^\d+$/.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ").trim();
}
function generateRewrites() {
  const rewrites = {};
  const sectionsPath = path.resolve(process.cwd(), "docs/sections");
  if (!fs.existsSync(sectionsPath)) return rewrites;
  const sections = fs.readdirSync(sectionsPath, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const section of sections) {
    const sectionPath = path.join(sectionsPath, section.name);
    scanForRewrites(sectionPath, `sections/${section.name}`, rewrites);
  }
  return rewrites;
}
function scanForRewrites(dirPath, relativePath, rewrites) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const dirName = path.basename(dirPath);
  const sameNameMd = path.join(dirPath, `${dirName}.md`);
  const indexMd = path.join(dirPath, "index.md");
  if (fs.existsSync(sameNameMd)) {
    const source = `${relativePath}/${dirName}.md`;
    const target = `${relativePath}/index.md`;
    rewrites[source] = target;
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      scanForRewrites(
        path.join(dirPath, entry.name),
        `${relativePath}/${entry.name}`,
        rewrites
      );
    }
  }
}
var config_default = defineConfig({
  // Source directory for content files
  srcDir: "./docs",
  lang: "zh-CN",
  title: "MetaUniverse Blog",
  description: "\u6570\u5B57\u5B6A\u751F\u7EA7\u77E5\u8BC6\u7BA1\u7406\u7CFB\u7EDF",
  base: "/",
  cleanUrls: false,
  ignoreDeadLinks: true,
  // Generate rewrites dynamically
  // 支持中文文件名：确保中文路径正确处理
  rewrites: generateRewrites(),
  themeConfig: {
    nav: [
      { text: "\u9996\u9875", link: "/" },
      {
        text: "AI \u52A9\u624B",
        link: "/chat",
        activeMatch: "/chat"
      },
      {
        text: "\u6587\u7AE0\u5217\u8868",
        link: "/sections/posts/",
        activeMatch: "/sections/posts/"
      },
      {
        text: "\u77E5\u8BC6\u5E93",
        link: "/sections/knowledge/",
        activeMatch: "/sections/knowledge/"
      },
      {
        text: "\u516C\u5F00\u8D44\u6E90",
        link: "/sections/resources/",
        activeMatch: "/sections/resources/"
      },
      {
        text: "\u5173\u4E8E\u6211",
        link: "/sections/about/",
        activeMatch: "/sections/about/"
      }
    ],
    sidebar: {
      "/sections/knowledge/": toSidebarFormat(
        scanDocStructure(
          path.resolve(process.cwd(), "docs/sections/knowledge")
        )
      ),
      "/sections/posts/": toSidebarFormat(
        scanDocStructure(path.resolve(process.cwd(), "docs/sections/posts"))
      ),
      "/sections/resources/": toSidebarFormat(
        scanDocStructure(
          path.resolve(process.cwd(), "docs/sections/resources")
        )
      ),
      "/sections/about/": toSidebarFormat(
        scanDocStructure(path.resolve(process.cwd(), "docs/sections/about"))
      )
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/vuejs/vitepress" }
    ],
    docFooter: { prev: false, next: false },
    outline: {
      label: "\u9875\u9762\u5BFC\u822A",
      level: [2, 4]
      // Show headers from h2 to h4
    },
    lastUpdated: { text: "\u6700\u540E\u66F4\u65B0\u4E8E" },
    returnToTopLabel: "\u56DE\u5230\u9876\u90E8",
    sidebarMenuLabel: "\u83DC\u5355",
    darkModeSwitchLabel: "\u4E3B\u9898",
    lightModeSwitchTitle: "\u5207\u6362\u5230\u6D45\u8272\u6A21\u5F0F",
    darkModeSwitchTitle: "\u5207\u6362\u5230\u6DF1\u8272\u6A21\u5F0F"
  },
  markdown: {
    config: (md) => {
      md.use(mathjax3);
      const defaultRender = md.renderer.rules.text || function(tokens, idx, options, env2, self) {
        return self.renderToken(tokens, idx, options);
      };
      md.renderer.rules.text = function(tokens, idx, options, env2, self) {
        let content = tokens[idx].content;
        const wikiLinkRegex = /\[\[(.*?)\]\]/g;
        if (wikiLinkRegex.test(content)) {
          return content.replace(wikiLinkRegex, (match, p1) => {
            const [link, text] = p1.split("|");
            const displayText = text || link;
            const url = `/sections/posts/${link.trim().replace(/\s+/g, "-").toLowerCase()}/`;
            return `<a href="${url}">${displayText}</a>`;
          });
        }
        return defaultRender(tokens, idx, options, env2, self);
      };
    }
  },
  vue: {
    template: {
      compilerOptions: {
        isCustomElement: (tag) => tag.startsWith("mjx-")
      }
    }
  },
  vite: {
    base: "/",
    envPrefix: ["VITE_", "LLM_"],
    optimizeDeps: {
      force: true
    },
    resolve: {
      alias: [
        {
          find: "@",
          replacement: fileURLToPath(new URL("./theme", __vite_injected_original_import_meta_url))
        }
      ]
    },
    // Exclude visual scene modules from SSR - they use browser-only APIs
    ssr: {
      noExternal: ["three"]
    },
    // P1-8 修复：排除 Agent 数据目录和日志目录，避免 Vite HMR OOM
    server: {
      watch: {
        ignored: [
          "**/.vitepress/agent/memory/data/**",
          "**/.vitepress/agent/logs/**",
          "**/logs/**",
          "**/.trash/**"
        ]
      },
      // 修复 MIME 类型错误
      fs: {
        strict: false
      }
    },
    plugins: [
      {
        name: "meta-blog-routing",
        configureServer(server) {
          function getFolderNoteInfo(urlPath) {
            if (!urlPath.startsWith("/sections/")) return null;
            const pathParts = urlPath.replace(/\/$/, "").split("/").filter(Boolean);
            if (pathParts.length < 3) return null;
            const section = pathParts[1];
            const folderPath = pathParts.slice(2).join("/");
            const targetDir = path.resolve(
              process.cwd(),
              "docs/sections",
              section,
              folderPath
            );
            const folderName = path.basename(targetDir);
            const folderNoteFile = path.join(targetDir, `${folderName}.md`);
            const indexFile = path.join(targetDir, "index.md");
            if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
              if (fs.existsSync(folderNoteFile) && !fs.existsSync(indexFile)) {
                return { filePath: folderNoteFile, folderName };
              }
            }
            return null;
          }
          server.middlewares.use((req, res, next) => {
            const rawUrl = req.url || "";
            const urlWithoutQuery = rawUrl.split("?")[0];
            let url = urlWithoutQuery;
            try {
              url = decodeURIComponent(urlWithoutQuery);
            } catch (e) {
            }
            if (rawUrl.startsWith("/api/") || rawUrl.includes("_assets") || rawUrl.includes("@fs") || rawUrl.match(
              /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|json)(\?|$)/
            )) {
              if (rawUrl.startsWith("/api/")) {
                next();
                return;
              }
              next();
              return;
            }
            if (url.startsWith("/sections/")) {
              console.log("[Routing] Processing:", url);
              const isFile = url.match(/\.(html|md)$/);
              if (!url.endsWith("/") && !isFile) {
                res.statusCode = 301;
                const queryString = rawUrl.includes("?") ? "?" + rawUrl.split("?")[1] : "";
                res.setHeader("Location", encodeURI(url + "/") + queryString);
                res.end();
                return;
              }
              if (isFile) {
                next();
                return;
              }
              const folderInfo = getFolderNoteInfo(url);
              if (folderInfo) {
                const urlWithoutSlash = url.replace(/\/$/, "");
                const folderName = urlWithoutSlash.split("/").pop();
                const newUrl = `${urlWithoutSlash}/${folderName}`;
                console.log("[Routing] Folder-note detected:", {
                  original: url,
                  rewriteTo: newUrl,
                  filePath: folderInfo.filePath,
                  exists: fs.existsSync(folderInfo.filePath)
                });
                req.url = newUrl;
                system.debug(
                  "routing.rewrite",
                  `Runtime folder-note rewrite: ${url} -> ${newUrl}`,
                  {
                    metadata: {
                      originalUrl: url,
                      newUrl,
                      filePath: folderInfo.filePath
                    }
                  }
                );
              } else {
                console.log("[Routing] Not a folder-note:", url);
              }
            }
            next();
          });
        }
      },
      {
        name: "meta-blog-bff",
        configureServer(server) {
          system.info("server.init", "BFF API Server \u521D\u59CB\u5316\u5B8C\u6210");
          const llmManager = null;
          try {
            console.log("[INFO] LLM Manager \u521D\u59CB\u5316\u8DF3\u8FC7\uFF08\u4F7F\u7528 ai-chat \u6A21\u5757\uFF09");
            const defaultProvider = process.env.LLM_DEFAULT_PROVIDER || "deepseek";
            const dailyBudget = parseFloat(
              process.env.LLM_DAILY_BUDGET || "10"
            );
            const clean = (v) => v?.trim().replace(/^["']|["']$/g, "");
            const providers = {};
            const deepseekKey = clean(process.env.VITE_DEEPSEEK_API_KEY);
            if (deepseekKey && !deepseekKey.includes("your-api-key")) {
              providers.deepseek = {
                apiKey: deepseekKey,
                model: clean(process.env.VITE_DEEPSEEK_MODEL) || "deepseek-chat",
                baseURL: clean(process.env.VITE_DEEPSEEK_BASE_URL)
              };
            }
            const openaiKey = clean(process.env.VITE_OPENAI_API_KEY);
            if (openaiKey && !openaiKey.includes("your-api-key")) {
              providers.openai = {
                apiKey: openaiKey,
                model: clean(process.env.VITE_OPENAI_MODEL) || "gpt-4o",
                baseURL: clean(process.env.VITE_OPENAI_BASE_URL)
              };
            }
            const anthropicKey = clean(process.env.VITE_ANTHROPIC_API_KEY);
            if (anthropicKey && !anthropicKey.includes("your-api-key")) {
              providers.anthropic = {
                apiKey: anthropicKey,
                model: clean(process.env.VITE_ANTHROPIC_MODEL) || "claude-3-5-sonnet",
                baseURL: clean(process.env.VITE_ANTHROPIC_BASE_URL)
              };
            }
            const geminiKey = clean(process.env.VITE_GEMINI_API_KEY);
            if (geminiKey && !geminiKey.includes("your-api-key")) {
              providers.gemini = {
                apiKey: geminiKey,
                model: clean(process.env.VITE_GEMINI_MODEL) || "gemini-1.5-pro",
                baseURL: clean(process.env.VITE_GEMINI_BASE_URL)
              };
            }
            const zhipuKey = clean(process.env.VITE_ZHIPU_API_KEY);
            if (zhipuKey && !zhipuKey.includes("your-api-key")) {
              providers.zhipu = {
                apiKey: zhipuKey,
                model: clean(process.env.VITE_ZHIPU_MODEL) || "glm-4",
                baseURL: clean(process.env.VITE_ZHIPU_BASE_URL)
              };
            }
            const qwenKey = clean(process.env.VITE_QWEN_API_KEY);
            if (qwenKey && !qwenKey.includes("your-api-key")) {
              providers.qwen = {
                apiKey: qwenKey,
                model: clean(process.env.VITE_QWEN_MODEL) || "qwen-plus",
                baseURL: clean(process.env.VITE_QWEN_BASE_URL)
              };
            }
            const kimiKey = clean(process.env.VITE_KIMI_API_KEY);
            if (kimiKey && !kimiKey.includes("your-api-key")) {
              providers.kimi = {
                apiKey: kimiKey,
                model: clean(process.env.VITE_KIMI_MODEL) || "kimi-k2.5",
                baseURL: clean(process.env.VITE_KIMI_BASE_URL)
              };
            }
            console.log("[LLM] Providers config:", Object.keys(providers));
            if (Object.keys(providers).length === 0) {
              system.warn("server.llm", "\u6CA1\u6709\u914D\u7F6E\u4EFB\u4F55 LLM Provider");
            } else {
              system.info(
                "server.llm",
                `LLM Manager \u521D\u59CB\u5316\u5B8C\u6210\uFF0CProvider: ${Object.keys(providers).join(", ")}, \u9ED8\u8BA4: ${defaultProvider}`
              );
            }
          } catch (e) {
            system.error("server.llm", "LLM Manager \u521D\u59CB\u5316\u5931\u8D25: " + String(e));
          }
          const triggerReload = () => {
            console.log(
              "[HMR] Trigger reload called, server.ws exists:",
              !!server.ws
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
                  "[HMR] WebSocket not available, falling back to file watcher"
                );
              }
            }, 500);
          };
          server.middlewares.use("/api/", (req, res, next) => {
            const startTime = Date.now();
            const url = req.url || "";
            system.debug("api.request", `${req.method} ${url}`, {
              metadata: { method: req.method, url }
            });
            const originalEnd = res.end.bind(res);
            res.end = function(...args) {
              const duration = Date.now() - startTime;
              const status = res.statusCode || 200;
              if (status >= 400) {
                system.error(
                  "api.response",
                  `${req.method} ${url} - ${status} (${duration}ms)`
                );
              } else {
                system.success(
                  "api.response",
                  `${req.method} ${url} - ${status} (${duration}ms)`
                );
              }
              return originalEnd(...args);
            };
            next();
          });
          server.middlewares.use(
            "/api/files/read",
            (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const url = new URL(
                    req.url || "",
                    `http://${req.headers.host}`
                  );
                  let filePath = url.searchParams.get("path");
                  if (!filePath) return next();
                  filePath = decodeURIComponent(filePath);
                  const isAgentPath = filePath.startsWith(".vitepress/") || filePath.startsWith(".vitepress\\");
                  const basePath = isAgentPath ? process.cwd() : path.join(process.cwd(), "docs");
                  const fullPath = path.resolve(
                    basePath,
                    filePath.replace(/^\//, "")
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
            }
          );
          server.middlewares.use("/api/files/save", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
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
                        error: "Path required"
                      })
                    );
                    return;
                  }
                  const isAgentPath = filePath.startsWith(".vitepress/") || filePath.startsWith(".vitepress\\");
                  const basePath = isAgentPath ? process.cwd() : path.join(process.cwd(), "docs");
                  const fullPath = path.resolve(
                    basePath,
                    filePath.replace(/^\//, "")
                  );
                  const dir = path.dirname(fullPath);
                  await fs.promises.mkdir(dir, { recursive: true });
                  await fs.promises.writeFile(fullPath, content, "utf-8");
                  const duration = Date.now() - startTime;
                  system.debug("file.saved", `File saved: ${filePath}`, {
                    metadata: {
                      path: filePath,
                      size: content.length,
                      duration
                    }
                  });
                  gitCommit(
                    fullPath,
                    `content: \u66F4\u65B0 ${path.basename(fullPath)}`
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, message: "Saved" }));
                  triggerReload();
                } catch (error) {
                  console.error("[API] Save file error:", error);
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: error.message
                    })
                  );
                }
              });
            } else next();
          });
          server.middlewares.use("/api/files/rename", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const {
                    path: filePath,
                    newName,
                    updateFrontmatter = true
                  } = body;
                  const dir = path.dirname(filePath);
                  const ext = path.extname(filePath);
                  const newFileName = newName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "_") + ext;
                  const newPath = path.join(dir, newFileName);
                  const fullOldPath = path.resolve(
                    process.cwd(),
                    "docs",
                    filePath.replace(/^\//, "")
                  );
                  const fullNewPath = path.resolve(
                    process.cwd(),
                    "docs",
                    newPath.replace(/^\//, "")
                  );
                  if (!fs.existsSync(fullOldPath)) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "File not found"
                      })
                    );
                    return;
                  }
                  if (fs.existsSync(fullNewPath)) {
                    res.statusCode = 409;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Target file already exists"
                      })
                    );
                    return;
                  }
                  let content = fs.readFileSync(fullOldPath, "utf-8");
                  if (updateFrontmatter) {
                    if (content.startsWith("---")) {
                      if (content.match(/title:\s*.+/)) {
                        content = content.replace(
                          /title:\s*.+/,
                          `title: ${newName}`
                        );
                      } else {
                        content = content.replace(
                          /---\n/,
                          `---
title: ${newName}
`
                        );
                      }
                    } else {
                      content = `---
title: ${newName}
---

${content}`;
                    }
                  }
                  fs.writeFileSync(fullNewPath, content);
                  fs.unlinkSync(fullOldPath);
                  gitCommit(
                    [fullOldPath, fullNewPath],
                    `content: \u91CD\u547D\u540D ${path.basename(filePath)} -> ${newFileName}`
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        oldPath: filePath,
                        newPath: newPath.replace(/\\/g, "/"),
                        newName: newFileName,
                        displayName: newName
                      }
                    })
                  );
                  triggerReload();
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/files/move", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { from: fromPath, to: toPath } = body;
                  const fullFromPath = path.resolve(
                    process.cwd(),
                    "docs",
                    fromPath.replace(/^\//, "")
                  );
                  const fullToPath = path.resolve(
                    process.cwd(),
                    "docs",
                    toPath.replace(/^\//, "")
                  );
                  fs.mkdirSync(path.dirname(fullToPath), { recursive: true });
                  fs.renameSync(fullFromPath, fullToPath);
                  gitCommit(
                    [fullFromPath, fullToPath],
                    `content: \u79FB\u52A8 ${path.basename(fromPath)} -> ${path.basename(toPath)}`
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: { toPath } }));
                  triggerReload();
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/files/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: filePath, permanent = false } = body;
                  let decodedPath = filePath;
                  try {
                    decodedPath = decodeURIComponent(filePath);
                  } catch (e) {
                  }
                  const fullPath = path.resolve(
                    process.cwd(),
                    "docs",
                    decodedPath.replace(/^\//, "")
                  );
                  if (!fs.existsSync(fullPath)) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "File not found"
                      })
                    );
                    return;
                  }
                  if (permanent) {
                    fs.unlinkSync(fullPath);
                    gitCommit(
                      fullPath,
                      `content: \u6C38\u4E45\u5220\u9664 ${path.basename(decodedPath)}`
                    );
                  } else {
                    const trashDir = path.join(process.cwd(), "docs", ".trash");
                    if (!fs.existsSync(trashDir)) {
                      fs.mkdirSync(trashDir, { recursive: true });
                    }
                    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
                    const originalName = path.basename(decodedPath);
                    const trashFileName = `${originalName}.${timestamp}.trash`;
                    const trashPath = path.join(trashDir, trashFileName);
                    fs.renameSync(fullPath, trashPath);
                    const metaPath = `${trashPath}.meta.json`;
                    const metaData = {
                      originalPath: decodedPath,
                      deletedAt: (/* @__PURE__ */ new Date()).toISOString(),
                      expiresAt: new Date(
                        Date.now() + 30 * 24 * 60 * 60 * 1e3
                      ).toISOString(),
                      // 30天后过期
                      originalName
                    };
                    fs.writeFileSync(
                      metaPath,
                      JSON.stringify(metaData, null, 2)
                    );
                    gitCommit(
                      [fullPath, trashPath, metaPath].filter(
                        (p) => fs.existsSync(p)
                      ),
                      `content: \u5220\u9664(\u56DE\u6536\u7AD9) ${originalName}`
                    );
                  }
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                  triggerReload();
                } catch (e) {
                  console.error("[API] Delete error:", e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });
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
                  let meta = {};
                  if (fs.existsSync(metaPath)) {
                    try {
                      meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
                    } catch (e) {
                    }
                  }
                  trashItems.push({
                    id: file,
                    name: file.replace(/\.\d{4}-\d{2}-\d{2}T.*$/, ""),
                    deletedAt: meta.deletedAt || stats.mtime.toISOString(),
                    expiresAt: meta.expiresAt || new Date(
                      Date.now() + 30 * 24 * 60 * 60 * 1e3
                    ).toISOString(),
                    originalPath: meta.originalPath || "unknown",
                    size: stats.size
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
          server.middlewares.use("/api/files/restore", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
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
                        error: "Trash item not found"
                      })
                    );
                    return;
                  }
                  let originalPath = "";
                  if (fs.existsSync(metaPath)) {
                    try {
                      const meta = JSON.parse(
                        fs.readFileSync(metaPath, "utf-8")
                      );
                      originalPath = meta.originalPath;
                    } catch (e) {
                    }
                  }
                  if (!originalPath) {
                    originalPath = trashId.replace(
                      /\.\d{4}-\d{2}-\d{2}T.*\.trash$/,
                      ""
                    );
                  }
                  const restoredPath = path.resolve(
                    process.cwd(),
                    "docs",
                    originalPath.replace(/^\//, "")
                  );
                  fs.mkdirSync(path.dirname(restoredPath), { recursive: true });
                  fs.renameSync(trashPath, restoredPath);
                  if (fs.existsSync(metaPath)) {
                    fs.unlinkSync(metaPath);
                  }
                  gitCommit(
                    [restoredPath],
                    `content: \u6062\u590D\u6587\u4EF6 ${path.basename(originalPath)}`
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: { restoredPath: originalPath }
                    })
                  );
                  triggerReload();
                } catch (e) {
                  console.error("[API] Restore error:", e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/files/content", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`
                );
                let filePath = url.searchParams.get("path");
                if (!filePath) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({ success: false, error: "Path required" })
                  );
                  return;
                }
                try {
                  filePath = decodeURIComponent(filePath);
                } catch (e) {
                }
                const cleanPath = filePath.replace(/\.\./g, "").replace(/^\//, "");
                const fullPath = path.resolve(process.cwd(), "docs", cleanPath);
                console.log("[API] Export content:", {
                  cleanPath,
                  fullPath,
                  exists: fs.existsSync(fullPath)
                });
                if (!fs.existsSync(fullPath)) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "File not found: " + cleanPath
                    })
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
                    error: error.message
                  })
                );
              }
            } else next();
          });
          server.middlewares.use(
            "/api/articles/batch-export",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks = [];
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
                          error: "Paths array required"
                        })
                      );
                      return;
                    }
                    const JSZip = await import("file:///D:/ALL%20IN%20AI/MetaBlog/node_modules/jszip/lib/index.js").then((m) => m.default);
                    const zip = new JSZip();
                    for (const filePath of paths) {
                      try {
                        const cleanPath = filePath.replace(/\.html$/, ".md").replace(/^\//, "");
                        const fullPath = path.resolve(
                          process.cwd(),
                          "docs",
                          cleanPath
                        );
                        if (fs.existsSync(fullPath)) {
                          const content = fs.readFileSync(fullPath, "utf-8");
                          const fileName = path.basename(cleanPath);
                          zip.file(fileName, content);
                        }
                      } catch (e) {
                        console.error(
                          `[API] Failed to add file ${filePath}:`,
                          e
                        );
                      }
                    }
                    const zipContent = await zip.generateAsync({
                      type: "nodebuffer"
                    });
                    res.setHeader("Content-Type", "application/zip");
                    res.setHeader(
                      "Content-Disposition",
                      `attachment; filename="articles-export-${Date.now()}.zip"`
                    );
                    res.end(zipContent);
                  } catch (error) {
                    console.error("[API] Batch export error:", error);
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: error.message
                      })
                    );
                  }
                });
              } else next();
            }
          );
          server.middlewares.use("/api/files/mkdir", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
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
                        error: "Path required"
                      })
                    );
                    return;
                  }
                  const isConfigPath = dirPath.startsWith(".") || dirPath.startsWith("_");
                  const basePath = isConfigPath ? process.cwd() : path.join(process.cwd(), "docs");
                  const fullPath = path.resolve(basePath, dirPath);
                  if (!fullPath.startsWith(basePath)) {
                    res.statusCode = 403;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Access denied"
                      })
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
          server.middlewares.use("/api/files/list", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`
                );
                let dirPath = url.searchParams.get("path") || ".";
                try {
                  dirPath = decodeURIComponent(dirPath);
                } catch (e) {
                }
                const isConfigPath = dirPath.startsWith(".") || dirPath.startsWith("_");
                const basePath = isConfigPath ? process.cwd() : path.join(process.cwd(), "docs");
                const fullPath = path.resolve(basePath, dirPath);
                if (!fullPath.startsWith(basePath)) {
                  res.statusCode = 403;
                  res.end(
                    JSON.stringify({ success: false, error: "Access denied" })
                  );
                  return;
                }
                if (!fs.existsSync(fullPath)) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Directory not found"
                    })
                  );
                  return;
                }
                const stats = fs.statSync(fullPath);
                if (!stats.isDirectory()) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Path is not a directory"
                    })
                  );
                  return;
                }
                const entries = fs.readdirSync(fullPath, {
                  withFileTypes: true
                });
                const items = entries.map((entry) => ({
                  name: entry.name,
                  isDirectory: entry.isDirectory(),
                  isFile: entry.isFile(),
                  path: path.join(dirPath, entry.name).replace(/\\/g, "/")
                }));
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: items }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          server.middlewares.use("/api/agent/task", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const {
                    taskId,
                    content: fileContent,
                    path: filePath,
                    metadata
                  } = body;
                  const fullPath = path.resolve(
                    process.cwd(),
                    "docs",
                    filePath.replace(/^\//, "")
                  );
                  fs.writeFileSync(fullPath, fileContent);
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
                  const taskDir = path.resolve(
                    process.cwd(),
                    ".vitepress/agent/memory/tasks"
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
                        timestamp: (/* @__PURE__ */ new Date()).toISOString()
                      },
                      null,
                      2
                    )
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
          server.middlewares.use(
            "/api/agent/context/init",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { path: filePath } = body;
                    const contextDir = path.resolve(
                      process.cwd(),
                      ".vitepress/agent/memory"
                    );
                    let entities = [];
                    let history = [];
                    const entitiesPath = path.join(
                      contextDir,
                      "entities/concepts.json"
                    );
                    if (fs.existsSync(entitiesPath)) {
                      const entitiesData = JSON.parse(
                        fs.readFileSync(entitiesPath, "utf-8")
                      );
                      entities = Object.values(entitiesData).filter(
                        (e) => e.sources?.includes(filePath)
                      );
                    }
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        context: {
                          path: filePath,
                          entities: entities.slice(0, 5),
                          relatedArticles: entities.length
                        }
                      })
                    );
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: String(e) }));
                  }
                });
              } else next();
            }
          );
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
                `${taskId}.json`
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
          server.middlewares.use("/api/git/commit", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
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
          server.middlewares.use("/api/utils/slugify", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { text } = body;
                  let slug = text;
                  try {
                    const pinyinFn = __require("file:///D:/ALL%20IN%20AI/MetaBlog/node_modules/pinyin/lib/cjs/pinyin.js");
                    slug = (typeof pinyinFn === "function" ? pinyinFn(text, { style: "normal" }) : pinyinFn.default ? pinyinFn.default(text, { style: "normal" }) : text).flat().join("-");
                  } catch (e) {
                  }
                  slug = slug.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").substring(0, 50);
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ slug }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/git/log", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const logOutput = execSync(
                  `git log --pretty=format:'{"hash":"%H","message":"%s","date":"%ai","author":"%an"}' -20`,
                  { encoding: "utf-8", cwd: process.cwd() }
                );
                const logs = logOutput.split("\n").filter((line) => line.trim()).map((line) => {
                  try {
                    return JSON.parse(line);
                  } catch {
                    return null;
                  }
                }).filter(Boolean);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(logs));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: "Failed to get git log" }));
              }
            } else next();
          });
          server.middlewares.use("/api/sidebar", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`
                );
                const section = url.searchParams.get("section") || "posts";
                const nodes = scanDocStructure(
                  path.resolve(process.cwd(), "docs/sections", section)
                );
                const sidebarData = toSidebarFormat(nodes);
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Cache-Control", "no-cache");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: sidebarData,
                    timestamp: Date.now()
                  })
                );
              } catch (e) {
                console.error("[API] Sidebar error:", e);
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: "Failed to generate sidebar"
                  })
                );
              }
            } else next();
          });
          server.middlewares.use(
            "/api/directory-tree",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const url = new URL(
                    req.url || "",
                    `http://${req.headers.host}`
                  );
                  const section = url.searchParams.get("section") || "posts";
                  const nodes = scanDocStructure(
                    path.resolve(process.cwd(), "docs/sections", section)
                  );
                  const treeData = toDirectoryTree(nodes);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: treeData
                    })
                  );
                } catch (e) {
                  console.error("[API] Directory tree error:", e);
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to generate directory tree"
                    })
                  );
                }
              } else next();
            }
          );
          const SECTIONS_PATH = path.join(process.cwd(), "docs/sections");
          function generateSlug(title) {
            if (!title || !title.trim()) return "untitled";
            let result = title.trim().replace(/[\\/*?:"<>|]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 100);
            return result || "untitled";
          }
          async function scanArticles(dir, basePath = "") {
            const articles = [];
            try {
              const entries = await fs.promises.readdir(dir, {
                withFileTypes: true
              });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.join(basePath, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith(".")) {
                  const subArticles = await scanArticles(
                    fullPath,
                    relativePath
                  );
                  articles.push(...subArticles);
                } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md") {
                  const content = await fs.promises.readFile(fullPath, "utf-8");
                  const meta = extractArticleMeta(content, relativePath);
                  articles.push(meta);
                }
              }
            } catch (e) {
            }
            return articles;
          }
          function extractArticleMeta(content, relativePath) {
            const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
            const meta = {};
            if (frontmatterMatch) {
              frontmatterMatch[1].split("\n").forEach((line) => {
                const match = line.match(/^(\w+):\s*(.+)$/);
                if (match)
                  meta[match[1]] = match[2].replace(/^["']|["']$/g, "");
              });
            }
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = meta.title || titleMatch?.[1] || path.basename(relativePath, ".md");
            return {
              path: relativePath.replace(/\\/g, "/"),
              title,
              description: meta.description,
              tags: meta.tags ? meta.tags.split(",").map((t) => t.trim()) : [],
              date: meta.date,
              updatedAt: meta.updatedAt,
              wordCount: content.replace(/\s+/g, "").length,
              isPublished: !relativePath.includes("/drafts/")
            };
          }
          function flattenArticles(nodes) {
            const articles = [];
            for (const node of nodes) {
              if (node.type === "file") {
                articles.push({
                  path: node.path,
                  title: node.title,
                  isLeaf: true
                });
              } else if (node.type === "folder" && node.children) {
                articles.push(...flattenArticles(node.children));
              }
            }
            return articles;
          }
          async function scanArticlesForList(dir, section, results) {
            try {
              const entries = await fs.promises.readdir(dir, {
                withFileTypes: true
              });
              for (const entry of entries) {
                if (entry.name.startsWith(".")) continue;
                const fullPath = path.join(dir, entry.name);
                const relativePath = fullPath.replace(SECTIONS_PATH + path.sep, "").replace(/\\/g, "/");
                if (entry.isDirectory()) {
                  await scanArticlesForList(fullPath, section, results);
                } else if (entry.isFile() && entry.name.endsWith(".md")) {
                  let title = entry.name.replace(".md", "");
                  try {
                    const content = await fs.promises.readFile(
                      fullPath,
                      "utf-8"
                    );
                    const frontmatterMatch = content.match(
                      /^---\n([\s\S]*?)\n---/
                    );
                    if (frontmatterMatch) {
                      const titleMatch = frontmatterMatch[1].match(/^title:\s*(.+)$/m);
                      if (titleMatch) title = titleMatch[1].trim();
                    }
                    if (!title || title === entry.name.replace(".md", "")) {
                      const contentTitleMatch = content.match(/^#\s+(.+)$/m);
                      if (contentTitleMatch)
                        title = contentTitleMatch[1].trim();
                    }
                  } catch {
                  }
                  results.push({
                    path: relativePath,
                    title,
                    section
                  });
                }
              }
            } catch {
            }
          }
          server.middlewares.use(
            "/api/articles/list",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const allArticles = [];
                  const sections = ["posts", "knowledge", "resources", "about"];
                  for (const section of sections) {
                    const sectionPath = path.join(SECTIONS_PATH, section);
                    if (fs.existsSync(sectionPath)) {
                      const articles = await scanArticles(sectionPath);
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
                      data: allArticles
                    })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to list articles"
                    })
                  );
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/articles/list-all",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const articles = [];
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
                      data: articles
                    })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to list articles"
                    })
                  );
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/articles/search",
            async (req, res, next) => {
              if (req.method === "GET") {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`
                );
                const q = url.searchParams.get("q");
                try {
                  const articles = await scanArticles(SECTIONS_PATH);
                  const query = (q || "").toLowerCase();
                  const results = articles.filter(
                    (a) => a.title.toLowerCase().includes(query) || a.description?.toLowerCase().includes(query)
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: results }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Failed to search articles"
                    })
                  );
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/articles/detail",
            async (req, res, next) => {
              if (req.method === "GET") {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`
                );
                const articlePath = url.searchParams.get("path");
                if (!articlePath) {
                  res.statusCode = 400;
                  res.end(
                    JSON.stringify({ success: false, error: "Path required" })
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
                      data: { ...meta, content }
                    })
                  );
                } catch (e) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Article not found"
                    })
                  );
                }
              } else next();
            }
          );
          server.middlewares.use("/api/articles/create", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
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
                          error: "Invalid JSON"
                        })
                      );
                      return;
                    }
                    const {
                      title,
                      content = "",
                      section = "posts",
                      tags = [],
                      parentPath,
                      isChildDoc
                    } = body;
                    console.log("[API] Creating article:", {
                      title,
                      section,
                      isChildDoc,
                      parentPath
                    });
                    if (!title) {
                      res.statusCode = 400;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: "Title required"
                        })
                      );
                      return;
                    }
                    const slug = generateSlug(title);
                    const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
                    const filename = `${slug}.md`;
                    let targetDir;
                    let filePath;
                    if (isChildDoc && parentPath) {
                      let cleanParentPath = parentPath.replace(/\.(html|md)$/i, "").replace(/^\//, "").replace(/\/$/, "");
                      if (cleanParentPath.startsWith("sections/")) {
                        cleanParentPath = cleanParentPath.substring(
                          "sections/".length
                        );
                      }
                      cleanParentPath = cleanParentPath.replace(/\.md$/i, "");
                      const parentName = path.basename(cleanParentPath);
                      const parentFullPath = path.join(SECTIONS_PATH, cleanParentPath) + ".md";
                      const parentDir = path.dirname(parentFullPath);
                      const parentFolderPath = path.join(parentDir, parentName);
                      console.log("[API] Parent info:", {
                        parentFullPath,
                        parentDir,
                        parentName,
                        parentFolderPath
                      });
                      const isLeafDoc = !fs.existsSync(parentFolderPath);
                      if (isLeafDoc) {
                        console.log(
                          "[API] Parent is leaf document, creating folder and moving..."
                        );
                        await fs.promises.mkdir(parentFolderPath, {
                          recursive: true
                        });
                        const targetParentPath = path.join(
                          parentFolderPath,
                          "index.md"
                        );
                        if (fs.existsSync(parentFullPath)) {
                          await fs.promises.rename(
                            parentFullPath,
                            targetParentPath
                          );
                          console.log(
                            "[API] Moved parent doc to:",
                            targetParentPath
                          );
                        }
                        targetDir = parentFolderPath;
                      } else {
                        console.log(
                          "[API] Parent already has folder, creating inside..."
                        );
                        targetDir = parentFolderPath;
                      }
                      filePath = path.join(targetDir, filename);
                    } else {
                      targetDir = path.join(SECTIONS_PATH, section);
                      filePath = path.join(targetDir, filename);
                    }
                    console.log("[API] Target path:", { targetDir, filePath });
                    await fs.promises.mkdir(targetDir, { recursive: true });
                    const frontmatter = `---
title: ${title}
date: ${date}
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
---

${content}`;
                    await fs.promises.writeFile(filePath, frontmatter, "utf-8");
                    console.log("[API] File written successfully:", filePath);
                    clearSidebarCache(section);
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        data: {
                          path: path.relative(SECTIONS_PATH, filePath).replace(/\\/g, "/"),
                          title,
                          date,
                          fullPath: filePath
                        }
                      })
                    );
                    triggerReload();
                  } catch (e) {
                    console.error("[API] Create article error:", e);
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to create article: " + e.message
                      })
                    );
                  }
                })();
              });
            } else {
              next();
            }
          });
          server.middlewares.use(
            "/api/articles/update",
            async (req, res, next) => {
              if (req.method === "PUT") {
                const chunks = [];
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
                        message: "Article updated"
                      })
                    );
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to update article"
                      })
                    );
                  }
                });
              } else next();
            }
          );
          server.middlewares.use(
            "/api/articles/publish",
            async (req, res, next) => {
              if (req.method === "POST") {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { path: articlePath } = body;
                    const sourcePath = path.join(SECTIONS_PATH, articlePath);
                    const targetPath = articlePath.replace(
                      "/drafts/",
                      "/posts/"
                    );
                    const destPath = path.join(SECTIONS_PATH, targetPath);
                    await fs.promises.mkdir(path.dirname(destPath), {
                      recursive: true
                    });
                    await fs.promises.rename(sourcePath, destPath);
                    clearSidebarCache("drafts");
                    clearSidebarCache("posts");
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        data: { newPath: targetPath }
                      })
                    );
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to publish article"
                      })
                    );
                  }
                });
              } else next();
            }
          );
          server.middlewares.use(
            "/api/articles/delete",
            async (req, res, next) => {
              if (req.method === "POST") {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { path: articlePath } = body;
                    const fullPath = path.join(SECTIONS_PATH, articlePath);
                    const section = articlePath.split("/")[0];
                    await fs.promises.unlink(fullPath);
                    clearSidebarCache(section);
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({
                        success: true,
                        message: "Article deleted"
                      })
                    );
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to delete article"
                      })
                    );
                  }
                });
              } else next();
            }
          );
          server.middlewares.use(
            "/api/articles/move",
            async (req, res, next) => {
              if (req.method === "POST") {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { from, to } = body;
                    const sourcePath = path.join(SECTIONS_PATH, from);
                    const destPath = path.join(SECTIONS_PATH, to);
                    const fromSection = from.split("/")[0];
                    const toSection = to.split("/")[0];
                    await fs.promises.mkdir(path.dirname(destPath), {
                      recursive: true
                    });
                    await fs.promises.rename(sourcePath, destPath);
                    clearSidebarCache(fromSection);
                    if (fromSection !== toSection) {
                      clearSidebarCache(toSection);
                    }
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({ success: true, data: { newPath: to } })
                    );
                    triggerReload();
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Failed to move article"
                      })
                    );
                  }
                });
              } else next();
            }
          );
          server.middlewares.use("/api/logs/add", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const level = (body.level || "info").toLowerCase();
                  const event = body.event || "system";
                  const message = body.message;
                  const metadata = {
                    actor: body.actor || "system",
                    source: body.source,
                    taskId: body.taskId,
                    skillName: body.skillName,
                    duration: body.duration,
                    ...body.metadata
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
          server.middlewares.use("/api/logs/recent", async (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const count = parseInt(url.searchParams.get("count") || "100");
              const level = url.searchParams.get("level");
              const logs = await structuredLog.getRecentLogs?.(count, level) || [];
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: logs }));
            } else next();
          });
          server.middlewares.use("/api/logs/stats", async (req, res, next) => {
            if (req.method === "GET") {
              const stats = await structuredLog.getStats?.() || {};
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: stats }));
            } else next();
          });
          server.middlewares.use("/api/logs/query", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(
                  req.url || "",
                  `http://${req.headers.host}`
                );
                const LOGS_DIR = path.join(process.cwd(), ".logs");
                if (!fs.existsSync(LOGS_DIR)) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: [] }));
                  return;
                }
                const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith(".jsonl"));
                let allLogs = [];
                for (const file of files) {
                  const filePath = path.join(LOGS_DIR, file);
                  const content = fs.readFileSync(filePath, "utf-8");
                  const lines = content.split("\n").filter(Boolean);
                  for (const line of lines) {
                    try {
                      const log = JSON.parse(line);
                      const level = url.searchParams.get("level");
                      const category = url.searchParams.get("category");
                      const component = url.searchParams.get("component");
                      const keyword = url.searchParams.get("keyword");
                      if (level && log.level !== level) continue;
                      if (category && log.category !== category) continue;
                      if (component && log.component !== component) continue;
                      if (keyword && !JSON.stringify(log).toLowerCase().includes(keyword.toLowerCase()))
                        continue;
                      allLogs.push(log);
                    } catch (e) {
                    }
                  }
                }
                allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                const limit = parseInt(url.searchParams.get("limit") || "100");
                const offset = parseInt(url.searchParams.get("offset") || "0");
                const paginatedLogs = allLogs.slice(offset, offset + limit);
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: paginatedLogs,
                    total: allLogs.length
                  })
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          server.middlewares.use("/api/logs/batch", async (req, res, next) => {
            if (req.method === "POST") {
              try {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const logs = body.logs || [];
                    const LOGS_DIR = path.join(process.cwd(), ".logs");
                    if (!fs.existsSync(LOGS_DIR)) {
                      fs.mkdirSync(LOGS_DIR, { recursive: true });
                    }
                    const logsByDate = /* @__PURE__ */ new Map();
                    for (const log of logs) {
                      const date = new Date(log.timestamp || Date.now()).toISOString().split("T")[0];
                      if (!logsByDate.has(date)) {
                        logsByDate.set(date, []);
                      }
                      logsByDate.get(date).push(log);
                    }
                    for (const [date, dateLogs] of logsByDate) {
                      const filePath = path.join(LOGS_DIR, `${date}.jsonl`);
                      const lines = dateLogs.map((l) => JSON.stringify(l)).join("\n") + "\n";
                      fs.appendFileSync(filePath, lines);
                    }
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({ success: true, count: logs.length })
                    );
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({ success: false, error: String(e) })
                    );
                  }
                });
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          server.middlewares.use(
            "/api/logs/cleanup",
            async (req, res, next) => {
              if (req.method === "POST") {
                try {
                  const chunks = [];
                  req.on("data", (chunk) => chunks.push(chunk));
                  req.on("end", async () => {
                    try {
                      const body = JSON.parse(Buffer.concat(chunks).toString());
                      const days = body.days ?? 7;
                      const LOGS_DIR = path.join(process.cwd(), ".logs");
                      if (!fs.existsSync(LOGS_DIR)) {
                        res.setHeader("Content-Type", "application/json");
                        res.end(
                          JSON.stringify({
                            success: true,
                            message: "No logs to cleanup"
                          })
                        );
                        return;
                      }
                      const files = fs.readdirSync(LOGS_DIR);
                      const now = Date.now();
                      const cutoffTime = days > 0 ? now - days * 24 * 60 * 60 * 1e3 : now;
                      let deletedCount = 0;
                      for (const file of files) {
                        if (file.startsWith(".") || !file.endsWith(".jsonl"))
                          continue;
                        const filePath = path.join(LOGS_DIR, file);
                        const stats = fs.statSync(filePath);
                        if (days === 0 || stats.mtime.getTime() < cutoffTime) {
                          fs.unlinkSync(filePath);
                          deletedCount++;
                        }
                      }
                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          success: true,
                          message: days === 0 ? "All logs cleared" : `Logs older than ${days} days cleaned up`,
                          deletedCount
                        })
                      );
                    } catch (e) {
                      res.statusCode = 500;
                      res.end(
                        JSON.stringify({ success: false, error: String(e) })
                      );
                    }
                  });
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/logs/api-debug",
            async (req, res, next) => {
              if (req.method === "POST") {
                try {
                  const chunks = [];
                  req.on("data", (chunk) => chunks.push(chunk));
                  req.on("end", async () => {
                    try {
                      const body = JSON.parse(Buffer.concat(chunks).toString());
                      const {
                        sessionId,
                        startTime,
                        endTime,
                        totalRounds,
                        entries
                      } = body;
                      if (!sessionId || !entries) {
                        res.statusCode = 400;
                        res.end(
                          JSON.stringify({
                            success: false,
                            error: "Missing required fields: sessionId, entries"
                          })
                        );
                        return;
                      }
                      const debugDir = path.join(
                        process.cwd(),
                        ".logs",
                        "api-debug"
                      );
                      if (!fs.existsSync(debugDir)) {
                        fs.mkdirSync(debugDir, { recursive: true });
                      }
                      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
                      const filename = `${timestamp}-${sessionId}.json`;
                      const filepath = path.join(debugDir, filename);
                      const debugData = {
                        sessionId,
                        startTime,
                        endTime: endTime || (/* @__PURE__ */ new Date()).toISOString(),
                        totalRounds,
                        entryCount: entries.length,
                        entries
                      };
                      fs.writeFileSync(
                        filepath,
                        JSON.stringify(debugData, null, 2),
                        "utf-8"
                      );
                      console.log(
                        `[API Debug] Saved to ${filename} (${entries.length} entries)`
                      );
                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          success: true,
                          data: {
                            filename,
                            entryCount: entries.length
                          }
                        })
                      );
                    } catch (e) {
                      res.statusCode = 500;
                      res.end(
                        JSON.stringify({ success: false, error: String(e) })
                      );
                    }
                  });
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/logs/api-debug/list",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const debugDir = path.join(
                    process.cwd(),
                    ".logs",
                    "api-debug"
                  );
                  if (!fs.existsSync(debugDir)) {
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ success: true, data: [] }));
                    return;
                  }
                  const files = fs.readdirSync(debugDir).filter((f) => f.endsWith(".json"));
                  const fileInfos = files.map((filename) => {
                    const filepath = path.join(debugDir, filename);
                    const stats = fs.statSync(filepath);
                    return {
                      filename,
                      size: stats.size,
                      createdAt: stats.ctime.toISOString()
                    };
                  });
                  fileInfos.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: fileInfos }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/logs/session",
            async (req, res, next) => {
              if (req.method === "POST") {
                try {
                  const chunks = [];
                  req.on("data", (chunk) => chunks.push(chunk));
                  req.on("end", async () => {
                    try {
                      const sessionLog = JSON.parse(
                        Buffer.concat(chunks).toString()
                      );
                      const sessionsDir = path.join(
                        process.cwd(),
                        ".logs",
                        "sessions"
                      );
                      if (!fs.existsSync(sessionsDir)) {
                        fs.mkdirSync(sessionsDir, { recursive: true });
                      }
                      const filename = sessionLog.filename || `session-${Date.now()}.json`;
                      const filepath = path.join(sessionsDir, filename);
                      fs.writeFileSync(
                        filepath,
                        JSON.stringify(sessionLog, null, 2),
                        "utf-8"
                      );
                      console.log(
                        `[Session Log] Saved to ${filename} (${sessionLog.entries?.length || 0} entries)`
                      );
                      res.setHeader("Content-Type", "application/json");
                      res.end(
                        JSON.stringify({
                          success: true,
                          data: { filename, path: filepath }
                        })
                      );
                    } catch (e) {
                      console.error("[Session Log] Error saving:", e);
                      res.statusCode = 500;
                      res.end(
                        JSON.stringify({ success: false, error: String(e) })
                      );
                    }
                  });
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            }
          );
          server.middlewares.use("/api/proxy/fetch", async (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { url, timeout = 1e4 } = body;
                  if (!url) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({ success: false, error: "URL required" })
                    );
                    return;
                  }
                  let targetUrl;
                  try {
                    targetUrl = new URL(url);
                  } catch {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Invalid URL format"
                      })
                    );
                    return;
                  }
                  if (!["http:", "https:"].includes(targetUrl.protocol)) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Only HTTP/HTTPS allowed"
                      })
                    );
                    return;
                  }
                  structuredLog.info("proxy.fetch.started", `Fetching ${url}`, {
                    url,
                    timeout
                  });
                  structuredLog.info("proxy.fetch.request", `Fetching ${url}`, {
                    hostname: targetUrl.hostname
                  });
                  const controller = new AbortController();
                  const timeoutId = setTimeout(
                    () => controller.abort(),
                    timeout
                  );
                  try {
                    const fetchResponse = await fetch(url, {
                      method: "GET",
                      headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
                      },
                      signal: controller.signal
                    });
                    clearTimeout(timeoutId);
                    if (!fetchResponse.ok) {
                      structuredLog.warn(
                        "proxy.fetch.failed",
                        `Failed to fetch ${url}`,
                        { status: fetchResponse.status }
                      );
                      res.statusCode = fetchResponse.status;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`
                        })
                      );
                      return;
                    }
                    const data = await fetchResponse.text();
                    structuredLog.success(
                      "proxy.fetch.completed",
                      `Fetched ${url}`,
                      { size: data.length }
                    );
                    res.setHeader(
                      "Content-Type",
                      fetchResponse.headers.get("content-type") || "text/plain; charset=utf-8"
                    );
                    res.end(data);
                  } catch (fetchError) {
                    clearTimeout(timeoutId);
                    const isTimeout = fetchError.name === "AbortError" || fetchError.message?.includes("timeout");
                    const errorMsg = isTimeout ? `\u8BF7\u6C42\u8D85\u65F6 (${timeout}ms)` : `\u8BF7\u6C42\u5931\u8D25: ${fetchError.message}`;
                    structuredLog.error(
                      "proxy.fetch.error",
                      `Error fetching ${url}`,
                      {
                        error: fetchError.message,
                        isTimeout
                      }
                    );
                    res.statusCode = isTimeout ? 504 : 502;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: errorMsg,
                        details: {
                          url,
                          hostname: targetUrl.hostname,
                          isTimeout
                        }
                      })
                    );
                  }
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/mcp/tools", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const { mcpManager } = await import("./theme/components/ai-chat/core/mcp/index");
                const tools = mcpManager.getAllTools();
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: tools }));
              } catch (e) {
                res.statusCode = 500;
                res.end(
                  JSON.stringify({
                    success: false,
                    error: e instanceof Error ? e.message : String(e)
                  })
                );
              }
            } else next();
          });
          server.middlewares.use("/api/mcp/execute", async (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { serverId, toolName, args = {} } = body;
                  const { mcpManager } = await import("./theme/components/ai-chat/core/mcp/index");
                  const result = await mcpManager.execute(
                    serverId,
                    toolName,
                    args
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: result }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: e instanceof Error ? e.message : String(e)
                    })
                  );
                }
              });
            } else next();
          });
          server.middlewares.use(
            "/api/github/repo/",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const url = req.url || "";
                  const cleanUrl = url.split("?")[0].replace(/^\//, "");
                  const parts = cleanUrl.split("/").filter(Boolean);
                  structuredLog.info("github.repo.request", `Request: ${url}`, {
                    cleanUrl,
                    parts
                  });
                  if (parts.length < 2) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Missing owner or repo"
                      })
                    );
                    return;
                  }
                  const [owner, repo] = parts;
                  const response = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}`,
                    {
                      headers: {
                        "User-Agent": "MetaBlog-ToolTester/1.0",
                        Accept: "application/vnd.github.v3+json"
                      }
                    }
                  );
                  if (!response.ok) {
                    res.statusCode = response.status;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: `GitHub API error: ${response.status}`
                      })
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
                      error: e instanceof Error ? e.message : String(e)
                    })
                  );
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/github/file/",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const url = req.url || "";
                  const cleanUrl = url.split("?")[0].replace(/^\//, "");
                  const parts = cleanUrl.split("/").filter(Boolean);
                  structuredLog.info("github.file.request", `Request: ${url}`, {
                    cleanUrl,
                    parts
                  });
                  if (parts.length < 4) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Missing owner, repo, ref or path"
                      })
                    );
                    return;
                  }
                  const [owner, repo, ref, ...pathParts] = parts;
                  const path2 = pathParts.join("/");
                  const response = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path2}?ref=${ref}`,
                    {
                      headers: {
                        "User-Agent": "MetaBlog-ToolTester/1.0",
                        Accept: "application/vnd.github.v3+json"
                      }
                    }
                  );
                  if (!response.ok) {
                    res.statusCode = response.status;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: `GitHub API error: ${response.status}`
                      })
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
                      error: e instanceof Error ? e.message : String(e)
                    })
                  );
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/github/commits/",
            async (req, res, next) => {
              if (req.method === "GET") {
                try {
                  const url = req.url || "";
                  const cleanUrl = url.split("?")[0].replace(/^\//, "");
                  const parts = cleanUrl.split("/").filter(Boolean);
                  structuredLog.info(
                    "github.commits.request",
                    `Request: ${url}`,
                    { cleanUrl, parts }
                  );
                  if (parts.length < 2) {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Missing owner or repo"
                      })
                    );
                    return;
                  }
                  const [owner, repo, ref = "main"] = parts;
                  const per_page = new URL(url, `http://localhost`).searchParams.get(
                    "per_page"
                  ) || "5";
                  const response = await fetch(
                    `https://api.github.com/repos/${owner}/${repo}/commits?sha=${ref}&per_page=${per_page}`,
                    {
                      headers: {
                        "User-Agent": "MetaBlog-ToolTester/1.0",
                        Accept: "application/vnd.github.v3+json"
                      }
                    }
                  );
                  if (!response.ok) {
                    res.statusCode = response.status;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: `GitHub API error: ${response.status}`
                      })
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
                      error: e instanceof Error ? e.message : String(e)
                    })
                  );
                }
              } else next();
            }
          );
          const MOCK_TASK_TEMPLATES = [
            {
              id: "sync-knowledge",
              name: "\u540C\u6B65\u77E5\u8BC6\u5E93",
              description: "\u4ECE\u5916\u90E8\u6E90\u540C\u6B65\u77E5\u8BC6\u5E93\u5185\u5BB9",
              icon: "\u{1F504}",
              category: "system",
              params: [
                {
                  name: "source",
                  type: "string",
                  required: true,
                  description: "\u6570\u636E\u6E90 URL"
                },
                {
                  name: "force",
                  type: "boolean",
                  required: false,
                  description: "\u5F3A\u5236\u540C\u6B65"
                }
              ]
            },
            {
              id: "generate-index",
              name: "\u751F\u6210\u7D22\u5F15",
              description: "\u4E3A\u77E5\u8BC6\u5E93\u751F\u6210\u641C\u7D22\u7D22\u5F15",
              icon: "\u{1F4C7}",
              category: "system",
              params: [
                {
                  name: "sections",
                  type: "array",
                  required: false,
                  description: "\u6307\u5B9A\u7AE0\u8282"
                }
              ]
            },
            {
              id: "backup-data",
              name: "\u5907\u4EFD\u6570\u636E",
              description: "\u5907\u4EFD\u6240\u6709\u6570\u636E\u5230\u6307\u5B9A\u4F4D\u7F6E",
              icon: "\u{1F4BE}",
              category: "maintenance",
              params: [
                {
                  name: "destination",
                  type: "string",
                  required: true,
                  description: "\u5907\u4EFD\u76EE\u6807\u8DEF\u5F84"
                }
              ]
            },
            {
              id: "clean-cache",
              name: "\u6E05\u7406\u7F13\u5B58",
              description: "\u6E05\u7406\u8FC7\u671F\u7F13\u5B58\u6587\u4EF6",
              icon: "\u{1F9F9}",
              category: "maintenance",
              params: []
            }
          ];
          server.middlewares.use(
            "/api/agent/tasks/templates",
            (req, res, next) => {
              if (req.method === "GET") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: MOCK_TASK_TEMPLATES,
                    message: "Task system not available - returning mock data"
                  })
                );
              } else next();
            }
          );
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
                      createdAt: (/* @__PURE__ */ new Date()).toISOString()
                    }
                  })
                );
              } else next();
            }
          );
          server.middlewares.use(
            "/api/agent/tasks/trigger-batch",
            (req, res, next) => {
              if (req.method === "POST") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available",
                    data: []
                  })
                );
              } else next();
            }
          );
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
                    cancelled: 0
                  }
                })
              );
            } else next();
          });
          server.middlewares.use(
            "/api/agent/tasks/detail",
            (req, res, next) => {
              if (req.method === "GET") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available",
                    data: null
                  })
                );
              } else next();
            }
          );
          server.middlewares.use(
            "/api/agent/tasks/cancel",
            (req, res, next) => {
              if (req.method === "POST") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available - no task to cancel"
                  })
                );
              } else next();
            }
          );
          server.middlewares.use("/api/agent/tasks/retry", (req, res, next) => {
            if (req.method === "POST") {
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  message: "Task system not available",
                  data: null
                })
              );
            } else next();
          });
          server.middlewares.use(
            "/api/agent/tasks/delete",
            (req, res, next) => {
              if (req.method === "POST") {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "Task system not available - no task to delete"
                  })
                );
              } else next();
            }
          );
          server.middlewares.use("/api/chat", async (req, res, next) => {
            if (req.method !== "POST") return next();
            const chunks = [];
            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { messages, model, temperature, maxTokens, stream } = body;
                console.log("[API Chat] Request received:", {
                  model,
                  messages: messages?.length,
                  stream
                });
                const llm = {
                  chat: async () => ({ content: "Not Implemented" }),
                  chatStream: async (opts, cb) => cb({ finishReason: "unsupported" })
                };
                if (stream === false) {
                  console.log("[API Chat] Non-streaming request");
                  const response = await llm.chat({
                    messages,
                    model,
                    temperature,
                    maxTokens
                  });
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        content: response.content,
                        model: response.model,
                        usage: response.usage
                      }
                    })
                  );
                  return;
                }
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
                      signal: abortController.signal
                    },
                    (chunk) => {
                      if (isEnded) return;
                      chunkCount++;
                      if (chunkCount <= 3 || chunk.finishReason) {
                        console.log(`[API Chat] Chunk ${chunkCount}:`, {
                          content: chunk.content?.substring(0, 50),
                          finishReason: chunk.finishReason
                        });
                      }
                      const data = {
                        content: chunk.content,
                        reasoning: chunk.reasoning,
                        isReasoning: !!chunk.reasoning
                      };
                      if (chunk.finishReason) {
                        data.finishReason = chunk.finishReason;
                        data.usage = chunk.usage;
                      }
                      res.write(`data: ${JSON.stringify(data)}

`);
                      if (chunk.finishReason) {
                        res.write("data: [DONE]\n\n");
                        res.end();
                        isEnded = true;
                        console.log(
                          "[API Chat] Stream finished, total chunks:",
                          chunkCount
                        );
                      }
                    }
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
                      error: error instanceof Error ? error.message : "Chat failed"
                    })
                  );
                } else {
                  res.write(
                    `data: ${JSON.stringify({ error: String(error) })}

`
                  );
                  res.end();
                }
              }
            });
          });
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
                    git: false
                  }
                })
              );
            } else next();
          });
          server.middlewares.use("/api/system/resources", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  data: {
                    memory: Math.floor(35 + Math.random() * 30),
                    cpu: Math.floor(20 + Math.random() * 40),
                    latency: Math.floor(30 + Math.random() * 50)
                  }
                })
              );
            } else next();
          });
          const AGENTS_FILE = path.join(process.cwd(), ".data", "agents.json");
          if (!fs.existsSync(path.dirname(AGENTS_FILE))) {
            fs.mkdirSync(path.dirname(AGENTS_FILE), { recursive: true });
          }
          function readAgents() {
            try {
              if (fs.existsSync(AGENTS_FILE)) {
                const data = fs.readFileSync(AGENTS_FILE, "utf-8");
                const agents = JSON.parse(data);
                return agents.map((agent) => ({
                  ...agent,
                  capabilities: agent.capabilities || {
                    mode: "raw",
                    skillIds: [],
                    toolIds: [],
                    customSystemPrompt: "\u4F60\u662F\u4E00\u4E2A helpful \u7684 AI \u52A9\u624B\u3002"
                  },
                  memory: agent.memory || {
                    enabled: true,
                    content: "",
                    autoExtract: true,
                    maxTokens: 2e3
                  },
                  permissions: agent.permissions || [],
                  callCount: agent.callCount || 0,
                  isDefault: agent.isDefault || false,
                  status: agent.status || "online",
                  seat: agent.seat || 1,
                  lastActiveAt: agent.lastActiveAt || Date.now()
                }));
              }
            } catch (e) {
              console.error("[API] Failed to read agents:", e);
            }
            return [];
          }
          function writeAgents(agents) {
            try {
              fs.writeFileSync(
                AGENTS_FILE,
                JSON.stringify(agents, null, 2),
                "utf-8"
              );
            } catch (e) {
              console.error("[API] Failed to write agents:", e);
            }
          }
          function initializeDefaultAgent() {
            const agents = readAgents();
            if (agents.length === 0) {
              const defaultAgent = {
                id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: "Meta \u52A9\u624B",
                avatar: "\u{1F916}",
                description: "\u57FA\u4E8E DeepSeek \u5927\u6A21\u578B\u7684\u901A\u7528 AI \u52A9\u624B\uFF0C\u4E3A\u60A8\u63D0\u4F9B\u4E13\u4E1A\u667A\u80FD\u5BF9\u8BDD\u4F53\u9A8C",
                level: "meta",
                status: "online",
                seat: 1,
                capabilities: {
                  mode: "raw",
                  skillIds: [],
                  toolIds: [],
                  customSystemPrompt: "\u4F60\u662F\u4E00\u4E2A helpful \u7684 AI \u52A9\u624B\uFF0C\u64C5\u957F\u56DE\u7B54\u95EE\u9898\u3001\u63D0\u4F9B\u5EFA\u8BAE\u548C\u534F\u52A9\u5B8C\u6210\u5404\u79CD\u4EFB\u52A1\u3002"
                },
                memory: {
                  enabled: true,
                  content: "",
                  autoExtract: true,
                  maxTokens: 2e3
                },
                permissions: [],
                callCount: 0,
                isDefault: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastActiveAt: Date.now()
              };
              writeAgents([defaultAgent]);
              console.log("[API] Initialized default agent");
            }
          }
          initializeDefaultAgent();
          server.middlewares.use("/api/agents", (req, res, next) => {
            const url = req.url || "";
            if (url !== "/" && url !== "" && !url.startsWith("?")) {
              return next();
            }
            if (req.method === "GET") {
              const agents = readAgents();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: agents }));
            } else if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const agents = readAgents();
                  const newAgent = {
                    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    name: body.name || "New Agent",
                    avatar: body.avatar || "\u{1F916}",
                    description: body.description || "A helpful AI agent",
                    level: body.level || "custom",
                    status: "online",
                    seat: 1,
                    capabilities: body.capabilities || {
                      mode: "raw",
                      skillIds: [],
                      toolIds: [],
                      customSystemPrompt: "\u4F60\u662F\u4E00\u4E2A helpful \u7684 AI \u52A9\u624B\u3002"
                    },
                    memory: body.memory || {
                      enabled: true,
                      content: "",
                      autoExtract: true,
                      maxTokens: 2e3
                    },
                    permissions: [],
                    callCount: 0,
                    isDefault: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    lastActiveAt: Date.now()
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
          server.middlewares.use("/api/agents/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;
                  const agents = readAgents();
                  const index = agents.findIndex((a) => a.id === id);
                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Agent not found"
                      })
                    );
                    return;
                  }
                  agents[index] = {
                    ...agents[index],
                    ...updates,
                    updatedAt: Date.now()
                  };
                  writeAgents(agents);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: agents[index] })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/agents/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;
                  let agents = readAgents();
                  agents = agents.filter((a) => a.id !== id);
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
          server.middlewares.use("/api/agents/trigger", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { agentId, triggerId } = body;
                  let agents = readAgents();
                  const agent = agents.find((a) => a.id === agentId);
                  if (!agent) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Agent not found"
                      })
                    );
                    return;
                  }
                  if (agent.triggers) {
                    const trigger = agent.triggers.find(
                      (t) => t.id === triggerId
                    );
                    if (trigger) {
                      trigger.lastTriggered = (/* @__PURE__ */ new Date()).toISOString();
                      trigger.triggerCount = (trigger.triggerCount || 0) + 1;
                    }
                  }
                  agent.totalRuns = (agent.totalRuns || 0) + 1;
                  agent.lastRunAt = Date.now();
                  agent.status = "running";
                  agent.updatedAt = Date.now();
                  writeAgents(agents);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: { agent, triggered: true }
                    })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/agents/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 1 || parts[0] === "active" || req.method !== "GET")
              return next();
            const id = parts[0].split("?")[0];
            try {
              const agents = readAgents();
              const agent = agents.find((a) => a.id === id);
              if (!agent) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Agent not found" })
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
          const ACTIVE_AGENT_FILE = path.join(
            process.cwd(),
            ".data",
            "active-agent.json"
          );
          server.middlewares.use("/api/agents/active", (req, res, next) => {
            if (req.method === "GET") {
              try {
                let activeId = null;
                if (fs.existsSync(ACTIVE_AGENT_FILE)) {
                  const data = JSON.parse(
                    fs.readFileSync(ACTIVE_AGENT_FILE, "utf-8")
                  );
                  activeId = data.id;
                }
                if (!activeId) {
                  const agents = readAgents();
                  activeId = agents[0]?.id || null;
                }
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: { id: activeId } })
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;
                  fs.writeFileSync(
                    ACTIVE_AGENT_FILE,
                    JSON.stringify({ id, updatedAt: Date.now() }),
                    "utf-8"
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
          const SKILLS_FILE = path.join(process.cwd(), ".data", "skills.json");
          if (!fs.existsSync(path.dirname(SKILLS_FILE))) {
            fs.mkdirSync(path.dirname(SKILLS_FILE), { recursive: true });
          }
          const SKILLS_DIR = path.join(process.cwd(), ".skills");
          function ensureSkillsDir() {
            if (!fs.existsSync(SKILLS_DIR)) {
              fs.mkdirSync(SKILLS_DIR, { recursive: true });
            }
          }
          function parseSkillMd(content, skillId, dirName) {
            const lines = content.split("\n");
            const skill = {
              id: skillId,
              name: dirName.replace(/-/g, " "),
              icon: "\u{1F527}",
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
              author: "user"
            };
            let section = "";
            let promptLines = [];
            let inPrompt = false;
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.startsWith("# ") && !line.startsWith("## ")) {
                skill.name = line.substring(2).trim();
                continue;
              }
              if (line.startsWith("## ")) {
                section = line.substring(3).trim().toLowerCase();
                inPrompt = false;
                continue;
              }
              if (section === "\u5143\u6570\u636E" || section === "metadata") {
                if (line.startsWith("- **")) {
                  const match = line.match(/- \*\*(\w+)\*\*:\s*`?(.+?)`?$/);
                  if (match) {
                    const [, key, value] = match;
                    switch (key.toLowerCase()) {
                      case "id":
                        skill.id = value;
                        break;
                      case "\u56FE\u6807":
                      case "icon":
                        skill.icon = value;
                        break;
                      case "\u5206\u7C7B":
                      case "category":
                        skill.category = value;
                        break;
                      case "\u7248\u672C":
                      case "version":
                        skill.version = value;
                        break;
                      case "\u6807\u7B7E":
                      case "tags":
                        skill.tags = value.split(",").map((t) => t.trim());
                        break;
                      case "\u4F5C\u8005":
                      case "author":
                        skill.author = value;
                        break;
                      case "\u5185\u7F6E":
                      case "built-in":
                        skill.isBuiltIn = value === "true";
                        break;
                      case "\u542F\u7528":
                      case "enabled":
                        skill.enabled = value !== "false";
                        break;
                    }
                  }
                }
              }
              if (section === "\u63CF\u8FF0" || section === "description") {
                if (line.trim() && !line.startsWith("-")) {
                  skill.description = line.trim();
                }
              }
              if (section === "\u4F7F\u7528\u573A\u666F" || section === "usage scenarios" || section === "usagescenarios") {
                if (line.startsWith("- ")) {
                  skill.usageScenarios.push(line.substring(2).trim());
                }
              }
              if (section === "\u53EF\u7528\u5DE5\u5177" || section === "tools") {
                if (line.startsWith("- ")) {
                  skill.tools.push(line.substring(2).trim());
                }
              }
              if (section === "prompt" || line.startsWith("---") && section) {
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
          function generateSkillMd(skill) {
            const usageScenarios = skill.usageScenarios || [];
            return `# ${skill.name}

## \u63CF\u8FF0
${skill.description || ""}

## \u5143\u6570\u636E
- **ID**: \`${skill.id}\`
- **\u56FE\u6807**: ${skill.icon || "\u{1F527}"}
- **\u5206\u7C7B**: ${skill.category || "custom"}
- **\u7248\u672C**: ${skill.version || "1.0.0"}
- **\u6807\u7B7E**: ${(skill.tags || []).join(", ")}
- **\u4F5C\u8005**: ${skill.author || ""}
- **\u5185\u7F6E**: ${skill.isBuiltIn || false}
- **\u542F\u7528**: ${skill.enabled ?? true}

## \u4F7F\u7528\u573A\u666F
${usageScenarios.map((s) => `- ${s}`).join("\n") || "- \u6682\u65E0\u4F7F\u7528\u573A\u666F"}

## \u53EF\u7528\u5DE5\u5177
${(skill.tools || []).map((t) => `- ${t}`).join("\n") || "- \u6682\u65E0\u5DE5\u5177"}

---

## Prompt

${skill.content || skill.systemPrompt || ""}
`;
          }
          function readSkills() {
            ensureSkillsDir();
            const skills = [];
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
          function writeSkill(skill) {
            ensureSkillsDir();
            const dirName = skill.id || skill.name.toLowerCase().replace(/\s+/g, "-");
            const skillDir = path.join(SKILLS_DIR, dirName);
            if (!fs.existsSync(skillDir)) {
              fs.mkdirSync(skillDir, { recursive: true });
            }
            const skillFile = path.join(skillDir, "SKILL.md");
            const content = generateSkillMd(skill);
            fs.writeFileSync(skillFile, content, "utf-8");
          }
          function deleteSkillDir(skillId) {
            const skillDir = path.join(SKILLS_DIR, skillId);
            if (fs.existsSync(skillDir)) {
              fs.rmSync(skillDir, { recursive: true, force: true });
              return true;
            }
            return false;
          }
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
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const newSkill = {
                    id: body.id || `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    ...body,
                    // 字段映射：支持 content 和 systemPrompt 两种字段名
                    systemPrompt: body.content || body.systemPrompt || "",
                    usageScenarios: body.usageScenarios || [],
                    isBuiltIn: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
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
          server.middlewares.use("/api/skills/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 1 || ["update", "delete"].includes(parts[0]) || req.method !== "GET") {
              return next();
            }
            const id = parts[0].split("?")[0];
            try {
              const skills = readSkills();
              const skill = skills.find((s) => s.id === id);
              if (!skill) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Skill not found" })
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
          server.middlewares.use("/api/skills/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;
                  const skills = readSkills();
                  const index = skills.findIndex((s) => s.id === id);
                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Skill not found"
                      })
                    );
                    return;
                  }
                  delete updates.isBuiltIn;
                  delete updates.id;
                  if (updates.content !== void 0) {
                    updates.systemPrompt = updates.content;
                  }
                  if (updates.usageScenarios === void 0) {
                    updates.usageScenarios = skills[index].usageScenarios || [];
                  }
                  const updatedSkill = {
                    ...skills[index],
                    ...updates,
                    updatedAt: Date.now()
                  };
                  writeSkill(updatedSkill);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: updatedSkill })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/skills/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;
                  const skills = readSkills();
                  const skill = skills.find((s) => s.id === id);
                  if (skill && skill.isBuiltIn) {
                    res.statusCode = 403;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Cannot delete built-in skill"
                      })
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
          const MEMORIES_FILE = path.join(
            process.cwd(),
            ".data",
            "memories.json"
          );
          function readMemories() {
            try {
              if (fs.existsSync(MEMORIES_FILE)) {
                return JSON.parse(fs.readFileSync(MEMORIES_FILE, "utf-8"));
              }
            } catch (e) {
              console.error("[API] Failed to read memories:", e);
            }
            return [];
          }
          function writeMemories(memories) {
            try {
              fs.writeFileSync(
                MEMORIES_FILE,
                JSON.stringify(memories, null, 2),
                "utf-8"
              );
            } catch (e) {
              console.error("[API] Failed to write memories:", e);
            }
          }
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
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const memories = readMemories();
                  const newMemory = {
                    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    enabled: true,
                    ...body,
                    createdAt: Date.now(),
                    updatedAt: Date.now()
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
          server.middlewares.use("/api/memories/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            const reservedPaths = [
              "update",
              "delete",
              "search",
              "stats",
              "clear"
            ];
            if (parts.length !== 1 || reservedPaths.includes(parts[0]) || req.method !== "GET") {
              return next();
            }
            const id = parts[0].split("?")[0];
            try {
              const memories = readMemories();
              const memory = memories.find((m) => m.id === id);
              if (!memory) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Memory not found" })
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
          server.middlewares.use("/api/memories/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;
                  const memories = readMemories();
                  const index = memories.findIndex((m) => m.id === id);
                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Memory not found"
                      })
                    );
                    return;
                  }
                  memories[index] = {
                    ...memories[index],
                    ...updates,
                    updatedAt: Date.now()
                  };
                  writeMemories(memories);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: memories[index] })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/memories/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;
                  let memories = readMemories();
                  memories = memories.filter((m) => m.id !== id);
                  writeMemories(memories);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: { id, deleted: true }
                    })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/memories/search", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { query, category, minImportance, limit = 50 } = body;
                  let memories = readMemories();
                  if (category) {
                    memories = memories.filter(
                      (m) => m.category === category
                    );
                  }
                  if (minImportance !== void 0) {
                    memories = memories.filter(
                      (m) => m.importance >= minImportance
                    );
                  }
                  if (query) {
                    const q = query.toLowerCase();
                    memories = memories.filter(
                      (m) => m.content.toLowerCase().includes(q)
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
          server.middlewares.use("/api/memories/stats", (req, res, next) => {
            if (req.method === "GET") {
              try {
                const memories = readMemories();
                const byCategory = {};
                memories.forEach((m) => {
                  byCategory[m.category] = (byCategory[m.category] || 0) + 1;
                });
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    data: {
                      total: memories.length,
                      enabled: memories.filter((m) => m.enabled).length,
                      byCategory
                    }
                  })
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          server.middlewares.use("/api/memories/clear", (req, res, next) => {
            if (req.method === "POST") {
              try {
                writeMemories([]);
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: { cleared: true } })
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          const MCP_SERVERS_FILE = path.join(
            process.cwd(),
            ".data",
            "mcp-servers.json"
          );
          function readMCPServers() {
            try {
              if (fs.existsSync(MCP_SERVERS_FILE)) {
                return JSON.parse(fs.readFileSync(MCP_SERVERS_FILE, "utf-8"));
              }
            } catch (e) {
              console.error("[API] Failed to read MCP servers:", e);
            }
            return [];
          }
          function writeMCPServers(servers) {
            try {
              fs.writeFileSync(
                MCP_SERVERS_FILE,
                JSON.stringify(servers, null, 2),
                "utf-8"
              );
            } catch (e) {
              console.error("[API] Failed to write MCP servers:", e);
            }
          }
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
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const servers = readMCPServers();
                  const serverId = body.id || `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                  const newServer = {
                    id: serverId,
                    config: { ...body, id: serverId },
                    status: "disconnected",
                    tools: [],
                    resources: [],
                    prompts: [],
                    connectAttempts: 0
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
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            const reservedPaths = [
              "update",
              "delete",
              "connect",
              "disconnect",
              "tools"
            ];
            if (parts.length !== 1 || reservedPaths.includes(parts[0]) || req.method !== "GET") {
              return next();
            }
            const id = parts[0].split("?")[0];
            try {
              const servers = readMCPServers();
              const server2 = servers.find((s) => s.id === id);
              if (!server2) {
                res.statusCode = 404;
                res.end(
                  JSON.stringify({ success: false, error: "Server not found" })
                );
                return;
              }
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: server2 }));
            } catch (e) {
              res.statusCode = 500;
              res.end(JSON.stringify({ success: false, error: String(e) }));
            }
          });
          server.middlewares.use(
            "/api/mcp/servers/update",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks = [];
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
                          error: "Server ID required"
                        })
                      );
                      return;
                    }
                    const servers = readMCPServers();
                    const index = servers.findIndex((s) => s.id === id);
                    if (index === -1) {
                      res.statusCode = 404;
                      res.end(
                        JSON.stringify({
                          success: false,
                          error: "Server not found"
                        })
                      );
                      return;
                    }
                    servers[index] = {
                      ...servers[index],
                      config: { ...servers[index].config, ...configUpdates },
                      updatedAt: Date.now()
                    };
                    writeMCPServers(servers);
                    res.setHeader("Content-Type", "application/json");
                    res.end(
                      JSON.stringify({ success: true, data: servers[index] })
                    );
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({ success: false, error: String(e) })
                    );
                  }
                });
              } else next();
            }
          );
          server.middlewares.use(
            "/api/mcp/servers/delete",
            (req, res, next) => {
              if (req.method === "POST") {
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { id } = body;
                    let servers = readMCPServers();
                    servers = servers.filter((s) => s.id !== id);
                    writeMCPServers(servers);
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ success: true }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(
                      JSON.stringify({ success: false, error: String(e) })
                    );
                  }
                });
              } else next();
            }
          );
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 2 || parts[1] !== "connect") return next();
            const id = parts[0].split("?")[0];
            if (req.method === "POST") {
              try {
                const servers = readMCPServers();
                const index = servers.findIndex((s) => s.id === id);
                if (index === -1) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "MCP server not found"
                    })
                  );
                  return;
                }
                servers[index].status = "connected";
                servers[index].lastConnectedAt = Date.now();
                writeMCPServers(servers);
                console.log(
                  `[API] MCP server connected: ${servers[index].name}`
                );
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: servers[index] })
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 2 || parts[1] !== "disconnect") return next();
            const id = parts[0].split("?")[0];
            if (req.method === "POST") {
              try {
                const servers = readMCPServers();
                const index = servers.findIndex((s) => s.id === id);
                if (index === -1) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "MCP server not found"
                    })
                  );
                  return;
                }
                servers[index].status = "disconnected";
                writeMCPServers(servers);
                console.log(
                  `[API] MCP server disconnected: ${servers[index].name}`
                );
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: servers[index] })
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 4 || parts[1] !== "tools" || parts[3] !== "execute")
              return next();
            const id = parts[0].split("?")[0];
            const toolName = parts[2];
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const args = JSON.parse(Buffer.concat(chunks).toString());
                  const servers = readMCPServers();
                  const server2 = servers.find((s) => s.id === id);
                  if (!server2) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "MCP server not found"
                      })
                    );
                    return;
                  }
                  if (server2.status !== "connected") {
                    res.statusCode = 400;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "MCP server not connected"
                      })
                    );
                    return;
                  }
                  const tool = server2.tools?.find(
                    (t) => t.name === toolName
                  );
                  if (!tool) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: `Tool '${toolName}' not found`
                      })
                    );
                    return;
                  }
                  console.log(
                    `[API] Executing MCP tool: ${server2.name}/${toolName}`,
                    args
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({
                      success: true,
                      data: {
                        success: true,
                        result: JSON.stringify({
                          executed: true,
                          tool: toolName,
                          args
                        })
                      }
                    })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          const SESSIONS_FILE = path.join(
            process.cwd(),
            ".data",
            "sessions.json"
          );
          const SESSION_MESSAGES_FILE = path.join(
            process.cwd(),
            ".data",
            "session-messages.json"
          );
          function readSessions() {
            try {
              if (fs.existsSync(SESSIONS_FILE)) {
                return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
              }
            } catch (e) {
              console.error("[API] Failed to read sessions:", e);
            }
            return [];
          }
          function writeSessions(sessions) {
            try {
              fs.writeFileSync(
                SESSIONS_FILE,
                JSON.stringify(sessions, null, 2),
                "utf-8"
              );
            } catch (e) {
              console.error("[API] Failed to write sessions:", e);
            }
          }
          function readSessionMessages() {
            try {
              if (fs.existsSync(SESSION_MESSAGES_FILE)) {
                return JSON.parse(
                  fs.readFileSync(SESSION_MESSAGES_FILE, "utf-8")
                );
              }
            } catch (e) {
              console.error("[API] Failed to read session messages:", e);
            }
            return {};
          }
          function writeSessionMessages(messages) {
            try {
              fs.writeFileSync(
                SESSION_MESSAGES_FILE,
                JSON.stringify(messages, null, 2),
                "utf-8"
              );
            } catch (e) {
              console.error("[API] Failed to write session messages:", e);
            }
          }
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
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const sessions = readSessions();
                  const newSession = {
                    id: body.id || `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    title: body.title || "\u65B0\u5BF9\u8BDD",
                    config: {
                      model: "deepseek-chat",
                      temperature: 0.7,
                      maxTokens: 2048,
                      systemPrompt: "",
                      enableReasoning: false,
                      streaming: true,
                      ...body.config
                    },
                    stats: { messageCount: 0, totalTokens: 0, ...body.stats },
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                  };
                  sessions.unshift(newSession);
                  writeSessions(sessions);
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
          server.middlewares.use("/api/sessions/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 3 || parts[1] !== "messages" || parts[2] !== "batch")
              return next();
            const sessionId = parts[0];
            if (req.method === "POST") {
              const chunks = [];
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
          server.middlewares.use("/api/sessions/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 2 || parts[1] !== "messages") return next();
            const sessionId = parts[0];
            if (req.method === "GET") {
              try {
                const messages = readSessionMessages();
                const sessionMessages = messages[sessionId] || [];
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({ success: true, data: sessionMessages })
                );
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else if (req.method === "POST") {
              const chunks = [];
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
          server.middlewares.use("/api/sessions/", (req, res, next) => {
            const url = req.url || "";
            const parts = url.split("/").filter(Boolean);
            if (parts.length !== 1) return next();
            const id = parts[0].split("?")[0];
            if (req.method === "GET") {
              try {
                const sessions = readSessions();
                const session = sessions.find((s) => s.id === id);
                if (!session) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({
                      success: false,
                      error: "Session not found"
                    })
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
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const sessions = readSessions();
                  const index = sessions.findIndex((s) => s.id === id);
                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(
                      JSON.stringify({
                        success: false,
                        error: "Session not found"
                      })
                    );
                    return;
                  }
                  sessions[index] = {
                    ...sessions[index],
                    ...body,
                    updatedAt: Date.now()
                  };
                  writeSessions(sessions);
                  res.setHeader("Content-Type", "application/json");
                  res.end(
                    JSON.stringify({ success: true, data: sessions[index] })
                  );
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else if (req.method === "DELETE") {
              try {
                let sessions = readSessions();
                sessions = sessions.filter((s) => s.id !== id);
                writeSessions(sessions);
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
          const AGENT_CHAT_SESSIONS_FILE = path.join(
            process.cwd(),
            ".data",
            "agent-chat-sessions.json"
          );
          function readAgentChatSessions() {
            try {
              if (fs.existsSync(AGENT_CHAT_SESSIONS_FILE)) {
                return JSON.parse(
                  fs.readFileSync(AGENT_CHAT_SESSIONS_FILE, "utf-8")
                );
              }
            } catch (e) {
              console.error("[API] Failed to read agent chat sessions:", e);
            }
            return {};
          }
          function writeAgentChatSessions(sessions) {
            try {
              fs.writeFileSync(
                AGENT_CHAT_SESSIONS_FILE,
                JSON.stringify(sessions, null, 2),
                "utf-8"
              );
            } catch (e) {
              console.error("[API] Failed to write agent chat sessions:", e);
            }
          }
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
                      lastUpdated: messages.length > 0 ? messages[messages.length - 1].timestamp : 0
                    })
                  );
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: list }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              } else next();
            }
          );
          server.middlewares.use(
            "/api/agent-chat/sessions/",
            (req, res, next) => {
              const url = req.url || "";
              const parts = url.split("/").filter(Boolean);
              if (parts.length < 1 || parts.length > 2) return next();
              if (parts.length === 2 && parts[1] !== "messages") return next();
              const agentId = parts[0].split("?")[0];
              const isMessagesPath = parts.length === 2 && parts[1] === "messages";
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
              } else if (req.method === "POST" && isMessagesPath) {
                const chunks = [];
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
                      JSON.stringify({ success: false, error: String(e) })
                    );
                  }
                });
              } else if (req.method === "DELETE" && !isMessagesPath) {
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
            }
          );
        }
      }
    ],
    define: {
      VDITOR_VERSION: JSON.stringify("3.11.2")
    }
  },
  async transformPageData(pageData) {
    pageData.frontmatter.wordCount = getWordCount(pageData.content || "");
    const relativePath = pageData.relativePath;
    const parts = relativePath.split("/");
    const breadcrumbs = [];
    let accumulatedPath = "";
    for (let i = 0; i < parts.length; i++) {
      let part = parts[i];
      if (!part) continue;
      if (part.endsWith(".md")) {
        part = part.replace(".md", "");
      }
      if (part === "index") {
        continue;
      }
      accumulatedPath += "/" + part;
      const title = formatBreadcrumbName(part);
      const remainingParts = parts.slice(i + 1).filter((p) => p && p !== "index.md" && !p.endsWith(".md"));
      const isLastItem = remainingParts.length === 0;
      breadcrumbs.push({
        title,
        link: isLastItem ? void 0 : accumulatedPath + "/"
      });
    }
    pageData.frontmatter.breadcrumb = breadcrumbs;
    pageData.title = pageData.frontmatter.title || (breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].title : "");
  }
});
export {
  config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLnZpdGVwcmVzcy9jb25maWcudHMiLCAiLnZpdGVwcmVzcy91dGlscy9nbG9iYWwtc2lkZWJhci50cyIsICIudml0ZXByZXNzL3V0aWxzL2RvYy1zdHJ1Y3R1cmUudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxBTEwgSU4gQUlcXFxcTWV0YUJsb2dcXFxcLnZpdGVwcmVzc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcQUxMIElOIEFJXFxcXE1ldGFCbG9nXFxcXC52aXRlcHJlc3NcXFxcY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9BTEwlMjBJTiUyMEFJL01ldGFCbG9nLy52aXRlcHJlc3MvY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVwcmVzc1wiO1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tIFwibm9kZTp1cmxcIjtcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IGZzIGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gXCJjaGlsZF9wcm9jZXNzXCI7XHJcbmltcG9ydCBodHRwcyBmcm9tIFwiaHR0cHNcIjtcclxuaW1wb3J0IGh0dHAgZnJvbSBcImh0dHBcIjtcclxuaW1wb3J0IE1hcmtkb3duSXQgZnJvbSBcIm1hcmtkb3duLWl0XCI7XHJcbmltcG9ydCBtYXRoamF4MyBmcm9tIFwibWFya2Rvd24taXQtbWF0aGpheDNcIjtcclxuXHJcbi8vIFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVxyXG5jb25zdCBEQVRBX0RJUiA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcIi5kYXRhXCIpO1xyXG5cclxuLy8gXHU1MkEwXHU4RjdEIC5lbnYgXHU2NTg3XHU0RUY2XHJcbmNvbnN0IGVudiA9IGxvYWRFbnYoXCJcIiwgcHJvY2Vzcy5jd2QoKSwgXCJWSVRFX1wiKTtcclxuY29uc3Qgc2VydmVyRW52ID0gbG9hZEVudihcIlwiLCBwcm9jZXNzLmN3ZCgpLCBcIkxMTV9cIik7XHJcblxyXG4vLyBcdTU0MDhcdTVFNzZcdTczQUZcdTU4ODNcdTUzRDhcdTkxQ0ZcdTUyMzAgcHJvY2Vzcy5lbnZcclxuT2JqZWN0LmFzc2lnbihwcm9jZXNzLmVudiwgZW52LCBzZXJ2ZXJFbnYpO1xyXG5pbXBvcnQge1xyXG4gIGdlbmVyYXRlU2VjdGlvblNpZGViYXIsXHJcbiAgY2xlYXJTaWRlYmFyQ2FjaGUsXHJcbn0gZnJvbSBcIi4vdXRpbHMvZ2xvYmFsLXNpZGViYXJcIjtcclxuaW1wb3J0IHtcclxuICBzY2FuRG9jU3RydWN0dXJlLFxyXG4gIHRvU2lkZWJhckZvcm1hdCxcclxuICB0b0RpcmVjdG9yeVRyZWUsXHJcbiAgRG9jTm9kZSxcclxufSBmcm9tIFwiLi91dGlscy9kb2Mtc3RydWN0dXJlXCI7XHJcbi8vIFx1N0I4MFx1NTMxNlx1NzY4NFx1NjVFNVx1NUZEN1x1N0NGQlx1N0VERlxyXG5jb25zdCBzeXN0ZW0gPSB7XHJcbiAgaW5mbzogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgZGF0YT86IGFueSkgPT5cclxuICAgIGNvbnNvbGUuaW5mbyhgW0lORk9dICR7ZXZlbnR9OiAke21lc3NhZ2V9YCwgZGF0YSB8fCBcIlwiKSxcclxuICBkZWJ1ZzogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgZGF0YT86IGFueSkgPT5cclxuICAgIGNvbnNvbGUuZGVidWcoYFtERUJVR10gJHtldmVudH06ICR7bWVzc2FnZX1gLCBkYXRhIHx8IFwiXCIpLFxyXG4gIHdhcm46IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGRhdGE/OiBhbnkpID0+XHJcbiAgICBjb25zb2xlLndhcm4oYFtXQVJOXSAke2V2ZW50fTogJHttZXNzYWdlfWAsIGRhdGEgfHwgXCJcIiksXHJcbiAgZXJyb3I6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGRhdGE/OiBhbnkpID0+XHJcbiAgICBjb25zb2xlLmVycm9yKGBbRVJST1JdICR7ZXZlbnR9OiAke21lc3NhZ2V9YCwgZGF0YSB8fCBcIlwiKSxcclxuICBzdWNjZXNzOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBkYXRhPzogYW55KSA9PlxyXG4gICAgY29uc29sZS5sb2coYFtTVUNDRVNTXSAke2V2ZW50fTogJHttZXNzYWdlfWAsIGRhdGEgfHwgXCJcIiksXHJcbn07XHJcblxyXG5jb25zdCBzdHJ1Y3R1cmVkTG9nID0ge1xyXG4gIGluZm86IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGRhdGE/OiBhbnkpID0+XHJcbiAgICBzeXN0ZW0uaW5mbyhldmVudCwgbWVzc2FnZSwgZGF0YSksXHJcbiAgZGVidWc6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGRhdGE/OiBhbnkpID0+XHJcbiAgICBzeXN0ZW0uZGVidWcoZXZlbnQsIG1lc3NhZ2UsIGRhdGEpLFxyXG4gIHdhcm46IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGRhdGE/OiBhbnkpID0+XHJcbiAgICBzeXN0ZW0ud2FybihldmVudCwgbWVzc2FnZSwgZGF0YSksXHJcbiAgZXJyb3I6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGRhdGE/OiBhbnkpID0+XHJcbiAgICBzeXN0ZW0uZXJyb3IoZXZlbnQsIG1lc3NhZ2UsIGRhdGEpLFxyXG4gIHN1Y2Nlc3M6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIGRhdGE/OiBhbnkpID0+XHJcbiAgICBzeXN0ZW0uc3VjY2VzcyhldmVudCwgbWVzc2FnZSwgZGF0YSksXHJcbiAgc3RhcnRSZXF1ZXN0OiAoKSA9PiB7fSxcclxuICBlbmRSZXF1ZXN0OiAoKSA9PiB7fSxcclxuICBsb2dBUElSZXF1ZXN0OiAoKSA9PiB7fSxcclxuICBsb2dGaWxlRXZlbnQ6ICgpID0+IHt9LFxyXG4gIGxvZ0ZpbGVPcGVyYXRpb246ICgpID0+IHt9LFxyXG4gIGxvZ1NraWxsRXhlY3V0aW9uOiAoKSA9PiB7fSxcclxuICBzdGFydExMTUNoYWluOiAoKSA9PiB7fSxcclxuICBlbmRMTE1DaGFpbjogKCkgPT4ge30sXHJcblxyXG4gIC8vIFx1ODNCN1x1NTNENlx1NjcwMFx1OEZEMVx1NjVFNVx1NUZEN1xyXG4gIGdldFJlY2VudExvZ3M6IGFzeW5jIChjb3VudDogbnVtYmVyID0gMTAwLCBsZXZlbD86IHN0cmluZykgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgTE9HU19ESVIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCIubG9nc1wiKTtcclxuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKExPR1NfRElSKSkgcmV0dXJuIFtdO1xyXG5cclxuICAgICAgY29uc3QgZmlsZXMgPSBmc1xyXG4gICAgICAgIC5yZWFkZGlyU3luYyhMT0dTX0RJUilcclxuICAgICAgICAuZmlsdGVyKChmKSA9PiBmLmVuZHNXaXRoKFwiLmpzb25sXCIpKTtcclxuICAgICAgbGV0IGFsbExvZ3M6IGFueVtdID0gW107XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcclxuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IHBhdGguam9pbihMT0dTX0RJUiwgZmlsZSk7XHJcbiAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgICAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xyXG4gICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgbG9nID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICAgICAgaWYgKCFsZXZlbCB8fCBsb2cubGV2ZWwgPT09IGxldmVsKSB7XHJcbiAgICAgICAgICAgICAgYWxsTG9ncy5wdXNoKGxvZyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgLy8gXHU4REYzXHU4RkM3XHU2NUUwXHU2NTQ4XHU4ODRDXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBcdTYzMDlcdTY1RjZcdTk1RjRcdTUwMTJcdTVFOEZcdTYzOTJcdTVFOEZcdTVFNzZcdTk2NTBcdTUyMzZcdTY1NzBcdTkxQ0ZcclxuICAgICAgYWxsTG9ncy5zb3J0KChhLCBiKSA9PiAoYi50aW1lc3RhbXAgfHwgMCkgLSAoYS50aW1lc3RhbXAgfHwgMCkpO1xyXG4gICAgICByZXR1cm4gYWxsTG9ncy5zbGljZSgwLCBjb3VudCk7XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbTG9nc10gRmFpbGVkIHRvIGdldCByZWNlbnQgbG9nczpcIiwgZSk7XHJcbiAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuICB9LFxyXG5cclxuICAvLyBcdTgzQjdcdTUzRDZcdTY1RTVcdTVGRDdcdTdFREZcdThCQTFcclxuICBnZXRTdGF0czogYXN5bmMgKCkgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgTE9HU19ESVIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCIubG9nc1wiKTtcclxuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKExPR1NfRElSKSkge1xyXG4gICAgICAgIHJldHVybiB7IHRvdGFsOiAwLCBieUxldmVsOiB7fSwgYnlDb21wb25lbnQ6IHt9IH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGZpbGVzID0gZnNcclxuICAgICAgICAucmVhZGRpclN5bmMoTE9HU19ESVIpXHJcbiAgICAgICAgLmZpbHRlcigoZikgPT4gZi5lbmRzV2l0aChcIi5qc29ubFwiKSk7XHJcbiAgICAgIGxldCB0b3RhbCA9IDA7XHJcbiAgICAgIGNvbnN0IGJ5TGV2ZWw6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuICAgICAgY29uc3QgYnlDb21wb25lbnQ6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7fTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlcykge1xyXG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKExPR1NfRElSLCBmaWxlKTtcclxuICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKS5maWx0ZXIoQm9vbGVhbik7XHJcbiAgICAgICAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XHJcbiAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBsb2cgPSBKU09OLnBhcnNlKGxpbmUpO1xyXG4gICAgICAgICAgICB0b3RhbCsrO1xyXG4gICAgICAgICAgICBieUxldmVsW2xvZy5sZXZlbF0gPSAoYnlMZXZlbFtsb2cubGV2ZWxdIHx8IDApICsgMTtcclxuICAgICAgICAgICAgYnlDb21wb25lbnRbbG9nLmNvbXBvbmVudCB8fCBcInVua25vd25cIl0gPVxyXG4gICAgICAgICAgICAgIChieUNvbXBvbmVudFtsb2cuY29tcG9uZW50IHx8IFwidW5rbm93blwiXSB8fCAwKSArIDE7XHJcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIC8vIFx1OERGM1x1OEZDN1x1NjVFMFx1NjU0OFx1ODg0Q1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHsgdG90YWwsIGJ5TGV2ZWwsIGJ5Q29tcG9uZW50IH07XHJcbiAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJbTG9nc10gRmFpbGVkIHRvIGdldCBzdGF0czpcIiwgZSk7XHJcbiAgICAgIHJldHVybiB7IHRvdGFsOiAwLCBieUxldmVsOiB7fSwgYnlDb21wb25lbnQ6IHt9IH07XHJcbiAgICB9XHJcbiAgfSxcclxuXHJcbiAgLy8gXHU2N0U1XHU4QkUyXHU2NUU1XHU1RkQ3XHVGRjA4XHU2NTJGXHU2MzAxXHU4RkM3XHU2RUU0XHVGRjA5XHJcbiAgcXVlcnlMb2dzOiBhc3luYyAoZmlsdGVyOiBhbnkpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IExPR1NfRElSID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwiLmxvZ3NcIik7XHJcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhMT0dTX0RJUikpIHJldHVybiBbXTtcclxuXHJcbiAgICAgIGNvbnN0IGZpbGVzID0gZnNcclxuICAgICAgICAucmVhZGRpclN5bmMoTE9HU19ESVIpXHJcbiAgICAgICAgLmZpbHRlcigoZikgPT4gZi5lbmRzV2l0aChcIi5qc29ubFwiKSk7XHJcbiAgICAgIGxldCBhbGxMb2dzOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oTE9HU19ESVIsIGZpbGUpO1xyXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsIFwidXRmLThcIik7XHJcbiAgICAgICAgY29uc3QgbGluZXMgPSBjb250ZW50LnNwbGl0KFwiXFxuXCIpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxvZyA9IEpTT04ucGFyc2UobGluZSk7XHJcbiAgICAgICAgICAgIC8vIFx1NUU5NFx1NzUyOFx1OEZDN1x1NkVFNFx1Njc2MVx1NEVGNlxyXG4gICAgICAgICAgICBpZiAoZmlsdGVyLmxldmVsICYmIGxvZy5sZXZlbCAhPT0gZmlsdGVyLmxldmVsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlci5jb21wb25lbnQgJiYgbG9nLmNvbXBvbmVudCAhPT0gZmlsdGVyLmNvbXBvbmVudClcclxuICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgaWYgKGZpbHRlci5ldmVudCAmJiBsb2cuZXZlbnQgIT09IGZpbHRlci5ldmVudCkgY29udGludWU7XHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICBmaWx0ZXIua2V5d29yZCAmJlxyXG4gICAgICAgICAgICAgICFKU09OLnN0cmluZ2lmeShsb2cpXHJcbiAgICAgICAgICAgICAgICAudG9Mb3dlckNhc2UoKVxyXG4gICAgICAgICAgICAgICAgLmluY2x1ZGVzKGZpbHRlci5rZXl3b3JkLnRvTG93ZXJDYXNlKCkpXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICBjb250aW51ZTtcclxuICAgICAgICAgICAgYWxsTG9ncy5wdXNoKGxvZyk7XHJcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIC8vIFx1OERGM1x1OEZDN1x1NjVFMFx1NjU0OFx1ODg0Q1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgYWxsTG9ncy5zb3J0KChhLCBiKSA9PiAoYi50aW1lc3RhbXAgfHwgMCkgLSAoYS50aW1lc3RhbXAgfHwgMCkpO1xyXG4gICAgICByZXR1cm4gYWxsTG9ncztcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihcIltMb2dzXSBGYWlsZWQgdG8gcXVlcnkgbG9nczpcIiwgZSk7XHJcbiAgICAgIHJldHVybiBbXTtcclxuICAgIH1cclxuICB9LFxyXG59O1xyXG5cclxuLy8gSGVscGVyIHRvIGNhbGN1bGF0ZSB3b3JkIGNvdW50XHJcbmNvbnN0IGdldFdvcmRDb3VudCA9IChjb250ZW50OiBzdHJpbmcpID0+IHtcclxuICByZXR1cm4gY29udGVudC5zcGxpdCgvXFxzKy9nKS5sZW5ndGg7XHJcbn07XHJcblxyXG4vKipcclxuICogR2l0IG9wZXJhdGlvbnMgaGVscGVyXHJcbiAqL1xyXG5mdW5jdGlvbiBnaXRDb21taXQoZmlsZXM6IHN0cmluZyB8IHN0cmluZ1tdLCBtZXNzYWdlOiBzdHJpbmcpIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgZmlsZUxpc3QgPSBBcnJheS5pc0FycmF5KGZpbGVzKSA/IGZpbGVzIDogW2ZpbGVzXTtcclxuICAgIGV4ZWNTeW5jKGBnaXQgYWRkICR7ZmlsZUxpc3QubWFwKChmKSA9PiBgXCIke2Z9XCJgKS5qb2luKFwiIFwiKX1gKTtcclxuICAgIGV4ZWNTeW5jKGBnaXQgY29tbWl0IC1tIFwiJHttZXNzYWdlfVwiYCk7XHJcbiAgfSBjYXRjaCAoZSkge1xyXG4gICAgLy8gR2l0XHU2NENEXHU0RjVDXHU1OTMxXHU4RDI1XHU0RTBEXHU5NjNCXHU2NUFEXHU0RTNCXHU2RDQxXHU3QTBCXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogRm9ybWF0IGEgbmFtZSBmb3IgYnJlYWRjcnVtYiBkaXNwbGF5XHJcbiAqL1xyXG5mdW5jdGlvbiBmb3JtYXRCcmVhZGNydW1iTmFtZShuYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGxldCBmb3JtYXR0ZWQgPSBuYW1lLnJlcGxhY2UoL1tfLV0vZywgXCIgXCIpO1xyXG4gIGZvcm1hdHRlZCA9IGZvcm1hdHRlZC5yZXBsYWNlKC9eKFxcZCspXFxzKi8sIFwiJDEgXCIpO1xyXG4gIHJldHVybiBmb3JtYXR0ZWRcclxuICAgIC5zcGxpdChcIiBcIilcclxuICAgIC5tYXAoKHdvcmQpID0+IHtcclxuICAgICAgaWYgKCF3b3JkKSByZXR1cm4gXCJcIjtcclxuICAgICAgaWYgKC9eXFxkKyQvLnRlc3Qod29yZCkpIHJldHVybiB3b3JkO1xyXG4gICAgICByZXR1cm4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSk7XHJcbiAgICB9KVxyXG4gICAgLmpvaW4oXCIgXCIpXHJcbiAgICAudHJpbSgpO1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgYWxsIHJld3JpdGVzIGZvciB0aGUgc3RyaWN0IG5lc3QgYXJjaGl0ZWN0dXJlXHJcbiAqIFRoaXMgaGFuZGxlcyB0aGUgXCJwYWlyIHJ1bGVcIjogZm9sZGVyLW5hbWUvZm9sZGVyLW5hbWUubWQgLT4gZm9sZGVyLW5hbWUvaW5kZXgubWRcclxuICovXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUmV3cml0ZXMoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XHJcbiAgY29uc3QgcmV3cml0ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcclxuICBjb25zdCBzZWN0aW9uc1BhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgXCJkb2NzL3NlY3Rpb25zXCIpO1xyXG5cclxuICBpZiAoIWZzLmV4aXN0c1N5bmMoc2VjdGlvbnNQYXRoKSkgcmV0dXJuIHJld3JpdGVzO1xyXG5cclxuICAvLyBTY2FuIGFsbCBzZWN0aW9uc1xyXG4gIGNvbnN0IHNlY3Rpb25zID0gZnNcclxuICAgIC5yZWFkZGlyU3luYyhzZWN0aW9uc1BhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KVxyXG4gICAgLmZpbHRlcigoZCkgPT4gZC5pc0RpcmVjdG9yeSgpKTtcclxuXHJcbiAgZm9yIChjb25zdCBzZWN0aW9uIG9mIHNlY3Rpb25zKSB7XHJcbiAgICBjb25zdCBzZWN0aW9uUGF0aCA9IHBhdGguam9pbihzZWN0aW9uc1BhdGgsIHNlY3Rpb24ubmFtZSk7XHJcbiAgICBzY2FuRm9yUmV3cml0ZXMoc2VjdGlvblBhdGgsIGBzZWN0aW9ucy8ke3NlY3Rpb24ubmFtZX1gLCByZXdyaXRlcyk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gcmV3cml0ZXM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBSZWN1cnNpdmVseSBzY2FuIGRpcmVjdG9yeSBmb3IgcmV3cml0ZXNcclxuICovXHJcbmZ1bmN0aW9uIHNjYW5Gb3JSZXdyaXRlcyhcclxuICBkaXJQYXRoOiBzdHJpbmcsXHJcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXHJcbiAgcmV3cml0ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXHJcbik6IHZvaWQge1xyXG4gIGNvbnN0IGVudHJpZXMgPSBmcy5yZWFkZGlyU3luYyhkaXJQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcbiAgY29uc3QgZGlyTmFtZSA9IHBhdGguYmFzZW5hbWUoZGlyUGF0aCk7XHJcblxyXG4gIC8vIENoZWNrIGZvciBzYW1lLW5hbWUubWQgKHBhaXIgcnVsZSlcclxuICBjb25zdCBzYW1lTmFtZU1kID0gcGF0aC5qb2luKGRpclBhdGgsIGAke2Rpck5hbWV9Lm1kYCk7XHJcbiAgY29uc3QgaW5kZXhNZCA9IHBhdGguam9pbihkaXJQYXRoLCBcImluZGV4Lm1kXCIpO1xyXG5cclxuICBpZiAoZnMuZXhpc3RzU3luYyhzYW1lTmFtZU1kKSkge1xyXG4gICAgLy8gUmV3cml0ZTogZm9sZGVyLW5hbWUvZm9sZGVyLW5hbWUubWQgLT4gZm9sZGVyLW5hbWUvaW5kZXgubWRcclxuICAgIC8vIFRoaXMgbWFrZXMgL2ZvbGRlci1uYW1lLyB3b3JrIGNvcnJlY3RseVxyXG4gICAgY29uc3Qgc291cmNlID0gYCR7cmVsYXRpdmVQYXRofS8ke2Rpck5hbWV9Lm1kYDtcclxuICAgIGNvbnN0IHRhcmdldCA9IGAke3JlbGF0aXZlUGF0aH0vaW5kZXgubWRgO1xyXG4gICAgcmV3cml0ZXNbc291cmNlXSA9IHRhcmdldDtcclxuICB9XHJcblxyXG4gIC8vIFJlY3Vyc2UgaW50byBzdWJkaXJlY3Rvcmllc1xyXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgIWVudHJ5Lm5hbWUuc3RhcnRzV2l0aChcIi5cIikpIHtcclxuICAgICAgc2NhbkZvclJld3JpdGVzKFxyXG4gICAgICAgIHBhdGguam9pbihkaXJQYXRoLCBlbnRyeS5uYW1lKSxcclxuICAgICAgICBgJHtyZWxhdGl2ZVBhdGh9LyR7ZW50cnkubmFtZX1gLFxyXG4gICAgICAgIHJld3JpdGVzLFxyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAvLyBTb3VyY2UgZGlyZWN0b3J5IGZvciBjb250ZW50IGZpbGVzXHJcbiAgc3JjRGlyOiBcIi4vZG9jc1wiLFxyXG5cclxuICBsYW5nOiBcInpoLUNOXCIsXHJcbiAgdGl0bGU6IFwiTWV0YVVuaXZlcnNlIEJsb2dcIixcclxuICBkZXNjcmlwdGlvbjogXCJcdTY1NzBcdTVCNTdcdTVCNkFcdTc1MUZcdTdFQTdcdTc3RTVcdThCQzZcdTdCQTFcdTc0MDZcdTdDRkJcdTdFREZcIixcclxuICBiYXNlOiBcIi9cIixcclxuICBjbGVhblVybHM6IGZhbHNlLFxyXG4gIGlnbm9yZURlYWRMaW5rczogdHJ1ZSxcclxuXHJcbiAgLy8gR2VuZXJhdGUgcmV3cml0ZXMgZHluYW1pY2FsbHlcclxuICAvLyBcdTY1MkZcdTYzMDFcdTRFMkRcdTY1ODdcdTY1ODdcdTRFRjZcdTU0MERcdUZGMUFcdTc4NkVcdTRGRERcdTRFMkRcdTY1ODdcdThERUZcdTVGODRcdTZCNjNcdTc4NkVcdTU5MDRcdTc0MDZcclxuICByZXdyaXRlczogZ2VuZXJhdGVSZXdyaXRlcygpLFxyXG5cclxuICB0aGVtZUNvbmZpZzoge1xyXG4gICAgbmF2OiBbXHJcbiAgICAgIHsgdGV4dDogXCJcdTk5OTZcdTk4NzVcIiwgbGluazogXCIvXCIgfSxcclxuICAgICAge1xyXG4gICAgICAgIHRleHQ6IFwiQUkgXHU1MkE5XHU2MjRCXCIsXHJcbiAgICAgICAgbGluazogXCIvY2hhdFwiLFxyXG4gICAgICAgIGFjdGl2ZU1hdGNoOiBcIi9jaGF0XCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB0ZXh0OiBcIlx1NjU4N1x1N0FFMFx1NTIxN1x1ODg2OFwiLFxyXG4gICAgICAgIGxpbms6IFwiL3NlY3Rpb25zL3Bvc3RzL1wiLFxyXG4gICAgICAgIGFjdGl2ZU1hdGNoOiBcIi9zZWN0aW9ucy9wb3N0cy9cIixcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIHRleHQ6IFwiXHU3N0U1XHU4QkM2XHU1RTkzXCIsXHJcbiAgICAgICAgbGluazogXCIvc2VjdGlvbnMva25vd2xlZGdlL1wiLFxyXG4gICAgICAgIGFjdGl2ZU1hdGNoOiBcIi9zZWN0aW9ucy9rbm93bGVkZ2UvXCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB0ZXh0OiBcIlx1NTE2Q1x1NUYwMFx1OEQ0NFx1NkU5MFwiLFxyXG4gICAgICAgIGxpbms6IFwiL3NlY3Rpb25zL3Jlc291cmNlcy9cIixcclxuICAgICAgICBhY3RpdmVNYXRjaDogXCIvc2VjdGlvbnMvcmVzb3VyY2VzL1wiLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgdGV4dDogXCJcdTUxNzNcdTRFOEVcdTYyMTFcIixcclxuICAgICAgICBsaW5rOiBcIi9zZWN0aW9ucy9hYm91dC9cIixcclxuICAgICAgICBhY3RpdmVNYXRjaDogXCIvc2VjdGlvbnMvYWJvdXQvXCIsXHJcbiAgICAgIH0sXHJcbiAgICBdLFxyXG4gICAgc2lkZWJhcjoge1xyXG4gICAgICBcIi9zZWN0aW9ucy9rbm93bGVkZ2UvXCI6IHRvU2lkZWJhckZvcm1hdChcclxuICAgICAgICBzY2FuRG9jU3RydWN0dXJlKFxyXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIFwiZG9jcy9zZWN0aW9ucy9rbm93bGVkZ2VcIiksXHJcbiAgICAgICAgKSxcclxuICAgICAgKSxcclxuICAgICAgXCIvc2VjdGlvbnMvcG9zdHMvXCI6IHRvU2lkZWJhckZvcm1hdChcclxuICAgICAgICBzY2FuRG9jU3RydWN0dXJlKHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBcImRvY3Mvc2VjdGlvbnMvcG9zdHNcIikpLFxyXG4gICAgICApLFxyXG4gICAgICBcIi9zZWN0aW9ucy9yZXNvdXJjZXMvXCI6IHRvU2lkZWJhckZvcm1hdChcclxuICAgICAgICBzY2FuRG9jU3RydWN0dXJlKFxyXG4gICAgICAgICAgcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIFwiZG9jcy9zZWN0aW9ucy9yZXNvdXJjZXNcIiksXHJcbiAgICAgICAgKSxcclxuICAgICAgKSxcclxuICAgICAgXCIvc2VjdGlvbnMvYWJvdXQvXCI6IHRvU2lkZWJhckZvcm1hdChcclxuICAgICAgICBzY2FuRG9jU3RydWN0dXJlKHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBcImRvY3Mvc2VjdGlvbnMvYWJvdXRcIikpLFxyXG4gICAgICApLFxyXG4gICAgfSxcclxuICAgIHNvY2lhbExpbmtzOiBbXHJcbiAgICAgIHsgaWNvbjogXCJnaXRodWJcIiwgbGluazogXCJodHRwczovL2dpdGh1Yi5jb20vdnVlanMvdml0ZXByZXNzXCIgfSxcclxuICAgIF0sXHJcbiAgICBkb2NGb290ZXI6IHsgcHJldjogZmFsc2UsIG5leHQ6IGZhbHNlIH0sXHJcbiAgICBvdXRsaW5lOiB7XHJcbiAgICAgIGxhYmVsOiBcIlx1OTg3NVx1OTc2Mlx1NUJGQ1x1ODIyQVwiLFxyXG4gICAgICBsZXZlbDogWzIsIDRdLCAvLyBTaG93IGhlYWRlcnMgZnJvbSBoMiB0byBoNFxyXG4gICAgfSxcclxuICAgIGxhc3RVcGRhdGVkOiB7IHRleHQ6IFwiXHU2NzAwXHU1NDBFXHU2NkY0XHU2NUIwXHU0RThFXCIgfSxcclxuICAgIHJldHVyblRvVG9wTGFiZWw6IFwiXHU1NkRFXHU1MjMwXHU5ODc2XHU5MEU4XCIsXHJcbiAgICBzaWRlYmFyTWVudUxhYmVsOiBcIlx1ODNEQ1x1NTM1NVwiLFxyXG4gICAgZGFya01vZGVTd2l0Y2hMYWJlbDogXCJcdTRFM0JcdTk4OThcIixcclxuICAgIGxpZ2h0TW9kZVN3aXRjaFRpdGxlOiBcIlx1NTIwN1x1NjM2Mlx1NTIzMFx1NkQ0NVx1ODI3Mlx1NkEyMVx1NUYwRlwiLFxyXG4gICAgZGFya01vZGVTd2l0Y2hUaXRsZTogXCJcdTUyMDdcdTYzNjJcdTUyMzBcdTZERjFcdTgyNzJcdTZBMjFcdTVGMEZcIixcclxuICB9LFxyXG5cclxuICBtYXJrZG93bjoge1xyXG4gICAgY29uZmlnOiAobWQ6IE1hcmtkb3duSXQpID0+IHtcclxuICAgICAgbWQudXNlKG1hdGhqYXgzKTtcclxuXHJcbiAgICAgIGNvbnN0IGRlZmF1bHRSZW5kZXIgPVxyXG4gICAgICAgIG1kLnJlbmRlcmVyLnJ1bGVzLnRleHQgfHxcclxuICAgICAgICBmdW5jdGlvbiAodG9rZW5zOiBhbnksIGlkeDogYW55LCBvcHRpb25zOiBhbnksIGVudjogYW55LCBzZWxmOiBhbnkpIHtcclxuICAgICAgICAgIHJldHVybiBzZWxmLnJlbmRlclRva2VuKHRva2VucywgaWR4LCBvcHRpb25zKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgbWQucmVuZGVyZXIucnVsZXMudGV4dCA9IGZ1bmN0aW9uIChcclxuICAgICAgICB0b2tlbnM6IGFueSxcclxuICAgICAgICBpZHg6IGFueSxcclxuICAgICAgICBvcHRpb25zOiBhbnksXHJcbiAgICAgICAgZW52OiBhbnksXHJcbiAgICAgICAgc2VsZjogYW55LFxyXG4gICAgICApIHtcclxuICAgICAgICBsZXQgY29udGVudCA9IHRva2Vuc1tpZHhdLmNvbnRlbnQ7XHJcbiAgICAgICAgY29uc3Qgd2lraUxpbmtSZWdleCA9IC9cXFtcXFsoLio/KVxcXVxcXS9nO1xyXG4gICAgICAgIGlmICh3aWtpTGlua1JlZ2V4LnRlc3QoY29udGVudCkpIHtcclxuICAgICAgICAgIHJldHVybiBjb250ZW50LnJlcGxhY2Uod2lraUxpbmtSZWdleCwgKG1hdGNoOiBhbnksIHAxOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgW2xpbmssIHRleHRdID0gcDEuc3BsaXQoXCJ8XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBkaXNwbGF5VGV4dCA9IHRleHQgfHwgbGluaztcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gYC9zZWN0aW9ucy9wb3N0cy8ke2xpbmsudHJpbSgpLnJlcGxhY2UoL1xccysvZywgXCItXCIpLnRvTG93ZXJDYXNlKCl9L2A7XHJcbiAgICAgICAgICAgIHJldHVybiBgPGEgaHJlZj1cIiR7dXJsfVwiPiR7ZGlzcGxheVRleHR9PC9hPmA7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRSZW5kZXIodG9rZW5zLCBpZHgsIG9wdGlvbnMsIGVudiwgc2VsZik7XHJcbiAgICAgIH07XHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgdnVlOiB7XHJcbiAgICB0ZW1wbGF0ZToge1xyXG4gICAgICBjb21waWxlck9wdGlvbnM6IHtcclxuICAgICAgICBpc0N1c3RvbUVsZW1lbnQ6ICh0YWc6IHN0cmluZykgPT4gdGFnLnN0YXJ0c1dpdGgoXCJtangtXCIpLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHZpdGU6IHtcclxuICAgIGJhc2U6IFwiL1wiLFxyXG4gICAgZW52UHJlZml4OiBbXCJWSVRFX1wiLCBcIkxMTV9cIl0sXHJcbiAgICBvcHRpbWl6ZURlcHM6IHtcclxuICAgICAgZm9yY2U6IHRydWUsXHJcbiAgICB9LFxyXG4gICAgcmVzb2x2ZToge1xyXG4gICAgICBhbGlhczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGZpbmQ6IFwiQFwiLFxyXG4gICAgICAgICAgcmVwbGFjZW1lbnQ6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vdGhlbWVcIiwgaW1wb3J0Lm1ldGEudXJsKSksXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH0sXHJcbiAgICAvLyBFeGNsdWRlIHZpc3VhbCBzY2VuZSBtb2R1bGVzIGZyb20gU1NSIC0gdGhleSB1c2UgYnJvd3Nlci1vbmx5IEFQSXNcclxuICAgIHNzcjoge1xyXG4gICAgICBub0V4dGVybmFsOiBbXCJ0aHJlZVwiXSxcclxuICAgIH0sXHJcbiAgICAvLyBQMS04IFx1NEZFRVx1NTkwRFx1RkYxQVx1NjM5Mlx1OTY2NCBBZ2VudCBcdTY1NzBcdTYzNkVcdTc2RUVcdTVGNTVcdTU0OENcdTY1RTVcdTVGRDdcdTc2RUVcdTVGNTVcdUZGMENcdTkwN0ZcdTUxNEQgVml0ZSBITVIgT09NXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgd2F0Y2g6IHtcclxuICAgICAgICBpZ25vcmVkOiBbXHJcbiAgICAgICAgICBcIioqLy52aXRlcHJlc3MvYWdlbnQvbWVtb3J5L2RhdGEvKipcIixcclxuICAgICAgICAgIFwiKiovLnZpdGVwcmVzcy9hZ2VudC9sb2dzLyoqXCIsXHJcbiAgICAgICAgICBcIioqL2xvZ3MvKipcIixcclxuICAgICAgICAgIFwiKiovLnRyYXNoLyoqXCIsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAgLy8gXHU0RkVFXHU1OTBEIE1JTUUgXHU3QzdCXHU1NzhCXHU5NTE5XHU4QkVGXHJcbiAgICAgIGZzOiB7XHJcbiAgICAgICAgc3RyaWN0OiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBwbHVnaW5zOiBbXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiBcIm1ldGEtYmxvZy1yb3V0aW5nXCIsXHJcbiAgICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgKiBCdWcgRml4OiBUYXNrIDEgLSBcdTUzRjZcdTVCNTBcdTY1ODdcdTY4NjNcdTUzRDhcdTY1ODdcdTRFRjZcdTU5MzlcdTU0MEVcdTc2ODRcdThERUZcdTc1MzFcdTU5MDRcdTc0MDZcclxuICAgICAgICAgICAqXHJcbiAgICAgICAgICAgKiBcdTk1RUVcdTk4OThcdUZGMUFcdTVGNTMgQS5tZCBcdTUzRDhcdTYyMTAgQS9BLm1kIFx1NTQwRVx1RkYwQ1x1OEJCRlx1OTVFRSAvc2VjdGlvbnMvcG9zdHMvQS8gXHU2MkE1IDQwNFxyXG4gICAgICAgICAgICogXHU1MzlGXHU1NkUwXHVGRjFBVml0ZVByZXNzIFx1NzY4NCByZXdyaXRlcyBcdTU3MjhcdTU0MkZcdTUyQThcdTY1RjZcdTc1MUZcdTYyMTBcdUZGMENcdThGRDBcdTg4NENcdTY1RjZcdTRFMERcdTRGMUFcdTY2RjRcdTY1QjBcclxuICAgICAgICAgICAqIFx1ODlFM1x1NTFCM1x1RkYxQVx1NTcyOFx1OEJGN1x1NkM0Mlx1NTIzMFx1OEZCRSBWaXRlUHJlc3MgXHU0RTRCXHU1MjREXHVGRjBDXHU1MkE4XHU2MDAxXHU2OEMwXHU2RDRCIGZvbGRlci1ub3RlIFx1NkEyMVx1NUYwRlx1RkYwQ1xyXG4gICAgICAgICAgICogICAgICBcdTVDMDZcdThCRjdcdTZDNDJcdTkxQ0RcdTUxOTlcdTUyMzAgVml0ZVByZXNzIFx1NzY4NCBAZnMgXHU4REVGXHU1Rjg0XHVGRjBDXHU4QkE5XHU1MTc2XHU3NkY0XHU2M0E1XHU2RTMyXHU2N0QzXHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICAgKi9cclxuXHJcbiAgICAgICAgICAvLyBcdThGODVcdTUyQTlcdTUxRkRcdTY1NzBcdUZGMUFcdTY4QzBcdTY3RTVcdThERUZcdTVGODRcdTY2MkZcdTU0MjZcdTY2MkYgZm9sZGVyLW5vdGUgXHU2QTIxXHU1RjBGXHVGRjBDXHU4RkQ0XHU1NkRFXHU1QjlFXHU5NjQ1XHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0XHJcbiAgICAgICAgICBmdW5jdGlvbiBnZXRGb2xkZXJOb3RlSW5mbyhcclxuICAgICAgICAgICAgdXJsUGF0aDogc3RyaW5nLFxyXG4gICAgICAgICAgKTogeyBmaWxlUGF0aDogc3RyaW5nOyBmb2xkZXJOYW1lOiBzdHJpbmcgfSB8IG51bGwge1xyXG4gICAgICAgICAgICBpZiAoIXVybFBhdGguc3RhcnRzV2l0aChcIi9zZWN0aW9ucy9cIikpIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcGF0aFBhcnRzID0gdXJsUGF0aFxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9cXC8kLywgXCJcIilcclxuICAgICAgICAgICAgICAuc3BsaXQoXCIvXCIpXHJcbiAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgaWYgKHBhdGhQYXJ0cy5sZW5ndGggPCAzKSByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHNlY3Rpb24gPSBwYXRoUGFydHNbMV07XHJcbiAgICAgICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSBwYXRoUGFydHMuc2xpY2UoMikuam9pbihcIi9cIik7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldERpciA9IHBhdGgucmVzb2x2ZShcclxuICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICAgIFwiZG9jcy9zZWN0aW9uc1wiLFxyXG4gICAgICAgICAgICAgIHNlY3Rpb24sXHJcbiAgICAgICAgICAgICAgZm9sZGVyUGF0aCxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgY29uc3QgZm9sZGVyTmFtZSA9IHBhdGguYmFzZW5hbWUodGFyZ2V0RGlyKTtcclxuICAgICAgICAgICAgY29uc3QgZm9sZGVyTm90ZUZpbGUgPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCBgJHtmb2xkZXJOYW1lfS5tZGApO1xyXG4gICAgICAgICAgICBjb25zdCBpbmRleEZpbGUgPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCBcImluZGV4Lm1kXCIpO1xyXG5cclxuICAgICAgICAgICAgLy8gXHU1OTgyXHU2NzlDXHU2NjJGIGZvbGRlci1ub3RlIFx1NkEyMVx1NUYwRlx1RkYwOFx1NjcwOVx1NTQwQ1x1NTQwRCBtZCBcdTY1ODdcdTRFRjZcdTRGNDZcdTZDQTFcdTY3MDkgaW5kZXgubWRcdUZGMDlcclxuICAgICAgICAgICAgaWYgKFxyXG4gICAgICAgICAgICAgIGZzLmV4aXN0c1N5bmModGFyZ2V0RGlyKSAmJlxyXG4gICAgICAgICAgICAgIGZzLnN0YXRTeW5jKHRhcmdldERpcikuaXNEaXJlY3RvcnkoKVxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmb2xkZXJOb3RlRmlsZSkgJiYgIWZzLmV4aXN0c1N5bmMoaW5kZXhGaWxlKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHsgZmlsZVBhdGg6IGZvbGRlck5vdGVGaWxlLCBmb2xkZXJOYW1lIH07XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJhd1VybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuXHJcbiAgICAgICAgICAgIC8vIEZJWDogUmVtb3ZlIHF1ZXJ5IHN0cmluZyBmb3Igcm91dGluZyBsb2dpY1xyXG4gICAgICAgICAgICBjb25zdCB1cmxXaXRob3V0UXVlcnkgPSByYXdVcmwuc3BsaXQoXCI/XCIpWzBdO1xyXG5cclxuICAgICAgICAgICAgLy8gRklYOiBEZWNvZGUgVVJMIHRvIGhhbmRsZSBDaGluZXNlIGNoYXJhY3RlcnNcclxuICAgICAgICAgICAgbGV0IHVybCA9IHVybFdpdGhvdXRRdWVyeTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICB1cmwgPSBkZWNvZGVVUklDb21wb25lbnQodXJsV2l0aG91dFF1ZXJ5KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIC8vIElmIGRlY29kaW5nIGZhaWxzLCB1c2Ugb3JpZ2luYWwgVVJMXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFNraXAgQVBJIGFuZCBhc3NldCByZXF1ZXN0cyAodXNlIG9yaWdpbmFsIHJhd1VybCB0byBjaGVjayBxdWVyeSBwYXJhbXMpXHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICByYXdVcmwuc3RhcnRzV2l0aChcIi9hcGkvXCIpIHx8XHJcbiAgICAgICAgICAgICAgcmF3VXJsLmluY2x1ZGVzKFwiX2Fzc2V0c1wiKSB8fFxyXG4gICAgICAgICAgICAgIHJhd1VybC5pbmNsdWRlcyhcIkBmc1wiKSB8fFxyXG4gICAgICAgICAgICAgIHJhd1VybC5tYXRjaChcclxuICAgICAgICAgICAgICAgIC9cXC4oanN8Y3NzfHBuZ3xqcGd8anBlZ3xnaWZ8c3ZnfHdvZmZ8d29mZjJ8dHRmfGVvdHxpY298anNvbikoXFw/fCQpLyxcclxuICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgIC8vIFx1NUJGOVx1NEU4RSBBUEkgXHU4QkY3XHU2QzQyXHVGRjBDXHU3NkY0XHU2M0E1XHU4QzAzXHU3NTI4IG5leHQoKVx1RkYwQ1x1OEJBOVx1NTQwRVx1N0VFRFx1NzY4NCBCRkYgXHU0RTJEXHU5NUY0XHU0RUY2XHU1OTA0XHU3NDA2XHJcbiAgICAgICAgICAgICAgLy8gXHU0RTBEXHU4OTgxXHU1NzI4XHU2QjY0XHU2NUY2XHU4RkQ0XHU1NkRFXHVGRjBDXHU0RUU1XHU3ODZFXHU0RkREXHU4QkY3XHU2QzQyXHU3RUU3XHU3RUVEXHU0RjIwXHU5MDEyXHU1MjMwXHU0RTBCXHU0RTAwXHU0RTJBXHU0RTJEXHU5NUY0XHU0RUY2XHJcbiAgICAgICAgICAgICAgaWYgKHJhd1VybC5zdGFydHNXaXRoKFwiL2FwaS9cIikpIHtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gXHU1OTA0XHU3NDA2IHNlY3Rpb25zIFx1OERFRlx1NUY4NFx1NzY4NFx1NTJBOFx1NjAwMVx1OERFRlx1NzUzMVxyXG4gICAgICAgICAgICBpZiAodXJsLnN0YXJ0c1dpdGgoXCIvc2VjdGlvbnMvXCIpKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbUm91dGluZ10gUHJvY2Vzc2luZzpcIiwgdXJsKTtcclxuXHJcbiAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgcGF0aHMgd2l0aG91dCB0cmFpbGluZyBzbGFzaCB0byBoYXZlIHRyYWlsaW5nIHNsYXNoXHJcbiAgICAgICAgICAgICAgLy8gRklYOiBcdTUzRUFcdTU5MDRcdTc0MDYgZm9sZGVyLW5vdGUgXHU2QTIxXHU1RjBGXHU3Njg0XHU3NkVFXHU1RjU1XHU4REVGXHU1Rjg0XHVGRjBDXHU0RTBEXHU1OTA0XHU3NDA2IC5odG1sIFx1NjU4N1x1NEVGNlxyXG4gICAgICAgICAgICAgIC8vIGNsZWFuVXJsczogZmFsc2UgXHU2NUY2XHVGRjBDXHU1M0Y2XHU1QjUwXHU4MjgyXHU3MEI5IFVSTCBcdTY2MkYgL3BhdGgvZmlsZS5odG1sXHJcbiAgICAgICAgICAgICAgY29uc3QgaXNGaWxlID0gdXJsLm1hdGNoKC9cXC4oaHRtbHxtZCkkLyk7XHJcbiAgICAgICAgICAgICAgaWYgKCF1cmwuZW5kc1dpdGgoXCIvXCIpICYmICFpc0ZpbGUpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMzAxO1xyXG4gICAgICAgICAgICAgICAgLy8gUmUtZW5jb2RlIHRoZSBVUkwgYW5kIHByZXNlcnZlIHF1ZXJ5IHN0cmluZ1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcXVlcnlTdHJpbmcgPSByYXdVcmwuaW5jbHVkZXMoXCI/XCIpXHJcbiAgICAgICAgICAgICAgICAgID8gXCI/XCIgKyByYXdVcmwuc3BsaXQoXCI/XCIpWzFdXHJcbiAgICAgICAgICAgICAgICAgIDogXCJcIjtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJMb2NhdGlvblwiLCBlbmNvZGVVUkkodXJsICsgXCIvXCIpICsgcXVlcnlTdHJpbmcpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgLy8gU2tpcCAubWQgYW5kIC5odG1sIGZpbGVzIChWaXRlIGludGVybmFsIHJlcXVlc3RzKVxyXG4gICAgICAgICAgICAgIGlmIChpc0ZpbGUpIHtcclxuICAgICAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIC8vIFx1OEZEMFx1ODg0Q1x1NjVGNiBmb2xkZXItbm90ZSBcdTcwRURcdTY2RjRcdTY1QjBcdTU5MDRcdTc0MDZcclxuICAgICAgICAgICAgICBjb25zdCBmb2xkZXJJbmZvID0gZ2V0Rm9sZGVyTm90ZUluZm8odXJsKTtcclxuICAgICAgICAgICAgICBpZiAoZm9sZGVySW5mbykge1xyXG4gICAgICAgICAgICAgICAgLy8gXHU5MUNEXHU1MTk5XHU0RTNBIFZpdGVQcmVzcyBcdThERUZcdTc1MzFcdThERUZcdTVGODRcdUZGMDhcdTRFMERcdTc1MjggQGZzXHVGRjBDXHU1NkUwXHU0RTNBIEBmcyBcdTdFRDVcdThGQzdcdTRFODYgTWFya2Rvd24gXHU2RTMyXHU2N0QzXHU3QkExXHU3RUJGXHVGRjA5XHJcbiAgICAgICAgICAgICAgICAvLyBWaXRlUHJlc3MgXHU4MEZEXHU4QkM2XHU1MjJCIC9zZWN0aW9ucy9wb3N0cy8uLi4vZm9sZGVyL2ZvbGRlciBcdTVFNzZcdTYyN0VcdTUyMzAgZm9sZGVyL2ZvbGRlci5tZCBcdTZFMzJcdTY3RDNcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybFdpdGhvdXRTbGFzaCA9IHVybC5yZXBsYWNlKC9cXC8kLywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJOYW1lID0gdXJsV2l0aG91dFNsYXNoLnNwbGl0KFwiL1wiKS5wb3AoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IGAke3VybFdpdGhvdXRTbGFzaH0vJHtmb2xkZXJOYW1lfWA7XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbUm91dGluZ10gRm9sZGVyLW5vdGUgZGV0ZWN0ZWQ6XCIsIHtcclxuICAgICAgICAgICAgICAgICAgb3JpZ2luYWw6IHVybCxcclxuICAgICAgICAgICAgICAgICAgcmV3cml0ZVRvOiBuZXdVcmwsXHJcbiAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBmb2xkZXJJbmZvLmZpbGVQYXRoLFxyXG4gICAgICAgICAgICAgICAgICBleGlzdHM6IGZzLmV4aXN0c1N5bmMoZm9sZGVySW5mby5maWxlUGF0aCksXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXEudXJsID0gbmV3VXJsO1xyXG5cclxuICAgICAgICAgICAgICAgIHN5c3RlbS5kZWJ1ZyhcclxuICAgICAgICAgICAgICAgICAgXCJyb3V0aW5nLnJld3JpdGVcIixcclxuICAgICAgICAgICAgICAgICAgYFJ1bnRpbWUgZm9sZGVyLW5vdGUgcmV3cml0ZTogJHt1cmx9IC0+ICR7bmV3VXJsfWAsXHJcbiAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxVcmw6IHVybCxcclxuICAgICAgICAgICAgICAgICAgICAgIG5ld1VybCxcclxuICAgICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoOiBmb2xkZXJJbmZvLmZpbGVQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltSb3V0aW5nXSBOb3QgYSBmb2xkZXItbm90ZTpcIiwgdXJsKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiBcIm1ldGEtYmxvZy1iZmZcIixcclxuICAgICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICAgICAgICAvLyBCRkYgQVBJIFNlcnZlciBcdTUyMURcdTU5Q0JcdTUzMTZcclxuICAgICAgICAgIHN5c3RlbS5pbmZvKFwic2VydmVyLmluaXRcIiwgXCJCRkYgQVBJIFNlcnZlciBcdTUyMURcdTU5Q0JcdTUzMTZcdTVCOENcdTYyMTBcIik7XHJcblxyXG4gICAgICAgICAgLy8gXHU1MjFEXHU1OUNCXHU1MzE2IExMTSBNYW5hZ2VyIChcdTdCODBcdTUzMTZcdTcyNDgpXHJcbiAgICAgICAgICBjb25zdCBsbG1NYW5hZ2VyID0gbnVsbDtcclxuICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIFx1NjVFN1x1NzI0OCBhZ2VudCBcdTZBMjFcdTU3NTdcdTVERjJcdTc5RkJcdTk2NjRcdUZGMENcdTRGN0ZcdTc1MjggYWktY2hhdCBcdTZBMjFcdTU3NTdcdTc2ODRcdTdCODBcdTUzMTZcdTVCOUVcdTczQjBcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJbSU5GT10gTExNIE1hbmFnZXIgXHU1MjFEXHU1OUNCXHU1MzE2XHU4REYzXHU4RkM3XHVGRjA4XHU0RjdGXHU3NTI4IGFpLWNoYXQgXHU2QTIxXHU1NzU3XHVGRjA5XCIpO1xyXG4gICAgICAgICAgICBjb25zdCBkZWZhdWx0UHJvdmlkZXIgPVxyXG4gICAgICAgICAgICAgIHByb2Nlc3MuZW52LkxMTV9ERUZBVUxUX1BST1ZJREVSIHx8IFwiZGVlcHNlZWtcIjtcclxuICAgICAgICAgICAgY29uc3QgZGFpbHlCdWRnZXQgPSBwYXJzZUZsb2F0KFxyXG4gICAgICAgICAgICAgIHByb2Nlc3MuZW52LkxMTV9EQUlMWV9CVURHRVQgfHwgXCIxMFwiLFxyXG4gICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgLy8gXHU4Rjg1XHU1MkE5XHU1MUZEXHU2NTcwXHVGRjFBXHU1M0JCXHU5NjY0XHU1RjE1XHU1M0Y3XHU1RTc2XHU2RTA1XHU3NDA2XHJcbiAgICAgICAgICAgIGNvbnN0IGNsZWFuID0gKHY6IHN0cmluZyB8IHVuZGVmaW5lZCkgPT5cclxuICAgICAgICAgICAgICB2Py50cmltKCkucmVwbGFjZSgvXltcIiddfFtcIiddJC9nLCBcIlwiKTtcclxuXHJcbiAgICAgICAgICAgIC8vIFx1Njc4NFx1NUVGQSBwcm92aWRlcnMgXHU5MTREXHU3RjZFXHJcbiAgICAgICAgICAgIGNvbnN0IHByb3ZpZGVyczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG5cclxuICAgICAgICAgICAgLy8gRGVlcFNlZWtcclxuICAgICAgICAgICAgY29uc3QgZGVlcHNlZWtLZXkgPSBjbGVhbihwcm9jZXNzLmVudi5WSVRFX0RFRVBTRUVLX0FQSV9LRVkpO1xyXG4gICAgICAgICAgICBpZiAoZGVlcHNlZWtLZXkgJiYgIWRlZXBzZWVrS2V5LmluY2x1ZGVzKFwieW91ci1hcGkta2V5XCIpKSB7XHJcbiAgICAgICAgICAgICAgcHJvdmlkZXJzLmRlZXBzZWVrID0ge1xyXG4gICAgICAgICAgICAgICAgYXBpS2V5OiBkZWVwc2Vla0tleSxcclxuICAgICAgICAgICAgICAgIG1vZGVsOlxyXG4gICAgICAgICAgICAgICAgICBjbGVhbihwcm9jZXNzLmVudi5WSVRFX0RFRVBTRUVLX01PREVMKSB8fCBcImRlZXBzZWVrLWNoYXRcIixcclxuICAgICAgICAgICAgICAgIGJhc2VVUkw6IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfREVFUFNFRUtfQkFTRV9VUkwpLFxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIE9wZW5BSVxyXG4gICAgICAgICAgICBjb25zdCBvcGVuYWlLZXkgPSBjbGVhbihwcm9jZXNzLmVudi5WSVRFX09QRU5BSV9BUElfS0VZKTtcclxuICAgICAgICAgICAgaWYgKG9wZW5haUtleSAmJiAhb3BlbmFpS2V5LmluY2x1ZGVzKFwieW91ci1hcGkta2V5XCIpKSB7XHJcbiAgICAgICAgICAgICAgcHJvdmlkZXJzLm9wZW5haSA9IHtcclxuICAgICAgICAgICAgICAgIGFwaUtleTogb3BlbmFpS2V5LFxyXG4gICAgICAgICAgICAgICAgbW9kZWw6IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfT1BFTkFJX01PREVMKSB8fCBcImdwdC00b1wiLFxyXG4gICAgICAgICAgICAgICAgYmFzZVVSTDogY2xlYW4ocHJvY2Vzcy5lbnYuVklURV9PUEVOQUlfQkFTRV9VUkwpLFxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEFudGhyb3BpY1xyXG4gICAgICAgICAgICBjb25zdCBhbnRocm9waWNLZXkgPSBjbGVhbihwcm9jZXNzLmVudi5WSVRFX0FOVEhST1BJQ19BUElfS0VZKTtcclxuICAgICAgICAgICAgaWYgKGFudGhyb3BpY0tleSAmJiAhYW50aHJvcGljS2V5LmluY2x1ZGVzKFwieW91ci1hcGkta2V5XCIpKSB7XHJcbiAgICAgICAgICAgICAgcHJvdmlkZXJzLmFudGhyb3BpYyA9IHtcclxuICAgICAgICAgICAgICAgIGFwaUtleTogYW50aHJvcGljS2V5LFxyXG4gICAgICAgICAgICAgICAgbW9kZWw6XHJcbiAgICAgICAgICAgICAgICAgIGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfQU5USFJPUElDX01PREVMKSB8fFxyXG4gICAgICAgICAgICAgICAgICBcImNsYXVkZS0zLTUtc29ubmV0XCIsXHJcbiAgICAgICAgICAgICAgICBiYXNlVVJMOiBjbGVhbihwcm9jZXNzLmVudi5WSVRFX0FOVEhST1BJQ19CQVNFX1VSTCksXHJcbiAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gR2VtaW5pXHJcbiAgICAgICAgICAgIGNvbnN0IGdlbWluaUtleSA9IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfR0VNSU5JX0FQSV9LRVkpO1xyXG4gICAgICAgICAgICBpZiAoZ2VtaW5pS2V5ICYmICFnZW1pbmlLZXkuaW5jbHVkZXMoXCJ5b3VyLWFwaS1rZXlcIikpIHtcclxuICAgICAgICAgICAgICBwcm92aWRlcnMuZ2VtaW5pID0ge1xyXG4gICAgICAgICAgICAgICAgYXBpS2V5OiBnZW1pbmlLZXksXHJcbiAgICAgICAgICAgICAgICBtb2RlbDogY2xlYW4ocHJvY2Vzcy5lbnYuVklURV9HRU1JTklfTU9ERUwpIHx8IFwiZ2VtaW5pLTEuNS1wcm9cIixcclxuICAgICAgICAgICAgICAgIGJhc2VVUkw6IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfR0VNSU5JX0JBU0VfVVJMKSxcclxuICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAvLyBaaGlwdVxyXG4gICAgICAgICAgICBjb25zdCB6aGlwdUtleSA9IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfWkhJUFVfQVBJX0tFWSk7XHJcbiAgICAgICAgICAgIGlmICh6aGlwdUtleSAmJiAhemhpcHVLZXkuaW5jbHVkZXMoXCJ5b3VyLWFwaS1rZXlcIikpIHtcclxuICAgICAgICAgICAgICBwcm92aWRlcnMuemhpcHUgPSB7XHJcbiAgICAgICAgICAgICAgICBhcGlLZXk6IHpoaXB1S2V5LFxyXG4gICAgICAgICAgICAgICAgbW9kZWw6IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfWkhJUFVfTU9ERUwpIHx8IFwiZ2xtLTRcIixcclxuICAgICAgICAgICAgICAgIGJhc2VVUkw6IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfWkhJUFVfQkFTRV9VUkwpLFxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIFF3ZW5cclxuICAgICAgICAgICAgY29uc3QgcXdlbktleSA9IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfUVdFTl9BUElfS0VZKTtcclxuICAgICAgICAgICAgaWYgKHF3ZW5LZXkgJiYgIXF3ZW5LZXkuaW5jbHVkZXMoXCJ5b3VyLWFwaS1rZXlcIikpIHtcclxuICAgICAgICAgICAgICBwcm92aWRlcnMucXdlbiA9IHtcclxuICAgICAgICAgICAgICAgIGFwaUtleTogcXdlbktleSxcclxuICAgICAgICAgICAgICAgIG1vZGVsOiBjbGVhbihwcm9jZXNzLmVudi5WSVRFX1FXRU5fTU9ERUwpIHx8IFwicXdlbi1wbHVzXCIsXHJcbiAgICAgICAgICAgICAgICBiYXNlVVJMOiBjbGVhbihwcm9jZXNzLmVudi5WSVRFX1FXRU5fQkFTRV9VUkwpLFxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIEtpbWlcclxuICAgICAgICAgICAgY29uc3Qga2ltaUtleSA9IGNsZWFuKHByb2Nlc3MuZW52LlZJVEVfS0lNSV9BUElfS0VZKTtcclxuICAgICAgICAgICAgaWYgKGtpbWlLZXkgJiYgIWtpbWlLZXkuaW5jbHVkZXMoXCJ5b3VyLWFwaS1rZXlcIikpIHtcclxuICAgICAgICAgICAgICBwcm92aWRlcnMua2ltaSA9IHtcclxuICAgICAgICAgICAgICAgIGFwaUtleToga2ltaUtleSxcclxuICAgICAgICAgICAgICAgIG1vZGVsOiBjbGVhbihwcm9jZXNzLmVudi5WSVRFX0tJTUlfTU9ERUwpIHx8IFwia2ltaS1rMi41XCIsXHJcbiAgICAgICAgICAgICAgICBiYXNlVVJMOiBjbGVhbihwcm9jZXNzLmVudi5WSVRFX0tJTUlfQkFTRV9VUkwpLFxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0xMTV0gUHJvdmlkZXJzIGNvbmZpZzpcIiwgT2JqZWN0LmtleXMocHJvdmlkZXJzKSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoT2JqZWN0LmtleXMocHJvdmlkZXJzKS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICBzeXN0ZW0ud2FybihcInNlcnZlci5sbG1cIiwgXCJcdTZDQTFcdTY3MDlcdTkxNERcdTdGNkVcdTRFRkJcdTRGNTUgTExNIFByb3ZpZGVyXCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIC8vIGNyZWF0ZUxMTU1hbmFnZXIoe1xyXG4gICAgICAgICAgICAgIC8vICAgZGFpbHlCdWRnZXQsXHJcbiAgICAgICAgICAgICAgLy8gICBkZWZhdWx0UHJvdmlkZXIsXHJcbiAgICAgICAgICAgICAgLy8gICBwcm92aWRlcnNcclxuICAgICAgICAgICAgICAvLyB9KTtcclxuXHJcbiAgICAgICAgICAgICAgc3lzdGVtLmluZm8oXHJcbiAgICAgICAgICAgICAgICBcInNlcnZlci5sbG1cIixcclxuICAgICAgICAgICAgICAgIGBMTE0gTWFuYWdlciBcdTUyMURcdTU5Q0JcdTUzMTZcdTVCOENcdTYyMTBcdUZGMENQcm92aWRlcjogJHtPYmplY3Qua2V5cyhwcm92aWRlcnMpLmpvaW4oXCIsIFwiKX0sIFx1OUVEOFx1OEJBNDogJHtkZWZhdWx0UHJvdmlkZXJ9YCxcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIHN5c3RlbS5lcnJvcihcInNlcnZlci5sbG1cIiwgXCJMTE0gTWFuYWdlciBcdTUyMURcdTU5Q0JcdTUzMTZcdTU5MzFcdThEMjU6IFwiICsgU3RyaW5nKGUpKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBcdTU0MEVcdTUzRjBcdTRFRkJcdTUyQTFcdThDMDNcdTVFQTZcdTU2NjhcdTVERjJcdTc5RkJcdTk2NjRcdUZGMDhcdTk2OEYgYWdlbnQgXHU2QTIxXHU1NzU3XHU0RTAwXHU4RDc3XHU3OUZCXHU5NjY0XHVGRjA5XHJcblxyXG4gICAgICAgICAgLy8gXHU3MEVEXHU2NkY0XHU2NUIwXHU4Rjg1XHU1MkE5XHU1MUZEXHU2NTcwXHJcbiAgICAgICAgICBjb25zdCB0cmlnZ2VyUmVsb2FkID0gKCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICBcIltITVJdIFRyaWdnZXIgcmVsb2FkIGNhbGxlZCwgc2VydmVyLndzIGV4aXN0czpcIixcclxuICAgICAgICAgICAgICAhIXNlcnZlci53cyxcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHNlcnZlci53cykge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgc2VydmVyLndzLnNlbmQoeyB0eXBlOiBcImZ1bGwtcmVsb2FkXCIgfSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0hNUl0gVHJpZ2dlcmVkIGZ1bGwgcmVsb2FkIHN1Y2Nlc3NmdWxseVwiKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltITVJdIEZhaWxlZCB0byBzZW5kIHJlbG9hZDpcIiwgZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgICBcIltITVJdIFdlYlNvY2tldCBub3QgYXZhaWxhYmxlLCBmYWxsaW5nIGJhY2sgdG8gZmlsZSB3YXRjaGVyXCIsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgNTAwKTsgLy8gXHU1RUY2XHU4RkRGNTAwbXNcdTc4NkVcdTRGRERcdTY1ODdcdTRFRjZcdTdDRkJcdTdFREZcdTY0Q0RcdTRGNUNcdTVCOENcdTYyMTBcdTVFNzZcdTdBMzNcdTVCOUFcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgLy8gQVBJXHU4QkY3XHU2QzQyXHU2NUU1XHU1RkQ3XHU0RTJEXHU5NUY0XHU0RUY2IC0gXHU0RjdGXHU3NTI4IHN5c3RlbSBcdTY1RTVcdTVGRDdcdUZGMDhcdTcyNDhcdTY3MkMyIC0gXHU3RUQ1XHU4RkM3XHU3RjEzXHU1QjU4XHU5NUVFXHU5ODk4XHVGRjA5XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9cIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuXHJcbiAgICAgICAgICAgIC8vIFx1OEJCMFx1NUY1NVx1OEJGN1x1NkM0Mlx1NUYwMFx1NTlDQlxyXG4gICAgICAgICAgICBzeXN0ZW0uZGVidWcoXCJhcGkucmVxdWVzdFwiLCBgJHtyZXEubWV0aG9kfSAke3VybH1gLCB7XHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IHsgbWV0aG9kOiByZXEubWV0aG9kLCB1cmwgfSxcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAvLyBcdTc2RDFcdTU0MkNcdTU0Q0RcdTVFOTRcdTVCOENcdTYyMTBcclxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxFbmQgPSByZXMuZW5kLmJpbmQocmVzKTtcclxuICAgICAgICAgICAgcmVzLmVuZCA9IGZ1bmN0aW9uICguLi5hcmdzOiBhbnlbXSkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgICAgICAgICBjb25zdCBzdGF0dXMgPSByZXMuc3RhdHVzQ29kZSB8fCAyMDA7XHJcblxyXG4gICAgICAgICAgICAgIC8vIFx1OEJCMFx1NUY1NVx1NTRDRFx1NUU5NFxyXG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgPj0gNDAwKSB7XHJcbiAgICAgICAgICAgICAgICBzeXN0ZW0uZXJyb3IoXHJcbiAgICAgICAgICAgICAgICAgIFwiYXBpLnJlc3BvbnNlXCIsXHJcbiAgICAgICAgICAgICAgICAgIGAke3JlcS5tZXRob2R9ICR7dXJsfSAtICR7c3RhdHVzfSAoJHtkdXJhdGlvbn1tcylgLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3lzdGVtLnN1Y2Nlc3MoXHJcbiAgICAgICAgICAgICAgICAgIFwiYXBpLnJlc3BvbnNlXCIsXHJcbiAgICAgICAgICAgICAgICAgIGAke3JlcS5tZXRob2R9ICR7dXJsfSAtICR7c3RhdHVzfSAoJHtkdXJhdGlvbn1tcylgLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIHJldHVybiBvcmlnaW5hbEVuZCguLi5hcmdzKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9maWxlcy9yZWFkXCIsXHJcbiAgICAgICAgICAgIChyZXE6IGFueSwgcmVzOiBhbnksIG5leHQ6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKFxyXG4gICAgICAgICAgICAgICAgICAgIHJlcS51cmwgfHwgXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAvLyBGSVg6IFVSTCBkZWNvZGUgdGhlIHBhdGggdG8gaGFuZGxlIENoaW5lc2UgY2hhcmFjdGVyc1xyXG4gICAgICAgICAgICAgICAgICBsZXQgZmlsZVBhdGggPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcInBhdGhcIik7XHJcbiAgICAgICAgICAgICAgICAgIGlmICghZmlsZVBhdGgpIHJldHVybiBuZXh0KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBEZWNvZGUgVVJJIGNvbXBvbmVudHMgdG8gaGFuZGxlIENoaW5lc2UgY2hhcmFjdGVyc1xyXG4gICAgICAgICAgICAgICAgICBmaWxlUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBQMC1DSzogXHU2NTJGXHU2MzAxIC52aXRlcHJlc3MvYWdlbnQvIFx1OERFRlx1NUY4NFx1RkYwOGNoZWNrcG9pbnQgXHU1QjU4XHU1MEE4XHVGRjA5XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQWdlbnRQYXRoID1cclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aC5zdGFydHNXaXRoKFwiLnZpdGVwcmVzcy9cIikgfHxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aC5zdGFydHNXaXRoKFwiLnZpdGVwcmVzc1xcXFxcIik7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VQYXRoID0gaXNBZ2VudFBhdGhcclxuICAgICAgICAgICAgICAgICAgICA/IHByb2Nlc3MuY3dkKClcclxuICAgICAgICAgICAgICAgICAgICA6IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcImRvY3NcIik7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKFxyXG4gICAgICAgICAgICAgICAgICAgIGJhc2VQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLnJlcGxhY2UoL15cXC8vLCBcIlwiKSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZnVsbFBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcInRleHQvcGxhaW5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChmcy5yZWFkRmlsZVN5bmMoZnVsbFBhdGgsIFwidXRmLThcIikpO1xyXG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXCJGaWxlIG5vdCBmb3VuZFwiKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChTdHJpbmcoZSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2ZpbGVzL3NhdmVcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoOiBmaWxlUGF0aCwgY29udGVudCB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmICghZmlsZVBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiUGF0aCByZXF1aXJlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFAwLUNLOiBcdTY1MkZcdTYzMDEgLnZpdGVwcmVzcy9hZ2VudC8gXHU4REVGXHU1Rjg0XHVGRjA4Y2hlY2twb2ludCBcdTVCNThcdTUwQThcdUZGMDlcclxuICAgICAgICAgICAgICAgICAgY29uc3QgaXNBZ2VudFBhdGggPVxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLnN0YXJ0c1dpdGgoXCIudml0ZXByZXNzL1wiKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLnN0YXJ0c1dpdGgoXCIudml0ZXByZXNzXFxcXFwiKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZVBhdGggPSBpc0FnZW50UGF0aFxyXG4gICAgICAgICAgICAgICAgICAgID8gcHJvY2Vzcy5jd2QoKVxyXG4gICAgICAgICAgICAgICAgICAgIDogcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwiZG9jc1wiKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoXHJcbiAgICAgICAgICAgICAgICAgICAgYmFzZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGgucmVwbGFjZSgvXlxcLy8sIFwiXCIpLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU3ODZFXHU0RkREXHU3NkVFXHU1RjU1XHU1QjU4XHU1NzI4XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRpciA9IHBhdGguZGlybmFtZShmdWxsUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLm1rZGlyKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTUxOTlcdTUxNjVcdTY1ODdcdTRFRjZcclxuICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKGZ1bGxQYXRoLCBjb250ZW50LCBcInV0Zi04XCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU4QkIwXHU1RjU1XHU2NTg3XHU0RUY2XHU3Q0ZCXHU3RURGXHU0RThCXHU0RUY2XHVGRjA4XHU2NjgyXHU2NUY2XHU0RjdGXHU3NTI4IHN5c3RlbSBcdTY1RTVcdTVGRDdcdUZGMDlcclxuICAgICAgICAgICAgICAgICAgc3lzdGVtLmRlYnVnKFwiZmlsZS5zYXZlZFwiLCBgRmlsZSBzYXZlZDogJHtmaWxlUGF0aH1gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgc2l6ZTogY29udGVudC5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIEdpdCBcdTY0Q0RcdTRGNUNcclxuICAgICAgICAgICAgICAgICAgZ2l0Q29tbWl0KFxyXG4gICAgICAgICAgICAgICAgICAgIGZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIGBjb250ZW50OiBcdTY2RjRcdTY1QjAgJHtwYXRoLmJhc2VuYW1lKGZ1bGxQYXRoKX1gLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiBcIlNhdmVkXCIgfSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU4OUU2XHU1M0QxXHU3MEVEXHU2NkY0XHU2NUIwXHJcbiAgICAgICAgICAgICAgICAgIHRyaWdnZXJSZWxvYWQoKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJXSBTYXZlIGZpbGUgZXJyb3I6XCIsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gUmVuYW1lIGZpbGUgLSBcdTc3MUZcdTZCNjNcdTc2ODRcdTY1ODdcdTRFRjZcdTkxQ0RcdTU0N0RcdTU0MERcdUZGMDhcdTRGRUVcdTY1MzlcdTY1ODdcdTRFRjZcdTU0MERcdTY3MkNcdThFQUJcdUZGMDlcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2ZpbGVzL3JlbmFtZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHtcclxuICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBuZXdOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZUZyb250bWF0dGVyID0gdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBuZXdGaWxlTmFtZSA9XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3TmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICAgLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bXlxcd1xccy1dL2csIFwiXCIpXHJcbiAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCBcIl9cIikgKyBleHQ7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhdGggPSBwYXRoLmpvaW4oZGlyLCBuZXdGaWxlTmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBmdWxsT2xkUGF0aCA9IHBhdGgucmVzb2x2ZShcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIFwiZG9jc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZpbGVQYXRoLnJlcGxhY2UoL15cXC8vLCBcIlwiKSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbE5ld1BhdGggPSBwYXRoLnJlc29sdmUoXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgICAgICAgICAgICAgICBcImRvY3NcIixcclxuICAgICAgICAgICAgICAgICAgICBuZXdQYXRoLnJlcGxhY2UoL15cXC8vLCBcIlwiKSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGZpbGUgZXhpc3RzXHJcbiAgICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmdWxsT2xkUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiRmlsZSBub3QgZm91bmRcIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YXJnZXQgYWxyZWFkeSBleGlzdHNcclxuICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZnVsbE5ld1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIlRhcmdldCBmaWxlIGFscmVhZHkgZXhpc3RzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbE9sZFBhdGgsIFwidXRmLThcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZnJvbnRtYXR0ZXIgdGl0bGUgaWYgcmVxdWVzdGVkXHJcbiAgICAgICAgICAgICAgICAgIGlmICh1cGRhdGVGcm9udG1hdHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50LnN0YXJ0c1dpdGgoXCItLS1cIikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50Lm1hdGNoKC90aXRsZTpcXHMqLisvKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC90aXRsZTpcXHMqLisvLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGB0aXRsZTogJHtuZXdOYW1lfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8tLS1cXG4vLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGAtLS1cXG50aXRsZTogJHtuZXdOYW1lfVxcbmAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgLS0tXFxudGl0bGU6ICR7bmV3TmFtZX1cXG4tLS1cXG5cXG4ke2NvbnRlbnR9YDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFdyaXRlIHRvIG5ldyBmaWxlXHJcbiAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZnVsbE5ld1BhdGgsIGNvbnRlbnQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gRGVsZXRlIG9sZCBmaWxlXHJcbiAgICAgICAgICAgICAgICAgIGZzLnVubGlua1N5bmMoZnVsbE9sZFBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gR2l0IG9wZXJhdGlvbnNcclxuICAgICAgICAgICAgICAgICAgZ2l0Q29tbWl0KFxyXG4gICAgICAgICAgICAgICAgICAgIFtmdWxsT2xkUGF0aCwgZnVsbE5ld1BhdGhdLFxyXG4gICAgICAgICAgICAgICAgICAgIGBjb250ZW50OiBcdTkxQ0RcdTU0N0RcdTU0MEQgJHtwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKX0gLT4gJHtuZXdGaWxlTmFtZX1gLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2xkUGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1BhdGg6IG5ld1BhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld05hbWU6IG5ld0ZpbGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogbmV3TmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTg5RTZcdTUzRDFcdTcwRURcdTY2RjRcdTY1QjBcclxuICAgICAgICAgICAgICAgICAgdHJpZ2dlclJlbG9hZCgpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIE1vdmUgZmlsZVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvZmlsZXMvbW92ZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZnJvbTogZnJvbVBhdGgsIHRvOiB0b1BhdGggfSA9IGJvZHk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxGcm9tUGF0aCA9IHBhdGgucmVzb2x2ZShcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIFwiZG9jc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIGZyb21QYXRoLnJlcGxhY2UoL15cXC8vLCBcIlwiKSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFRvUGF0aCA9IHBhdGgucmVzb2x2ZShcclxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIFwiZG9jc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvUGF0aC5yZXBsYWNlKC9eXFwvLywgXCJcIiksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgdGFyZ2V0IGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShmdWxsVG9QYXRoKSwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBNb3ZlIGZpbGVcclxuICAgICAgICAgICAgICAgICAgZnMucmVuYW1lU3luYyhmdWxsRnJvbVBhdGgsIGZ1bGxUb1BhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gR2l0IG9wZXJhdGlvbnNcclxuICAgICAgICAgICAgICAgICAgZ2l0Q29tbWl0KFxyXG4gICAgICAgICAgICAgICAgICAgIFtmdWxsRnJvbVBhdGgsIGZ1bGxUb1BhdGhdLFxyXG4gICAgICAgICAgICAgICAgICAgIGBjb250ZW50OiBcdTc5RkJcdTUyQTggJHtwYXRoLmJhc2VuYW1lKGZyb21QYXRoKX0gLT4gJHtwYXRoLmJhc2VuYW1lKHRvUGF0aCl9YCxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyB0b1BhdGggfSB9KSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTg5RTZcdTUzRDFcdTcwRURcdTY2RjRcdTY1QjBcclxuICAgICAgICAgICAgICAgICAgdHJpZ2dlclJlbG9hZCgpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gRGVsZXRlIGZpbGUgKFx1NjUyRlx1NjMwMVx1OEY2Rlx1NTIyMFx1OTY2NClcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2ZpbGVzL2RlbGV0ZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogZmlsZVBhdGgsIHBlcm1hbmVudCA9IGZhbHNlIH0gPSBib2R5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gRklYOiBVUkwgZGVjb2RlIHRoZSBwYXRoXHJcbiAgICAgICAgICAgICAgICAgIGxldCBkZWNvZGVkUGF0aCA9IGZpbGVQYXRoO1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRlY29kZWRQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KGZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKFxyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXHJcbiAgICAgICAgICAgICAgICAgICAgXCJkb2NzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVjb2RlZFBhdGgucmVwbGFjZSgvXlxcLy8sIFwiXCIpLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGZ1bGxQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJGaWxlIG5vdCBmb3VuZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChwZXJtYW5lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTZDMzhcdTRFNDVcdTUyMjBcdTk2NjRcclxuICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBnaXRDb21taXQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBmdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgIGBjb250ZW50OiBcdTZDMzhcdTRFNDVcdTUyMjBcdTk2NjQgJHtwYXRoLmJhc2VuYW1lKGRlY29kZWRQYXRoKX1gLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU4RjZGXHU1MjIwXHU5NjY0XHVGRjFBXHU3OUZCXHU1MkE4XHU1MjMwIC50cmFzaCBcdTY1ODdcdTRFRjZcdTU5MzlcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFzaERpciA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcImRvY3NcIiwgXCIudHJhc2hcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHRyYXNoRGlyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZnMubWtkaXJTeW5jKHRyYXNoRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1NzUxRlx1NjIxMCB0cmFzaCBcdTY1ODdcdTRFRjZcdTU0MERcdUZGMUFcdTUzOUZcdTY1ODdcdTRFRjZcdTU0MERfXHU2NUY2XHU5NUY0XHU2MjMzXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZXN0YW1wID0gbmV3IERhdGUoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bOi5dL2csIFwiLVwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbE5hbWUgPSBwYXRoLmJhc2VuYW1lKGRlY29kZWRQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0cmFzaEZpbGVOYW1lID0gYCR7b3JpZ2luYWxOYW1lfS4ke3RpbWVzdGFtcH0udHJhc2hgO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYXNoUGF0aCA9IHBhdGguam9pbih0cmFzaERpciwgdHJhc2hGaWxlTmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1NzlGQlx1NTJBOFx1NjU4N1x1NEVGNlxyXG4gICAgICAgICAgICAgICAgICAgIGZzLnJlbmFtZVN5bmMoZnVsbFBhdGgsIHRyYXNoUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1NEZERFx1NUI1OFx1NTE0M1x1NjU3MFx1NjM2RVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFQYXRoID0gYCR7dHJhc2hQYXRofS5tZXRhLmpzb25gO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGFEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxQYXRoOiBkZWNvZGVkUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZXhwaXJlc0F0OiBuZXcgRGF0ZShcclxuICAgICAgICAgICAgICAgICAgICAgICAgRGF0ZS5ub3coKSArIDMwICogMjQgKiA2MCAqIDYwICogMTAwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICkudG9JU09TdHJpbmcoKSwgLy8gMzBcdTU5MjlcdTU0MEVcdThGQzdcdTY3MUZcclxuICAgICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoXHJcbiAgICAgICAgICAgICAgICAgICAgICBtZXRhUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KG1ldGFEYXRhLCBudWxsLCAyKSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBnaXRDb21taXQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBbZnVsbFBhdGgsIHRyYXNoUGF0aCwgbWV0YVBhdGhdLmZpbHRlcigocCkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZnMuZXhpc3RzU3luYyhwKSxcclxuICAgICAgICAgICAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgICAgICAgICAgICBgY29udGVudDogXHU1MjIwXHU5NjY0KFx1NTZERVx1NjUzNlx1N0FEOSkgJHtvcmlnaW5hbE5hbWV9YCxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU4OUU2XHU1M0QxXHU3MEVEXHU2NkY0XHU2NUIwXHJcbiAgICAgICAgICAgICAgICAgIHRyaWdnZXJSZWxvYWQoKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEldIERlbGV0ZSBlcnJvcjpcIiwgZSk7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBcdTgzQjdcdTUzRDZcdTU2REVcdTY1MzZcdTdBRDlcdTUyMTdcdTg4NjhcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2ZpbGVzL3RyYXNoXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFzaERpciA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcImRvY3NcIiwgXCIudHJhc2hcIik7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmModHJhc2hEaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogW10gfSkpO1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyh0cmFzaERpcik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0cmFzaEl0ZW1zID0gW107XHJcblxyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChmaWxlLmVuZHNXaXRoKFwiLm1ldGEuanNvblwiKSkgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBtZXRhUGF0aCA9IHBhdGguam9pbih0cmFzaERpciwgYCR7ZmlsZX0ubWV0YS5qc29uYCk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKHRyYXNoRGlyLCBmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBmcy5zdGF0U3luYyhmdWxsUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBsZXQgbWV0YTogYW55ID0ge307XHJcbiAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKG1ldGFQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBtZXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMobWV0YVBhdGgsIFwidXRmLThcIikpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHt9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIHRyYXNoSXRlbXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IGZpbGUsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogZmlsZS5yZXBsYWNlKC9cXC5cXGR7NH0tXFxkezJ9LVxcZHsyfVQuKiQvLCBcIlwiKSxcclxuICAgICAgICAgICAgICAgICAgICBkZWxldGVkQXQ6IG1ldGEuZGVsZXRlZEF0IHx8IHN0YXRzLm10aW1lLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgZXhwaXJlc0F0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgbWV0YS5leHBpcmVzQXQgfHxcclxuICAgICAgICAgICAgICAgICAgICAgIG5ldyBEYXRlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBEYXRlLm5vdygpICsgMzAgKiAyNCAqIDYwICogNjAgKiAxMDAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgIG9yaWdpbmFsUGF0aDogbWV0YS5vcmlnaW5hbFBhdGggfHwgXCJ1bmtub3duXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc2l6ZTogc3RhdHMuc2l6ZSxcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogdHJhc2hJdGVtcyB9KSk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFx1NjA2Mlx1NTkwRFx1NjU4N1x1NEVGNlxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvZmlsZXMvcmVzdG9yZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdHJhc2hJZCB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHRyYXNoRGlyID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwiZG9jc1wiLCBcIi50cmFzaFwiKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgdHJhc2hQYXRoID0gcGF0aC5qb2luKHRyYXNoRGlyLCB0cmFzaElkKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgbWV0YVBhdGggPSBgJHt0cmFzaFBhdGh9Lm1ldGEuanNvbmA7XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmModHJhc2hQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJUcmFzaCBpdGVtIG5vdCBmb3VuZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1OEJGQlx1NTNENlx1NTE0M1x1NjU3MFx1NjM2RVxyXG4gICAgICAgICAgICAgICAgICBsZXQgb3JpZ2luYWxQYXRoID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMobWV0YVBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBKU09OLnBhcnNlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZVN5bmMobWV0YVBhdGgsIFwidXRmLThcIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxQYXRoID0gbWV0YS5vcmlnaW5hbFBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU1OTgyXHU2NzlDXHU2Q0ExXHU2NzA5XHU1MTQzXHU2NTcwXHU2MzZFXHVGRjBDXHU1QzFEXHU4QkQ1XHU0RUNFXHU2NTg3XHU0RUY2XHU1NDBEXHU4OUUzXHU2NzkwXHJcbiAgICAgICAgICAgICAgICAgIGlmICghb3JpZ2luYWxQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxQYXRoID0gdHJhc2hJZC5yZXBsYWNlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgL1xcLlxcZHs0fS1cXGR7Mn0tXFxkezJ9VC4qXFwudHJhc2gkLyxcclxuICAgICAgICAgICAgICAgICAgICAgIFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdG9yZWRQYXRoID0gcGF0aC5yZXNvbHZlKFxyXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXHJcbiAgICAgICAgICAgICAgICAgICAgXCJkb2NzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgb3JpZ2luYWxQYXRoLnJlcGxhY2UoL15cXC8vLCBcIlwiKSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1Nzg2RVx1NEZERFx1NzZFRVx1NjgwN1x1NzZFRVx1NUY1NVx1NUI1OFx1NTcyOFxyXG4gICAgICAgICAgICAgICAgICBmcy5ta2RpclN5bmMocGF0aC5kaXJuYW1lKHJlc3RvcmVkUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU3OUZCXHU1MkE4XHU2NTg3XHU0RUY2XHU1NkRFXHU1MzlGXHU0RjREXHU3RjZFXHJcbiAgICAgICAgICAgICAgICAgIGZzLnJlbmFtZVN5bmModHJhc2hQYXRoLCByZXN0b3JlZFBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU1MjIwXHU5NjY0XHU1MTQzXHU2NTcwXHU2MzZFXHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKG1ldGFQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLnVubGlua1N5bmMobWV0YVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICBnaXRDb21taXQoXHJcbiAgICAgICAgICAgICAgICAgICAgW3Jlc3RvcmVkUGF0aF0sXHJcbiAgICAgICAgICAgICAgICAgICAgYGNvbnRlbnQ6IFx1NjA2Mlx1NTkwRFx1NjU4N1x1NEVGNiAke3BhdGguYmFzZW5hbWUob3JpZ2luYWxQYXRoKX1gLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgcmVzdG9yZWRQYXRoOiBvcmlnaW5hbFBhdGggfSxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1ODlFNlx1NTNEMVx1NzBFRFx1NjZGNFx1NjVCMFxyXG4gICAgICAgICAgICAgICAgICB0cmlnZ2VyUmVsb2FkKCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJXSBSZXN0b3JlIGVycm9yOlwiLCBlKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBHZXQgZmlsZSBjb250ZW50IChmb3IgZXhwb3J0KVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvZmlsZXMvY29udGVudFwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChcclxuICAgICAgICAgICAgICAgICAgcmVxLnVybCB8fCBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGxldCBmaWxlUGF0aCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwicGF0aFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGVQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIlBhdGggcmVxdWlyZWRcIiB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIEZJWDogVVJMIGRlY29kZSB0aGUgcGF0aCB0byBoYW5kbGUgQ2hpbmVzZSBjaGFyYWN0ZXJzXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBmaWxlUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudChmaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIElmIGRlY29kaW5nIGZhaWxzLCB1c2Ugb3JpZ2luYWwgcGF0aFxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFNlY3VyaXR5OiBwcmV2ZW50IGRpcmVjdG9yeSB0cmF2ZXJzYWxcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuUGF0aCA9IGZpbGVQYXRoXHJcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXC5cXC4vZywgXCJcIilcclxuICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL15cXC8vLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIFwiZG9jc1wiLCBjbGVhblBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSV0gRXhwb3J0IGNvbnRlbnQ6XCIsIHtcclxuICAgICAgICAgICAgICAgICAgY2xlYW5QYXRoLFxyXG4gICAgICAgICAgICAgICAgICBmdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgZXhpc3RzOiBmcy5leGlzdHNTeW5jKGZ1bGxQYXRoKSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJGaWxlIG5vdCBmb3VuZDogXCIgKyBjbGVhblBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZ1bGxQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIik7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gR2V0IGNvbnRlbnQgZXJyb3I6XCIsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBCYXRjaCBleHBvcnQgYXJ0aWNsZXNcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hcnRpY2xlcy9iYXRjaC1leHBvcnRcIixcclxuICAgICAgICAgICAgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aHMsIGZvcm1hdCA9IFwibWRcIiB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFwYXRocyB8fCAhQXJyYXkuaXNBcnJheShwYXRocykgfHwgcGF0aHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJQYXRocyBhcnJheSByZXF1aXJlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBKU1ppcCA9IGF3YWl0IGltcG9ydChcImpzemlwXCIpLnRoZW4oKG0pID0+IG0uZGVmYXVsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgemlwID0gbmV3IEpTWmlwKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkZCBlYWNoIGZpbGUgdG8gemlwXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmaWxlUGF0aCBvZiBwYXRocykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5QYXRoID0gZmlsZVBhdGhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFwuaHRtbCQvLCBcIi5tZFwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eXFwvLywgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkb2NzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY2xlYW5QYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZnVsbFBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmdWxsUGF0aCwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhdGguYmFzZW5hbWUoY2xlYW5QYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB6aXAuZmlsZShmaWxlTmFtZSwgY29udGVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBgW0FQSV0gRmFpbGVkIHRvIGFkZCBmaWxlICR7ZmlsZVBhdGh9OmAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIEdlbmVyYXRlIHppcFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHppcENvbnRlbnQgPSBhd2FpdCB6aXAuZ2VuZXJhdGVBc3luYyh7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm5vZGVidWZmZXJcIixcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL3ppcFwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCJDb250ZW50LURpc3Bvc2l0aW9uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCJhcnRpY2xlcy1leHBvcnQtJHtEYXRlLm5vdygpfS56aXBcImAsXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKHppcENvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJXSBCYXRjaCBleHBvcnQgZXJyb3I6XCIsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgICAvLyBGaWxlcyBBUEkgLSBcdTc2RUVcdTVGNTVcdTY0Q0RcdTRGNUNcclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG4gICAgICAgICAgLy8gXHU1MjFCXHU1RUZBXHU3NkVFXHU1RjU1XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9maWxlcy9ta2RpclwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogZGlyUGF0aCB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmICghZGlyUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJQYXRoIHJlcXVpcmVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU2NTJGXHU2MzAxIC5za2lsbHMgXHU3QjQ5XHU5MTREXHU3RjZFXHU3NkVFXHU1RjU1XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ29uZmlnUGF0aCA9XHJcbiAgICAgICAgICAgICAgICAgICAgZGlyUGF0aC5zdGFydHNXaXRoKFwiLlwiKSB8fCBkaXJQYXRoLnN0YXJ0c1dpdGgoXCJfXCIpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBiYXNlUGF0aCA9IGlzQ29uZmlnUGF0aFxyXG4gICAgICAgICAgICAgICAgICAgID8gcHJvY2Vzcy5jd2QoKVxyXG4gICAgICAgICAgICAgICAgICAgIDogcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksIFwiZG9jc1wiKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoYmFzZVBhdGgsIGRpclBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU1Qjg5XHU1MTY4XHU2OEMwXHU2N0U1XHJcbiAgICAgICAgICAgICAgICAgIGlmICghZnVsbFBhdGguc3RhcnRzV2l0aChiYXNlUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMztcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiQWNjZXNzIGRlbmllZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLm1rZGlyKGZ1bGxQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gXHU1MjE3XHU1MUZBXHU3NkVFXHU1RjU1XHU1MTg1XHU1QkI5XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9maWxlcy9saXN0XCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKFxyXG4gICAgICAgICAgICAgICAgICByZXEudXJsIHx8IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0fWAsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpclBhdGggPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcInBhdGhcIikgfHwgXCIuXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gXHU4OUUzXHU3ODAxVVJMXHU3RjE2XHU3ODAxXHU3Njg0XHU4REVGXHU1Rjg0XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBkaXJQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KGRpclBhdGgpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAvLyBcdTg5RTNcdTc4MDFcdTU5MzFcdThEMjVcdTRGN0ZcdTc1MjhcdTUzOUZcdThERUZcdTVGODRcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBcdTY1MkZcdTYzMDEgLnNraWxscyBcdTdCNDlcdTkxNERcdTdGNkVcdTc2RUVcdTVGNTVcclxuICAgICAgICAgICAgICAgIGNvbnN0IGlzQ29uZmlnUGF0aCA9XHJcbiAgICAgICAgICAgICAgICAgIGRpclBhdGguc3RhcnRzV2l0aChcIi5cIikgfHwgZGlyUGF0aC5zdGFydHNXaXRoKFwiX1wiKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGJhc2VQYXRoID0gaXNDb25maWdQYXRoXHJcbiAgICAgICAgICAgICAgICAgID8gcHJvY2Vzcy5jd2QoKVxyXG4gICAgICAgICAgICAgICAgICA6IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcImRvY3NcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShiYXNlUGF0aCwgZGlyUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gXHU1Qjg5XHU1MTY4XHU2OEMwXHU2N0U1XHJcbiAgICAgICAgICAgICAgICBpZiAoIWZ1bGxQYXRoLnN0YXJ0c1dpdGgoYmFzZVBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAzO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIkFjY2VzcyBkZW5pZWRcIiB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmdWxsUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJEaXJlY3Rvcnkgbm90IGZvdW5kXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IGZzLnN0YXRTeW5jKGZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgICAgIGlmICghc3RhdHMuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIlBhdGggaXMgbm90IGEgZGlyZWN0b3J5XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBjb25zdCBlbnRyaWVzID0gZnMucmVhZGRpclN5bmMoZnVsbFBhdGgsIHtcclxuICAgICAgICAgICAgICAgICAgd2l0aEZpbGVUeXBlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBlbnRyaWVzLm1hcCgoZW50cnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgIG5hbWU6IGVudHJ5Lm5hbWUsXHJcbiAgICAgICAgICAgICAgICAgIGlzRGlyZWN0b3J5OiBlbnRyeS5pc0RpcmVjdG9yeSgpLFxyXG4gICAgICAgICAgICAgICAgICBpc0ZpbGU6IGVudHJ5LmlzRmlsZSgpLFxyXG4gICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLmpvaW4oZGlyUGF0aCwgZW50cnkubmFtZSkucmVwbGFjZSgvXFxcXC9nLCBcIi9cIiksXHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogaXRlbXMgfSkpO1xyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gQWdlbnQgQVBJIFJvdXRlcyAtIEFJLU5hdGl2ZSBPcGVyYXRpb25zXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIC8vIEFnZW50IFx1NEVGQlx1NTJBMVx1NjNEMFx1NEVBNFx1RkYwOFx1NTMzQVx1NTIwNlx1NEVCQVx1NURFNVx1NjRDRFx1NEY1Q1x1RkYwOVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvYWdlbnQvdGFza1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHtcclxuICAgICAgICAgICAgICAgICAgICB0YXNrSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogZmlsZUNvbnRlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGEsXHJcbiAgICAgICAgICAgICAgICAgIH0gPSBib2R5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUoXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgICAgICAgICAgICAgICBcImRvY3NcIixcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aC5yZXBsYWNlKC9eXFwvLywgXCJcIiksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZnVsbFBhdGgsIGZpbGVDb250ZW50KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIEFnZW50IFx1NzI3OVx1NUI5QVx1NzY4NCBHaXQgXHU2M0QwXHU0RUE0XHU2ODNDXHU1RjBGXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbW1pdE1lc3NhZ2UgPSBgYWdlbnQoJHt0YXNrSWR9KTogJHttZXRhZGF0YT8uZGVzY3JpcHRpb24gfHwgXCJBdXRvIHVwZGF0ZVwifSR7bWV0YWRhdGE/LnNraWxsID8gYCBbJHttZXRhZGF0YS5za2lsbH1dYCA6IFwiXCJ9XHJcbj5cclxuPiBBdXRob3I6IGFnZW50XHJcbj4gTW9kZWw6ICR7bWV0YWRhdGE/Lm1vZGVsIHx8IFwidW5rbm93blwifVxyXG4+IFNraWxsOiAke21ldGFkYXRhPy5za2lsbCB8fCBcInVua25vd25cIn1cclxuPiBUb2tlbnM6ICR7bWV0YWRhdGE/LnRva2VucyB8fCAwfVxyXG4+IENvc3Q6ICQke21ldGFkYXRhPy5jb3N0IHx8IDB9XHJcbj4gUGFyZW50LVRhc2s6ICR7dGFza0lkfWA7XHJcblxyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgYWRkIFwiJHtmdWxsUGF0aH1cImApO1xyXG4gICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgY29tbWl0IC1tIFwiJHtjb21taXRNZXNzYWdlfVwiYCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiR2l0IGNvbW1pdCBmYWlsZWQ6XCIsIGUpO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTRGRERcdTVCNThcdTRFRkJcdTUyQTFcdTcyQjZcdTYwMDFcdTUyMzAgLnZpdGVwcmVzcy9hZ2VudC9tZW1vcnkvdGFza3MvXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2tEaXIgPSBwYXRoLnJlc29sdmUoXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgICAgICAgICAgICAgICBcIi52aXRlcHJlc3MvYWdlbnQvbWVtb3J5L3Rhc2tzXCIsXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyh0YXNrRGlyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyU3luYyh0YXNrRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCB0YXNrRmlsZSA9IHBhdGguam9pbih0YXNrRGlyLCBgJHt0YXNrSWR9Lmpzb25gKTtcclxuICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhcclxuICAgICAgICAgICAgICAgICAgICB0YXNrRmlsZSxcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShcclxuICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWQ6IHRhc2tJZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBcImNvbXBsZXRlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWV0YWRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgIG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAyLFxyXG4gICAgICAgICAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIHRhc2tJZCB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBBZ2VudCBcdTRFMEFcdTRFMEJcdTY1ODdcdTUyMURcdTU5Q0JcdTUzMTZcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hZ2VudC9jb250ZXh0L2luaXRcIixcclxuICAgICAgICAgICAgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogZmlsZVBhdGggfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1OEJGQlx1NTNENlx1NjU4N1x1NEVGNlx1NTM4Nlx1NTNGMlx1NTQ4Q1x1NzZGOFx1NTE3M1x1NUI5RVx1NEY1M1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRleHREaXIgPSBwYXRoLnJlc29sdmUoXHJcbiAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCIudml0ZXByZXNzL2FnZW50L21lbW9yeVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0aWVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoaXN0b3J5OiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTVDMURcdThCRDVcdThCRkJcdTUzRDZcdTVCOUVcdTRGNTNcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpdGllc1BhdGggPSBwYXRoLmpvaW4oXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0RGlyLFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCJlbnRpdGllcy9jb25jZXB0cy5qc29uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhlbnRpdGllc1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBlbnRpdGllc0RhdGEgPSBKU09OLnBhcnNlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmcy5yZWFkRmlsZVN5bmMoZW50aXRpZXNQYXRoLCBcInV0Zi04XCIpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgIGVudGl0aWVzID0gT2JqZWN0LnZhbHVlcyhlbnRpdGllc0RhdGEpLmZpbHRlcigoZTogYW55KSA9PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnNvdXJjZXM/LmluY2x1ZGVzKGZpbGVQYXRoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZXh0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXRpZXM6IGVudGl0aWVzLnNsaWNlKDAsIDUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHJlbGF0ZWRBcnRpY2xlczogZW50aXRpZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gQWdlbnQgXHU0RUZCXHU1MkExXHU3MkI2XHU2MDAxXHU2N0U1XHU4QkUyXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9hZ2VudC90YXNrL3N0YXR1c1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwgfHwgXCJcIiwgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YCk7XHJcbiAgICAgICAgICAgICAgY29uc3QgdGFza0lkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJpZFwiKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYgKCF0YXNrSWQpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIk1pc3NpbmcgdGFzayBJRFwiIH0pKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGNvbnN0IHRhc2tGaWxlID0gcGF0aC5yZXNvbHZlKFxyXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgICAgICAgICAgIFwiLnZpdGVwcmVzcy9hZ2VudC9tZW1vcnkvdGFza3NcIixcclxuICAgICAgICAgICAgICAgIGAke3Rhc2tJZH0uanNvbmAsXHJcbiAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmModGFza0ZpbGUpKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXNrRGF0YSA9IEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKHRhc2tGaWxlLCBcInV0Zi04XCIpKTtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh0YXNrRGF0YSkpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogXCJUYXNrIG5vdCBmb3VuZFwiIH0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBHaXQgXHU2M0QwXHU0RUE0IEFQSVx1RkYwOFx1NzUyOFx1NEU4RSBBZ2VudCBcdTdCNDlcdTU3M0FcdTY2NkZcdTc3MUZcdTVCOUVcdTYzRDBcdTRFQTRcdTY1RTVcdTVGRDdcdUZGMDlcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2dpdC9jb21taXRcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCB7IGZpbGVzLCBtZXNzYWdlIH0gPSBib2R5O1xyXG4gICAgICAgICAgICAgICAgICBnaXRDb21taXQoZmlsZXMsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFNsdWdpZnkgQVBJXHVGRjA4XHU2NTJGXHU2MzAxXHU0RTJEXHU2NTg3XHU4RjZDXHU2MzYyXHVGRjA5XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS91dGlscy9zbHVnaWZ5XCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0ZXh0IH0gPSBib2R5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgbGV0IHNsdWcgPSB0ZXh0O1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBpbnlpbkZuID0gcmVxdWlyZShcInBpbnlpblwiKTtcclxuICAgICAgICAgICAgICAgICAgICBzbHVnID0gKFxyXG4gICAgICAgICAgICAgICAgICAgICAgdHlwZW9mIHBpbnlpbkZuID09PSBcImZ1bmN0aW9uXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgPyBwaW55aW5Gbih0ZXh0LCB7IHN0eWxlOiBcIm5vcm1hbFwiIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDogcGlueWluRm4uZGVmYXVsdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgID8gcGlueWluRm4uZGVmYXVsdCh0ZXh0LCB7IHN0eWxlOiBcIm5vcm1hbFwiIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgOiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLmZsYXQoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgLmpvaW4oXCItXCIpO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgaWYgcGlueWluIGZhaWxzXHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIHNsdWcgPSBzbHVnXHJcbiAgICAgICAgICAgICAgICAgICAgLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvW15cXHdcXHMtXS9nLCBcIlwiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXHMrL2csIFwiLVwiKVxyXG4gICAgICAgICAgICAgICAgICAgIC5zdWJzdHJpbmcoMCwgNTApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzbHVnIH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBHaXQgXHU2NUU1XHU1RkQ3IEFQSVx1RkYwOFx1NTMzQVx1NTIwNlx1NEVCQVx1NURFNVx1NTQ4QyBBZ2VudFx1RkYwOVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvZ2l0L2xvZ1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbG9nT3V0cHV0ID0gZXhlY1N5bmMoXHJcbiAgICAgICAgICAgICAgICAgICdnaXQgbG9nIC0tcHJldHR5PWZvcm1hdDpcXCd7XCJoYXNoXCI6XCIlSFwiLFwibWVzc2FnZVwiOlwiJXNcIixcImRhdGVcIjpcIiVhaVwiLFwiYXV0aG9yXCI6XCIlYW5cIn1cXCcgLTIwJyxcclxuICAgICAgICAgICAgICAgICAgeyBlbmNvZGluZzogXCJ1dGYtOFwiLCBjd2Q6IHByb2Nlc3MuY3dkKCkgfSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dzID0gbG9nT3V0cHV0XHJcbiAgICAgICAgICAgICAgICAgIC5zcGxpdChcIlxcblwiKVxyXG4gICAgICAgICAgICAgICAgICAuZmlsdGVyKChsaW5lKSA9PiBsaW5lLnRyaW0oKSlcclxuICAgICAgICAgICAgICAgICAgLm1hcCgobGluZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkobG9ncykpO1xyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBcIkZhaWxlZCB0byBnZXQgZ2l0IGxvZ1wiIH0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gRHluYW1pYyBTaWRlYmFyIEFQSSAtIFx1NTJBOFx1NjAwMVx1NEZBN1x1OEZCOVx1NjgwRlxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgICAgICAgICAvLyBcdTUyQThcdTYwMDEgU2lkZWJhciBBUEkgLSBcdThGRDRcdTU2REVcdTVCOUVcdTY1RjZcdTc2ODRcdTY1ODdcdTRFRjZcdTdFRDNcdTY3ODRcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL3NpZGViYXJcIiwgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoXHJcbiAgICAgICAgICAgICAgICAgIHJlcS51cmwgfHwgXCJcIixcclxuICAgICAgICAgICAgICAgICAgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YCxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWN0aW9uID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJzZWN0aW9uXCIpIHx8IFwicG9zdHNcIjtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBcdTRGN0ZcdTc1MjhcdTY1QjBcdTc2ODRcdTY1ODdcdTY4NjNcdTdFRDNcdTY3ODRcdTYyNkJcdTYzQ0ZcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gc2NhbkRvY1N0cnVjdHVyZShcclxuICAgICAgICAgICAgICAgICAgcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIFwiZG9jcy9zZWN0aW9uc1wiLCBzZWN0aW9uKSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzaWRlYmFyRGF0YSA9IHRvU2lkZWJhckZvcm1hdChub2Rlcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ2FjaGUtQ29udHJvbFwiLCBcIm5vLWNhY2hlXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogc2lkZWJhckRhdGEsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEldIFNpZGViYXIgZXJyb3I6XCIsIGUpO1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIGdlbmVyYXRlIHNpZGViYXJcIixcclxuICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFx1NzZFRVx1NUY1NVx1NjgxMSBBUEkgLSBcdThGRDRcdTU2REVcdTUyNERcdTdBRUZcdTkwMDlcdTYyRTlcdTU2NjhcdTk3MDBcdTg5ODFcdTc2ODRcdTY4M0NcdTVGMEZcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9kaXJlY3RvcnktdHJlZVwiLFxyXG4gICAgICAgICAgICBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChcclxuICAgICAgICAgICAgICAgICAgICByZXEudXJsIHx8IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YCxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2VjdGlvbiA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwic2VjdGlvblwiKSB8fCBcInBvc3RzXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBub2RlcyA9IHNjYW5Eb2NTdHJ1Y3R1cmUoXHJcbiAgICAgICAgICAgICAgICAgICAgcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIFwiZG9jcy9zZWN0aW9uc1wiLCBzZWN0aW9uKSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgdHJlZURhdGEgPSB0b0RpcmVjdG9yeVRyZWUobm9kZXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHRyZWVEYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gRGlyZWN0b3J5IHRyZWUgZXJyb3I6XCIsIGUpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBnZW5lcmF0ZSBkaXJlY3RvcnkgdHJlZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgICAvLyBBcnRpY2xlcyBBUEkgLSBcdTY1ODdcdTdBRTBcdTdCQTFcdTc0MDZcclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG4gICAgICAgICAgY29uc3QgU0VDVElPTlNfUEFUSCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcImRvY3Mvc2VjdGlvbnNcIik7XHJcblxyXG4gICAgICAgICAgLy8gXHU3NTFGXHU2MjEwIFVSTCBcdTUzQ0JcdTU5N0RcdTc2ODQgc2x1Z1x1RkYwOFx1NEZERFx1NzU1OVx1NEUyRFx1NjU4N1x1RkYwOVxyXG4gICAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVTbHVnKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICBpZiAoIXRpdGxlIHx8ICF0aXRsZS50cmltKCkpIHJldHVybiBcInVudGl0bGVkXCI7XHJcblxyXG4gICAgICAgICAgICAvLyBcdTUzRUFcdTY2RkZcdTYzNjJcdTRFMERcdTVCODlcdTUxNjhcdTc2ODRcdTY1ODdcdTRFRjZcdTdDRkJcdTdFREZcdTVCNTdcdTdCMjZcdUZGMENcdTRGRERcdTc1NTlcdTRFMkRcdTY1ODdcclxuICAgICAgICAgICAgLy8gXHU2NkZGXHU2MzYyOiAvIFxcIDogKiA/IFwiIDwgPiB8IFx1NEUzQSAtXHJcbiAgICAgICAgICAgIGxldCByZXN1bHQgPSB0aXRsZVxyXG4gICAgICAgICAgICAgIC50cmltKClcclxuICAgICAgICAgICAgICAucmVwbGFjZSgvW1xcXFwvKj86XCI8PnxdL2csIFwiLVwiKSAvLyBcdTY2RkZcdTYzNjJcdTk3NUVcdTZDRDVcdTVCNTdcdTdCMjZcdTRFM0FcdThGREVcdTVCNTdcdTdCMjZcclxuICAgICAgICAgICAgICAucmVwbGFjZSgvXFxzKy9nLCBcIi1cIikgLy8gXHU3QTdBXHU2ODNDXHU4RjZDXHU4RkRFXHU1QjU3XHU3QjI2XHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoLy0rL2csIFwiLVwiKSAvLyBcdTU5MUFcdTRFMkFcdThGREVcdTVCNTdcdTdCMjZcdTU0MDhcdTVFNzZcclxuICAgICAgICAgICAgICAucmVwbGFjZSgvXi18LSQvZywgXCJcIikgLy8gXHU1M0JCXHU5NjY0XHU5OTk2XHU1QzNFXHU4RkRFXHU1QjU3XHU3QjI2XHJcbiAgICAgICAgICAgICAgLnN1YnN0cmluZygwLCAxMDApOyAvLyBcdTk2NTBcdTUyMzZcdTk1N0ZcdTVFQTZcclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQgfHwgXCJ1bnRpdGxlZFwiO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFx1OTAxMlx1NUY1Mlx1NjI2Qlx1NjNDRlx1NjU4N1x1N0FFMFxyXG4gICAgICAgICAgYXN5bmMgZnVuY3Rpb24gc2NhbkFydGljbGVzKFxyXG4gICAgICAgICAgICBkaXI6IHN0cmluZyxcclxuICAgICAgICAgICAgYmFzZVBhdGg6IHN0cmluZyA9IFwiXCIsXHJcbiAgICAgICAgICApOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGFydGljbGVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGVudHJpZXMgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkZGlyKGRpciwge1xyXG4gICAgICAgICAgICAgICAgd2l0aEZpbGVUeXBlczogdHJ1ZSxcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBwYXRoLmpvaW4oYmFzZVBhdGgsIGVudHJ5Lm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgIWVudHJ5Lm5hbWUuc3RhcnRzV2l0aChcIi5cIikpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc3ViQXJ0aWNsZXMgPSBhd2FpdCBzY2FuQXJ0aWNsZXMoXHJcbiAgICAgICAgICAgICAgICAgICAgZnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgcmVsYXRpdmVQYXRoLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICBhcnRpY2xlcy5wdXNoKC4uLnN1YkFydGljbGVzKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXHJcbiAgICAgICAgICAgICAgICAgIGVudHJ5LmlzRmlsZSgpICYmXHJcbiAgICAgICAgICAgICAgICAgIGVudHJ5Lm5hbWUuZW5kc1dpdGgoXCIubWRcIikgJiZcclxuICAgICAgICAgICAgICAgICAgZW50cnkubmFtZSAhPT0gXCJpbmRleC5tZFwiXHJcbiAgICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGZ1bGxQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBtZXRhID0gZXh0cmFjdEFydGljbGVNZXRhKGNvbnRlbnQsIHJlbGF0aXZlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgIGFydGljbGVzLnB1c2gobWV0YSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxyXG4gICAgICAgICAgICByZXR1cm4gYXJ0aWNsZXM7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gXHU2M0QwXHU1M0Q2XHU2NTg3XHU3QUUwXHU1MTQzXHU2NTcwXHU2MzZFXHJcbiAgICAgICAgICBmdW5jdGlvbiBleHRyYWN0QXJ0aWNsZU1ldGEoY29udGVudDogc3RyaW5nLCByZWxhdGl2ZVBhdGg6IHN0cmluZykge1xyXG4gICAgICAgICAgICBjb25zdCBmcm9udG1hdHRlck1hdGNoID0gY29udGVudC5tYXRjaCgvXi0tLVxcbihbXFxzXFxTXSo/KVxcbi0tLS8pO1xyXG4gICAgICAgICAgICBjb25zdCBtZXRhOiBhbnkgPSB7fTtcclxuICAgICAgICAgICAgaWYgKGZyb250bWF0dGVyTWF0Y2gpIHtcclxuICAgICAgICAgICAgICBmcm9udG1hdHRlck1hdGNoWzFdLnNwbGl0KFwiXFxuXCIpLmZvckVhY2goKGxpbmU6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKC9eKFxcdyspOlxccyooLispJC8pO1xyXG4gICAgICAgICAgICAgICAgaWYgKG1hdGNoKVxyXG4gICAgICAgICAgICAgICAgICBtZXRhW21hdGNoWzFdXSA9IG1hdGNoWzJdLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgXCJcIik7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29uc3QgdGl0bGVNYXRjaCA9IGNvbnRlbnQubWF0Y2goL14jXFxzKyguKykkL20pO1xyXG4gICAgICAgICAgICBjb25zdCB0aXRsZSA9XHJcbiAgICAgICAgICAgICAgbWV0YS50aXRsZSB8fFxyXG4gICAgICAgICAgICAgIHRpdGxlTWF0Y2g/LlsxXSB8fFxyXG4gICAgICAgICAgICAgIHBhdGguYmFzZW5hbWUocmVsYXRpdmVQYXRoLCBcIi5tZFwiKTtcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICBwYXRoOiByZWxhdGl2ZVBhdGgucmVwbGFjZSgvXFxcXC9nLCBcIi9cIiksXHJcbiAgICAgICAgICAgICAgdGl0bGUsXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IG1ldGEuZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICAgICAgdGFnczogbWV0YS50YWdzXHJcbiAgICAgICAgICAgICAgICA/IG1ldGEudGFncy5zcGxpdChcIixcIikubWFwKCh0OiBzdHJpbmcpID0+IHQudHJpbSgpKVxyXG4gICAgICAgICAgICAgICAgOiBbXSxcclxuICAgICAgICAgICAgICBkYXRlOiBtZXRhLmRhdGUsXHJcbiAgICAgICAgICAgICAgdXBkYXRlZEF0OiBtZXRhLnVwZGF0ZWRBdCxcclxuICAgICAgICAgICAgICB3b3JkQ291bnQ6IGNvbnRlbnQucmVwbGFjZSgvXFxzKy9nLCBcIlwiKS5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgaXNQdWJsaXNoZWQ6ICFyZWxhdGl2ZVBhdGguaW5jbHVkZXMoXCIvZHJhZnRzL1wiKSxcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBcdThGODVcdTUyQTlcdTUxRkRcdTY1NzBcdUZGMUFcdTRFQ0UgRG9jTm9kZSBcdTY4MTFcdTYyNDFcdTVFNzNcdTUzMTZcdTRFM0FcdTY1ODdcdTdBRTBcdTUyMTdcdTg4NjhcclxuICAgICAgICAgIGZ1bmN0aW9uIGZsYXR0ZW5BcnRpY2xlcyhub2RlczogRG9jTm9kZVtdKTogYW55W10ge1xyXG4gICAgICAgICAgICBjb25zdCBhcnRpY2xlczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT09IFwiZmlsZVwiKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTUzRjZcdTVCNTBcdTY1ODdcdTRFRjZcclxuICAgICAgICAgICAgICAgIGFydGljbGVzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICBwYXRoOiBub2RlLnBhdGgsXHJcbiAgICAgICAgICAgICAgICAgIHRpdGxlOiBub2RlLnRpdGxlLFxyXG4gICAgICAgICAgICAgICAgICBpc0xlYWY6IHRydWUsXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKG5vZGUudHlwZSA9PT0gXCJmb2xkZXJcIiAmJiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTkwMTJcdTVGNTJcdTU5MDRcdTc0MDZcdTVCNTBcdTk4NzlcclxuICAgICAgICAgICAgICAgIGFydGljbGVzLnB1c2goLi4uZmxhdHRlbkFydGljbGVzKG5vZGUuY2hpbGRyZW4pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBhcnRpY2xlcztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBcdThGODVcdTUyQTlcdTUxRkRcdTY1NzBcdUZGMUFcdThGN0JcdTkxQ0ZcdTdFQTdcdTYyNkJcdTYzQ0ZcdTY1ODdcdTdBRTBcdTUyMTdcdTg4NjhcdUZGMDhcdTc1MjhcdTRFOEUgQCBcdTVGMTVcdTc1MjhcdUZGMDlcclxuICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIHNjYW5BcnRpY2xlc0Zvckxpc3QoXHJcbiAgICAgICAgICAgIGRpcjogc3RyaW5nLFxyXG4gICAgICAgICAgICBzZWN0aW9uOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIHJlc3VsdHM6IEFycmF5PHsgcGF0aDogc3RyaW5nOyB0aXRsZTogc3RyaW5nOyBzZWN0aW9uOiBzdHJpbmcgfT4sXHJcbiAgICAgICAgICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZGRpcihkaXIsIHtcclxuICAgICAgICAgICAgICAgIHdpdGhGaWxlVHlwZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5Lm5hbWUuc3RhcnRzV2l0aChcIi5cIikpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKGRpciwgZW50cnkubmFtZSk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBmdWxsUGF0aFxyXG4gICAgICAgICAgICAgICAgICAucmVwbGFjZShTRUNUSU9OU19QQVRIICsgcGF0aC5zZXAsIFwiXCIpXHJcbiAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcL2csIFwiL1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgICAgICAgICBhd2FpdCBzY2FuQXJ0aWNsZXNGb3JMaXN0KGZ1bGxQYXRoLCBzZWN0aW9uLCByZXN1bHRzKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZW50cnkuaXNGaWxlKCkgJiYgZW50cnkubmFtZS5lbmRzV2l0aChcIi5tZFwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAvLyBcdThCRkJcdTUzRDZcdTY4MDdcdTk4OThcclxuICAgICAgICAgICAgICAgICAgbGV0IHRpdGxlID0gZW50cnkubmFtZS5yZXBsYWNlKFwiLm1kXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShcclxuICAgICAgICAgICAgICAgICAgICAgIGZ1bGxQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCJ1dGYtOFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXJNYXRjaCA9IGNvbnRlbnQubWF0Y2goXHJcbiAgICAgICAgICAgICAgICAgICAgICAvXi0tLVxcbihbXFxzXFxTXSo/KVxcbi0tLS8sXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZnJvbnRtYXR0ZXJNYXRjaCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGl0bGVNYXRjaCA9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZyb250bWF0dGVyTWF0Y2hbMV0ubWF0Y2goL150aXRsZTpcXHMqKC4rKSQvbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAodGl0bGVNYXRjaCkgdGl0bGUgPSB0aXRsZU1hdGNoWzFdLnRyaW0oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU1OTgyXHU2NzlDXHU2Q0ExXHU2NzA5IGZyb250bWF0dGVyIFx1NjgwN1x1OTg5OFx1RkYwQ1x1NUMxRFx1OEJENVx1NEVDRVx1NTE4NVx1NUJCOVx1NEUyRFx1NjNEMFx1NTNENlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGl0bGUgfHwgdGl0bGUgPT09IGVudHJ5Lm5hbWUucmVwbGFjZShcIi5tZFwiLCBcIlwiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudFRpdGxlTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eI1xccysoLispJC9tKTtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50VGl0bGVNYXRjaClcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUgPSBjb250ZW50VGl0bGVNYXRjaFsxXS50cmltKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTVGRkRcdTc1NjVcdThCRkJcdTUzRDZcdTk1MTlcdThCRUZcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICBwYXRoOiByZWxhdGl2ZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgdGl0bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgc2VjdGlvbixcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIHtcclxuICAgICAgICAgICAgICAvLyBcdTc2RUVcdTVGNTVcdTRFMERcdTVCNThcdTU3MjhcdTYyMTZcdTY1RTBcdTZDRDVcdThCQkZcdTk1RUVcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFx1NjU4N1x1N0FFMFx1NTIxN1x1ODg2OFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2FydGljbGVzL2xpc3RcIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NjI2Qlx1NjNDRlx1NjI0MFx1NjcwOSBzZWN0aW9uXHVGRjBDXHU1MzA1XHU1NDJCXHU1QjhDXHU2NTc0XHU1MTQzXHU2NTcwXHU2MzZFXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbEFydGljbGVzOiBhbnlbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBzZWN0aW9ucyA9IFtcInBvc3RzXCIsIFwia25vd2xlZGdlXCIsIFwicmVzb3VyY2VzXCIsIFwiYWJvdXRcIl07XHJcblxyXG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygc2VjdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWN0aW9uUGF0aCA9IHBhdGguam9pbihTRUNUSU9OU19QQVRILCBzZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhzZWN0aW9uUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NEY3Rlx1NzUyOCBzY2FuQXJ0aWNsZXMgXHU4M0I3XHU1M0Q2XHU1QjhDXHU2NTc0XHU1MTQzXHU2NTcwXHU2MzZFXHVGRjA4XHU1MzA1XHU2MkVDXHU2NUU1XHU2NzFGXHVGRjA5XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhcnRpY2xlcyA9IGF3YWl0IHNjYW5BcnRpY2xlcyhzZWN0aW9uUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBcdTZERkJcdTUyQTAgc2VjdGlvbiBcdTUyNERcdTdGMDBcdTUyMzAgcGF0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgYXJ0aWNsZXMuZm9yRWFjaCgoYSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhLnBhdGggPSBgJHtzZWN0aW9ufS8ke2EucGF0aH1gO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBhbGxBcnRpY2xlcy5wdXNoKC4uLmFydGljbGVzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBkYXRhOiBhbGxBcnRpY2xlcyxcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJGYWlsZWQgdG8gbGlzdCBhcnRpY2xlc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFx1ODNCN1x1NTNENlx1NjI0MFx1NjcwOVx1NjU4N1x1N0FFMFx1NTIxN1x1ODg2OFx1RkYwOFx1NzUyOFx1NEU4RSBAIFx1NUYxNVx1NzUyOFx1RkYwQ1x1OEY3Qlx1OTFDRlx1N0VBN1x1RkYwOVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2FydGljbGVzL2xpc3QtYWxsXCIsXHJcbiAgICAgICAgICAgIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBhcnRpY2xlczogQXJyYXk8e1xyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IHN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogc3RyaW5nO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlY3Rpb246IHN0cmluZztcclxuICAgICAgICAgICAgICAgICAgfT4gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2VjdGlvbnMgPSBbXCJwb3N0c1wiLCBcImtub3dsZWRnZVwiLCBcInJlc291cmNlc1wiLCBcImFib3V0XCJdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBzZWN0aW9uIG9mIHNlY3Rpb25zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VjdGlvblBhdGggPSBwYXRoLmpvaW4oU0VDVElPTlNfUEFUSCwgc2VjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoc2VjdGlvblBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBzY2FuQXJ0aWNsZXNGb3JMaXN0KHNlY3Rpb25QYXRoLCBzZWN0aW9uLCBhcnRpY2xlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YTogYXJ0aWNsZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIGxpc3QgYXJ0aWNsZXNcIixcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBcdTY0MUNcdTdEMjJcdTY1ODdcdTdBRTBcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hcnRpY2xlcy9zZWFyY2hcIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoXHJcbiAgICAgICAgICAgICAgICAgIHJlcS51cmwgfHwgXCJcIixcclxuICAgICAgICAgICAgICAgICAgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YCxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBxID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJxXCIpO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYXJ0aWNsZXMgPSBhd2FpdCBzY2FuQXJ0aWNsZXMoU0VDVElPTlNfUEFUSCk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXJ5ID0gKHEgfHwgXCJcIikudG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgcmVzdWx0cyA9IGFydGljbGVzLmZpbHRlcihcclxuICAgICAgICAgICAgICAgICAgICAoYSkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgIGEudGl0bGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhxdWVyeSkgfHxcclxuICAgICAgICAgICAgICAgICAgICAgIGEuZGVzY3JpcHRpb24/LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocXVlcnkpLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdHMgfSkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBzZWFyY2ggYXJ0aWNsZXNcIixcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBcdTgzQjdcdTUzRDZcdTY1ODdcdTdBRTBcdThCRTZcdTYwQzVcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hcnRpY2xlcy9kZXRhaWxcIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwoXHJcbiAgICAgICAgICAgICAgICAgIHJlcS51cmwgfHwgXCJcIixcclxuICAgICAgICAgICAgICAgICAgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YCxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhcnRpY2xlUGF0aCA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwicGF0aFwiKTtcclxuICAgICAgICAgICAgICAgIGlmICghYXJ0aWNsZVBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiUGF0aCByZXF1aXJlZFwiIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihTRUNUSU9OU19QQVRILCBhcnRpY2xlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbFBhdGgsIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBleHRyYWN0QXJ0aWNsZU1ldGEoY29udGVudCwgYXJ0aWNsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyAuLi5tZXRhLCBjb250ZW50IH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiQXJ0aWNsZSBub3QgZm91bmRcIixcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBcdTUyMUJcdTVFRkFcdTY1ODdcdTdBRTBcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2FydGljbGVzL2NyZWF0ZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHlUZXh0ID0gQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbQVBJXSBSYXcgYm9keTpcIiwgYm9keVRleHQuc3Vic3RyaW5nKDAsIDIwMCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYm9keTtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgYm9keSA9IEpTT04ucGFyc2UoYm9keVRleHQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHBhcnNlRXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gSlNPTiBwYXJzZSBlcnJvcjpcIiwgcGFyc2VFcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiSW52YWxpZCBKU09OXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHtcclxuICAgICAgICAgICAgICAgICAgICAgIHRpdGxlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzZWN0aW9uID0gXCJwb3N0c1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGFncyA9IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgcGFyZW50UGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgIGlzQ2hpbGREb2MsXHJcbiAgICAgICAgICAgICAgICAgICAgfSA9IGJvZHk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJbQVBJXSBDcmVhdGluZyBhcnRpY2xlOlwiLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0aXRsZSxcclxuICAgICAgICAgICAgICAgICAgICAgIHNlY3Rpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICBpc0NoaWxkRG9jLFxyXG4gICAgICAgICAgICAgICAgICAgICAgcGFyZW50UGF0aCxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aXRsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiVGl0bGUgcmVxdWlyZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU3NTFGXHU2MjEwIHNsdWdcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzbHVnID0gZ2VuZXJhdGVTbHVnKHRpdGxlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdChcIlRcIilbMF07XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBgJHtzbHVnfS5tZGA7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCB0YXJnZXREaXI6IHN0cmluZztcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZmlsZVBhdGg6IHN0cmluZztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU1OTA0XHU3NDA2XHU1QjUwXHU2NTg3XHU2ODYzXHU1MjFCXHU1RUZBXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hpbGREb2MgJiYgcGFyZW50UGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU4OUUzXHU2NzkwXHU3MjM2XHU2NTg3XHU2ODYzXHU4REVGXHU1Rjg0XHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBcdTU5MDRcdTc0MDZcdTUzRUZcdTgwRkRcdTc2ODQgLmh0bWwgXHU2MjE2IC5tZCBcdTU0MEVcdTdGMDBcdUZGMENcdTRFRTVcdTUzQ0FcdTVGMDBcdTU5MzRcdTc2ODQgLyBcdTU0OENcdTY3MkJcdTVDM0VcdTc2ODQgL1xyXG4gICAgICAgICAgICAgICAgICAgICAgbGV0IGNsZWFuUGFyZW50UGF0aCA9IHBhcmVudFBhdGhcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL1xcLihodG1sfG1kKSQvaSwgXCJcIilcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL15cXC8vLCBcIlwiKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFwvJC8sIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU1OTgyXHU2NzlDXHU4REVGXHU1Rjg0XHU0RUU1IHNlY3Rpb25zLyBcdTVGMDBcdTU5MzRcdUZGMENcdTUzQkJcdTYzODlcdTVCODNcdUZGMDhcdTU2RTBcdTRFM0EgU0VDVElPTlNfUEFUSCBcdTVERjJcdTdFQ0ZcdTUzMDVcdTU0MkJcdUZGMDlcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblBhcmVudFBhdGguc3RhcnRzV2l0aChcInNlY3Rpb25zL1wiKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhblBhcmVudFBhdGggPSBjbGVhblBhcmVudFBhdGguc3Vic3RyaW5nKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwic2VjdGlvbnMvXCIubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU3ODZFXHU0RkREXHU4REVGXHU1Rjg0XHU0RTBEXHU1MzA1XHU1NDJCIC5tZCBcdTU0MEVcdTdGMDBcdUZGMDhcdTUyNERcdTk3NjJcdTVERjJcdTU5MDRcdTc0MDZcdUZGMENcdThGRDlcdTkxQ0NcdTUxOERcdTZCMjFcdTc4NkVcdThCQTRcdUZGMDlcclxuICAgICAgICAgICAgICAgICAgICAgIGNsZWFuUGFyZW50UGF0aCA9IGNsZWFuUGFyZW50UGF0aC5yZXBsYWNlKC9cXC5tZCQvaSwgXCJcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU2M0QwXHU1M0Q2XHU3MjM2XHU2NTg3XHU2ODYzXHU1NDBEXHU3OUYwXHVGRjA4XHU4REVGXHU1Rjg0XHU3Njg0XHU2NzAwXHU1NDBFXHU0RTAwXHU5MEU4XHU1MjA2XHVGRjA5XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnROYW1lID0gcGF0aC5iYXNlbmFtZShjbGVhblBhcmVudFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU3MjM2XHU2NTg3XHU2ODYzXHU3Njg0XHU1QjhDXHU2NTc0XHU2NTg3XHU0RUY2XHU4REVGXHU1Rjg0XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRGdWxsUGF0aCA9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGguam9pbihTRUNUSU9OU19QQVRILCBjbGVhblBhcmVudFBhdGgpICsgXCIubWRcIjtcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NzIzNlx1NjU4N1x1Njg2M1x1NjI0MFx1NTcyOFx1NzZFRVx1NUY1NVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50RGlyID0gcGF0aC5kaXJuYW1lKHBhcmVudEZ1bGxQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NzIzNlx1NjU4N1x1Njg2M1x1NUJGOVx1NUU5NFx1NzY4NFx1NjU4N1x1NEVGNlx1NTkzOVx1OERFRlx1NUY4NFx1RkYwOFx1NzUyOFx1NEU4RVx1NUI1OFx1NjUzRVx1NUI1MFx1NjU4N1x1Njg2M1x1RkYwOVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50Rm9sZGVyUGF0aCA9IHBhdGguam9pbihwYXJlbnREaXIsIHBhcmVudE5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSV0gUGFyZW50IGluZm86XCIsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50RnVsbFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudERpcixcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50TmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyZW50Rm9sZGVyUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NjhDMFx1NjdFNVx1NzIzNlx1NjU4N1x1Njg2M1x1NjYyRlx1NTQyNlx1NEUzQVx1NTNGNlx1NUI1MFx1NjU4N1x1Njg2M1x1RkYwOFx1NTM3M1x1NjYyRlx1NTQyNlx1NUI1OFx1NTcyOFx1NTQwQ1x1NTQwRFx1NjU4N1x1NEVGNlx1NTkzOVx1RkYwOVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNMZWFmRG9jID0gIWZzLmV4aXN0c1N5bmMocGFyZW50Rm9sZGVyUGF0aCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGlzTGVhZkRvYykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBcdTUzRjZcdTVCNTBcdTY1ODdcdTY4NjNcdUZGMUFcdTk3MDBcdTg5ODFcdTUyMUJcdTVFRkFcdTU0MENcdTU0MERcdTY1ODdcdTRFRjZcdTU5MzlcdTVFNzZcdTc5RkJcdTUyQThcdTUzOUZcdTY1ODdcdTY4NjNcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJbQVBJXSBQYXJlbnQgaXMgbGVhZiBkb2N1bWVudCwgY3JlYXRpbmcgZm9sZGVyIGFuZCBtb3ZpbmcuLi5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFx1NTIxQlx1NUVGQVx1NTQwQ1x1NTQwRFx1NjU4N1x1NEVGNlx1NTkzOVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy5ta2RpcihwYXJlbnRGb2xkZXJQYXRoLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmVjdXJzaXZlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIDIuIFx1NUMwNlx1NTM5Rlx1NjU4N1x1Njg2M1x1NzlGQlx1NTJBOFx1NTIzMFx1NjU4N1x1NEVGNlx1NTkzOVx1NTE4NVx1RkYwOFx1NEY3Rlx1NzUyOCBpbmRleC5tZFx1RkYwQ1ZpdGVQcmVzcyBcdTUzOUZcdTc1MUZcdTY1MkZcdTYzMDEgL2ZvbGRlci8gXHUyMTkyIGZvbGRlci9pbmRleC5tZFx1RkYwOVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXJlbnRQYXRoID0gcGF0aC5qb2luKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHBhcmVudEZvbGRlclBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJpbmRleC5tZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXJlbnRGdWxsUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy5yZW5hbWUoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYXJlbnRGdWxsUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFBhcmVudFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiW0FQSV0gTW92ZWQgcGFyZW50IGRvYyB0bzpcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFBhcmVudFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gMy4gXHU1NzI4XHU2NTg3XHU0RUY2XHU1OTM5XHU1MTg1XHU1MjFCXHU1RUZBXHU1QjUwXHU2NTg3XHU2ODYzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldERpciA9IHBhcmVudEZvbGRlclBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBcdTk3NUVcdTUzRjZcdTVCNTBcdTY1ODdcdTY4NjNcdUZGMUFcdTc2RjRcdTYzQTVcdTU3MjhcdTVERjJcdTY3MDlcdTY1ODdcdTRFRjZcdTU5MzlcdTUxODVcdTUyMUJcdTVFRkFcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJbQVBJXSBQYXJlbnQgYWxyZWFkeSBoYXMgZm9sZGVyLCBjcmVhdGluZyBpbnNpZGUuLi5cIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0RGlyID0gcGFyZW50Rm9sZGVyUGF0aDtcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsIGZpbGVuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU2NjZFXHU5MDFBXHU2NTg3XHU2ODYzXHU1MjFCXHU1RUZBXHJcbiAgICAgICAgICAgICAgICAgICAgICB0YXJnZXREaXIgPSBwYXRoLmpvaW4oU0VDVElPTlNfUEFUSCwgc2VjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsIGZpbGVuYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSV0gVGFyZ2V0IHBhdGg6XCIsIHsgdGFyZ2V0RGlyLCBmaWxlUGF0aCB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU3ODZFXHU0RkREXHU3NkVFXHU1RjU1XHU1QjU4XHU1NzI4XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIodGFyZ2V0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU1MjFCXHU1RUZBXHU2NTg3XHU3QUUwXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXIgPSBgLS0tXHJcbnRpdGxlOiAke3RpdGxlfVxyXG5kYXRlOiAke2RhdGV9XHJcbnRhZ3M6XHJcbiR7dGFncy5tYXAoKHQ6IHN0cmluZykgPT4gYCAgLSAke3R9YCkuam9pbihcIlxcblwiKX1cclxuLS0tXHJcblxyXG4ke2NvbnRlbnR9YDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKGZpbGVQYXRoLCBmcm9udG1hdHRlciwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltBUEldIEZpbGUgd3JpdHRlbiBzdWNjZXNzZnVsbHk6XCIsIGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU2RTA1XHU5NjY0IHNpZGViYXIgXHU3RjEzXHU1QjU4XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJTaWRlYmFyQ2FjaGUoc2VjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVsYXRpdmUoU0VDVElPTlNfUEFUSCwgZmlsZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCBcIi9cIiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGl0bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmdWxsUGF0aDogZmlsZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTg5RTZcdTUzRDFcdTcwRURcdTY2RjRcdTY1QjBcclxuICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyUmVsb2FkKCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gQ3JlYXRlIGFydGljbGUgZXJyb3I6XCIsIGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBcIkZhaWxlZCB0byBjcmVhdGUgYXJ0aWNsZTogXCIgKyAoZSBhcyBFcnJvcikubWVzc2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pKCk7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBcdTY2RjRcdTY1QjBcdTY1ODdcdTdBRTBcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hcnRpY2xlcy91cGRhdGVcIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUFVUXCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoOiBhcnRpY2xlUGF0aCwgY29udGVudCB9ID0gYm9keTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGguam9pbihTRUNUSU9OU19QQVRILCBhcnRpY2xlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMud3JpdGVGaWxlKGZ1bGxQYXRoLCBjb250ZW50LCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQXJ0aWNsZSB1cGRhdGVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTg5RTZcdTUzRDFcdTcwRURcdTY2RjRcdTY1QjBcclxuICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyUmVsb2FkKCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIHVwZGF0ZSBhcnRpY2xlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBcdTUzRDFcdTVFMDNcdTY1ODdcdTdBRTBcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hcnRpY2xlcy9wdWJsaXNoXCIsXHJcbiAgICAgICAgICAgIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBhdGg6IGFydGljbGVQYXRoIH0gPSBib2R5O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNvdXJjZVBhdGggPSBwYXRoLmpvaW4oU0VDVElPTlNfUEFUSCwgYXJ0aWNsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBhcnRpY2xlUGF0aC5yZXBsYWNlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCIvZHJhZnRzL1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCIvcG9zdHMvXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihTRUNUSU9OU19QQVRILCB0YXJnZXRQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy5ta2RpcihwYXRoLmRpcm5hbWUoZGVzdFBhdGgpLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZWN1cnNpdmU6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMucmVuYW1lKHNvdXJjZVBhdGgsIGRlc3RQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU2RTA1XHU5NjY0XHU3NkY4XHU1MTczIHNlY3Rpb24gXHU3Njg0XHU3RjEzXHU1QjU4XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJTaWRlYmFyQ2FjaGUoXCJkcmFmdHNcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJTaWRlYmFyQ2FjaGUoXCJwb3N0c1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBuZXdQYXRoOiB0YXJnZXRQYXRoIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTg5RTZcdTUzRDFcdTcwRURcdTY2RjRcdTY1QjBcclxuICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyUmVsb2FkKCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIHB1Ymxpc2ggYXJ0aWNsZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gXHU1MjIwXHU5NjY0XHU2NTg3XHU3QUUwXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFxyXG4gICAgICAgICAgICBcIi9hcGkvYXJ0aWNsZXMvZGVsZXRlXCIsXHJcbiAgICAgICAgICAgIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBhdGg6IGFydGljbGVQYXRoIH0gPSBib2R5O1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKFNFQ1RJT05TX1BBVEgsIGFydGljbGVQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU4M0I3XHU1M0Q2IHNlY3Rpb24gXHU1NDBEXHU3OUYwXHU3NTI4XHU0RThFXHU2RTA1XHU5NjY0XHU3RjEzXHU1QjU4XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VjdGlvbiA9IGFydGljbGVQYXRoLnNwbGl0KFwiL1wiKVswXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMudW5saW5rKGZ1bGxQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU2RTA1XHU5NjY0IHNpZGViYXIgXHU3RjEzXHU1QjU4XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJTaWRlYmFyQ2FjaGUoc2VjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiQXJ0aWNsZSBkZWxldGVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTg5RTZcdTUzRDFcdTcwRURcdTY2RjRcdTY1QjBcclxuICAgICAgICAgICAgICAgICAgICB0cmlnZ2VyUmVsb2FkKCk7XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiRmFpbGVkIHRvIGRlbGV0ZSBhcnRpY2xlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBcdTc5RkJcdTUyQTgvXHU5MUNEXHU1NDdEXHU1NDBEXHU2NTg3XHU3QUUwXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFxyXG4gICAgICAgICAgICBcIi9hcGkvYXJ0aWNsZXMvbW92ZVwiLFxyXG4gICAgICAgICAgICBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBmcm9tLCB0byB9ID0gYm9keTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKFNFQ1RJT05TX1BBVEgsIGZyb20pO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKFNFQ1RJT05TX1BBVEgsIHRvKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU4M0I3XHU1M0Q2IHNlY3Rpb24gXHU1NDBEXHU3OUYwXHU3NTI4XHU0RThFXHU2RTA1XHU5NjY0XHU3RjEzXHU1QjU4XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbVNlY3Rpb24gPSBmcm9tLnNwbGl0KFwiL1wiKVswXTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0b1NlY3Rpb24gPSB0by5zcGxpdChcIi9cIilbMF07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLm1rZGlyKHBhdGguZGlybmFtZShkZXN0UGF0aCksIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlY3Vyc2l2ZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy5yZW5hbWUoc291cmNlUGF0aCwgZGVzdFBhdGgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTZFMDVcdTk2NjRcdTc2RjhcdTUxNzMgc2VjdGlvbiBcdTc2ODRcdTdGMTNcdTVCNThcclxuICAgICAgICAgICAgICAgICAgICBjbGVhclNpZGViYXJDYWNoZShmcm9tU2VjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyb21TZWN0aW9uICE9PSB0b1NlY3Rpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNsZWFyU2lkZWJhckNhY2hlKHRvU2VjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5ld1BhdGg6IHRvIH0gfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU4OUU2XHU1M0QxXHU3MEVEXHU2NkY0XHU2NUIwXHJcbiAgICAgICAgICAgICAgICAgICAgdHJpZ2dlclJlbG9hZCgpO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIkZhaWxlZCB0byBtb3ZlIGFydGljbGVcIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgICAvLyBMb2dzIEFQSSAtIFx1NjVFNVx1NUZEN1x1N0NGQlx1N0VERlx1RkYwOFx1NEY3Rlx1NzUyOExvZ1N5c3RlbVx1RkYwOVxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgICAgICAgICAvLyBcdTZERkJcdTUyQTBcdTY1RTVcdTVGRDdcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2xvZ3MvYWRkXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgLy8gXHU0RjdGXHU3NTI4IFN0cnVjdHVyZWRMb2dnZXIgXHU2MzAxXHU0RTQ1XHU1MzE2XHU2NUU1XHU1RkQ3XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGxldmVsID0gKGJvZHkubGV2ZWwgfHwgXCJpbmZvXCIpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gYm9keS5ldmVudCB8fCBcInN5c3RlbVwiO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gYm9keS5tZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBtZXRhZGF0YSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBhY3RvcjogYm9keS5hY3RvciB8fCBcInN5c3RlbVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZTogYm9keS5zb3VyY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgdGFza0lkOiBib2R5LnRhc2tJZCxcclxuICAgICAgICAgICAgICAgICAgICBza2lsbE5hbWU6IGJvZHkuc2tpbGxOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGR1cmF0aW9uOiBib2R5LmR1cmF0aW9uLFxyXG4gICAgICAgICAgICAgICAgICAgIC4uLmJvZHkubWV0YWRhdGEsXHJcbiAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiZGVidWdcIjpcclxuICAgICAgICAgICAgICAgICAgICAgIHN0cnVjdHVyZWRMb2cuZGVidWcoZXZlbnQsIG1lc3NhZ2UsIG1ldGFkYXRhKTtcclxuICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ3YXJuXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIndhcm5pbmdcIjpcclxuICAgICAgICAgICAgICAgICAgICAgIHN0cnVjdHVyZWRMb2cud2FybihldmVudCwgbWVzc2FnZSwgbWV0YWRhdGEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcImVycm9yXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHJ1Y3R1cmVkTG9nLmVycm9yKGV2ZW50LCBtZXNzYWdlLCBtZXRhZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIFwic3VjY2Vzc1wiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgc3RydWN0dXJlZExvZy5zdWNjZXNzKGV2ZW50LCBtZXNzYWdlLCBtZXRhZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgc3RydWN0dXJlZExvZy5pbmZvKGV2ZW50LCBtZXNzYWdlLCBtZXRhZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBcdTgzQjdcdTUzRDZcdTY1RTVcdTVGRDdcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2xvZ3MvcmVjZW50XCIsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCB8fCBcIlwiLCBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gKTtcclxuICAgICAgICAgICAgICBjb25zdCBjb3VudCA9IHBhcnNlSW50KHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwiY291bnRcIikgfHwgXCIxMDBcIik7XHJcbiAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImxldmVsXCIpIGFzIGFueTtcclxuICAgICAgICAgICAgICBjb25zdCBsb2dzID1cclxuICAgICAgICAgICAgICAgIChhd2FpdCAoc3RydWN0dXJlZExvZyBhcyBhbnkpLmdldFJlY2VudExvZ3M/Lihjb3VudCwgbGV2ZWwpKSB8fFxyXG4gICAgICAgICAgICAgICAgW107XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGxvZ3MgfSkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gXHU4M0I3XHU1M0Q2XHU2NUU1XHU1RkQ3XHU3RURGXHU4QkExXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9sb2dzL3N0YXRzXCIsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gKGF3YWl0IChzdHJ1Y3R1cmVkTG9nIGFzIGFueSkuZ2V0U3RhdHM/LigpKSB8fCB7fTtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc3RhdHMgfSkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gXHU2N0U1XHU4QkUyXHU2NUU1XHU1RkQ3IChcdTY1MkZcdTYzMDFcdThGQzdcdTZFRTQpXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9sb2dzL3F1ZXJ5XCIsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKFxyXG4gICAgICAgICAgICAgICAgICByZXEudXJsIHx8IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0fWAsXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgTE9HU19ESVIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCIubG9nc1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoTE9HU19ESVIpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogW10gfSkpO1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gXHU4QkZCXHU1M0Q2XHU2MjQwXHU2NzA5XHU2NUU1XHU1RkQ3XHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlcyA9IGZzXHJcbiAgICAgICAgICAgICAgICAgIC5yZWFkZGlyU3luYyhMT0dTX0RJUilcclxuICAgICAgICAgICAgICAgICAgLmZpbHRlcigoZikgPT4gZi5lbmRzV2l0aChcIi5qc29ubFwiKSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWxsTG9nczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oTE9HU19ESVIsIGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCBcInV0Zi04XCIpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBsaW5lcyA9IGNvbnRlbnQuc3BsaXQoXCJcXG5cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9nID0gSlNPTi5wYXJzZShsaW5lKTtcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NUU5NFx1NzUyOFx1OEZDN1x1NkVFNFx1Njc2MVx1NEVGNlxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImxldmVsXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSB1cmwuc2VhcmNoUGFyYW1zLmdldChcImNhdGVnb3J5XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJjb21wb25lbnRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBrZXl3b3JkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJrZXl3b3JkXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChsZXZlbCAmJiBsb2cubGV2ZWwgIT09IGxldmVsKSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeSAmJiBsb2cuY2F0ZWdvcnkgIT09IGNhdGVnb3J5KSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjb21wb25lbnQgJiYgbG9nLmNvbXBvbmVudCAhPT0gY29tcG9uZW50KSBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgICAgICAgICAga2V5d29yZCAmJlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAhSlNPTi5zdHJpbmdpZnkobG9nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC50b0xvd2VyQ2FzZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgLmluY2x1ZGVzKGtleXdvcmQudG9Mb3dlckNhc2UoKSlcclxuICAgICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29udGludWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgYWxsTG9ncy5wdXNoKGxvZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU4REYzXHU4RkM3XHU2NUUwXHU2NTQ4XHU4ODRDXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gXHU2MzA5XHU2NUY2XHU5NUY0XHU1MDEyXHU1RThGXHU2MzkyXHU1RThGXHJcbiAgICAgICAgICAgICAgICBhbGxMb2dzLnNvcnQoKGEsIGIpID0+IChiLnRpbWVzdGFtcCB8fCAwKSAtIChhLnRpbWVzdGFtcCB8fCAwKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgLy8gXHU1MjA2XHU5ODc1XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsaW1pdCA9IHBhcnNlSW50KHVybC5zZWFyY2hQYXJhbXMuZ2V0KFwibGltaXRcIikgfHwgXCIxMDBcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBvZmZzZXQgPSBwYXJzZUludCh1cmwuc2VhcmNoUGFyYW1zLmdldChcIm9mZnNldFwiKSB8fCBcIjBcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwYWdpbmF0ZWRMb2dzID0gYWxsTG9ncy5zbGljZShvZmZzZXQsIG9mZnNldCArIGxpbWl0KTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHBhZ2luYXRlZExvZ3MsXHJcbiAgICAgICAgICAgICAgICAgICAgdG90YWw6IGFsbExvZ3MubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFx1NjI3OVx1OTFDRlx1NkRGQlx1NTJBMFx1NjVFNVx1NUZEN1xyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvbG9ncy9iYXRjaFwiLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9ncyA9IGJvZHkubG9ncyB8fCBbXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU3ODZFXHU0RkREXHU2NUU1XHU1RkQ3XHU3NkVFXHU1RjU1XHU1QjU4XHU1NzI4XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgTE9HU19ESVIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCIubG9nc1wiKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoTE9HU19ESVIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmcy5ta2RpclN5bmMoTE9HU19ESVIsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU2MzA5XHU2NUU1XHU2NzFGXHU1MjA2XHU3RUM0XHU1MTk5XHU1MTY1XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9nc0J5RGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBhbnlbXT4oKTtcclxuICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGxvZyBvZiBsb2dzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRlID0gbmV3IERhdGUobG9nLnRpbWVzdGFtcCB8fCBEYXRlLm5vdygpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAudG9JU09TdHJpbmcoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3BsaXQoXCJUXCIpWzBdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKCFsb2dzQnlEYXRlLmhhcyhkYXRlKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2dzQnlEYXRlLnNldChkYXRlLCBbXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICBsb2dzQnlEYXRlLmdldChkYXRlKSEucHVzaChsb2cpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBbZGF0ZSwgZGF0ZUxvZ3NdIG9mIGxvZ3NCeURhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gcGF0aC5qb2luKExPR1NfRElSLCBgJHtkYXRlfS5qc29ubGApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGluZXMgPVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBkYXRlTG9ncy5tYXAoKGw6IGFueSkgPT4gSlNPTi5zdHJpbmdpZnkobCkpLmpvaW4oXCJcXG5cIikgK1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIlxcblwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgZnMuYXBwZW5kRmlsZVN5bmMoZmlsZVBhdGgsIGxpbmVzKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGNvdW50OiBsb2dzLmxlbmd0aCB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFx1NkUwNVx1NzQwNlx1NjVFNVx1NUZEN1xyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2xvZ3MvY2xlYW51cFwiLFxyXG4gICAgICAgICAgICBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRheXMgPSBib2R5LmRheXMgPz8gNzsgLy8gXHU5RUQ4XHU4QkE0XHU0RkREXHU3NTU5N1x1NTkyOVx1RkYwQ2RheXM9MFx1ODg2OFx1NzkzQVx1NkUwNVx1N0E3QVx1NjI0MFx1NjcwOVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1ODNCN1x1NTNENlx1NjVFNVx1NUZEN1x1NzZFRVx1NUY1NVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgTE9HU19ESVIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCIubG9nc1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoTE9HU19ESVIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIk5vIGxvZ3MgdG8gY2xlYW51cFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhMT0dTX0RJUik7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3V0b2ZmVGltZSA9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRheXMgPiAwID8gbm93IC0gZGF5cyAqIDI0ICogNjAgKiA2MCAqIDEwMDAgOiBub3c7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgbGV0IGRlbGV0ZWRDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2YgZmlsZXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gXHU4REYzXHU4RkM3XHU1QkExXHU4QkExXHU2NTg3XHU0RUY2XHU1NDhDXHU5NjkwXHU4NUNGXHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlLnN0YXJ0c1dpdGgoXCIuXCIpIHx8ICFmaWxlLmVuZHNXaXRoKFwiLmpzb25sXCIpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBwYXRoLmpvaW4oTE9HU19ESVIsIGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IGZzLnN0YXRTeW5jKGZpbGVQYXRoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NTk4Mlx1Njc5QyBkYXlzPTAgXHU2MjE2XHU2NTg3XHU0RUY2XHU0RkVFXHU2NTM5XHU2NUY2XHU5NUY0XHU2NUU5XHU0RThFIGN1dG9mZlRpbWVcdUZGMENcdTUyMTlcdTUyMjBcdTk2NjRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRheXMgPT09IDAgfHwgc3RhdHMubXRpbWUuZ2V0VGltZSgpIDwgY3V0b2ZmVGltZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZzLnVubGlua1N5bmMoZmlsZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZWRDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZGF5cyA9PT0gMFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICA/IFwiQWxsIGxvZ3MgY2xlYXJlZFwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDogYExvZ3Mgb2xkZXIgdGhhbiAke2RheXN9IGRheXMgY2xlYW5lZCB1cGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlZENvdW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gQVBJIERlYnVnIExvZ3MgLSBcdTVCOENcdTY1NzQgQVBJIFx1NEVBNFx1NEU5Mlx1OEJCMFx1NUY1NVxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgICAgICAgICAvLyBQT1NUIC9hcGkvbG9ncy9hcGktZGVidWcgLSBcdTRGRERcdTVCNTggQVBJIFx1OEMwM1x1OEJENVx1NjVFNVx1NUZEN1xyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2xvZ3MvYXBpLWRlYnVnXCIsXHJcbiAgICAgICAgICAgIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3Qge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kVGltZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdG90YWxSb3VuZHMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVudHJpZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIXNlc3Npb25JZCB8fCAhZW50cmllcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIk1pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBzZXNzaW9uSWQsIGVudHJpZXNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NTIxQlx1NUVGQVx1OEMwM1x1OEJENVx1NjVFNVx1NUZEN1x1NzZFRVx1NUY1NVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVidWdEaXIgPSBwYXRoLmpvaW4oXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiLmxvZ3NcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJhcGktZGVidWdcIixcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZGVidWdEaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyU3luYyhkZWJ1Z0RpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU3NTFGXHU2MjEwXHU2NTg3XHU0RUY2XHU1NDBEXHVGRjFBdGltZXN0YW1wLXNlc3Npb25JZC5qc29uXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC50b0lTT1N0cmluZygpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9bOi5dL2csIFwiLVwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gYCR7dGltZXN0YW1wfS0ke3Nlc3Npb25JZH0uanNvbmA7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlcGF0aCA9IHBhdGguam9pbihkZWJ1Z0RpciwgZmlsZW5hbWUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1Njc4NFx1NUVGQVx1NUI4Q1x1NjU3NFx1NzY4NFx1OEMwM1x1OEJENVx1NjU3MFx1NjM2RVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVidWdEYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5kVGltZTogZW5kVGltZSB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsUm91bmRzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbnRyeUNvdW50OiBlbnRyaWVzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW50cmllcyxcclxuICAgICAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU1MTk5XHU1MTY1XHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlcGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZGVidWdEYXRhLCBudWxsLCAyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJ1dGYtOFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICAgICAgICAgICAgYFtBUEkgRGVidWddIFNhdmVkIHRvICR7ZmlsZW5hbWV9ICgke2VudHJpZXMubGVuZ3RofSBlbnRyaWVzKWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZW5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRyeUNvdW50OiBlbnRyaWVzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBHRVQgL2FwaS9sb2dzL2FwaS1kZWJ1Zy9saXN0IC0gXHU1MjE3XHU1MUZBXHU2MjQwXHU2NzA5XHU4QzAzXHU4QkQ1XHU2NUU1XHU1RkQ3XHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFxyXG4gICAgICAgICAgICBcIi9hcGkvbG9ncy9hcGktZGVidWcvbGlzdFwiLFxyXG4gICAgICAgICAgICBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZGVidWdEaXIgPSBwYXRoLmpvaW4oXHJcbiAgICAgICAgICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgICAgICAgICAgICAgICBcIi5sb2dzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJhcGktZGVidWdcIixcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhkZWJ1Z0RpcikpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogW10gfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZXMgPSBmc1xyXG4gICAgICAgICAgICAgICAgICAgIC5yZWFkZGlyU3luYyhkZWJ1Z0RpcilcclxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChmKSA9PiBmLmVuZHNXaXRoKFwiLmpzb25cIikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU4M0I3XHU1M0Q2XHU2NTg3XHU0RUY2XHU0RkUxXHU2MDZGXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVJbmZvcyA9IGZpbGVzLm1hcCgoZmlsZW5hbWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlcGF0aCA9IHBhdGguam9pbihkZWJ1Z0RpciwgZmlsZW5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXRzID0gZnMuc3RhdFN5bmMoZmlsZXBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaWxlbmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgIHNpemU6IHN0YXRzLnNpemUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IHN0YXRzLmN0aW1lLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTYzMDlcdTUyMUJcdTVFRkFcdTY1RjZcdTk1RjRcdTUwMTJcdTVFOEZcclxuICAgICAgICAgICAgICAgICAgZmlsZUluZm9zLnNvcnQoXHJcbiAgICAgICAgICAgICAgICAgICAgKGEsIGIpID0+XHJcbiAgICAgICAgICAgICAgICAgICAgICBuZXcgRGF0ZShiLmNyZWF0ZWRBdCkuZ2V0VGltZSgpIC1cclxuICAgICAgICAgICAgICAgICAgICAgIG5ldyBEYXRlKGEuY3JlYXRlZEF0KS5nZXRUaW1lKCksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGZpbGVJbmZvcyB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9sb2dzL3Nlc3Npb24gLSBcdTRGRERcdTVCNTggU2Vzc2lvbiBcdTY1RTVcdTVGRDdcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9sb2dzL3Nlc3Npb25cIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9uTG9nID0gSlNPTi5wYXJzZShcclxuICAgICAgICAgICAgICAgICAgICAgICAgQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NEZERFx1NUI1OFx1NTIzMCAubG9ncy9zZXNzaW9ucyBcdTc2RUVcdTVGNTVcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlc3Npb25zRGlyID0gcGF0aC5qb2luKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcIi5sb2dzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwic2Vzc2lvbnNcIixcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2Vzc2lvbnNEaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyU3luYyhzZXNzaW9uc0RpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU3NTFGXHU2MjEwXHU2NTg3XHU0RUY2XHU1NDBEXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb25Mb2cuZmlsZW5hbWUgfHwgYHNlc3Npb24tJHtEYXRlLm5vdygpfS5qc29uYDtcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVwYXRoID0gcGF0aC5qb2luKHNlc3Npb25zRGlyLCBmaWxlbmFtZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU1MTk5XHU1MTY1XHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWxlcGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbkxvZywgbnVsbCwgMiksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwidXRmLThcIixcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGBbU2Vzc2lvbiBMb2ddIFNhdmVkIHRvICR7ZmlsZW5hbWV9ICgke3Nlc3Npb25Mb2cuZW50cmllcz8ubGVuZ3RoIHx8IDB9IGVudHJpZXMpYCxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IGZpbGVuYW1lLCBwYXRoOiBmaWxlcGF0aCB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltTZXNzaW9uIExvZ10gRXJyb3Igc2F2aW5nOlwiLCBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIC8vIFByb3h5IEFQSSAtIFx1N0Y1MVx1N0VEQ1x1NjI5M1x1NTNENlx1NEVFM1x1NzQwNlxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9wcm94eS9mZXRjaFwiLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgdXJsLCB0aW1lb3V0ID0gMTAwMDAgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoIXVybCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJVUkwgcmVxdWlyZWRcIiB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU5QThDXHU4QkMxIFVSTCBcdTY4M0NcdTVGMEZcclxuICAgICAgICAgICAgICAgICAgbGV0IHRhcmdldFVybDogVVJMO1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFVybCA9IG5ldyBVUkwodXJsKTtcclxuICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIkludmFsaWQgVVJMIGZvcm1hdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NTNFQVx1NTE0MVx1OEJCOCBodHRwL2h0dHBzXHJcbiAgICAgICAgICAgICAgICAgIGlmICghW1wiaHR0cDpcIiwgXCJodHRwczpcIl0uaW5jbHVkZXModGFyZ2V0VXJsLnByb3RvY29sKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJPbmx5IEhUVFAvSFRUUFMgYWxsb3dlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIHN0cnVjdHVyZWRMb2cuaW5mbyhcInByb3h5LmZldGNoLnN0YXJ0ZWRcIiwgYEZldGNoaW5nICR7dXJsfWAsIHtcclxuICAgICAgICAgICAgICAgICAgICB1cmwsXHJcbiAgICAgICAgICAgICAgICAgICAgdGltZW91dCxcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTRGN0ZcdTc1MjggTm9kZS5qcyBmZXRjaCAoXHU1MTdDXHU1QkI5IE5vZGUgMTYrKVxyXG4gICAgICAgICAgICAgICAgICBzdHJ1Y3R1cmVkTG9nLmluZm8oXCJwcm94eS5mZXRjaC5yZXF1ZXN0XCIsIGBGZXRjaGluZyAke3VybH1gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgaG9zdG5hbWU6IHRhcmdldFVybC5ob3N0bmFtZSxcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTUyMUJcdTVFRkEgQWJvcnRDb250cm9sbGVyIFx1NUI5RVx1NzNCMFx1OEQ4NVx1NjVGNlx1RkYwOFx1NTE3Q1x1NUJCOSBOb2RlIDE2XHVGRjA5XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoXHJcbiAgICAgICAgICAgICAgICAgICAgKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVvdXQsXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZldGNoUmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcclxuICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZDogXCJHRVRcIixcclxuICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJVc2VyLUFnZW50XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJNb3ppbGxhLzUuMCAoV2luZG93cyBOVCAxMC4wOyBXaW42NDsgeDY0KSBBcHBsZVdlYktpdC81MzcuMzYgKEtIVE1MLCBsaWtlIEdlY2tvKSBDaHJvbWUvMTIwLjAuMC4wIFNhZmFyaS81MzcuMzZcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgQWNjZXB0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwidGV4dC9odG1sLGFwcGxpY2F0aW9uL3hodG1sK3htbCxhcHBsaWNhdGlvbi94bWw7cT0wLjksaW1hZ2Uvd2VicCwqLyo7cT0wLjhcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJBY2NlcHQtTGFuZ3VhZ2VcIjogXCJ6aC1DTix6aDtxPTAuOSxlbjtxPTAuOFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWZldGNoUmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN0cnVjdHVyZWRMb2cud2FybihcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm94eS5mZXRjaC5mYWlsZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgYEZhaWxlZCB0byBmZXRjaCAke3VybH1gLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7IHN0YXR1czogZmV0Y2hSZXNwb25zZS5zdGF0dXMgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IGZldGNoUmVzcG9uc2Uuc3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBgSFRUUCAke2ZldGNoUmVzcG9uc2Uuc3RhdHVzfTogJHtmZXRjaFJlc3BvbnNlLnN0YXR1c1RleHR9YCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IGZldGNoUmVzcG9uc2UudGV4dCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHN0cnVjdHVyZWRMb2cuc3VjY2VzcyhcclxuICAgICAgICAgICAgICAgICAgICAgIFwicHJveHkuZmV0Y2guY29tcGxldGVkXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICBgRmV0Y2hlZCAke3VybH1gLFxyXG4gICAgICAgICAgICAgICAgICAgICAgeyBzaXplOiBkYXRhLmxlbmd0aCB9LFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXHJcbiAgICAgICAgICAgICAgICAgICAgICBcIkNvbnRlbnQtVHlwZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZmV0Y2hSZXNwb25zZS5oZWFkZXJzLmdldChcImNvbnRlbnQtdHlwZVwiKSB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcInRleHQvcGxhaW47IGNoYXJzZXQ9dXRmLThcIixcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoZGF0YSk7XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGZldGNoRXJyb3I6IGFueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzVGltZW91dCA9XHJcbiAgICAgICAgICAgICAgICAgICAgICBmZXRjaEVycm9yLm5hbWUgPT09IFwiQWJvcnRFcnJvclwiIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICBmZXRjaEVycm9yLm1lc3NhZ2U/LmluY2x1ZGVzKFwidGltZW91dFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IGlzVGltZW91dFxyXG4gICAgICAgICAgICAgICAgICAgICAgPyBgXHU4QkY3XHU2QzQyXHU4RDg1XHU2NUY2ICgke3RpbWVvdXR9bXMpYFxyXG4gICAgICAgICAgICAgICAgICAgICAgOiBgXHU4QkY3XHU2QzQyXHU1OTMxXHU4RDI1OiAke2ZldGNoRXJyb3IubWVzc2FnZX1gO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBzdHJ1Y3R1cmVkTG9nLmVycm9yKFxyXG4gICAgICAgICAgICAgICAgICAgICAgXCJwcm94eS5mZXRjaC5lcnJvclwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgYEVycm9yIGZldGNoaW5nICR7dXJsfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBmZXRjaEVycm9yLm1lc3NhZ2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzVGltZW91dCxcclxuICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSBpc1RpbWVvdXQgPyA1MDQgOiA1MDI7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlcnJvck1zZyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHVybCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0bmFtZTogdGFyZ2V0VXJsLmhvc3RuYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGlzVGltZW91dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gTUNQIEFQSSAtIFx1NjI2N1x1ODg0QyBNQ1AgXHU1REU1XHU1MTc3XHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIC8vIFx1NTIxN1x1NTFGQVx1NjI0MFx1NjcwOSBNQ1AgXHU1REU1XHU1MTc3XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9tY3AvdG9vbHNcIiwgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHsgbWNwTWFuYWdlciB9ID1cclxuICAgICAgICAgICAgICAgICAgYXdhaXQgaW1wb3J0KFwiLi90aGVtZS9jb21wb25lbnRzL2FpLWNoYXQvY29yZS9tY3AvaW5kZXhcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b29scyA9IG1jcE1hbmFnZXIuZ2V0QWxsVG9vbHMoKTtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHRvb2xzIH0pKTtcclxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBlcnJvcjogZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpLFxyXG4gICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gXHU2MjY3XHU4ODRDIE1DUCBcdTVERTVcdTUxNzdcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL21jcC9leGVjdXRlXCIsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyBzZXJ2ZXJJZCwgdG9vbE5hbWUsIGFyZ3MgPSB7fSB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1ODNCN1x1NTNENiBNQ1AgTWFuYWdlclx1RkYwOFx1NEVDRVx1OEZEMFx1ODg0Q1x1NjVGNlx1NkEyMVx1NTc1N1x1RkYwOVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCB7IG1jcE1hbmFnZXIgfSA9XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgaW1wb3J0KFwiLi90aGVtZS9jb21wb25lbnRzL2FpLWNoYXQvY29yZS9tY3AvaW5kZXhcIik7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBtY3BNYW5hZ2VyLmV4ZWN1dGUoXHJcbiAgICAgICAgICAgICAgICAgICAgc2VydmVySWQsXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbE5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJncyxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogcmVzdWx0IH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIC8vIEdpdEh1YiBBUEkgXHU0RUUzXHU3NDA2IC0gXHU5MDdGXHU1MTREXHU1MjREXHU3QUVGXHU3NkY0XHU2M0E1XHU4QzAzXHU3NTI4XHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIC8vIFx1ODNCN1x1NTNENlx1NEVEM1x1NUU5M1x1NEZFMVx1NjA2RiAtIC9hcGkvZ2l0aHViL3JlcG8ve293bmVyfS97cmVwb31cclxuICAgICAgICAgIC8vIFVSTCBcdTY4M0NcdTVGMEY6IC9hcGkvZ2l0aHViL3JlcG8vZmFjZWJvb2svcmVhY3RcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9naXRodWIvcmVwby9cIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHJlcS51cmwgXHU2NjJGXHU3NkY4XHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXHU1OTgyIFwiZmFjZWJvb2svcmVhY3RcIiBcdTYyMTYgXCIvZmFjZWJvb2svcmVhY3RcIlxyXG4gICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsIHx8IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGNsZWFuVXJsID0gdXJsLnNwbGl0KFwiP1wiKVswXS5yZXBsYWNlKC9eXFwvLywgXCJcIik7IC8vIFx1NzlGQlx1OTY2NCBxdWVyeSBzdHJpbmcgXHU1NDhDXHU1RjAwXHU1OTM0XHU3Njg0IC9cclxuICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBjbGVhblVybC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgc3RydWN0dXJlZExvZy5pbmZvKFwiZ2l0aHViLnJlcG8ucmVxdWVzdFwiLCBgUmVxdWVzdDogJHt1cmx9YCwge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFuVXJsLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRzLFxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIk1pc3Npbmcgb3duZXIgb3IgcmVwb1wiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgY29uc3QgW293bmVyLCByZXBvXSA9IHBhcnRzO1xyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChcclxuICAgICAgICAgICAgICAgICAgICBgaHR0cHM6Ly9hcGkuZ2l0aHViLmNvbS9yZXBvcy8ke293bmVyfS8ke3JlcG99YCxcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFwiVXNlci1BZ2VudFwiOiBcIk1ldGFCbG9nLVRvb2xUZXN0ZXIvMS4wXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEFjY2VwdDogXCJhcHBsaWNhdGlvbi92bmQuZ2l0aHViLnYzK2pzb25cIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IHJlc3BvbnNlLnN0YXR1cztcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBHaXRIdWIgQVBJIGVycm9yOiAke3Jlc3BvbnNlLnN0YXR1c31gLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBhd2FpdCByZXNwb25zZS5qc29uKCk7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGRhdGEpKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogZSBpbnN0YW5jZW9mIEVycm9yID8gZS5tZXNzYWdlIDogU3RyaW5nKGUpLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFx1ODNCN1x1NTNENlx1NjU4N1x1NEVGNlx1NTE4NVx1NUJCOSAtIC9hcGkvZ2l0aHViL2ZpbGUve293bmVyfS97cmVwb30ve3JlZn0ve3BhdGh9XHJcbiAgICAgICAgICAvLyBVUkwgXHU2ODNDXHU1RjBGOiAvYXBpL2dpdGh1Yi9maWxlL29jdG9jYXQvSGVsbG8tV29ybGQvbWFpbi9SRUFETUVcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9naXRodWIvZmlsZS9cIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHJlcS51cmwgXHU2NjJGXHU3NkY4XHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXHU1OTgyIFwib2N0b2NhdC9IZWxsby1Xb3JsZC9tYWluL1JFQURNRVwiXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5VcmwgPSB1cmwuc3BsaXQoXCI/XCIpWzBdLnJlcGxhY2UoL15cXC8vLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBjbGVhblVybC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgc3RydWN0dXJlZExvZy5pbmZvKFwiZ2l0aHViLmZpbGUucmVxdWVzdFwiLCBgUmVxdWVzdDogJHt1cmx9YCwge1xyXG4gICAgICAgICAgICAgICAgICAgIGNsZWFuVXJsLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRzLFxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPCA0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIk1pc3Npbmcgb3duZXIsIHJlcG8sIHJlZiBvciBwYXRoXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTY4M0NcdTVGMEY6IG93bmVyL3JlcG8vcmVmL3BhdGhcclxuICAgICAgICAgICAgICAgICAgY29uc3QgW293bmVyLCByZXBvLCByZWYsIC4uLnBhdGhQYXJ0c10gPSBwYXJ0cztcclxuICAgICAgICAgICAgICAgICAgY29uc3QgcGF0aCA9IHBhdGhQYXJ0cy5qb2luKFwiL1wiKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXHJcbiAgICAgICAgICAgICAgICAgICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtvd25lcn0vJHtyZXBvfS9jb250ZW50cy8ke3BhdGh9P3JlZj0ke3JlZn1gLFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJVc2VyLUFnZW50XCI6IFwiTWV0YUJsb2ctVG9vbFRlc3Rlci8xLjBcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gcmVzcG9uc2Uuc3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEdpdEh1YiBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSksXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gXHU4M0I3XHU1M0Q2XHU2M0QwXHU0RUE0XHU1Mzg2XHU1M0YyIC0gL2FwaS9naXRodWIvY29tbWl0cy97b3duZXJ9L3tyZXBvfS97cmVmfVxyXG4gICAgICAgICAgLy8gVVJMIFx1NjgzQ1x1NUYwRjogL2FwaS9naXRodWIvY29tbWl0cy9vY3RvY2F0L0hlbGxvLVdvcmxkL21haW5cclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9naXRodWIvY29tbWl0cy9cIixcclxuICAgICAgICAgICAgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIC8vIHJlcS51cmwgXHU2NjJGXHU3NkY4XHU1QkY5XHU4REVGXHU1Rjg0XHVGRjBDXHU1OTgyIFwib2N0b2NhdC9IZWxsby1Xb3JsZC9tYWluXCIgXHU2MjE2IFwib2N0b2NhdC9IZWxsby1Xb3JsZFwiXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgY2xlYW5VcmwgPSB1cmwuc3BsaXQoXCI/XCIpWzBdLnJlcGxhY2UoL15cXC8vLCBcIlwiKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSBjbGVhblVybC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgc3RydWN0dXJlZExvZy5pbmZvKFxyXG4gICAgICAgICAgICAgICAgICAgIFwiZ2l0aHViLmNvbW1pdHMucmVxdWVzdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGBSZXF1ZXN0OiAke3VybH1gLFxyXG4gICAgICAgICAgICAgICAgICAgIHsgY2xlYW5VcmwsIHBhcnRzIH0sXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoIDwgMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJNaXNzaW5nIG93bmVyIG9yIHJlcG9cIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NjgzQ1x1NUYwRjogb3duZXIvcmVwbyBcdTYyMTYgb3duZXIvcmVwby9yZWZcclxuICAgICAgICAgICAgICAgICAgY29uc3QgW293bmVyLCByZXBvLCByZWYgPSBcIm1haW5cIl0gPSBwYXJ0cztcclxuICAgICAgICAgICAgICAgICAgY29uc3QgcGVyX3BhZ2UgPVxyXG4gICAgICAgICAgICAgICAgICAgIG5ldyBVUkwodXJsLCBgaHR0cDovL2xvY2FsaG9zdGApLnNlYXJjaFBhcmFtcy5nZXQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBcInBlcl9wYWdlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgKSB8fCBcIjVcIjtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXHJcbiAgICAgICAgICAgICAgICAgICAgYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtvd25lcn0vJHtyZXBvfS9jb21taXRzP3NoYT0ke3JlZn0mcGVyX3BhZ2U9JHtwZXJfcGFnZX1gLFxyXG4gICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXCJVc2VyLUFnZW50XCI6IFwiTWV0YUJsb2ctVG9vbFRlc3Rlci8xLjBcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL3ZuZC5naXRodWIudjMranNvblwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gcmVzcG9uc2Uuc3RhdHVzO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogYEdpdEh1YiBBUEkgZXJyb3I6ICR7cmVzcG9uc2Uuc3RhdHVzfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoZGF0YSkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBlIGluc3RhbmNlb2YgRXJyb3IgPyBlLm1lc3NhZ2UgOiBTdHJpbmcoZSksXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIC8vIEJhY2tncm91bmQgVGFza3MgQVBJIC0gXHU3QjgwXHU1MzE2XHU3MjQ4XHVGRjA4XHU2QTIxXHU2MkRGXHU2NTcwXHU2MzZFXHVGRjA5XHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gXHU2Q0U4XHU2MTBGOiBCYWNrZ3JvdW5kVGFza01hbmFnZXIgXHU2QTIxXHU1NzU3XHU2NzJBXHU1QjlFXHU3M0IwXHVGRjBDXHU0RUU1XHU0RTBCIEFQSSBcdThGRDRcdTU2REVcdTZBMjFcdTYyREZcdTY1NzBcdTYzNkVcclxuXHJcbiAgICAgICAgICAvLyBcdTZBMjFcdTYyREZcdTRFRkJcdTUyQTFcdTZBMjFcdTY3N0ZcclxuICAgICAgICAgIGNvbnN0IE1PQ0tfVEFTS19URU1QTEFURVMgPSBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBpZDogXCJzeW5jLWtub3dsZWRnZVwiLFxyXG4gICAgICAgICAgICAgIG5hbWU6IFwiXHU1NDBDXHU2QjY1XHU3N0U1XHU4QkM2XHU1RTkzXCIsXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXHU0RUNFXHU1OTE2XHU5MEU4XHU2RTkwXHU1NDBDXHU2QjY1XHU3N0U1XHU4QkM2XHU1RTkzXHU1MTg1XHU1QkI5XCIsXHJcbiAgICAgICAgICAgICAgaWNvbjogXCJcdUQ4M0RcdUREMDRcIixcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogXCJzeXN0ZW1cIixcclxuICAgICAgICAgICAgICBwYXJhbXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbmFtZTogXCJzb3VyY2VcIixcclxuICAgICAgICAgICAgICAgICAgdHlwZTogXCJzdHJpbmdcIixcclxuICAgICAgICAgICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBcIlx1NjU3MFx1NjM2RVx1NkU5MCBVUkxcIixcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgIG5hbWU6IFwiZm9yY2VcIixcclxuICAgICAgICAgICAgICAgICAgdHlwZTogXCJib29sZWFuXCIsXHJcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXHU1RjNBXHU1MjM2XHU1NDBDXHU2QjY1XCIsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBpZDogXCJnZW5lcmF0ZS1pbmRleFwiLFxyXG4gICAgICAgICAgICAgIG5hbWU6IFwiXHU3NTFGXHU2MjEwXHU3RDIyXHU1RjE1XCIsXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXHU0RTNBXHU3N0U1XHU4QkM2XHU1RTkzXHU3NTFGXHU2MjEwXHU2NDFDXHU3RDIyXHU3RDIyXHU1RjE1XCIsXHJcbiAgICAgICAgICAgICAgaWNvbjogXCJcdUQ4M0RcdURDQzdcIixcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogXCJzeXN0ZW1cIixcclxuICAgICAgICAgICAgICBwYXJhbXM6IFtcclxuICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgbmFtZTogXCJzZWN0aW9uc1wiLFxyXG4gICAgICAgICAgICAgICAgICB0eXBlOiBcImFycmF5XCIsXHJcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXHU2MzA3XHU1QjlBXHU3QUUwXHU4MjgyXCIsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBpZDogXCJiYWNrdXAtZGF0YVwiLFxyXG4gICAgICAgICAgICAgIG5hbWU6IFwiXHU1OTA3XHU0RUZEXHU2NTcwXHU2MzZFXCIsXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXHU1OTA3XHU0RUZEXHU2MjQwXHU2NzA5XHU2NTcwXHU2MzZFXHU1MjMwXHU2MzA3XHU1QjlBXHU0RjREXHU3RjZFXCIsXHJcbiAgICAgICAgICAgICAgaWNvbjogXCJcdUQ4M0RcdURDQkVcIixcclxuICAgICAgICAgICAgICBjYXRlZ29yeTogXCJtYWludGVuYW5jZVwiLFxyXG4gICAgICAgICAgICAgIHBhcmFtczogW1xyXG4gICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICBuYW1lOiBcImRlc3RpbmF0aW9uXCIsXHJcbiAgICAgICAgICAgICAgICAgIHR5cGU6IFwic3RyaW5nXCIsXHJcbiAgICAgICAgICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcdTU5MDdcdTRFRkRcdTc2RUVcdTY4MDdcdThERUZcdTVGODRcIixcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGlkOiBcImNsZWFuLWNhY2hlXCIsXHJcbiAgICAgICAgICAgICAgbmFtZTogXCJcdTZFMDVcdTc0MDZcdTdGMTNcdTVCNThcIixcclxuICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogXCJcdTZFMDVcdTc0MDZcdThGQzdcdTY3MUZcdTdGMTNcdTVCNThcdTY1ODdcdTRFRjZcIixcclxuICAgICAgICAgICAgICBpY29uOiBcIlx1RDgzRVx1RERGOVwiLFxyXG4gICAgICAgICAgICAgIGNhdGVnb3J5OiBcIm1haW50ZW5hbmNlXCIsXHJcbiAgICAgICAgICAgICAgcGFyYW1zOiBbXSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIF07XHJcblxyXG4gICAgICAgICAgLy8gXHU4M0I3XHU1M0Q2XHU0RUZCXHU1MkExXHU2QTIxXHU2NzdGXHU1MjE3XHU4ODY4XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFxyXG4gICAgICAgICAgICBcIi9hcGkvYWdlbnQvdGFza3MvdGVtcGxhdGVzXCIsXHJcbiAgICAgICAgICAgIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IE1PQ0tfVEFTS19URU1QTEFURVMsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJUYXNrIHN5c3RlbSBub3QgYXZhaWxhYmxlIC0gcmV0dXJuaW5nIG1vY2sgZGF0YVwiLFxyXG4gICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gXHU4OUU2XHU1M0QxXHU0RUZCXHU1MkExXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFxyXG4gICAgICAgICAgICBcIi9hcGkvYWdlbnQvdGFza3MvdHJpZ2dlclwiLFxyXG4gICAgICAgICAgICAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJUYXNrIHN5c3RlbSBub3QgYXZhaWxhYmxlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWQ6IGBtb2NrLXRhc2stJHtEYXRlLm5vdygpfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgICB0eXBlOiBcIm1vY2tcIixcclxuICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFwiTW9jayBUYXNrXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IFwibm90X2F2YWlsYWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFx1NjI3OVx1OTFDRlx1ODlFNlx1NTNEMVx1NEVGQlx1NTJBMVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2FnZW50L3Rhc2tzL3RyaWdnZXItYmF0Y2hcIixcclxuICAgICAgICAgICAgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiVGFzayBzeXN0ZW0gbm90IGF2YWlsYWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IFtdLFxyXG4gICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gXHU4M0I3XHU1M0Q2XHU0RUZCXHU1MkExXHU1MjE3XHU4ODY4XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9hZ2VudC90YXNrc1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICBtZXNzYWdlOiBcIlRhc2sgc3lzdGVtIG5vdCBhdmFpbGFibGUgLSByZXR1cm5pbmcgbW9jayBkYXRhXCIsXHJcbiAgICAgICAgICAgICAgICAgIGRhdGE6IFtdLFxyXG4gICAgICAgICAgICAgICAgICBzdGF0czoge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvdGFsOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIHBlbmRpbmc6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgcnVubmluZzogMCxcclxuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZWQ6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgZmFpbGVkOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGNhbmNlbGxlZDogMCxcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBcdTgzQjdcdTUzRDZcdTUzNTVcdTRFMkFcdTRFRkJcdTUyQTFcdThCRTZcdTYwQzVcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hZ2VudC90YXNrcy9kZXRhaWxcIixcclxuICAgICAgICAgICAgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJUYXNrIHN5c3RlbSBub3QgYXZhaWxhYmxlXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgZGF0YTogbnVsbCxcclxuICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFx1NTNENlx1NkQ4OFx1NEVGQlx1NTJBMVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2FnZW50L3Rhc2tzL2NhbmNlbFwiLFxyXG4gICAgICAgICAgICAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJUYXNrIHN5c3RlbSBub3QgYXZhaWxhYmxlIC0gbm8gdGFzayB0byBjYW5jZWxcIixcclxuICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFx1OTFDRFx1OEJENVx1NEVGQlx1NTJBMVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvYWdlbnQvdGFza3MvcmV0cnlcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6IFwiVGFzayBzeXN0ZW0gbm90IGF2YWlsYWJsZVwiLFxyXG4gICAgICAgICAgICAgICAgICBkYXRhOiBudWxsLFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFx1NTIyMFx1OTY2NFx1NEVGQlx1NTJBMVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2FnZW50L3Rhc2tzL2RlbGV0ZVwiLFxyXG4gICAgICAgICAgICAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZTogXCJUYXNrIHN5c3RlbSBub3QgYXZhaWxhYmxlIC0gbm8gdGFzayB0byBkZWxldGVcIixcclxuICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgICAvLyBDaGF0IEFQSSAtIFx1NkQ0MVx1NUYwRlx1NkQ4OFx1NjA2Rlx1NTNEMVx1OTAwMVxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2NoYXRcIiwgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kICE9PSBcIlBPU1RcIikgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bms6IGFueSkgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgeyBtZXNzYWdlcywgbW9kZWwsIHRlbXBlcmF0dXJlLCBtYXhUb2tlbnMsIHN0cmVhbSB9ID1cclxuICAgICAgICAgICAgICAgICAgYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltBUEkgQ2hhdF0gUmVxdWVzdCByZWNlaXZlZDpcIiwge1xyXG4gICAgICAgICAgICAgICAgICBtb2RlbCxcclxuICAgICAgICAgICAgICAgICAgbWVzc2FnZXM6IG1lc3NhZ2VzPy5sZW5ndGgsXHJcbiAgICAgICAgICAgICAgICAgIHN0cmVhbSxcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIFx1NUJGQ1x1NTE2NSBMTE0gTWFuYWdlclxyXG4gICAgICAgICAgICAgICAgLy8gY29uc3QgeyBnZXRMTE1NYW5hZ2VyIH0gPSBhd2FpdCBpbXBvcnQoJy4vYWdlbnQvbGxtJyk7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zdCBsbG0gPSBnZXRMTE1NYW5hZ2VyKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBsbG06IGFueSA9IHtcclxuICAgICAgICAgICAgICAgICAgY2hhdDogYXN5bmMgKCkgPT4gKHsgY29udGVudDogXCJOb3QgSW1wbGVtZW50ZWRcIiB9KSxcclxuICAgICAgICAgICAgICAgICAgY2hhdFN0cmVhbTogYXN5bmMgKG9wdHM6IGFueSwgY2I6IGFueSkgPT5cclxuICAgICAgICAgICAgICAgICAgICBjYih7IGZpbmlzaFJlYXNvbjogXCJ1bnN1cHBvcnRlZFwiIH0pLFxyXG4gICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBcdTk3NUVcdTZENDFcdTVGMEZcdTU0Q0RcdTVFOTRcclxuICAgICAgICAgICAgICAgIGlmIChzdHJlYW0gPT09IGZhbHNlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSSBDaGF0XSBOb24tc3RyZWFtaW5nIHJlcXVlc3RcIik7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgbGxtLmNoYXQoe1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzLFxyXG4gICAgICAgICAgICAgICAgICAgIG1vZGVsLFxyXG4gICAgICAgICAgICAgICAgICAgIHRlbXBlcmF0dXJlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1heFRva2VucyxcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiByZXNwb25zZS5jb250ZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb2RlbDogcmVzcG9uc2UubW9kZWwsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVzYWdlOiByZXNwb25zZS51c2FnZSxcclxuICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBcdTZENDFcdTVGMEZcdTU0Q0RcdTVFOTRcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSSBDaGF0XSBTdGFydGluZyBzdHJlYW1pbmcgcmVzcG9uc2VcIik7XHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwidGV4dC9ldmVudC1zdHJlYW1cIik7XHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ2FjaGUtQ29udHJvbFwiLCBcIm5vLWNhY2hlXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbm5lY3Rpb25cIiwgXCJrZWVwLWFsaXZlXCIpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnN0IGFib3J0Q29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcclxuICAgICAgICAgICAgICAgIGxldCBpc0VuZGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBsZXQgY2h1bmtDb3VudCA9IDA7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVxLm9uKFwiY2xvc2VcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltBUEkgQ2hhdF0gUmVxdWVzdCBjbG9zZWQgYnkgY2xpZW50XCIpO1xyXG4gICAgICAgICAgICAgICAgICBhYm9ydENvbnRyb2xsZXIuYWJvcnQoKTtcclxuICAgICAgICAgICAgICAgICAgaXNFbmRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBhd2FpdCBsbG0uY2hhdFN0cmVhbShcclxuICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcyxcclxuICAgICAgICAgICAgICAgICAgICAgIG1vZGVsLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBtYXhUb2tlbnMsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHJlYW06IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzaWduYWw6IGFib3J0Q29udHJvbGxlci5zaWduYWwsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAoY2h1bms6IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGlzRW5kZWQpIHJldHVybjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBjaHVua0NvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoY2h1bmtDb3VudCA8PSAzIHx8IGNodW5rLmZpbmlzaFJlYXNvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgW0FQSSBDaGF0XSBDaHVuayAke2NodW5rQ291bnR9OmAsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBjaHVuay5jb250ZW50Py5zdWJzdHJpbmcoMCwgNTApLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpbmlzaFJlYXNvbjogY2h1bmsuZmluaXNoUmVhc29uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhOiBhbnkgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IGNodW5rLmNvbnRlbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlYXNvbmluZzogY2h1bmsucmVhc29uaW5nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpc1JlYXNvbmluZzogISFjaHVuay5yZWFzb25pbmcsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChjaHVuay5maW5pc2hSZWFzb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZGF0YS5maW5pc2hSZWFzb24gPSBjaHVuay5maW5pc2hSZWFzb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRhdGEudXNhZ2UgPSBjaHVuay51c2FnZTtcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGUoYGRhdGE6ICR7SlNPTi5zdHJpbmdpZnkoZGF0YSl9XFxuXFxuYCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGNodW5rLmZpbmlzaFJlYXNvbikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXMud3JpdGUoXCJkYXRhOiBbRE9ORV1cXG5cXG5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaXNFbmRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiW0FQSSBDaGF0XSBTdHJlYW0gZmluaXNoZWQsIHRvdGFsIGNodW5rczpcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBjaHVua0NvdW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoIWlzRW5kZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIltBUEkgQ2hhdF0gU3RyZWFtIGVuZGVkIHdpdGhvdXQgZmluaXNoUmVhc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy53cml0ZShcImRhdGE6IFtET05FXVxcblxcblwiKTtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHN0cmVhbUVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJIENoYXRdIFN0cmVhbSBlcnJvcjpcIiwgc3RyZWFtRXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICB0aHJvdyBzdHJlYW1FcnJvcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEkgQ2hhdCBFcnJvcl1cIiwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFyZXMuaGVhZGVyc1NlbnQpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3I6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogXCJDaGF0IGZhaWxlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLndyaXRlKFxyXG4gICAgICAgICAgICAgICAgICAgIGBkYXRhOiAke0pTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFN0cmluZyhlcnJvcikgfSl9XFxuXFxuYCxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gSGVhbHRoICYgU3lzdGVtIEFQSVxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2hlYWx0aFwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGxtOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIG1lbW9yeTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBmaWxlczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBnaXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL3N5c3RlbS9yZXNvdXJjZXNcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgLy8gXHU2QTIxXHU2MkRGXHU4RDQ0XHU2RTkwXHU0RjdGXHU3NTI4XHU2NTcwXHU2MzZFXHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lbW9yeTogTWF0aC5mbG9vcigzNSArIE1hdGgucmFuZG9tKCkgKiAzMCksXHJcbiAgICAgICAgICAgICAgICAgICAgY3B1OiBNYXRoLmZsb29yKDIwICsgTWF0aC5yYW5kb20oKSAqIDQwKSxcclxuICAgICAgICAgICAgICAgICAgICBsYXRlbmN5OiBNYXRoLmZsb29yKDMwICsgTWF0aC5yYW5kb20oKSAqIDUwKSxcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gQWdlbnQgQ1JVRCBBUEkgLSBcdTYzMDFcdTRFNDVcdTUzMTZcdTVCNThcdTUwQThcclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG4gICAgICAgICAgY29uc3QgQUdFTlRTX0ZJTEUgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCIuZGF0YVwiLCBcImFnZW50cy5qc29uXCIpO1xyXG5cclxuICAgICAgICAgIC8vIFx1Nzg2RVx1NEZERFx1NjU3MFx1NjM2RVx1NzZFRVx1NUY1NVx1NUI1OFx1NTcyOFxyXG4gICAgICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKHBhdGguZGlybmFtZShBR0VOVFNfRklMRSkpKSB7XHJcbiAgICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoQUdFTlRTX0ZJTEUpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBcdThCRkJcdTUzRDYgQWdlbnRzXHJcbiAgICAgICAgICBmdW5jdGlvbiByZWFkQWdlbnRzKCk6IGFueVtdIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhBR0VOVFNfRklMRSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBmcy5yZWFkRmlsZVN5bmMoQUdFTlRTX0ZJTEUsIFwidXRmLThcIik7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhZ2VudHMgPSBKU09OLnBhcnNlKGRhdGEpO1xyXG4gICAgICAgICAgICAgICAgLy8gXHU0RTNBXHU2QkNGXHU0RTJBIGFnZW50IFx1NkRGQlx1NTJBMFx1OUVEOFx1OEJBNFx1NTAzQ1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFnZW50cy5tYXAoKGFnZW50OiBhbnkpID0+ICh7XHJcbiAgICAgICAgICAgICAgICAgIC4uLmFnZW50LFxyXG4gICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IGFnZW50LmNhcGFiaWxpdGllcyB8fCB7XHJcbiAgICAgICAgICAgICAgICAgICAgbW9kZTogXCJyYXdcIixcclxuICAgICAgICAgICAgICAgICAgICBza2lsbElkczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgdG9vbElkczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tU3lzdGVtUHJvbXB0OiBcIlx1NEY2MFx1NjYyRlx1NEUwMFx1NEUyQSBoZWxwZnVsIFx1NzY4NCBBSSBcdTUyQTlcdTYyNEJcdTMwMDJcIixcclxuICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgbWVtb3J5OiBhZ2VudC5tZW1vcnkgfHwge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgY29udGVudDogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICBhdXRvRXh0cmFjdDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBtYXhUb2tlbnM6IDIwMDAsXHJcbiAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgIHBlcm1pc3Npb25zOiBhZ2VudC5wZXJtaXNzaW9ucyB8fCBbXSxcclxuICAgICAgICAgICAgICAgICAgY2FsbENvdW50OiBhZ2VudC5jYWxsQ291bnQgfHwgMCxcclxuICAgICAgICAgICAgICAgICAgaXNEZWZhdWx0OiBhZ2VudC5pc0RlZmF1bHQgfHwgZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgIHN0YXR1czogYWdlbnQuc3RhdHVzIHx8IFwib25saW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgIHNlYXQ6IGFnZW50LnNlYXQgfHwgMSxcclxuICAgICAgICAgICAgICAgICAgbGFzdEFjdGl2ZUF0OiBhZ2VudC5sYXN0QWN0aXZlQXQgfHwgRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gRmFpbGVkIHRvIHJlYWQgYWdlbnRzOlwiLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gXHU1MTk5XHU1MTY1IEFnZW50c1xyXG4gICAgICAgICAgZnVuY3Rpb24gd3JpdGVBZ2VudHMoYWdlbnRzOiBhbnlbXSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoXHJcbiAgICAgICAgICAgICAgICBBR0VOVFNfRklMRSxcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGFnZW50cywgbnVsbCwgMiksXHJcbiAgICAgICAgICAgICAgICBcInV0Zi04XCIsXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJXSBGYWlsZWQgdG8gd3JpdGUgYWdlbnRzOlwiLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFx1NTIxRFx1NTlDQlx1NTMxNlx1OUVEOFx1OEJBNCBBZ2VudFx1RkYwOFx1NTk4Mlx1Njc5Q1x1NkNBMVx1NjcwOVx1NjU3MFx1NjM2RVx1RkYwOVxyXG4gICAgICAgICAgZnVuY3Rpb24gaW5pdGlhbGl6ZURlZmF1bHRBZ2VudCgpIHtcclxuICAgICAgICAgICAgY29uc3QgYWdlbnRzID0gcmVhZEFnZW50cygpO1xyXG4gICAgICAgICAgICBpZiAoYWdlbnRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGRlZmF1bHRBZ2VudCA9IHtcclxuICAgICAgICAgICAgICAgIGlkOiBgYWdlbnQtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDkpfWAsXHJcbiAgICAgICAgICAgICAgICBuYW1lOiBcIk1ldGEgXHU1MkE5XHU2MjRCXCIsXHJcbiAgICAgICAgICAgICAgICBhdmF0YXI6IFwiXHVEODNFXHVERDE2XCIsXHJcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjpcclxuICAgICAgICAgICAgICAgICAgXCJcdTU3RkFcdTRFOEUgRGVlcFNlZWsgXHU1OTI3XHU2QTIxXHU1NzhCXHU3Njg0XHU5MDFBXHU3NTI4IEFJIFx1NTJBOVx1NjI0Qlx1RkYwQ1x1NEUzQVx1NjBBOFx1NjNEMFx1NEY5Qlx1NEUxM1x1NEUxQVx1NjY3QVx1ODBGRFx1NUJGOVx1OEJERFx1NEY1M1x1OUE4Q1wiLFxyXG4gICAgICAgICAgICAgICAgbGV2ZWw6IFwibWV0YVwiLFxyXG4gICAgICAgICAgICAgICAgc3RhdHVzOiBcIm9ubGluZVwiLFxyXG4gICAgICAgICAgICAgICAgc2VhdDogMSxcclxuICAgICAgICAgICAgICAgIGNhcGFiaWxpdGllczoge1xyXG4gICAgICAgICAgICAgICAgICBtb2RlOiBcInJhd1wiLFxyXG4gICAgICAgICAgICAgICAgICBza2lsbElkczogW10sXHJcbiAgICAgICAgICAgICAgICAgIHRvb2xJZHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgICBjdXN0b21TeXN0ZW1Qcm9tcHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgXCJcdTRGNjBcdTY2MkZcdTRFMDBcdTRFMkEgaGVscGZ1bCBcdTc2ODQgQUkgXHU1MkE5XHU2MjRCXHVGRjBDXHU2NEM1XHU5NTdGXHU1NkRFXHU3QjU0XHU5NUVFXHU5ODk4XHUzMDAxXHU2M0QwXHU0RjlCXHU1RUZBXHU4QkFFXHU1NDhDXHU1MzRGXHU1MkE5XHU1QjhDXHU2MjEwXHU1NDA0XHU3OUNEXHU0RUZCXHU1MkExXHUzMDAyXCIsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbWVtb3J5OiB7XHJcbiAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgIGNvbnRlbnQ6IFwiXCIsXHJcbiAgICAgICAgICAgICAgICAgIGF1dG9FeHRyYWN0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICBtYXhUb2tlbnM6IDIwMDAsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcGVybWlzc2lvbnM6IFtdLFxyXG4gICAgICAgICAgICAgICAgY2FsbENvdW50OiAwLFxyXG4gICAgICAgICAgICAgICAgaXNEZWZhdWx0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgbGFzdEFjdGl2ZUF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgd3JpdGVBZ2VudHMoW2RlZmF1bHRBZ2VudF0pO1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiW0FQSV0gSW5pdGlhbGl6ZWQgZGVmYXVsdCBhZ2VudFwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFx1NjI2N1x1ODg0Q1x1NTIxRFx1NTlDQlx1NTMxNlxyXG4gICAgICAgICAgaW5pdGlhbGl6ZURlZmF1bHRBZ2VudCgpO1xyXG5cclxuICAgICAgICAgIC8vIEdFVCAvYXBpL2FnZW50cyAtIFx1ODNCN1x1NTNENlx1NjI0MFx1NjcwOSBBZ2VudHNcclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9hZ2VudHMgLSBcdTUyMUJcdTVFRkEgQWdlbnRcdUZGMDhcdTUzRUFcdTU5MDRcdTc0MDZcdTdDQkVcdTc4NkVcdThERUZcdTVGODRcdUZGMENcdTRFMERcdTUzMDVcdTYyRUNcdTVCNTBcdThERUZcdTVGODRcdUZGMDlcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2FnZW50c1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCBcIlwiO1xyXG4gICAgICAgICAgICAvLyBcdTUzRUFcdTU5MDRcdTc0MDZcdTdDQkVcdTc4NkVcdThERUZcdTVGODQgL2FwaS9hZ2VudHMgXHU2MjE2IC9hcGkvYWdlbnRzL1x1RkYwOFx1NEUwRFx1NTMwNVx1NjJFQyAvYXBpL2FnZW50cy91cGRhdGUgXHU3QjQ5XHU1QjUwXHU4REVGXHU1Rjg0XHVGRjA5XHJcbiAgICAgICAgICAgIGlmICh1cmwgIT09IFwiL1wiICYmIHVybCAhPT0gXCJcIiAmJiAhdXJsLnN0YXJ0c1dpdGgoXCI/XCIpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBhZ2VudHMgPSByZWFkQWdlbnRzKCk7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGFnZW50cyB9KSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICAvLyBQT1NUIC9hcGkvYWdlbnRzIC0gXHU1MjFCXHU1RUZBIEFnZW50XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGFnZW50cyA9IHJlYWRBZ2VudHMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0FnZW50ID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBgYWdlbnQtJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDkpfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYm9keS5uYW1lIHx8IFwiTmV3IEFnZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyOiBib2R5LmF2YXRhciB8fCBcIlx1RDgzRVx1REQxNlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBib2R5LmRlc2NyaXB0aW9uIHx8IFwiQSBoZWxwZnVsIEFJIGFnZW50XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgbGV2ZWw6IGJvZHkubGV2ZWwgfHwgXCJjdXN0b21cIixcclxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6IFwib25saW5lXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgc2VhdDogMSxcclxuICAgICAgICAgICAgICAgICAgICBjYXBhYmlsaXRpZXM6IGJvZHkuY2FwYWJpbGl0aWVzIHx8IHtcclxuICAgICAgICAgICAgICAgICAgICAgIG1vZGU6IFwicmF3XCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICBza2lsbElkczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgICB0b29sSWRzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbVN5c3RlbVByb21wdDogXCJcdTRGNjBcdTY2MkZcdTRFMDBcdTRFMkEgaGVscGZ1bCBcdTc2ODQgQUkgXHU1MkE5XHU2MjRCXHUzMDAyXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBtZW1vcnk6IGJvZHkubWVtb3J5IHx8IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb250ZW50OiBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgYXV0b0V4dHJhY3Q6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBtYXhUb2tlbnM6IDIwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwZXJtaXNzaW9uczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbENvdW50OiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzRGVmYXVsdDogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgICAgICBsYXN0QWN0aXZlQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICBhZ2VudHMucHVzaChuZXdBZ2VudCk7XHJcbiAgICAgICAgICAgICAgICAgIHdyaXRlQWdlbnRzKGFnZW50cyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IG5ld0FnZW50IH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBQVVQgL2FwaS9hZ2VudHMvOmlkIC0gXHU2NkY0XHU2NUIwIEFnZW50XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9hZ2VudHMvdXBkYXRlXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyBpZCwgLi4udXBkYXRlcyB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGFnZW50cyA9IHJlYWRBZ2VudHMoKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBhZ2VudHMuZmluZEluZGV4KChhOiBhbnkpID0+IGEuaWQgPT09IGlkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiQWdlbnQgbm90IGZvdW5kXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgYWdlbnRzW2luZGV4XSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5hZ2VudHNbaW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgICAgIC4uLnVwZGF0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICB3cml0ZUFnZW50cyhhZ2VudHMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBhZ2VudHNbaW5kZXhdIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIERFTEVURSAvYXBpL2FnZW50cy86aWQgLSBcdTUyMjBcdTk2NjQgQWdlbnRcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2FnZW50cy9kZWxldGVcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCB7IGlkIH0gPSBib2R5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgbGV0IGFnZW50cyA9IHJlYWRBZ2VudHMoKTtcclxuICAgICAgICAgICAgICAgICAgYWdlbnRzID0gYWdlbnRzLmZpbHRlcigoYTogYW55KSA9PiBhLmlkICE9PSBpZCk7XHJcbiAgICAgICAgICAgICAgICAgIHdyaXRlQWdlbnRzKGFnZW50cyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9hZ2VudHMvdHJpZ2dlciAtIFx1ODlFNlx1NTNEMSBBZ2VudCBcdTYyNjdcdTg4NENcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2FnZW50cy90cmlnZ2VyXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyBhZ2VudElkLCB0cmlnZ2VySWQgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBsZXQgYWdlbnRzID0gcmVhZEFnZW50cygpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBhZ2VudCA9IGFnZW50cy5maW5kKChhOiBhbnkpID0+IGEuaWQgPT09IGFnZW50SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKCFhZ2VudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJBZ2VudCBub3QgZm91bmRcIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTY2RjRcdTY1QjBcdTg5RTZcdTUzRDFcdTdFREZcdThCQTFcclxuICAgICAgICAgICAgICAgICAgaWYgKGFnZW50LnRyaWdnZXJzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdHJpZ2dlciA9IGFnZW50LnRyaWdnZXJzLmZpbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAodDogYW55KSA9PiB0LmlkID09PSB0cmlnZ2VySWQsXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHJpZ2dlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlci5sYXN0VHJpZ2dlcmVkID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgdHJpZ2dlci50cmlnZ2VyQ291bnQgPSAodHJpZ2dlci50cmlnZ2VyQ291bnQgfHwgMCkgKyAxO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU2NkY0XHU2NUIwIEFnZW50IFx1OEZEMFx1ODg0Q1x1N0VERlx1OEJBMVxyXG4gICAgICAgICAgICAgICAgICBhZ2VudC50b3RhbFJ1bnMgPSAoYWdlbnQudG90YWxSdW5zIHx8IDApICsgMTtcclxuICAgICAgICAgICAgICAgICAgYWdlbnQubGFzdFJ1bkF0ID0gRGF0ZS5ub3coKTtcclxuICAgICAgICAgICAgICAgICAgYWdlbnQuc3RhdHVzID0gXCJydW5uaW5nXCI7XHJcbiAgICAgICAgICAgICAgICAgIGFnZW50LnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICB3cml0ZUFnZW50cyhhZ2VudHMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgYWdlbnQsIHRyaWdnZXJlZDogdHJ1ZSB9LFxyXG4gICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIEdFVCAvYXBpL2FnZW50cy86aWQgLSBcdTgzQjdcdTUzRDZcdTUzNTVcdTRFMkEgQWdlbnRcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL2FnZW50cy9cIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB1cmwuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgLy8gXHU1M0VBXHU1OTA0XHU3NDA2IC9hcGkvYWdlbnRzLzppZCBcdTY4M0NcdTVGMEZcdUZGMENcdTYzOTJcdTk2NjRcdTUxNzZcdTRFRDZcdTVCNTBcdThERUZcdTVGODRcdTU5ODIgL2FjdGl2ZVxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgcGFydHMubGVuZ3RoICE9PSAxIHx8XHJcbiAgICAgICAgICAgICAgcGFydHNbMF0gPT09IFwiYWN0aXZlXCIgfHxcclxuICAgICAgICAgICAgICByZXEubWV0aG9kICE9PSBcIkdFVFwiXHJcbiAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICByZXR1cm4gbmV4dCgpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaWQgPSBwYXJ0c1swXS5zcGxpdChcIj9cIilbMF07XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGFnZW50cyA9IHJlYWRBZ2VudHMoKTtcclxuICAgICAgICAgICAgICBjb25zdCBhZ2VudCA9IGFnZW50cy5maW5kKChhOiBhbnkpID0+IGEuaWQgPT09IGlkKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYgKCFhZ2VudCkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogXCJBZ2VudCBub3QgZm91bmRcIiB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogYWdlbnQgfSkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gR0VUL1BPU1QgL2FwaS9hZ2VudHMvYWN0aXZlIC0gXHU2RDNCXHU4REMzIEFnZW50IFx1N0JBMVx1NzQwNlxyXG4gICAgICAgICAgY29uc3QgQUNUSVZFX0FHRU5UX0ZJTEUgPSBwYXRoLmpvaW4oXHJcbiAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXHJcbiAgICAgICAgICAgIFwiLmRhdGFcIixcclxuICAgICAgICAgICAgXCJhY3RpdmUtYWdlbnQuanNvblwiLFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9hZ2VudHMvYWN0aXZlXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIC8vIFx1ODNCN1x1NTNENlx1NkQzQlx1OERDMyBBZ2VudCBJRFxyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWN0aXZlSWQgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoQUNUSVZFX0FHRU5UX0ZJTEUpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKFxyXG4gICAgICAgICAgICAgICAgICAgIGZzLnJlYWRGaWxlU3luYyhBQ1RJVkVfQUdFTlRfRklMRSwgXCJ1dGYtOFwiKSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgYWN0aXZlSWQgPSBkYXRhLmlkO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgLy8gXHU1OTgyXHU2NzlDXHU2Q0ExXHU2NzA5XHU4QkJFXHU3RjZFXHVGRjBDXHU4RkQ0XHU1NkRFXHU3QjJDXHU0RTAwXHU0RTJBIGFnZW50XHJcbiAgICAgICAgICAgICAgICBpZiAoIWFjdGl2ZUlkKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGFnZW50cyA9IHJlYWRBZ2VudHMoKTtcclxuICAgICAgICAgICAgICAgICAgYWN0aXZlSWQgPSBhZ2VudHNbMF0/LmlkIHx8IG51bGw7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyBpZDogYWN0aXZlSWQgfSB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgIC8vIFx1OEJCRVx1N0Y2RVx1NkQzQlx1OERDMyBBZ2VudCBJRFxyXG4gICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXTtcclxuICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCB7IGlkIH0gPSBib2R5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhcclxuICAgICAgICAgICAgICAgICAgICBBQ1RJVkVfQUdFTlRfRklMRSxcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IGlkLCB1cGRhdGVkQXQ6IERhdGUubm93KCkgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgXCJ1dGYtOFwiLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gU2tpbGxzIEFQSSAtIFx1NjI4MFx1ODBGRFx1N0JBMVx1NzQwNlxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgICAgICAgICBjb25zdCBTS0lMTFNfRklMRSA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCBcIi5kYXRhXCIsIFwic2tpbGxzLmpzb25cIik7XHJcblxyXG4gICAgICAgICAgLy8gXHU3ODZFXHU0RkREXHU2NTcwXHU2MzZFXHU3NkVFXHU1RjU1XHU1QjU4XHU1NzI4XHJcbiAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMocGF0aC5kaXJuYW1lKFNLSUxMU19GSUxFKSkpIHtcclxuICAgICAgICAgICAgZnMubWtkaXJTeW5jKHBhdGguZGlybmFtZShTS0lMTFNfRklMRSksIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFNraWxscyBcdTc2RUVcdTVGNTVcdThERUZcdTVGODRcclxuICAgICAgICAgIGNvbnN0IFNLSUxMU19ESVIgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgXCIuc2tpbGxzXCIpO1xyXG5cclxuICAgICAgICAgIC8vIFx1Nzg2RVx1NEZERCBTa2lsbHMgXHU3NkVFXHU1RjU1XHU1QjU4XHU1NzI4XHJcbiAgICAgICAgICBmdW5jdGlvbiBlbnN1cmVTa2lsbHNEaXIoKSB7XHJcbiAgICAgICAgICAgIGlmICghZnMuZXhpc3RzU3luYyhTS0lMTFNfRElSKSkge1xyXG4gICAgICAgICAgICAgIGZzLm1rZGlyU3luYyhTS0lMTFNfRElSLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFx1ODlFM1x1Njc5MCBTS0lMTC5tZCBcdTY1ODdcdTRFRjZcclxuICAgICAgICAgIGZ1bmN0aW9uIHBhcnNlU2tpbGxNZChcclxuICAgICAgICAgICAgY29udGVudDogc3RyaW5nLFxyXG4gICAgICAgICAgICBza2lsbElkOiBzdHJpbmcsXHJcbiAgICAgICAgICAgIGRpck5hbWU6IHN0cmluZyxcclxuICAgICAgICAgICk6IGFueSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGxpbmVzID0gY29udGVudC5zcGxpdChcIlxcblwiKTtcclxuICAgICAgICAgICAgY29uc3Qgc2tpbGw6IGFueSA9IHtcclxuICAgICAgICAgICAgICBpZDogc2tpbGxJZCxcclxuICAgICAgICAgICAgICBuYW1lOiBkaXJOYW1lLnJlcGxhY2UoLy0vZywgXCIgXCIpLFxyXG4gICAgICAgICAgICAgIGljb246IFwiXHVEODNEXHVERDI3XCIsXHJcbiAgICAgICAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXHJcbiAgICAgICAgICAgICAgY29udGVudDogXCJcIixcclxuICAgICAgICAgICAgICBzeXN0ZW1Qcm9tcHQ6IFwiXCIsXHJcbiAgICAgICAgICAgICAgY2F0ZWdvcnk6IFwiY3VzdG9tXCIsXHJcbiAgICAgICAgICAgICAgdmVyc2lvbjogXCIxLjAuMFwiLFxyXG4gICAgICAgICAgICAgIGlzQnVpbHRJbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgIHRhZ3M6IFtdLFxyXG4gICAgICAgICAgICAgIHRvb2xzOiBbXSxcclxuICAgICAgICAgICAgICB1c2FnZVNjZW5hcmlvczogW10sXHJcbiAgICAgICAgICAgICAgYXV0aG9yOiBcInVzZXJcIixcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzZWN0aW9uID0gXCJcIjtcclxuICAgICAgICAgICAgbGV0IHByb21wdExpbmVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICAgICAgICBsZXQgaW5Qcm9tcHQgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICBjb25zdCBsaW5lID0gbGluZXNbaV07XHJcblxyXG4gICAgICAgICAgICAgIC8vIFx1ODlFM1x1Njc5MFx1NjgwN1x1OTg5OFxyXG4gICAgICAgICAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCIjIFwiKSAmJiAhbGluZS5zdGFydHNXaXRoKFwiIyMgXCIpKSB7XHJcbiAgICAgICAgICAgICAgICBza2lsbC5uYW1lID0gbGluZS5zdWJzdHJpbmcoMikudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBcdTg5RTNcdTY3OTBcdTdBRTBcdTgyODJcclxuICAgICAgICAgICAgICBpZiAobGluZS5zdGFydHNXaXRoKFwiIyMgXCIpKSB7XHJcbiAgICAgICAgICAgICAgICBzZWN0aW9uID0gbGluZS5zdWJzdHJpbmcoMykudHJpbSgpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICBpblByb21wdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBcdTg5RTNcdTY3OTBcdTUxNDNcdTY1NzBcdTYzNkVcclxuICAgICAgICAgICAgICBpZiAoc2VjdGlvbiA9PT0gXCJcdTUxNDNcdTY1NzBcdTYzNkVcIiB8fCBzZWN0aW9uID09PSBcIm1ldGFkYXRhXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCItICoqXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCgvLSBcXCpcXCooXFx3KylcXCpcXCo6XFxzKmA/KC4rPylgPyQvKTtcclxuICAgICAgICAgICAgICAgICAgaWYgKG1hdGNoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgWywga2V5LCB2YWx1ZV0gPSBtYXRjaDtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGtleS50b0xvd2VyQ2FzZSgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaWRcIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGwuaWQgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXHU1NkZFXHU2ODA3XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiaWNvblwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBza2lsbC5pY29uID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlx1NTIwNlx1N0M3QlwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImNhdGVnb3J5XCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNraWxsLmNhdGVnb3J5ID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlx1NzI0OFx1NjcyQ1wiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSBcInZlcnNpb25cIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGwudmVyc2lvbiA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcdTY4MDdcdTdCN0VcIjpcclxuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJ0YWdzXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNraWxsLnRhZ3MgPSB2YWx1ZS5zcGxpdChcIixcIikubWFwKCh0KSA9PiB0LnRyaW0oKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSBcIlx1NEY1Q1x1ODAwNVwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgY2FzZSBcImF1dGhvclwiOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBza2lsbC5hdXRob3IgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiXHU1MTg1XHU3RjZFXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICBjYXNlIFwiYnVpbHQtaW5cIjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgc2tpbGwuaXNCdWlsdEluID0gdmFsdWUgPT09IFwidHJ1ZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJcdTU0MkZcdTc1MjhcIjpcclxuICAgICAgICAgICAgICAgICAgICAgIGNhc2UgXCJlbmFibGVkXCI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNraWxsLmVuYWJsZWQgPSB2YWx1ZSAhPT0gXCJmYWxzZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIC8vIFx1ODlFM1x1Njc5MFx1NjNDRlx1OEZGMFxyXG4gICAgICAgICAgICAgIGlmIChzZWN0aW9uID09PSBcIlx1NjNDRlx1OEZGMFwiIHx8IHNlY3Rpb24gPT09IFwiZGVzY3JpcHRpb25cIikge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpICYmICFsaW5lLnN0YXJ0c1dpdGgoXCItXCIpKSB7XHJcbiAgICAgICAgICAgICAgICAgIHNraWxsLmRlc2NyaXB0aW9uID0gbGluZS50cmltKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBcdTg5RTNcdTY3OTBcdTRGN0ZcdTc1MjhcdTU3M0FcdTY2NkZcclxuICAgICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgICBzZWN0aW9uID09PSBcIlx1NEY3Rlx1NzUyOFx1NTczQVx1NjY2RlwiIHx8XHJcbiAgICAgICAgICAgICAgICBzZWN0aW9uID09PSBcInVzYWdlIHNjZW5hcmlvc1wiIHx8XHJcbiAgICAgICAgICAgICAgICBzZWN0aW9uID09PSBcInVzYWdlc2NlbmFyaW9zXCJcclxuICAgICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCItIFwiKSkge1xyXG4gICAgICAgICAgICAgICAgICBza2lsbC51c2FnZVNjZW5hcmlvcy5wdXNoKGxpbmUuc3Vic3RyaW5nKDIpLnRyaW0oKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBcdTg5RTNcdTY3OTBcdTUzRUZcdTc1MjhcdTVERTVcdTUxNzdcclxuICAgICAgICAgICAgICBpZiAoc2VjdGlvbiA9PT0gXCJcdTUzRUZcdTc1MjhcdTVERTVcdTUxNzdcIiB8fCBzZWN0aW9uID09PSBcInRvb2xzXCIpIHtcclxuICAgICAgICAgICAgICAgIGlmIChsaW5lLnN0YXJ0c1dpdGgoXCItIFwiKSkge1xyXG4gICAgICAgICAgICAgICAgICBza2lsbC50b29scy5wdXNoKGxpbmUuc3Vic3RyaW5nKDIpLnRyaW0oKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAvLyBcdTg5RTNcdTY3OTAgUHJvbXB0XHJcbiAgICAgICAgICAgICAgaWYgKHNlY3Rpb24gPT09IFwicHJvbXB0XCIgfHwgKGxpbmUuc3RhcnRzV2l0aChcIi0tLVwiKSAmJiBzZWN0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGxpbmUuc3RhcnRzV2l0aChcIi0tLVwiKSkge1xyXG4gICAgICAgICAgICAgICAgICBpblByb21wdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKGluUHJvbXB0IHx8IHNlY3Rpb24gPT09IFwicHJvbXB0XCIpIHtcclxuICAgICAgICAgICAgICAgICAgcHJvbXB0TGluZXMucHVzaChsaW5lKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHNraWxsLmNvbnRlbnQgPSBwcm9tcHRMaW5lcy5qb2luKFwiXFxuXCIpLnRyaW0oKTtcclxuICAgICAgICAgICAgc2tpbGwuc3lzdGVtUHJvbXB0ID0gc2tpbGwuY29udGVudDtcclxuICAgICAgICAgICAgcmV0dXJuIHNraWxsO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFx1NzUxRlx1NjIxMCBTS0lMTC5tZCBcdTUxODVcdTVCQjlcclxuICAgICAgICAgIGZ1bmN0aW9uIGdlbmVyYXRlU2tpbGxNZChza2lsbDogYW55KTogc3RyaW5nIHtcclxuICAgICAgICAgICAgY29uc3QgdXNhZ2VTY2VuYXJpb3MgPSBza2lsbC51c2FnZVNjZW5hcmlvcyB8fCBbXTtcclxuICAgICAgICAgICAgcmV0dXJuIGAjICR7c2tpbGwubmFtZX1cclxuXHJcbiMjIFx1NjNDRlx1OEZGMFxyXG4ke3NraWxsLmRlc2NyaXB0aW9uIHx8IFwiXCJ9XHJcblxyXG4jIyBcdTUxNDNcdTY1NzBcdTYzNkVcclxuLSAqKklEKio6IFxcYCR7c2tpbGwuaWR9XFxgXHJcbi0gKipcdTU2RkVcdTY4MDcqKjogJHtza2lsbC5pY29uIHx8IFwiXHVEODNEXHVERDI3XCJ9XHJcbi0gKipcdTUyMDZcdTdDN0IqKjogJHtza2lsbC5jYXRlZ29yeSB8fCBcImN1c3RvbVwifVxyXG4tICoqXHU3MjQ4XHU2NzJDKio6ICR7c2tpbGwudmVyc2lvbiB8fCBcIjEuMC4wXCJ9XHJcbi0gKipcdTY4MDdcdTdCN0UqKjogJHsoc2tpbGwudGFncyB8fCBbXSkuam9pbihcIiwgXCIpfVxyXG4tICoqXHU0RjVDXHU4MDA1Kio6ICR7c2tpbGwuYXV0aG9yIHx8IFwiXCJ9XHJcbi0gKipcdTUxODVcdTdGNkUqKjogJHtza2lsbC5pc0J1aWx0SW4gfHwgZmFsc2V9XHJcbi0gKipcdTU0MkZcdTc1MjgqKjogJHtza2lsbC5lbmFibGVkID8/IHRydWV9XHJcblxyXG4jIyBcdTRGN0ZcdTc1MjhcdTU3M0FcdTY2NkZcclxuJHt1c2FnZVNjZW5hcmlvcy5tYXAoKHM6IHN0cmluZykgPT4gYC0gJHtzfWApLmpvaW4oXCJcXG5cIikgfHwgXCItIFx1NjY4Mlx1NjVFMFx1NEY3Rlx1NzUyOFx1NTczQVx1NjY2RlwifVxyXG5cclxuIyMgXHU1M0VGXHU3NTI4XHU1REU1XHU1MTc3XHJcbiR7KHNraWxsLnRvb2xzIHx8IFtdKS5tYXAoKHQ6IHN0cmluZykgPT4gYC0gJHt0fWApLmpvaW4oXCJcXG5cIikgfHwgXCItIFx1NjY4Mlx1NjVFMFx1NURFNVx1NTE3N1wifVxyXG5cclxuLS0tXHJcblxyXG4jIyBQcm9tcHRcclxuXHJcbiR7c2tpbGwuY29udGVudCB8fCBza2lsbC5zeXN0ZW1Qcm9tcHQgfHwgXCJcIn1cclxuYDtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBcdThCRkJcdTUzRDZcdTYyNDBcdTY3MDkgU2tpbGxzIChcdTRFQ0UgU0tJTEwubWQgXHU2NTg3XHU0RUY2KVxyXG4gICAgICAgICAgZnVuY3Rpb24gcmVhZFNraWxscygpOiBhbnlbXSB7XHJcbiAgICAgICAgICAgIGVuc3VyZVNraWxsc0RpcigpO1xyXG4gICAgICAgICAgICBjb25zdCBza2lsbHM6IGFueVtdID0gW107XHJcblxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGRpcnMgPSBmcy5yZWFkZGlyU3luYyhTS0lMTFNfRElSLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSk7XHJcblxyXG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZGlyIG9mIGRpcnMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkaXIuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBza2lsbEZpbGUgPSBwYXRoLmpvaW4oU0tJTExTX0RJUiwgZGlyLm5hbWUsIFwiU0tJTEwubWRcIik7XHJcbiAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNraWxsRmlsZSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKHNraWxsRmlsZSwgXCJ1dGYtOFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0ID0gZnMuc3RhdFN5bmMoc2tpbGxGaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBza2lsbCA9IHBhcnNlU2tpbGxNZChjb250ZW50LCBkaXIubmFtZSwgZGlyLm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHNraWxsLmNyZWF0ZWRBdCA9IHN0YXQuYmlydGh0aW1lTXM7XHJcbiAgICAgICAgICAgICAgICAgICAgc2tpbGwudXBkYXRlZEF0ID0gc3RhdC5tdGltZU1zO1xyXG4gICAgICAgICAgICAgICAgICAgIHNraWxscy5wdXNoKHNraWxsKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJXSBGYWlsZWQgdG8gcmVhZCBza2lsbHM6XCIsIGUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gc2tpbGxzLnNvcnQoKGEsIGIpID0+IGIudXBkYXRlZEF0IC0gYS51cGRhdGVkQXQpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFx1NTE5OVx1NTE2NSBTa2lsbCAoXHU1MjFCXHU1RUZBL1x1NjZGNFx1NjVCMCBTS0lMTC5tZCBcdTY1ODdcdTRFRjYpXHJcbiAgICAgICAgICBmdW5jdGlvbiB3cml0ZVNraWxsKHNraWxsOiBhbnkpOiB2b2lkIHtcclxuICAgICAgICAgICAgZW5zdXJlU2tpbGxzRGlyKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGRpck5hbWUgPVxyXG4gICAgICAgICAgICAgIHNraWxsLmlkIHx8IHNraWxsLm5hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9cXHMrL2csIFwiLVwiKTtcclxuICAgICAgICAgICAgY29uc3Qgc2tpbGxEaXIgPSBwYXRoLmpvaW4oU0tJTExTX0RJUiwgZGlyTmFtZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoc2tpbGxEaXIpKSB7XHJcbiAgICAgICAgICAgICAgZnMubWtkaXJTeW5jKHNraWxsRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3Qgc2tpbGxGaWxlID0gcGF0aC5qb2luKHNraWxsRGlyLCBcIlNLSUxMLm1kXCIpO1xyXG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gZ2VuZXJhdGVTa2lsbE1kKHNraWxsKTtcclxuICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhza2lsbEZpbGUsIGNvbnRlbnQsIFwidXRmLThcIik7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gXHU1MjIwXHU5NjY0IFNraWxsIChcdTUyMjBcdTk2NjRcdTc2RUVcdTVGNTUpXHJcbiAgICAgICAgICBmdW5jdGlvbiBkZWxldGVTa2lsbERpcihza2lsbElkOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgY29uc3Qgc2tpbGxEaXIgPSBwYXRoLmpvaW4oU0tJTExTX0RJUiwgc2tpbGxJZCk7XHJcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNraWxsRGlyKSkge1xyXG4gICAgICAgICAgICAgIGZzLnJtU3luYyhza2lsbERpciwgeyByZWN1cnNpdmU6IHRydWUsIGZvcmNlOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBHRVQgL2FwaS9za2lsbHMgLSBcdTgzQjdcdTUzRDZcdTYyNDBcdTY3MDkgU2tpbGxzXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9za2lsbHNcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgaWYgKHVybCAhPT0gXCIvXCIgJiYgdXJsICE9PSBcIlwiICYmICF1cmwuc3RhcnRzV2l0aChcIj9cIikpIHtcclxuICAgICAgICAgICAgICByZXR1cm4gbmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHNraWxscyA9IHJlYWRTa2lsbHMoKTtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc2tpbGxzIH0pKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgIC8vIFBPU1QgL2FwaS9za2lsbHMgLSBcdTUyMUJcdTVFRkEgU2tpbGxcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1NraWxsID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOlxyXG4gICAgICAgICAgICAgICAgICAgICAgYm9keS5pZCB8fFxyXG4gICAgICAgICAgICAgICAgICAgICAgYHNraWxsLSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zbGljZSgyLCA5KX1gLFxyXG4gICAgICAgICAgICAgICAgICAgIC4uLmJvZHksXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHU1QjU3XHU2QkI1XHU2NjIwXHU1QzA0XHVGRjFBXHU2NTJGXHU2MzAxIGNvbnRlbnQgXHU1NDhDIHN5c3RlbVByb21wdCBcdTRFMjRcdTc5Q0RcdTVCNTdcdTZCQjVcdTU0MERcclxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1Qcm9tcHQ6IGJvZHkuY29udGVudCB8fCBib2R5LnN5c3RlbVByb21wdCB8fCBcIlwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHVzYWdlU2NlbmFyaW9zOiBib2R5LnVzYWdlU2NlbmFyaW9zIHx8IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzQnVpbHRJbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHdyaXRlU2tpbGwobmV3U2tpbGwpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBuZXdTa2lsbCB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gR0VUIC9hcGkvc2tpbGxzLzppZCAtIFx1ODNCN1x1NTNENlx1NTM1NVx1NEUyQSBTa2lsbFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvc2tpbGxzL1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCBcIlwiO1xyXG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHVybC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAvLyBcdTUzRUFcdTU5MDRcdTc0MDZcdTUzNTVcdTRFMkEgSUQgXHU3Njg0XHU2MEM1XHU1MUI1XHVGRjBDXHU2MzkyXHU5NjY0IHVwZGF0ZS9kZWxldGUgXHU3QjQ5XHU1QjUwXHU4REVGXHU1Rjg0XHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICBwYXJ0cy5sZW5ndGggIT09IDEgfHxcclxuICAgICAgICAgICAgICBbXCJ1cGRhdGVcIiwgXCJkZWxldGVcIl0uaW5jbHVkZXMocGFydHNbMF0pIHx8XHJcbiAgICAgICAgICAgICAgcmVxLm1ldGhvZCAhPT0gXCJHRVRcIlxyXG4gICAgICAgICAgICApIHtcclxuICAgICAgICAgICAgICByZXR1cm4gbmV4dCgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb25zdCBpZCA9IHBhcnRzWzBdLnNwbGl0KFwiP1wiKVswXTtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCBza2lsbHMgPSByZWFkU2tpbGxzKCk7XHJcbiAgICAgICAgICAgICAgY29uc3Qgc2tpbGwgPSBza2lsbHMuZmluZCgoczogYW55KSA9PiBzLmlkID09PSBpZCk7XHJcblxyXG4gICAgICAgICAgICAgIGlmICghc2tpbGwpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2tpbGwgbm90IGZvdW5kXCIgfSksXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHNraWxsIH0pKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9za2lsbHMvdXBkYXRlIC0gXHU2NkY0XHU2NUIwIFNraWxsXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9za2lsbHMvdXBkYXRlXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyBpZCwgLi4udXBkYXRlcyB9ID0gYm9keTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHNraWxscyA9IHJlYWRTa2lsbHMoKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBza2lsbHMuZmluZEluZGV4KChzOiBhbnkpID0+IHMuaWQgPT09IGlkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiU2tpbGwgbm90IGZvdW5kXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgLy8gXHU0RTBEXHU1MTQxXHU4QkI4XHU0RkVFXHU2NTM5XHU1MTg1XHU3RjZFXHU2MjgwXHU4MEZEXHU2ODA3XHU4QkIwXHU1NDhDSURcclxuICAgICAgICAgICAgICAgICAgZGVsZXRlIHVwZGF0ZXMuaXNCdWlsdEluO1xyXG4gICAgICAgICAgICAgICAgICBkZWxldGUgdXBkYXRlcy5pZDtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NUI1N1x1NkJCNVx1NjYyMFx1NUMwNFxyXG4gICAgICAgICAgICAgICAgICBpZiAodXBkYXRlcy5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVzLnN5c3RlbVByb21wdCA9IHVwZGF0ZXMuY29udGVudDtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBpZiAodXBkYXRlcy51c2FnZVNjZW5hcmlvcyA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlcy51c2FnZVNjZW5hcmlvcyA9IHNraWxsc1tpbmRleF0udXNhZ2VTY2VuYXJpb3MgfHwgW107XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZWRTa2lsbCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5za2lsbHNbaW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgICAgIC4uLnVwZGF0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICB3cml0ZVNraWxsKHVwZGF0ZWRTa2lsbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHVwZGF0ZWRTa2lsbCB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBQT1NUIC9hcGkvc2tpbGxzL2RlbGV0ZSAtIFx1NTIyMFx1OTY2NCBTa2lsbFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvc2tpbGxzL2RlbGV0ZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaWQgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBza2lsbHMgPSByZWFkU2tpbGxzKCk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHNraWxsID0gc2tpbGxzLmZpbmQoKHM6IGFueSkgPT4gcy5pZCA9PT0gaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKHNraWxsICYmIHNraWxsLmlzQnVpbHRJbikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAzO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJDYW5ub3QgZGVsZXRlIGJ1aWx0LWluIHNraWxsXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgZGVsZXRlU2tpbGxEaXIoaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gTWVtb3J5IEFQSSAtIFx1OEJCMFx1NUZDNlx1N0JBMVx1NzQwNlxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbiAgICAgICAgICBjb25zdCBNRU1PUklFU19GSUxFID0gcGF0aC5qb2luKFxyXG4gICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICBcIi5kYXRhXCIsXHJcbiAgICAgICAgICAgIFwibWVtb3JpZXMuanNvblwiLFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiByZWFkTWVtb3JpZXMoKTogYW55W10ge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKE1FTU9SSUVTX0ZJTEUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoTUVNT1JJRVNfRklMRSwgXCJ1dGYtOFwiKSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEldIEZhaWxlZCB0byByZWFkIG1lbW9yaWVzOlwiLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gW107XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgZnVuY3Rpb24gd3JpdGVNZW1vcmllcyhtZW1vcmllczogYW55W10pIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFxyXG4gICAgICAgICAgICAgICAgTUVNT1JJRVNfRklMRSxcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KG1lbW9yaWVzLCBudWxsLCAyKSxcclxuICAgICAgICAgICAgICAgIFwidXRmLThcIixcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEldIEZhaWxlZCB0byB3cml0ZSBtZW1vcmllczpcIiwgZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBHRVQgL2FwaS9tZW1vcmllcyAtIFx1ODNCN1x1NTNENlx1NjI0MFx1NjcwOVx1OEJCMFx1NUZDNlxyXG4gICAgICAgICAgLy8gUE9TVCAvYXBpL21lbW9yaWVzIC0gXHU1MjFCXHU1RUZBXHU4QkIwXHU1RkM2XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9tZW1vcmllc1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCBcIlwiO1xyXG4gICAgICAgICAgICBpZiAodXJsICE9PSBcIi9cIiAmJiB1cmwgIT09IFwiXCIgJiYgIXVybC5zdGFydHNXaXRoKFwiP1wiKSkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBuZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgbWVtb3JpZXMgPSByZWFkTWVtb3JpZXMoKTtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbWVtb3JpZXMgfSkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG1lbW9yaWVzID0gcmVhZE1lbW9yaWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBGSVg6IFx1NkRGQlx1NTJBMCBlbmFibGVkIFx1OUVEOFx1OEJBNFx1NTAzQyB0cnVlXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld01lbW9yeSA9IHtcclxuICAgICAgICAgICAgICAgICAgICBpZDogYG1lbS0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgOSl9YCxcclxuICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIC4uLmJvZHksXHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIG1lbW9yaWVzLnB1c2gobmV3TWVtb3J5KTtcclxuICAgICAgICAgICAgICAgICAgd3JpdGVNZW1vcmllcyhtZW1vcmllcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IG5ld01lbW9yeSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gR0VUIC9hcGkvbWVtb3JpZXMvOmlkIC0gXHU4M0I3XHU1M0Q2XHU1MzU1XHU0RTJBXHU4QkIwXHU1RkM2XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9tZW1vcmllcy9cIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB1cmwuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgLy8gXHU1M0VBXHU1OTA0XHU3NDA2XHU1MzU1XHU0RTJBIElEIFx1NzY4NFx1NjBDNVx1NTFCNVx1RkYwQ1x1NjM5Mlx1OTY2NCB1cGRhdGUvZGVsZXRlL3NlYXJjaC9zdGF0cy9jbGVhciBcdTdCNDlcdTVCNTBcdThERUZcdTVGODRcclxuICAgICAgICAgICAgY29uc3QgcmVzZXJ2ZWRQYXRocyA9IFtcclxuICAgICAgICAgICAgICBcInVwZGF0ZVwiLFxyXG4gICAgICAgICAgICAgIFwiZGVsZXRlXCIsXHJcbiAgICAgICAgICAgICAgXCJzZWFyY2hcIixcclxuICAgICAgICAgICAgICBcInN0YXRzXCIsXHJcbiAgICAgICAgICAgICAgXCJjbGVhclwiLFxyXG4gICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgcGFydHMubGVuZ3RoICE9PSAxIHx8XHJcbiAgICAgICAgICAgICAgcmVzZXJ2ZWRQYXRocy5pbmNsdWRlcyhwYXJ0c1swXSkgfHxcclxuICAgICAgICAgICAgICByZXEubWV0aG9kICE9PSBcIkdFVFwiXHJcbiAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgIHJldHVybiBuZXh0KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gcGFydHNbMF0uc3BsaXQoXCI/XCIpWzBdO1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IG1lbW9yaWVzID0gcmVhZE1lbW9yaWVzKCk7XHJcbiAgICAgICAgICAgICAgY29uc3QgbWVtb3J5ID0gbWVtb3JpZXMuZmluZCgobTogYW55KSA9PiBtLmlkID09PSBpZCk7XHJcblxyXG4gICAgICAgICAgICAgIGlmICghbWVtb3J5KSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBcIk1lbW9yeSBub3QgZm91bmRcIiB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbWVtb3J5IH0pKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9tZW1vcmllcy91cGRhdGUgLSBcdTY2RjRcdTY1QjBcdThCQjBcdTVGQzZcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL21lbW9yaWVzL3VwZGF0ZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaWQsIC4uLnVwZGF0ZXMgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBtZW1vcmllcyA9IHJlYWRNZW1vcmllcygpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IG1lbW9yaWVzLmZpbmRJbmRleCgobTogYW55KSA9PiBtLmlkID09PSBpZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDQ7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIk1lbW9yeSBub3QgZm91bmRcIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICBtZW1vcmllc1tpbmRleF0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLi4ubWVtb3JpZXNbaW5kZXhdLFxyXG4gICAgICAgICAgICAgICAgICAgIC4uLnVwZGF0ZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICB3cml0ZU1lbW9yaWVzKG1lbW9yaWVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbWVtb3JpZXNbaW5kZXhdIH0pLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9tZW1vcmllcy9kZWxldGUgLSBcdTUyMjBcdTk2NjRcdThCQjBcdTVGQzZcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL21lbW9yaWVzL2RlbGV0ZVwiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaWQgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBsZXQgbWVtb3JpZXMgPSByZWFkTWVtb3JpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgbWVtb3JpZXMgPSBtZW1vcmllcy5maWx0ZXIoKG06IGFueSkgPT4gbS5pZCAhPT0gaWQpO1xyXG4gICAgICAgICAgICAgICAgICB3cml0ZU1lbW9yaWVzKG1lbW9yaWVzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IGlkLCBkZWxldGVkOiB0cnVlIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gUE9TVCAvYXBpL21lbW9yaWVzL3NlYXJjaCAtIFx1NjQxQ1x1N0QyMlx1OEJCMFx1NUZDNlxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvbWVtb3JpZXMvc2VhcmNoXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyBxdWVyeSwgY2F0ZWdvcnksIG1pbkltcG9ydGFuY2UsIGxpbWl0ID0gNTAgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBsZXQgbWVtb3JpZXMgPSByZWFkTWVtb3JpZXMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGlmIChjYXRlZ29yeSkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lbW9yaWVzID0gbWVtb3JpZXMuZmlsdGVyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgKG06IGFueSkgPT4gbS5jYXRlZ29yeSA9PT0gY2F0ZWdvcnksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKG1pbkltcG9ydGFuY2UgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG1lbW9yaWVzID0gbWVtb3JpZXMuZmlsdGVyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgKG06IGFueSkgPT4gbS5pbXBvcnRhbmNlID49IG1pbkltcG9ydGFuY2UsXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKHF1ZXJ5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcSA9IHF1ZXJ5LnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVtb3JpZXMgPSBtZW1vcmllcy5maWx0ZXIoKG06IGFueSkgPT5cclxuICAgICAgICAgICAgICAgICAgICAgIG0uY29udGVudC50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHEpLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIG1lbW9yaWVzID0gbWVtb3JpZXMuc2xpY2UoMCwgbGltaXQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBtZW1vcmllcyB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gR0VUIC9hcGkvbWVtb3JpZXMvc3RhdHMgLSBcdTgzQjdcdTUzRDZcdThCQjBcdTVGQzZcdTdFREZcdThCQTFcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL21lbW9yaWVzL3N0YXRzXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtZW1vcmllcyA9IHJlYWRNZW1vcmllcygpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYnlDYXRlZ29yeTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xyXG5cclxuICAgICAgICAgICAgICAgIG1lbW9yaWVzLmZvckVhY2goKG06IGFueSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICBieUNhdGVnb3J5W20uY2F0ZWdvcnldID0gKGJ5Q2F0ZWdvcnlbbS5jYXRlZ29yeV0gfHwgMCkgKyAxO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICB0b3RhbDogbWVtb3JpZXMubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogbWVtb3JpZXMuZmlsdGVyKChtOiBhbnkpID0+IG0uZW5hYmxlZCkubGVuZ3RoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgYnlDYXRlZ29yeSxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9tZW1vcmllcy9jbGVhciAtIFx1NkUwNVx1N0E3QVx1NjI0MFx1NjcwOVx1OEJCMFx1NUZDNlxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvbWVtb3JpZXMvY2xlYXJcIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB3cml0ZU1lbW9yaWVzKFtdKTtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IGNsZWFyZWQ6IHRydWUgfSB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgICAvLyBNQ1AgU2VydmVycyBBUEkgLSBNQ1AgXHU2NzBEXHU1MkExXHU1NjY4XHU3QkExXHU3NDA2XHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIGNvbnN0IE1DUF9TRVJWRVJTX0ZJTEUgPSBwYXRoLmpvaW4oXHJcbiAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXHJcbiAgICAgICAgICAgIFwiLmRhdGFcIixcclxuICAgICAgICAgICAgXCJtY3Atc2VydmVycy5qc29uXCIsXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIGZ1bmN0aW9uIHJlYWRNQ1BTZXJ2ZXJzKCk6IGFueVtdIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhNQ1BfU0VSVkVSU19GSUxFKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIEpTT04ucGFyc2UoZnMucmVhZEZpbGVTeW5jKE1DUF9TRVJWRVJTX0ZJTEUsIFwidXRmLThcIikpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJXSBGYWlsZWQgdG8gcmVhZCBNQ1Agc2VydmVyczpcIiwgZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFtdO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGZ1bmN0aW9uIHdyaXRlTUNQU2VydmVycyhzZXJ2ZXJzOiBhbnlbXSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoXHJcbiAgICAgICAgICAgICAgICBNQ1BfU0VSVkVSU19GSUxFLFxyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2VydmVycywgbnVsbCwgMiksXHJcbiAgICAgICAgICAgICAgICBcInV0Zi04XCIsXHJcbiAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJbQVBJXSBGYWlsZWQgdG8gd3JpdGUgTUNQIHNlcnZlcnM6XCIsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gR0VUIC9hcGkvbWNwL3NlcnZlcnMgLSBcdTgzQjdcdTUzRDZcdTYyNDBcdTY3MDkgTUNQIFx1NjcwRFx1NTJBMVx1NTY2OFxyXG4gICAgICAgICAgLy8gUE9TVCAvYXBpL21jcC9zZXJ2ZXJzIC0gXHU1MjFCXHU1RUZBIE1DUCBcdTY3MERcdTUyQTFcdTU2NjhcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL21jcC9zZXJ2ZXJzXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsIHx8IFwiXCI7XHJcbiAgICAgICAgICAgIGlmICh1cmwgIT09IFwiL1wiICYmIHVybCAhPT0gXCJcIiAmJiAhdXJsLnN0YXJ0c1dpdGgoXCI/XCIpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXJzID0gcmVhZE1DUFNlcnZlcnMoKTtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogc2VydmVycyB9KSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVycyA9IHJlYWRNQ1BTZXJ2ZXJzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBGSVg6IFx1N0VERlx1NEUwMFx1NzUxRlx1NjIxMFx1NEUwMFx1NEUyQSBJRFx1RkYwQ1x1OTA3Rlx1NTE0RCBzZXJ2ZXIuaWQgXHU1NDhDIHNlcnZlci5jb25maWcuaWQgXHU0RTBEXHU0RTAwXHU4MUY0XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZlcklkID1cclxuICAgICAgICAgICAgICAgICAgICBib2R5LmlkIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgYG1jcC0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgOSl9YDtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgbmV3U2VydmVyID0ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlkOiBzZXJ2ZXJJZCxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWc6IHsgLi4uYm9keSwgaWQ6IHNlcnZlcklkIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiBcImRpc2Nvbm5lY3RlZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIHRvb2xzOiBbXSxcclxuICAgICAgICAgICAgICAgICAgICByZXNvdXJjZXM6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIHByb21wdHM6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbm5lY3RBdHRlbXB0czogMCxcclxuICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHNlcnZlcnMucHVzaChuZXdTZXJ2ZXIpO1xyXG4gICAgICAgICAgICAgICAgICB3cml0ZU1DUFNlcnZlcnMoc2VydmVycyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IG5ld1NlcnZlciB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gR0VUIC9hcGkvbWNwL3NlcnZlcnMvOmlkIC0gXHU4M0I3XHU1M0Q2XHU1MzU1XHU0RTJBIE1DUCBcdTY3MERcdTUyQTFcdTU2NjhcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL21jcC9zZXJ2ZXJzL1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCBcIlwiO1xyXG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHVybC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAvLyBcdTUzRUFcdTU5MDRcdTc0MDZcdTUzNTVcdTRFMkEgSUQgXHU3Njg0XHU2MEM1XHU1MUI1XHVGRjBDXHU2MzkyXHU5NjY0IHVwZGF0ZS9kZWxldGUvY29ubmVjdC9kaXNjb25uZWN0L3Rvb2xzIFx1N0I0OVx1NUI1MFx1OERFRlx1NUY4NFxyXG4gICAgICAgICAgICBjb25zdCByZXNlcnZlZFBhdGhzID0gW1xyXG4gICAgICAgICAgICAgIFwidXBkYXRlXCIsXHJcbiAgICAgICAgICAgICAgXCJkZWxldGVcIixcclxuICAgICAgICAgICAgICBcImNvbm5lY3RcIixcclxuICAgICAgICAgICAgICBcImRpc2Nvbm5lY3RcIixcclxuICAgICAgICAgICAgICBcInRvb2xzXCIsXHJcbiAgICAgICAgICAgIF07XHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICBwYXJ0cy5sZW5ndGggIT09IDEgfHxcclxuICAgICAgICAgICAgICByZXNlcnZlZFBhdGhzLmluY2x1ZGVzKHBhcnRzWzBdKSB8fFxyXG4gICAgICAgICAgICAgIHJlcS5tZXRob2QgIT09IFwiR0VUXCJcclxuICAgICAgICAgICAgKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgY29uc3QgaWQgPSBwYXJ0c1swXS5zcGxpdChcIj9cIilbMF07XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgY29uc3Qgc2VydmVycyA9IHJlYWRNQ1BTZXJ2ZXJzKCk7XHJcbiAgICAgICAgICAgICAgY29uc3Qgc2VydmVyID0gc2VydmVycy5maW5kKChzOiBhbnkpID0+IHMuaWQgPT09IGlkKTtcclxuXHJcbiAgICAgICAgICAgICAgaWYgKCFzZXJ2ZXIpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFwiU2VydmVyIG5vdCBmb3VuZFwiIH0pLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzZXJ2ZXIgfSkpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gUE9TVCAvYXBpL21jcC9zZXJ2ZXJzL3VwZGF0ZSAtIFx1NjZGNFx1NjVCMCBNQ1AgXHU2NzBEXHU1MkExXHU1NjY4XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFxyXG4gICAgICAgICAgICBcIi9hcGkvbWNwL3NlcnZlcnMvdXBkYXRlXCIsXHJcbiAgICAgICAgICAgIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIlBPU1RcIikge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgICByZXEub24oXCJlbmRcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGlkLCAuLi5jb25maWdVcGRhdGVzIH0gPSBib2R5O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoIWlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJTZXJ2ZXIgSUQgcmVxdWlyZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VydmVycyA9IHJlYWRNQ1BTZXJ2ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzZXJ2ZXJzLmZpbmRJbmRleCgoczogYW55KSA9PiBzLmlkID09PSBpZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gLTEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIlNlcnZlciBub3QgZm91bmRcIixcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRklYOiBcdTUzRUFcdTVDMDYgY29uZmlnVXBkYXRlcyBcdTU0MDhcdTVFNzZcdTUyMzAgY29uZmlnIFx1NEUyRFxyXG4gICAgICAgICAgICAgICAgICAgIHNlcnZlcnNbaW5kZXhdID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgLi4uc2VydmVyc1tpbmRleF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25maWc6IHsgLi4uc2VydmVyc1tpbmRleF0uY29uZmlnLCAuLi5jb25maWdVcGRhdGVzIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZU1DUFNlcnZlcnMoc2VydmVycyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHNlcnZlcnNbaW5kZXhdIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSxcclxuICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBQT1NUIC9hcGkvbWNwL3NlcnZlcnMvZGVsZXRlIC0gXHU1MjIwXHU5NjY0IE1DUCBcdTY3MERcdTUyQTFcdTU2NjhcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9tY3Avc2VydmVycy9kZWxldGVcIixcclxuICAgICAgICAgICAgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgaWQgfSA9IGJvZHk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzZXJ2ZXJzID0gcmVhZE1DUFNlcnZlcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICBzZXJ2ZXJzID0gc2VydmVycy5maWx0ZXIoKHM6IGFueSkgPT4gcy5pZCAhPT0gaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlTUNQU2VydmVycyhzZXJ2ZXJzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgLy8gUE9TVCAvYXBpL21jcC9zZXJ2ZXJzLzppZC9jb25uZWN0IC0gXHU4RkRFXHU2M0E1IE1DUCBTZXJ2ZXJcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL21jcC9zZXJ2ZXJzL1wiLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCBcIlwiO1xyXG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHVybC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAvLyBcdTU5MDRcdTc0MDYgLzppZC9jb25uZWN0IFx1OERFRlx1NUY4NCAocGFydHMgPSBbaWQsICdjb25uZWN0J10pXHJcbiAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggIT09IDIgfHwgcGFydHNbMV0gIT09IFwiY29ubmVjdFwiKSByZXR1cm4gbmV4dCgpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaWQgPSBwYXJ0c1swXS5zcGxpdChcIj9cIilbMF07XHJcblxyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2VydmVycyA9IHJlYWRNQ1BTZXJ2ZXJzKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbmRleCA9IHNlcnZlcnMuZmluZEluZGV4KChzOiBhbnkpID0+IHMuaWQgPT09IGlkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiTUNQIHNlcnZlciBub3QgZm91bmRcIixcclxuICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIC8vIFx1NjZGNFx1NjVCMFx1OEZERVx1NjNBNVx1NzJCNlx1NjAwMVx1NEUzQSBjb25uZWN0ZWRcclxuICAgICAgICAgICAgICAgIHNlcnZlcnNbaW5kZXhdLnN0YXR1cyA9IFwiY29ubmVjdGVkXCI7XHJcbiAgICAgICAgICAgICAgICBzZXJ2ZXJzW2luZGV4XS5sYXN0Q29ubmVjdGVkQXQgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgICAgICAgICAgd3JpdGVNQ1BTZXJ2ZXJzKHNlcnZlcnMpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgICBgW0FQSV0gTUNQIHNlcnZlciBjb25uZWN0ZWQ6ICR7c2VydmVyc1tpbmRleF0ubmFtZX1gLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzZXJ2ZXJzW2luZGV4XSB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9tY3Avc2VydmVycy86aWQvZGlzY29ubmVjdCAtIFx1NjVBRFx1NUYwMCBNQ1AgU2VydmVyXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9tY3Avc2VydmVycy9cIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB1cmwuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgLy8gXHU1OTA0XHU3NDA2IC86aWQvZGlzY29ubmVjdCBcdThERUZcdTVGODQgKHBhcnRzID0gW2lkLCAnZGlzY29ubmVjdCddKVxyXG4gICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoICE9PSAyIHx8IHBhcnRzWzFdICE9PSBcImRpc2Nvbm5lY3RcIikgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gcGFydHNbMF0uc3BsaXQoXCI/XCIpWzBdO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZlcnMgPSByZWFkTUNQU2VydmVycygpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzZXJ2ZXJzLmZpbmRJbmRleCgoczogYW55KSA9PiBzLmlkID09PSBpZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIk1DUCBzZXJ2ZXIgbm90IGZvdW5kXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAvLyBcdTY2RjRcdTY1QjBcdThGREVcdTYzQTVcdTcyQjZcdTYwMDFcdTRFM0EgZGlzY29ubmVjdGVkXHJcbiAgICAgICAgICAgICAgICBzZXJ2ZXJzW2luZGV4XS5zdGF0dXMgPSBcImRpc2Nvbm5lY3RlZFwiO1xyXG4gICAgICAgICAgICAgICAgd3JpdGVNQ1BTZXJ2ZXJzKHNlcnZlcnMpO1xyXG5cclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFxyXG4gICAgICAgICAgICAgICAgICBgW0FQSV0gTUNQIHNlcnZlciBkaXNjb25uZWN0ZWQ6ICR7c2VydmVyc1tpbmRleF0ubmFtZX1gLFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzZXJ2ZXJzW2luZGV4XSB9KSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKTtcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9tY3Avc2VydmVycy86aWQvdG9vbHMvOnRvb2xOYW1lL2V4ZWN1dGUgLSBcdTYyNjdcdTg4NEMgTUNQIFx1NURFNVx1NTE3N1xyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcIi9hcGkvbWNwL3NlcnZlcnMvXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsIHx8IFwiXCI7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gdXJsLnNwbGl0KFwiL1wiKS5maWx0ZXIoQm9vbGVhbik7XHJcbiAgICAgICAgICAgIC8vIFx1NTkwNFx1NzQwNiAvOmlkL3Rvb2xzLzp0b29sTmFtZS9leGVjdXRlIFx1OERFRlx1NUY4NCAocGFydHMgPSBbaWQsICd0b29scycsIHRvb2xOYW1lLCAnZXhlY3V0ZSddKVxyXG4gICAgICAgICAgICBpZiAoXHJcbiAgICAgICAgICAgICAgcGFydHMubGVuZ3RoICE9PSA0IHx8XHJcbiAgICAgICAgICAgICAgcGFydHNbMV0gIT09IFwidG9vbHNcIiB8fFxyXG4gICAgICAgICAgICAgIHBhcnRzWzNdICE9PSBcImV4ZWN1dGVcIlxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IGlkID0gcGFydHNbMF0uc3BsaXQoXCI/XCIpWzBdO1xyXG4gICAgICAgICAgICBjb25zdCB0b29sTmFtZSA9IHBhcnRzWzJdO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBhcmdzID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHNlcnZlcnMgPSByZWFkTUNQU2VydmVycygpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBzZXJ2ZXIgPSBzZXJ2ZXJzLmZpbmQoKHM6IGFueSkgPT4gcy5pZCA9PT0gaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKCFzZXJ2ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IFwiTUNQIHNlcnZlciBub3QgZm91bmRcIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoc2VydmVyLnN0YXR1cyAhPT0gXCJjb25uZWN0ZWRcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJNQ1Agc2VydmVyIG5vdCBjb25uZWN0ZWRcIixcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTY4QzBcdTY3RTVcdTVERTVcdTUxNzdcdTY2MkZcdTU0MjZcdTVCNThcdTU3MjhcclxuICAgICAgICAgICAgICAgICAgY29uc3QgdG9vbCA9IHNlcnZlci50b29scz8uZmluZChcclxuICAgICAgICAgICAgICAgICAgICAodDogYW55KSA9PiB0Lm5hbWUgPT09IHRvb2xOYW1lLFxyXG4gICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICBpZiAoIXRvb2wpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKFxyXG4gICAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXJyb3I6IGBUb29sICcke3Rvb2xOYW1lfScgbm90IGZvdW5kYCxcclxuICAgICAgICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTZBMjFcdTYyREZcdTVERTVcdTUxNzdcdTYyNjdcdTg4NENcdUZGMDhcdTVCOUVcdTk2NDVcdTk4NzlcdTc2RUVcdTRFMkRcdThGRDlcdTkxQ0NcdTVFOTRcdThCRTVcdThDMDNcdTc1MjggTUNQIFx1NUJBMlx1NjIzN1x1N0FFRlx1RkYwOVxyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcclxuICAgICAgICAgICAgICAgICAgICBgW0FQSV0gRXhlY3V0aW5nIE1DUCB0b29sOiAke3NlcnZlci5uYW1lfS8ke3Rvb2xOYW1lfWAsXHJcbiAgICAgICAgICAgICAgICAgICAgYXJncyxcclxuICAgICAgICAgICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1OEZENFx1NTZERVx1NkEyMVx1NjJERlx1NjIxMFx1NTI5Rlx1NTRDRFx1NUU5NFxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHQ6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjdXRlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICB0b29sOiB0b29sTmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBhcmdzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIC8vIENoYXQgU2Vzc2lvbnMgQVBJIC0gXHU4MDRBXHU1OTI5XHU0RjFBXHU4QkREXHU3QkExXHU3NDA2XHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIGNvbnN0IFNFU1NJT05TX0ZJTEUgPSBwYXRoLmpvaW4oXHJcbiAgICAgICAgICAgIHByb2Nlc3MuY3dkKCksXHJcbiAgICAgICAgICAgIFwiLmRhdGFcIixcclxuICAgICAgICAgICAgXCJzZXNzaW9ucy5qc29uXCIsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgY29uc3QgU0VTU0lPTl9NRVNTQUdFU19GSUxFID0gcGF0aC5qb2luKFxyXG4gICAgICAgICAgICBwcm9jZXNzLmN3ZCgpLFxyXG4gICAgICAgICAgICBcIi5kYXRhXCIsXHJcbiAgICAgICAgICAgIFwic2Vzc2lvbi1tZXNzYWdlcy5qc29uXCIsXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIGZ1bmN0aW9uIHJlYWRTZXNzaW9ucygpOiBhbnlbXSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoU0VTU0lPTlNfRklMRSkpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhTRVNTSU9OU19GSUxFLCBcInV0Zi04XCIpKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gRmFpbGVkIHRvIHJlYWQgc2Vzc2lvbnM6XCIsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBbXTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiB3cml0ZVNlc3Npb25zKHNlc3Npb25zOiBhbnlbXSkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoXHJcbiAgICAgICAgICAgICAgICBTRVNTSU9OU19GSUxFLFxyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbnMsIG51bGwsIDIpLFxyXG4gICAgICAgICAgICAgICAgXCJ1dGYtOFwiLFxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gRmFpbGVkIHRvIHdyaXRlIHNlc3Npb25zOlwiLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGZ1bmN0aW9uIHJlYWRTZXNzaW9uTWVzc2FnZXMoKTogUmVjb3JkPHN0cmluZywgYW55W10+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhTRVNTSU9OX01FU1NBR0VTX0ZJTEUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShcclxuICAgICAgICAgICAgICAgICAgZnMucmVhZEZpbGVTeW5jKFNFU1NJT05fTUVTU0FHRVNfRklMRSwgXCJ1dGYtOFwiKSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEldIEZhaWxlZCB0byByZWFkIHNlc3Npb24gbWVzc2FnZXM6XCIsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiB3cml0ZVNlc3Npb25NZXNzYWdlcyhtZXNzYWdlczogUmVjb3JkPHN0cmluZywgYW55W10+KSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhcclxuICAgICAgICAgICAgICAgIFNFU1NJT05fTUVTU0FHRVNfRklMRSxcclxuICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KG1lc3NhZ2VzLCBudWxsLCAyKSxcclxuICAgICAgICAgICAgICAgIFwidXRmLThcIixcclxuICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEldIEZhaWxlZCB0byB3cml0ZSBzZXNzaW9uIG1lc3NhZ2VzOlwiLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIEdFVCAvYXBpL3Nlc3Npb25zIC0gXHU4M0I3XHU1M0Q2XHU2MjQwXHU2NzA5XHU0RjFBXHU4QkREXHJcbiAgICAgICAgICAvLyBQT1NUIC9hcGkvc2Vzc2lvbnMgLSBcdTUyMUJcdTVFRkFcdTRGMUFcdThCRERcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXCIvYXBpL3Nlc3Npb25zXCIsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCB1cmwgPSByZXEudXJsIHx8IFwiXCI7XHJcbiAgICAgICAgICAgIGlmICh1cmwgIT09IFwiL1wiICYmIHVybCAhPT0gXCJcIiAmJiAhdXJsLnN0YXJ0c1dpdGgoXCI/XCIpKSB7XHJcbiAgICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBzZXNzaW9ucyA9IHJlYWRTZXNzaW9ucygpO1xyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzZXNzaW9ucyB9KSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbnMgPSByZWFkU2Vzc2lvbnMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1Nlc3Npb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICBib2R5LmlkIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgICBgc2Vzc2lvbi0ke0RhdGUubm93KCl9LSR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgOSl9YCxcclxuICAgICAgICAgICAgICAgICAgICB0aXRsZTogYm9keS50aXRsZSB8fCBcIlx1NjVCMFx1NUJGOVx1OEJERFwiLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgbW9kZWw6IFwiZGVlcHNlZWstY2hhdFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGVtcGVyYXR1cmU6IDAuNyxcclxuICAgICAgICAgICAgICAgICAgICAgIG1heFRva2VuczogMjA0OCxcclxuICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbVByb21wdDogXCJcIixcclxuICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZVJlYXNvbmluZzogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICBzdHJlYW1pbmc6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAuLi5ib2R5LmNvbmZpZyxcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXRzOiB7IG1lc3NhZ2VDb3VudDogMCwgdG90YWxUb2tlbnM6IDAsIC4uLmJvZHkuc3RhdHMgfSxcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgc2Vzc2lvbnMudW5zaGlmdChuZXdTZXNzaW9uKTtcclxuICAgICAgICAgICAgICAgICAgd3JpdGVTZXNzaW9ucyhzZXNzaW9ucyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTUyMURcdTU5Q0JcdTUzMTZcdTZEODhcdTYwNkZcdTdFQzRcclxuICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSByZWFkU2Vzc2lvbk1lc3NhZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzW25ld1Nlc3Npb24uaWRdID0gW107XHJcbiAgICAgICAgICAgICAgICAgIHdyaXRlU2Vzc2lvbk1lc3NhZ2VzKG1lc3NhZ2VzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogbmV3U2Vzc2lvbiB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIC8vIFNlc3Npb25zIE1lc3NhZ2UgQVBJIC0gXHU2MzA5XHU3Mjc5XHU1QjlBXHU2MDI3XHU2MzkyXHU1RThGXHVGRjA4XHU2NzAwXHU1MTc3XHU0RjUzXHU3Njg0XHU0RjE4XHU1MTQ4XHVGRjA5XHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9zZXNzaW9ucy86aWQvbWVzc2FnZXMvYmF0Y2ggLSBcdTYyNzlcdTkxQ0ZcdTRGRERcdTVCNThcdTZEODhcdTYwNkZcdTdFQzQgKDMgcGFydHMgLSBcdTY3MDBcdTUxNzdcdTRGNTMpXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9zZXNzaW9ucy9cIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB1cmwuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgLy8gXHU1OTA0XHU3NDA2IC86aWQvbWVzc2FnZXMvYmF0Y2ggXHU4REVGXHU1Rjg0IChwYXJ0cyA9IFtpZCwgJ21lc3NhZ2VzJywgJ2JhdGNoJ10pXHJcbiAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICBwYXJ0cy5sZW5ndGggIT09IDMgfHxcclxuICAgICAgICAgICAgICBwYXJ0c1sxXSAhPT0gXCJtZXNzYWdlc1wiIHx8XHJcbiAgICAgICAgICAgICAgcGFydHNbMl0gIT09IFwiYmF0Y2hcIlxyXG4gICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IHBhcnRzWzBdO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImRhdGFcIiwgKGNodW5rKSA9PiBjaHVua3MucHVzaChjaHVuaykpO1xyXG4gICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gcmVhZFNlc3Npb25NZXNzYWdlcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKGJvZHkuZ3JvdXBzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZXNbc2Vzc2lvbklkXSA9IGJvZHkuZ3JvdXBzO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlU2Vzc2lvbk1lc3NhZ2VzKG1lc3NhZ2VzKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBHRVQgL2FwaS9zZXNzaW9ucy86aWQvbWVzc2FnZXMgLSBcdTgzQjdcdTUzRDZcdTRGMUFcdThCRERcdTZEODhcdTYwNkZcclxuICAgICAgICAgIC8vIFBPU1QgL2FwaS9zZXNzaW9ucy86aWQvbWVzc2FnZXMgLSBcdTRGRERcdTVCNThcdTRGMUFcdThCRERcdTZEODhcdTYwNkYgKDIgcGFydHMpXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9zZXNzaW9ucy9cIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB1cmwuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgLy8gXHU1OTA0XHU3NDA2IC86aWQvbWVzc2FnZXMgXHU4REVGXHU1Rjg0IChwYXJ0cyA9IFtpZCwgJ21lc3NhZ2VzJ10pXHJcbiAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggIT09IDIgfHwgcGFydHNbMV0gIT09IFwibWVzc2FnZXNcIikgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHNlc3Npb25JZCA9IHBhcnRzWzBdO1xyXG5cclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09IFwiR0VUXCIpIHtcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSByZWFkU2Vzc2lvbk1lc3NhZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9uTWVzc2FnZXMgPSBtZXNzYWdlc1tzZXNzaW9uSWRdIHx8IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzZXNzaW9uTWVzc2FnZXMgfSksXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gXCJQT1NUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZXMgPSByZWFkU2Vzc2lvbk1lc3NhZ2VzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBpZiAoYm9keS5ncm91cHMpIHtcclxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlc1tzZXNzaW9uSWRdID0gYm9keS5ncm91cHM7XHJcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYm9keS5ncm91cCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghbWVzc2FnZXNbc2Vzc2lvbklkXSkgbWVzc2FnZXNbc2Vzc2lvbklkXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VzW3Nlc3Npb25JZF0ucHVzaChib2R5Lmdyb3VwKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgd3JpdGVTZXNzaW9uTWVzc2FnZXMobWVzc2FnZXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBHRVQgL2FwaS9zZXNzaW9ucy86aWQgLSBcdTgzQjdcdTUzRDZcdTUzNTVcdTRFMkFcdTRGMUFcdThCRERcclxuICAgICAgICAgIC8vIFBVVCAvYXBpL3Nlc3Npb25zLzppZCAtIFx1NjZGNFx1NjVCMFx1NEYxQVx1OEJERFxyXG4gICAgICAgICAgLy8gREVMRVRFIC9hcGkvc2Vzc2lvbnMvOmlkIC0gXHU1MjIwXHU5NjY0XHU0RjFBXHU4QkREICgxIHBhcnQgLSBcdTY3MDBcdTkwMUFcdTc1MjgpXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKFwiL2FwaS9zZXNzaW9ucy9cIiwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgY29uc3QgcGFydHMgPSB1cmwuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcclxuICAgICAgICAgICAgLy8gXHU1M0VBXHU1OTA0XHU3NDA2XHU1MzU1XHU0RTJBIElEIFx1NzY4NFx1NjBDNVx1NTFCNVxyXG4gICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoICE9PSAxKSByZXR1cm4gbmV4dCgpO1xyXG5cclxuICAgICAgICAgICAgY29uc3QgaWQgPSBwYXJ0c1swXS5zcGxpdChcIj9cIilbMF07XHJcblxyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gXCJHRVRcIikge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9ucyA9IHJlYWRTZXNzaW9ucygpO1xyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IHNlc3Npb25zLmZpbmQoKHM6IGFueSkgPT4gcy5pZCA9PT0gaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghc2Vzc2lvbikge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiBcIlNlc3Npb24gbm90IGZvdW5kXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzZXNzaW9uIH0pKTtcclxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiUFVUXCIpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZGF0YVwiLCAoY2h1bmspID0+IGNodW5rcy5wdXNoKGNodW5rKSk7XHJcbiAgICAgICAgICAgICAgcmVxLm9uKFwiZW5kXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbnMgPSByZWFkU2Vzc2lvbnMoKTtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzZXNzaW9ucy5maW5kSW5kZXgoKHM6IGFueSkgPT4gcy5pZCA9PT0gaWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogXCJTZXNzaW9uIG5vdCBmb3VuZFwiLFxyXG4gICAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgIHNlc3Npb25zW2luZGV4XSA9IHtcclxuICAgICAgICAgICAgICAgICAgICAuLi5zZXNzaW9uc1tpbmRleF0sXHJcbiAgICAgICAgICAgICAgICAgICAgLi4uYm9keSxcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgIHdyaXRlU2Vzc2lvbnMoc2Vzc2lvbnMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoXHJcbiAgICAgICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzZXNzaW9uc1tpbmRleF0gfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiREVMRVRFXCIpIHtcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHNlc3Npb25zID0gcmVhZFNlc3Npb25zKCk7XHJcbiAgICAgICAgICAgICAgICBzZXNzaW9ucyA9IHNlc3Npb25zLmZpbHRlcigoczogYW55KSA9PiBzLmlkICE9PSBpZCk7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVNlc3Npb25zKHNlc3Npb25zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAvLyBcdTU0MENcdTY1RjZcdTUyMjBcdTk2NjRcdTZEODhcdTYwNkZcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2VzID0gcmVhZFNlc3Npb25NZXNzYWdlcygpO1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIG1lc3NhZ2VzW2lkXTtcclxuICAgICAgICAgICAgICAgIHdyaXRlU2Vzc2lvbk1lc3NhZ2VzKG1lc3NhZ2VzKTtcclxuXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlIH0pKTtcclxuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIC8vIEFnZW50IENoYXQgU2Vzc2lvbnMgQVBJIC0gQWdlbnQgXHU3MkVDXHU3QUNCXHU0RjFBXHU4QkREXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIGNvbnN0IEFHRU5UX0NIQVRfU0VTU0lPTlNfRklMRSA9IHBhdGguam9pbihcclxuICAgICAgICAgICAgcHJvY2Vzcy5jd2QoKSxcclxuICAgICAgICAgICAgXCIuZGF0YVwiLFxyXG4gICAgICAgICAgICBcImFnZW50LWNoYXQtc2Vzc2lvbnMuanNvblwiLFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiByZWFkQWdlbnRDaGF0U2Vzc2lvbnMoKTogUmVjb3JkPHN0cmluZywgYW55W10+IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhBR0VOVF9DSEFUX1NFU1NJT05TX0ZJTEUpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gSlNPTi5wYXJzZShcclxuICAgICAgICAgICAgICAgICAgZnMucmVhZEZpbGVTeW5jKEFHRU5UX0NIQVRfU0VTU0lPTlNfRklMRSwgXCJ1dGYtOFwiKSxcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIltBUEldIEZhaWxlZCB0byByZWFkIGFnZW50IGNoYXQgc2Vzc2lvbnM6XCIsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB7fTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiB3cml0ZUFnZW50Q2hhdFNlc3Npb25zKHNlc3Npb25zOiBSZWNvcmQ8c3RyaW5nLCBhbnlbXT4pIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKFxyXG4gICAgICAgICAgICAgICAgQUdFTlRfQ0hBVF9TRVNTSU9OU19GSUxFLFxyXG4gICAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoc2Vzc2lvbnMsIG51bGwsIDIpLFxyXG4gICAgICAgICAgICAgICAgXCJ1dGYtOFwiLFxyXG4gICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiW0FQSV0gRmFpbGVkIHRvIHdyaXRlIGFnZW50IGNoYXQgc2Vzc2lvbnM6XCIsIGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgLy8gR0VUIC9hcGkvYWdlbnQtY2hhdC9zZXNzaW9ucyAtIFx1ODNCN1x1NTNENlx1NjI0MFx1NjcwOSBBZ2VudCBcdTRGMUFcdThCRERcdTUyMTdcdTg4NjhcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoXHJcbiAgICAgICAgICAgIFwiL2FwaS9hZ2VudC1jaGF0L3Nlc3Npb25zXCIsXHJcbiAgICAgICAgICAgIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgICBpZiAodXJsICE9PSBcIi9cIiAmJiB1cmwgIT09IFwiXCIgJiYgIXVybC5zdGFydHNXaXRoKFwiP1wiKSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG5leHQoKTtcclxuICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9ucyA9IHJlYWRBZ2VudENoYXRTZXNzaW9ucygpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBsaXN0ID0gT2JqZWN0LmVudHJpZXMoc2Vzc2lvbnMpLm1hcChcclxuICAgICAgICAgICAgICAgICAgICAoW2FnZW50SWQsIG1lc3NhZ2VzXSkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICAgIGFnZW50SWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlQ291bnQ6IG1lc3NhZ2VzLmxlbmd0aCxcclxuICAgICAgICAgICAgICAgICAgICAgIGxhc3RVcGRhdGVkOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlcy5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgPyBtZXNzYWdlc1ttZXNzYWdlcy5sZW5ndGggLSAxXS50aW1lc3RhbXBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICA6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgICAgICk7XHJcblxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKFwiQ29udGVudC1UeXBlXCIsIFwiYXBwbGljYXRpb24vanNvblwiKTtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IGxpc3QgfSkpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBHRVQgL2FwaS9hZ2VudC1jaGF0L3Nlc3Npb25zLzphZ2VudElkL21lc3NhZ2VzIC0gXHU4M0I3XHU1M0Q2IEFnZW50IFx1NEYxQVx1OEJERFx1NkQ4OFx1NjA2RlxyXG4gICAgICAgICAgLy8gUE9TVCAvYXBpL2FnZW50LWNoYXQvc2Vzc2lvbnMvOmFnZW50SWQvbWVzc2FnZXMgLSBcdTRGRERcdTVCNTggQWdlbnQgXHU0RjFBXHU4QkREXHU2RDg4XHU2MDZGXHJcbiAgICAgICAgICAvLyBERUxFVEUgL2FwaS9hZ2VudC1jaGF0L3Nlc3Npb25zLzphZ2VudElkIC0gXHU2RTA1XHU3QTdBIEFnZW50IFx1NEYxQVx1OEJERFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShcclxuICAgICAgICAgICAgXCIvYXBpL2FnZW50LWNoYXQvc2Vzc2lvbnMvXCIsXHJcbiAgICAgICAgICAgIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgXCJcIjtcclxuICAgICAgICAgICAgICBjb25zdCBwYXJ0cyA9IHVybC5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAgIC8vIFx1NTkwNFx1NzQwNiAvOmFnZW50SWQvbWVzc2FnZXMgXHU4REVGXHU1Rjg0IChwYXJ0cyA9IFthZ2VudElkLCAnbWVzc2FnZXMnXSlcclxuICAgICAgICAgICAgICAvLyBcdTYyMTYgLzphZ2VudElkIFx1OERFRlx1NUY4NCAocGFydHMgPSBbYWdlbnRJZF0pIFx1NzUyOFx1NEU4RSBERUxFVEVcclxuICAgICAgICAgICAgICBpZiAocGFydHMubGVuZ3RoIDwgMSB8fCBwYXJ0cy5sZW5ndGggPiAyKSByZXR1cm4gbmV4dCgpO1xyXG4gICAgICAgICAgICAgIGlmIChwYXJ0cy5sZW5ndGggPT09IDIgJiYgcGFydHNbMV0gIT09IFwibWVzc2FnZXNcIikgcmV0dXJuIG5leHQoKTtcclxuXHJcbiAgICAgICAgICAgICAgY29uc3QgYWdlbnRJZCA9IHBhcnRzWzBdLnNwbGl0KFwiP1wiKVswXTtcclxuICAgICAgICAgICAgICBjb25zdCBpc01lc3NhZ2VzUGF0aCA9XHJcbiAgICAgICAgICAgICAgICBwYXJ0cy5sZW5ndGggPT09IDIgJiYgcGFydHNbMV0gPT09IFwibWVzc2FnZXNcIjtcclxuXHJcbiAgICAgICAgICAgICAgLy8gR0VUIC9hcGkvYWdlbnQtY2hhdC9zZXNzaW9ucy86YWdlbnRJZC9tZXNzYWdlc1xyXG4gICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSBcIkdFVFwiICYmIGlzTWVzc2FnZXNQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9ucyA9IHJlYWRBZ2VudENoYXRTZXNzaW9ucygpO1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlcyA9IHNlc3Npb25zW2FnZW50SWRdIHx8IFtdO1xyXG5cclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBtZXNzYWdlcyB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAvLyBQT1NUIC9hcGkvYWdlbnQtY2hhdC9zZXNzaW9ucy86YWdlbnRJZC9tZXNzYWdlc1xyXG4gICAgICAgICAgICAgIGVsc2UgaWYgKHJlcS5tZXRob2QgPT09IFwiUE9TVFwiICYmIGlzTWVzc2FnZXNQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICByZXEub24oXCJkYXRhXCIsIChjaHVuaykgPT4gY2h1bmtzLnB1c2goY2h1bmspKTtcclxuICAgICAgICAgICAgICAgIHJlcS5vbihcImVuZFwiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlc3Npb25zID0gcmVhZEFnZW50Q2hhdFNlc3Npb25zKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHNlc3Npb25zW2FnZW50SWRdID0gYm9keS5tZXNzYWdlcyB8fCBbXTtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZUFnZW50Q2hhdFNlc3Npb25zKHNlc3Npb25zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihcIkNvbnRlbnQtVHlwZVwiLCBcImFwcGxpY2F0aW9uL2pzb25cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpO1xyXG4gICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChcclxuICAgICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSksXHJcbiAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIC8vIERFTEVURSAvYXBpL2FnZW50LWNoYXQvc2Vzc2lvbnMvOmFnZW50SWRcclxuICAgICAgICAgICAgICBlbHNlIGlmIChyZXEubWV0aG9kID09PSBcIkRFTEVURVwiICYmICFpc01lc3NhZ2VzUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbnMgPSByZWFkQWdlbnRDaGF0U2Vzc2lvbnMoKTtcclxuICAgICAgICAgICAgICAgICAgZGVsZXRlIHNlc3Npb25zW2FnZW50SWRdO1xyXG4gICAgICAgICAgICAgICAgICB3cml0ZUFnZW50Q2hhdFNlc3Npb25zKHNlc3Npb25zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoXCJDb250ZW50LVR5cGVcIiwgXCJhcHBsaWNhdGlvbi9qc29uXCIpO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSB9KSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiBTdHJpbmcoZSkgfSkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBuZXh0KCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICBdLFxyXG4gICAgZGVmaW5lOiB7XHJcbiAgICAgIFZESVRPUl9WRVJTSU9OOiBKU09OLnN0cmluZ2lmeShcIjMuMTEuMlwiKSxcclxuICAgIH0sXHJcbiAgfSxcclxuXHJcbiAgYXN5bmMgdHJhbnNmb3JtUGFnZURhdGEocGFnZURhdGE6IGFueSkge1xyXG4gICAgcGFnZURhdGEuZnJvbnRtYXR0ZXIud29yZENvdW50ID0gZ2V0V29yZENvdW50KHBhZ2VEYXRhLmNvbnRlbnQgfHwgXCJcIik7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgYnJlYWRjcnVtYnMgZnJvbSB0aGUgYWN0dWFsIGZpbGUgcGF0aFxyXG4gICAgY29uc3QgcmVsYXRpdmVQYXRoID0gcGFnZURhdGEucmVsYXRpdmVQYXRoO1xyXG4gICAgY29uc3QgcGFydHMgPSByZWxhdGl2ZVBhdGguc3BsaXQoXCIvXCIpO1xyXG4gICAgY29uc3QgYnJlYWRjcnVtYnM6IHsgdGl0bGU6IHN0cmluZzsgbGluaz86IHN0cmluZyB9W10gPSBbXTtcclxuXHJcbiAgICBsZXQgYWNjdW11bGF0ZWRQYXRoID0gXCJcIjtcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IHBhcnQgPSBwYXJ0c1tpXTtcclxuICAgICAgaWYgKCFwYXJ0KSBjb250aW51ZTtcclxuXHJcbiAgICAgIC8vIFJlbW92ZSAubWQgZXh0ZW5zaW9uXHJcbiAgICAgIGlmIChwYXJ0LmVuZHNXaXRoKFwiLm1kXCIpKSB7XHJcbiAgICAgICAgcGFydCA9IHBhcnQucmVwbGFjZShcIi5tZFwiLCBcIlwiKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gU2tpcCBpbmRleCBmaWxlcyBpbiBicmVhZGNydW1iICh0aGV5IHJlcHJlc2VudCB0aGUgZm9sZGVyIGl0c2VsZilcclxuICAgICAgaWYgKHBhcnQgPT09IFwiaW5kZXhcIikge1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBhY2N1bXVsYXRlZFBhdGggKz0gXCIvXCIgKyBwYXJ0O1xyXG5cclxuICAgICAgLy8gRm9ybWF0IHRoZSBicmVhZGNydW1iIG5hbWVcclxuICAgICAgY29uc3QgdGl0bGUgPSBmb3JtYXRCcmVhZGNydW1iTmFtZShwYXJ0KTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgdGhlIGxhc3QgbWVhbmluZ2Z1bCBwYXJ0XHJcbiAgICAgIGNvbnN0IHJlbWFpbmluZ1BhcnRzID0gcGFydHNcclxuICAgICAgICAuc2xpY2UoaSArIDEpXHJcbiAgICAgICAgLmZpbHRlcigocDogc3RyaW5nKSA9PiBwICYmIHAgIT09IFwiaW5kZXgubWRcIiAmJiAhcC5lbmRzV2l0aChcIi5tZFwiKSk7XHJcbiAgICAgIGNvbnN0IGlzTGFzdEl0ZW0gPSByZW1haW5pbmdQYXJ0cy5sZW5ndGggPT09IDA7XHJcblxyXG4gICAgICBicmVhZGNydW1icy5wdXNoKHtcclxuICAgICAgICB0aXRsZSxcclxuICAgICAgICBsaW5rOiBpc0xhc3RJdGVtID8gdW5kZWZpbmVkIDogYWNjdW11bGF0ZWRQYXRoICsgXCIvXCIsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIHBhZ2VEYXRhLmZyb250bWF0dGVyLmJyZWFkY3J1bWIgPSBicmVhZGNydW1icztcclxuICAgIHBhZ2VEYXRhLnRpdGxlID1cclxuICAgICAgcGFnZURhdGEuZnJvbnRtYXR0ZXIudGl0bGUgfHxcclxuICAgICAgKGJyZWFkY3J1bWJzLmxlbmd0aCA+IDAgPyBicmVhZGNydW1ic1ticmVhZGNydW1icy5sZW5ndGggLSAxXS50aXRsZSA6IFwiXCIpO1xyXG4gIH0sXHJcbn0pO1xyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXEFMTCBJTiBBSVxcXFxNZXRhQmxvZ1xcXFwudml0ZXByZXNzXFxcXHV0aWxzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxBTEwgSU4gQUlcXFxcTWV0YUJsb2dcXFxcLnZpdGVwcmVzc1xcXFx1dGlsc1xcXFxnbG9iYWwtc2lkZWJhci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQUxMJTIwSU4lMjBBSS9NZXRhQmxvZy8udml0ZXByZXNzL3V0aWxzL2dsb2JhbC1zaWRlYmFyLnRzXCI7aW1wb3J0IHsgcmVhZGRpclN5bmMsIGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYywgc3RhdFN5bmMgfSBmcm9tICdmcydcclxuaW1wb3J0IHsgam9pbiwgcmVsYXRpdmUsIHJlc29sdmUsIGRpcm5hbWUsIGV4dG5hbWUsIGJhc2VuYW1lIH0gZnJvbSAncGF0aCdcclxuXHJcbmludGVyZmFjZSBTaWRlYmFyTm9kZSB7XHJcbiAgdGV4dDogc3RyaW5nXHJcbiAgbGluaz86IHN0cmluZ1xyXG4gIGl0ZW1zPzogU2lkZWJhck5vZGVbXVxyXG4gIGNvbGxhcHNlZD86IGJvb2xlYW5cclxuICBpZD86IHN0cmluZ1xyXG4gIGlzTGVhZj86IGJvb2xlYW5cclxufVxyXG5cclxuY29uc3QgbWFuaWZlc3RDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBSZWNvcmQ8c3RyaW5nLCBhbnk+PigpXHJcbmNvbnN0IHNpZGViYXJDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCB7IGRhdGE6IGFueVtdLCB0aW1lc3RhbXA6IG51bWJlciB9PigpXHJcbmNvbnN0IENBQ0hFX1RUTCA9IDUwMDAgLy8gNVx1NzlEMlx1N0YxM1x1NUI1OFx1RkYwQ1x1NUYwMFx1NTNEMVx1NkEyMVx1NUYwRlx1NEUwQlx1NzdFRFx1N0YxM1x1NUI1OFx1Nzg2RVx1NEZERFx1NUI5RVx1NjVGNlx1NjAyN1xyXG5cclxuZnVuY3Rpb24gZ2V0TWFuaWZlc3QoZGlyOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcclxuICBjb25zdCBtYW5pZmVzdFBhdGggPSBqb2luKGRpciwgJ21hbmlmZXN0Lmpzb24nKVxyXG4gIFxyXG4gIC8vIFx1NUYwMFx1NTNEMVx1NkEyMVx1NUYwRlx1NEUwQlx1NjhDMFx1NjdFNVx1N0YxM1x1NUI1OFx1NjYyRlx1NTQyNlx1OEZDN1x1NjcxRlxyXG4gIGNvbnN0IGNhY2hlZCA9IG1hbmlmZXN0Q2FjaGUuZ2V0KG1hbmlmZXN0UGF0aClcclxuICBpZiAoY2FjaGVkICYmIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAnZGV2ZWxvcG1lbnQnKSB7XHJcbiAgICByZXR1cm4gY2FjaGVkXHJcbiAgfVxyXG4gIFxyXG4gIGlmIChleGlzdHNTeW5jKG1hbmlmZXN0UGF0aCkpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsICd1dGYtOCcpKVxyXG4gICAgICBtYW5pZmVzdENhY2hlLnNldChtYW5pZmVzdFBhdGgsIGNvbnRlbnQpXHJcbiAgICAgIHJldHVybiBjb250ZW50XHJcbiAgICB9IGNhdGNoIHt9XHJcbiAgfVxyXG4gIHJldHVybiB7fVxyXG59XHJcblxyXG4vLyBcdTZFMDVcdTk2NjQgc2lkZWJhciBcdTdGMTNcdTVCNThcdUZGMDhcdTY1ODdcdTRFRjZcdTUzRDhcdTUyQThcdTY1RjZcdThDMDNcdTc1MjhcdUZGMDlcclxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyU2lkZWJhckNhY2hlKHNlY3Rpb24/OiBzdHJpbmcpIHtcclxuICBpZiAoc2VjdGlvbikge1xyXG4gICAgc2lkZWJhckNhY2hlLmRlbGV0ZShzZWN0aW9uKVxyXG4gICAgY29uc29sZS5sb2coYFtTaWRlYmFyXSBDYWNoZSBjbGVhcmVkIGZvciBzZWN0aW9uOiAke3NlY3Rpb259YClcclxuICB9IGVsc2Uge1xyXG4gICAgc2lkZWJhckNhY2hlLmNsZWFyKClcclxuICAgIG1hbmlmZXN0Q2FjaGUuY2xlYXIoKVxyXG4gICAgY29uc29sZS5sb2coJ1tTaWRlYmFyXSBBbGwgY2FjaGUgY2xlYXJlZCcpXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVTZWN0aW9uU2lkZWJhcihzZWN0aW9uc1BhdGg6IHN0cmluZywgc2VjdGlvbk5hbWU6IHN0cmluZywgdXNlQ2FjaGU6IGJvb2xlYW4gPSBmYWxzZSk6IFNpZGViYXJOb2RlW10ge1xyXG4gIC8vIFx1NjhDMFx1NjdFNVx1N0YxM1x1NUI1OFx1RkYwOFx1NEVDNVx1NTcyOFx1OTc1RVx1NUYwMFx1NTNEMVx1NkEyMVx1NUYwRlx1NjIxNlx1NjYwRVx1Nzg2RVx1NjMwN1x1NUI5QVx1NEY3Rlx1NzUyOFx1N0YxM1x1NUI1OFx1NjVGNlx1RkYwOVxyXG4gIGlmICh1c2VDYWNoZSAmJiBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ2RldmVsb3BtZW50Jykge1xyXG4gICAgY29uc3QgY2FjaGVkID0gc2lkZWJhckNhY2hlLmdldChzZWN0aW9uTmFtZSlcclxuICAgIGlmIChjYWNoZWQgJiYgRGF0ZS5ub3coKSAtIGNhY2hlZC50aW1lc3RhbXAgPCBDQUNIRV9UVEwpIHtcclxuICAgICAgcmV0dXJuIGNhY2hlZC5kYXRhXHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIGNvbnN0IHNlY3Rpb25EaXIgPSBqb2luKHNlY3Rpb25zUGF0aCwgc2VjdGlvbk5hbWUpXHJcbiAgY29uc3Qgcm9vdCA9IHJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3MnKVxyXG4gIFxyXG4gIGlmICghZXhpc3RzU3luYyhzZWN0aW9uRGlyKSkgcmV0dXJuIFtdXHJcbiAgXHJcbiAgY29uc3QgZW50cmllcyA9IHJlYWRkaXJTeW5jKHNlY3Rpb25EaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KVxyXG4gIGNvbnN0IG5vZGVzOiBTaWRlYmFyTm9kZVtdID0gW11cclxuICBcclxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgIGlmIChlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSB8fCBlbnRyeS5uYW1lID09PSAnbWFuaWZlc3QuanNvbicpIGNvbnRpbnVlXHJcbiAgICBcclxuICAgIGNvbnN0IGVudHJ5UGF0aCA9IGpvaW4oc2VjdGlvbkRpciwgZW50cnkubmFtZSlcclxuICAgIFxyXG4gICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgY29uc3Qgbm9kZSA9IHNjYW5Ob2RlKGVudHJ5UGF0aCwgZW50cnkubmFtZSwgcm9vdCwgMClcclxuICAgICAgaWYgKG5vZGUpIG5vZGVzLnB1c2gobm9kZSlcclxuICAgIH0gZWxzZSBpZiAoZW50cnkuaXNGaWxlKCkgJiYgZW50cnkubmFtZS5lbmRzV2l0aCgnLm1kJykpIHtcclxuICAgICAgY29uc3Qgbm9kZSA9IGNyZWF0ZUxlYWZOb2RlKGVudHJ5UGF0aCwgZW50cnkubmFtZSwgcm9vdClcclxuICAgICAgaWYgKG5vZGUpIG5vZGVzLnB1c2gobm9kZSlcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgY29uc3Qgc29ydGVkID0gbm9kZXMuc29ydCgoYSwgYikgPT4gc29ydE5vZGVzKGEsIGIpKVxyXG4gIFxyXG4gIC8vIFx1NjZGNFx1NjVCMFx1N0YxM1x1NUI1OFxyXG4gIGlmICh1c2VDYWNoZSkge1xyXG4gICAgc2lkZWJhckNhY2hlLnNldChzZWN0aW9uTmFtZSwgeyBkYXRhOiBzb3J0ZWQsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSB9KVxyXG4gIH1cclxuICBcclxuICByZXR1cm4gc29ydGVkXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjYW5Ob2RlKGRpclBhdGg6IHN0cmluZywgbm9kZU5hbWU6IHN0cmluZywgcm9vdERvY1BhdGg6IHN0cmluZywgbGV2ZWw6IG51bWJlcik6IFNpZGViYXJOb2RlIHwgbnVsbCB7XHJcbiAgY29uc3Qgc2FtZU5hbWVNZCA9IGpvaW4oZGlyUGF0aCwgYCR7bm9kZU5hbWV9Lm1kYClcclxuICBjb25zdCBpbmRleE1kID0gam9pbihkaXJQYXRoLCAnaW5kZXgubWQnKVxyXG4gIFxyXG4gIGxldCBmb2xkZXJMaW5rOiBzdHJpbmcgfCB1bmRlZmluZWRcclxuICBsZXQgZm9sZGVyTm90ZVBhdGg6IHN0cmluZyB8IHVuZGVmaW5lZFxyXG4gIFxyXG4gIGlmIChleGlzdHNTeW5jKHNhbWVOYW1lTWQpKSB7XHJcbiAgICBmb2xkZXJOb3RlUGF0aCA9IHNhbWVOYW1lTWRcclxuICAgIGZvbGRlckxpbmsgPSAnLycgKyByZWxhdGl2ZShyb290RG9jUGF0aCwgZGlyUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8nXHJcbiAgfSBlbHNlIGlmIChleGlzdHNTeW5jKGluZGV4TWQpKSB7XHJcbiAgICBmb2xkZXJOb3RlUGF0aCA9IGluZGV4TWRcclxuICAgIGZvbGRlckxpbmsgPSAnLycgKyByZWxhdGl2ZShyb290RG9jUGF0aCwgZGlyUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy8nXHJcbiAgfVxyXG4gIFxyXG4gIGNvbnN0IHBhcmVudERpciA9IGRpcm5hbWUoZGlyUGF0aClcclxuICBjb25zdCBtYW5pZmVzdCA9IGdldE1hbmlmZXN0KHBhcmVudERpcilcclxuICBsZXQgdGl0bGUgPSBtYW5pZmVzdFtub2RlTmFtZV0/LnRpdGxlXHJcbiAgXHJcbiAgaWYgKCF0aXRsZSAmJiBmb2xkZXJOb3RlUGF0aCkge1xyXG4gICAgdGl0bGUgPSBleHRyYWN0VGl0bGUoZm9sZGVyTm90ZVBhdGgpXHJcbiAgfVxyXG4gIGlmICghdGl0bGUpIHtcclxuICAgIHRpdGxlID0gZm9ybWF0RGlzcGxheU5hbWUobm9kZU5hbWUpXHJcbiAgfVxyXG4gIFxyXG4gIGNvbnN0IG5vZGVJZCA9ICcvJyArIHJlbGF0aXZlKHJvb3REb2NQYXRoLCBkaXJQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLydcclxuICBcclxuICBjb25zdCBlbnRyaWVzID0gcmVhZGRpclN5bmMoZGlyUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pXHJcbiAgY29uc3QgY2hpbGRyZW46IFNpZGViYXJOb2RlW10gPSBbXVxyXG4gIFxyXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgaWYgKGVudHJ5Lm5hbWUuc3RhcnRzV2l0aCgnLicpIHx8IGVudHJ5Lm5hbWUgPT09ICdtYW5pZmVzdC5qc29uJykgY29udGludWVcclxuICAgIFxyXG4gICAgY29uc3QgZW50cnlQYXRoID0gam9pbihkaXJQYXRoLCBlbnRyeS5uYW1lKVxyXG4gICAgXHJcbiAgICBpZiAoZW50cnlQYXRoID09PSBmb2xkZXJOb3RlUGF0aCkgY29udGludWVcclxuICAgIFxyXG4gICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgY29uc3QgY2hpbGROb2RlID0gc2Nhbk5vZGUoZW50cnlQYXRoLCBlbnRyeS5uYW1lLCByb290RG9jUGF0aCwgbGV2ZWwgKyAxKVxyXG4gICAgICBpZiAoY2hpbGROb2RlKSBjaGlsZHJlbi5wdXNoKGNoaWxkTm9kZSlcclxuICAgIH0gZWxzZSBpZiAoZW50cnkuaXNGaWxlKCkgJiYgZW50cnkubmFtZS5lbmRzV2l0aCgnLm1kJykpIHtcclxuICAgICAgY29uc3QgbGVhZk5vZGUgPSBjcmVhdGVMZWFmTm9kZShlbnRyeVBhdGgsIGVudHJ5Lm5hbWUsIHJvb3REb2NQYXRoLCBsZXZlbCArIDEpXHJcbiAgICAgIGlmIChsZWFmTm9kZSkgY2hpbGRyZW4ucHVzaChsZWFmTm9kZSlcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgY29uc3Qgbm9kZTogU2lkZWJhck5vZGUgPSB7XHJcbiAgICB0ZXh0OiB0aXRsZSxcclxuICAgIGlkOiBub2RlSWQsXHJcbiAgICBjb2xsYXBzZWQ6IGxldmVsID49IDEsXHJcbiAgICBpc0xlYWY6IGZhbHNlXHJcbiAgfVxyXG4gIFxyXG4gIGlmIChmb2xkZXJMaW5rKSBub2RlLmxpbmsgPSBmb2xkZXJMaW5rXHJcbiAgaWYgKGNoaWxkcmVuLmxlbmd0aCA+IDApIG5vZGUuaXRlbXMgPSBjaGlsZHJlbi5zb3J0KChhLCBiKSA9PiBzb3J0Tm9kZXMoYSwgYikpXHJcbiAgXHJcbiAgaWYgKCFmb2xkZXJMaW5rICYmIGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGxcclxuICBcclxuICByZXR1cm4gbm9kZVxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVMZWFmTm9kZShmaWxlUGF0aDogc3RyaW5nLCBmaWxlTmFtZTogc3RyaW5nLCByb290RG9jUGF0aDogc3RyaW5nLCBsZXZlbDogbnVtYmVyID0gMCk6IFNpZGViYXJOb2RlIHwgbnVsbCB7XHJcbiAgY29uc3QgYmFzZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9cXC5tZCQvaSwgJycpXHJcbiAgLy8gXHU0RjE4XHU1MTQ4XHU0RUNFXHU2NTg3XHU0RUY2IGZyb250bWF0dGVyIFx1NjIxNiBIMSBcdTYzRDBcdTUzRDZcdTY4MDdcdTk4OThcclxuICBjb25zdCBleHRyYWN0ZWRUaXRsZSA9IGV4dHJhY3RUaXRsZShmaWxlUGF0aClcclxuICBjb25zdCB0aXRsZSA9IGV4dHJhY3RlZFRpdGxlIHx8IGZvcm1hdERpc3BsYXlOYW1lKGJhc2VOYW1lKVxyXG4gIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHJlbGF0aXZlKHJvb3REb2NQYXRoLCBmaWxlUGF0aClcclxuICBjb25zdCBsaW5rID0gJy8nICsgcmVsYXRpdmVQYXRoLnJlcGxhY2UoL1xcXFwvZywgJy8nKS5yZXBsYWNlKC9cXC5tZCQvLCAnJylcclxuICBcclxuICByZXR1cm4ge1xyXG4gICAgdGV4dDogdGl0bGUsXHJcbiAgICBsaW5rOiBsaW5rLFxyXG4gICAgaWQ6IGxpbmssXHJcbiAgICBjb2xsYXBzZWQ6IGZhbHNlLFxyXG4gICAgaXNMZWFmOiB0cnVlXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0Tm9kZXMoYTogU2lkZWJhck5vZGUsIGI6IFNpZGViYXJOb2RlKTogbnVtYmVyIHtcclxuICBjb25zdCBhVGV4dCA9IGEudGV4dCB8fCAnJ1xyXG4gIGNvbnN0IGJUZXh0ID0gYi50ZXh0IHx8ICcnXHJcbiAgXHJcbiAgY29uc3QgYU1hdGNoID0gYVRleHQubWF0Y2goL14oXFxkKykvKVxyXG4gIGNvbnN0IGJNYXRjaCA9IGJUZXh0Lm1hdGNoKC9eKFxcZCspLylcclxuICBcclxuICBpZiAoYU1hdGNoICYmIGJNYXRjaCkge1xyXG4gICAgY29uc3QgYU51bSA9IHBhcnNlSW50KGFNYXRjaFsxXSwgMTApXHJcbiAgICBjb25zdCBiTnVtID0gcGFyc2VJbnQoYk1hdGNoWzFdLCAxMClcclxuICAgIGlmIChhTnVtICE9PSBiTnVtKSByZXR1cm4gYU51bSAtIGJOdW1cclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIGFUZXh0LmxvY2FsZUNvbXBhcmUoYlRleHQpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZvcm1hdERpc3BsYXlOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgbGV0IGZvcm1hdHRlZCA9IG5hbWUucmVwbGFjZSgvXy9nLCAnICcpXHJcbiAgZm9ybWF0dGVkID0gZm9ybWF0dGVkLnJlcGxhY2UoL14oXFxkKykoW0EtWmEtel0pLywgJyQxICQyJylcclxuICBcclxuICByZXR1cm4gZm9ybWF0dGVkLnNwbGl0KCcgJykubWFwKHdvcmQgPT4ge1xyXG4gICAgaWYgKCF3b3JkKSByZXR1cm4gJydcclxuICAgIGlmICgvXlxcZCskLy50ZXN0KHdvcmQpKSByZXR1cm4gd29yZFxyXG4gICAgcmV0dXJuIHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpXHJcbiAgfSkuam9pbignICcpXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RUaXRsZShtZFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmMobWRQYXRoLCAndXRmLTgnKVxyXG4gICAgY29uc3QgZm1NYXRjaCA9IGNvbnRlbnQubWF0Y2goL150aXRsZTpcXHMqW1wiJ10/KC4rPylbXCInXT9cXHMqJC9tKVxyXG4gICAgaWYgKGZtTWF0Y2gpIHJldHVybiBmbU1hdGNoWzFdLnRyaW0oKVxyXG4gICAgXHJcbiAgICBjb25zdCBoMU1hdGNoID0gY29udGVudC5tYXRjaCgvXiNcXHMrKC4rKSQvbSlcclxuICAgIGlmIChoMU1hdGNoKSByZXR1cm4gaDFNYXRjaFsxXS50cmltKClcclxuICB9IGNhdGNoIHt9XHJcbiAgcmV0dXJuICcnXHJcbn1cclxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxBTEwgSU4gQUlcXFxcTWV0YUJsb2dcXFxcLnZpdGVwcmVzc1xcXFx1dGlsc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcQUxMIElOIEFJXFxcXE1ldGFCbG9nXFxcXC52aXRlcHJlc3NcXFxcdXRpbHNcXFxcZG9jLXN0cnVjdHVyZS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovQUxMJTIwSU4lMjBBSS9NZXRhQmxvZy8udml0ZXByZXNzL3V0aWxzL2RvYy1zdHJ1Y3R1cmUudHNcIjsvKipcclxuICogXHU2NTg3XHU2ODYzXHU3RUQzXHU2Nzg0XHU4OUM0XHU4MzAzIC0gXHU1QjlBXHU0RTQ5XHU2NTg3XHU0RUY2XHU1OTM5XHU3RUQzXHU2Nzg0XHU0RTBFXHU1MjREXHU3QUVGXHU2NjNFXHU3OTNBXHU3Njg0XHU2NjIwXHU1QzA0XHU1MTczXHU3Q0ZCXHJcbiAqIFxyXG4gKiBcdTg5QzRcdTgzMDM6XHJcbiAqIDEuIFx1NTNGNlx1NUI1MFx1NjU4N1x1Njg2Mzoge25hbWV9Lm1kIFx1MjE5MiBcdTY2M0VcdTc5M0FcdTRFM0FcdTY1ODdcdTdBRTBcclxuICogMi4gRm9sZGVyIE5vdGU6IHtmb2xkZXJ9L3tmb2xkZXJ9Lm1kIFx1MjE5MiBcdTY1ODdcdTRFRjZcdTU5MzlcdTUzRUZcdTcwQjlcdTUxRkJcdUZGMENcdTY4MDdcdTk4OThcdTY3NjVcdTgxRUFcdTY1ODdcdTRFRjZcclxuICogMy4gSW5kZXggXHU2QTIxXHU1RjBGOiB7Zm9sZGVyfS9pbmRleC5tZCBcdTIxOTIgXHU2NTg3XHU0RUY2XHU1OTM5XHU1M0VGXHU3MEI5XHU1MUZCXHVGRjBDXHU2ODA3XHU5ODk4XHU2NzY1XHU4MUVBIGluZGV4Lm1kXHJcbiAqIDQuIFx1NkRGN1x1NTQwOFx1NkEyMVx1NUYwRjoge2ZvbGRlcn0ve2ZvbGRlcn0ubWQgKyB7Zm9sZGVyfS9jaGlsZC5tZCBcdTIxOTIgXHU1M0VGXHU1QzU1XHU1RjAwXHU3MjM2XHU4MjgyXHU3MEI5XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgcmVhZGRpclN5bmMsIHN0YXRTeW5jLCBleGlzdHNTeW5jIH0gZnJvbSAnZnMnXHJcbmltcG9ydCB7IGpvaW4sIGJhc2VuYW1lLCBleHRuYW1lIH0gZnJvbSAncGF0aCdcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRG9jTm9kZSB7XHJcbiAgaWQ6IHN0cmluZ1xyXG4gIHR5cGU6ICdmaWxlJyB8ICdmb2xkZXInXHJcbiAgbmFtZTogc3RyaW5nICAgICAgICAgICAvLyBcdTY1ODdcdTRFRjZcdTU0MEQvXHU2NTg3XHU0RUY2XHU1OTM5XHU1NDBEXHJcbiAgdGl0bGU6IHN0cmluZyAgICAgICAgICAvLyBcdTY2M0VcdTc5M0FcdTY4MDdcdTk4OThcclxuICBwYXRoOiBzdHJpbmcgICAgICAgICAgIC8vIFx1NzZGOFx1NUJGOVx1OERFRlx1NUY4NCAoc2VjdGlvbnMvcG9zdHMveHh4KVxyXG4gIGxpbms/OiBzdHJpbmcgICAgICAgICAgLy8gVVJMIFx1OTRGRVx1NjNBNVxyXG4gIGRlc2M/OiBzdHJpbmcgICAgICAgICAgLy8gXHU3QjgwXHU0RUNCXHU2M0NGXHU4RkYwXHJcbiAgY2hpbGRyZW4/OiBEb2NOb2RlW11cclxuICBpc0xlYWY6IGJvb2xlYW5cclxuICBjb2xsYXBzZWQ/OiBib29sZWFuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTYyNkJcdTYzQ0Ygc2VjdGlvbiBcdTc2RUVcdTVGNTVcdUZGMENcdTc1MUZcdTYyMTBcdTg5QzRcdTgzMDNcdTUzMTZcdTc2ODRcdTY1ODdcdTY4NjNcdTY4MTFcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzY2FuRG9jU3RydWN0dXJlKFxyXG4gIHNlY3Rpb25QYXRoOiBzdHJpbmcsXHJcbiAgc2VjdGlvbk5hbWU/OiBzdHJpbmdcclxuKTogRG9jTm9kZVtdIHtcclxuICBjb25zdCBub2RlczogRG9jTm9kZVtdID0gW11cclxuICBcclxuICAvLyBcdTU5ODJcdTY3OUNcdTZDQTFcdTY3MDlcdTYzRDBcdTRGOUIgc2VjdGlvbk5hbWVcdUZGMENcdTRFQ0VcdThERUZcdTVGODRcdTYzRDBcdTUzRDZcclxuICBjb25zdCBzZWNOYW1lID0gc2VjdGlvbk5hbWUgfHwgYmFzZW5hbWUoc2VjdGlvblBhdGgpXHJcbiAgXHJcbiAgY29uc3QgZW50cmllcyA9IHJlYWRkaXJTeW5jKHNlY3Rpb25QYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSlcclxuICAgIC5maWx0ZXIoZSA9PiAhZS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSAmJiBlLm5hbWUgIT09ICdtYW5pZmVzdC5qc29uJylcclxuICAgIC5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgIC8vIFx1NjU4N1x1NEVGNlx1NTkzOVx1NTcyOFx1NTI0RFx1RkYwQ1x1NjU4N1x1NEVGNlx1NTcyOFx1NTQwRVxyXG4gICAgICBpZiAoYS5pc0RpcmVjdG9yeSgpICYmICFiLmlzRGlyZWN0b3J5KCkpIHJldHVybiAtMVxyXG4gICAgICBpZiAoIWEuaXNEaXJlY3RvcnkoKSAmJiBiLmlzRGlyZWN0b3J5KCkpIHJldHVybiAxXHJcbiAgICAgIHJldHVybiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpXHJcbiAgICB9KVxyXG4gIFxyXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgY29uc3QgZnVsbFBhdGggPSBqb2luKHNlY3Rpb25QYXRoLCBlbnRyeS5uYW1lKVxyXG4gICAgLy8gXHU4REVGXHU1Rjg0XHU1MzA1XHU1NDJCIHNlY3Rpb24gXHU1NDBEXHU3OUYwXHU1MjREXHU3RjAwXHJcbiAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBgJHtzZWNOYW1lfS8ke2VudHJ5Lm5hbWV9YFxyXG4gICAgXHJcbiAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICAvLyBcdTVDMURcdThCRDVcdThCRkJcdTUzRDYgbWFuaWZlc3QuanNvblxyXG4gICAgICBsZXQgbWFuaWZlc3Q6IGFueSA9IHt9XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgbWFuaWZlc3RQYXRoID0gam9pbihzZWN0aW9uUGF0aCwgJ21hbmlmZXN0Lmpzb24nKVxyXG4gICAgICAgIGlmIChleGlzdHNTeW5jKG1hbmlmZXN0UGF0aCkpIHtcclxuICAgICAgICAgIG1hbmlmZXN0ID0gSlNPTi5wYXJzZShyZXF1aXJlKCdmcycpLnJlYWRGaWxlU3luYyhtYW5pZmVzdFBhdGgsICd1dGYtOCcpKVxyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAoZSkge31cclxuXHJcbiAgICAgIGNvbnN0IGZvbGRlck5vZGUgPSBzY2FuRm9sZGVyKGZ1bGxQYXRoLCBlbnRyeS5uYW1lLCByZWxhdGl2ZVBhdGgsIHNlY05hbWUsIG1hbmlmZXN0KVxyXG4gICAgICBpZiAoZm9sZGVyTm9kZSkgbm9kZXMucHVzaChmb2xkZXJOb2RlKVxyXG4gICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSAmJiBlbnRyeS5uYW1lLmVuZHNXaXRoKCcubWQnKSkge1xyXG4gICAgICAvLyBcdThERjNcdThGQzcgc2VjdGlvbiBcdTk5OTZcdTk4NzVcdTY1ODdcdTRFRjYgKFx1NTk4MiBwb3N0cy5tZClcclxuICAgICAgaWYgKGVudHJ5Lm5hbWUgPT09IGAke3NlY05hbWV9Lm1kYCkgY29udGludWVcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGZpbGVOb2RlID0gY3JlYXRlRmlsZU5vZGUoZnVsbFBhdGgsIGVudHJ5Lm5hbWUsIHJlbGF0aXZlUGF0aCwgc2VjTmFtZSlcclxuICAgICAgaWYgKGZpbGVOb2RlKSBub2Rlcy5wdXNoKGZpbGVOb2RlKVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICByZXR1cm4gbm9kZXNcclxufVxyXG5cclxuLyoqXHJcbiAqIFx1NjI2Qlx1NjNDRlx1NjU4N1x1NEVGNlx1NTkzOVx1RkYwQ1x1OEJDNlx1NTIyQiBGb2xkZXIgTm90ZSBcdTYyMTYgSW5kZXggXHU2QTIxXHU1RjBGXHJcbiAqL1xyXG5mdW5jdGlvbiBzY2FuRm9sZGVyKFxyXG4gIGRpclBhdGg6IHN0cmluZyxcclxuICBmb2xkZXJOYW1lOiBzdHJpbmcsXHJcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXHJcbiAgc2VjdGlvbk5hbWU6IHN0cmluZyxcclxuICBtYW5pZmVzdDogYW55ID0ge31cclxuKTogRG9jTm9kZSB8IG51bGwge1xyXG4gIGNvbnN0IGZvbGRlck5vdGVQYXRoID0gam9pbihkaXJQYXRoLCBgJHtmb2xkZXJOYW1lfS5tZGApXHJcbiAgY29uc3QgaW5kZXhQYXRoID0gam9pbihkaXJQYXRoLCAnaW5kZXgubWQnKVxyXG4gIFxyXG4gIGxldCB0aXRsZSA9IGZvbGRlck5hbWVcclxuICBsZXQgZGVzYyA9IG1hbmlmZXN0W2ZvbGRlck5hbWVdPy5kZXNjcmlwdGlvbiB8fCAnJ1xyXG4gIGxldCBsaW5rOiBzdHJpbmcgfCB1bmRlZmluZWRcclxuICBsZXQgZm9sZGVyTm90ZVBhdGhVc2VkOiBzdHJpbmcgfCB1bmRlZmluZWRcclxuICBcclxuICAvLyBcdTRGMThcdTUxNDhcdTRGN0ZcdTc1MjggRm9sZGVyIE5vdGUgXHU2QTIxXHU1RjBGIChmb2xkZXIvZm9sZGVyLm1kKVxyXG4gIGlmIChleGlzdHNTeW5jKGZvbGRlck5vdGVQYXRoKSkge1xyXG4gICAgdGl0bGUgPSBleHRyYWN0VGl0bGUoZm9sZGVyTm90ZVBhdGgpIHx8IG1hbmlmZXN0W2ZvbGRlck5hbWVdPy50aXRsZSB8fCBmb3JtYXREaXNwbGF5TmFtZShmb2xkZXJOYW1lKVxyXG4gICAgZGVzYyA9IGRlc2MgfHwgZXh0cmFjdERlc2MoZm9sZGVyTm90ZVBhdGgpIHx8ICcnXHJcbiAgICBsaW5rID0gYC9zZWN0aW9ucy8ke3JlbGF0aXZlUGF0aH0vYFxyXG4gICAgZm9sZGVyTm90ZVBhdGhVc2VkID0gZm9sZGVyTm90ZVBhdGhcclxuICB9XHJcbiAgLy8gXHU1MTc2XHU2QjIxXHU0RjdGXHU3NTI4IEluZGV4IFx1NkEyMVx1NUYwRiAoZm9sZGVyL2luZGV4Lm1kKVxyXG4gIGVsc2UgaWYgKGV4aXN0c1N5bmMoaW5kZXhQYXRoKSkge1xyXG4gICAgdGl0bGUgPSBleHRyYWN0VGl0bGUoaW5kZXhQYXRoKSB8fCBtYW5pZmVzdFtmb2xkZXJOYW1lXT8udGl0bGUgfHwgZm9ybWF0RGlzcGxheU5hbWUoZm9sZGVyTmFtZSlcclxuICAgIGRlc2MgPSBkZXNjIHx8IGV4dHJhY3REZXNjKGluZGV4UGF0aCkgfHwgJydcclxuICAgIGxpbmsgPSBgL3NlY3Rpb25zLyR7cmVsYXRpdmVQYXRofS9gXHJcbiAgICBmb2xkZXJOb3RlUGF0aFVzZWQgPSBpbmRleFBhdGhcclxuICB9XHJcbiAgXHJcbiAgLy8gXHU2MjZCXHU2M0NGXHU1QjUwXHU5ODc5XHJcbiAgY29uc3QgY2hpbGRyZW46IERvY05vZGVbXSA9IFtdXHJcbiAgY29uc3QgZW50cmllcyA9IHJlYWRkaXJTeW5jKGRpclBhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KVxyXG4gICAgLmZpbHRlcihlID0+ICFlLm5hbWUuc3RhcnRzV2l0aCgnLicpICYmIGUubmFtZSAhPT0gJ21hbmlmZXN0Lmpzb24nKVxyXG4gIFxyXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgLy8gXHU4REYzXHU4RkM3IEZvbGRlciBOb3RlIFx1NjIxNiBpbmRleC5tZCBcdTY3MkNcdThFQUJcclxuICAgIGlmIChqb2luKGRpclBhdGgsIGVudHJ5Lm5hbWUpID09PSBmb2xkZXJOb3RlUGF0aFVzZWQpIGNvbnRpbnVlXHJcbiAgICBcclxuICAgIGNvbnN0IGNoaWxkUmVsYXRpdmVQYXRoID0gYCR7cmVsYXRpdmVQYXRofS8ke2VudHJ5Lm5hbWV9YFxyXG4gICAgXHJcbiAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICBjb25zdCBjaGlsZE5vZGUgPSBzY2FuRm9sZGVyKFxyXG4gICAgICAgIGpvaW4oZGlyUGF0aCwgZW50cnkubmFtZSksXHJcbiAgICAgICAgZW50cnkubmFtZSxcclxuICAgICAgICBjaGlsZFJlbGF0aXZlUGF0aCxcclxuICAgICAgICBzZWN0aW9uTmFtZVxyXG4gICAgICApXHJcbiAgICAgIGlmIChjaGlsZE5vZGUpIGNoaWxkcmVuLnB1c2goY2hpbGROb2RlKVxyXG4gICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSAmJiBlbnRyeS5uYW1lLmVuZHNXaXRoKCcubWQnKSkge1xyXG4gICAgICBjb25zdCBjaGlsZE5vZGUgPSBjcmVhdGVGaWxlTm9kZShcclxuICAgICAgICBqb2luKGRpclBhdGgsIGVudHJ5Lm5hbWUpLFxyXG4gICAgICAgIGVudHJ5Lm5hbWUsXHJcbiAgICAgICAgY2hpbGRSZWxhdGl2ZVBhdGgsXHJcbiAgICAgICAgc2VjdGlvbk5hbWVcclxuICAgICAgKVxyXG4gICAgICBpZiAoY2hpbGROb2RlKSBjaGlsZHJlbi5wdXNoKGNoaWxkTm9kZSlcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgLy8gXHU1OTgyXHU2NzlDXHU2Q0ExXHU2NzA5IEZvbGRlciBOb3RlL0luZGV4IFx1NEUxNFx1NkNBMVx1NjcwOVx1NUI1MFx1OTg3OVx1RkYwQ1x1NUZGRFx1NzU2NVx1NkI2NFx1NjU4N1x1NEVGNlx1NTkzOVxyXG4gIGlmICghbGluayAmJiBjaGlsZHJlbi5sZW5ndGggPT09IDApIHJldHVybiBudWxsXHJcbiAgXHJcbiAgcmV0dXJuIHtcclxuICAgIGlkOiBgL3NlY3Rpb25zLyR7cmVsYXRpdmVQYXRofS9gLFxyXG4gICAgdHlwZTogJ2ZvbGRlcicsXHJcbiAgICBuYW1lOiBmb2xkZXJOYW1lLFxyXG4gICAgdGl0bGUsXHJcbiAgICBkZXNjLFxyXG4gICAgcGF0aDogcmVsYXRpdmVQYXRoLFxyXG4gICAgbGluayxcclxuICAgIGNoaWxkcmVuOiBjaGlsZHJlbi5sZW5ndGggPiAwID8gY2hpbGRyZW4gOiB1bmRlZmluZWQsXHJcbiAgICBpc0xlYWY6IGZhbHNlLFxyXG4gICAgY29sbGFwc2VkOiB0cnVlXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogXHU1MjFCXHU1RUZBXHU2NTg3XHU0RUY2XHU4MjgyXHU3MEI5XHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVGaWxlTm9kZShcclxuICBmaWxlUGF0aDogc3RyaW5nLFxyXG4gIGZpbGVOYW1lOiBzdHJpbmcsXHJcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXHJcbiAgc2VjdGlvbk5hbWU6IHN0cmluZ1xyXG4pOiBEb2NOb2RlIHwgbnVsbCB7XHJcbiAgY29uc3QgYmFzZU5hbWUgPSBmaWxlTmFtZS5yZXBsYWNlKC9cXC5tZCQvaSwgJycpXHJcbiAgY29uc3QgdGl0bGUgPSBleHRyYWN0VGl0bGUoZmlsZVBhdGgpIHx8IGZvcm1hdERpc3BsYXlOYW1lKGJhc2VOYW1lKVxyXG4gIGNvbnN0IGRlc2MgPSBleHRyYWN0RGVzYyhmaWxlUGF0aCkgfHwgJydcclxuICBjb25zdCBsaW5rID0gYC9zZWN0aW9ucy8ke3JlbGF0aXZlUGF0aC5yZXBsYWNlKC9cXC5tZCQvaSwgJycpfWBcclxuICBcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IGxpbmssXHJcbiAgICB0eXBlOiAnZmlsZScsXHJcbiAgICBuYW1lOiBiYXNlTmFtZSxcclxuICAgIHRpdGxlLFxyXG4gICAgZGVzYyxcclxuICAgIHBhdGg6IHJlbGF0aXZlUGF0aC5yZXBsYWNlKC9cXC5tZCQvaSwgJycpLFxyXG4gICAgbGluayxcclxuICAgIGlzTGVhZjogdHJ1ZVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFx1NEVDRVx1NjU4N1x1NEVGNlx1NjNEMFx1NTNENlx1NjgwN1x1OTg5OFxyXG4gKi9cclxuZnVuY3Rpb24gZXh0cmFjdFRpdGxlKGZpbGVQYXRoOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29udGVudCA9IHJlcXVpcmUoJ2ZzJykucmVhZEZpbGVTeW5jKGZpbGVQYXRoLCAndXRmLTgnKVxyXG4gICAgXHJcbiAgICAvLyAxLiBcdTRFQ0UgZnJvbnRtYXR0ZXIgXHU2M0QwXHU1M0Q2XHJcbiAgICBjb25zdCBmbU1hdGNoID0gY29udGVudC5tYXRjaCgvXi0tLVxcbltcXHNcXFNdKj9cXG50aXRsZTpcXHMqKC4rPylcXG4vKVxyXG4gICAgaWYgKGZtTWF0Y2gpIHJldHVybiBmbU1hdGNoWzFdLnRyaW0oKS5yZXBsYWNlKC9eW1wiJ118W1wiJ10kL2csICcnKVxyXG4gICAgXHJcbiAgICAvLyAyLiBcdTRFQ0UgSDEgXHU2M0QwXHU1M0Q2XHJcbiAgICBjb25zdCBoMU1hdGNoID0gY29udGVudC5tYXRjaCgvXiNcXHMrKC4rKSQvbSlcclxuICAgIGlmIChoMU1hdGNoKSByZXR1cm4gaDFNYXRjaFsxXS50cmltKClcclxuICAgIFxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiBudWxsXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogXHU0RUNFXHU2NTg3XHU0RUY2XHU2M0QwXHU1M0Q2XHU2M0NGXHU4RkYwXHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0RGVzYyhmaWxlUGF0aDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbnRlbnQgPSByZXF1aXJlKCdmcycpLnJlYWRGaWxlU3luYyhmaWxlUGF0aCwgJ3V0Zi04JylcclxuICAgIGNvbnN0IGZtTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eLS0tXFxuW1xcc1xcU10qP1xcbmRlc2NyaXB0aW9uOlxccyooLis/KVxcbi8pXHJcbiAgICBpZiAoZm1NYXRjaCkgcmV0dXJuIGZtTWF0Y2hbMV0udHJpbSgpLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgJycpXHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTY4M0NcdTVGMEZcdTUzMTZcdTY2M0VcdTc5M0FcdTU0MERcdTc5RjBcclxuICovXHJcbmZ1bmN0aW9uIGZvcm1hdERpc3BsYXlOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIG5hbWVcclxuICAgIC5yZXBsYWNlKC9eXFxkK1stX10vLCAnJykgICAgICAgICAgIC8vIFx1NzlGQlx1OTY2NFx1NUU4Rlx1NTNGN1x1NTI0RFx1N0YwMFxyXG4gICAgLnJlcGxhY2UoL1stX10vZywgJyAnKSAgICAgICAgICAgICAvLyBcdTY2RkZcdTYzNjJcdTUyMDZcdTk2OTRcdTdCMjZcdTRFM0FcdTdBN0FcdTY4M0NcclxuICAgIC5yZXBsYWNlKC9cXGJcXHcvZywgYyA9PiBjLnRvVXBwZXJDYXNlKCkpICAvLyBcdTk5OTZcdTVCNTdcdTZCQ0RcdTU5MjdcdTUxOTlcclxufVxyXG5cclxuLyoqXHJcbiAqIFx1OEY2Q1x1NjM2Mlx1NEUzQSBTaWRlYmFyIFx1NjgzQ1x1NUYwRlx1RkYwOFx1NTE3Q1x1NUJCOSBWaXRlUHJlc3NcdUZGMDlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB0b1NpZGViYXJGb3JtYXQobm9kZXM6IERvY05vZGVbXSk6IGFueVtdIHtcclxuICByZXR1cm4gbm9kZXMubWFwKG5vZGUgPT4ge1xyXG4gICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7XHJcbiAgICAgIHRleHQ6IG5vZGUudGl0bGUsXHJcbiAgICAgIGlkOiBub2RlLmlkLFxyXG4gICAgICBjb2xsYXBzZWQ6IG5vZGUuY29sbGFwc2VkID8/IGZhbHNlLFxyXG4gICAgICBpc0xlYWY6IG5vZGUuaXNMZWFmLFxyXG4gICAgICBkZXNjcmlwdGlvbjogbm9kZS5kZXNjXHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIFx1Nzg2RVx1NEZERFx1OTRGRVx1NjNBNVx1NjgzQ1x1NUYwRlx1NEUwMFx1ODFGNFx1NjAyN1x1RkYxQVx1NjU4N1x1NEVGNlx1NTkzOVx1NEVFNSAvIFx1N0VEM1x1NUMzRVx1RkYwQ1x1NjU4N1x1NEVGNlx1NEUwRFx1NEVFNSAvIFx1N0VEM1x1NUMzRVxyXG4gICAgaWYgKG5vZGUubGluaykge1xyXG4gICAgICByZXN1bHQubGluayA9IG5vZGUudHlwZSA9PT0gJ2ZvbGRlcicgXHJcbiAgICAgICAgPyAobm9kZS5saW5rLmVuZHNXaXRoKCcvJykgPyBub2RlLmxpbmsgOiBgJHtub2RlLmxpbmt9L2ApXHJcbiAgICAgICAgOiBub2RlLmxpbmsucmVwbGFjZSgvXFwvJC8sICcnKVxyXG4gICAgfVxyXG4gICAgaWYgKG5vZGUuY2hpbGRyZW4pIHJlc3VsdC5pdGVtcyA9IHRvU2lkZWJhckZvcm1hdChub2RlLmNoaWxkcmVuKVxyXG4gICAgXHJcbiAgICByZXR1cm4gcmVzdWx0XHJcbiAgfSlcclxufVxyXG5cclxuLyoqXHJcbiAqIFx1OEY2Q1x1NjM2Mlx1NEUzQVx1NTI0RFx1N0FFRlx1NzZFRVx1NUY1NVx1NjgxMVx1NjgzQ1x1NUYwRlxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHRvRGlyZWN0b3J5VHJlZShub2RlczogRG9jTm9kZVtdKTogYW55W10ge1xyXG4gIHJldHVybiBub2Rlcy5tYXAobm9kZSA9PiB7XHJcbiAgICBpZiAobm9kZS50eXBlID09PSAnZm9sZGVyJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHR5cGU6ICdkaXJlY3RvcnknLFxyXG4gICAgICAgIHBhdGg6IG5vZGUuaWQsXHJcbiAgICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICAgIGRpc3BsYXlOYW1lOiBub2RlLnRpdGxlLFxyXG4gICAgICAgIGNoaWxkcmVuOiBub2RlLmNoaWxkcmVuID8gdG9EaXJlY3RvcnlUcmVlKG5vZGUuY2hpbGRyZW4pIDogW11cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdHlwZTogJ2FydGljbGUnLFxyXG4gICAgICBwYXRoOiBub2RlLmxpbmssXHJcbiAgICAgIG5hbWU6IG5vZGUubmFtZSxcclxuICAgICAgdGl0bGU6IG5vZGUudGl0bGUsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBub2RlLnRpdGxlXHJcbiAgICB9XHJcbiAgfSlcclxufVxyXG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7OztBQUFvUixTQUFTLGNBQWMsZUFBZTtBQUMxVCxTQUFTLGVBQWUsV0FBVztBQUNuQyxPQUFPLFVBQVU7QUFDakIsT0FBTyxRQUFRO0FBQ2YsU0FBUyxnQkFBZ0I7QUFJekIsT0FBTyxjQUFjOzs7QUNJckIsSUFBTSxnQkFBZ0Isb0JBQUksSUFBaUM7QUFDM0QsSUFBTSxlQUFlLG9CQUFJLElBQWdEO0FBdUJsRSxTQUFTLGtCQUFrQixTQUFrQjtBQUNsRCxNQUFJLFNBQVM7QUFDWCxpQkFBYSxPQUFPLE9BQU87QUFDM0IsWUFBUSxJQUFJLHdDQUF3QyxPQUFPLEVBQUU7QUFBQSxFQUMvRCxPQUFPO0FBQ0wsaUJBQWEsTUFBTTtBQUNuQixrQkFBYyxNQUFNO0FBQ3BCLFlBQVEsSUFBSSw2QkFBNkI7QUFBQSxFQUMzQztBQUNGOzs7QUNuQ0EsU0FBUyxhQUF1QixrQkFBa0I7QUFDbEQsU0FBUyxNQUFNLGdCQUF5QjtBQWtCakMsU0FBUyxpQkFDZCxhQUNBLGFBQ1c7QUFDWCxRQUFNLFFBQW1CLENBQUM7QUFHMUIsUUFBTSxVQUFVLGVBQWUsU0FBUyxXQUFXO0FBRW5ELFFBQU0sVUFBVSxZQUFZLGFBQWEsRUFBRSxlQUFlLEtBQUssQ0FBQyxFQUM3RCxPQUFPLE9BQUssQ0FBQyxFQUFFLEtBQUssV0FBVyxHQUFHLEtBQUssRUFBRSxTQUFTLGVBQWUsRUFDakUsS0FBSyxDQUFDLEdBQUcsTUFBTTtBQUVkLFFBQUksRUFBRSxZQUFZLEtBQUssQ0FBQyxFQUFFLFlBQVksRUFBRyxRQUFP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
