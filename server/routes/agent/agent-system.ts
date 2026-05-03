/**
 * ============================================================================
 * Agent 路由 - agent-system
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/routes/agent
 */


import fs from "fs";
import path from "path";
import type { ViteDevServer } from "vite";

import { getAgentRuntimeManager } from "../../mcp-tools/agent-runtime-manager";
import { getMetaAgentManager } from "../../mcp-tools/meta-agent-manager";
import { getReportAgentManager } from "../../mcp-tools/report-agent-manager";
import { getTaskManager } from "../../mcp-tools/task-manager";
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
 * 注册 Agent 系统管理路由
 *
 * 挂载以下 API 组：
 * 1. 任务管理 —— /api/agent/tasks/*(CRUD + 状态流转)
 * 2. 运行时管理 —— /api/agent/runtime/*(Agent 生命周期)
 * 3. 元 Agent —— /api/agent/meta/*(Meta-Agent 调度)
 * 4. 报告 Agent —— /api/agent/report/*(报告生成与导出)
 * 5. Agent CRUD —— /api/agents/*(持久化到 .data/agents.json)
 *
 * 初始化时会自动创建默认 Agent(当 agents.json 为空时). 
 *
 * @param server - Vite 开发服务器实例
 * @param ctx    - 路由上下文
 */
export function registerAgentSystemRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // Task Manager API - 任务调度系统
  // ============================================
  const taskManager = getTaskManager();

  // 获取任务模板列表
  server.middlewares.use(
    "/api/agent/tasks/templates",
    (req, res, next) => {
      if (req.method === "GET") {
        const templates = taskManager.getTemplates();
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            data: templates,
          }),
        );
      } else next();
    },
  );

  // 触发任务
  server.middlewares.use(
    "/api/agent/tasks/trigger",
    async (req, res, next) => {
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const task = taskManager.createTask({
              name: body.name || `${body.type} Task`,
              description: body.description,
              type: body.type || 'custom',
              priority: body.priority,
              params: body.params,
              config: body.config,
              metadata: {
                createdBy: body.createdBy || 'user',
                agentId: body.agentId,
                sessionId: body.sessionId,
                tags: body.tags || []
              }
            });

            // 异步执行任务
            taskManager.executeTask(task.id).catch(console.error);

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                message: "Task created and started",
                data: task,
              }),
            );
          } catch (error: any) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                message: error.message,
              }),
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
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const tasks = taskManager.createBatchTasks(body.tasks || []);

            // 异步执行所有任务
            tasks.forEach(task => {
              taskManager.executeTask(task.id).catch(console.error);
            });

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                message: `Created ${tasks.length} tasks`,
                data: tasks,
              }),
            );
          } catch (error: any) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                message: error.message,
              }),
            );
          }
        });
      } else next();
    },
  );

  // 获取任务列表
  server.middlewares.use("/api/agent/tasks", (req, res, next) => {
    if (req.method === "GET") {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const status = url.searchParams.get("status")?.split(",") as any;

      const { tasks, total } = taskManager.queryTasks({
        status: status,
        limit: parseInt(url.searchParams.get("limit") || "50"),
        offset: parseInt(url.searchParams.get("offset") || "0"),
      });

      const stats = taskManager.getStats();

      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          data: tasks,
          total,
          stats,
        }),
      );
    } else next();
  });

  // 获取单个任务详情
  server.middlewares.use(
    "/api/agent/tasks/detail",
    (req, res, next) => {
      if (req.method === "GET") {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const id = url.searchParams.get("id");

        if (!id) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, message: "Task ID required" }));
          return;
        }

        const task = taskManager.getTask(id);
        if (!task) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, message: "Task not found" }));
          return;
        }

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            data: task,
          }),
        );
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
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const success = taskManager.cancelTask(body.taskId);

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success,
                message: success ? "Task cancelled" : "Task not found or cannot be cancelled",
              }),
            );
          } catch (error: any) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                message: error.message,
              }),
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
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const task = taskManager.retryTask(body.taskId);

          if (!task) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, message: "Task not found" }));
            return;
          }

          // 异步执行重试
          taskManager.executeTask(task.id).catch(console.error);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: true,
              message: "Task retried",
              data: task,
            }),
          );
        } catch (error: any) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              success: false,
              message: error.message,
            }),
          );
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
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const success = taskManager.deleteTask(body.taskId);

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success,
                message: success ? "Task deleted" : "Task not found",
              }),
            );
          } catch (error: any) {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                message: error.message,
              }),
            );
          }
        });
      } else next();
    },
  );

  // ============================================
  // Agent Runtime API - Agent 运行时管理
  // ============================================
  const runtimeManager = getAgentRuntimeManager();

  // 获取所有运行时状态
  server.middlewares.use("/api/agent-runtime", (req, res, next) => {
    if (req.method === "GET") {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const status = url.searchParams.get("status")?.split(",") as any;

      const { runtimes, total } = runtimeManager.queryRuntimes({
        status: status,
        limit: parseInt(url.searchParams.get("limit") || "50"),
        offset: parseInt(url.searchParams.get("offset") || "0"),
      });

      const stats = runtimeManager.getStats();

      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          success: true,
          data: runtimes,
          total,
          stats,
        }),
      );
    } else if (req.method === "POST") {
      // 创建运行时
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const runtime = runtimeManager.createRuntime({
            agentId: body.agentId,
            mode: body.mode,
            config: body.config,
          });

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: true,
              message: "Runtime created",
              data: runtime,
            }),
          );
        } catch (error: any) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              success: false,
              message: error.message,
            }),
          );
        }
      });
    } else next();
  });

  // 单个运行时操作
  server.middlewares.use(
    "/api/agent-runtime/:id/start",
    (req, res, next) => {
      if (req.method === "POST") {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const id = url.pathname.split("/").pop()?.replace("/start", "");
        if (!id) return next();

        runtimeManager.startRuntime(id).then((runtime) => {
          if (!runtime) {
            res.statusCode = 404;
            res.end(JSON.stringify({ success: false, message: "Runtime not found" }));
            return;
          }

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: runtime }));
        }).catch((error: any) => {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, message: error.message }));
        });
      } else next();
    },
  );

  server.middlewares.use(
    "/api/agent-runtime/:id/pause",
    (req, res, next) => {
      if (req.method === "POST") {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const id = url.pathname.split("/").pop()?.replace("/pause", "");
        if (!id) return next();

        const runtime = runtimeManager.pauseRuntime(id);
        if (!runtime) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, message: "Runtime not found" }));
          return;
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, data: runtime }));
      } else next();
    },
  );

  server.middlewares.use(
    "/api/agent-runtime/:id/resume",
    (req, res, next) => {
      if (req.method === "POST") {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const id = url.pathname.split("/").pop()?.replace("/resume", "");
        if (!id) return next();

        const runtime = runtimeManager.resumeRuntime(id);
        if (!runtime) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, message: "Runtime not found" }));
          return;
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, data: runtime }));
      } else next();
    },
  );

  server.middlewares.use(
    "/api/agent-runtime/:id/stop",
    (req, res, next) => {
      if (req.method === "POST") {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const id = url.pathname.split("/").pop()?.replace("/stop", "");
        if (!id) return next();

        const urlObj = new URL(req.url || "", `http://${req.headers.host}`);
        const force = urlObj.searchParams.get("force") === "true";

        const runtime = runtimeManager.stopRuntime(id, force);
        if (!runtime) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, message: "Runtime not found" }));
          return;
        }

        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, data: runtime }));
      } else next();
    },
  );

  // 发送消息到 Agent
  server.middlewares.use(
    "/api/agent-runtime/:id/message",
    (req, res, next) => {
      if (req.method === "POST") {
        const url = new URL(req.url || "", `http://${req.headers.host}`);
        const id = url.pathname.split("/").pop()?.replace("/message", "");
        if (!id) return next();

        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const message = runtimeManager.sendMessage(id, {
              type: body.type || "command",
              from: body.from || "user",
              to: body.to || id,
              content: body.content,
              payload: body.payload,
              priority: body.priority || "normal",
              read: false,
            });

            if (!message) {
              res.statusCode = 404;
              res.end(JSON.stringify({ success: false, message: "Runtime not found" }));
              return;
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, data: message }));
          } catch (error: any) {
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, message: error.message }));
          }
        });
      } else next();
    },
  );

  // ============================================
  // Meta-Agent API - Meta-Agent 管理
  // ============================================
  const metaManager = getMetaAgentManager();

  // 启动 Meta-Agent
  server.middlewares.use("/api/meta/start", (req, res, next) => {
    if (req.method === "POST") {
      try {
        metaManager.start();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, message: "Meta-Agent started" }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, message: error.message }));
      }
    } else next();
  });

  // 停止 Meta-Agent
  server.middlewares.use("/api/meta/stop", (req, res, next) => {
    if (req.method === "POST") {
      metaManager.stop();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, message: "Meta-Agent stopped" }));
    } else next();
  });

  // 获取 Meta-Agent 状态
  server.middlewares.use("/api/meta/status", (req, res, next) => {
    if (req.method === "GET") {
      const status = metaManager.getStatus();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: status }));
    } else next();
  });

  // Worker 管理
  server.middlewares.use("/api/meta/workers", (req, res, next) => {
    if (req.method === "GET") {
      const workers = metaManager.getAllWorkers();
      const statuses = metaManager.getAllWorkerStatuses();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({
        success: true,
        data: { workers, statuses }
      }));
    } else if (req.method === "POST") {
      // 注册 Worker
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const worker = metaManager.registerWorker(body);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: worker }));
        } catch (error: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, message: error.message }));
        }
      });
    } else next();
  });

  // 分配任务
  server.middlewares.use("/api/meta/assign", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());

          if (body.tasks) {
            // 批量分配
            const result = metaManager.assignBatchTasks({
              tasks: body.tasks,
              strategy: body.strategy,
              options: body.options,
            });
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, data: result }));
          } else {
            // 单个分配
            const assignment = metaManager.assignTask(body);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, data: assignment }));
          }
        } catch (error: any) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, message: error.message }));
        }
      });
    } else next();
  });

  // ============================================
  // Report Agent API - 报告系统
  // ============================================
  const reportManager = getReportAgentManager();

  // 生成报告
  server.middlewares.use("/api/report/generate", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const report = await reportManager.generateReport(body);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: report }));
        } catch (error: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, message: error.message }));
        }
      });
    } else next();
  });

  // 获取系统概览
  server.middlewares.use("/api/report/overview", async (req, res, next) => {
    if (req.method === "GET") {
      try {
        const report = await reportManager.generateSystemStatusReport();
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, data: report }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, message: error.message }));
      }
    } else next();
  });

  // 发送通知
  server.middlewares.use("/api/report/notify", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", async () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const notification = await reportManager.sendNotification(
            body.type,
            body.title,
            body.message,
            body.channels,
            body.details,
          );
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: notification }));
        } catch (error: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, message: error.message }));
        }
      });
    } else next();
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

  // ============================================
  // Agent CRUD API - 持久化存储
  // ============================================

  const AGENTS_FILE = path.join(process.cwd(), ".data", "agents.json");

  // 确保数据目录存在
  if (!fs.existsSync(path.dirname(AGENTS_FILE))) {
    fs.mkdirSync(path.dirname(AGENTS_FILE), { recursive: true });
  }

  // 读取 Agents
  function readAgents(): any[] {
    try {
      if (fs.existsSync(AGENTS_FILE)) {
        const data = fs.readFileSync(AGENTS_FILE, "utf-8");
        const agents = JSON.parse(data);
        // 为每个 agent 添加默认值
        return agents.map((agent: any) => ({
          ...agent,
          capabilities: agent.capabilities || {
            mode: "raw",
            skillIds: [],
            toolIds: [],
            customSystemPrompt: "你是一个 helpful 的 AI 助手. ",
          },
          memory: agent.memory || {
            enabled: true,
            content: "",
            autoExtract: true,
            maxTokens: 2000,
          },
          permissions: agent.permissions || [],
          callCount: agent.callCount || 0,
          isDefault: agent.isDefault || false,
          status: agent.status || "online",
          seat: agent.seat || 1,
          lastActiveAt: agent.lastActiveAt || Date.now(),
        }));
      }
    } catch (e) {
      console.error("[API] Failed to read agents:", e);
    }
    return [];
  }

  // 写入 Agents
  function writeAgents(agents: any[]) {
    try {
      fs.writeFileSync(
        AGENTS_FILE,
        JSON.stringify(agents, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("[API] Failed to write agents:", e);
    }
  }

  // 初始化默认 Agent(如果没有数据)
  function initializeDefaultAgent() {
    const agents = readAgents();
    if (agents.length === 0) {
      const defaultAgent = {
        id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: "Meta 助手",
        avatar: "🤖",
        description:
          "基于 DeepSeek 大模型的通用 AI 助手,为您提供专业智能对话体验",
        level: "meta",
        status: "online",
        seat: 1,
        capabilities: {
          mode: "raw",
          skillIds: [],
          toolIds: [],
          customSystemPrompt:
            "你是一个 helpful 的 AI 助手,擅长回答问题、提供建议和协助完成各种任务. ",
        },
        memory: {
          enabled: true,
          content: "",
          autoExtract: true,
          maxTokens: 2000,
        },
        permissions: [],
        callCount: 0,
        isDefault: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastActiveAt: Date.now(),
      };
      writeAgents([defaultAgent]);
      console.log("[API] Initialized default agent");
    }
  }

  // 执行初始化
  initializeDefaultAgent();

  // GET /api/agents - 获取所有 Agents
  // POST /api/agents - 创建 Agent(只处理精确路径,不包括子路径)
  server.middlewares.use("/api/agents", (req, res, next) => {
    const url = req.url || "";
    // 只处理精确路径 /api/agents 或 /api/agents/(不包括 /api/agents/update 等子路径)
    if (url !== "/" && url !== "" && !url.startsWith("?")) {
      return next();
    }

    if (req.method === "GET") {
      const agents = readAgents();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: agents }));
    } else if (req.method === "POST") {
      // POST /api/agents - 创建 Agent
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const agents = readAgents();

          const newAgent = {
            id: `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            name: body.name || "New Agent",
            avatar: body.avatar || "🤖",
            description: body.description || "A helpful AI agent",
            level: body.level || "custom",
            status: "online",
            seat: 1,
            capabilities: body.capabilities || {
              mode: "raw",
              skillIds: [],
              toolIds: [],
              customSystemPrompt: "你是一个 helpful 的 AI 助手. ",
            },
            memory: body.memory || {
              enabled: true,
              content: "",
              autoExtract: true,
              maxTokens: 2000,
            },
            permissions: [],
            callCount: 0,
            isDefault: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastActiveAt: Date.now(),
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
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { id, ...updates } = body;

          const agents = readAgents();
          const index = agents.findIndex((a: any) => a.id === id);

          if (index === -1) {
            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: "Agent not found",
              }),
            );
            return;
          }

          agents[index] = {
            ...agents[index],
            ...updates,
            updatedAt: Date.now(),
          };
          writeAgents(agents);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ success: true, data: agents[index] }),
          );
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
      req.on("data", (chunk) => chunks.push(chunk));
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
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { agentId, triggerId } = body;

          let agents = readAgents();
          const agent = agents.find((a: any) => a.id === agentId);

          if (!agent) {
            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: "Agent not found",
              }),
            );
            return;
          }

          // 更新触发统计
          if (agent.triggers) {
            const trigger = agent.triggers.find(
              (t: any) => t.id === triggerId,
            );
            if (trigger) {
              trigger.lastTriggered = new Date().toISOString();
              trigger.triggerCount = (trigger.triggerCount || 0) + 1;
            }
          }

          // 更新 Agent 运行统计
          agent.totalRuns = (agent.totalRuns || 0) + 1;
          agent.lastRunAt = Date.now();
          agent.status = "running";
          agent.updatedAt = Date.now();

          writeAgents(agents);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: true,
              data: { agent, triggered: true },
            }),
          );
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // GET /api/agents/:id - 获取单个 Agent
  server.middlewares.use("/api/agents/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 只处理 /api/agents/:id 格式,排除其他子路径如 /active
    if (
      parts.length !== 1 ||
      parts[0] === "active" ||
      req.method !== "GET"
    )
      return next();

    const id = parts[0].split("?")[0];

    try {
      const agents = readAgents();
      const agent = agents.find((a: any) => a.id === id);

      if (!agent) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({ success: false, error: "Agent not found" }),
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

  // GET/POST /api/agents/active - 活跃 Agent 管理
  const ACTIVE_AGENT_FILE = path.join(
    process.cwd(),
    ".data",
    "active-agent.json",
  );

  server.middlewares.use("/api/agents/active", (req, res, next) => {
    if (req.method === "GET") {
      // 获取活跃 Agent ID
      try {
        let activeId = null;
        if (fs.existsSync(ACTIVE_AGENT_FILE)) {
          const data = JSON.parse(
            fs.readFileSync(ACTIVE_AGENT_FILE, "utf-8"),
          );
          activeId = data.id;
        }
        // 如果没有设置,返回第一个 agent
        if (!activeId) {
          const agents = readAgents();
          activeId = agents[0]?.id || null;
        }
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ success: true, data: { id: activeId } }),
        );
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else if (req.method === "POST") {
      // 设置活跃 Agent ID
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { id } = body;

          fs.writeFileSync(
            ACTIVE_AGENT_FILE,
            JSON.stringify({ id, updatedAt: Date.now() }),
            "utf-8",
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

}
