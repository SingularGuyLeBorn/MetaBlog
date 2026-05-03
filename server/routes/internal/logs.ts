/**
 * ============================================================================
 * 内部业务路由 - logs
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes/internal
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
 * 注册日志系统路由
 *
 * 挂载 /api/logs/* 端点,支持：
 * - /api/logs/read —— 按标签、时间范围、关键词过滤读取日志
 * - /api/logs/write —— 写入结构化日志
 * - /api/logs/stream —— SSE 实时日志流(用于前端日志面板)
 * - /api/logs/sessions —— 会话日志查询
 *
 * 日志存储在 .logs/ 目录下,按日期分文件(YYYY-MM-DD.jsonl). 
 *
 * @param server - Vite 开发服务器实例
 * @param ctx    - 路由上下文
 */
export function registerLogsRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // Logs API - 日志系统(使用LogSystem)
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
      const logs =
        (await (structuredLog as any).getRecentLogs?.(count, level)) ||
        [];
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: logs }));
    } else next();
  });

  // 获取日志统计
  server.middlewares.use("/api/logs/stats", async (req, res, next) => {
    if (req.method === "GET") {
      const stats = (await (structuredLog as any).getStats?.()) || {};
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: stats }));
    } else next();
  });

  // 查询日志 (支持过滤)
  server.middlewares.use("/api/logs/query", async (req, res, next) => {
    if (req.method === "GET") {
      try {
        const url = new URL(
          req.url || "",
          `http://${req.headers.host}`,
        );
        const LOGS_DIR = path.join(process.cwd(), ".logs");

        if (!fs.existsSync(LOGS_DIR)) {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: [] }));
          return;
        }

        // 读取所有日志文件
        const files = fs
          .readdirSync(LOGS_DIR)
          .filter((f) => f.endsWith(".jsonl"));
        let allLogs: any[] = [];

        for (const file of files) {
          const filePath = path.join(LOGS_DIR, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const lines = content.split("\n").filter(Boolean);
          for (const line of lines) {
            try {
              const log = JSON.parse(line);
              // 应用过滤条件
              const level = url.searchParams.get("level");
              const category = url.searchParams.get("category");
              const component = url.searchParams.get("component");
              const keyword = url.searchParams.get("keyword");

              if (level && log.level !== level) continue;
              if (category && log.category !== category) continue;
              if (component && log.component !== component) continue;
              if (
                keyword &&
                !JSON.stringify(log)
                  .toLowerCase()
                  .includes(keyword.toLowerCase())
              )
                continue;

              allLogs.push(log);
            } catch (e) {
              // 跳过无效行
            }
          }
        }

        // 按时间倒序排序
        allLogs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        // 分页
        const limit = parseInt(url.searchParams.get("limit") || "100");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        const paginatedLogs = allLogs.slice(offset, offset + limit);

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            data: paginatedLogs,
            total: allLogs.length,
          }),
        );
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
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const logs = body.logs || [];

            // 确保日志目录存在
            const LOGS_DIR = path.join(process.cwd(), ".logs");
            if (!fs.existsSync(LOGS_DIR)) {
              fs.mkdirSync(LOGS_DIR, { recursive: true });
            }

            // 按日期分组写入
            const logsByDate = new Map<string, any[]>();
            for (const log of logs) {
              const date = new Date(log.timestamp || Date.now())
                .toISOString()
                .split("T")[0];
              if (!logsByDate.has(date)) {
                logsByDate.set(date, []);
              }
              logsByDate.get(date)!.push(log);
            }

            for (const [date, dateLogs] of logsByDate) {
              const filePath = path.join(LOGS_DIR, `${date}.jsonl`);
              const lines =
                dateLogs.map((l: any) => JSON.stringify(l)).join("\n") +
                "\n";
              fs.appendFileSync(filePath, lines);
            }

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ success: true, count: logs.length }),
            );
          } catch (e) {
            res.statusCode = 500;
            res.end(
              JSON.stringify({ success: false, error: String(e) }),
            );
          }
        });
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else next();
  });

  // 清理日志
  server.middlewares.use(
    "/api/logs/cleanup",
    async (req, res, next) => {
      if (req.method === "POST") {
        try {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString());
              const days = body.days ?? 7; // 默认保留7天,days=0表示清空所有

              // 获取日志目录
              const LOGS_DIR = path.join(process.cwd(), ".logs");

              if (!fs.existsSync(LOGS_DIR)) {
                res.setHeader("Content-Type", "application/json");
                res.end(
                  JSON.stringify({
                    success: true,
                    message: "No logs to cleanup",
                  }),
                );
                return;
              }

              const files = fs.readdirSync(LOGS_DIR);
              const now = Date.now();
              const cutoffTime =
                days > 0 ? now - days * 24 * 60 * 60 * 1000 : now;

              let deletedCount = 0;
              for (const file of files) {
                // 跳过审计文件和隐藏文件
                if (file.startsWith(".") || !file.endsWith(".jsonl"))
                  continue;

                const filePath = path.join(LOGS_DIR, file);
                const stats = fs.statSync(filePath);

                // 如果 days=0 或文件修改时间早于 cutoffTime,则删除
                if (days === 0 || stats.mtime.getTime() < cutoffTime) {
                  fs.unlinkSync(filePath);
                  deletedCount++;
                }
              }

              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  message:
                    days === 0
                      ? "All logs cleared"
                      : `Logs older than ${days} days cleaned up`,
                  deletedCount,
                }),
              );
            } catch (e) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({ success: false, error: String(e) }),
              );
            }
          });
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      } else next();
    },
  );

  // ============================================
  // API Debug Logs - 完整 API 交互记录
  // ============================================

  // POST /api/logs/api-debug - 保存 API 调试日志
  server.middlewares.use(
    "/api/logs/api-debug",
    async (req, res, next) => {
      if (req.method === "POST") {
        try {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString());
              const {
                sessionId,
                startTime,
                endTime,
                totalRounds,
                entries,
              } = body;

              if (!sessionId || !entries) {
                res.statusCode = 400;
                res.end(
                  JSON.stringify({
                    success: false,
                    error:
                      "Missing required fields: sessionId, entries",
                  }),
                );
                return;
              }

              // 创建调试日志目录
              const debugDir = path.join(
                process.cwd(),
                ".logs",
                "api-debug",
              );
              if (!fs.existsSync(debugDir)) {
                fs.mkdirSync(debugDir, { recursive: true });
              }

              // 生成文件名：timestamp-sessionId.json
              const timestamp = new Date()
                .toISOString()
                .replace(/[:.]/g, "-");
              const filename = `${timestamp}-${sessionId}.json`;
              const filepath = path.join(debugDir, filename);

              // 构建完整的调试数据
              const debugData = {
                sessionId,
                startTime,
                endTime: endTime || new Date().toISOString(),
                totalRounds,
                entryCount: entries.length,
                entries,
              };

              // 写入文件
              fs.writeFileSync(
                filepath,
                JSON.stringify(debugData, null, 2),
                "utf-8",
              );

              console.log(
                `[API Debug] Saved to ${filename} (${entries.length} entries)`,
              );

              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  data: {
                    filename,
                    entryCount: entries.length,
                  },
                }),
              );
            } catch (e) {
              res.statusCode = 500;
              res.end(
                JSON.stringify({ success: false, error: String(e) }),
              );
            }
          });
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      } else next();
    },
  );

  // GET /api/logs/api-debug/list - 列出所有调试日志文件
  server.middlewares.use(
    "/api/logs/api-debug/list",
    async (req, res, next) => {
      if (req.method === "GET") {
        try {
          const debugDir = path.join(
            process.cwd(),
            ".logs",
            "api-debug",
          );

          if (!fs.existsSync(debugDir)) {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, data: [] }));
            return;
          }

          const files = fs
            .readdirSync(debugDir)
            .filter((f) => f.endsWith(".json"));

          // 获取文件信息
          const fileInfos = files.map((filename) => {
            const filepath = path.join(debugDir, filename);
            const stats = fs.statSync(filepath);
            return {
              filename,
              size: stats.size,
              createdAt: stats.ctime.toISOString(),
            };
          });

          // 按创建时间倒序
          fileInfos.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() -
              new Date(a.createdAt).getTime(),
          );

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: fileInfos }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      } else next();
    },
  );

  // POST /api/logs/session - 保存 Session 日志
  server.middlewares.use(
    "/api/logs/session",
    async (req, res, next) => {
      if (req.method === "POST") {
        try {
          const chunks: Buffer[] = [];
          req.on("data", (chunk) => chunks.push(chunk));
          req.on("end", async () => {
            try {
              const sessionLog = JSON.parse(
                Buffer.concat(chunks).toString(),
              );

              // 保存到 .logs/sessions 目录
              const sessionsDir = path.join(
                process.cwd(),
                ".logs",
                "sessions",
              );
              if (!fs.existsSync(sessionsDir)) {
                fs.mkdirSync(sessionsDir, { recursive: true });
              }

              // 生成文件名
              const filename =
                sessionLog.filename || `session-${Date.now()}.json`;
              const filepath = path.join(sessionsDir, filename);

              // 写入文件
              fs.writeFileSync(
                filepath,
                JSON.stringify(sessionLog, null, 2),
                "utf-8",
              );

              console.log(
                `[Session Log] Saved to ${filename} (${sessionLog.entries?.length || 0} entries)`,
              );

              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  success: true,
                  data: { filename, path: filepath },
                }),
              );
            } catch (e) {
              console.error("[Session Log] Error saving:", e);
              res.statusCode = 500;
              res.end(
                JSON.stringify({ success: false, error: String(e) }),
              );
            }
          });
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      } else next();
    },
  );

  // GET /api/logs/export - 导出日志
  server.middlewares.use("/api/logs/export", async (req, res, next) => {
    if (req.method === "GET") {
      try {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const startDate = url.searchParams.get("startDate");
        const endDate = url.searchParams.get("endDate");

        const LOGS_DIR = path.join(process.cwd(), ".logs");
        let allLogs: any[] = [];

        // 读取所有日志文件
        if (fs.existsSync(LOGS_DIR)) {
          const files = fs.readdirSync(LOGS_DIR).filter((f) => f.endsWith(".jsonl"));

          for (const file of files) {
            // 检查文件名是否符合日期范围
            if (startDate && !file.includes(startDate)) continue;
            if (endDate && !file.includes(endDate)) continue;

            const filePath = path.join(LOGS_DIR, file);
            const content = fs.readFileSync(filePath, "utf-8");
            const lines = content.split("\n").filter(Boolean);

            for (const line of lines) {
              try {
                const log = JSON.parse(line);
                allLogs.push(log);
              } catch (e) {
                // 跳过无效行
              }
            }
          }
        }

        // 按时间排序
        allLogs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        // 设置下载响应头
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="logs-export-${Date.now()}.json"`);
        res.end(JSON.stringify({
          success: true,
          exportedAt: Date.now(),
          count: allLogs.length,
          logs: allLogs
        }, null, 2));
      } catch (e) {
        console.error("[Logs Export] Error:", e);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else next();
  });

}
