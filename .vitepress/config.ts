import { defineConfig, loadEnv } from "vitepress";
import { fileURLToPath, URL } from "node:url";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import https from "https";
import http from "http";
import MarkdownIt from "markdown-it";
import mathjax3 from "markdown-it-mathjax3";

// 加载 .env 文件
const env = loadEnv('', process.cwd(), 'VITE_');
const serverEnv = loadEnv('', process.cwd(), 'LLM_');

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
  info: (event: string, message: string, data?: any) => console.info(`[INFO] ${event}: ${message}`, data || ''),
  debug: (event: string, message: string, data?: any) => console.debug(`[DEBUG] ${event}: ${message}`, data || ''),
  warn: (event: string, message: string, data?: any) => console.warn(`[WARN] ${event}: ${message}`, data || ''),
  error: (event: string, message: string, data?: any) => console.error(`[ERROR] ${event}: ${message}`, data || ''),
  success: (event: string, message: string, data?: any) => console.log(`[SUCCESS] ${event}: ${message}`, data || '')
};

const structuredLog = {
  info: (event: string, message: string, data?: any) => system.info(event, message, data),
  debug: (event: string, message: string, data?: any) => system.debug(event, message, data),
  warn: (event: string, message: string, data?: any) => system.warn(event, message, data),
  error: (event: string, message: string, data?: any) => system.error(event, message, data),
  success: (event: string, message: string, data?: any) => system.success(event, message, data),
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
  ignoreDeadLinks: true,

  // Generate rewrites dynamically
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
    // Exclude visual scene modules from SSR - they use browser-only APIs
    ssr: {
      noExternal: ['three'],
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

          // ============================================
          // 优先注册 API 路由（确保在 VitePress 路由之前）
          // ============================================
          
          // Agents API - 简化版（确保在第一个 configureServer hook 中注册）
          const AGENTS_FILE = path.join(process.cwd(), '.data', 'agents.json');
          const SKILLS_FILE = path.join(process.cwd(), '.data', 'skills.json');
          
          function readAgents(): any[] {
            try {
              if (fs.existsSync(AGENTS_FILE)) {
                const agents = JSON.parse(fs.readFileSync(AGENTS_FILE, 'utf-8'));
                // 为每个 agent 添加默认值
                return agents.map((agent: any) => ({
                  ...agent,
                  capabilities: agent.capabilities || {
                    mode: 'raw',
                    skillIds: [],
                    toolIds: [],
                    customSystemPrompt: '你是一个 helpful 的 AI 助手。'
                  },
                  memory: agent.memory || {
                    enabled: true,
                    content: '',
                    autoExtract: true,
                    maxTokens: 2000
                  },
                  permissions: agent.permissions || [],
                  callCount: agent.callCount || 0,
                  isDefault: agent.isDefault || false,
                  status: agent.status || 'online',
                  seat: agent.seat || 1,
                  lastActiveAt: agent.lastActiveAt || Date.now()
                }));
              }
            } catch (e) { console.error('[API] Failed to read agents:', e); }
            return [];
          }
          
          function readSkills(): any[] {
            try {
              if (fs.existsSync(SKILLS_FILE)) {
                return JSON.parse(fs.readFileSync(SKILLS_FILE, 'utf-8'));
              }
            } catch (e) { console.error('[API] Failed to read skills:', e); }
            return [];
          }
          
          // 初始化默认数据
          function initializeDefaultData() {
            // 初始化默认 Agent
            if (!fs.existsSync(AGENTS_FILE) || readAgents().length === 0) {
              const defaultAgent = {
                id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: 'Meta 助手',
                avatar: '🤖',
                description: '基于 DeepSeek 大模型的通用 AI 助手，为您提供专业智能对话体验',
                level: 'meta',
                status: 'online',
                seat: 1,
                capabilities: {
                  mode: 'raw',
                  skillIds: [],
                  toolIds: [],
                  customSystemPrompt: '你是一个 helpful 的 AI 助手，擅长回答问题、提供建议和协助完成各种任务。'
                },
                memory: {
                  enabled: true,
                  content: '',
                  autoExtract: true,
                  maxTokens: 2000
                },
                permissions: [],
                callCount: 0,
                isDefault: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastActiveAt: Date.now()
              };
              fs.writeFileSync(AGENTS_FILE, JSON.stringify([defaultAgent], null, 2), 'utf-8');
              console.log('[API] Initialized default agent');
            }
            
            // 初始化示例 Skills (10个)
            if (!fs.existsSync(SKILLS_FILE) || readSkills().length === 0) {
              const now = Date.now();
              const defaultSkills = [
                {
                  id: `skill-${now}-1`,
                  name: '代码工匠',
                  icon: '💻',
                  description: '专业编程助手，擅长代码审查、重构和最佳实践',
                  systemPrompt: '你是一位经验丰富的程序员，精通多种编程语言。你的任务是帮助用户解决编程问题、审查代码、提供最佳实践建议、重构代码和调试错误。',
                  category: 'coding',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['编程', '代码审查', '重构', '调试'],
                  tools: ['get_current_time', 'execute_code', 'analyze_code', 'read_file', 'write_file'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-2`,
                  name: '文章大师',
                  icon: '✍️',
                  description: '专业写作助手，擅长各类文本创作和编辑',
                  systemPrompt: '你是一位专业的写作助手，擅长各类文本创作。你可以帮助用户撰写文章、编辑内容、改进文笔、检查语法错误、生成摘要和格式化文本。',
                  category: 'writing',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['写作', '编辑', '内容创作', '文案'],
                  tools: ['summarize_text', 'format_text', 'translate_text', 'create_article', 'update_article'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-3`,
                  name: '数据分析师',
                  icon: '📊',
                  description: '数据分析专家，提供统计计算和商业智能洞察',
                  systemPrompt: '你是一位数据分析师，擅长数据分析、统计计算和商业智能。你可以帮助用户理解数据、创建分析报告、提供数据驱动的洞察、执行数学计算。',
                  category: 'analysis',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['数据', '分析', '统计', '商业智能'],
                  tools: ['calculate', 'summarize_text', 'format_text', 'query_knowledge'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-4`,
                  name: '翻译专家',
                  icon: '🌐',
                  description: '多语言翻译专家，支持多种语言互译',
                  systemPrompt: '你是一位专业的翻译专家，精通多种语言。你可以帮助用户翻译文本、解释词汇、提供语言学习建议，并确保翻译的准确性和自然性。',
                  category: 'general',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['翻译', '语言', '多语言', '学习'],
                  tools: ['translate_text', 'summarize_text', 'format_text'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-5`,
                  name: '研究助手',
                  icon: '🔬',
                  description: '学术研究助手，擅长信息检索和知识整理',
                  systemPrompt: '你是一位研究助手，擅长信息检索、文献整理和知识管理。你可以帮助用户搜索信息、整理资料、创建笔记、管理知识库。',
                  category: 'analysis',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['研究', '学术', '信息检索', '知识管理'],
                  tools: ['web_search', 'fetch_url', 'query_knowledge', 'create_note', 'list_notes', 'summarize_text'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-6`,
                  name: '文件管家',
                  icon: '📁',
                  description: '文件管理专家，帮助整理和管理文件系统',
                  systemPrompt: '你是一位文件管理专家，擅长文件操作和系统管理。你可以帮助用户读取文件、写入文件、列出目录、搜索文件、管理文档。',
                  category: 'general',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['文件管理', '系统', '文档', '操作'],
                  tools: ['read_file', 'write_file', 'list_files', 'get_article_content', 'list_articles'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-7`,
                  name: '创意设计师',
                  icon: '🎨',
                  description: '创意设计助手，提供设计灵感和创意建议',
                  systemPrompt: '你是一位创意设计师，擅长提供设计灵感、创意建议和美学指导。你可以帮助用户生成创意想法、提供设计方案、优化视觉呈现。',
                  category: 'creative',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['设计', '创意', '美学', '灵感'],
                  tools: ['get_current_time', 'summarize_text', 'format_text', 'web_search'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-8`,
                  name: '项目经理',
                  icon: '📋',
                  description: '项目管理专家，帮助规划和跟踪项目进度',
                  systemPrompt: '你是一位项目经理，擅长项目规划、进度跟踪和任务管理。你可以帮助用户制定计划、分解任务、跟踪进度、管理笔记和待办事项。',
                  category: 'general',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['项目管理', '规划', '任务', '跟踪'],
                  tools: ['get_current_time', 'create_note', 'list_notes', 'summarize_text', 'format_text'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-9`,
                  name: '天气助手',
                  icon: '🌤️',
                  description: '提供天气预报和生活建议',
                  systemPrompt: '你是一位天气助手，提供准确的天气预报和实用的生活建议。你可以帮助用户查询天气、提供出行建议、推荐穿衣指南。',
                  category: 'general',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['天气', '生活', '出行', '建议'],
                  tools: ['get_weather', 'get_current_time', 'web_search'],
                  author: 'system'
                },
                {
                  id: `skill-${now}-10`,
                  name: '全栈开发者',
                  icon: '🚀',
                  description: '全栈开发专家，前后端技术全能',
                  systemPrompt: '你是一位全栈开发专家，精通前后端技术栈。你可以帮助用户构建完整的应用程序、设计系统架构、解决技术难题、优化性能。',
                  category: 'coding',
                  version: '1.0.0',
                  isBuiltIn: true,
                  enabled: true,
                  createdAt: now,
                  updatedAt: now,
                  tags: ['全栈', '前端', '后端', '架构'],
                  tools: ['execute_code', 'analyze_code', 'read_file', 'write_file', 'list_files', 'web_search', 'fetch_url'],
                  author: 'system'
                }
              ];
              fs.writeFileSync(SKILLS_FILE, JSON.stringify(defaultSkills, null, 2), 'utf-8');
              console.log('[API] Initialized 10 default skills');
            }
          }
          
          // 执行初始化
          initializeDefaultData();
          
          // GET /api/agents
          server.middlewares.use("/api/agents", (req, res, next) => {
            // 只处理精确的 /api/agents 路径（不包括子路径如 /api/agents/update）
            if (req.url !== '/' && req.url !== '' && !req.url?.startsWith('?')) {
              return next();
            }
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: readAgents() }));
            } else {
              next();
            }
          });
          
          // GET /api/skills
          server.middlewares.use("/api/skills", (req, res, next) => {
            // 只处理精确的 /api/skills 路径（不包括子路径）
            if (req.url !== '/' && req.url !== '' && !req.url?.startsWith('?')) {
              return next();
            }
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: readSkills() }));
            } else {
              next();
            }
          });

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
            const urlWithoutQuery = rawUrl.split('?')[0];
            
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
              // FIX: Encode the URL to handle Chinese characters
              if (!url.endsWith("/") && !url.endsWith(".md")) {
                res.statusCode = 301;
                // Re-encode the URL and preserve query string
                const queryString = rawUrl.includes('?') ? '?' + rawUrl.split('?')[1] : '';
                res.setHeader("Location", encodeURI(url + "/") + queryString);
                res.end();
                return;
              }

              // Skip .md files with query params (Vite internal requests)
              if (url.endsWith(".md")) {
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
            const defaultProvider = process.env.LLM_DEFAULT_PROVIDER || 'deepseek';
            const dailyBudget = parseFloat(process.env.LLM_DAILY_BUDGET || '10');
            
            // 辅助函数：去除引号并清理
            const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, '');
            
            // 构建 providers 配置
            const providers: Record<string, any> = {};
            
            // DeepSeek
            const deepseekKey = clean(process.env.VITE_DEEPSEEK_API_KEY);
            if (deepseekKey && !deepseekKey.includes('your-api-key')) {
              providers.deepseek = {
                apiKey: deepseekKey,
                model: clean(process.env.VITE_DEEPSEEK_MODEL) || 'deepseek-chat',
                baseURL: clean(process.env.VITE_DEEPSEEK_BASE_URL)
              };
            }
            
            // OpenAI
            const openaiKey = clean(process.env.VITE_OPENAI_API_KEY);
            if (openaiKey && !openaiKey.includes('your-api-key')) {
              providers.openai = {
                apiKey: openaiKey,
                model: clean(process.env.VITE_OPENAI_MODEL) || 'gpt-4o',
                baseURL: clean(process.env.VITE_OPENAI_BASE_URL)
              };
            }
            
            // Anthropic
            const anthropicKey = clean(process.env.VITE_ANTHROPIC_API_KEY);
            if (anthropicKey && !anthropicKey.includes('your-api-key')) {
              providers.anthropic = {
                apiKey: anthropicKey,
                model: clean(process.env.VITE_ANTHROPIC_MODEL) || 'claude-3-5-sonnet',
                baseURL: clean(process.env.VITE_ANTHROPIC_BASE_URL)
              };
            }
            
            // Gemini
            const geminiKey = clean(process.env.VITE_GEMINI_API_KEY);
            if (geminiKey && !geminiKey.includes('your-api-key')) {
              providers.gemini = {
                apiKey: geminiKey,
                model: clean(process.env.VITE_GEMINI_MODEL) || 'gemini-1.5-pro',
                baseURL: clean(process.env.VITE_GEMINI_BASE_URL)
              };
            }
            
            // Zhipu
            const zhipuKey = clean(process.env.VITE_ZHIPU_API_KEY);
            if (zhipuKey && !zhipuKey.includes('your-api-key')) {
              providers.zhipu = {
                apiKey: zhipuKey,
                model: clean(process.env.VITE_ZHIPU_MODEL) || 'glm-4',
                baseURL: clean(process.env.VITE_ZHIPU_BASE_URL)
              };
            }
            
            // Qwen
            const qwenKey = clean(process.env.VITE_QWEN_API_KEY);
            if (qwenKey && !qwenKey.includes('your-api-key')) {
              providers.qwen = {
                apiKey: qwenKey,
                model: clean(process.env.VITE_QWEN_MODEL) || 'qwen-plus',
                baseURL: clean(process.env.VITE_QWEN_BASE_URL)
              };
            }
            
            // Kimi
            const kimiKey = clean(process.env.VITE_KIMI_API_KEY);
            if (kimiKey && !kimiKey.includes('your-api-key')) {
              providers.kimi = {
                apiKey: kimiKey,
                model: clean(process.env.VITE_KIMI_MODEL) || 'kimi-k2.5',
                baseURL: clean(process.env.VITE_KIMI_BASE_URL)
              };
            }
            
            console.log('[LLM] Providers config:', Object.keys(providers));
            
            if (Object.keys(providers).length === 0) {
              system.warn("server.llm", "没有配置任何 LLM Provider");
            } else {
              // createLLMManager({
              //   dailyBudget,
              //   defaultProvider,
              //   providers
              // });
              
              system.info("server.llm", `LLM Manager 初始化完成，Provider: ${Object.keys(providers).join(', ')}, 默认: ${defaultProvider}`);
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
                  const isAgentPath = filePath.startsWith('.vitepress/') || filePath.startsWith('.vitepress\\')
                  const basePath = isAgentPath ? process.cwd() : path.join(process.cwd(), 'docs')
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
                  const isAgentPath = filePath.startsWith('.vitepress/') || filePath.startsWith('.vitepress\\')
                  const basePath = isAgentPath ? process.cwd() : path.join(process.cwd(), 'docs')
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
                    res.end(JSON.stringify({ success: false, error: "File not found" }));
                    return;
                  }

                  if (permanent) {
                    // 永久删除
                    fs.unlinkSync(fullPath);
                    gitCommit(fullPath, `content: 永久删除 ${path.basename(decodedPath)}`);
                  } else {
                    // 软删除：移动到 .trash 文件夹
                    const trashDir = path.join(process.cwd(), "docs", ".trash");
                    if (!fs.existsSync(trashDir)) {
                      fs.mkdirSync(trashDir, { recursive: true });
                    }
                    
                    // 生成 trash 文件名：原文件名_时间戳
                    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
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
                      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天后过期
                      originalName
                    };
                    fs.writeFileSync(metaPath, JSON.stringify(metaData, null, 2));
                    
                    gitCommit(
                      [fullPath, trashPath, metaPath].filter(p => fs.existsSync(p)),
                      `content: 删除(回收站) ${originalName}`
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
                  if (file.endsWith('.meta.json')) continue;
                  
                  const metaPath = path.join(trashDir, `${file}.meta.json`);
                  const fullPath = path.join(trashDir, file);
                  const stats = fs.statSync(fullPath);
                  
                  let meta: any = {};
                  if (fs.existsSync(metaPath)) {
                    try {
                      meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                    } catch (e) {}
                  }
                  
                  trashItems.push({
                    id: file,
                    name: file.replace(/\.\d{4}-\d{2}-\d{2}T.*$/, ''),
                    deletedAt: meta.deletedAt || stats.mtime.toISOString(),
                    expiresAt: meta.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    originalPath: meta.originalPath || 'unknown',
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
                    res.end(JSON.stringify({ success: false, error: "Trash item not found" }));
                    return;
                  }

                  // 读取元数据
                  let originalPath = '';
                  if (fs.existsSync(metaPath)) {
                    try {
                      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                      originalPath = meta.originalPath;
                    } catch (e) {}
                  }
                  
                  // 如果没有元数据，尝试从文件名解析
                  if (!originalPath) {
                    originalPath = trashId.replace(/\.\d{4}-\d{2}-\d{2}T.*\.trash$/, '');
                  }

                  const restoredPath = path.resolve(
                    process.cwd(),
                    "docs",
                    originalPath.replace(/^\//, "")
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
                    `content: 恢复文件 ${path.basename(originalPath)}`
                  );

                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: { restoredPath: originalPath } }));

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
                
                console.log('[API] Export content:', { cleanPath, fullPath, exists: fs.existsSync(fullPath) });

                if (!fs.existsSync(fullPath)) {
                  res.statusCode = 404;
                  res.end(
                    JSON.stringify({ success: false, error: "File not found: " + cleanPath }),
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
                    res.end(JSON.stringify({ success: false, error: "Path required" }));
                    return;
                  }
                  
                  // 支持 .skills 等配置目录
                  const isConfigPath = dirPath.startsWith('.') || dirPath.startsWith('_');
                  const basePath = isConfigPath ? process.cwd() : path.join(process.cwd(), 'docs');
                  const fullPath = path.resolve(basePath, dirPath);
                  
                  // 安全检查
                  if (!fullPath.startsWith(basePath)) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: "Access denied" }));
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

          // 辅助函数：轻量级扫描文章列表（用于 @ 引用）
          async function scanArticlesForList(
            dir: string,
            section: string,
            results: Array<{ path: string; title: string; section: string }>
          ): Promise<void> {
            try {
              const entries = await fs.promises.readdir(dir, { withFileTypes: true });
              
              for (const entry of entries) {
                if (entry.name.startsWith('.')) continue;
                
                const fullPath = path.join(dir, entry.name);
                const relativePath = fullPath.replace(SECTIONS_PATH + path.sep, '').replace(/\\/g, '/');
                
                if (entry.isDirectory()) {
                  await scanArticlesForList(fullPath, section, results);
                } else if (entry.isFile() && entry.name.endsWith('.md')) {
                  // 读取标题
                  let title = entry.name.replace('.md', '');
                  try {
                    const content = await fs.promises.readFile(fullPath, 'utf-8');
                    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                    if (frontmatterMatch) {
                      const titleMatch = frontmatterMatch[1].match(/^title:\s*(.+)$/m);
                      if (titleMatch) title = titleMatch[1].trim();
                    }
                    // 如果没有 frontmatter 标题，尝试从内容中提取
                    if (!title || title === entry.name.replace('.md', '')) {
                      const contentTitleMatch = content.match(/^#\s+(.+)$/m);
                      if (contentTitleMatch) title = contentTitleMatch[1].trim();
                    }
                  } catch {
                    // 忽略读取错误
                  }
                  
                  results.push({
                    path: relativePath,
                    title,
                    section
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
                  const articles: Array<{ path: string; title: string; section: string }> = [];
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
              const logs = await (structuredLog as any).getRecentLogs?.(count, level) || [];
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: logs }));
            } else next();
          });

          // 获取日志统计
          server.middlewares.use("/api/logs/stats", async (req, res, next) => {
            if (req.method === "GET") {
              const stats = await (structuredLog as any).getStats?.() || {};
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: stats }));
            } else next();
          });

          // 查询日志 (支持过滤)
          server.middlewares.use("/api/logs/query", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const url = new URL(req.url || "", `http://${req.headers.host}`);
                const LOGS_DIR = path.join(process.cwd(), '.logs');
                
                if (!fs.existsSync(LOGS_DIR)) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: [] }));
                  return;
                }
                
                // 读取所有日志文件
                const files = fs.readdirSync(LOGS_DIR).filter(f => f.endsWith('.jsonl'));
                let allLogs: any[] = [];
                
                for (const file of files) {
                  const filePath = path.join(LOGS_DIR, file);
                  const content = fs.readFileSync(filePath, 'utf-8');
                  const lines = content.split('\n').filter(Boolean);
                  for (const line of lines) {
                    try {
                      const log = JSON.parse(line);
                      // 应用过滤条件
                      const level = url.searchParams.get('level');
                      const category = url.searchParams.get('category');
                      const component = url.searchParams.get('component');
                      const keyword = url.searchParams.get('keyword');
                      
                      if (level && log.level !== level) continue;
                      if (category && log.category !== category) continue;
                      if (component && log.component !== component) continue;
                      if (keyword && !JSON.stringify(log).toLowerCase().includes(keyword.toLowerCase())) continue;
                      
                      allLogs.push(log);
                    } catch (e) {
                      // 跳过无效行
                    }
                  }
                }
                
                // 按时间倒序排序
                allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                
                // 分页
                const limit = parseInt(url.searchParams.get('limit') || '100');
                const offset = parseInt(url.searchParams.get('offset') || '0');
                const paginatedLogs = allLogs.slice(offset, offset + limit);
                
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: paginatedLogs, total: allLogs.length }));
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
                req.on("data", chunk => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const logs = body.logs || [];
                    
                    // 确保日志目录存在
                    const LOGS_DIR = path.join(process.cwd(), '.logs');
                    if (!fs.existsSync(LOGS_DIR)) {
                      fs.mkdirSync(LOGS_DIR, { recursive: true });
                    }
                    
                    // 按日期分组写入
                    const logsByDate = new Map<string, any[]>();
                    for (const log of logs) {
                      const date = new Date(log.timestamp || Date.now()).toISOString().split('T')[0];
                      if (!logsByDate.has(date)) {
                        logsByDate.set(date, []);
                      }
                      logsByDate.get(date)!.push(log);
                    }
                    
                    for (const [date, dateLogs] of logsByDate) {
                      const filePath = path.join(LOGS_DIR, `${date}.jsonl`);
                      const lines = dateLogs.map((l: any) => JSON.stringify(l)).join('\n') + '\n';
                      fs.appendFileSync(filePath, lines);
                    }
                    
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ success: true, count: logs.length }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                  }
                });
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // 清理日志
          server.middlewares.use("/api/logs/cleanup", async (req, res, next) => {
            if (req.method === "POST") {
              try {
                const chunks: Buffer[] = [];
                req.on("data", chunk => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const days = body.days ?? 7;  // 默认保留7天，days=0表示清空所有
                    
                    // 获取日志目录
                    const LOGS_DIR = path.join(process.cwd(), '.logs');
                    
                    if (!fs.existsSync(LOGS_DIR)) {
                      res.setHeader("Content-Type", "application/json");
                      res.end(JSON.stringify({ success: true, message: 'No logs to cleanup' }));
                      return;
                    }
                    
                    const files = fs.readdirSync(LOGS_DIR);
                    const now = Date.now();
                    const cutoffTime = days > 0 ? now - (days * 24 * 60 * 60 * 1000) : now;
                    
                    let deletedCount = 0;
                    for (const file of files) {
                      // 跳过审计文件和隐藏文件
                      if (file.startsWith('.') || !file.endsWith('.jsonl')) continue;
                      
                      const filePath = path.join(LOGS_DIR, file);
                      const stats = fs.statSync(filePath);
                      
                      // 如果 days=0 或文件修改时间早于 cutoffTime，则删除
                      if (days === 0 || stats.mtime.getTime() < cutoffTime) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                      }
                    }
                    
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ 
                      success: true, 
                      message: days === 0 ? 'All logs cleared' : `Logs older than ${days} days cleaned up`,
                      deletedCount 
                    }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                  }
                });
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // ============================================
          // API Debug Logs - 完整 API 交互记录
          // ============================================
          
          // POST /api/logs/api-debug - 保存 API 调试日志
          server.middlewares.use("/api/logs/api-debug", async (req, res, next) => {
            if (req.method === "POST") {
              try {
                const chunks: Buffer[] = [];
                req.on("data", chunk => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const body = JSON.parse(Buffer.concat(chunks).toString());
                    const { sessionId, startTime, endTime, totalRounds, entries } = body;
                    
                    if (!sessionId || !entries) {
                      res.statusCode = 400;
                      res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Missing required fields: sessionId, entries' 
                      }));
                      return;
                    }
                    
                    // 创建调试日志目录
                    const debugDir = path.join(process.cwd(), '.logs', 'api-debug');
                    if (!fs.existsSync(debugDir)) {
                      fs.mkdirSync(debugDir, { recursive: true });
                    }
                    
                    // 生成文件名：timestamp-sessionId.json
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const filename = `${timestamp}-${sessionId}.json`;
                    const filepath = path.join(debugDir, filename);
                    
                    // 构建完整的调试数据
                    const debugData = {
                      sessionId,
                      startTime,
                      endTime: endTime || new Date().toISOString(),
                      totalRounds,
                      entryCount: entries.length,
                      entries
                    };
                    
                    // 写入文件
                    fs.writeFileSync(filepath, JSON.stringify(debugData, null, 2), 'utf-8');
                    
                    console.log(`[API Debug] Saved to ${filename} (${entries.length} entries)`);
                    
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({
                      success: true,
                      data: {
                        filename,
                        entryCount: entries.length
                      }
                    }));
                  } catch (e) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                  }
                });
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          
          // GET /api/logs/api-debug/list - 列出所有调试日志文件
          server.middlewares.use("/api/logs/api-debug/list", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                const debugDir = path.join(process.cwd(), '.logs', 'api-debug');
                
                if (!fs.existsSync(debugDir)) {
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: [] }));
                  return;
                }
                
                const files = fs.readdirSync(debugDir).filter(f => f.endsWith('.json'));
                
                // 获取文件信息
                const fileInfos = files.map(filename => {
                  const filepath = path.join(debugDir, filename);
                  const stats = fs.statSync(filepath);
                  return {
                    filename,
                    size: stats.size,
                    createdAt: stats.ctime.toISOString()
                  };
                });
                
                // 按创建时间倒序
                fileInfos.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: fileInfos }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // POST /api/logs/session - 保存 Session 日志
          server.middlewares.use("/api/logs/session", async (req, res, next) => {
            if (req.method === "POST") {
              try {
                const chunks: Buffer[] = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                  try {
                    const sessionLog = JSON.parse(Buffer.concat(chunks).toString());
                    
                    // 保存到 .logs/sessions 目录
                    const sessionsDir = path.join(process.cwd(), '.logs', 'sessions');
                    if (!fs.existsSync(sessionsDir)) {
                      fs.mkdirSync(sessionsDir, { recursive: true });
                    }
                    
                    // 生成文件名
                    const filename = sessionLog.filename || `session-${Date.now()}.json`;
                    const filepath = path.join(sessionsDir, filename);
                    
                    // 写入文件
                    fs.writeFileSync(filepath, JSON.stringify(sessionLog, null, 2), 'utf-8');
                    
                    console.log(`[Session Log] Saved to ${filename} (${sessionLog.entries?.length || 0} entries)`);
                    
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({
                      success: true,
                      data: { filename, path: filepath }
                    }));
                  } catch (e) {
                    console.error('[Session Log] Error saving:', e);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: String(e) }));
                  }
                });
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
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

                  // 使用 Node.js fetch (兼容 Node 16+)
                  structuredLog.info("proxy.fetch.request", `Fetching ${url}`, { hostname: targetUrl.hostname });
                  
                  // 创建 AbortController 实现超时（兼容 Node 16）
                  const controller = new AbortController();
                  const timeoutId = setTimeout(() => controller.abort(), timeout);
                  
                  try {
                    const fetchResponse = await fetch(url, {
                      method: 'GET',
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                      },
                      signal: controller.signal,
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (!fetchResponse.ok) {
                      structuredLog.warn("proxy.fetch.failed", `Failed to fetch ${url}`, { status: fetchResponse.status });
                      res.statusCode = fetchResponse.status;
                      res.end(JSON.stringify({ 
                        success: false, 
                        error: `HTTP ${fetchResponse.status}: ${fetchResponse.statusText}` 
                      }));
                      return;
                    }
                    
                    const data = await fetchResponse.text();
                    structuredLog.success("proxy.fetch.completed", `Fetched ${url}`, { size: data.length });
                    
                    res.setHeader("Content-Type", fetchResponse.headers.get('content-type') || 'text/plain; charset=utf-8');
                    res.end(data);
                    
                  } catch (fetchError: any) {
                    clearTimeout(timeoutId);
                    const isTimeout = fetchError.name === 'AbortError' || fetchError.message?.includes('timeout');
                    const errorMsg = isTimeout 
                      ? `请求超时 (${timeout}ms)` 
                      : `请求失败: ${fetchError.message}`;
                    
                    structuredLog.error("proxy.fetch.error", `Error fetching ${url}`, { 
                      error: fetchError.message,
                      isTimeout 
                    });
                    
                    res.statusCode = isTimeout ? 504 : 502;
                    res.end(JSON.stringify({ 
                      success: false, 
                      error: errorMsg,
                      details: { url, hostname: targetUrl.hostname, isTimeout }
                    }));
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
                const { mcpManager } = await import("./theme/components/ai-chat/core/mcp/index");
                const tools = mcpManager.getAllTools();
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: tools }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: e instanceof Error ? e.message : String(e) 
                }));
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
                  const { tool, args = {} } = body;

                  // 获取 MCP Manager（从运行时模块）
                  const { mcpManager } = await import("./theme/components/ai-chat/core/mcp/index");
                  
                  const result = await mcpManager.execute(tool, args);
                  
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: result }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ 
                    success: false, 
                    error: e instanceof Error ? e.message : String(e) 
                  }));
                }
              });
            } else next();
          });

          // ============================================
          // GitHub API 代理 - 避免前端直接调用
          // ============================================
          
          // 获取仓库信息 - /api/github/repo/{owner}/{repo}
          // URL 格式: /api/github/repo/facebook/react
          server.middlewares.use("/api/github/repo/", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                // req.url 是相对路径，如 "facebook/react" 或 "/facebook/react"
                const url = req.url || '';
                const cleanUrl = url.split('?')[0].replace(/^\//, ''); // 移除 query string 和开头的 /
                const parts = cleanUrl.split('/').filter(Boolean);
                
                structuredLog.info("github.repo.request", `Request: ${url}`, { cleanUrl, parts });
                
                if (parts.length < 2) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Missing owner or repo' }));
                  return;
                }
                const [owner, repo] = parts;
                
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                  headers: {
                    "User-Agent": "MetaBlog-ToolTester/1.0",
                    "Accept": "application/vnd.github.v3+json"
                  }
                });
                
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end(JSON.stringify({ 
                    success: false, 
                    error: `GitHub API error: ${response.status}` 
                  }));
                  return;
                }
                
                const data = await response.json();
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: e instanceof Error ? e.message : String(e) 
                }));
              }
            } else next();
          });

          // 获取文件内容 - /api/github/file/{owner}/{repo}/{ref}/{path}
          // URL 格式: /api/github/file/octocat/Hello-World/main/README
          server.middlewares.use("/api/github/file/", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                // req.url 是相对路径，如 "octocat/Hello-World/main/README"
                const url = req.url || '';
                const cleanUrl = url.split('?')[0].replace(/^\//, '');
                const parts = cleanUrl.split('/').filter(Boolean);
                
                structuredLog.info("github.file.request", `Request: ${url}`, { cleanUrl, parts });
                
                if (parts.length < 4) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Missing owner, repo, ref or path' }));
                  return;
                }
                // 格式: owner/repo/ref/path
                const [owner, repo, ref, ...pathParts] = parts;
                const path = pathParts.join('/');
                
                const response = await fetch(
                  `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${ref}`,
                  {
                    headers: {
                      "User-Agent": "MetaBlog-ToolTester/1.0",
                      "Accept": "application/vnd.github.v3+json"
                    }
                  }
                );
                
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end(JSON.stringify({ 
                    success: false, 
                    error: `GitHub API error: ${response.status}` 
                  }));
                  return;
                }
                
                const data = await response.json();
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: e instanceof Error ? e.message : String(e) 
                }));
              }
            } else next();
          });

          // 获取提交历史 - /api/github/commits/{owner}/{repo}/{ref}
          // URL 格式: /api/github/commits/octocat/Hello-World/main
          server.middlewares.use("/api/github/commits/", async (req, res, next) => {
            if (req.method === "GET") {
              try {
                // req.url 是相对路径，如 "octocat/Hello-World/main" 或 "octocat/Hello-World"
                const url = req.url || '';
                const cleanUrl = url.split('?')[0].replace(/^\//, '');
                const parts = cleanUrl.split('/').filter(Boolean);
                
                structuredLog.info("github.commits.request", `Request: ${url}`, { cleanUrl, parts });
                
                if (parts.length < 2) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Missing owner or repo' }));
                  return;
                }
                // 格式: owner/repo 或 owner/repo/ref
                const [owner, repo, ref = 'main'] = parts;
                const per_page = new URL(url, `http://localhost`).searchParams.get('per_page') || '5';
                
                const response = await fetch(
                  `https://api.github.com/repos/${owner}/${repo}/commits?sha=${ref}&per_page=${per_page}`,
                  {
                    headers: {
                      "User-Agent": "MetaBlog-ToolTester/1.0",
                      "Accept": "application/vnd.github.v3+json"
                    }
                  }
                );
                
                if (!response.ok) {
                  res.statusCode = response.status;
                  res.end(JSON.stringify({ 
                    success: false, 
                    error: `GitHub API error: ${response.status}` 
                  }));
                  return;
                }
                
                const data = await response.json();
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify(data));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ 
                  success: false, 
                  error: e instanceof Error ? e.message : String(e) 
                }));
              }
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
          // Chat Session API - 对话会话持久化
          // ============================================

          const SESSIONS_DIR = path.join(process.cwd(), '.vitepress/agent/sessions');
          
          // 确保会话目录存在
          if (!fs.existsSync(SESSIONS_DIR)) {
            fs.mkdirSync(SESSIONS_DIR, { recursive: true });
          }

          // 获取会话列表 / 保存会话
          // FIX: 使用精确路径匹配，避免匹配到 /api/chat/sessions/delete 等子路径
          server.middlewares.use('/api/chat/sessions', (req, res, next) => {
            // 只处理精确路径 /api/chat/sessions，不匹配子路径
            const url = req.url || '';
            const basePath = '/api/chat/sessions';
            const remainder = url.slice(basePath.length);
            
            // 如果路径后面还有内容（如 /delete, /detail），交给后续中间件
            if (remainder && remainder !== '/' && !remainder.startsWith('?')) {
              return next();
            }
            
            if (req.method === 'GET') {
              try {
                if (!fs.existsSync(SESSIONS_DIR)) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, data: [] }));
                  return;
                }
                
                const files = fs.readdirSync(SESSIONS_DIR)
                  .filter(f => f.endsWith('.json'))
                  .map(f => {
                    const filePath = path.join(SESSIONS_DIR, f);
                    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                    // 返回摘要（不包含完整消息）
                    return {
                      id: data.id,
                      title: data.title,
                      createdAt: data.createdAt,
                      updatedAt: data.updatedAt,
                      messageCount: data.messages?.length || 0
                    };
                  })
                  .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: files }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else if (req.method === 'POST') {
              // 创建/保存会话
              const chunks: Buffer[] = [];
              req.on('data', (chunk: any) => chunks.push(chunk));
              req.on('end', () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, title, messages } = body;
                  
                  if (!id) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Session ID required', received: body }));
                    return;
                  }
                  
                  // FIX: 确保 messages 是数组
                  if (messages && !Array.isArray(messages)) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Messages must be an array' }));
                    return;
                  }
                  
                  const sessionData = {
                    id,
                    title: title || '新会话',
                    messages: messages || [],
                    createdAt: body.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  
                  const filePath = path.join(SESSIONS_DIR, `${id}.json`);
                  fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2), 'utf-8');
                  
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, data: sessionData }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // 获取单个会话详情
          server.middlewares.use('/api/chat/sessions/detail', (req, res, next) => {
            if (req.method === 'GET') {
              try {
                const url = new URL(req.url || '', `http://${req.headers.host}`);
                const sessionId = url.searchParams.get('id');
                
                if (!sessionId) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ success: false, error: 'Session ID required' }));
                  return;
                }
                
                const filePath = path.join(SESSIONS_DIR, `${sessionId}.json`);
                if (!fs.existsSync(filePath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'Session not found' }));
                  return;
                }
                
                const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                // FIX: 确保返回的数据格式正确
                const safeData = {
                  id: data.id || sessionId,
                  title: data.title || '未命名会话',
                  messages: Array.isArray(data.messages) ? data.messages : [],
                  createdAt: data.createdAt || new Date().toISOString(),
                  updatedAt: data.updatedAt || new Date().toISOString()
                };
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, data: safeData }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });

          // 删除会话
          server.middlewares.use('/api/chat/sessions/delete', (req, res, next) => {
            if (req.method === 'POST') {
              const chunks: Buffer[] = [];
              req.on('data', (chunk: any) => chunks.push(chunk));
              req.on('end', () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;
                  
                  if (!id) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Session ID required' }));
                    return;
                  }
                  
                  const filePath = path.join(SESSIONS_DIR, `${id}.json`);
                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                  }
                  
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true, message: 'Session deleted' }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });

          // ============================================
          // Chat API - 流式消息发送
          // ============================================
          server.middlewares.use('/api/chat', async (req, res, next) => {
            if (req.method !== 'POST') return next();
            
            const chunks: Buffer[] = [];
            req.on('data', (chunk: any) => chunks.push(chunk));
            req.on('end', async () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const { messages, model, temperature, maxTokens, stream } = body;
                
                console.log('[API Chat] Request received:', { model, messages: messages?.length, stream });
                
                // 导入 LLM Manager
                // const { getLLMManager } = await import('./agent/llm');
                // const llm = getLLMManager();
                const llm: any = { 
                  chat: async () => ({ content: 'Not Implemented' }),
                  chatStream: async (opts: any, cb: any) => cb({ finishReason: 'unsupported' })
                };
                
                // 非流式响应
                if (stream === false) {
                  console.log('[API Chat] Non-streaming request');
                  const response = await llm.chat({
                    messages,
                    model,
                    temperature,
                    maxTokens
                  });
                  
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ 
                    success: true, 
                    data: {
                      content: response.content,
                      model: response.model,
                      usage: response.usage
                    }
                  }));
                  return;
                }
                
                // 流式响应
                console.log('[API Chat] Starting streaming response');
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                
                const abortController = new AbortController();
                let isEnded = false;
                let chunkCount = 0;
                
                req.on('close', () => {
                  console.log('[API Chat] Request closed by client');
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
                    (chunk: any) => {
                      if (isEnded) return;
                      
                      chunkCount++;
                      if (chunkCount <= 3 || chunk.finishReason) {
                        console.log(`[API Chat] Chunk ${chunkCount}:`, { 
                          content: chunk.content?.substring(0, 50),
                          finishReason: chunk.finishReason 
                        });
                      }
                      
                      const data: any = {
                        content: chunk.content,
                        reasoning: chunk.reasoning,
                        isReasoning: !!chunk.reasoning
                      };
                      
                      if (chunk.finishReason) {
                        data.finishReason = chunk.finishReason;
                        data.usage = chunk.usage;
                      }
                      
                      res.write(`data: ${JSON.stringify(data)}\n\n`);
                      
                      if (chunk.finishReason) {
                        res.write('data: [DONE]\n\n');
                        res.end();
                        isEnded = true;
                        console.log('[API Chat] Stream finished, total chunks:', chunkCount);
                      }
                    }
                  );
                  
                  if (!isEnded) {
                    console.log('[API Chat] Stream ended without finishReason');
                    res.write('data: [DONE]\n\n');
                    res.end();
                  }
                } catch (streamError) {
                  console.error('[API Chat] Stream error:', streamError);
                  throw streamError;
                }
                
              } catch (error) {
                console.error('[API Chat Error]', error);
                if (!res.headersSent) {
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ 
                    success: false, 
                    error: error instanceof Error ? error.message : 'Chat failed'
                  }));
                } else {
                  res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
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

          server.middlewares.use("/api/agent/tasks", (req, res, next) => {
            if (req.method === "GET") {
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: [] }));
            } else next();
          });

          // ============================================
          // Agent CRUD API - 持久化存储
          // ============================================
          
          const AGENTS_FILE = path.join(process.cwd(), '.data', 'agents.json');
          
          // 确保数据目录存在
          if (!fs.existsSync(path.dirname(AGENTS_FILE))) {
            fs.mkdirSync(path.dirname(AGENTS_FILE), { recursive: true });
          }
          
          // 读取 Agents
          function readAgents(): any[] {
            try {
              if (fs.existsSync(AGENTS_FILE)) {
                const data = fs.readFileSync(AGENTS_FILE, 'utf-8');
                const agents = JSON.parse(data);
                // 为每个 agent 添加默认值
                return agents.map((agent: any) => ({
                  ...agent,
                  capabilities: agent.capabilities || {
                    mode: 'raw',
                    skillIds: [],
                    toolIds: [],
                    customSystemPrompt: '你是一个 helpful 的 AI 助手。'
                  },
                  memory: agent.memory || {
                    enabled: true,
                    content: '',
                    autoExtract: true,
                    maxTokens: 2000
                  },
                  permissions: agent.permissions || [],
                  callCount: agent.callCount || 0,
                  isDefault: agent.isDefault || false,
                  status: agent.status || 'online',
                  seat: agent.seat || 1,
                  lastActiveAt: agent.lastActiveAt || Date.now()
                }));
              }
            } catch (e) {
              console.error('[API] Failed to read agents:', e);
            }
            return [];
          }
          
          // 写入 Agents
          function writeAgents(agents: any[]) {
            try {
              fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2), 'utf-8');
            } catch (e) {
              console.error('[API] Failed to write agents:', e);
            }
          }
          
          // 初始化默认 Agent（如果没有数据）
          function initializeDefaultAgent() {
            const agents = readAgents();
            if (agents.length === 0) {
              const defaultAgent = {
                id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                name: 'Meta 助手',
                avatar: '🤖',
                description: '基于 DeepSeek 大模型的通用 AI 助手，为您提供专业智能对话体验',
                level: 'meta',
                status: 'online',
                seat: 1,
                capabilities: {
                  mode: 'raw',
                  skillIds: [],
                  toolIds: [],
                  customSystemPrompt: '你是一个 helpful 的 AI 助手，擅长回答问题、提供建议和协助完成各种任务。'
                },
                memory: {
                  enabled: true,
                  content: '',
                  autoExtract: true,
                  maxTokens: 2000
                },
                permissions: [],
                callCount: 0,
                isDefault: true,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                lastActiveAt: Date.now()
              };
              writeAgents([defaultAgent]);
              console.log('[API] Initialized default agent');
            }
          }
          
          // 执行初始化
          initializeDefaultAgent();
          
          // GET /api/agents - 获取所有 Agents
          // POST /api/agents - 创建 Agent（只处理精确路径，不包括子路径）
          server.middlewares.use("/api/agents", (req, res, next) => {
            const url = req.url || '';
            // 只处理精确路径 /api/agents 或 /api/agents/（不包括 /api/agents/update 等子路径）
            if (url !== '/' && url !== '' && !url.startsWith('?')) {
              return next();
            }
            
            if (req.method === "GET") {
              const agents = readAgents();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: agents }));
            } else if (req.method === "POST") {
              // POST /api/agents - 创建 Agent
              const chunks: Buffer[] = [];
              req.on("data", chunk => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const agents = readAgents();
                  
                  const newAgent = {
                    id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    name: body.name || 'New Agent',
                    avatar: body.avatar || '🤖',
                    description: body.description || 'A helpful AI agent',
                    level: body.level || 'custom',
                    status: 'online',
                    seat: 1,
                    capabilities: body.capabilities || {
                      mode: 'raw',
                      skillIds: [],
                      toolIds: [],
                      customSystemPrompt: '你是一个 helpful 的 AI 助手。'
                    },
                    memory: body.memory || {
                      enabled: true,
                      content: '',
                      autoExtract: true,
                      maxTokens: 2000
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
          
          // PUT /api/agents/:id - 更新 Agent
          server.middlewares.use("/api/agents/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", chunk => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;
                  
                  const agents = readAgents();
                  const index = agents.findIndex((a: any) => a.id === id);
                  
                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: 'Agent not found' }));
                    return;
                  }
                  
                  agents[index] = { ...agents[index], ...updates, updatedAt: Date.now() };
                  writeAgents(agents);
                  
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: agents[index] }));
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
              req.on("data", chunk => chunks.push(chunk));
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
              req.on("data", chunk => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { agentId, triggerId } = body;
                  
                  let agents = readAgents();
                  const agent = agents.find((a: any) => a.id === agentId);
                  
                  if (!agent) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: 'Agent not found' }));
                    return;
                  }
                  
                  // 更新触发统计
                  if (agent.triggers) {
                    const trigger = agent.triggers.find((t: any) => t.id === triggerId);
                    if (trigger) {
                      trigger.lastTriggered = new Date().toISOString();
                      trigger.triggerCount = (trigger.triggerCount || 0) + 1;
                    }
                  }
                  
                  // 更新 Agent 运行统计
                  agent.totalRuns = (agent.totalRuns || 0) + 1;
                  agent.lastRunAt = Date.now();
                  agent.status = 'running';
                  agent.updatedAt = Date.now();
                  
                  writeAgents(agents);
                  
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ 
                    success: true, 
                    data: { agent, triggered: true }
                  }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          
          // GET /api/agents/:id - 获取单个 Agent
          server.middlewares.use("/api/agents/", (req, res, next) => {
            const url = req.url || '';
            // 只处理 /api/agents/:id 格式，排除其他子路径
            if (url.includes('/') && !url.includes('/active')) {
              const id = url.split('/')[1]?.split('?')[0];
              if (!id || req.method !== 'GET') return next();
              
              try {
                const agents = readAgents();
                const agent = agents.find((a: any) => a.id === id);
                
                if (!agent) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'Agent not found' }));
                  return;
                }
                
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: agent }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          
          // GET/POST /api/agents/active - 活跃 Agent 管理
          const ACTIVE_AGENT_FILE = path.join(process.cwd(), '.data', 'active-agent.json');
          
          server.middlewares.use("/api/agents/active", (req, res, next) => {
            if (req.method === "GET") {
              // 获取活跃 Agent ID
              try {
                let activeId = null;
                if (fs.existsSync(ACTIVE_AGENT_FILE)) {
                  const data = JSON.parse(fs.readFileSync(ACTIVE_AGENT_FILE, 'utf-8'));
                  activeId = data.id;
                }
                // 如果没有设置，返回第一个 agent
                if (!activeId) {
                  const agents = readAgents();
                  activeId = agents[0]?.id || null;
                }
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, id: activeId }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else if (req.method === "POST") {
              // 设置活跃 Agent ID
              const chunks: Buffer[] = [];
              req.on("data", chunk => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;
                  
                  fs.writeFileSync(ACTIVE_AGENT_FILE, JSON.stringify({ id, updatedAt: Date.now() }), 'utf-8');
                  
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
          
          const SKILLS_FILE = path.join(process.cwd(), '.data', 'skills.json');
          
          // 确保数据目录存在
          if (!fs.existsSync(path.dirname(SKILLS_FILE))) {
            fs.mkdirSync(path.dirname(SKILLS_FILE), { recursive: true });
          }
          
          // 读取 Skills
          function readSkills(): any[] {
            try {
              if (fs.existsSync(SKILLS_FILE)) {
                const data = fs.readFileSync(SKILLS_FILE, 'utf-8');
                return JSON.parse(data);
              }
            } catch (e) {
              console.error('[API] Failed to read skills:', e);
            }
            return [];
          }
          
          // 写入 Skills
          function writeSkills(skills: any[]) {
            try {
              fs.writeFileSync(SKILLS_FILE, JSON.stringify(skills, null, 2), 'utf-8');
            } catch (e) {
              console.error('[API] Failed to write skills:', e);
            }
          }
          
          // GET /api/skills - 获取所有 Skills
          server.middlewares.use("/api/skills", (req, res, next) => {
            const url = req.url || '';
            // 排除子路径，只处理 /api/skills 或 /api/skills/
            if (url !== '/' && url !== '' && !url.startsWith('?')) {
              return next();
            }
            
            if (req.method === "GET") {
              const skills = readSkills();
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true, data: skills }));
            } else if (req.method === "POST") {
              // POST /api/skills - 创建 Skill
              const chunks: Buffer[] = [];
              req.on("data", chunk => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const skills = readSkills();
                  
                  const newSkill = {
                    id: `skill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
                    ...body,
                    isBuiltIn: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  
                  skills.push(newSkill);
                  writeSkills(skills);
                  
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
            const url = req.url || '';
            // 处理 /api/skills/:id 格式
            const parts = url.split('/');
            if (parts.length < 2 || parts[1].includes('update') || parts[1].includes('delete')) {
              return next();
            }
            
            if (req.method === "GET") {
              const id = parts[1].split('?')[0];
              try {
                const skills = readSkills();
                const skill = skills.find((s: any) => s.id === id);
                
                if (!skill) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ success: false, error: 'Skill not found' }));
                  return;
                }
                
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true, data: skill }));
              } catch (e) {
                res.statusCode = 500;
                res.end(JSON.stringify({ success: false, error: String(e) }));
              }
            } else next();
          });
          
          // PATCH /api/skills/:id - 更新 Skill
          server.middlewares.use("/api/skills/update", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", chunk => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id, ...updates } = body;
                  
                  const skills = readSkills();
                  const index = skills.findIndex((s: any) => s.id === id);
                  
                  if (index === -1) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: 'Skill not found' }));
                    return;
                  }
                  
                  // 不允许修改内置技能标记
                  delete updates.isBuiltIn;
                  delete updates.id;
                  
                  skills[index] = { ...skills[index], ...updates, updatedAt: Date.now() };
                  writeSkills(skills);
                  
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true, data: skills[index] }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
            } else next();
          });
          
          // DELETE /api/skills/:id - 删除 Skill
          server.middlewares.use("/api/skills/delete", (req, res, next) => {
            if (req.method === "POST") {
              const chunks: Buffer[] = [];
              req.on("data", chunk => chunks.push(chunk));
              req.on("end", () => {
                try {
                  const body = JSON.parse(Buffer.concat(chunks).toString());
                  const { id } = body;
                  
                  let skills = readSkills();
                  const skill = skills.find((s: any) => s.id === id);
                  
                  if (skill && skill.isBuiltIn) {
                    res.statusCode = 403;
                    res.end(JSON.stringify({ success: false, error: 'Cannot delete built-in skill' }));
                    return;
                  }
                  
                  skills = skills.filter((s: any) => s.id !== id);
                  writeSkills(skills);
                  
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ success: true }));
                } catch (e) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: String(e) }));
                }
              });
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
