var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// .vitepress/config.ts
import { defineConfig } from "file:///D:/ALL%20IN%20AI/MetaBlog/node_modules/vitepress/dist/node/index.js";
import { fileURLToPath, URL } from "node:url";
import path from "path";
import fs2 from "fs";
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
      const folderNode = scanFolder(fullPath, entry.name, relativePath, secName);
      if (folderNode) nodes.push(folderNode);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (entry.name === `${secName}.md`) continue;
      const fileNode = createFileNode(fullPath, entry.name, relativePath, secName);
      if (fileNode) nodes.push(fileNode);
    }
  }
  return nodes;
}
function scanFolder(dirPath, folderName, relativePath, sectionName) {
  const folderNotePath = join(dirPath, `${folderName}.md`);
  const indexPath = join(dirPath, "index.md");
  let title = folderName;
  let link;
  let folderNotePathUsed;
  if (existsSync(folderNotePath)) {
    title = extractTitle(folderNotePath) || formatDisplayName(folderName);
    link = `/sections/${relativePath}/`;
    folderNotePathUsed = folderNotePath;
  } else if (existsSync(indexPath)) {
    title = extractTitle(indexPath) || formatDisplayName(folderName);
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
  const link = `/sections/${relativePath.replace(/\.md$/i, "")}`;
  return {
    id: link,
    type: "file",
    name: baseName,
    title,
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
function formatDisplayName(name) {
  return name.replace(/^\d+[-_]/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function toSidebarFormat(nodes) {
  return nodes.map((node) => {
    const result = {
      text: node.title,
      id: node.id,
      collapsed: node.collapsed ?? false,
      isLeaf: node.isLeaf
    };
    if (node.link) result.link = node.link;
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

// .vitepress/agent/runtime/LogSystem.ts
import { promises as fs } from "fs";
import { join as join2 } from "path";
var LOGS_DIR = join2(process.cwd(), ".vitepress", "agent", "logs");
var LOG_FILE = join2(LOGS_DIR, "system.log");
var MAX_FILE_SIZE = 10 * 1024 * 1024;
var MAX_MEMORY_LOGS = 2e3;
var memoryLogs = [];
var SYSTEM_START_TIME = (/* @__PURE__ */ new Date()).toISOString();
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
function getTimestamp() {
  return (/* @__PURE__ */ new Date()).toISOString();
}
function formatLogLine(entry) {
  const actorEmoji = entry.actor === "human" ? "\u{1F464}" : entry.actor === "ai" ? "\u{1F916}" : "\u2699\uFE0F";
  return `[${entry.timestamp}] ${actorEmoji} [${entry.actor.toUpperCase()}] ${entry.level.toUpperCase()} | ${entry.event} | ${entry.message}`;
}
async function ensureLogDir() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (e) {
    console.error("Failed to create logs directory:", e);
  }
}
async function rotateLogIfNeeded() {
  try {
    const stats = await fs.stat(LOG_FILE).catch(() => null);
    if (stats && stats.size > MAX_FILE_SIZE) {
      const backupFile = join2(LOGS_DIR, `system-${Date.now()}.log`);
      await fs.rename(LOG_FILE, backupFile);
    }
  } catch (e) {
  }
}
async function appendToFile(entry) {
  try {
    await ensureLogDir();
    await rotateLogIfNeeded();
    const line = formatLogLine(entry) + "\n";
    await fs.appendFile(LOG_FILE, line, "utf-8");
  } catch (e) {
    console.error("Failed to write log to file:", e);
  }
}
function log(level, event, message, options = {}) {
  const entry = {
    id: generateId(),
    timestamp: getTimestamp(),
    level,
    event,
    message,
    actor: options.actor || "system",
    actorId: options.actorId,
    source: options.source || "system",
    taskId: options.taskId,
    skillName: options.skillName,
    duration: options.duration,
    metadata: options.metadata,
    data: options.data
  };
  memoryLogs.unshift(entry);
  if (memoryLogs.length > MAX_MEMORY_LOGS) {
    memoryLogs.pop();
  }
  appendToFile(entry).catch(() => {
  });
  const colors = {
    debug: "\x1B[36m",
    // 青色
    info: "\x1B[34m",
    // 蓝色
    warn: "\x1B[33m",
    // 黄色
    error: "\x1B[31m",
    // 红色
    success: "\x1B[32m",
    // 绿色
    system: "\x1B[35m",
    // 紫色
    reset: "\x1B[0m"
  };
  const actorEmoji = entry.actor === "human" ? "\u{1F464}" : entry.actor === "ai" ? "\u{1F916}" : "\u2699\uFE0F";
  const color = colors[level] || colors.reset;
  console.log(
    `${color}[${level.toUpperCase()}]${colors.reset} ${actorEmoji} [${entry.actor.toUpperCase()}${entry.actorId ? `:${entry.actorId}` : ""}] ${event}: ${message}`
  );
  return entry;
}
var human = {
  debug: (event, message, opts) => log("debug", event, message, { ...opts, actor: "human" }),
  info: (event, message, opts) => log("info", event, message, { ...opts, actor: "human" }),
  warn: (event, message, opts) => log("warn", event, message, { ...opts, actor: "human" }),
  error: (event, message, opts) => log("error", event, message, { ...opts, actor: "human" }),
  success: (event, message, opts) => log("success", event, message, { ...opts, actor: "human" })
};
var ai = {
  debug: (event, message, opts) => log("debug", event, message, { ...opts, actor: "ai" }),
  info: (event, message, opts) => log("info", event, message, { ...opts, actor: "ai" }),
  warn: (event, message, opts) => log("warn", event, message, { ...opts, actor: "ai" }),
  error: (event, message, opts) => log("error", event, message, { ...opts, actor: "ai" }),
  success: (event, message, opts) => log("success", event, message, { ...opts, actor: "ai" })
};
var system = {
  debug: (event, message, opts) => log("debug", event, message, { ...opts, actor: "system" }),
  info: (event, message, opts) => log("info", event, message, { ...opts, actor: "system" }),
  warn: (event, message, opts) => log("warn", event, message, { ...opts, actor: "system" }),
  error: (event, message, opts) => log("error", event, message, { ...opts, actor: "system" }),
  success: (event, message, opts) => log("success", event, message, { ...opts, actor: "system" })
};
var logger = {
  debug: (event, message, opts) => log("debug", event, message, opts),
  info: (event, message, opts) => log("info", event, message, opts),
  warn: (event, message, opts) => log("warn", event, message, opts),
  error: (event, message, opts) => log("error", event, message, opts),
  success: (event, message, opts) => log("success", event, message, opts)
};
function getLogs(filter) {
  let result = [...memoryLogs];
  if (filter) {
    if (filter.level) {
      result = result.filter((log2) => log2.level === filter.level);
    }
    if (filter.event) {
      result = result.filter((log2) => log2.event === filter.event);
    }
    if (filter.actor) {
      result = result.filter((log2) => log2.actor === filter.actor);
    }
    if (filter.actorId) {
      result = result.filter((log2) => log2.actorId === filter.actorId);
    }
    if (filter.search) {
      const search = filter.search.toLowerCase();
      result = result.filter(
        (log2) => log2.message.toLowerCase().includes(search) || log2.event.toLowerCase().includes(search) || log2.source.toLowerCase().includes(search)
      );
    }
    if (filter.startTime) {
      result = result.filter((log2) => new Date(log2.timestamp) >= filter.startTime);
    }
    if (filter.endTime) {
      result = result.filter((log2) => new Date(log2.timestamp) <= filter.endTime);
    }
  }
  return result;
}
function getStats() {
  const stats = {
    total: memoryLogs.length,
    byLevel: { debug: 0, info: 0, warn: 0, error: 0, success: 0, system: 0 },
    byEvent: {},
    byActor: { human: 0, ai: 0, system: 0 },
    recentErrors: [],
    humanActivity: 0,
    aiActivity: 0
  };
  memoryLogs.forEach((log2) => {
    stats.byLevel[log2.level] = (stats.byLevel[log2.level] || 0) + 1;
    stats.byEvent[log2.event] = (stats.byEvent[log2.event] || 0) + 1;
    stats.byActor[log2.actor] = (stats.byActor[log2.actor] || 0) + 1;
    if (log2.actor === "human") stats.humanActivity++;
    if (log2.actor === "ai") stats.aiActivity++;
    if (log2.level === "error" && stats.recentErrors.length < 10) {
      stats.recentErrors.push(log2);
    }
  });
  return stats;
}
function getSystemUptime() {
  const start = new Date(SYSTEM_START_TIME);
  const now = /* @__PURE__ */ new Date();
  const diff = now.getTime() - start.getTime();
  const hours = Math.floor(diff / (1e3 * 60 * 60));
  const minutes = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
  const seconds = Math.floor(diff % (1e3 * 60) / 1e3);
  return `${hours}h ${minutes}m ${seconds}s`;
}
function exportLogs(format = "json") {
  if (format === "csv") {
    const headers = ["timestamp", "level", "actor", "actorId", "event", "message", "source", "taskId", "duration"];
    const rows = memoryLogs.map((log2) => [
      log2.timestamp,
      log2.level,
      log2.actor,
      log2.actorId || "",
      log2.event,
      `"${log2.message.replace(/"/g, '""')}"`,
      log2.source,
      log2.taskId || "",
      log2.duration || ""
    ]);
    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  }
  return JSON.stringify(memoryLogs, null, 2);
}
function clearLogs() {
  memoryLogs.length = 0;
}
function getUniqueEvents() {
  const events = new Set(memoryLogs.map((log2) => log2.event));
  return Array.from(events).sort();
}
function getUniqueActorIds() {
  const ids = new Set(memoryLogs.filter((log2) => log2.actorId).map((log2) => log2.actorId));
  return Array.from(ids).sort();
}
function recordSystemStartup() {
  log("system", "system.startup", "MetaUniverse System Started", {
    actor: "system",
    source: "LogSystem",
    metadata: { startTime: SYSTEM_START_TIME, version: "2.0.0" }
  });
}
async function getRecent(count = 100, level) {
  let logs = [...memoryLogs];
  if (level) {
    logs = logs.filter((log2) => log2.level === level);
  }
  return logs.slice(0, count);
}
async function queryLogs(filter) {
  return filterLogs(filter);
}
async function cleanup(days = 30) {
  const cutoff = /* @__PURE__ */ new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const originalLength = memoryLogs.length;
  const filtered = memoryLogs.filter((log2) => new Date(log2.timestamp) >= cutoff);
  memoryLogs.length = 0;
  memoryLogs.push(...filtered);
  return originalLength - filtered.length;
}
async function addLog(level, event, message, actor = "system", metadata) {
  log(level, event, message, {
    actor,
    metadata,
    source: actor === "human" ? "frontend" : actor === "ai" ? "ai-service" : "system"
  });
}
var logSystem = {
  log,
  human,
  ai,
  system,
  logger,
  add: addLog,
  getLogs,
  getRecent,
  query: queryLogs,
  getStats,
  getSystemUptime,
  exportLogs,
  clearLogs,
  cleanup,
  getUniqueEvents,
  getUniqueActorIds,
  recordSystemStartup,
  SYSTEM_START_TIME
};

// .vitepress/agent/runtime/boot-logger.ts
var BootLogger = class {
  startTime = Date.now();
  events = [];
  isBooted = false;
  constructor() {
    this.log("init", "Boot logger initialized");
  }
  log(phase, message, metadata) {
    const event = {
      phase,
      message,
      metadata,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.events.push(event);
    const duration = Date.now() - this.startTime;
    logSystem.add(
      phase === "error" ? "error" : "info",
      `boot.${phase}`,
      `[+${duration}ms] ${message}`,
      "system",
      { ...metadata, bootTime: duration }
    ).catch(console.error);
  }
  // VitePress配置加载
  logConfigLoad(configPath) {
    this.log("config", "Configuration loaded", { configPath });
  }
  // 服务器启动
  logServerStart(port, host) {
    this.log("server", `Dev server started on ${host}:${port}`, { port, host });
  }
  // 插件初始化
  logPluginInit(pluginName, status = "success") {
    this.log(
      status === "error" ? "error" : "init",
      `Plugin ${pluginName} ${status}`,
      { pluginName, status }
    );
  }
  // 系统就绪
  logReady() {
    const totalDuration = Date.now() - this.startTime;
    this.isBooted = true;
    this.log("ready", "System ready", {
      totalBootTime: totalDuration,
      eventCount: this.events.length
    });
  }
  // 启动错误
  logError(error, context) {
    this.log("error", context || "Boot error", {
      error: error.message,
      stack: error.stack
    });
  }
  // 获取启动报告
  getBootReport() {
    return {
      success: this.isBooted,
      duration: Date.now() - this.startTime,
      events: this.events,
      phases: this.events.reduce((acc, e) => {
        acc[e.phase] = (acc[e.phase] || 0) + 1;
        return acc;
      }, {})
    };
  }
};
var bootLogger = new BootLogger();

// .vitepress/config.ts
var __vite_injected_original_import_meta_url = "file:///D:/ALL%20IN%20AI/MetaBlog/.vitepress/config.ts";
var { human: human2, ai: ai2, system: system2, recordSystemStartup: recordSystemStartup2 } = logSystem;
bootLogger.logConfigLoad("config.ts");
var getWordCount = (content) => {
  return content.split(/\s+/g).length;
};
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
  if (!fs2.existsSync(sectionsPath)) return rewrites;
  const sections = fs2.readdirSync(sectionsPath, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const section of sections) {
    const sectionPath = path.join(sectionsPath, section.name);
    scanForRewrites(sectionPath, `sections/${section.name}`, rewrites);
  }
  return rewrites;
}
function scanForRewrites(dirPath, relativePath, rewrites) {
  const entries = fs2.readdirSync(dirPath, { withFileTypes: true });
  const dirName = path.basename(dirPath);
  const sameNameMd = path.join(dirPath, `${dirName}.md`);
  const indexMd = path.join(dirPath, "index.md");
  if (fs2.existsSync(sameNameMd)) {
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
  cleanUrls: true,
  // Generate rewrites dynamically
  rewrites: generateRewrites(),
  themeConfig: {
    nav: [
      { text: "\u9996\u9875", link: "/" },
      { text: "\u6587\u7AE0\u5217\u8868", link: "/sections/posts/", activeMatch: "/sections/posts/" },
      { text: "\u77E5\u8BC6\u5E93", link: "/sections/knowledge/", activeMatch: "/sections/knowledge/" },
      { text: "\u516C\u5F00\u8D44\u6E90", link: "/sections/resources/", activeMatch: "/sections/resources/" },
      { text: "\u5173\u4E8E\u6211", link: "/sections/about/", activeMatch: "/sections/about/" }
    ],
    sidebar: {
      "/sections/knowledge/": toSidebarFormat(scanDocStructure(path.resolve(process.cwd(), "docs/sections/knowledge"))),
      "/sections/posts/": toSidebarFormat(scanDocStructure(path.resolve(process.cwd(), "docs/sections/posts"))),
      "/sections/resources/": toSidebarFormat(scanDocStructure(path.resolve(process.cwd(), "docs/sections/resources"))),
      "/sections/about/": toSidebarFormat(scanDocStructure(path.resolve(process.cwd(), "docs/sections/about")))
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
      const defaultRender = md.renderer.rules.text || function(tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options);
      };
      md.renderer.rules.text = function(tokens, idx, options, env, self) {
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
        return defaultRender(tokens, idx, options, env, self);
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
    envPrefix: ["VITE_", "LLM_"],
    resolve: {
      alias: [
        { find: "@", replacement: fileURLToPath(new URL("./theme", __vite_injected_original_import_meta_url)) }
      ]
    },
    plugins: [
      {
        name: "meta-blog-routing",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const url = req.url || "";
            if (url.includes("_assets") || url.includes("@fs") || url.includes("?") || url.includes(".")) {
              next();
              return;
            }
            if (url.startsWith("/sections/") && !url.endsWith("/")) {
              res.statusCode = 301;
              res.setHeader("Location", url + "/");
              res.end();
              return;
            }
            next();
          });
        }
      },
      {
        name: "meta-blog-bff",
        configureServer(server) {
          recordSystemStartup2();
          bootLogger.logServerStart(5193, "localhost");
          system2.info("server.init", "BFF API Server \u521D\u59CB\u5316\u5B8C\u6210");
          bootLogger.logReady();
          server.middlewares.use("/api/", (req, res, next) => {
            const startTime = Date.now();
            const url = req.url || "";
            system2.debug("api.request", `${req.method} ${url}`, {
              metadata: { method: req.method, url, headers: req.headers }
            });
            const originalEnd = res.end.bind(res);
            res.end = function(...args) {
              const duration = Date.now() - startTime;
              const status = res.statusCode || 200;
              if (status >= 400) {
                system2.error("api.response", `${req.method} ${url} - ${status} (${duration}ms)`, {
                  metadata: { method: req.method, url, status, duration }
                });
              } else {
                system2.success("api.response", `${req.method} ${url} - ${status} (${duration}ms)`, {
                  metadata: { method: req.method, url, status, duration }
                });
              }
              return originalEnd(...args);
            };
            next();
          });
          server.middlewares.use("/api/files/read", (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const filePath = url.searchParams.get("path");
              if (!filePath) return next();
              const fullPath = path.resolve(process.cwd(), "docs", filePath.replace(/^\//, ""));
              if (fs2.existsSync(fullPath)) {
                res.setHeader("Content-Type", "text/plain");
                res.end(fs2.readFileSync(fullPath, "utf-8"));
              } else {
                res.statusCode = 404;
                res.end("File not found");
              }
            } else next();
          });
          server.middlewares.use("/api/files/save", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { path: filePath, content } = body;
                const fullPath = path.resolve(process.cwd(), "docs", filePath.replace(/^\//, ""));
                fs2.writeFileSync(fullPath, content);
                try {
                  execSync(`git add "${fullPath}"`);
                  execSync(`git commit -m "content: \u66F4\u65B0 ${path.basename(fullPath)}"`);
                } catch (e) {
                }
                res.end("Saved");
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
                  const { path: filePath, newName, updateFrontmatter = true } = body;
                  const dir = path.dirname(filePath);
                  const ext = path.extname(filePath);
                  const newFileName = newName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "_") + ext;
                  const newPath = path.join(dir, newFileName);
                  const fullOldPath = path.resolve(process.cwd(), "docs", filePath.replace(/^\//, ""));
                  const fullNewPath = path.resolve(process.cwd(), "docs", newPath.replace(/^\//, ""));
                  if (!fs2.existsSync(fullOldPath)) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: "File not found" }));
                    return;
                  }
                  if (fs2.existsSync(fullNewPath)) {
                    res.statusCode = 409;
                    res.end(JSON.stringify({ success: false, error: "Target file already exists" }));
                    return;
                  }
                  let content = fs2.readFileSync(fullOldPath, "utf-8");
                  if (updateFrontmatter) {
                    if (content.startsWith("---")) {
                      if (content.match(/title:\s*.+/)) {
                        content = content.replace(/title:\s*.+/, `title: ${newName}`);
                      } else {
                        content = content.replace(/---\n/, `---
title: ${newName}
`);
                      }
                    } else {
                      content = `---
title: ${newName}
---

${content}`;
                    }
                  }
                  fs2.writeFileSync(fullNewPath, content);
                  fs2.unlinkSync(fullOldPath);
                  try {
                    execSync(`git add "${fullOldPath}" "${fullNewPath}"`);
                    execSync(`git commit -m "content: \u91CD\u547D\u540D ${path.basename(filePath)} -> ${newFileName}"`);
                  } catch (e) {
                  }
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({
                    success: true,
                    data: {
                      oldPath: filePath,
                      newPath: newPath.replace(/\\/g, "/"),
                      newName: newFileName,
                      displayName: newName
                    }
                  }));
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
                  const fullFromPath = path.resolve(process.cwd(), "docs", fromPath.replace(/^\//, ""));
                  const fullToPath = path.resolve(process.cwd(), "docs", toPath.replace(/^\//, ""));
                  fs2.mkdirSync(path.dirname(fullToPath), { recursive: true });
                  fs2.renameSync(fullFromPath, fullToPath);
                  try {
                    execSync(`git mv "${fullFromPath}" "${fullToPath}"`);
                    execSync(`git commit -m "content: \u79FB\u52A8 ${path.basename(fromPath)} -> ${path.basename(toPath)}"`);
                  } catch (e) {
                    try {
                      execSync(`git add "${fullFromPath}" "${fullToPath}"`);
                      execSync(`git commit -m "content: \u79FB\u52A8 ${path.basename(fromPath)} -> ${path.basename(toPath)}"`);
                    } catch (e2) {
                    }
                  }
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
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
                  const { path: filePath } = body;
                  const fullPath = path.resolve(process.cwd(), "docs", filePath.replace(/^\//, ""));
                  fs2.unlinkSync(fullPath);
                  try {
                    execSync(`git rm "${fullPath}"`);
                    execSync(`git commit -m "content: \u5220\u9664 ${path.basename(filePath)}"`);
                  } catch (e) {
                  }
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/agent/task", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { taskId, content: fileContent, path: filePath, metadata } = body;
                  const fullPath = path.resolve(process.cwd(), "docs", filePath.replace(/^\//, ""));
                  fs2.writeFileSync(fullPath, fileContent);
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
                  const taskDir = path.resolve(process.cwd(), ".vitepress/agent/memory/tasks");
                  if (!fs2.existsSync(taskDir)) {
                    fs2.mkdirSync(taskDir, { recursive: true });
                  }
                  const taskFile = path.join(taskDir, `${taskId}.json`);
                  fs2.writeFileSync(taskFile, JSON.stringify({
                    id: taskId,
                    status: "completed",
                    path: filePath,
                    metadata,
                    timestamp: (/* @__PURE__ */ new Date()).toISOString()
                  }, null, 2));
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, taskId }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/agent/context/init", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: filePath } = body;
                  const contextDir = path.resolve(process.cwd(), ".vitepress/agent/memory");
                  let entities = [];
                  let history = [];
                  const entitiesPath = path.join(contextDir, "entities/concepts.json");
                  if (fs2.existsSync(entitiesPath)) {
                    const entitiesData = JSON.parse(fs2.readFileSync(entitiesPath, "utf-8"));
                    entities = Object.values(entitiesData).filter(
                      (e) => e.sources?.includes(filePath)
                    );
                  }
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({
                    success: true,
                    context: {
                      path: filePath,
                      entities: entities.slice(0, 5),
                      relatedArticles: entities.length
                    }
                  }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/agent/task/status", (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const taskId = url.searchParams.get("id");
              if (!taskId) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Missing task ID" }));
                return;
              }
              const taskFile = path.resolve(process.cwd(), ".vitepress/agent/memory/tasks", `${taskId}.json`);
              if (fs2.existsSync(taskFile)) {
                const taskData = JSON.parse(fs2.readFileSync(taskFile, "utf-8"));
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(taskData));
              } else {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Task not found" }));
              }
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
                const url = new URL(req.url || "", `http://${req.headers.host}`);
                const section = url.searchParams.get("section") || "posts";
                const nodes = scanDocStructure(path.resolve(process.cwd(), "docs/sections", section));
                const sidebarData = toSidebarFormat(nodes);
                res.setHeader("Content-Type", "application/json");
                res.setHeader("Cache-Control", "no-cache");
                res.end(JSON.stringify({
                  success: true,
                  data: sidebarData,
                  timestamp: Date.now()
                }));
              } catch (e) {
                console.error("[API] Sidebar error:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: "Failed to generate sidebar" }));
              }
            } else next();
          });
          server.middlewares.use("/api/directory-tree", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(req.url || "", `http://${req.headers.host}`);
                const section = url.searchParams.get("section") || "posts";
                const nodes = scanDocStructure(path.resolve(process.cwd(), "docs/sections", section));
                const treeData = toDirectoryTree(nodes);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({
                  success: true,
                  data: treeData
                }));
              } catch (e) {
                console.error("[API] Directory tree error:", e);
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: "Failed to generate directory tree" }));
              }
            } else next();
          });
          const SECTIONS_PATH = path.join(process.cwd(), "docs/sections");
          function generateSlug(title) {
            if (!title || !title.trim()) return "untitled";
            const pinyinMap = {
              "\u5B50": "zi",
              "\u6587": "wen",
              "\u6863": "dang",
              "\u6D4B": "ce",
              "\u8BD5": "shi",
              "\u6700": "zui",
              "\u7EC8": "zhong",
              "\u7248": "ban",
              "\u6587": "wen",
              "\u7AE0": "zhang",
              "\u4E2D": "zhong",
              "\u82F1": "ying",
              "\u6D4B": "ce",
              "\u8BD5": "shi",
              "\u5F55": "lu",
              "\u76EE": "mu",
              "\u7B14": "bi",
              "\u8BB0": "ji",
              "\u672C": "ben",
              "\u5206": "fen",
              "\u7C7B": "lei",
              "\u6807": "biao",
              "\u7B7E": "qian",
              "\u65F6": "shi",
              "\u95F4": "jian"
            };
            let slug = title.toLowerCase().replace(/[^\w\s\u4e00-\u9fa5-]/g, "").trim();
            let result = "";
            for (const char of slug) {
              if (/[\u4e00-\u9fa5]/.test(char)) {
                result += pinyinMap[char] || char;
              } else if (/\s/.test(char)) {
                result += "-";
              } else {
                result += char;
              }
            }
            result = result.replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 50);
            return result || "untitled";
          }
          async function scanArticles(dir, basePath = "") {
            const articles = [];
            try {
              const entries = await fs2.promises.readdir(dir, { withFileTypes: true });
              for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relativePath = path.join(basePath, entry.name);
                if (entry.isDirectory() && !entry.name.startsWith(".")) {
                  const subArticles = await scanArticles(fullPath, relativePath);
                  articles.push(...subArticles);
                } else if (entry.isFile() && entry.name.endsWith(".md") && entry.name !== "index.md") {
                  const content = await fs2.promises.readFile(fullPath, "utf-8");
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
                if (match) meta[match[1]] = match[2].replace(/^["']|["']$/g, "");
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
          server.middlewares.use("/api/articles/list", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const allArticles = [];
                const sections = ["posts", "knowledge", "resources", "about"];
                for (const section of sections) {
                  const sectionPath = path.join(SECTIONS_PATH, section);
                  if (fs2.existsSync(sectionPath)) {
                    const nodes = scanDocStructure(sectionPath);
                    const articles = flattenArticles(nodes).map((a) => ({
                      ...a,
                      path: `${section}/${a.path}`
                    }));
                    allArticles.push(...articles);
                  }
                }
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({
                  success: true,
                  data: allArticles
                }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: "Failed to list articles" }));
              }
            } else next();
          });
          server.middlewares.use("/api/articles/search", async (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
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
                res.end(JSON.stringify({ success: false, error: "Failed to search articles" }));
              }
            } else next();
          });
          server.middlewares.use("/api/articles/detail", async (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const articlePath = url.searchParams.get("path");
              if (!articlePath) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: "Path required" }));
                return;
              }
              try {
                const fullPath = path.join(SECTIONS_PATH, articlePath);
                const content = fs2.readFileSync(fullPath, "utf-8");
                const meta = extractArticleMeta(content, articlePath);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: { ...meta, content } }));
              } catch (e) {
                res.statusCode = 404;
                res.end(JSON.stringify({ success: false, error: "Article not found" }));
              }
            } else next();
          });
          server.middlewares.use("/api/articles/create", async (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { title, content = "", section = "posts", tags = [], parentPath, isChildDoc } = body;
                  console.log("[API] Creating article:", { title, section, isChildDoc, parentPath, cwd: process.cwd(), SECTIONS_PATH });
                  if (!title) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: "Title required" }));
                    return;
                  }
                  const slug = generateSlug(title);
                  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
                  const filename = `${slug}.md`;
                  let targetDir;
                  let filePath;
                  if (isChildDoc && parentPath) {
                    let cleanParentPath = parentPath.replace(".html", "").replace(/^\//, "");
                    if (cleanParentPath.startsWith("sections/")) {
                      cleanParentPath = cleanParentPath.substring("sections/".length);
                    }
                    const parentFullPath = path.join(SECTIONS_PATH, cleanParentPath) + ".md";
                    const parentDir = path.dirname(parentFullPath);
                    const parentName = path.basename(parentFullPath, ".md");
                    const parentFolderPath = path.join(parentDir, parentName);
                    console.log("[API] Parent info:", { parentFullPath, parentDir, parentName, parentFolderPath });
                    const isLeafDoc = !fs2.existsSync(parentFolderPath);
                    if (isLeafDoc) {
                      console.log("[API] Parent is leaf document, creating folder and moving...");
                      await fs2.promises.mkdir(parentFolderPath, { recursive: true });
                      const targetParentPath = path.join(parentFolderPath, `${parentName}.md`);
                      if (fs2.existsSync(parentFullPath)) {
                        await fs2.promises.rename(parentFullPath, targetParentPath);
                        console.log("[API] Moved parent doc to:", targetParentPath);
                      }
                      targetDir = parentFolderPath;
                    } else {
                      console.log("[API] Parent already has folder, creating inside...");
                      targetDir = parentFolderPath;
                    }
                    filePath = path.join(targetDir, filename);
                  } else {
                    targetDir = path.join(SECTIONS_PATH, section);
                    filePath = path.join(targetDir, filename);
                  }
                  console.log("[API] Target path:", { targetDir, filePath });
                  await fs2.promises.mkdir(targetDir, { recursive: true });
                  const frontmatter = `---
title: ${title}
date: ${date}
tags:
${tags.map((t) => `  - ${t}`).join("\n")}
---

${content}`;
                  await fs2.promises.writeFile(filePath, frontmatter, "utf-8");
                  console.log("[API] File written successfully:", filePath);
                  clearSidebarCache(section);
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({
                    success: true,
                    data: {
                      path: path.relative(SECTIONS_PATH, filePath).replace(/\\/g, "/"),
                      title,
                      date,
                      fullPath: filePath
                    }
                  }));
                } catch (e) {
                  console.error("[API] Create article error:", e);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: "Failed to create article: " + e.message }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/articles/update", async (req, res, next) => {
            if (req.method === "PUT") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: articlePath, content } = body;
                  const fullPath = path.join(SECTIONS_PATH, articlePath);
                  await fs2.promises.writeFile(fullPath, content, "utf-8");
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, message: "Article updated" }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: "Failed to update article" }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/articles/publish", async (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: articlePath } = body;
                  const sourcePath = path.join(SECTIONS_PATH, articlePath);
                  const targetPath = articlePath.replace("/drafts/", "/posts/");
                  const destPath = path.join(SECTIONS_PATH, targetPath);
                  await fs2.promises.mkdir(path.dirname(destPath), { recursive: true });
                  await fs2.promises.rename(sourcePath, destPath);
                  clearSidebarCache("drafts");
                  clearSidebarCache("posts");
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: { newPath: targetPath } }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: "Failed to publish article" }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/articles/delete", async (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { path: articlePath } = body;
                  const fullPath = path.join(SECTIONS_PATH, articlePath);
                  const section = articlePath.split("/")[0];
                  await fs2.promises.unlink(fullPath);
                  clearSidebarCache(section);
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, message: "Article deleted" }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: "Failed to delete article" }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/articles/move", async (req, res, next) => {
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
                  await fs2.promises.mkdir(path.dirname(destPath), { recursive: true });
                  await fs2.promises.rename(sourcePath, destPath);
                  clearSidebarCache(fromSection);
                  if (fromSection !== toSection) {
                    clearSidebarCache(toSection);
                  }
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: { newPath: to } }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: "Failed to move article" }));
                }
              });
            } else next();
          });
          server.middlewares.use("/api/logs/add", (req, res, next) => {
            if (req.method === "POST") {
              const chunks = [];
              req.on("data", (chunk) => chunks.push(chunk));
              req.on("end", async () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
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
                      ...body.metadata
                    }
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
          server.middlewares.use("/api/logs/recent", async (req, res, next) => {
            if (req.method === "GET") {
              const url = new URL(req.url || "", `http://${req.headers.host}`);
              const count = parseInt(url.searchParams.get("count") || "100");
              const level = url.searchParams.get("level");
              const logs = await logSystem.getRecent(count, level);
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: logs }));
            } else next();
          });
          server.middlewares.use("/api/logs/stats", async (req, res, next) => {
            if (req.method === "GET") {
              const stats = await logSystem.getStats();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: stats }));
            } else next();
          });
          server.middlewares.use("/api/health", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                success: true,
                data: {
                  llm: true,
                  memory: true,
                  files: true,
                  git: false
                }
              }));
            } else next();
          });
          server.middlewares.use("/api/system/resources", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({
                success: true,
                data: {
                  memory: Math.floor(35 + Math.random() * 30),
                  cpu: Math.floor(20 + Math.random() * 40),
                  latency: Math.floor(30 + Math.random() * 50)
                }
              }));
            } else next();
          });
          server.middlewares.use("/api/agent/tasks", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: [] }));
            } else next();
          });
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLnZpdGVwcmVzcy9jb25maWcudHMiLCAiLnZpdGVwcmVzcy91dGlscy9nbG9iYWwtc2lkZWJhci50cyIsICIudml0ZXByZXNzL3V0aWxzL2RvYy1zdHJ1Y3R1cmUudHMiLCAiLnZpdGVwcmVzcy9hZ2VudC9ydW50aW1lL0xvZ1N5c3RlbS50cyIsICIudml0ZXByZXNzL2FnZW50L3J1bnRpbWUvYm9vdC1sb2dnZXIudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxBTEwgSU4gQUlcXFxcTWV0YUJsb2dcXFxcLnZpdGVwcmVzc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcQUxMIElOIEFJXFxcXE1ldGFCbG9nXFxcXC52aXRlcHJlc3NcXFxcY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9BTEwlMjBJTiUyMEFJL01ldGFCbG9nLy52aXRlcHJlc3MvY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXByZXNzJ1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCdcclxuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcclxuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xyXG5pbXBvcnQgeyBleGVjU3luYyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnXHJcbmltcG9ydCBNYXJrZG93bkl0IGZyb20gJ21hcmtkb3duLWl0J1xyXG5pbXBvcnQgbWF0aGpheDMgZnJvbSAnbWFya2Rvd24taXQtbWF0aGpheDMnXHJcbmltcG9ydCB7IGdlbmVyYXRlU2VjdGlvblNpZGViYXIsIGNsZWFyU2lkZWJhckNhY2hlIH0gZnJvbSAnLi91dGlscy9nbG9iYWwtc2lkZWJhcidcclxuaW1wb3J0IHsgc2NhbkRvY1N0cnVjdHVyZSwgdG9TaWRlYmFyRm9ybWF0LCB0b0RpcmVjdG9yeVRyZWUsIERvY05vZGUgfSBmcm9tICcuL3V0aWxzL2RvYy1zdHJ1Y3R1cmUnXHJcbmltcG9ydCB7IGxvZ1N5c3RlbSB9IGZyb20gJy4vYWdlbnQvcnVudGltZS9Mb2dTeXN0ZW0nXHJcbmltcG9ydCB7IGJvb3RMb2dnZXIgfSBmcm9tICcuL2FnZW50L3J1bnRpbWUvYm9vdC1sb2dnZXInXHJcblxyXG4vLyBcdTg5RTNcdTY3ODRcdTY1RTVcdTVGRDdcdTY1QjlcdTZDRDVcclxuY29uc3QgeyBodW1hbiwgYWksIHN5c3RlbSwgcmVjb3JkU3lzdGVtU3RhcnR1cCB9ID0gbG9nU3lzdGVtXHJcblxyXG4vLyBcdThCQjBcdTVGNTVcdTkxNERcdTdGNkVcdTUyQTBcdThGN0RcclxuYm9vdExvZ2dlci5sb2dDb25maWdMb2FkKCdjb25maWcudHMnKVxyXG5cclxuLy8gSGVscGVyIHRvIGNhbGN1bGF0ZSB3b3JkIGNvdW50XHJcbmNvbnN0IGdldFdvcmRDb3VudCA9IChjb250ZW50OiBzdHJpbmcpID0+IHtcclxuICByZXR1cm4gY29udGVudC5zcGxpdCgvXFxzKy9nKS5sZW5ndGhcclxufVxyXG5cclxuLyoqXHJcbiAqIEZvcm1hdCBhIG5hbWUgZm9yIGJyZWFkY3J1bWIgZGlzcGxheVxyXG4gKi9cclxuZnVuY3Rpb24gZm9ybWF0QnJlYWRjcnVtYk5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBsZXQgZm9ybWF0dGVkID0gbmFtZS5yZXBsYWNlKC9bXy1dL2csICcgJylcclxuICBmb3JtYXR0ZWQgPSBmb3JtYXR0ZWQucmVwbGFjZSgvXihcXGQrKVxccyovLCAnJDEgJylcclxuICByZXR1cm4gZm9ybWF0dGVkLnNwbGl0KCcgJykubWFwKHdvcmQgPT4ge1xyXG4gICAgaWYgKCF3b3JkKSByZXR1cm4gJydcclxuICAgIGlmICgvXlxcZCskLy50ZXN0KHdvcmQpKSByZXR1cm4gd29yZFxyXG4gICAgcmV0dXJuIHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpXHJcbiAgfSkuam9pbignICcpLnRyaW0oKVxyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgYWxsIHJld3JpdGVzIGZvciB0aGUgc3RyaWN0IG5lc3QgYXJjaGl0ZWN0dXJlXHJcbiAqIFRoaXMgaGFuZGxlcyB0aGUgXCJwYWlyIHJ1bGVcIjogZm9sZGVyLW5hbWUvZm9sZGVyLW5hbWUubWQgLT4gZm9sZGVyLW5hbWUvaW5kZXgubWRcclxuICovXHJcbmZ1bmN0aW9uIGdlbmVyYXRlUmV3cml0ZXMoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XHJcbiAgY29uc3QgcmV3cml0ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fVxyXG4gIGNvbnN0IHNlY3Rpb25zUGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnZG9jcy9zZWN0aW9ucycpXHJcbiAgXHJcbiAgaWYgKCFmcy5leGlzdHNTeW5jKHNlY3Rpb25zUGF0aCkpIHJldHVybiByZXdyaXRlc1xyXG4gIFxyXG4gIC8vIFNjYW4gYWxsIHNlY3Rpb25zXHJcbiAgY29uc3Qgc2VjdGlvbnMgPSBmcy5yZWFkZGlyU3luYyhzZWN0aW9uc1BhdGgsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KVxyXG4gICAgLmZpbHRlcihkID0+IGQuaXNEaXJlY3RvcnkoKSlcclxuICBcclxuICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygc2VjdGlvbnMpIHtcclxuICAgIGNvbnN0IHNlY3Rpb25QYXRoID0gcGF0aC5qb2luKHNlY3Rpb25zUGF0aCwgc2VjdGlvbi5uYW1lKVxyXG4gICAgc2NhbkZvclJld3JpdGVzKHNlY3Rpb25QYXRoLCBgc2VjdGlvbnMvJHtzZWN0aW9uLm5hbWV9YCwgcmV3cml0ZXMpXHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiByZXdyaXRlc1xyXG59XHJcblxyXG4vKipcclxuICogUmVjdXJzaXZlbHkgc2NhbiBkaXJlY3RvcnkgZm9yIHJld3JpdGVzXHJcbiAqL1xyXG5mdW5jdGlvbiBzY2FuRm9yUmV3cml0ZXMoZGlyUGF0aDogc3RyaW5nLCByZWxhdGl2ZVBhdGg6IHN0cmluZywgcmV3cml0ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiB2b2lkIHtcclxuICBjb25zdCBlbnRyaWVzID0gZnMucmVhZGRpclN5bmMoZGlyUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pXHJcbiAgY29uc3QgZGlyTmFtZSA9IHBhdGguYmFzZW5hbWUoZGlyUGF0aClcclxuICBcclxuICAvLyBDaGVjayBmb3Igc2FtZS1uYW1lLm1kIChwYWlyIHJ1bGUpXHJcbiAgY29uc3Qgc2FtZU5hbWVNZCA9IHBhdGguam9pbihkaXJQYXRoLCBgJHtkaXJOYW1lfS5tZGApXHJcbiAgY29uc3QgaW5kZXhNZCA9IHBhdGguam9pbihkaXJQYXRoLCAnaW5kZXgubWQnKVxyXG4gIFxyXG4gIGlmIChmcy5leGlzdHNTeW5jKHNhbWVOYW1lTWQpKSB7XHJcbiAgICAvLyBSZXdyaXRlOiBmb2xkZXItbmFtZS9mb2xkZXItbmFtZS5tZCAtPiBmb2xkZXItbmFtZS9pbmRleC5tZFxyXG4gICAgLy8gVGhpcyBtYWtlcyAvZm9sZGVyLW5hbWUvIHdvcmsgY29ycmVjdGx5XHJcbiAgICBjb25zdCBzb3VyY2UgPSBgJHtyZWxhdGl2ZVBhdGh9LyR7ZGlyTmFtZX0ubWRgXHJcbiAgICBjb25zdCB0YXJnZXQgPSBgJHtyZWxhdGl2ZVBhdGh9L2luZGV4Lm1kYFxyXG4gICAgcmV3cml0ZXNbc291cmNlXSA9IHRhcmdldFxyXG4gIH1cclxuICBcclxuICAvLyBSZWN1cnNlIGludG8gc3ViZGlyZWN0b3JpZXNcclxuICBmb3IgKGNvbnN0IGVudHJ5IG9mIGVudHJpZXMpIHtcclxuICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpICYmICFlbnRyeS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSkge1xyXG4gICAgICBzY2FuRm9yUmV3cml0ZXMoXHJcbiAgICAgICAgcGF0aC5qb2luKGRpclBhdGgsIGVudHJ5Lm5hbWUpLFxyXG4gICAgICAgIGAke3JlbGF0aXZlUGF0aH0vJHtlbnRyeS5uYW1lfWAsXHJcbiAgICAgICAgcmV3cml0ZXNcclxuICAgICAgKVxyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICAvLyBTb3VyY2UgZGlyZWN0b3J5IGZvciBjb250ZW50IGZpbGVzXHJcbiAgc3JjRGlyOiAnLi9kb2NzJyxcclxuICBcclxuICBsYW5nOiAnemgtQ04nLFxyXG4gIHRpdGxlOiBcIk1ldGFVbml2ZXJzZSBCbG9nXCIsXHJcbiAgZGVzY3JpcHRpb246IFwiXHU2NTcwXHU1QjU3XHU1QjZBXHU3NTFGXHU3RUE3XHU3N0U1XHU4QkM2XHU3QkExXHU3NDA2XHU3Q0ZCXHU3RURGXCIsXHJcbiAgYmFzZTogJy8nLFxyXG4gIGNsZWFuVXJsczogdHJ1ZSxcclxuXHJcbiAgLy8gR2VuZXJhdGUgcmV3cml0ZXMgZHluYW1pY2FsbHlcclxuICByZXdyaXRlczogZ2VuZXJhdGVSZXdyaXRlcygpLFxyXG4gIFxyXG4gIHRoZW1lQ29uZmlnOiB7XHJcbiAgICBuYXY6IFtcclxuICAgICAgeyB0ZXh0OiAnXHU5OTk2XHU5ODc1JywgbGluazogJy8nIH0sXHJcbiAgICAgIHsgdGV4dDogJ1x1NjU4N1x1N0FFMFx1NTIxN1x1ODg2OCcsIGxpbms6ICcvc2VjdGlvbnMvcG9zdHMvJywgYWN0aXZlTWF0Y2g6ICcvc2VjdGlvbnMvcG9zdHMvJyB9LFxyXG4gICAgICB7IHRleHQ6ICdcdTc3RTVcdThCQzZcdTVFOTMnLCBsaW5rOiAnL3NlY3Rpb25zL2tub3dsZWRnZS8nLCBhY3RpdmVNYXRjaDogJy9zZWN0aW9ucy9rbm93bGVkZ2UvJyB9LFxyXG4gICAgICB7IHRleHQ6ICdcdTUxNkNcdTVGMDBcdThENDRcdTZFOTAnLCBsaW5rOiAnL3NlY3Rpb25zL3Jlc291cmNlcy8nLCBhY3RpdmVNYXRjaDogJy9zZWN0aW9ucy9yZXNvdXJjZXMvJyB9LFxyXG4gICAgICB7IHRleHQ6ICdcdTUxNzNcdTRFOEVcdTYyMTEnLCBsaW5rOiAnL3NlY3Rpb25zL2Fib3V0LycsIGFjdGl2ZU1hdGNoOiAnL3NlY3Rpb25zL2Fib3V0LycgfVxyXG4gICAgXSxcclxuICAgIHNpZGViYXI6IHtcclxuICAgICAgJy9zZWN0aW9ucy9rbm93bGVkZ2UvJzogdG9TaWRlYmFyRm9ybWF0KHNjYW5Eb2NTdHJ1Y3R1cmUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdkb2NzL3NlY3Rpb25zL2tub3dsZWRnZScpKSksXHJcbiAgICAgICcvc2VjdGlvbnMvcG9zdHMvJzogdG9TaWRlYmFyRm9ybWF0KHNjYW5Eb2NTdHJ1Y3R1cmUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdkb2NzL3NlY3Rpb25zL3Bvc3RzJykpKSxcclxuICAgICAgJy9zZWN0aW9ucy9yZXNvdXJjZXMvJzogdG9TaWRlYmFyRm9ybWF0KHNjYW5Eb2NTdHJ1Y3R1cmUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdkb2NzL3NlY3Rpb25zL3Jlc291cmNlcycpKSksXHJcbiAgICAgICcvc2VjdGlvbnMvYWJvdXQvJzogdG9TaWRlYmFyRm9ybWF0KHNjYW5Eb2NTdHJ1Y3R1cmUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdkb2NzL3NlY3Rpb25zL2Fib3V0JykpKVxyXG4gICAgfSxcclxuICAgIHNvY2lhbExpbmtzOiBbXHJcbiAgICAgIHsgaWNvbjogJ2dpdGh1YicsIGxpbms6ICdodHRwczovL2dpdGh1Yi5jb20vdnVlanMvdml0ZXByZXNzJyB9XHJcbiAgICBdLFxyXG4gICAgZG9jRm9vdGVyOiB7IHByZXY6IGZhbHNlLCBuZXh0OiBmYWxzZSB9LFxyXG4gICAgb3V0bGluZTogeyBcclxuICAgICAgbGFiZWw6ICdcdTk4NzVcdTk3NjJcdTVCRkNcdTgyMkEnLFxyXG4gICAgICBsZXZlbDogWzIsIDRdIC8vIFNob3cgaGVhZGVycyBmcm9tIGgyIHRvIGg0XHJcbiAgICB9LFxyXG4gICAgbGFzdFVwZGF0ZWQ6IHsgdGV4dDogJ1x1NjcwMFx1NTQwRVx1NjZGNFx1NjVCMFx1NEU4RScgfSxcclxuICAgIHJldHVyblRvVG9wTGFiZWw6ICdcdTU2REVcdTUyMzBcdTk4NzZcdTkwRTgnLFxyXG4gICAgc2lkZWJhck1lbnVMYWJlbDogJ1x1ODNEQ1x1NTM1NScsXHJcbiAgICBkYXJrTW9kZVN3aXRjaExhYmVsOiAnXHU0RTNCXHU5ODk4JyxcclxuICAgIGxpZ2h0TW9kZVN3aXRjaFRpdGxlOiAnXHU1MjA3XHU2MzYyXHU1MjMwXHU2RDQ1XHU4MjcyXHU2QTIxXHU1RjBGJyxcclxuICAgIGRhcmtNb2RlU3dpdGNoVGl0bGU6ICdcdTUyMDdcdTYzNjJcdTUyMzBcdTZERjFcdTgyNzJcdTZBMjFcdTVGMEYnXHJcbiAgfSxcclxuXHJcbiAgbWFya2Rvd246IHtcclxuICAgIGNvbmZpZzogKG1kOiBNYXJrZG93bkl0KSA9PiB7XHJcbiAgICAgIG1kLnVzZShtYXRoamF4MylcclxuXHJcbiAgICAgIGNvbnN0IGRlZmF1bHRSZW5kZXIgPSBtZC5yZW5kZXJlci5ydWxlcy50ZXh0IHx8IGZ1bmN0aW9uKHRva2VucywgaWR4LCBvcHRpb25zLCBlbnYsIHNlbGYpIHtcclxuICAgICAgICByZXR1cm4gc2VsZi5yZW5kZXJUb2tlbih0b2tlbnMsIGlkeCwgb3B0aW9ucyk7XHJcbiAgICAgIH07XHJcbiAgICAgIFxyXG4gICAgICBtZC5yZW5kZXJlci5ydWxlcy50ZXh0ID0gZnVuY3Rpb24odG9rZW5zLCBpZHgsIG9wdGlvbnMsIGVudiwgc2VsZikge1xyXG4gICAgICAgIGxldCBjb250ZW50ID0gdG9rZW5zW2lkeF0uY29udGVudDtcclxuICAgICAgICBjb25zdCB3aWtpTGlua1JlZ2V4ID0gL1xcW1xcWyguKj8pXFxdXFxdL2c7XHJcbiAgICAgICAgaWYgKHdpa2lMaW5rUmVnZXgudGVzdChjb250ZW50KSkge1xyXG4gICAgICAgICAgICByZXR1cm4gY29udGVudC5yZXBsYWNlKHdpa2lMaW5rUmVnZXgsIChtYXRjaCwgcDEpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IFtsaW5rLCB0ZXh0XSA9IHAxLnNwbGl0KCd8Jyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkaXNwbGF5VGV4dCA9IHRleHQgfHwgbGluaztcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IGAvc2VjdGlvbnMvcG9zdHMvJHtsaW5rLnRyaW0oKS5yZXBsYWNlKC9cXHMrL2csICctJykudG9Mb3dlckNhc2UoKX0vYDtcclxuICAgICAgICAgICAgICAgIHJldHVybiBgPGEgaHJlZj1cIiR7dXJsfVwiPiR7ZGlzcGxheVRleHR9PC9hPmA7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZGVmYXVsdFJlbmRlcih0b2tlbnMsIGlkeCwgb3B0aW9ucywgZW52LCBzZWxmKTtcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9LFxyXG4gIHZ1ZToge1xyXG4gICAgdGVtcGxhdGU6IHtcclxuICAgICAgY29tcGlsZXJPcHRpb25zOiB7XHJcbiAgICAgICAgaXNDdXN0b21FbGVtZW50OiAodGFnOiBzdHJpbmcpID0+IHRhZy5zdGFydHNXaXRoKCdtangtJylcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgdml0ZToge1xyXG4gICAgZW52UHJlZml4OiBbJ1ZJVEVfJywgJ0xMTV8nXSxcclxuICAgIHJlc29sdmU6IHtcclxuICAgICAgYWxpYXM6IFtcclxuICAgICAgICB7IGZpbmQ6ICdAJywgcmVwbGFjZW1lbnQ6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi90aGVtZScsIGltcG9ydC5tZXRhLnVybCkpIH1cclxuICAgICAgXVxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAge1xyXG4gICAgICAgIG5hbWU6ICdtZXRhLWJsb2ctcm91dGluZycsXHJcbiAgICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCAnJ1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gU2tpcCBhc3NldCByZXF1ZXN0c1xyXG4gICAgICAgICAgICBpZiAodXJsLmluY2x1ZGVzKCdfYXNzZXRzJykgfHwgdXJsLmluY2x1ZGVzKCdAZnMnKSB8fCB1cmwuaW5jbHVkZXMoJz8nKSB8fCB1cmwuaW5jbHVkZXMoJy4nKSkge1xyXG4gICAgICAgICAgICAgIG5leHQoKVxyXG4gICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBSZWRpcmVjdCBwYXRocyB3aXRob3V0IHRyYWlsaW5nIHNsYXNoIHRvIGhhdmUgdHJhaWxpbmcgc2xhc2hcclxuICAgICAgICAgICAgLy8gVGhpcyBpcyBjcnVjaWFsIGZvciB0aGUgcGFpciBydWxlIHRvIHdvcmsgY29ycmVjdGx5XHJcbiAgICAgICAgICAgIGlmICh1cmwuc3RhcnRzV2l0aCgnL3NlY3Rpb25zLycpICYmICF1cmwuZW5kc1dpdGgoJy8nKSkge1xyXG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gMzAxXHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignTG9jYXRpb24nLCB1cmwgKyAnLycpXHJcbiAgICAgICAgICAgICAgcmVzLmVuZCgpXHJcbiAgICAgICAgICAgICAgcmV0dXJuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBuYW1lOiAnbWV0YS1ibG9nLWJmZicsXHJcbiAgICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICAgICAgLy8gXHU4QkIwXHU1RjU1XHU3Q0ZCXHU3RURGXHU1NDJGXHU1MkE4XHJcbiAgICAgICAgICByZWNvcmRTeXN0ZW1TdGFydHVwKClcclxuICAgICAgICAgIGJvb3RMb2dnZXIubG9nU2VydmVyU3RhcnQoNTE5MywgJ2xvY2FsaG9zdCcpXHJcbiAgICAgICAgICBzeXN0ZW0uaW5mbygnc2VydmVyLmluaXQnLCAnQkZGIEFQSSBTZXJ2ZXIgXHU1MjFEXHU1OUNCXHU1MzE2XHU1QjhDXHU2MjEwJylcclxuICAgICAgICAgIGJvb3RMb2dnZXIubG9nUmVhZHkoKVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBBUElcdThCRjdcdTZDNDJcdTY1RTVcdTVGRDdcdTRFMkRcdTk1RjRcdTRFRjZcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KClcclxuICAgICAgICAgICAgY29uc3QgdXJsID0gcmVxLnVybCB8fCAnJ1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHU4QkIwXHU1RjU1XHU4QkY3XHU2QzQyXHU1RjAwXHU1OUNCXHJcbiAgICAgICAgICAgIHN5c3RlbS5kZWJ1ZygnYXBpLnJlcXVlc3QnLCBgJHtyZXEubWV0aG9kfSAke3VybH1gLCB7XHJcbiAgICAgICAgICAgICAgbWV0YWRhdGE6IHsgbWV0aG9kOiByZXEubWV0aG9kLCB1cmwsIGhlYWRlcnM6IHJlcS5oZWFkZXJzIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1NzZEMVx1NTQyQ1x1NTRDRFx1NUU5NFx1NUI4Q1x1NjIxMFxyXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbEVuZCA9IHJlcy5lbmQuYmluZChyZXMpXHJcbiAgICAgICAgICAgIHJlcy5lbmQgPSBmdW5jdGlvbiguLi5hcmdzOiBhbnlbXSkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IHJlcy5zdGF0dXNDb2RlIHx8IDIwMFxyXG4gICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgIGlmIChzdGF0dXMgPj0gNDAwKSB7XHJcbiAgICAgICAgICAgICAgICBzeXN0ZW0uZXJyb3IoJ2FwaS5yZXNwb25zZScsIGAke3JlcS5tZXRob2R9ICR7dXJsfSAtICR7c3RhdHVzfSAoJHtkdXJhdGlvbn1tcylgLCB7XHJcbiAgICAgICAgICAgICAgICAgIG1ldGFkYXRhOiB7IG1ldGhvZDogcmVxLm1ldGhvZCwgdXJsLCBzdGF0dXMsIGR1cmF0aW9uIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN5c3RlbS5zdWNjZXNzKCdhcGkucmVzcG9uc2UnLCBgJHtyZXEubWV0aG9kfSAke3VybH0gLSAke3N0YXR1c30gKCR7ZHVyYXRpb259bXMpYCwge1xyXG4gICAgICAgICAgICAgICAgICBtZXRhZGF0YTogeyBtZXRob2Q6IHJlcS5tZXRob2QsIHVybCwgc3RhdHVzLCBkdXJhdGlvbiB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICByZXR1cm4gb3JpZ2luYWxFbmQoLi4uYXJncylcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2ZpbGVzL3JlYWQnLCAocmVxOiBhbnksIHJlczogYW55LCBuZXh0OiBhbnkpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsIHx8ICcnLCBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gKVxyXG4gICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ3BhdGgnKVxyXG4gICAgICAgICAgICAgIGlmICghZmlsZVBhdGgpIHJldHVybiBuZXh0KClcclxuXHJcbiAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3MnLCBmaWxlUGF0aC5yZXBsYWNlKC9eXFwvLywgJycpKVxyXG4gICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZ1bGxQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ3RleHQvcGxhaW4nKVxyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChmcy5yZWFkRmlsZVN5bmMoZnVsbFBhdGgsICd1dGYtOCcpKVxyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNFxyXG4gICAgICAgICAgICAgICAgcmVzLmVuZCgnRmlsZSBub3QgZm91bmQnKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2ZpbGVzL3NhdmUnLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXVxyXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4gY2h1bmtzLnB1c2goY2h1bmspKVxyXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogZmlsZVBhdGgsIGNvbnRlbnQgfSA9IGJvZHlcclxuICAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdkb2NzJywgZmlsZVBhdGgucmVwbGFjZSgvXlxcLy8sICcnKSlcclxuICAgICAgICAgICAgICAgICAgIGZzLndyaXRlRmlsZVN5bmMoZnVsbFBhdGgsIGNvbnRlbnQpXHJcbiAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZXhlY1N5bmMoYGdpdCBhZGQgXCIke2Z1bGxQYXRofVwiYClcclxuICAgICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgY29tbWl0IC1tIFwiY29udGVudDogXHU2NkY0XHU2NUIwICR7cGF0aC5iYXNlbmFtZShmdWxsUGF0aCl9XCJgKVxyXG4gICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoJ1NhdmVkJylcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIC8vIFJlbmFtZSBmaWxlIC0gXHU3NzFGXHU2QjYzXHU3Njg0XHU2NTg3XHU0RUY2XHU5MUNEXHU1NDdEXHU1NDBEXHVGRjA4XHU0RkVFXHU2NTM5XHU2NTg3XHU0RUY2XHU1NDBEXHU2NzJDXHU4RUFCXHVGRjA5XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2ZpbGVzL3JlbmFtZScsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdXHJcbiAgICAgICAgICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiBjaHVua3MucHVzaChjaHVuaykpXHJcbiAgICAgICAgICAgICAgICByZXEub24oJ2VuZCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogZmlsZVBhdGgsIG5ld05hbWUsIHVwZGF0ZUZyb250bWF0dGVyID0gdHJ1ZSB9ID0gYm9keVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXIgPSBwYXRoLmRpcm5hbWUoZmlsZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBleHQgPSBwYXRoLmV4dG5hbWUoZmlsZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdGaWxlTmFtZSA9IG5ld05hbWUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXlxcd1xccy1dL2csICcnKS5yZXBsYWNlKC9cXHMrL2csICdfJykgKyBleHRcclxuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1BhdGggPSBwYXRoLmpvaW4oZGlyLCBuZXdGaWxlTmFtZSlcclxuICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbE9sZFBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3MnLCBmaWxlUGF0aC5yZXBsYWNlKC9eXFwvLywgJycpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbE5ld1BhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3MnLCBuZXdQYXRoLnJlcGxhY2UoL15cXC8vLCAnJykpXHJcbiAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIGZpbGUgZXhpc3RzXHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZnVsbE9sZFBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwNFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZpbGUgbm90IGZvdW5kJyB9KSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0YXJnZXQgYWxyZWFkeSBleGlzdHNcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZ1bGxOZXdQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDlcclxuICAgICAgICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdUYXJnZXQgZmlsZSBhbHJlYWR5IGV4aXN0cycgfSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgbGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZnVsbE9sZFBhdGgsICd1dGYtOCcpXHJcbiAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBmcm9udG1hdHRlciB0aXRsZSBpZiByZXF1ZXN0ZWRcclxuICAgICAgICAgICAgICAgICAgICAgIGlmICh1cGRhdGVGcm9udG1hdHRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNvbnRlbnQuc3RhcnRzV2l0aCgnLS0tJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb250ZW50Lm1hdGNoKC90aXRsZTpcXHMqLisvKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvdGl0bGU6XFxzKi4rLywgYHRpdGxlOiAke25ld05hbWV9YClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC8tLS1cXG4vLCBgLS0tXFxudGl0bGU6ICR7bmV3TmFtZX1cXG5gKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgLS0tXFxudGl0bGU6ICR7bmV3TmFtZX1cXG4tLS1cXG5cXG4ke2NvbnRlbnR9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBXcml0ZSB0byBuZXcgZmlsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmdWxsTmV3UGF0aCwgY29udGVudClcclxuICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gRGVsZXRlIG9sZCBmaWxlXHJcbiAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKGZ1bGxPbGRQYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBHaXQgb3BlcmF0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgYWRkIFwiJHtmdWxsT2xkUGF0aH1cIiBcIiR7ZnVsbE5ld1BhdGh9XCJgKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXhlY1N5bmMoYGdpdCBjb21taXQgLW0gXCJjb250ZW50OiBcdTkxQ0RcdTU0N0RcdTU0MEQgJHtwYXRoLmJhc2VuYW1lKGZpbGVQYXRoKX0gLT4gJHtuZXdGaWxlTmFtZX1cImApXHJcbiAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7fVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBvbGRQYXRoOiBmaWxlUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1BhdGg6IG5ld1BhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3TmFtZTogbmV3RmlsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXNwbGF5TmFtZTogbmV3TmFtZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogU3RyaW5nKGUpIH0pKVxyXG4gICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgIH0gZWxzZSBuZXh0KClcclxuICAgICAgICAgIH0pXHJcblxyXG4gICAgICAgICAgLy8gTW92ZSBmaWxlXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2ZpbGVzL21vdmUnLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXVxyXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4gY2h1bmtzLnB1c2goY2h1bmspKVxyXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGZyb206IGZyb21QYXRoLCB0bzogdG9QYXRoIH0gPSBib2R5XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsRnJvbVBhdGggPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3MnLCBmcm9tUGF0aC5yZXBsYWNlKC9eXFwvLywgJycpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFRvUGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnZG9jcycsIHRvUGF0aC5yZXBsYWNlKC9eXFwvLywgJycpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgdGFyZ2V0IGRpcmVjdG9yeSBleGlzdHNcclxuICAgICAgICAgICAgICAgICAgICAgIGZzLm1rZGlyU3luYyhwYXRoLmRpcm5hbWUoZnVsbFRvUGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIE1vdmUgZmlsZVxyXG4gICAgICAgICAgICAgICAgICAgICAgZnMucmVuYW1lU3luYyhmdWxsRnJvbVBhdGgsIGZ1bGxUb1BhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIEdpdCBvcGVyYXRpb25zXHJcbiAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXhlY1N5bmMoYGdpdCBtdiBcIiR7ZnVsbEZyb21QYXRofVwiIFwiJHtmdWxsVG9QYXRofVwiYClcclxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgY29tbWl0IC1tIFwiY29udGVudDogXHU3OUZCXHU1MkE4ICR7cGF0aC5iYXNlbmFtZShmcm9tUGF0aCl9IC0+ICR7cGF0aC5iYXNlbmFtZSh0b1BhdGgpfVwiYClcclxuICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGdpdCBtdiBmYWlscywgdHJ5IHJlZ3VsYXIgYWRkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhlY1N5bmMoYGdpdCBhZGQgXCIke2Z1bGxGcm9tUGF0aH1cIiBcIiR7ZnVsbFRvUGF0aH1cImApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjU3luYyhgZ2l0IGNvbW1pdCAtbSBcImNvbnRlbnQ6IFx1NzlGQlx1NTJBOCAke3BhdGguYmFzZW5hbWUoZnJvbVBhdGgpfSAtPiAke3BhdGguYmFzZW5hbWUodG9QYXRoKX1cImApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlMikge31cclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpXHJcbiAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBTdHJpbmcoZSkgfSkpXHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAvLyBEZWxldGUgZmlsZVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9maWxlcy9kZWxldGUnLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXVxyXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4gY2h1bmtzLnB1c2goY2h1bmspKVxyXG4gICAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHBhdGg6IGZpbGVQYXRoIH0gPSBib2R5XHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmdWxsUGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnZG9jcycsIGZpbGVQYXRoLnJlcGxhY2UoL15cXC8vLCAnJykpXHJcbiAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIERlbGV0ZSBmaWxlXHJcbiAgICAgICAgICAgICAgICAgICAgICBmcy51bmxpbmtTeW5jKGZ1bGxQYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBHaXQgb3BlcmF0aW9uc1xyXG4gICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgcm0gXCIke2Z1bGxQYXRofVwiYClcclxuICAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgY29tbWl0IC1tIFwiY29udGVudDogXHU1MjIwXHU5NjY0ICR7cGF0aC5iYXNlbmFtZShmaWxlUGF0aCl9XCJgKVxyXG4gICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpXHJcbiAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBTdHJpbmcoZSkgfSkpXHJcbiAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gQWdlbnQgQVBJIFJvdXRlcyAtIEFJLU5hdGl2ZSBPcGVyYXRpb25zXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG5cclxuICAgICAgICAgIC8vIEFnZW50IFx1NEVGQlx1NTJBMVx1NjNEMFx1NEVBNFx1RkYwOFx1NTMzQVx1NTIwNlx1NEVCQVx1NURFNVx1NjRDRFx1NEY1Q1x1RkYwOVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hZ2VudC90YXNrJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW11cclxuICAgICAgICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiBjaHVua3MucHVzaChjaHVuaykpXHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0YXNrSWQsIGNvbnRlbnQ6IGZpbGVDb250ZW50LCBwYXRoOiBmaWxlUGF0aCwgbWV0YWRhdGEgfSA9IGJvZHlcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdkb2NzJywgZmlsZVBhdGgucmVwbGFjZSgvXlxcLy8sICcnKSlcclxuICAgICAgICAgICAgICAgICAgZnMud3JpdGVGaWxlU3luYyhmdWxsUGF0aCwgZmlsZUNvbnRlbnQpXHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAvLyBBZ2VudCBcdTcyNzlcdTVCOUFcdTc2ODQgR2l0IFx1NjNEMFx1NEVBNFx1NjgzQ1x1NUYwRlxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBjb21taXRNZXNzYWdlID0gYGFnZW50KCR7dGFza0lkfSk6ICR7bWV0YWRhdGE/LmRlc2NyaXB0aW9uIHx8ICdBdXRvIHVwZGF0ZSd9JHttZXRhZGF0YT8uc2tpbGwgPyBgIFske21ldGFkYXRhLnNraWxsfV1gIDogJyd9XHJcbj5cclxuPiBBdXRob3I6IGFnZW50XHJcbj4gTW9kZWw6ICR7bWV0YWRhdGE/Lm1vZGVsIHx8ICd1bmtub3duJ31cclxuPiBTa2lsbDogJHttZXRhZGF0YT8uc2tpbGwgfHwgJ3Vua25vd24nfVxyXG4+IFRva2VuczogJHttZXRhZGF0YT8udG9rZW5zIHx8IDB9XHJcbj4gQ29zdDogJCR7bWV0YWRhdGE/LmNvc3QgfHwgMH1cclxuPiBQYXJlbnQtVGFzazogJHt0YXNrSWR9YFxyXG5cclxuICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBleGVjU3luYyhgZ2l0IGFkZCBcIiR7ZnVsbFBhdGh9XCJgKVxyXG4gICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgY29tbWl0IC1tIFwiJHtjb21taXRNZXNzYWdlfVwiYClcclxuICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0dpdCBjb21taXQgZmFpbGVkOicsIGUpXHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NEZERFx1NUI1OFx1NEVGQlx1NTJBMVx1NzJCNlx1NjAwMVx1NTIzMCAudml0ZXByZXNzL2FnZW50L21lbW9yeS90YXNrcy9cclxuICAgICAgICAgICAgICAgICAgY29uc3QgdGFza0RpciA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLnZpdGVwcmVzcy9hZ2VudC9tZW1vcnkvdGFza3MnKVxyXG4gICAgICAgICAgICAgICAgICBpZiAoIWZzLmV4aXN0c1N5bmModGFza0RpcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBmcy5ta2RpclN5bmModGFza0RpciwgeyByZWN1cnNpdmU6IHRydWUgfSlcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCB0YXNrRmlsZSA9IHBhdGguam9pbih0YXNrRGlyLCBgJHt0YXNrSWR9Lmpzb25gKVxyXG4gICAgICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKHRhc2tGaWxlLCBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICAgICAgaWQ6IHRhc2tJZCxcclxuICAgICAgICAgICAgICAgICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnLFxyXG4gICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIG1ldGFkYXRhLFxyXG4gICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgICAgICAgICAgIH0sIG51bGwsIDIpKVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgdGFza0lkIH0pKVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFN0cmluZyhlKSB9KSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIC8vIEFnZW50IFx1NEUwQVx1NEUwQlx1NjU4N1x1NTIxRFx1NTlDQlx1NTMxNlxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hZ2VudC9jb250ZXh0L2luaXQnLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQT1NUJykge1xyXG4gICAgICAgICAgICAgIGNvbnN0IGNodW5rczogQnVmZmVyW10gPSBbXVxyXG4gICAgICAgICAgICAgIHJlcS5vbignZGF0YScsIGNodW5rID0+IGNodW5rcy5wdXNoKGNodW5rKSlcclxuICAgICAgICAgICAgICByZXEub24oJ2VuZCcsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKEJ1ZmZlci5jb25jYXQoY2h1bmtzKS50b1N0cmluZygpKVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCB7IHBhdGg6IGZpbGVQYXRoIH0gPSBib2R5XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAvLyBcdThCRkJcdTUzRDZcdTY1ODdcdTRFRjZcdTUzODZcdTUzRjJcdTU0OENcdTc2RjhcdTUxNzNcdTVCOUVcdTRGNTNcclxuICAgICAgICAgICAgICAgICAgY29uc3QgY29udGV4dERpciA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLnZpdGVwcmVzcy9hZ2VudC9tZW1vcnknKVxyXG4gICAgICAgICAgICAgICAgICBsZXQgZW50aXRpZXM6IGFueVtdID0gW11cclxuICAgICAgICAgICAgICAgICAgbGV0IGhpc3Rvcnk6IGFueVtdID0gW11cclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NUMxRFx1OEJENVx1OEJGQlx1NTNENlx1NUI5RVx1NEY1M1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBlbnRpdGllc1BhdGggPSBwYXRoLmpvaW4oY29udGV4dERpciwgJ2VudGl0aWVzL2NvbmNlcHRzLmpzb24nKVxyXG4gICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhlbnRpdGllc1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZW50aXRpZXNEYXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZW50aXRpZXNQYXRoLCAndXRmLTgnKSlcclxuICAgICAgICAgICAgICAgICAgICBlbnRpdGllcyA9IE9iamVjdC52YWx1ZXMoZW50aXRpZXNEYXRhKS5maWx0ZXIoKGU6IGFueSkgPT4gXHJcbiAgICAgICAgICAgICAgICAgICAgICBlLnNvdXJjZXM/LmluY2x1ZGVzKGZpbGVQYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgIClcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnRleHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZW50aXRpZXM6IGVudGl0aWVzLnNsaWNlKDAsIDUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgcmVsYXRlZEFydGljbGVzOiBlbnRpdGllcy5sZW5ndGhcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6IFN0cmluZyhlKSB9KSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIC8vIEFnZW50IFx1NEVGQlx1NTJBMVx1NzJCNlx1NjAwMVx1NjdFNVx1OEJFMlxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hZ2VudC90YXNrL3N0YXR1cycsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwgfHwgJycsIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0fWApXHJcbiAgICAgICAgICAgICAgY29uc3QgdGFza0lkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2lkJylcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiAoIXRhc2tJZCkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDBcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgdGFzayBJRCcgfSkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgY29uc3QgdGFza0ZpbGUgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJy52aXRlcHJlc3MvYWdlbnQvbWVtb3J5L3Rhc2tzJywgYCR7dGFza0lkfS5qc29uYClcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyh0YXNrRmlsZSkpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhc2tEYXRhID0gSlNPTi5wYXJzZShmcy5yZWFkRmlsZVN5bmModGFza0ZpbGUsICd1dGYtOCcpKVxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh0YXNrRGF0YSkpXHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0XHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdUYXNrIG5vdCBmb3VuZCcgfSkpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgIC8vIEdpdCBcdTY1RTVcdTVGRDcgQVBJXHVGRjA4XHU1MzNBXHU1MjA2XHU0RUJBXHU1REU1XHU1NDhDIEFnZW50XHVGRjA5XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2dpdC9sb2cnLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvZ091dHB1dCA9IGV4ZWNTeW5jKCdnaXQgbG9nIC0tcHJldHR5PWZvcm1hdDpcXCd7XCJoYXNoXCI6XCIlSFwiLFwibWVzc2FnZVwiOlwiJXNcIixcImRhdGVcIjpcIiVhaVwiLFwiYXV0aG9yXCI6XCIlYW5cIn1cXCcgLTIwJywgXHJcbiAgICAgICAgICAgICAgICAgIHsgZW5jb2Rpbmc6ICd1dGYtOCcsIGN3ZDogcHJvY2Vzcy5jd2QoKSB9XHJcbiAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2dzID0gbG9nT3V0cHV0LnNwbGl0KCdcXG4nKVxyXG4gICAgICAgICAgICAgICAgICAuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkpXHJcbiAgICAgICAgICAgICAgICAgIC5tYXAobGluZSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBKU09OLnBhcnNlKGxpbmUpXHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgLmZpbHRlcihCb29sZWFuKVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KGxvZ3MpKVxyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IGdpdCBsb2cnIH0pKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gRHluYW1pYyBTaWRlYmFyIEFQSSAtIFx1NTJBOFx1NjAwMVx1NEZBN1x1OEZCOVx1NjgwRlxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gXHU1MkE4XHU2MDAxIFNpZGViYXIgQVBJIC0gXHU4RkQ0XHU1NkRFXHU1QjlFXHU2NUY2XHU3Njg0XHU2NTg3XHU0RUY2XHU3RUQzXHU2Nzg0XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL3NpZGViYXInLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxLnVybCB8fCAnJywgYGh0dHA6Ly8ke3JlcS5oZWFkZXJzLmhvc3R9YClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlY3Rpb24gPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnc2VjdGlvbicpIHx8ICdwb3N0cydcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gXHU0RjdGXHU3NTI4XHU2NUIwXHU3Njg0XHU2NTg3XHU2ODYzXHU3RUQzXHU2Nzg0XHU2MjZCXHU2M0NGXHJcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlcyA9IHNjYW5Eb2NTdHJ1Y3R1cmUocGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICdkb2NzL3NlY3Rpb25zJywgc2VjdGlvbikpXHJcbiAgICAgICAgICAgICAgICBjb25zdCBzaWRlYmFyRGF0YSA9IHRvU2lkZWJhckZvcm1hdChub2RlcylcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ2FjaGUtQ29udHJvbCcsICduby1jYWNoZScpXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgZGF0YTogc2lkZWJhckRhdGEsXHJcbiAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKVxyXG4gICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0FQSV0gU2lkZWJhciBlcnJvcjonLCBlKVxyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDBcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gZ2VuZXJhdGUgc2lkZWJhcicgfSkpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBcdTc2RUVcdTVGNTVcdTY4MTEgQVBJIC0gXHU4RkQ0XHU1NkRFXHU1MjREXHU3QUVGXHU5MDA5XHU2MkU5XHU1NjY4XHU5NzAwXHU4OTgxXHU3Njg0XHU2ODNDXHU1RjBGXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2RpcmVjdG9yeS10cmVlJywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJykge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwgfHwgJycsIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0fWApXHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZWN0aW9uID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ3NlY3Rpb24nKSB8fCAncG9zdHMnXHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gc2NhbkRvY1N0cnVjdHVyZShwYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgJ2RvY3Mvc2VjdGlvbnMnLCBzZWN0aW9uKSlcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRyZWVEYXRhID0gdG9EaXJlY3RvcnlUcmVlKG5vZGVzKVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgZGF0YTogdHJlZURhdGFcclxuICAgICAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ1tBUEldIERpcmVjdG9yeSB0cmVlIGVycm9yOicsIGUpXHJcbiAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBnZW5lcmF0ZSBkaXJlY3RvcnkgdHJlZScgfSkpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gQXJ0aWNsZXMgQVBJIC0gXHU2NTg3XHU3QUUwXHU3QkExXHU3NDA2XHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zdCBTRUNUSU9OU19QQVRIID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdkb2NzL3NlY3Rpb25zJylcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gXHU3NTFGXHU2MjEwIFVSTCBcdTUzQ0JcdTU5N0RcdTc2ODQgc2x1Z1xyXG4gICAgICAgICAgZnVuY3Rpb24gZ2VuZXJhdGVTbHVnKHRpdGxlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICBpZiAoIXRpdGxlIHx8ICF0aXRsZS50cmltKCkpIHJldHVybiAndW50aXRsZWQnXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTdCODBcdTUzNTVcdTc2ODRcdTYyRkNcdTk3RjNcdTY2MjBcdTVDMDRcdUZGMDhcdTVFMzhcdTg5QzFcdTZDNDlcdTVCNTdcdUZGMDlcclxuICAgICAgICAgICAgY29uc3QgcGlueWluTWFwOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICAgICAgICdcdTVCNTAnOiAnemknLCAnXHU2NTg3JzogJ3dlbicsICdcdTY4NjMnOiAnZGFuZycsICdcdTZENEInOiAnY2UnLCAnXHU4QkQ1JzogJ3NoaScsXHJcbiAgICAgICAgICAgICAgJ1x1NjcwMCc6ICd6dWknLCAnXHU3RUM4JzogJ3pob25nJywgJ1x1NzI0OCc6ICdiYW4nLCAnXHU2NTg3JzogJ3dlbicsICdcdTdBRTAnOiAnemhhbmcnLFxyXG4gICAgICAgICAgICAgICdcdTRFMkQnOiAnemhvbmcnLCAnXHU4MkYxJzogJ3lpbmcnLCAnXHU2RDRCJzogJ2NlJywgJ1x1OEJENSc6ICdzaGknLCAnXHU1RjU1JzogJ2x1JyxcclxuICAgICAgICAgICAgICAnXHU3NkVFJzogJ211JywgJ1x1N0IxNCc6ICdiaScsICdcdThCQjAnOiAnamknLCAnXHU2NzJDJzogJ2JlbicsICdcdTUyMDYnOiAnZmVuJyxcclxuICAgICAgICAgICAgICAnXHU3QzdCJzogJ2xlaScsICdcdTY4MDcnOiAnYmlhbycsICdcdTdCN0UnOiAncWlhbicsICdcdTY1RjYnOiAnc2hpJywgJ1x1OTVGNCc6ICdqaWFuJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBsZXQgc2x1ZyA9IHRpdGxlXHJcbiAgICAgICAgICAgICAgLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgICAgICAucmVwbGFjZSgvW15cXHdcXHNcXHU0ZTAwLVxcdTlmYTUtXS9nLCAnJykgIC8vIFx1NEZERFx1NzU1OVx1NEUyRFx1NjU4N1xyXG4gICAgICAgICAgICAgIC50cmltKClcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1NUMwNlx1NEUyRFx1NjU4N1x1OEY2Q1x1NjM2Mlx1NEUzQVx1NjJGQ1x1OTdGM1x1RkYwOFx1N0I4MFx1NTM1NVx1NjZGRlx1NjM2Mlx1RkYwOVxyXG4gICAgICAgICAgICBsZXQgcmVzdWx0ID0gJydcclxuICAgICAgICAgICAgZm9yIChjb25zdCBjaGFyIG9mIHNsdWcpIHtcclxuICAgICAgICAgICAgICBpZiAoL1tcXHU0ZTAwLVxcdTlmYTVdLy50ZXN0KGNoYXIpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTRFMkRcdTY1ODdcdTVCNTdcdTdCMjZcdUZGMENcdTVDMURcdThCRDVcdTY2MjBcdTVDMDRcdTRFM0FcdTYyRkNcdTk3RjNcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBwaW55aW5NYXBbY2hhcl0gfHwgY2hhclxyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAoL1xccy8udGVzdChjaGFyKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gXHU3QTdBXHU2ODNDXHU2NkZGXHU2MzYyXHU0RTNBXHU4RkRFXHU1QjU3XHU3QjI2XHJcbiAgICAgICAgICAgICAgICByZXN1bHQgKz0gJy0nXHJcbiAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJlc3VsdCArPSBjaGFyXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTZFMDVcdTc0MDZcdTU5MUFcdTRGNTlcdThGREVcdTVCNTdcdTdCMjZcclxuICAgICAgICAgICAgcmVzdWx0ID0gcmVzdWx0XHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoLy0rL2csICctJykgICAgICAvLyBcdTU5MUFcdTRFMkFcdThGREVcdTVCNTdcdTdCMjZcdTU0MDhcdTVFNzZcdTRFM0FcdTRFMDBcdTRFMkFcclxuICAgICAgICAgICAgICAucmVwbGFjZSgvXi18LSQvZywgJycpICAgIC8vIFx1NzlGQlx1OTY2NFx1OTk5Nlx1NUMzRVx1OEZERVx1NUI1N1x1N0IyNlxyXG4gICAgICAgICAgICAgIC5zdWJzdHJpbmcoMCwgNTApICAgICAgICAgLy8gXHU5NjUwXHU1MjM2XHU5NTdGXHU1RUE2XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4gcmVzdWx0IHx8ICd1bnRpdGxlZCdcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gXHU5MDEyXHU1RjUyXHU2MjZCXHU2M0NGXHU2NTg3XHU3QUUwXHJcbiAgICAgICAgICBhc3luYyBmdW5jdGlvbiBzY2FuQXJ0aWNsZXMoZGlyOiBzdHJpbmcsIGJhc2VQYXRoOiBzdHJpbmcgPSAnJyk6IFByb21pc2U8YW55W10+IHtcclxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZXM6IGFueVtdID0gW11cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCBlbnRyaWVzID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZGRpcihkaXIsIHsgd2l0aEZpbGVUeXBlczogdHJ1ZSB9KVxyXG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oZGlyLCBlbnRyeS5uYW1lKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVsYXRpdmVQYXRoID0gcGF0aC5qb2luKGJhc2VQYXRoLCBlbnRyeS5uYW1lKVxyXG4gICAgICAgICAgICAgICAgaWYgKGVudHJ5LmlzRGlyZWN0b3J5KCkgJiYgIWVudHJ5Lm5hbWUuc3RhcnRzV2l0aCgnLicpKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHN1YkFydGljbGVzID0gYXdhaXQgc2NhbkFydGljbGVzKGZ1bGxQYXRoLCByZWxhdGl2ZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgIGFydGljbGVzLnB1c2goLi4uc3ViQXJ0aWNsZXMpXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRmlsZSgpICYmIGVudHJ5Lm5hbWUuZW5kc1dpdGgoJy5tZCcpICYmIGVudHJ5Lm5hbWUgIT09ICdpbmRleC5tZCcpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGZ1bGxQYXRoLCAndXRmLTgnKVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBtZXRhID0gZXh0cmFjdEFydGljbGVNZXRhKGNvbnRlbnQsIHJlbGF0aXZlUGF0aClcclxuICAgICAgICAgICAgICAgICAgYXJ0aWNsZXMucHVzaChtZXRhKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZSkge31cclxuICAgICAgICAgICAgcmV0dXJuIGFydGljbGVzXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFx1NjNEMFx1NTNENlx1NjU4N1x1N0FFMFx1NTE0M1x1NjU3MFx1NjM2RVxyXG4gICAgICAgICAgZnVuY3Rpb24gZXh0cmFjdEFydGljbGVNZXRhKGNvbnRlbnQ6IHN0cmluZywgcmVsYXRpdmVQYXRoOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgY29uc3QgZnJvbnRtYXR0ZXJNYXRjaCA9IGNvbnRlbnQubWF0Y2goL14tLS1cXG4oW1xcc1xcU10qPylcXG4tLS0vKVxyXG4gICAgICAgICAgICBjb25zdCBtZXRhOiBhbnkgPSB7fVxyXG4gICAgICAgICAgICBpZiAoZnJvbnRtYXR0ZXJNYXRjaCkge1xyXG4gICAgICAgICAgICAgIGZyb250bWF0dGVyTWF0Y2hbMV0uc3BsaXQoJ1xcbicpLmZvckVhY2goKGxpbmU6IHN0cmluZykgPT4ge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgbWF0Y2ggPSBsaW5lLm1hdGNoKC9eKFxcdyspOlxccyooLispJC8pXHJcbiAgICAgICAgICAgICAgICBpZiAobWF0Y2gpIG1ldGFbbWF0Y2hbMV1dID0gbWF0Y2hbMl0ucmVwbGFjZSgvXltcIiddfFtcIiddJC9nLCAnJylcclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbnN0IHRpdGxlTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eI1xccysoLispJC9tKVxyXG4gICAgICAgICAgICBjb25zdCB0aXRsZSA9IG1ldGEudGl0bGUgfHwgdGl0bGVNYXRjaD8uWzFdIHx8IHBhdGguYmFzZW5hbWUocmVsYXRpdmVQYXRoLCAnLm1kJylcclxuICAgICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgICBwYXRoOiByZWxhdGl2ZVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxyXG4gICAgICAgICAgICAgIHRpdGxlLFxyXG4gICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBtZXRhLmRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgICAgIHRhZ3M6IG1ldGEudGFncyA/IG1ldGEudGFncy5zcGxpdCgnLCcpLm1hcCgodDogc3RyaW5nKSA9PiB0LnRyaW0oKSkgOiBbXSxcclxuICAgICAgICAgICAgICBkYXRlOiBtZXRhLmRhdGUsXHJcbiAgICAgICAgICAgICAgdXBkYXRlZEF0OiBtZXRhLnVwZGF0ZWRBdCxcclxuICAgICAgICAgICAgICB3b3JkQ291bnQ6IGNvbnRlbnQucmVwbGFjZSgvXFxzKy9nLCAnJykubGVuZ3RoLFxyXG4gICAgICAgICAgICAgIGlzUHVibGlzaGVkOiAhcmVsYXRpdmVQYXRoLmluY2x1ZGVzKCcvZHJhZnRzLycpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gXHU4Rjg1XHU1MkE5XHU1MUZEXHU2NTcwXHVGRjFBXHU0RUNFIERvY05vZGUgXHU2ODExXHU2MjQxXHU1RTczXHU1MzE2XHU0RTNBXHU2NTg3XHU3QUUwXHU1MjE3XHU4ODY4XHJcbiAgICAgICAgICBmdW5jdGlvbiBmbGF0dGVuQXJ0aWNsZXMobm9kZXM6IERvY05vZGVbXSk6IGFueVtdIHtcclxuICAgICAgICAgICAgY29uc3QgYXJ0aWNsZXM6IGFueVtdID0gW11cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGZvciAoY29uc3Qgbm9kZSBvZiBub2Rlcykge1xyXG4gICAgICAgICAgICAgIGlmIChub2RlLnR5cGUgPT09ICdmaWxlJykge1xyXG4gICAgICAgICAgICAgICAgLy8gXHU1M0Y2XHU1QjUwXHU2NTg3XHU0RUY2XHJcbiAgICAgICAgICAgICAgICBhcnRpY2xlcy5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgcGF0aDogbm9kZS5wYXRoLFxyXG4gICAgICAgICAgICAgICAgICB0aXRsZTogbm9kZS50aXRsZSxcclxuICAgICAgICAgICAgICAgICAgaXNMZWFmOiB0cnVlXHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAobm9kZS50eXBlID09PSAnZm9sZGVyJyAmJiBub2RlLmNoaWxkcmVuKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTkwMTJcdTVGNTJcdTU5MDRcdTc0MDZcdTVCNTBcdTk4NzlcclxuICAgICAgICAgICAgICAgIGFydGljbGVzLnB1c2goLi4uZmxhdHRlbkFydGljbGVzKG5vZGUuY2hpbGRyZW4pKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIGFydGljbGVzXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFx1NjU4N1x1N0FFMFx1NTIxN1x1ODg2OFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcnRpY2xlcy9saXN0JywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJykge1xyXG4gICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTYyNkJcdTYzQ0ZcdTYyNDBcdTY3MDkgc2VjdGlvblxyXG4gICAgICAgICAgICAgICAgY29uc3QgYWxsQXJ0aWNsZXM6IGFueVtdID0gW11cclxuICAgICAgICAgICAgICAgIGNvbnN0IHNlY3Rpb25zID0gWydwb3N0cycsICdrbm93bGVkZ2UnLCAncmVzb3VyY2VzJywgJ2Fib3V0J11cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBzZWN0aW9uIG9mIHNlY3Rpb25zKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHNlY3Rpb25QYXRoID0gcGF0aC5qb2luKFNFQ1RJT05TX1BBVEgsIHNlY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKHNlY3Rpb25QYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5vZGVzID0gc2NhbkRvY1N0cnVjdHVyZShzZWN0aW9uUGF0aClcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhcnRpY2xlcyA9IGZsYXR0ZW5BcnRpY2xlcyhub2RlcykubWFwKGEgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICAgIC4uLmEsXHJcbiAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBgJHtzZWN0aW9ufS8ke2EucGF0aH1gXHJcbiAgICAgICAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgICAgICAgICAgYWxsQXJ0aWNsZXMucHVzaCguLi5hcnRpY2xlcylcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgZGF0YTogYWxsQXJ0aWNsZXNcclxuICAgICAgICAgICAgICAgIH0pKVxyXG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIGxpc3QgYXJ0aWNsZXMnIH0pKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gXHU2NDFDXHU3RDIyXHU2NTg3XHU3QUUwXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2FydGljbGVzL3NlYXJjaCcsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgICAgICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHJlcS51cmwgfHwgJycsIGBodHRwOi8vJHtyZXEuaGVhZGVycy5ob3N0fWApXHJcbiAgICAgICAgICAgICAgY29uc3QgcSA9IHVybC5zZWFyY2hQYXJhbXMuZ2V0KCdxJylcclxuICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgYXJ0aWNsZXMgPSBhd2FpdCBzY2FuQXJ0aWNsZXMoU0VDVElPTlNfUEFUSClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXJ5ID0gKHEgfHwgJycpLnRvTG93ZXJDYXNlKClcclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdHMgPSBhcnRpY2xlcy5maWx0ZXIoYSA9PiBcclxuICAgICAgICAgICAgICAgICAgYS50aXRsZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5KSB8fFxyXG4gICAgICAgICAgICAgICAgICBhLmRlc2NyaXB0aW9uPy50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHF1ZXJ5KVxyXG4gICAgICAgICAgICAgICAgKVxyXG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHJlc3VsdHMgfSkpXHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDBcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gc2VhcmNoIGFydGljbGVzJyB9KSlcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFx1ODNCN1x1NTNENlx1NjU4N1x1N0FFMFx1OEJFNlx1NjBDNVxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcnRpY2xlcy9kZXRhaWwnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsIHx8ICcnLCBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gKVxyXG4gICAgICAgICAgICAgIGNvbnN0IGFydGljbGVQYXRoID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ3BhdGgnKVxyXG4gICAgICAgICAgICAgIGlmICghYXJ0aWNsZVBhdGgpIHtcclxuICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnUGF0aCByZXF1aXJlZCcgfSkpXHJcbiAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZ1bGxQYXRoID0gcGF0aC5qb2luKFNFQ1RJT05TX1BBVEgsIGFydGljbGVQYXRoKVxyXG4gICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmdWxsUGF0aCwgJ3V0Zi04JylcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1ldGEgPSBleHRyYWN0QXJ0aWNsZU1ldGEoY29udGVudCwgYXJ0aWNsZVBhdGgpXHJcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXHJcbiAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgZGF0YTogeyAuLi5tZXRhLCBjb250ZW50IH0gfSkpXHJcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDRcclxuICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdBcnRpY2xlIG5vdCBmb3VuZCcgfSkpXHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBcdTUyMUJcdTVFRkFcdTY1ODdcdTdBRTBcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvYXJ0aWNsZXMvY3JlYXRlJywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW11cclxuICAgICAgICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiBjaHVua3MucHVzaChjaHVuaykpXHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyB0aXRsZSwgY29udGVudCA9ICcnLCBzZWN0aW9uID0gJ3Bvc3RzJywgdGFncyA9IFtdLCBwYXJlbnRQYXRoLCBpc0NoaWxkRG9jIH0gPSBib2R5XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbQVBJXSBDcmVhdGluZyBhcnRpY2xlOicsIHsgdGl0bGUsIHNlY3Rpb24sIGlzQ2hpbGREb2MsIHBhcmVudFBhdGgsIGN3ZDogcHJvY2Vzcy5jd2QoKSwgU0VDVElPTlNfUEFUSCB9KVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgaWYgKCF0aXRsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDAwXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ1RpdGxlIHJlcXVpcmVkJyB9KSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgLy8gXHU3NTFGXHU2MjEwIHNsdWdcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2x1ZyA9IGdlbmVyYXRlU2x1Zyh0aXRsZSlcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGAke3NsdWd9Lm1kYFxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgbGV0IHRhcmdldERpcjogc3RyaW5nXHJcbiAgICAgICAgICAgICAgICAgIGxldCBmaWxlUGF0aDogc3RyaW5nXHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTU5MDRcdTc0MDZcdTVCNTBcdTY1ODdcdTY4NjNcdTUyMUJcdTVFRkFcclxuICAgICAgICAgICAgICAgICAgaWYgKGlzQ2hpbGREb2MgJiYgcGFyZW50UGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1ODlFM1x1Njc5MFx1NzIzNlx1NjU4N1x1Njg2M1x1OERFRlx1NUY4NFxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBjbGVhblBhcmVudFBhdGggPSBwYXJlbnRQYXRoLnJlcGxhY2UoJy5odG1sJywgJycpLnJlcGxhY2UoL15cXC8vLCAnJylcclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTU5ODJcdTY3OUNcdThERUZcdTVGODRcdTRFRTUgc2VjdGlvbnMvIFx1NUYwMFx1NTkzNFx1RkYwQ1x1NTNCQlx1NjM4OVx1NUI4M1x1RkYwOFx1NTZFMFx1NEUzQSBTRUNUSU9OU19QQVRIIFx1NURGMlx1N0VDRlx1NTMwNVx1NTQyQlx1RkYwOVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjbGVhblBhcmVudFBhdGguc3RhcnRzV2l0aCgnc2VjdGlvbnMvJykpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGNsZWFuUGFyZW50UGF0aCA9IGNsZWFuUGFyZW50UGF0aC5zdWJzdHJpbmcoJ3NlY3Rpb25zLycubGVuZ3RoKVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRGdWxsUGF0aCA9IHBhdGguam9pbihTRUNUSU9OU19QQVRILCBjbGVhblBhcmVudFBhdGgpICsgJy5tZCdcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnREaXIgPSBwYXRoLmRpcm5hbWUocGFyZW50RnVsbFBhdGgpXHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50TmFtZSA9IHBhdGguYmFzZW5hbWUocGFyZW50RnVsbFBhdGgsICcubWQnKVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudEZvbGRlclBhdGggPSBwYXRoLmpvaW4ocGFyZW50RGlyLCBwYXJlbnROYW1lKVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbQVBJXSBQYXJlbnQgaW5mbzonLCB7IHBhcmVudEZ1bGxQYXRoLCBwYXJlbnREaXIsIHBhcmVudE5hbWUsIHBhcmVudEZvbGRlclBhdGggfSlcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTY4QzBcdTY3RTVcdTcyMzZcdTY1ODdcdTY4NjNcdTY2MkZcdTU0MjZcdTRFM0FcdTUzRjZcdTVCNTBcdTY1ODdcdTY4NjNcdUZGMDhcdTUzNzNcdTY2MkZcdTU0MjZcdTVCNThcdTU3MjhcdTU0MENcdTU0MERcdTY1ODdcdTRFRjZcdTU5MzlcdUZGMDlcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0xlYWZEb2MgPSAhZnMuZXhpc3RzU3luYyhwYXJlbnRGb2xkZXJQYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0xlYWZEb2MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIFx1NTNGNlx1NUI1MFx1NjU4N1x1Njg2M1x1RkYxQVx1OTcwMFx1ODk4MVx1NTIxQlx1NUVGQVx1NTQwQ1x1NTQwRFx1NjU4N1x1NEVGNlx1NTkzOVx1NUU3Nlx1NzlGQlx1NTJBOFx1NTM5Rlx1NjU4N1x1Njg2M1xyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tBUEldIFBhcmVudCBpcyBsZWFmIGRvY3VtZW50LCBjcmVhdGluZyBmb2xkZXIgYW5kIG1vdmluZy4uLicpXHJcbiAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgIC8vIDEuIFx1NTIxQlx1NUVGQVx1NTQwQ1x1NTQwRFx1NjU4N1x1NEVGNlx1NTkzOVxyXG4gICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIocGFyZW50Rm9sZGVyUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSlcclxuICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gMi4gXHU1QzA2XHU1MzlGXHU2NTg3XHU2ODYzXHU3OUZCXHU1MkE4XHU1MjMwXHU2NTg3XHU0RUY2XHU1OTM5XHU1MTg1XHVGRjA4XHU0RjVDXHU0RTNBIGluZGV4Lm1kIFx1NjIxNlx1NEZERFx1NjMwMVx1NTM5Rlx1NTQwRFx1RkYwOVxyXG4gICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGFyZ2V0UGFyZW50UGF0aCA9IHBhdGguam9pbihwYXJlbnRGb2xkZXJQYXRoLCBgJHtwYXJlbnROYW1lfS5tZGApXHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhwYXJlbnRGdWxsUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMucmVuYW1lKHBhcmVudEZ1bGxQYXRoLCB0YXJnZXRQYXJlbnRQYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0FQSV0gTW92ZWQgcGFyZW50IGRvYyB0bzonLCB0YXJnZXRQYXJlbnRQYXRoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyAzLiBcdTU3MjhcdTY1ODdcdTRFRjZcdTU5MzlcdTUxODVcdTUyMUJcdTVFRkFcdTVCNTBcdTY1ODdcdTY4NjNcclxuICAgICAgICAgICAgICAgICAgICAgIHRhcmdldERpciA9IHBhcmVudEZvbGRlclBhdGhcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gXHU5NzVFXHU1M0Y2XHU1QjUwXHU2NTg3XHU2ODYzXHVGRjFBXHU3NkY0XHU2M0E1XHU1NzI4XHU1REYyXHU2NzA5XHU2NTg3XHU0RUY2XHU1OTM5XHU1MTg1XHU1MjFCXHU1RUZBXHJcbiAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0FQSV0gUGFyZW50IGFscmVhZHkgaGFzIGZvbGRlciwgY3JlYXRpbmcgaW5zaWRlLi4uJylcclxuICAgICAgICAgICAgICAgICAgICAgIHRhcmdldERpciA9IHBhcmVudEZvbGRlclBhdGhcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgZmlsZVBhdGggPSBwYXRoLmpvaW4odGFyZ2V0RGlyLCBmaWxlbmFtZSlcclxuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTY2NkVcdTkwMUFcdTY1ODdcdTY4NjNcdTUyMUJcdTVFRkFcclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXREaXIgPSBwYXRoLmpvaW4oU0VDVElPTlNfUEFUSCwgc2VjdGlvbilcclxuICAgICAgICAgICAgICAgICAgICBmaWxlUGF0aCA9IHBhdGguam9pbih0YXJnZXREaXIsIGZpbGVuYW1lKVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0FQSV0gVGFyZ2V0IHBhdGg6JywgeyB0YXJnZXREaXIsIGZpbGVQYXRoIH0pXHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTc4NkVcdTRGRERcdTc2RUVcdTVGNTVcdTVCNThcdTU3MjhcclxuICAgICAgICAgICAgICAgICAgYXdhaXQgZnMucHJvbWlzZXMubWtkaXIodGFyZ2V0RGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgLy8gXHU1MjFCXHU1RUZBXHU2NTg3XHU3QUUwXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb250bWF0dGVyID0gYC0tLVxyXG50aXRsZTogJHt0aXRsZX1cclxuZGF0ZTogJHtkYXRlfVxyXG50YWdzOlxyXG4ke3RhZ3MubWFwKCh0OiBzdHJpbmcpID0+IGAgIC0gJHt0fWApLmpvaW4oJ1xcbicpfVxyXG4tLS1cclxuXHJcbiR7Y29udGVudH1gXHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy53cml0ZUZpbGUoZmlsZVBhdGgsIGZyb250bWF0dGVyLCAndXRmLTgnKVxyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW0FQSV0gRmlsZSB3cml0dGVuIHN1Y2Nlc3NmdWxseTonLCBmaWxlUGF0aClcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NkUwNVx1OTY2NCBzaWRlYmFyIFx1N0YxM1x1NUI1OFxyXG4gICAgICAgICAgICAgICAgICBjbGVhclNpZGViYXJDYWNoZShzZWN0aW9uKVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgIGRhdGE6IHsgXHJcbiAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBwYXRoLnJlbGF0aXZlKFNFQ1RJT05TX1BBVEgsIGZpbGVQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksIFxyXG4gICAgICAgICAgICAgICAgICAgICAgdGl0bGUsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgZGF0ZSwgXHJcbiAgICAgICAgICAgICAgICAgICAgICBmdWxsUGF0aDogZmlsZVBhdGggXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignW0FQSV0gQ3JlYXRlIGFydGljbGUgZXJyb3I6JywgZSlcclxuICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDBcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IGZhbHNlLCBlcnJvcjogJ0ZhaWxlZCB0byBjcmVhdGUgYXJ0aWNsZTogJyArIChlIGFzIEVycm9yKS5tZXNzYWdlIH0pKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFx1NjZGNFx1NjVCMFx1NjU4N1x1N0FFMFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcnRpY2xlcy91cGRhdGUnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdQVVQnKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdXHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4gY2h1bmtzLnB1c2goY2h1bmspKVxyXG4gICAgICAgICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogYXJ0aWNsZVBhdGgsIGNvbnRlbnQgfSA9IGJvZHlcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oU0VDVElPTlNfUEFUSCwgYXJ0aWNsZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLndyaXRlRmlsZShmdWxsUGF0aCwgY29udGVudCwgJ3V0Zi04JylcclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0FydGljbGUgdXBkYXRlZCcgfSkpXHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gdXBkYXRlIGFydGljbGUnIH0pKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFx1NTNEMVx1NUUwM1x1NjU4N1x1N0FFMFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcnRpY2xlcy9wdWJsaXNoJywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcpIHtcclxuICAgICAgICAgICAgICBjb25zdCBjaHVua3M6IEJ1ZmZlcltdID0gW11cclxuICAgICAgICAgICAgICByZXEub24oJ2RhdGEnLCBjaHVuayA9PiBjaHVua3MucHVzaChjaHVuaykpXHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdlbmQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShCdWZmZXIuY29uY2F0KGNodW5rcykudG9TdHJpbmcoKSlcclxuICAgICAgICAgICAgICAgICAgY29uc3QgeyBwYXRoOiBhcnRpY2xlUGF0aCB9ID0gYm9keVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBzb3VyY2VQYXRoID0gcGF0aC5qb2luKFNFQ1RJT05TX1BBVEgsIGFydGljbGVQYXRoKVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCB0YXJnZXRQYXRoID0gYXJ0aWNsZVBhdGgucmVwbGFjZSgnL2RyYWZ0cy8nLCAnL3Bvc3RzLycpXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGRlc3RQYXRoID0gcGF0aC5qb2luKFNFQ1RJT05TX1BBVEgsIHRhcmdldFBhdGgpXHJcbiAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLm1rZGlyKHBhdGguZGlybmFtZShkZXN0UGF0aCksIHsgcmVjdXJzaXZlOiB0cnVlIH0pXHJcbiAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLnJlbmFtZShzb3VyY2VQYXRoLCBkZXN0UGF0aClcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NkUwNVx1OTY2NFx1NzZGOFx1NTE3MyBzZWN0aW9uIFx1NzY4NFx1N0YxM1x1NUI1OFxyXG4gICAgICAgICAgICAgICAgICBjbGVhclNpZGViYXJDYWNoZSgnZHJhZnRzJylcclxuICAgICAgICAgICAgICAgICAgY2xlYXJTaWRlYmFyQ2FjaGUoJ3Bvc3RzJylcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJylcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUsIGRhdGE6IHsgbmV3UGF0aDogdGFyZ2V0UGF0aCB9IH0pKVxyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMFxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogZmFsc2UsIGVycm9yOiAnRmFpbGVkIHRvIHB1Ymxpc2ggYXJ0aWNsZScgfSkpXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gXHU1MjIwXHU5NjY0XHU2NTg3XHU3QUUwXHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2FydGljbGVzL2RlbGV0ZScsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdXHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4gY2h1bmtzLnB1c2goY2h1bmspKVxyXG4gICAgICAgICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgcGF0aDogYXJ0aWNsZVBhdGggfSA9IGJvZHlcclxuICAgICAgICAgICAgICAgICAgY29uc3QgZnVsbFBhdGggPSBwYXRoLmpvaW4oU0VDVElPTlNfUEFUSCwgYXJ0aWNsZVBhdGgpXHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTgzQjdcdTUzRDYgc2VjdGlvbiBcdTU0MERcdTc5RjBcdTc1MjhcdTRFOEVcdTZFMDVcdTk2NjRcdTdGMTNcdTVCNThcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc2VjdGlvbiA9IGFydGljbGVQYXRoLnNwbGl0KCcvJylbMF1cclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIGF3YWl0IGZzLnByb21pc2VzLnVubGluayhmdWxsUGF0aClcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NkUwNVx1OTY2NCBzaWRlYmFyIFx1N0YxM1x1NUI1OFxyXG4gICAgICAgICAgICAgICAgICBjbGVhclNpZGViYXJDYWNoZShzZWN0aW9uKVxyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgc3VjY2VzczogdHJ1ZSwgbWVzc2FnZTogJ0FydGljbGUgZGVsZXRlZCcgfSkpXHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gZGVsZXRlIGFydGljbGUnIH0pKVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFx1NzlGQlx1NTJBOC9cdTkxQ0RcdTU0N0RcdTU0MERcdTY1ODdcdTdBRTBcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvYXJ0aWNsZXMvbW92ZScsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdXHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4gY2h1bmtzLnB1c2goY2h1bmspKVxyXG4gICAgICAgICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgICAgICAgIGNvbnN0IHsgZnJvbSwgdG8gfSA9IGJvZHlcclxuICAgICAgICAgICAgICAgICAgY29uc3Qgc291cmNlUGF0aCA9IHBhdGguam9pbihTRUNUSU9OU19QQVRILCBmcm9tKVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBkZXN0UGF0aCA9IHBhdGguam9pbihTRUNUSU9OU19QQVRILCB0bylcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1ODNCN1x1NTNENiBzZWN0aW9uIFx1NTQwRFx1NzlGMFx1NzUyOFx1NEU4RVx1NkUwNVx1OTY2NFx1N0YxM1x1NUI1OFxyXG4gICAgICAgICAgICAgICAgICBjb25zdCBmcm9tU2VjdGlvbiA9IGZyb20uc3BsaXQoJy8nKVswXVxyXG4gICAgICAgICAgICAgICAgICBjb25zdCB0b1NlY3Rpb24gPSB0by5zcGxpdCgnLycpWzBdXHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy5ta2RpcihwYXRoLmRpcm5hbWUoZGVzdFBhdGgpLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxyXG4gICAgICAgICAgICAgICAgICBhd2FpdCBmcy5wcm9taXNlcy5yZW5hbWUoc291cmNlUGF0aCwgZGVzdFBhdGgpXHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAvLyBcdTZFMDVcdTk2NjRcdTc2RjhcdTUxNzMgc2VjdGlvbiBcdTc2ODRcdTdGMTNcdTVCNThcclxuICAgICAgICAgICAgICAgICAgY2xlYXJTaWRlYmFyQ2FjaGUoZnJvbVNlY3Rpb24pXHJcbiAgICAgICAgICAgICAgICAgIGlmIChmcm9tU2VjdGlvbiAhPT0gdG9TZWN0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2xlYXJTaWRlYmFyQ2FjaGUodG9TZWN0aW9uKVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiB7IG5ld1BhdGg6IHRvIH0gfSkpXHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6ICdGYWlsZWQgdG8gbW92ZSBhcnRpY2xlJyB9KSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxyXG4gICAgICAgICAgLy8gTG9ncyBBUEkgLSBcdTY1RTVcdTVGRDdcdTdDRkJcdTdFREZcdUZGMDhcdTRGN0ZcdTc1MjhMb2dTeXN0ZW1cdUZGMDlcclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFx1NkRGQlx1NTJBMFx1NjVFNVx1NUZEN1xyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9sb2dzL2FkZCcsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ1BPU1QnKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgY2h1bmtzOiBCdWZmZXJbXSA9IFtdXHJcbiAgICAgICAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4gY2h1bmtzLnB1c2goY2h1bmspKVxyXG4gICAgICAgICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoQnVmZmVyLmNvbmNhdChjaHVua3MpLnRvU3RyaW5nKCkpXHJcbiAgICAgICAgICAgICAgICAgIC8vIFx1NEY3Rlx1NzUyOExvZ1N5c3RlbVx1NjMwMVx1NEU0NVx1NTMxNlx1NjVFNVx1NUZEN1xyXG4gICAgICAgICAgICAgICAgICBhd2FpdCBsb2dTeXN0ZW0uYWRkKFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHkubGV2ZWwgfHwgJ2luZm8nLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHkuZXZlbnQgfHwgJ3N5c3RlbScsXHJcbiAgICAgICAgICAgICAgICAgICAgYm9keS5tZXNzYWdlLFxyXG4gICAgICAgICAgICAgICAgICAgIGJvZHkuYWN0b3IgfHwgJ3N5c3RlbScsXHJcbiAgICAgICAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgICAgICAgc291cmNlOiBib2R5LnNvdXJjZSxcclxuICAgICAgICAgICAgICAgICAgICAgIHRhc2tJZDogYm9keS50YXNrSWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICBza2lsbE5hbWU6IGJvZHkuc2tpbGxOYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgZHVyYXRpb246IGJvZHkuZHVyYXRpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAuLi5ib2R5Lm1ldGFkYXRhXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICApXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJylcclxuICAgICAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IHN1Y2Nlc3M6IHRydWUgfSkpXHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwXHJcbiAgICAgICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiBmYWxzZSwgZXJyb3I6IFN0cmluZyhlKSB9KSlcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBcdTgzQjdcdTUzRDZcdTY1RTVcdTVGRDdcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvbG9ncy9yZWNlbnQnLCBhc3luYyAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXEudXJsIHx8ICcnLCBgaHR0cDovLyR7cmVxLmhlYWRlcnMuaG9zdH1gKVxyXG4gICAgICAgICAgICAgIGNvbnN0IGNvdW50ID0gcGFyc2VJbnQodXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2NvdW50JykgfHwgJzEwMCcpXHJcbiAgICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnbGV2ZWwnKSBhcyBhbnlcclxuICAgICAgICAgICAgICBjb25zdCBsb2dzID0gYXdhaXQgbG9nU3lzdGVtLmdldFJlY2VudChjb3VudCwgbGV2ZWwpXHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBsb2dzIH0pKVxyXG4gICAgICAgICAgICB9IGVsc2UgbmV4dCgpXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBcdTgzQjdcdTUzRDZcdTY1RTVcdTVGRDdcdTdFREZcdThCQTFcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvbG9ncy9zdGF0cycsIGFzeW5jIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IGxvZ1N5c3RlbS5nZXRTdGF0cygpXHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBzdGF0cyB9KSlcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAgICAgICAgIC8vIEhlYWx0aCAmIFN5c3RlbSBBUElcclxuICAgICAgICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKCcvYXBpL2hlYWx0aCcsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAocmVxLm1ldGhvZCA9PT0gJ0dFVCcpIHtcclxuICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpXHJcbiAgICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgICBsbG06IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgIG1lbW9yeTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgZmlsZXM6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgIGdpdDogZmFsc2VcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9KSlcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9zeXN0ZW0vcmVzb3VyY2VzJywgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnR0VUJykge1xyXG4gICAgICAgICAgICAgIC8vIFx1NkEyMVx1NjJERlx1OEQ0NFx1NkU5MFx1NEY3Rlx1NzUyOFx1NjU3MFx1NjM2RVxyXG4gICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJylcclxuICAgICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICAgIG1lbW9yeTogTWF0aC5mbG9vcigzNSArIE1hdGgucmFuZG9tKCkgKiAzMCksXHJcbiAgICAgICAgICAgICAgICAgIGNwdTogTWF0aC5mbG9vcigyMCArIE1hdGgucmFuZG9tKCkgKiA0MCksXHJcbiAgICAgICAgICAgICAgICAgIGxhdGVuY3k6IE1hdGguZmxvb3IoMzAgKyBNYXRoLnJhbmRvbSgpICogNTApXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICAgIH0gZWxzZSBuZXh0KClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoJy9hcGkvYWdlbnQvdGFza3MnLCAocmVxLCByZXMsIG5leHQpID0+IHtcclxuICAgICAgICAgICAgaWYgKHJlcS5tZXRob2QgPT09ICdHRVQnKSB7XHJcbiAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKVxyXG4gICAgICAgICAgICAgIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBzdWNjZXNzOiB0cnVlLCBkYXRhOiBbXSB9KSlcclxuICAgICAgICAgICAgfSBlbHNlIG5leHQoKVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIF0sXHJcbiAgICBkZWZpbmU6IHtcclxuICAgICAgVkRJVE9SX1ZFUlNJT046IEpTT04uc3RyaW5naWZ5KCczLjExLjInKVxyXG4gICAgfVxyXG4gIH0sXHJcbiAgXHJcbiAgYXN5bmMgdHJhbnNmb3JtUGFnZURhdGEocGFnZURhdGE6IGFueSkge1xyXG4gICAgcGFnZURhdGEuZnJvbnRtYXR0ZXIud29yZENvdW50ID0gZ2V0V29yZENvdW50KHBhZ2VEYXRhLmNvbnRlbnQgfHwgJycpXHJcbiAgICBcclxuICAgIC8vIEdlbmVyYXRlIGJyZWFkY3J1bWJzIGZyb20gdGhlIGFjdHVhbCBmaWxlIHBhdGhcclxuICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IHBhZ2VEYXRhLnJlbGF0aXZlUGF0aFxyXG4gICAgY29uc3QgcGFydHMgPSByZWxhdGl2ZVBhdGguc3BsaXQoJy8nKVxyXG4gICAgY29uc3QgYnJlYWRjcnVtYnM6IHsgdGl0bGU6IHN0cmluZywgbGluaz86IHN0cmluZyB9W10gPSBbXVxyXG4gICAgXHJcbiAgICBsZXQgYWNjdW11bGF0ZWRQYXRoID0gJydcclxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFydHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgbGV0IHBhcnQgPSBwYXJ0c1tpXVxyXG4gICAgICBpZiAoIXBhcnQpIGNvbnRpbnVlXHJcbiAgICAgIFxyXG4gICAgICAvLyBSZW1vdmUgLm1kIGV4dGVuc2lvblxyXG4gICAgICBpZiAocGFydC5lbmRzV2l0aCgnLm1kJykpIHtcclxuICAgICAgICBwYXJ0ID0gcGFydC5yZXBsYWNlKCcubWQnLCAnJylcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgLy8gU2tpcCBpbmRleCBmaWxlcyBpbiBicmVhZGNydW1iICh0aGV5IHJlcHJlc2VudCB0aGUgZm9sZGVyIGl0c2VsZilcclxuICAgICAgaWYgKHBhcnQgPT09ICdpbmRleCcpIHtcclxuICAgICAgICBjb250aW51ZVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBhY2N1bXVsYXRlZFBhdGggKz0gJy8nICsgcGFydFxyXG4gICAgICBcclxuICAgICAgLy8gRm9ybWF0IHRoZSBicmVhZGNydW1iIG5hbWVcclxuICAgICAgY29uc3QgdGl0bGUgPSBmb3JtYXRCcmVhZGNydW1iTmFtZShwYXJ0KVxyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyB0aGUgbGFzdCBtZWFuaW5nZnVsIHBhcnRcclxuICAgICAgY29uc3QgcmVtYWluaW5nUGFydHMgPSBwYXJ0cy5zbGljZShpICsgMSkuZmlsdGVyKChwOiBzdHJpbmcpID0+IHAgJiYgcCAhPT0gJ2luZGV4Lm1kJyAmJiAhcC5lbmRzV2l0aCgnLm1kJykpXHJcbiAgICAgIGNvbnN0IGlzTGFzdEl0ZW0gPSByZW1haW5pbmdQYXJ0cy5sZW5ndGggPT09IDBcclxuICAgICAgXHJcbiAgICAgIGJyZWFkY3J1bWJzLnB1c2goe1xyXG4gICAgICAgIHRpdGxlLFxyXG4gICAgICAgIGxpbms6IGlzTGFzdEl0ZW0gPyB1bmRlZmluZWQgOiBhY2N1bXVsYXRlZFBhdGggKyAnLydcclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIFxyXG4gICAgcGFnZURhdGEuZnJvbnRtYXR0ZXIuYnJlYWRjcnVtYiA9IGJyZWFkY3J1bWJzXHJcbiAgICBwYWdlRGF0YS50aXRsZSA9IHBhZ2VEYXRhLmZyb250bWF0dGVyLnRpdGxlIHx8IChicmVhZGNydW1icy5sZW5ndGggPiAwID8gYnJlYWRjcnVtYnNbYnJlYWRjcnVtYnMubGVuZ3RoIC0gMV0udGl0bGUgOiAnJylcclxuICB9XHJcbn0pXHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcQUxMIElOIEFJXFxcXE1ldGFCbG9nXFxcXC52aXRlcHJlc3NcXFxcdXRpbHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEFMTCBJTiBBSVxcXFxNZXRhQmxvZ1xcXFwudml0ZXByZXNzXFxcXHV0aWxzXFxcXGdsb2JhbC1zaWRlYmFyLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9BTEwlMjBJTiUyMEFJL01ldGFCbG9nLy52aXRlcHJlc3MvdXRpbHMvZ2xvYmFsLXNpZGViYXIudHNcIjtpbXBvcnQgeyByZWFkZGlyU3luYywgZXhpc3RzU3luYywgcmVhZEZpbGVTeW5jLCBzdGF0U3luYyB9IGZyb20gJ2ZzJ1xyXG5pbXBvcnQgeyBqb2luLCByZWxhdGl2ZSwgcmVzb2x2ZSwgZGlybmFtZSwgZXh0bmFtZSwgYmFzZW5hbWUgfSBmcm9tICdwYXRoJ1xyXG5cclxuaW50ZXJmYWNlIFNpZGViYXJOb2RlIHtcclxuICB0ZXh0OiBzdHJpbmdcclxuICBsaW5rPzogc3RyaW5nXHJcbiAgaXRlbXM/OiBTaWRlYmFyTm9kZVtdXHJcbiAgY29sbGFwc2VkPzogYm9vbGVhblxyXG4gIGlkPzogc3RyaW5nXHJcbiAgaXNMZWFmPzogYm9vbGVhblxyXG59XHJcblxyXG5jb25zdCBtYW5pZmVzdENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIFJlY29yZDxzdHJpbmcsIGFueT4+KClcclxuY29uc3Qgc2lkZWJhckNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHsgZGF0YTogYW55W10sIHRpbWVzdGFtcDogbnVtYmVyIH0+KClcclxuY29uc3QgQ0FDSEVfVFRMID0gNTAwMCAvLyA1XHU3OUQyXHU3RjEzXHU1QjU4XHVGRjBDXHU1RjAwXHU1M0QxXHU2QTIxXHU1RjBGXHU0RTBCXHU3N0VEXHU3RjEzXHU1QjU4XHU3ODZFXHU0RkREXHU1QjlFXHU2NUY2XHU2MDI3XHJcblxyXG5mdW5jdGlvbiBnZXRNYW5pZmVzdChkaXI6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xyXG4gIGNvbnN0IG1hbmlmZXN0UGF0aCA9IGpvaW4oZGlyLCAnbWFuaWZlc3QuanNvbicpXHJcbiAgXHJcbiAgLy8gXHU1RjAwXHU1M0QxXHU2QTIxXHU1RjBGXHU0RTBCXHU2OEMwXHU2N0U1XHU3RjEzXHU1QjU4XHU2NjJGXHU1NDI2XHU4RkM3XHU2NzFGXHJcbiAgY29uc3QgY2FjaGVkID0gbWFuaWZlc3RDYWNoZS5nZXQobWFuaWZlc3RQYXRoKVxyXG4gIGlmIChjYWNoZWQgJiYgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdkZXZlbG9wbWVudCcpIHtcclxuICAgIHJldHVybiBjYWNoZWRcclxuICB9XHJcbiAgXHJcbiAgaWYgKGV4aXN0c1N5bmMobWFuaWZlc3RQYXRoKSkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29udGVudCA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKG1hbmlmZXN0UGF0aCwgJ3V0Zi04JykpXHJcbiAgICAgIG1hbmlmZXN0Q2FjaGUuc2V0KG1hbmlmZXN0UGF0aCwgY29udGVudClcclxuICAgICAgcmV0dXJuIGNvbnRlbnRcclxuICAgIH0gY2F0Y2gge31cclxuICB9XHJcbiAgcmV0dXJuIHt9XHJcbn1cclxuXHJcbi8vIFx1NkUwNVx1OTY2NCBzaWRlYmFyIFx1N0YxM1x1NUI1OFx1RkYwOFx1NjU4N1x1NEVGNlx1NTNEOFx1NTJBOFx1NjVGNlx1OEMwM1x1NzUyOFx1RkYwOVxyXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJTaWRlYmFyQ2FjaGUoc2VjdGlvbj86IHN0cmluZykge1xyXG4gIGlmIChzZWN0aW9uKSB7XHJcbiAgICBzaWRlYmFyQ2FjaGUuZGVsZXRlKHNlY3Rpb24pXHJcbiAgICBjb25zb2xlLmxvZyhgW1NpZGViYXJdIENhY2hlIGNsZWFyZWQgZm9yIHNlY3Rpb246ICR7c2VjdGlvbn1gKVxyXG4gIH0gZWxzZSB7XHJcbiAgICBzaWRlYmFyQ2FjaGUuY2xlYXIoKVxyXG4gICAgbWFuaWZlc3RDYWNoZS5jbGVhcigpXHJcbiAgICBjb25zb2xlLmxvZygnW1NpZGViYXJdIEFsbCBjYWNoZSBjbGVhcmVkJylcclxuICB9XHJcbn1cclxuXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVNlY3Rpb25TaWRlYmFyKHNlY3Rpb25zUGF0aDogc3RyaW5nLCBzZWN0aW9uTmFtZTogc3RyaW5nLCB1c2VDYWNoZTogYm9vbGVhbiA9IGZhbHNlKTogU2lkZWJhck5vZGVbXSB7XHJcbiAgLy8gXHU2OEMwXHU2N0U1XHU3RjEzXHU1QjU4XHVGRjA4XHU0RUM1XHU1NzI4XHU5NzVFXHU1RjAwXHU1M0QxXHU2QTIxXHU1RjBGXHU2MjE2XHU2NjBFXHU3ODZFXHU2MzA3XHU1QjlBXHU0RjdGXHU3NTI4XHU3RjEzXHU1QjU4XHU2NUY2XHVGRjA5XHJcbiAgaWYgKHVzZUNhY2hlICYmIHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAnZGV2ZWxvcG1lbnQnKSB7XHJcbiAgICBjb25zdCBjYWNoZWQgPSBzaWRlYmFyQ2FjaGUuZ2V0KHNlY3Rpb25OYW1lKVxyXG4gICAgaWYgKGNhY2hlZCAmJiBEYXRlLm5vdygpIC0gY2FjaGVkLnRpbWVzdGFtcCA8IENBQ0hFX1RUTCkge1xyXG4gICAgICByZXR1cm4gY2FjaGVkLmRhdGFcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgY29uc3Qgc2VjdGlvbkRpciA9IGpvaW4oc2VjdGlvbnNQYXRoLCBzZWN0aW9uTmFtZSlcclxuICBjb25zdCByb290ID0gcmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnZG9jcycpXHJcbiAgXHJcbiAgaWYgKCFleGlzdHNTeW5jKHNlY3Rpb25EaXIpKSByZXR1cm4gW11cclxuICBcclxuICBjb25zdCBlbnRyaWVzID0gcmVhZGRpclN5bmMoc2VjdGlvbkRpciwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pXHJcbiAgY29uc3Qgbm9kZXM6IFNpZGViYXJOb2RlW10gPSBbXVxyXG4gIFxyXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgaWYgKGVudHJ5Lm5hbWUuc3RhcnRzV2l0aCgnLicpIHx8IGVudHJ5Lm5hbWUgPT09ICdtYW5pZmVzdC5qc29uJykgY29udGludWVcclxuICAgIFxyXG4gICAgY29uc3QgZW50cnlQYXRoID0gam9pbihzZWN0aW9uRGlyLCBlbnRyeS5uYW1lKVxyXG4gICAgXHJcbiAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICBjb25zdCBub2RlID0gc2Nhbk5vZGUoZW50cnlQYXRoLCBlbnRyeS5uYW1lLCByb290LCAwKVxyXG4gICAgICBpZiAobm9kZSkgbm9kZXMucHVzaChub2RlKVxyXG4gICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSAmJiBlbnRyeS5uYW1lLmVuZHNXaXRoKCcubWQnKSkge1xyXG4gICAgICBjb25zdCBub2RlID0gY3JlYXRlTGVhZk5vZGUoZW50cnlQYXRoLCBlbnRyeS5uYW1lLCByb290KVxyXG4gICAgICBpZiAobm9kZSkgbm9kZXMucHVzaChub2RlKVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICBjb25zdCBzb3J0ZWQgPSBub2Rlcy5zb3J0KChhLCBiKSA9PiBzb3J0Tm9kZXMoYSwgYikpXHJcbiAgXHJcbiAgLy8gXHU2NkY0XHU2NUIwXHU3RjEzXHU1QjU4XHJcbiAgaWYgKHVzZUNhY2hlKSB7XHJcbiAgICBzaWRlYmFyQ2FjaGUuc2V0KHNlY3Rpb25OYW1lLCB7IGRhdGE6IHNvcnRlZCwgdGltZXN0YW1wOiBEYXRlLm5vdygpIH0pXHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBzb3J0ZWRcclxufVxyXG5cclxuZnVuY3Rpb24gc2Nhbk5vZGUoZGlyUGF0aDogc3RyaW5nLCBub2RlTmFtZTogc3RyaW5nLCByb290RG9jUGF0aDogc3RyaW5nLCBsZXZlbDogbnVtYmVyKTogU2lkZWJhck5vZGUgfCBudWxsIHtcclxuICBjb25zdCBzYW1lTmFtZU1kID0gam9pbihkaXJQYXRoLCBgJHtub2RlTmFtZX0ubWRgKVxyXG4gIGNvbnN0IGluZGV4TWQgPSBqb2luKGRpclBhdGgsICdpbmRleC5tZCcpXHJcbiAgXHJcbiAgbGV0IGZvbGRlckxpbms6IHN0cmluZyB8IHVuZGVmaW5lZFxyXG4gIGxldCBmb2xkZXJOb3RlUGF0aDogc3RyaW5nIHwgdW5kZWZpbmVkXHJcbiAgXHJcbiAgaWYgKGV4aXN0c1N5bmMoc2FtZU5hbWVNZCkpIHtcclxuICAgIGZvbGRlck5vdGVQYXRoID0gc2FtZU5hbWVNZFxyXG4gICAgZm9sZGVyTGluayA9ICcvJyArIHJlbGF0aXZlKHJvb3REb2NQYXRoLCBkaXJQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLydcclxuICB9IGVsc2UgaWYgKGV4aXN0c1N5bmMoaW5kZXhNZCkpIHtcclxuICAgIGZvbGRlck5vdGVQYXRoID0gaW5kZXhNZFxyXG4gICAgZm9sZGVyTGluayA9ICcvJyArIHJlbGF0aXZlKHJvb3REb2NQYXRoLCBkaXJQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnLydcclxuICB9XHJcbiAgXHJcbiAgY29uc3QgcGFyZW50RGlyID0gZGlybmFtZShkaXJQYXRoKVxyXG4gIGNvbnN0IG1hbmlmZXN0ID0gZ2V0TWFuaWZlc3QocGFyZW50RGlyKVxyXG4gIGxldCB0aXRsZSA9IG1hbmlmZXN0W25vZGVOYW1lXT8udGl0bGVcclxuICBcclxuICBpZiAoIXRpdGxlICYmIGZvbGRlck5vdGVQYXRoKSB7XHJcbiAgICB0aXRsZSA9IGV4dHJhY3RUaXRsZShmb2xkZXJOb3RlUGF0aClcclxuICB9XHJcbiAgaWYgKCF0aXRsZSkge1xyXG4gICAgdGl0bGUgPSBmb3JtYXREaXNwbGF5TmFtZShub2RlTmFtZSlcclxuICB9XHJcbiAgXHJcbiAgY29uc3Qgbm9kZUlkID0gJy8nICsgcmVsYXRpdmUocm9vdERvY1BhdGgsIGRpclBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvJ1xyXG4gIFxyXG4gIGNvbnN0IGVudHJpZXMgPSByZWFkZGlyU3luYyhkaXJQYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSlcclxuICBjb25zdCBjaGlsZHJlbjogU2lkZWJhck5vZGVbXSA9IFtdXHJcbiAgXHJcbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICBpZiAoZW50cnkubmFtZS5zdGFydHNXaXRoKCcuJykgfHwgZW50cnkubmFtZSA9PT0gJ21hbmlmZXN0Lmpzb24nKSBjb250aW51ZVxyXG4gICAgXHJcbiAgICBjb25zdCBlbnRyeVBhdGggPSBqb2luKGRpclBhdGgsIGVudHJ5Lm5hbWUpXHJcbiAgICBcclxuICAgIGlmIChlbnRyeVBhdGggPT09IGZvbGRlck5vdGVQYXRoKSBjb250aW51ZVxyXG4gICAgXHJcbiAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICBjb25zdCBjaGlsZE5vZGUgPSBzY2FuTm9kZShlbnRyeVBhdGgsIGVudHJ5Lm5hbWUsIHJvb3REb2NQYXRoLCBsZXZlbCArIDEpXHJcbiAgICAgIGlmIChjaGlsZE5vZGUpIGNoaWxkcmVuLnB1c2goY2hpbGROb2RlKVxyXG4gICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSAmJiBlbnRyeS5uYW1lLmVuZHNXaXRoKCcubWQnKSkge1xyXG4gICAgICBjb25zdCBsZWFmTm9kZSA9IGNyZWF0ZUxlYWZOb2RlKGVudHJ5UGF0aCwgZW50cnkubmFtZSwgcm9vdERvY1BhdGgsIGxldmVsICsgMSlcclxuICAgICAgaWYgKGxlYWZOb2RlKSBjaGlsZHJlbi5wdXNoKGxlYWZOb2RlKVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICBjb25zdCBub2RlOiBTaWRlYmFyTm9kZSA9IHtcclxuICAgIHRleHQ6IHRpdGxlLFxyXG4gICAgaWQ6IG5vZGVJZCxcclxuICAgIGNvbGxhcHNlZDogbGV2ZWwgPj0gMSxcclxuICAgIGlzTGVhZjogZmFsc2VcclxuICB9XHJcbiAgXHJcbiAgaWYgKGZvbGRlckxpbmspIG5vZGUubGluayA9IGZvbGRlckxpbmtcclxuICBpZiAoY2hpbGRyZW4ubGVuZ3RoID4gMCkgbm9kZS5pdGVtcyA9IGNoaWxkcmVuLnNvcnQoKGEsIGIpID0+IHNvcnROb2RlcyhhLCBiKSlcclxuICBcclxuICBpZiAoIWZvbGRlckxpbmsgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAwKSByZXR1cm4gbnVsbFxyXG4gIFxyXG4gIHJldHVybiBub2RlXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUxlYWZOb2RlKGZpbGVQYXRoOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcsIHJvb3REb2NQYXRoOiBzdHJpbmcsIGxldmVsOiBudW1iZXIgPSAwKTogU2lkZWJhck5vZGUgfCBudWxsIHtcclxuICBjb25zdCBiYXNlTmFtZSA9IGZpbGVOYW1lLnJlcGxhY2UoL1xcLm1kJC9pLCAnJylcclxuICAvLyBcdTRGMThcdTUxNDhcdTRFQ0VcdTY1ODdcdTRFRjYgZnJvbnRtYXR0ZXIgXHU2MjE2IEgxIFx1NjNEMFx1NTNENlx1NjgwN1x1OTg5OFxyXG4gIGNvbnN0IGV4dHJhY3RlZFRpdGxlID0gZXh0cmFjdFRpdGxlKGZpbGVQYXRoKVxyXG4gIGNvbnN0IHRpdGxlID0gZXh0cmFjdGVkVGl0bGUgfHwgZm9ybWF0RGlzcGxheU5hbWUoYmFzZU5hbWUpXHJcbiAgY29uc3QgcmVsYXRpdmVQYXRoID0gcmVsYXRpdmUocm9vdERvY1BhdGgsIGZpbGVQYXRoKVxyXG4gIGNvbnN0IGxpbmsgPSAnLycgKyByZWxhdGl2ZVBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpLnJlcGxhY2UoL1xcLm1kJC8sICcnKVxyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICB0ZXh0OiB0aXRsZSxcclxuICAgIGxpbms6IGxpbmssXHJcbiAgICBpZDogbGluayxcclxuICAgIGNvbGxhcHNlZDogZmFsc2UsXHJcbiAgICBpc0xlYWY6IHRydWVcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnROb2RlcyhhOiBTaWRlYmFyTm9kZSwgYjogU2lkZWJhck5vZGUpOiBudW1iZXIge1xyXG4gIGNvbnN0IGFUZXh0ID0gYS50ZXh0IHx8ICcnXHJcbiAgY29uc3QgYlRleHQgPSBiLnRleHQgfHwgJydcclxuICBcclxuICBjb25zdCBhTWF0Y2ggPSBhVGV4dC5tYXRjaCgvXihcXGQrKS8pXHJcbiAgY29uc3QgYk1hdGNoID0gYlRleHQubWF0Y2goL14oXFxkKykvKVxyXG4gIFxyXG4gIGlmIChhTWF0Y2ggJiYgYk1hdGNoKSB7XHJcbiAgICBjb25zdCBhTnVtID0gcGFyc2VJbnQoYU1hdGNoWzFdLCAxMClcclxuICAgIGNvbnN0IGJOdW0gPSBwYXJzZUludChiTWF0Y2hbMV0sIDEwKVxyXG4gICAgaWYgKGFOdW0gIT09IGJOdW0pIHJldHVybiBhTnVtIC0gYk51bVxyXG4gIH1cclxuICBcclxuICByZXR1cm4gYVRleHQubG9jYWxlQ29tcGFyZShiVGV4dClcclxufVxyXG5cclxuZnVuY3Rpb24gZm9ybWF0RGlzcGxheU5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBsZXQgZm9ybWF0dGVkID0gbmFtZS5yZXBsYWNlKC9fL2csICcgJylcclxuICBmb3JtYXR0ZWQgPSBmb3JtYXR0ZWQucmVwbGFjZSgvXihcXGQrKShbQS1aYS16XSkvLCAnJDEgJDInKVxyXG4gIFxyXG4gIHJldHVybiBmb3JtYXR0ZWQuc3BsaXQoJyAnKS5tYXAod29yZCA9PiB7XHJcbiAgICBpZiAoIXdvcmQpIHJldHVybiAnJ1xyXG4gICAgaWYgKC9eXFxkKyQvLnRlc3Qod29yZCkpIHJldHVybiB3b3JkXHJcbiAgICByZXR1cm4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSlcclxuICB9KS5qb2luKCcgJylcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdFRpdGxlKG1kUGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyhtZFBhdGgsICd1dGYtOCcpXHJcbiAgICBjb25zdCBmbU1hdGNoID0gY29udGVudC5tYXRjaCgvXnRpdGxlOlxccypbXCInXT8oLis/KVtcIiddP1xccyokL20pXHJcbiAgICBpZiAoZm1NYXRjaCkgcmV0dXJuIGZtTWF0Y2hbMV0udHJpbSgpXHJcbiAgICBcclxuICAgIGNvbnN0IGgxTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eI1xccysoLispJC9tKVxyXG4gICAgaWYgKGgxTWF0Y2gpIHJldHVybiBoMU1hdGNoWzFdLnRyaW0oKVxyXG4gIH0gY2F0Y2gge31cclxuICByZXR1cm4gJydcclxufVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXEFMTCBJTiBBSVxcXFxNZXRhQmxvZ1xcXFwudml0ZXByZXNzXFxcXHV0aWxzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxBTEwgSU4gQUlcXFxcTWV0YUJsb2dcXFxcLnZpdGVwcmVzc1xcXFx1dGlsc1xcXFxkb2Mtc3RydWN0dXJlLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9BTEwlMjBJTiUyMEFJL01ldGFCbG9nLy52aXRlcHJlc3MvdXRpbHMvZG9jLXN0cnVjdHVyZS50c1wiOy8qKlxyXG4gKiBcdTY1ODdcdTY4NjNcdTdFRDNcdTY3ODRcdTg5QzRcdTgzMDMgLSBcdTVCOUFcdTRFNDlcdTY1ODdcdTRFRjZcdTU5MzlcdTdFRDNcdTY3ODRcdTRFMEVcdTUyNERcdTdBRUZcdTY2M0VcdTc5M0FcdTc2ODRcdTY2MjBcdTVDMDRcdTUxNzNcdTdDRkJcclxuICogXHJcbiAqIFx1ODlDNFx1ODMwMzpcclxuICogMS4gXHU1M0Y2XHU1QjUwXHU2NTg3XHU2ODYzOiB7bmFtZX0ubWQgXHUyMTkyIFx1NjYzRVx1NzkzQVx1NEUzQVx1NjU4N1x1N0FFMFxyXG4gKiAyLiBGb2xkZXIgTm90ZToge2ZvbGRlcn0ve2ZvbGRlcn0ubWQgXHUyMTkyIFx1NjU4N1x1NEVGNlx1NTkzOVx1NTNFRlx1NzBCOVx1NTFGQlx1RkYwQ1x1NjgwN1x1OTg5OFx1Njc2NVx1ODFFQVx1NjU4N1x1NEVGNlxyXG4gKiAzLiBJbmRleCBcdTZBMjFcdTVGMEY6IHtmb2xkZXJ9L2luZGV4Lm1kIFx1MjE5MiBcdTY1ODdcdTRFRjZcdTU5MzlcdTUzRUZcdTcwQjlcdTUxRkJcdUZGMENcdTY4MDdcdTk4OThcdTY3NjVcdTgxRUEgaW5kZXgubWRcclxuICogNC4gXHU2REY3XHU1NDA4XHU2QTIxXHU1RjBGOiB7Zm9sZGVyfS97Zm9sZGVyfS5tZCArIHtmb2xkZXJ9L2NoaWxkLm1kIFx1MjE5MiBcdTUzRUZcdTVDNTVcdTVGMDBcdTcyMzZcdTgyODJcdTcwQjlcclxuICovXHJcblxyXG5pbXBvcnQgeyByZWFkZGlyU3luYywgc3RhdFN5bmMsIGV4aXN0c1N5bmMgfSBmcm9tICdmcydcclxuaW1wb3J0IHsgam9pbiwgYmFzZW5hbWUsIGV4dG5hbWUgfSBmcm9tICdwYXRoJ1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBEb2NOb2RlIHtcclxuICBpZDogc3RyaW5nXHJcbiAgdHlwZTogJ2ZpbGUnIHwgJ2ZvbGRlcidcclxuICBuYW1lOiBzdHJpbmcgICAgICAgICAgIC8vIFx1NjU4N1x1NEVGNlx1NTQwRC9cdTY1ODdcdTRFRjZcdTU5MzlcdTU0MERcclxuICB0aXRsZTogc3RyaW5nICAgICAgICAgIC8vIFx1NjYzRVx1NzkzQVx1NjgwN1x1OTg5OFxyXG4gIHBhdGg6IHN0cmluZyAgICAgICAgICAgLy8gXHU3NkY4XHU1QkY5XHU4REVGXHU1Rjg0IChzZWN0aW9ucy9wb3N0cy94eHgpXHJcbiAgbGluaz86IHN0cmluZyAgICAgICAgICAvLyBVUkwgXHU5NEZFXHU2M0E1XHJcbiAgY2hpbGRyZW4/OiBEb2NOb2RlW11cclxuICBpc0xlYWY6IGJvb2xlYW5cclxuICBjb2xsYXBzZWQ/OiBib29sZWFuXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTYyNkJcdTYzQ0Ygc2VjdGlvbiBcdTc2RUVcdTVGNTVcdUZGMENcdTc1MUZcdTYyMTBcdTg5QzRcdTgzMDNcdTUzMTZcdTc2ODRcdTY1ODdcdTY4NjNcdTY4MTFcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzY2FuRG9jU3RydWN0dXJlKFxyXG4gIHNlY3Rpb25QYXRoOiBzdHJpbmcsXHJcbiAgc2VjdGlvbk5hbWU/OiBzdHJpbmdcclxuKTogRG9jTm9kZVtdIHtcclxuICBjb25zdCBub2RlczogRG9jTm9kZVtdID0gW11cclxuICBcclxuICAvLyBcdTU5ODJcdTY3OUNcdTZDQTFcdTY3MDlcdTYzRDBcdTRGOUIgc2VjdGlvbk5hbWVcdUZGMENcdTRFQ0VcdThERUZcdTVGODRcdTYzRDBcdTUzRDZcclxuICBjb25zdCBzZWNOYW1lID0gc2VjdGlvbk5hbWUgfHwgYmFzZW5hbWUoc2VjdGlvblBhdGgpXHJcbiAgXHJcbiAgY29uc3QgZW50cmllcyA9IHJlYWRkaXJTeW5jKHNlY3Rpb25QYXRoLCB7IHdpdGhGaWxlVHlwZXM6IHRydWUgfSlcclxuICAgIC5maWx0ZXIoZSA9PiAhZS5uYW1lLnN0YXJ0c1dpdGgoJy4nKSAmJiBlLm5hbWUgIT09ICdtYW5pZmVzdC5qc29uJylcclxuICAgIC5zb3J0KChhLCBiKSA9PiB7XHJcbiAgICAgIC8vIFx1NjU4N1x1NEVGNlx1NTkzOVx1NTcyOFx1NTI0RFx1RkYwQ1x1NjU4N1x1NEVGNlx1NTcyOFx1NTQwRVxyXG4gICAgICBpZiAoYS5pc0RpcmVjdG9yeSgpICYmICFiLmlzRGlyZWN0b3J5KCkpIHJldHVybiAtMVxyXG4gICAgICBpZiAoIWEuaXNEaXJlY3RvcnkoKSAmJiBiLmlzRGlyZWN0b3J5KCkpIHJldHVybiAxXHJcbiAgICAgIHJldHVybiBhLm5hbWUubG9jYWxlQ29tcGFyZShiLm5hbWUpXHJcbiAgICB9KVxyXG4gIFxyXG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xyXG4gICAgY29uc3QgZnVsbFBhdGggPSBqb2luKHNlY3Rpb25QYXRoLCBlbnRyeS5uYW1lKVxyXG4gICAgLy8gXHU4REVGXHU1Rjg0XHU1MzA1XHU1NDJCIHNlY3Rpb24gXHU1NDBEXHU3OUYwXHU1MjREXHU3RjAwXHJcbiAgICBjb25zdCByZWxhdGl2ZVBhdGggPSBgJHtzZWNOYW1lfS8ke2VudHJ5Lm5hbWV9YFxyXG4gICAgXHJcbiAgICBpZiAoZW50cnkuaXNEaXJlY3RvcnkoKSkge1xyXG4gICAgICBjb25zdCBmb2xkZXJOb2RlID0gc2NhbkZvbGRlcihmdWxsUGF0aCwgZW50cnkubmFtZSwgcmVsYXRpdmVQYXRoLCBzZWNOYW1lKVxyXG4gICAgICBpZiAoZm9sZGVyTm9kZSkgbm9kZXMucHVzaChmb2xkZXJOb2RlKVxyXG4gICAgfSBlbHNlIGlmIChlbnRyeS5pc0ZpbGUoKSAmJiBlbnRyeS5uYW1lLmVuZHNXaXRoKCcubWQnKSkge1xyXG4gICAgICAvLyBcdThERjNcdThGQzcgc2VjdGlvbiBcdTk5OTZcdTk4NzVcdTY1ODdcdTRFRjYgKFx1NTk4MiBwb3N0cy5tZClcclxuICAgICAgaWYgKGVudHJ5Lm5hbWUgPT09IGAke3NlY05hbWV9Lm1kYCkgY29udGludWVcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGZpbGVOb2RlID0gY3JlYXRlRmlsZU5vZGUoZnVsbFBhdGgsIGVudHJ5Lm5hbWUsIHJlbGF0aXZlUGF0aCwgc2VjTmFtZSlcclxuICAgICAgaWYgKGZpbGVOb2RlKSBub2Rlcy5wdXNoKGZpbGVOb2RlKVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICByZXR1cm4gbm9kZXNcclxufVxyXG5cclxuLyoqXHJcbiAqIFx1NjI2Qlx1NjNDRlx1NjU4N1x1NEVGNlx1NTkzOVx1RkYwQ1x1OEJDNlx1NTIyQiBGb2xkZXIgTm90ZSBcdTYyMTYgSW5kZXggXHU2QTIxXHU1RjBGXHJcbiAqL1xyXG5mdW5jdGlvbiBzY2FuRm9sZGVyKFxyXG4gIGRpclBhdGg6IHN0cmluZyxcclxuICBmb2xkZXJOYW1lOiBzdHJpbmcsXHJcbiAgcmVsYXRpdmVQYXRoOiBzdHJpbmcsXHJcbiAgc2VjdGlvbk5hbWU6IHN0cmluZ1xyXG4pOiBEb2NOb2RlIHwgbnVsbCB7XHJcbiAgY29uc3QgZm9sZGVyTm90ZVBhdGggPSBqb2luKGRpclBhdGgsIGAke2ZvbGRlck5hbWV9Lm1kYClcclxuICBjb25zdCBpbmRleFBhdGggPSBqb2luKGRpclBhdGgsICdpbmRleC5tZCcpXHJcbiAgXHJcbiAgbGV0IHRpdGxlID0gZm9sZGVyTmFtZVxyXG4gIGxldCBsaW5rOiBzdHJpbmcgfCB1bmRlZmluZWRcclxuICBsZXQgZm9sZGVyTm90ZVBhdGhVc2VkOiBzdHJpbmcgfCB1bmRlZmluZWRcclxuICBcclxuICAvLyBcdTRGMThcdTUxNDhcdTRGN0ZcdTc1MjggRm9sZGVyIE5vdGUgXHU2QTIxXHU1RjBGIChmb2xkZXIvZm9sZGVyLm1kKVxyXG4gIGlmIChleGlzdHNTeW5jKGZvbGRlck5vdGVQYXRoKSkge1xyXG4gICAgdGl0bGUgPSBleHRyYWN0VGl0bGUoZm9sZGVyTm90ZVBhdGgpIHx8IGZvcm1hdERpc3BsYXlOYW1lKGZvbGRlck5hbWUpXHJcbiAgICBsaW5rID0gYC9zZWN0aW9ucy8ke3JlbGF0aXZlUGF0aH0vYFxyXG4gICAgZm9sZGVyTm90ZVBhdGhVc2VkID0gZm9sZGVyTm90ZVBhdGhcclxuICB9XHJcbiAgLy8gXHU1MTc2XHU2QjIxXHU0RjdGXHU3NTI4IEluZGV4IFx1NkEyMVx1NUYwRiAoZm9sZGVyL2luZGV4Lm1kKVxyXG4gIGVsc2UgaWYgKGV4aXN0c1N5bmMoaW5kZXhQYXRoKSkge1xyXG4gICAgdGl0bGUgPSBleHRyYWN0VGl0bGUoaW5kZXhQYXRoKSB8fCBmb3JtYXREaXNwbGF5TmFtZShmb2xkZXJOYW1lKVxyXG4gICAgbGluayA9IGAvc2VjdGlvbnMvJHtyZWxhdGl2ZVBhdGh9L2BcclxuICAgIGZvbGRlck5vdGVQYXRoVXNlZCA9IGluZGV4UGF0aFxyXG4gIH1cclxuICBcclxuICAvLyBcdTYyNkJcdTYzQ0ZcdTVCNTBcdTk4NzlcclxuICBjb25zdCBjaGlsZHJlbjogRG9jTm9kZVtdID0gW11cclxuICBjb25zdCBlbnRyaWVzID0gcmVhZGRpclN5bmMoZGlyUGF0aCwgeyB3aXRoRmlsZVR5cGVzOiB0cnVlIH0pXHJcbiAgICAuZmlsdGVyKGUgPT4gIWUubmFtZS5zdGFydHNXaXRoKCcuJykgJiYgZS5uYW1lICE9PSAnbWFuaWZlc3QuanNvbicpXHJcbiAgXHJcbiAgZm9yIChjb25zdCBlbnRyeSBvZiBlbnRyaWVzKSB7XHJcbiAgICAvLyBcdThERjNcdThGQzcgRm9sZGVyIE5vdGUgXHU2MjE2IGluZGV4Lm1kIFx1NjcyQ1x1OEVBQlxyXG4gICAgaWYgKGpvaW4oZGlyUGF0aCwgZW50cnkubmFtZSkgPT09IGZvbGRlck5vdGVQYXRoVXNlZCkgY29udGludWVcclxuICAgIFxyXG4gICAgY29uc3QgY2hpbGRSZWxhdGl2ZVBhdGggPSBgJHtyZWxhdGl2ZVBhdGh9LyR7ZW50cnkubmFtZX1gXHJcbiAgICBcclxuICAgIGlmIChlbnRyeS5pc0RpcmVjdG9yeSgpKSB7XHJcbiAgICAgIGNvbnN0IGNoaWxkTm9kZSA9IHNjYW5Gb2xkZXIoXHJcbiAgICAgICAgam9pbihkaXJQYXRoLCBlbnRyeS5uYW1lKSxcclxuICAgICAgICBlbnRyeS5uYW1lLFxyXG4gICAgICAgIGNoaWxkUmVsYXRpdmVQYXRoLFxyXG4gICAgICAgIHNlY3Rpb25OYW1lXHJcbiAgICAgIClcclxuICAgICAgaWYgKGNoaWxkTm9kZSkgY2hpbGRyZW4ucHVzaChjaGlsZE5vZGUpXHJcbiAgICB9IGVsc2UgaWYgKGVudHJ5LmlzRmlsZSgpICYmIGVudHJ5Lm5hbWUuZW5kc1dpdGgoJy5tZCcpKSB7XHJcbiAgICAgIGNvbnN0IGNoaWxkTm9kZSA9IGNyZWF0ZUZpbGVOb2RlKFxyXG4gICAgICAgIGpvaW4oZGlyUGF0aCwgZW50cnkubmFtZSksXHJcbiAgICAgICAgZW50cnkubmFtZSxcclxuICAgICAgICBjaGlsZFJlbGF0aXZlUGF0aCxcclxuICAgICAgICBzZWN0aW9uTmFtZVxyXG4gICAgICApXHJcbiAgICAgIGlmIChjaGlsZE5vZGUpIGNoaWxkcmVuLnB1c2goY2hpbGROb2RlKVxyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICAvLyBcdTU5ODJcdTY3OUNcdTZDQTFcdTY3MDkgRm9sZGVyIE5vdGUvSW5kZXggXHU0RTE0XHU2Q0ExXHU2NzA5XHU1QjUwXHU5ODc5XHVGRjBDXHU1RkZEXHU3NTY1XHU2QjY0XHU2NTg3XHU0RUY2XHU1OTM5XHJcbiAgaWYgKCFsaW5rICYmIGNoaWxkcmVuLmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGxcclxuICBcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IGAvc2VjdGlvbnMvJHtyZWxhdGl2ZVBhdGh9L2AsXHJcbiAgICB0eXBlOiAnZm9sZGVyJyxcclxuICAgIG5hbWU6IGZvbGRlck5hbWUsXHJcbiAgICB0aXRsZSxcclxuICAgIHBhdGg6IHJlbGF0aXZlUGF0aCxcclxuICAgIGxpbmssXHJcbiAgICBjaGlsZHJlbjogY2hpbGRyZW4ubGVuZ3RoID4gMCA/IGNoaWxkcmVuIDogdW5kZWZpbmVkLFxyXG4gICAgaXNMZWFmOiBmYWxzZSxcclxuICAgIGNvbGxhcHNlZDogdHJ1ZVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFx1NTIxQlx1NUVGQVx1NjU4N1x1NEVGNlx1ODI4Mlx1NzBCOVxyXG4gKi9cclxuZnVuY3Rpb24gY3JlYXRlRmlsZU5vZGUoXHJcbiAgZmlsZVBhdGg6IHN0cmluZyxcclxuICBmaWxlTmFtZTogc3RyaW5nLFxyXG4gIHJlbGF0aXZlUGF0aDogc3RyaW5nLFxyXG4gIHNlY3Rpb25OYW1lOiBzdHJpbmdcclxuKTogRG9jTm9kZSB8IG51bGwge1xyXG4gIGNvbnN0IGJhc2VOYW1lID0gZmlsZU5hbWUucmVwbGFjZSgvXFwubWQkL2ksICcnKVxyXG4gIGNvbnN0IHRpdGxlID0gZXh0cmFjdFRpdGxlKGZpbGVQYXRoKSB8fCBmb3JtYXREaXNwbGF5TmFtZShiYXNlTmFtZSlcclxuICBjb25zdCBsaW5rID0gYC9zZWN0aW9ucy8ke3JlbGF0aXZlUGF0aC5yZXBsYWNlKC9cXC5tZCQvaSwgJycpfWBcclxuICBcclxuICByZXR1cm4ge1xyXG4gICAgaWQ6IGxpbmssXHJcbiAgICB0eXBlOiAnZmlsZScsXHJcbiAgICBuYW1lOiBiYXNlTmFtZSxcclxuICAgIHRpdGxlLFxyXG4gICAgcGF0aDogcmVsYXRpdmVQYXRoLnJlcGxhY2UoL1xcLm1kJC9pLCAnJyksXHJcbiAgICBsaW5rLFxyXG4gICAgaXNMZWFmOiB0cnVlXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogXHU0RUNFXHU2NTg3XHU0RUY2XHU2M0QwXHU1M0Q2XHU2ODA3XHU5ODk4XHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0VGl0bGUoZmlsZVBhdGg6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb250ZW50ID0gcmVxdWlyZSgnZnMnKS5yZWFkRmlsZVN5bmMoZmlsZVBhdGgsICd1dGYtOCcpXHJcbiAgICBcclxuICAgIC8vIDEuIFx1NEVDRSBmcm9udG1hdHRlciBcdTYzRDBcdTUzRDZcclxuICAgIGNvbnN0IGZtTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eLS0tXFxuW1xcc1xcU10qP1xcbnRpdGxlOlxccyooLis/KVxcbi8pXHJcbiAgICBpZiAoZm1NYXRjaCkgcmV0dXJuIGZtTWF0Y2hbMV0udHJpbSgpLnJlcGxhY2UoL15bXCInXXxbXCInXSQvZywgJycpXHJcbiAgICBcclxuICAgIC8vIDIuIFx1NEVDRSBIMSBcdTYzRDBcdTUzRDZcclxuICAgIGNvbnN0IGgxTWF0Y2ggPSBjb250ZW50Lm1hdGNoKC9eI1xccysoLispJC9tKVxyXG4gICAgaWYgKGgxTWF0Y2gpIHJldHVybiBoMU1hdGNoWzFdLnRyaW0oKVxyXG4gICAgXHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTY4M0NcdTVGMEZcdTUzMTZcdTY2M0VcdTc5M0FcdTU0MERcdTc5RjBcclxuICovXHJcbmZ1bmN0aW9uIGZvcm1hdERpc3BsYXlOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIG5hbWVcclxuICAgIC5yZXBsYWNlKC9eXFxkK1stX10vLCAnJykgICAgICAgICAgIC8vIFx1NzlGQlx1OTY2NFx1NUU4Rlx1NTNGN1x1NTI0RFx1N0YwMFxyXG4gICAgLnJlcGxhY2UoL1stX10vZywgJyAnKSAgICAgICAgICAgICAvLyBcdTY2RkZcdTYzNjJcdTUyMDZcdTk2OTRcdTdCMjZcdTRFM0FcdTdBN0FcdTY4M0NcclxuICAgIC5yZXBsYWNlKC9cXGJcXHcvZywgYyA9PiBjLnRvVXBwZXJDYXNlKCkpICAvLyBcdTk5OTZcdTVCNTdcdTZCQ0RcdTU5MjdcdTUxOTlcclxufVxyXG5cclxuLyoqXHJcbiAqIFx1OEY2Q1x1NjM2Mlx1NEUzQSBTaWRlYmFyIFx1NjgzQ1x1NUYwRlx1RkYwOFx1NTE3Q1x1NUJCOSBWaXRlUHJlc3NcdUZGMDlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB0b1NpZGViYXJGb3JtYXQobm9kZXM6IERvY05vZGVbXSk6IGFueVtdIHtcclxuICByZXR1cm4gbm9kZXMubWFwKG5vZGUgPT4ge1xyXG4gICAgY29uc3QgcmVzdWx0OiBhbnkgPSB7XHJcbiAgICAgIHRleHQ6IG5vZGUudGl0bGUsXHJcbiAgICAgIGlkOiBub2RlLmlkLFxyXG4gICAgICBjb2xsYXBzZWQ6IG5vZGUuY29sbGFwc2VkID8/IGZhbHNlLFxyXG4gICAgICBpc0xlYWY6IG5vZGUuaXNMZWFmXHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmIChub2RlLmxpbmspIHJlc3VsdC5saW5rID0gbm9kZS5saW5rXHJcbiAgICBpZiAobm9kZS5jaGlsZHJlbikgcmVzdWx0Lml0ZW1zID0gdG9TaWRlYmFyRm9ybWF0KG5vZGUuY2hpbGRyZW4pXHJcbiAgICBcclxuICAgIHJldHVybiByZXN1bHRcclxuICB9KVxyXG59XHJcblxyXG4vKipcclxuICogXHU4RjZDXHU2MzYyXHU0RTNBXHU1MjREXHU3QUVGXHU3NkVFXHU1RjU1XHU2ODExXHU2ODNDXHU1RjBGXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gdG9EaXJlY3RvcnlUcmVlKG5vZGVzOiBEb2NOb2RlW10pOiBhbnlbXSB7XHJcbiAgcmV0dXJuIG5vZGVzLm1hcChub2RlID0+IHtcclxuICAgIGlmIChub2RlLnR5cGUgPT09ICdmb2xkZXInKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgdHlwZTogJ2RpcmVjdG9yeScsXHJcbiAgICAgICAgcGF0aDogbm9kZS5pZCxcclxuICAgICAgICBuYW1lOiBub2RlLm5hbWUsXHJcbiAgICAgICAgZGlzcGxheU5hbWU6IG5vZGUudGl0bGUsXHJcbiAgICAgICAgY2hpbGRyZW46IG5vZGUuY2hpbGRyZW4gPyB0b0RpcmVjdG9yeVRyZWUobm9kZS5jaGlsZHJlbikgOiBbXVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0eXBlOiAnYXJ0aWNsZScsXHJcbiAgICAgIHBhdGg6IG5vZGUubGluayxcclxuICAgICAgbmFtZTogbm9kZS5uYW1lLFxyXG4gICAgICB0aXRsZTogbm9kZS50aXRsZSxcclxuICAgICAgZGlzcGxheU5hbWU6IG5vZGUudGl0bGVcclxuICAgIH1cclxuICB9KVxyXG59XHJcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiRDpcXFxcQUxMIElOIEFJXFxcXE1ldGFCbG9nXFxcXC52aXRlcHJlc3NcXFxcYWdlbnRcXFxccnVudGltZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcQUxMIElOIEFJXFxcXE1ldGFCbG9nXFxcXC52aXRlcHJlc3NcXFxcYWdlbnRcXFxccnVudGltZVxcXFxMb2dTeXN0ZW0udHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0FMTCUyMElOJTIwQUkvTWV0YUJsb2cvLnZpdGVwcmVzcy9hZ2VudC9ydW50aW1lL0xvZ1N5c3RlbS50c1wiOy8qKlxyXG4gKiBNZXRhVW5pdmVyc2UgTG9nIFN5c3RlbSB2MlxyXG4gKiBcdTVCOENcdTY1NzRcdTc2ODRcdTdDRkJcdTdFREZcdTY1RTVcdTVGRDdcdThCQjBcdTVGNTVcdTY3MERcdTUyQTFcdUZGMENcdTY1MkZcdTYzMDFcdTRFQkFcdTdDN0IvQUlcdTY0Q0RcdTRGNUNcdTUzM0FcdTUyMDZcdUZGMENcdTYzMDFcdTRFNDVcdTUzMTZcdTVCNThcdTUwQThcclxuICovXHJcblxyXG5pbXBvcnQgeyBwcm9taXNlcyBhcyBmcyB9IGZyb20gJ2ZzJ1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCdcclxuXHJcbmV4cG9ydCB0eXBlIExvZ0xldmVsID0gJ2RlYnVnJyB8ICdpbmZvJyB8ICd3YXJuJyB8ICdlcnJvcicgfCAnc3VjY2VzcycgfCAnc3lzdGVtJ1xyXG5leHBvcnQgdHlwZSBMb2dBY3RvciA9ICdodW1hbicgfCAnYWknIHwgJ3N5c3RlbScgLy8gXHU2NENEXHU0RjVDXHU4MDA1XHU3QzdCXHU1NzhCXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIExvZ0VudHJ5IHtcclxuICBpZDogc3RyaW5nXHJcbiAgdGltZXN0YW1wOiBzdHJpbmdcclxuICBsZXZlbDogTG9nTGV2ZWxcclxuICBldmVudDogc3RyaW5nXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbiAgYWN0b3I6IExvZ0FjdG9yICAgICAgLy8gXHU4QzAxXHU2MjY3XHU4ODRDXHU3Njg0XHU2NENEXHU0RjVDXHVGRjFBaHVtYW4sIGFpLCBzeXN0ZW1cclxuICBhY3RvcklkPzogc3RyaW5nICAgICAvLyBcdTUxNzdcdTRGNTNcdTY4MDdcdThCQzZcdUZGMDhcdTc1MjhcdTYyMzdJRC9BSVx1NkEyMVx1NTc4Qi9cdTdDRkJcdTdFREZcdTZBMjFcdTU3NTdcdUZGMDlcclxuICBzb3VyY2U6IHN0cmluZyAgICAgICAvLyBcdTY3NjVcdTZFOTBcdTdFQzRcdTRFRjZcclxuICBzZXNzaW9uSWQ/OiBzdHJpbmcgICAvLyBcdTRGMUFcdThCRERcdTY4MDdcdThCQzZcclxuICB0YXNrSWQ/OiBzdHJpbmcgICAgICAvLyBcdTRFRkJcdTUyQTFcdTY4MDdcdThCQzZcclxuICBza2lsbE5hbWU/OiBzdHJpbmcgICAvLyBBSVx1NjI4MFx1ODBGRFx1NTQwRFx1NzlGMFxyXG4gIGR1cmF0aW9uPzogbnVtYmVyICAgIC8vIFx1NjRDRFx1NEY1Q1x1ODAxN1x1NjVGNihtcylcclxuICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT5cclxuICBkYXRhPzogYW55ICAgICAgICAgICAvLyBcdThCRTZcdTdFQzZcdTY1NzBcdTYzNkVcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dGaWx0ZXIge1xyXG4gIGxldmVsPzogTG9nTGV2ZWxcclxuICBldmVudD86IHN0cmluZ1xyXG4gIGFjdG9yPzogTG9nQWN0b3JcclxuICBhY3RvcklkPzogc3RyaW5nXHJcbiAgc2VhcmNoPzogc3RyaW5nXHJcbiAgc3RhcnRUaW1lPzogRGF0ZVxyXG4gIGVuZFRpbWU/OiBEYXRlXHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTG9nU3RhdHMge1xyXG4gIHRvdGFsOiBudW1iZXJcclxuICBieUxldmVsOiBSZWNvcmQ8TG9nTGV2ZWwsIG51bWJlcj5cclxuICBieUV2ZW50OiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+XHJcbiAgYnlBY3RvcjogUmVjb3JkPExvZ0FjdG9yLCBudW1iZXI+XHJcbiAgcmVjZW50RXJyb3JzOiBMb2dFbnRyeVtdXHJcbiAgaHVtYW5BY3Rpdml0eTogbnVtYmVyXHJcbiAgYWlBY3Rpdml0eTogbnVtYmVyXHJcbn1cclxuXHJcbi8vIFx1NjVFNVx1NUZEN1x1NjU4N1x1NEVGNlx1OERFRlx1NUY4NFxyXG5jb25zdCBMT0dTX0RJUiA9IGpvaW4ocHJvY2Vzcy5jd2QoKSwgJy52aXRlcHJlc3MnLCAnYWdlbnQnLCAnbG9ncycpXHJcbmNvbnN0IExPR19GSUxFID0gam9pbihMT0dTX0RJUiwgJ3N5c3RlbS5sb2cnKVxyXG5jb25zdCBNQVhfRklMRV9TSVpFID0gMTAgKiAxMDI0ICogMTAyNCAvLyAxME1CXHJcbmNvbnN0IE1BWF9NRU1PUllfTE9HUyA9IDIwMDBcclxuXHJcbi8vIFx1NTE4NVx1NUI1OFx1NEUyRFx1NzY4NFx1NjVFNVx1NUZEN1x1N0YxM1x1NUI1OFx1RkYwOFx1NjcwMFx1OEZEMVx1NzY4NFx1NjVFNVx1NUZEN1x1RkYwOVxyXG5jb25zdCBtZW1vcnlMb2dzOiBMb2dFbnRyeVtdID0gW11cclxuXHJcbi8vIFx1N0NGQlx1N0VERlx1NTQyRlx1NTJBOFx1NjVGNlx1OTVGNFxyXG5jb25zdCBTWVNURU1fU1RBUlRfVElNRSA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG5cclxuLy8gXHU3NTFGXHU2MjEwXHU1NTJGXHU0RTAwSURcclxuZnVuY3Rpb24gZ2VuZXJhdGVJZCgpOiBzdHJpbmcge1xyXG4gIHJldHVybiBgJHtEYXRlLm5vdygpfS0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gXHJcbn1cclxuXHJcbi8vIFx1ODNCN1x1NTNENlx1NUY1M1x1NTI0RFx1NjVGNlx1OTVGNFx1NjIzM1xyXG5mdW5jdGlvbiBnZXRUaW1lc3RhbXAoKTogc3RyaW5nIHtcclxuICByZXR1cm4gbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbn1cclxuXHJcbi8vIFx1NjgzQ1x1NUYwRlx1NTMxNlx1NjVFNVx1NUZEN1x1NEUzQVx1NjU4N1x1NjcyQ1x1ODg0Q1xyXG5mdW5jdGlvbiBmb3JtYXRMb2dMaW5lKGVudHJ5OiBMb2dFbnRyeSk6IHN0cmluZyB7XHJcbiAgY29uc3QgYWN0b3JFbW9qaSA9IGVudHJ5LmFjdG9yID09PSAnaHVtYW4nID8gJ1x1RDgzRFx1REM2NCcgOiBcclxuICAgICAgICAgICAgICAgICAgICAgZW50cnkuYWN0b3IgPT09ICdhaScgPyAnXHVEODNFXHVERDE2JyA6ICdcdTI2OTlcdUZFMEYnXHJcbiAgcmV0dXJuIGBbJHtlbnRyeS50aW1lc3RhbXB9XSAke2FjdG9yRW1vaml9IFske2VudHJ5LmFjdG9yLnRvVXBwZXJDYXNlKCl9XSAke2VudHJ5LmxldmVsLnRvVXBwZXJDYXNlKCl9IHwgJHtlbnRyeS5ldmVudH0gfCAke2VudHJ5Lm1lc3NhZ2V9YFxyXG59XHJcblxyXG4vLyBcdTc4NkVcdTRGRERcdTY1RTVcdTVGRDdcdTc2RUVcdTVGNTVcdTVCNThcdTU3MjhcclxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlTG9nRGlyKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBmcy5ta2RpcihMT0dTX0RJUiwgeyByZWN1cnNpdmU6IHRydWUgfSlcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIGxvZ3MgZGlyZWN0b3J5OicsIGUpXHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTY4QzBcdTY3RTVcdTVFNzZcdThGNkVcdThGNkNcdTY1RTVcdTVGRDdcdTY1ODdcdTRFRjZcclxuYXN5bmMgZnVuY3Rpb24gcm90YXRlTG9nSWZOZWVkZWQoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgZnMuc3RhdChMT0dfRklMRSkuY2F0Y2goKCkgPT4gbnVsbClcclxuICAgIGlmIChzdGF0cyAmJiBzdGF0cy5zaXplID4gTUFYX0ZJTEVfU0laRSkge1xyXG4gICAgICBjb25zdCBiYWNrdXBGaWxlID0gam9pbihMT0dTX0RJUiwgYHN5c3RlbS0ke0RhdGUubm93KCl9LmxvZ2ApXHJcbiAgICAgIGF3YWl0IGZzLnJlbmFtZShMT0dfRklMRSwgYmFja3VwRmlsZSlcclxuICAgIH1cclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICAvLyBcdTVGRkRcdTc1NjVcdThGNkVcdThGNkNcdTk1MTlcdThCRUZcclxuICB9XHJcbn1cclxuXHJcbi8vIFx1OEZGRFx1NTJBMFx1NjVFNVx1NUZEN1x1NTIzMFx1NjU4N1x1NEVGNlxyXG5hc3luYyBmdW5jdGlvbiBhcHBlbmRUb0ZpbGUoZW50cnk6IExvZ0VudHJ5KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IGVuc3VyZUxvZ0RpcigpXHJcbiAgICBhd2FpdCByb3RhdGVMb2dJZk5lZWRlZCgpXHJcbiAgICBjb25zdCBsaW5lID0gZm9ybWF0TG9nTGluZShlbnRyeSkgKyAnXFxuJ1xyXG4gICAgYXdhaXQgZnMuYXBwZW5kRmlsZShMT0dfRklMRSwgbGluZSwgJ3V0Zi04JylcclxuICB9IGNhdGNoIChlKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgbG9nIHRvIGZpbGU6JywgZSlcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdThCQjBcdTVGNTVcdTY1RTVcdTVGRDdcdUZGMDhcdTY4MzhcdTVGQzNcdTY1QjlcdTZDRDVcdUZGMDlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBsb2coXHJcbiAgbGV2ZWw6IExvZ0xldmVsLFxyXG4gIGV2ZW50OiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIG9wdGlvbnM6IHtcclxuICAgIGFjdG9yPzogTG9nQWN0b3JcclxuICAgIGFjdG9ySWQ/OiBzdHJpbmdcclxuICAgIHNvdXJjZT86IHN0cmluZ1xyXG4gICAgdGFza0lkPzogc3RyaW5nXHJcbiAgICBza2lsbE5hbWU/OiBzdHJpbmdcclxuICAgIGR1cmF0aW9uPzogbnVtYmVyXHJcbiAgICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT5cclxuICAgIGRhdGE/OiBhbnlcclxuICB9ID0ge31cclxuKTogTG9nRW50cnkge1xyXG4gIGNvbnN0IGVudHJ5OiBMb2dFbnRyeSA9IHtcclxuICAgIGlkOiBnZW5lcmF0ZUlkKCksXHJcbiAgICB0aW1lc3RhbXA6IGdldFRpbWVzdGFtcCgpLFxyXG4gICAgbGV2ZWwsXHJcbiAgICBldmVudCxcclxuICAgIG1lc3NhZ2UsXHJcbiAgICBhY3Rvcjogb3B0aW9ucy5hY3RvciB8fCAnc3lzdGVtJyxcclxuICAgIGFjdG9ySWQ6IG9wdGlvbnMuYWN0b3JJZCxcclxuICAgIHNvdXJjZTogb3B0aW9ucy5zb3VyY2UgfHwgJ3N5c3RlbScsXHJcbiAgICB0YXNrSWQ6IG9wdGlvbnMudGFza0lkLFxyXG4gICAgc2tpbGxOYW1lOiBvcHRpb25zLnNraWxsTmFtZSxcclxuICAgIGR1cmF0aW9uOiBvcHRpb25zLmR1cmF0aW9uLFxyXG4gICAgbWV0YWRhdGE6IG9wdGlvbnMubWV0YWRhdGEsXHJcbiAgICBkYXRhOiBvcHRpb25zLmRhdGFcclxuICB9XHJcblxyXG4gIC8vIFx1NkRGQlx1NTJBMFx1NTIzMFx1NTE4NVx1NUI1OFx1N0YxM1x1NUI1OFxyXG4gIG1lbW9yeUxvZ3MudW5zaGlmdChlbnRyeSlcclxuICBpZiAobWVtb3J5TG9ncy5sZW5ndGggPiBNQVhfTUVNT1JZX0xPR1MpIHtcclxuICAgIG1lbW9yeUxvZ3MucG9wKClcclxuICB9XHJcblxyXG4gIC8vIFx1NUYwMlx1NkI2NVx1NTE5OVx1NTE2NVx1NjU4N1x1NEVGNlxyXG4gIGFwcGVuZFRvRmlsZShlbnRyeSkuY2F0Y2goKCkgPT4ge30pXHJcblxyXG4gIC8vIFx1NjNBN1x1NTIzNlx1NTNGMFx1OEY5M1x1NTFGQVx1RkYwOFx1NUUyNlx1OTg5Q1x1ODI3Mlx1RkYwOVxyXG4gIGNvbnN0IGNvbG9ycyA9IHtcclxuICAgIGRlYnVnOiAnXFx4MWJbMzZtJywgICAgLy8gXHU5NzUyXHU4MjcyXHJcbiAgICBpbmZvOiAnXFx4MWJbMzRtJywgICAgIC8vIFx1ODRERFx1ODI3MlxyXG4gICAgd2FybjogJ1xceDFiWzMzbScsICAgICAvLyBcdTlFQzRcdTgyNzJcclxuICAgIGVycm9yOiAnXFx4MWJbMzFtJywgICAgLy8gXHU3RUEyXHU4MjcyXHJcbiAgICBzdWNjZXNzOiAnXFx4MWJbMzJtJywgIC8vIFx1N0VGRlx1ODI3MlxyXG4gICAgc3lzdGVtOiAnXFx4MWJbMzVtJywgICAvLyBcdTdEMkJcdTgyNzJcclxuICAgIHJlc2V0OiAnXFx4MWJbMG0nXHJcbiAgfVxyXG4gIFxyXG4gIGNvbnN0IGFjdG9yRW1vamkgPSBlbnRyeS5hY3RvciA9PT0gJ2h1bWFuJyA/ICdcdUQ4M0RcdURDNjQnIDogXHJcbiAgICAgICAgICAgICAgICAgICAgIGVudHJ5LmFjdG9yID09PSAnYWknID8gJ1x1RDgzRVx1REQxNicgOiAnXHUyNjk5XHVGRTBGJ1xyXG4gIFxyXG4gIGNvbnN0IGNvbG9yID0gY29sb3JzW2xldmVsXSB8fCBjb2xvcnMucmVzZXRcclxuICBjb25zb2xlLmxvZyhcclxuICAgIGAke2NvbG9yfVske2xldmVsLnRvVXBwZXJDYXNlKCl9XSR7Y29sb3JzLnJlc2V0fSBgICtcclxuICAgIGAke2FjdG9yRW1vaml9IFske2VudHJ5LmFjdG9yLnRvVXBwZXJDYXNlKCl9JHtlbnRyeS5hY3RvcklkID8gYDoke2VudHJ5LmFjdG9ySWR9YCA6ICcnfV0gYCArXHJcbiAgICBgJHtldmVudH06ICR7bWVzc2FnZX1gXHJcbiAgKVxyXG5cclxuICByZXR1cm4gZW50cnlcclxufVxyXG5cclxuLyoqXHJcbiAqIFx1NEZCRlx1NjM3N1x1NjVCOVx1NkNENSAtIFx1NjMwOVx1NjRDRFx1NEY1Q1x1ODAwNVx1N0M3Qlx1NTc4QlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGh1bWFuID0ge1xyXG4gIGRlYnVnOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBcclxuICAgIGxvZygnZGVidWcnLCBldmVudCwgbWVzc2FnZSwgeyAuLi5vcHRzLCBhY3RvcjogJ2h1bWFuJyB9KSxcclxuICBpbmZvOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBcclxuICAgIGxvZygnaW5mbycsIGV2ZW50LCBtZXNzYWdlLCB7IC4uLm9wdHMsIGFjdG9yOiAnaHVtYW4nIH0pLFxyXG4gIHdhcm46IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIG9wdHM/OiBhbnkpID0+IFxyXG4gICAgbG9nKCd3YXJuJywgZXZlbnQsIG1lc3NhZ2UsIHsgLi4ub3B0cywgYWN0b3I6ICdodW1hbicgfSksXHJcbiAgZXJyb3I6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIG9wdHM/OiBhbnkpID0+IFxyXG4gICAgbG9nKCdlcnJvcicsIGV2ZW50LCBtZXNzYWdlLCB7IC4uLm9wdHMsIGFjdG9yOiAnaHVtYW4nIH0pLFxyXG4gIHN1Y2Nlc3M6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIG9wdHM/OiBhbnkpID0+IFxyXG4gICAgbG9nKCdzdWNjZXNzJywgZXZlbnQsIG1lc3NhZ2UsIHsgLi4ub3B0cywgYWN0b3I6ICdodW1hbicgfSksXHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBhaSA9IHtcclxuICBkZWJ1ZzogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgb3B0cz86IGFueSkgPT4gXHJcbiAgICBsb2coJ2RlYnVnJywgZXZlbnQsIG1lc3NhZ2UsIHsgLi4ub3B0cywgYWN0b3I6ICdhaScgfSksXHJcbiAgaW5mbzogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgb3B0cz86IGFueSkgPT4gXHJcbiAgICBsb2coJ2luZm8nLCBldmVudCwgbWVzc2FnZSwgeyAuLi5vcHRzLCBhY3RvcjogJ2FpJyB9KSxcclxuICB3YXJuOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBcclxuICAgIGxvZygnd2FybicsIGV2ZW50LCBtZXNzYWdlLCB7IC4uLm9wdHMsIGFjdG9yOiAnYWknIH0pLFxyXG4gIGVycm9yOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBcclxuICAgIGxvZygnZXJyb3InLCBldmVudCwgbWVzc2FnZSwgeyAuLi5vcHRzLCBhY3RvcjogJ2FpJyB9KSxcclxuICBzdWNjZXNzOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBcclxuICAgIGxvZygnc3VjY2VzcycsIGV2ZW50LCBtZXNzYWdlLCB7IC4uLm9wdHMsIGFjdG9yOiAnYWknIH0pLFxyXG59XHJcblxyXG5leHBvcnQgY29uc3Qgc3lzdGVtID0ge1xyXG4gIGRlYnVnOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBcclxuICAgIGxvZygnZGVidWcnLCBldmVudCwgbWVzc2FnZSwgeyAuLi5vcHRzLCBhY3RvcjogJ3N5c3RlbScgfSksXHJcbiAgaW5mbzogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgb3B0cz86IGFueSkgPT4gXHJcbiAgICBsb2coJ2luZm8nLCBldmVudCwgbWVzc2FnZSwgeyAuLi5vcHRzLCBhY3RvcjogJ3N5c3RlbScgfSksXHJcbiAgd2FybjogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgb3B0cz86IGFueSkgPT4gXHJcbiAgICBsb2coJ3dhcm4nLCBldmVudCwgbWVzc2FnZSwgeyAuLi5vcHRzLCBhY3RvcjogJ3N5c3RlbScgfSksXHJcbiAgZXJyb3I6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIG9wdHM/OiBhbnkpID0+IFxyXG4gICAgbG9nKCdlcnJvcicsIGV2ZW50LCBtZXNzYWdlLCB7IC4uLm9wdHMsIGFjdG9yOiAnc3lzdGVtJyB9KSxcclxuICBzdWNjZXNzOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBcclxuICAgIGxvZygnc3VjY2VzcycsIGV2ZW50LCBtZXNzYWdlLCB7IC4uLm9wdHMsIGFjdG9yOiAnc3lzdGVtJyB9KSxcclxufVxyXG5cclxuLy8gXHU1NDExXHU1NDBFXHU1MTdDXHU1QkI5XHU3Njg0bG9nZ2VyXHJcbmV4cG9ydCBjb25zdCBsb2dnZXIgPSB7XHJcbiAgZGVidWc6IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIG9wdHM/OiBhbnkpID0+IGxvZygnZGVidWcnLCBldmVudCwgbWVzc2FnZSwgb3B0cyksXHJcbiAgaW5mbzogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgb3B0cz86IGFueSkgPT4gbG9nKCdpbmZvJywgZXZlbnQsIG1lc3NhZ2UsIG9wdHMpLFxyXG4gIHdhcm46IChldmVudDogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcsIG9wdHM/OiBhbnkpID0+IGxvZygnd2FybicsIGV2ZW50LCBtZXNzYWdlLCBvcHRzKSxcclxuICBlcnJvcjogKGV2ZW50OiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZywgb3B0cz86IGFueSkgPT4gbG9nKCdlcnJvcicsIGV2ZW50LCBtZXNzYWdlLCBvcHRzKSxcclxuICBzdWNjZXNzOiAoZXZlbnQ6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBvcHRzPzogYW55KSA9PiBsb2coJ3N1Y2Nlc3MnLCBldmVudCwgbWVzc2FnZSwgb3B0cyksXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTgzQjdcdTUzRDZcdTY1RTVcdTVGRDdcdTUyMTdcdTg4NjhcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2dzKGZpbHRlcj86IExvZ0ZpbHRlcik6IExvZ0VudHJ5W10ge1xyXG4gIGxldCByZXN1bHQgPSBbLi4ubWVtb3J5TG9nc11cclxuXHJcbiAgaWYgKGZpbHRlcikge1xyXG4gICAgaWYgKGZpbHRlci5sZXZlbCkge1xyXG4gICAgICByZXN1bHQgPSByZXN1bHQuZmlsdGVyKGxvZyA9PiBsb2cubGV2ZWwgPT09IGZpbHRlci5sZXZlbClcclxuICAgIH1cclxuICAgIGlmIChmaWx0ZXIuZXZlbnQpIHtcclxuICAgICAgcmVzdWx0ID0gcmVzdWx0LmZpbHRlcihsb2cgPT4gbG9nLmV2ZW50ID09PSBmaWx0ZXIuZXZlbnQpXHJcbiAgICB9XHJcbiAgICBpZiAoZmlsdGVyLmFjdG9yKSB7XHJcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5maWx0ZXIobG9nID0+IGxvZy5hY3RvciA9PT0gZmlsdGVyLmFjdG9yKVxyXG4gICAgfVxyXG4gICAgaWYgKGZpbHRlci5hY3RvcklkKSB7XHJcbiAgICAgIHJlc3VsdCA9IHJlc3VsdC5maWx0ZXIobG9nID0+IGxvZy5hY3RvcklkID09PSBmaWx0ZXIuYWN0b3JJZClcclxuICAgIH1cclxuICAgIGlmIChmaWx0ZXIuc2VhcmNoKSB7XHJcbiAgICAgIGNvbnN0IHNlYXJjaCA9IGZpbHRlci5zZWFyY2gudG9Mb3dlckNhc2UoKVxyXG4gICAgICByZXN1bHQgPSByZXN1bHQuZmlsdGVyKGxvZyA9PiBcclxuICAgICAgICBsb2cubWVzc2FnZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaCkgfHxcclxuICAgICAgICBsb2cuZXZlbnQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhzZWFyY2gpIHx8XHJcbiAgICAgICAgbG9nLnNvdXJjZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKHNlYXJjaClcclxuICAgICAgKVxyXG4gICAgfVxyXG4gICAgaWYgKGZpbHRlci5zdGFydFRpbWUpIHtcclxuICAgICAgcmVzdWx0ID0gcmVzdWx0LmZpbHRlcihsb2cgPT4gbmV3IERhdGUobG9nLnRpbWVzdGFtcCkgPj0gZmlsdGVyLnN0YXJ0VGltZSEpXHJcbiAgICB9XHJcbiAgICBpZiAoZmlsdGVyLmVuZFRpbWUpIHtcclxuICAgICAgcmVzdWx0ID0gcmVzdWx0LmZpbHRlcihsb2cgPT4gbmV3IERhdGUobG9nLnRpbWVzdGFtcCkgPD0gZmlsdGVyLmVuZFRpbWUhKVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHJlc3VsdFxyXG59XHJcblxyXG4vKipcclxuICogXHU4M0I3XHU1M0Q2XHU3RURGXHU4QkExXHU0RkUxXHU2MDZGXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3RhdHMoKTogTG9nU3RhdHMge1xyXG4gIGNvbnN0IHN0YXRzOiBMb2dTdGF0cyA9IHtcclxuICAgIHRvdGFsOiBtZW1vcnlMb2dzLmxlbmd0aCxcclxuICAgIGJ5TGV2ZWw6IHsgZGVidWc6IDAsIGluZm86IDAsIHdhcm46IDAsIGVycm9yOiAwLCBzdWNjZXNzOiAwLCBzeXN0ZW06IDAgfSxcclxuICAgIGJ5RXZlbnQ6IHt9LFxyXG4gICAgYnlBY3RvcjogeyBodW1hbjogMCwgYWk6IDAsIHN5c3RlbTogMCB9LFxyXG4gICAgcmVjZW50RXJyb3JzOiBbXSxcclxuICAgIGh1bWFuQWN0aXZpdHk6IDAsXHJcbiAgICBhaUFjdGl2aXR5OiAwXHJcbiAgfVxyXG5cclxuICBtZW1vcnlMb2dzLmZvckVhY2gobG9nID0+IHtcclxuICAgIC8vIFx1NjMwOVx1N0VBN1x1NTIyQlx1N0VERlx1OEJBMVxyXG4gICAgc3RhdHMuYnlMZXZlbFtsb2cubGV2ZWxdID0gKHN0YXRzLmJ5TGV2ZWxbbG9nLmxldmVsXSB8fCAwKSArIDFcclxuICAgIFxyXG4gICAgLy8gXHU2MzA5XHU0RThCXHU0RUY2XHU3RURGXHU4QkExXHJcbiAgICBzdGF0cy5ieUV2ZW50W2xvZy5ldmVudF0gPSAoc3RhdHMuYnlFdmVudFtsb2cuZXZlbnRdIHx8IDApICsgMVxyXG4gICAgXHJcbiAgICAvLyBcdTYzMDlcdTY0Q0RcdTRGNUNcdTgwMDVcdTdFREZcdThCQTFcclxuICAgIHN0YXRzLmJ5QWN0b3JbbG9nLmFjdG9yXSA9IChzdGF0cy5ieUFjdG9yW2xvZy5hY3Rvcl0gfHwgMCkgKyAxXHJcbiAgICBcclxuICAgIC8vIFx1NEVCQVx1N0M3Qi9BSVx1NkQzQlx1NTJBOFx1OEJBMVx1NjU3MFxyXG4gICAgaWYgKGxvZy5hY3RvciA9PT0gJ2h1bWFuJykgc3RhdHMuaHVtYW5BY3Rpdml0eSsrXHJcbiAgICBpZiAobG9nLmFjdG9yID09PSAnYWknKSBzdGF0cy5haUFjdGl2aXR5KytcclxuICAgIFxyXG4gICAgLy8gXHU2NTM2XHU5NkM2XHU2NzAwXHU4RkQxXHU3Njg0XHU5NTE5XHU4QkVGXHJcbiAgICBpZiAobG9nLmxldmVsID09PSAnZXJyb3InICYmIHN0YXRzLnJlY2VudEVycm9ycy5sZW5ndGggPCAxMCkge1xyXG4gICAgICBzdGF0cy5yZWNlbnRFcnJvcnMucHVzaChsb2cpXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgcmV0dXJuIHN0YXRzXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTgzQjdcdTUzRDZcdTdDRkJcdTdFREZcdThGRDBcdTg4NENcdTY1RjZcdTk1RjRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRTeXN0ZW1VcHRpbWUoKTogc3RyaW5nIHtcclxuICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKFNZU1RFTV9TVEFSVF9USU1FKVxyXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKClcclxuICBjb25zdCBkaWZmID0gbm93LmdldFRpbWUoKSAtIHN0YXJ0LmdldFRpbWUoKVxyXG4gIFxyXG4gIGNvbnN0IGhvdXJzID0gTWF0aC5mbG9vcihkaWZmIC8gKDEwMDAgKiA2MCAqIDYwKSlcclxuICBjb25zdCBtaW51dGVzID0gTWF0aC5mbG9vcigoZGlmZiAlICgxMDAwICogNjAgKiA2MCkpIC8gKDEwMDAgKiA2MCkpXHJcbiAgY29uc3Qgc2Vjb25kcyA9IE1hdGguZmxvb3IoKGRpZmYgJSAoMTAwMCAqIDYwKSkgLyAxMDAwKVxyXG4gIFxyXG4gIHJldHVybiBgJHtob3Vyc31oICR7bWludXRlc31tICR7c2Vjb25kc31zYFxyXG59XHJcblxyXG4vKipcclxuICogXHU1QkZDXHU1MUZBXHU2NUU1XHU1RkQ3XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0TG9ncyhmb3JtYXQ6ICdqc29uJyB8ICdjc3YnID0gJ2pzb24nKTogc3RyaW5nIHtcclxuICBpZiAoZm9ybWF0ID09PSAnY3N2Jykge1xyXG4gICAgY29uc3QgaGVhZGVycyA9IFsndGltZXN0YW1wJywgJ2xldmVsJywgJ2FjdG9yJywgJ2FjdG9ySWQnLCAnZXZlbnQnLCAnbWVzc2FnZScsICdzb3VyY2UnLCAndGFza0lkJywgJ2R1cmF0aW9uJ11cclxuICAgIGNvbnN0IHJvd3MgPSBtZW1vcnlMb2dzLm1hcChsb2cgPT4gW1xyXG4gICAgICBsb2cudGltZXN0YW1wLFxyXG4gICAgICBsb2cubGV2ZWwsXHJcbiAgICAgIGxvZy5hY3RvcixcclxuICAgICAgbG9nLmFjdG9ySWQgfHwgJycsXHJcbiAgICAgIGxvZy5ldmVudCxcclxuICAgICAgYFwiJHtsb2cubWVzc2FnZS5yZXBsYWNlKC9cIi9nLCAnXCJcIicpfVwiYCxcclxuICAgICAgbG9nLnNvdXJjZSxcclxuICAgICAgbG9nLnRhc2tJZCB8fCAnJyxcclxuICAgICAgbG9nLmR1cmF0aW9uIHx8ICcnXHJcbiAgICBdKVxyXG4gICAgcmV0dXJuIFtoZWFkZXJzLmpvaW4oJywnKSwgLi4ucm93cy5tYXAociA9PiByLmpvaW4oJywnKSldLmpvaW4oJ1xcbicpXHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBKU09OLnN0cmluZ2lmeShtZW1vcnlMb2dzLCBudWxsLCAyKVxyXG59XHJcblxyXG4vKipcclxuICogXHU2RTA1XHU3QTdBXHU2NUU1XHU1RkQ3XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJMb2dzKCk6IHZvaWQge1xyXG4gIG1lbW9yeUxvZ3MubGVuZ3RoID0gMFxyXG59XHJcblxyXG4vKipcclxuICogXHU4M0I3XHU1M0Q2XHU1NTJGXHU0RTAwXHU0RThCXHU0RUY2XHU1MjE3XHU4ODY4XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VW5pcXVlRXZlbnRzKCk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBldmVudHMgPSBuZXcgU2V0KG1lbW9yeUxvZ3MubWFwKGxvZyA9PiBsb2cuZXZlbnQpKVxyXG4gIHJldHVybiBBcnJheS5mcm9tKGV2ZW50cykuc29ydCgpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdTgzQjdcdTUzRDZcdTU1MkZcdTRFMDBcdTY0Q0RcdTRGNUNcdTgwMDVJRFx1NTIxN1x1ODg2OFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFVuaXF1ZUFjdG9ySWRzKCk6IHN0cmluZ1tdIHtcclxuICBjb25zdCBpZHMgPSBuZXcgU2V0KG1lbW9yeUxvZ3MuZmlsdGVyKGxvZyA9PiBsb2cuYWN0b3JJZCkubWFwKGxvZyA9PiBsb2cuYWN0b3JJZCEpKVxyXG4gIHJldHVybiBBcnJheS5mcm9tKGlkcykuc29ydCgpXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBcdThCQjBcdTVGNTVcdTdDRkJcdTdFREZcdTU0MkZcdTUyQThcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWNvcmRTeXN0ZW1TdGFydHVwKCk6IHZvaWQge1xyXG4gIGxvZygnc3lzdGVtJywgJ3N5c3RlbS5zdGFydHVwJywgJ01ldGFVbml2ZXJzZSBTeXN0ZW0gU3RhcnRlZCcsIHtcclxuICAgIGFjdG9yOiAnc3lzdGVtJyxcclxuICAgIHNvdXJjZTogJ0xvZ1N5c3RlbScsXHJcbiAgICBtZXRhZGF0YTogeyBzdGFydFRpbWU6IFNZU1RFTV9TVEFSVF9USU1FLCB2ZXJzaW9uOiAnMi4wLjAnIH1cclxuICB9KVxyXG59XHJcblxyXG4vLyBcdTgzQjdcdTUzRDZcdTY3MDBcdThGRDFcdTY1RTVcdTVGRDdcdUZGMDhcdTVGMDJcdTZCNjVcdTcyNDhcdTY3MkNcdUZGMDlcclxuYXN5bmMgZnVuY3Rpb24gZ2V0UmVjZW50KGNvdW50OiBudW1iZXIgPSAxMDAsIGxldmVsPzogTG9nTGV2ZWwpOiBQcm9taXNlPExvZ0VudHJ5W10+IHtcclxuICBsZXQgbG9ncyA9IFsuLi5tZW1vcnlMb2dzXVxyXG4gIGlmIChsZXZlbCkge1xyXG4gICAgbG9ncyA9IGxvZ3MuZmlsdGVyKGxvZyA9PiBsb2cubGV2ZWwgPT09IGxldmVsKVxyXG4gIH1cclxuICByZXR1cm4gbG9ncy5zbGljZSgwLCBjb3VudClcclxufVxyXG5cclxuLy8gXHU1RjAyXHU2QjY1XHU2N0U1XHU4QkUyXHU2NUU1XHU1RkQ3XHJcbmFzeW5jIGZ1bmN0aW9uIHF1ZXJ5TG9ncyhmaWx0ZXI6IExvZ0ZpbHRlcik6IFByb21pc2U8TG9nRW50cnlbXT4ge1xyXG4gIHJldHVybiBmaWx0ZXJMb2dzKGZpbHRlcilcclxufVxyXG5cclxuLy8gXHU2RTA1XHU3NDA2XHU2NUU3XHU2NUU1XHU1RkQ3XHJcbmFzeW5jIGZ1bmN0aW9uIGNsZWFudXAoZGF5czogbnVtYmVyID0gMzApOiBQcm9taXNlPG51bWJlcj4ge1xyXG4gIGNvbnN0IGN1dG9mZiA9IG5ldyBEYXRlKClcclxuICBjdXRvZmYuc2V0RGF0ZShjdXRvZmYuZ2V0RGF0ZSgpIC0gZGF5cylcclxuICBcclxuICBjb25zdCBvcmlnaW5hbExlbmd0aCA9IG1lbW9yeUxvZ3MubGVuZ3RoXHJcbiAgY29uc3QgZmlsdGVyZWQgPSBtZW1vcnlMb2dzLmZpbHRlcihsb2cgPT4gbmV3IERhdGUobG9nLnRpbWVzdGFtcCkgPj0gY3V0b2ZmKVxyXG4gIFxyXG4gIC8vIFx1NjZGNFx1NjVCMFx1NTE4NVx1NUI1OFx1NjVFNVx1NUZEN1xyXG4gIG1lbW9yeUxvZ3MubGVuZ3RoID0gMFxyXG4gIG1lbW9yeUxvZ3MucHVzaCguLi5maWx0ZXJlZClcclxuICBcclxuICByZXR1cm4gb3JpZ2luYWxMZW5ndGggLSBmaWx0ZXJlZC5sZW5ndGhcclxufVxyXG5cclxuLy8gXHU2REZCXHU1MkEwXHU2NUU1XHU1RkQ3XHVGRjA4XHU1RjAyXHU2QjY1XHU1MzA1XHU4OEM1XHVGRjA5XHJcbmFzeW5jIGZ1bmN0aW9uIGFkZExvZyhcclxuICBsZXZlbDogTG9nTGV2ZWwsXHJcbiAgZXZlbnQ6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgYWN0b3I6IExvZ0FjdG9yID0gJ3N5c3RlbScsXHJcbiAgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGxvZyhsZXZlbCwgZXZlbnQsIG1lc3NhZ2UsIHtcclxuICAgIGFjdG9yLFxyXG4gICAgbWV0YWRhdGEsXHJcbiAgICBzb3VyY2U6IGFjdG9yID09PSAnaHVtYW4nID8gJ2Zyb250ZW5kJyA6IGFjdG9yID09PSAnYWknID8gJ2FpLXNlcnZpY2UnIDogJ3N5c3RlbSdcclxuICB9KVxyXG59XHJcblxyXG4vLyBcdTUzNTVcdTRGOEJcdTVCOUVcdTRGOEJcclxuZXhwb3J0IGNvbnN0IGxvZ1N5c3RlbSA9IHtcclxuICBsb2csXHJcbiAgaHVtYW4sXHJcbiAgYWksXHJcbiAgc3lzdGVtLFxyXG4gIGxvZ2dlcixcclxuICBhZGQ6IGFkZExvZyxcclxuICBnZXRMb2dzLFxyXG4gIGdldFJlY2VudCxcclxuICBxdWVyeTogcXVlcnlMb2dzLFxyXG4gIGdldFN0YXRzLFxyXG4gIGdldFN5c3RlbVVwdGltZSxcclxuICBleHBvcnRMb2dzLFxyXG4gIGNsZWFyTG9ncyxcclxuICBjbGVhbnVwLFxyXG4gIGdldFVuaXF1ZUV2ZW50cyxcclxuICBnZXRVbmlxdWVBY3RvcklkcyxcclxuICByZWNvcmRTeXN0ZW1TdGFydHVwLFxyXG4gIFNZU1RFTV9TVEFSVF9USU1FXHJcbn1cclxuXHJcbmV4cG9ydCBkZWZhdWx0IGxvZ1N5c3RlbVxyXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkQ6XFxcXEFMTCBJTiBBSVxcXFxNZXRhQmxvZ1xcXFwudml0ZXByZXNzXFxcXGFnZW50XFxcXHJ1bnRpbWVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXEFMTCBJTiBBSVxcXFxNZXRhQmxvZ1xcXFwudml0ZXByZXNzXFxcXGFnZW50XFxcXHJ1bnRpbWVcXFxcYm9vdC1sb2dnZXIudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L0FMTCUyMElOJTIwQUkvTWV0YUJsb2cvLnZpdGVwcmVzcy9hZ2VudC9ydW50aW1lL2Jvb3QtbG9nZ2VyLnRzXCI7LyoqXHJcbiAqIEJvb3QgTG9nZ2VyIC0gXHU3Q0ZCXHU3RURGXHU1NDJGXHU1MkE4XHU2NUU1XHU1RkQ3XHU4QkIwXHU1RjU1XHJcbiAqIFx1NTcyOFZpdGVQcmVzc1x1NTQyRlx1NTJBOFx1NjVGNlx1OEJCMFx1NUY1NVx1NTE3M1x1OTUyRVx1N0NGQlx1N0VERlx1NEU4Qlx1NEVGNlxyXG4gKi9cclxuaW1wb3J0IHsgbG9nU3lzdGVtIH0gZnJvbSAnLi9Mb2dTeXN0ZW0nXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEJvb3RFdmVudCB7XHJcbiAgcGhhc2U6ICdpbml0JyB8ICdjb25maWcnIHwgJ3NlcnZlcicgfCAncmVhZHknIHwgJ2Vycm9yJ1xyXG4gIG1lc3NhZ2U6IHN0cmluZ1xyXG4gIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4gIHRpbWVzdGFtcDogc3RyaW5nXHJcbn1cclxuXHJcbmNsYXNzIEJvb3RMb2dnZXIge1xyXG4gIHByaXZhdGUgc3RhcnRUaW1lID0gRGF0ZS5ub3coKVxyXG4gIHByaXZhdGUgZXZlbnRzOiBCb290RXZlbnRbXSA9IFtdXHJcbiAgcHJpdmF0ZSBpc0Jvb3RlZCA9IGZhbHNlXHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5sb2coJ2luaXQnLCAnQm9vdCBsb2dnZXIgaW5pdGlhbGl6ZWQnKVxyXG4gIH1cclxuXHJcbiAgbG9nKHBoYXNlOiBCb290RXZlbnRbJ3BoYXNlJ10sIG1lc3NhZ2U6IHN0cmluZywgbWV0YWRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSB7XHJcbiAgICBjb25zdCBldmVudDogQm9vdEV2ZW50ID0ge1xyXG4gICAgICBwaGFzZSxcclxuICAgICAgbWVzc2FnZSxcclxuICAgICAgbWV0YWRhdGEsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICB9XHJcbiAgICB0aGlzLmV2ZW50cy5wdXNoKGV2ZW50KVxyXG4gICAgXHJcbiAgICAvLyBcdTdBQ0JcdTUzNzNcdTUxOTlcdTUxNjVcdTY1RTVcdTVGRDdcdTdDRkJcdTdFREZcclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lXHJcbiAgICBsb2dTeXN0ZW0uYWRkKFxyXG4gICAgICBwaGFzZSA9PT0gJ2Vycm9yJyA/ICdlcnJvcicgOiAnaW5mbycsXHJcbiAgICAgIGBib290LiR7cGhhc2V9YCxcclxuICAgICAgYFsrJHtkdXJhdGlvbn1tc10gJHttZXNzYWdlfWAsXHJcbiAgICAgICdzeXN0ZW0nLFxyXG4gICAgICB7IC4uLm1ldGFkYXRhLCBib290VGltZTogZHVyYXRpb24gfVxyXG4gICAgKS5jYXRjaChjb25zb2xlLmVycm9yKVxyXG4gIH1cclxuXHJcbiAgLy8gVml0ZVByZXNzXHU5MTREXHU3RjZFXHU1MkEwXHU4RjdEXHJcbiAgbG9nQ29uZmlnTG9hZChjb25maWdQYXRoOiBzdHJpbmcpIHtcclxuICAgIHRoaXMubG9nKCdjb25maWcnLCAnQ29uZmlndXJhdGlvbiBsb2FkZWQnLCB7IGNvbmZpZ1BhdGggfSlcclxuICB9XHJcblxyXG4gIC8vIFx1NjcwRFx1NTJBMVx1NTY2OFx1NTQyRlx1NTJBOFxyXG4gIGxvZ1NlcnZlclN0YXJ0KHBvcnQ6IG51bWJlciwgaG9zdDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLmxvZygnc2VydmVyJywgYERldiBzZXJ2ZXIgc3RhcnRlZCBvbiAke2hvc3R9OiR7cG9ydH1gLCB7IHBvcnQsIGhvc3QgfSlcclxuICB9XHJcblxyXG4gIC8vIFx1NjNEMlx1NEVGNlx1NTIxRFx1NTlDQlx1NTMxNlxyXG4gIGxvZ1BsdWdpbkluaXQocGx1Z2luTmFtZTogc3RyaW5nLCBzdGF0dXM6ICdzdWNjZXNzJyB8ICdlcnJvcicgPSAnc3VjY2VzcycpIHtcclxuICAgIHRoaXMubG9nKFxyXG4gICAgICBzdGF0dXMgPT09ICdlcnJvcicgPyAnZXJyb3InIDogJ2luaXQnLFxyXG4gICAgICBgUGx1Z2luICR7cGx1Z2luTmFtZX0gJHtzdGF0dXN9YCxcclxuICAgICAgeyBwbHVnaW5OYW1lLCBzdGF0dXMgfVxyXG4gICAgKVxyXG4gIH1cclxuXHJcbiAgLy8gXHU3Q0ZCXHU3RURGXHU1QzMxXHU3RUVBXHJcbiAgbG9nUmVhZHkoKSB7XHJcbiAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lXHJcbiAgICB0aGlzLmlzQm9vdGVkID0gdHJ1ZVxyXG4gICAgdGhpcy5sb2coJ3JlYWR5JywgJ1N5c3RlbSByZWFkeScsIHsgXHJcbiAgICAgIHRvdGFsQm9vdFRpbWU6IHRvdGFsRHVyYXRpb24sXHJcbiAgICAgIGV2ZW50Q291bnQ6IHRoaXMuZXZlbnRzLmxlbmd0aFxyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8vIFx1NTQyRlx1NTJBOFx1OTUxOVx1OEJFRlxyXG4gIGxvZ0Vycm9yKGVycm9yOiBFcnJvciwgY29udGV4dD86IHN0cmluZykge1xyXG4gICAgdGhpcy5sb2coJ2Vycm9yJywgY29udGV4dCB8fCAnQm9vdCBlcnJvcicsIHtcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSlcclxuICB9XHJcblxyXG4gIC8vIFx1ODNCN1x1NTNENlx1NTQyRlx1NTJBOFx1NjJBNVx1NTQ0QVxyXG4gIGdldEJvb3RSZXBvcnQoKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzOiB0aGlzLmlzQm9vdGVkLFxyXG4gICAgICBkdXJhdGlvbjogRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lLFxyXG4gICAgICBldmVudHM6IHRoaXMuZXZlbnRzLFxyXG4gICAgICBwaGFzZXM6IHRoaXMuZXZlbnRzLnJlZHVjZSgoYWNjLCBlKSA9PiB7XHJcbiAgICAgICAgYWNjW2UucGhhc2VdID0gKGFjY1tlLnBoYXNlXSB8fCAwKSArIDFcclxuICAgICAgICByZXR1cm4gYWNjXHJcbiAgICAgIH0sIHt9IGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vLyBcdTUzNTVcdTRGOEJcdTVCOUVcdTRGOEJcclxuZXhwb3J0IGNvbnN0IGJvb3RMb2dnZXIgPSBuZXcgQm9vdExvZ2dlcigpXHJcblxyXG4vLyBcdTRGQkZcdTUyMjlcdTUxRkRcdTY1NzBcclxuZXhwb3J0IGNvbnN0IGxvZ0Jvb3QgPSAocGhhc2U6IEJvb3RFdmVudFsncGhhc2UnXSwgbWVzc2FnZTogc3RyaW5nLCBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT4pID0+IFxyXG4gIGJvb3RMb2dnZXIubG9nKHBoYXNlLCBtZXNzYWdlLCBtZXRhZGF0YSlcclxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7QUFBb1IsU0FBUyxvQkFBb0I7QUFDalQsU0FBUyxlQUFlLFdBQVc7QUFDbkMsT0FBTyxVQUFVO0FBQ2pCLE9BQU9BLFNBQVE7QUFDZixTQUFTLGdCQUFnQjtBQUV6QixPQUFPLGNBQWM7OztBQ01yQixJQUFNLGdCQUFnQixvQkFBSSxJQUFpQztBQUMzRCxJQUFNLGVBQWUsb0JBQUksSUFBZ0Q7QUF1QmxFLFNBQVMsa0JBQWtCLFNBQWtCO0FBQ2xE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Q0Y7QUFFQSx5QkFBbUIsTUFBTTtBQUd6QixZQUFNLFFBQVEscUJBQXFCLElBQUk7QUFHdkMsWUFBTSxpQkFBaUIsTUFBTSxNQUFNLElBQUksQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFjLEtBQUssTUFBTSxjQUFjLENBQUMsRUFBRSxTQUFTLEtBQUssQ0FBQztBQUMzRyxZQUFNLGFBQWEsZUFBZSxXQUFXO0FBRTdDLGtCQUFZLEtBQUs7QUFBQSxRQUNmO0FBQUEsUUFDQSxNQUFNLGFBQWEsU0FBWSxrQkFBa0I7QUFBQSxNQUNuRCxDQUFDO0FBQUEsSUFDSDtBQUVBLGFBQVMsWUFBWSxhQUFhO0FBQ2xDLGFBQVMsUUFBUSxTQUFTLFlBQVksVUFBVSxZQUFZLFNBQVMsSUFBSSxZQUFZLFlBQVksU0FBUyxDQUFDLEVBQUUsUUFBUTtBQUFBLEVBQ3ZIO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFsiZnMiLCAiam9pbiIsICJqb2luIiwgImxvZyIsICJodW1hbiIsICJhaSIsICJzeXN0ZW0iLCAicmVjb3JkU3lzdGVtU3RhcnR1cCIsICJmcyJdCn0K
