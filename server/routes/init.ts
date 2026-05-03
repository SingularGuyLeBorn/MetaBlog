/**
 * ============================================================================
 * 路由模块 - init
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes
 */


import fs from "fs";
import path from "path";
import type { ViteDevServer } from "vite";

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
 * 注册 BFF 初始化路由
 *
 * 挂载以下 API 组：
 * 1. 安全边界 —— /api/safe-sections, /api/check-sections-boundary
 * 2. 文件 CRUD —— /api/files/read, /api/files/save, /api/files/rename, /api/files/move, /api/files/delete
 * 3. 回收站 —— /api/files/trash, /api/files/trash/list, /api/files/trash/clear, /api/files/trash/restore
 * 4. 批量导出 —— /api/files/export
 * 5. 会话/消息 —— /api/sessions, /api/sessions/:id/messages
 *
 * 安全设计：
 * - AI 只允许操作 ALLOWED_SECTIONS 中的板块(posts, knowledge, resources)
 * - 路径中禁止 "..",防止目录穿越
 * - 所有写操作自动触发 Git commit
 *
 * @param server - Vite 开发服务器实例
 * @param ctx    - 路由上下文(含 system, structuredLog, gitCommit, triggerReload)
 */
export function registerInitRoutes(server: ViteDevServer, ctx: RouteContext) {
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

  function extractSection(filePath: string): string | null {
    const normalized = filePath.replace(/^\//, "").replace(/^sections\//, "");
    const firstSlash = normalized.indexOf("/");
    return firstSlash > 0 ? normalized.substring(0, firstSlash) : normalized;
  }

  function isPathSafe(filePath: string): { safe: boolean; error?: string } {
    if (filePath.includes("..")) {
      return { safe: false, error: '路径中不允许使用 ".."' };
    }
    return { safe: true };
  }

  function checkSectionsBoundary(
    filePath: string
  ): { allowed: boolean; error?: string } {
    const normalized = filePath.replace(/^\//, "");
    if (normalized.startsWith("sections/")) {
      const section = extractSection(filePath);
      if (section) {
        const check = validateSection(section);
        if (!check.valid) return { allowed: false, error: check.error };
      }
    }
    return { allowed: true };
  }
  // ========================================

  // BFF API Server 初始化
  system.info("server.init", "BFF API Server 初始化完成");

  // 初始化 LLM Manager (简化版)
  const llmManager = null;
  try {
    // 旧版 agent 模块已移除,使用 ai-chat 模块的简化实现
    console.log("[INFO] LLM Manager 初始化跳过(使用 ai-chat 模块)");
    const defaultProvider =
      process.env.LLM_DEFAULT_PROVIDER || "deepseek";
    const dailyBudget = parseFloat(
      process.env.LLM_DAILY_BUDGET || "10",
    );

    // 辅助函数：去除引号并清理
    const clean = (v: string | undefined) =>
      v?.trim().replace(/^["']|["']$/g, "");

    // 辅助函数：按优先级读取环境变量(LLM_ 优先,兼容 VITE_ 回退)
    const env = (key: string): string | undefined => {
      const llmKey = `LLM_${key}`;
      const viteKey = `VITE_${key}`;
      return clean(process.env[llmKey]) || clean(process.env[viteKey]);
    };

    // 构建 providers 配置
    const providers: Record<string, any> = {};

    // DeepSeek
    const deepseekKey = env("DEEPSEEK_API_KEY");
    if (deepseekKey && !deepseekKey.includes("your-api-key")) {
      providers.deepseek = {
        apiKey: deepseekKey,
        model: env("DEEPSEEK_MODEL") || "deepseek-v4-pro",
        baseURL: env("DEEPSEEK_BASE_URL"),
      };
    }

    // OpenAI
    const openaiKey = env("OPENAI_API_KEY");
    if (openaiKey && !openaiKey.includes("your-api-key")) {
      providers.openai = {
        apiKey: openaiKey,
        model: env("OPENAI_MODEL") || "gpt-4o",
        baseURL: env("OPENAI_BASE_URL"),
      };
    }

    // Anthropic
    const anthropicKey = env("ANTHROPIC_API_KEY");
    if (anthropicKey && !anthropicKey.includes("your-api-key")) {
      providers.anthropic = {
        apiKey: anthropicKey,
        model: env("ANTHROPIC_MODEL") || "claude-3-5-sonnet",
        baseURL: env("ANTHROPIC_BASE_URL"),
      };
    }

    // Gemini
    const geminiKey = env("GEMINI_API_KEY");
    if (geminiKey && !geminiKey.includes("your-api-key")) {
      providers.gemini = {
        apiKey: geminiKey,
        model: env("GEMINI_MODEL") || "gemini-1.5-pro",
        baseURL: env("GEMINI_BASE_URL"),
      };
    }

    // Zhipu
    const zhipuKey = env("ZHIPU_API_KEY");
    if (zhipuKey && !zhipuKey.includes("your-api-key")) {
      providers.zhipu = {
        apiKey: zhipuKey,
        model: env("ZHIPU_MODEL") || "glm-4",
        baseURL: env("ZHIPU_BASE_URL"),
      };
    }

    // Qwen
    const qwenKey = env("QWEN_API_KEY");
    if (qwenKey && !qwenKey.includes("your-api-key")) {
      providers.qwen = {
        apiKey: qwenKey,
        model: env("QWEN_MODEL") || "qwen-plus",
        baseURL: env("QWEN_BASE_URL"),
      };
    }

    // Kimi
    const kimiKey = env("KIMI_API_KEY");
    if (kimiKey && !kimiKey.includes("your-api-key")) {
      providers.kimi = {
        apiKey: kimiKey,
        model: env("KIMI_MODEL") || "kimi-k2.5",
        baseURL: env("KIMI_BASE_URL"),
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
        `LLM Manager 初始化完成,Provider: ${Object.keys(providers).join(", ")}, 默认: ${defaultProvider}`,
      );
    }
  } catch (e) {
    system.error("server.llm", "LLM Manager 初始化失败: " + String(e));
  }

  // 后台任务调度器已移除(随 agent 模块一起移除)


  // API请求日志中间件 - 使用 system 日志(版本2 - 绕过缓存问题)
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

          // 安全校验：禁止目录遍历
          const safety = isPathSafe(filePath);
          if (!safety.safe) {
            res.statusCode = 403;
            res.end(safety.error);
            return;
          }

          // P0-CK: 支持 .vitepress/agent/ 路径(checkpoint 存储)
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

          // 边界校验：确保解析后的路径仍在 basePath 内
          if (!fullPath.startsWith(basePath)) {
            res.statusCode = 403;
            res.end("Access denied: path out of bounds");
            return;
          }

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

          // 安全校验：禁止目录遍历
          const safety = isPathSafe(filePath);
          if (!safety.safe) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: safety.error }));
            return;
          }

          // 板块边界校验：sections/ 下的路径必须在白名单内
          const boundary = checkSectionsBoundary(filePath);
          if (!boundary.allowed) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: boundary.error }));
            return;
          }

          // P0-CK: 支持 .vitepress/agent/ 路径(checkpoint 存储)
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

          // 边界校验：确保解析后的路径仍在 basePath 内
          if (!fullPath.startsWith(basePath)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: "Access denied: path out of bounds" }));
            return;
          }

          // 确保目录存在
          const dir = path.dirname(fullPath);
          await fs.promises.mkdir(dir, { recursive: true });

          // 写入文件
          await fs.promises.writeFile(fullPath, content, "utf-8");

          const duration = Date.now() - startTime;

          // 记录文件系统事件(暂时使用 system 日志)
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

          // 触发热更新 (已禁用,避免聊天页面被刷新)
          // triggerReload();
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

  // Rename file - 真正的文件重命名(修改文件名本身)
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

          // 触发热更新 (已禁用,避免聊天页面被刷新)
          // triggerReload();
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

          // 触发热更新 (已禁用,避免聊天页面被刷新)
          // triggerReload();
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
          } catch (e) { }

          // 安全校验：禁止目录遍历
          const safety = isPathSafe(decodedPath);
          if (!safety.safe) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: safety.error }));
            return;
          }

          // 板块边界校验：sections/ 下的路径必须在白名单内
          const boundary = checkSectionsBoundary(decodedPath);
          if (!boundary.allowed) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: boundary.error }));
            return;
          }

          const basePath = path.join(process.cwd(), "docs");
          const fullPath = path.resolve(
            basePath,
            decodedPath.replace(/^\//, ""),
          );

          // 边界校验：确保解析后的路径仍在 basePath 内
          if (!fullPath.startsWith(basePath)) {
            res.statusCode = 403;
            res.end(JSON.stringify({ success: false, error: "Access denied: path out of bounds" }));
            return;
          }

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

          // 触发热更新 (已禁用,避免聊天页面被刷新)
          // triggerReload();
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
            } catch (e) { }
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
            } catch (e) { }
          }

          // 如果没有元数据,尝试从文件名解析
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

          // 触发热更新 (已禁用,避免聊天页面被刷新)
          // triggerReload();
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

}
