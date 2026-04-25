import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";

import { execSync } from "child_process";
export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

export function registerAgentNativeRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
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
            const pinyinFn = require("pinyin");
            slug = (
              typeof pinyinFn === "function"
                ? pinyinFn(text, { style: "normal" })
                : pinyinFn.default
                  ? pinyinFn.default(text, { style: "normal" })
                  : text
            )
              .flat()
              .join("-");
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

}
