/**
 * ============================================================================
 * 后端路由 - tasks.ts
 * ============================================================================
 *
 * Task 管理路由，支持增删改查和状态控制。
 * 数据持久化到 .data/tasks/index.json。
 *
 * @module server/routes/internal
 */

import type { ViteDevServer } from "vite";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.resolve(".data");
const TASKS_DIR = path.join(DATA_DIR, "tasks");
const TASKS_FILE = path.join(TASKS_DIR, "index.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(TASKS_DIR)) fs.mkdirSync(TASKS_DIR, { recursive: true });
}

function readTasks(): any[] {
  ensureDataDir();
  if (!fs.existsSync(TASKS_FILE)) return [];
  try {
    const data = fs.readFileSync(TASKS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeTasks(tasks: any[]) {
  ensureDataDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// 迁移现有 scheduler-state.json 中的任务
function migrateSchedulerTasks() {
  const schedulerFile = path.join(DATA_DIR, "scheduler/state.json");
  if (!fs.existsSync(schedulerFile)) return;
  try {
    const data = JSON.parse(fs.readFileSync(schedulerFile, "utf-8"));
    if (!data.tasks || !Array.isArray(data.tasks)) return;

    const existing = readTasks();
    // 修复：按已迁移的 scheduler 任务 name 去重（之前错误地检查了不存在的 taskType 字段）
    const existingSchedulerNames = new Set(
      existing
        .filter((t: any) => t.migratedFrom === 'scheduler-state')
        .map((t: any) => t.name)
    );

    for (const st of data.tasks) {
      if (existingSchedulerNames.has(st.taskType)) continue;
      existing.push({
        id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: st.taskType,
        description: `从调度器迁移的任务: ${st.taskType}`,
        agentId: "",
        type: "scheduled",
        status: st.enabled ? "pending" : "paused",
        schedule: st.cronExpression,
        priority: "medium",
        content: "",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastRunAt: st.lastRun || undefined,
        nextRunAt: st.nextRun || undefined,
        runCount: st.runCount || 0,
        failCount: st.failCount || 0,
        migratedFrom: "scheduler-state"
      });
    }
    writeTasks(existing);
  } catch (e) {
    console.error("[tasks] 迁移 scheduler 任务失败:", e);
  }
}

export function registerTaskRoutes(server: ViteDevServer) {
  // 启动时迁移旧数据
  migrateSchedulerTasks();

  // GET /api/tasks - 列表
  // POST /api/tasks - 创建
  server.middlewares.use("/api/tasks", (req, res, next) => {
    const url = req.url || "";
    if (url !== "/" && url !== "" && !url.startsWith("?")) {
      return next();
    }

    if (req.method === "GET") {
      const tasks = readTasks();
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: tasks }));
    } else if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const tasks = readTasks();
          const newTask = {
            id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            ...body,
            status: body.status || "pending",
            runCount: 0,
            failCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          tasks.push(newTask);
          writeTasks(tasks);
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: newTask }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // POST /api/tasks/update - 更新
  server.middlewares.use("/api/tasks/update", (req, res, next) => {
    if (req.method !== "POST") return next();
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const { id, ...updates } = body;
        const tasks = readTasks();
        const idx = tasks.findIndex((t: any) => t.id === id);
        if (idx === -1) {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: "任务不存在" }));
          return;
        }
        tasks[idx] = { ...tasks[idx], ...updates, updatedAt: Date.now() };
        writeTasks(tasks);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true, data: tasks[idx] }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    });
  });

  // POST /api/tasks/delete - 删除
  server.middlewares.use("/api/tasks/delete", (req, res, next) => {
    if (req.method !== "POST") return next();
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        const tasks = readTasks().filter((t: any) => t.id !== body.id);
        writeTasks(tasks);
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    });
  });

  // POST /api/tasks/:id/pause - 暂停
  server.middlewares.use("/api/tasks/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    if (parts.length !== 2 || req.method !== "POST") return next();
    const [id, action] = parts;
    if (action !== "pause" && action !== "resume") return next();

    const tasks = readTasks();
    const idx = tasks.findIndex((t: any) => t.id === id);
    if (idx === -1) {
      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, error: "任务不存在" }));
      return;
    }
    tasks[idx].status = action === "pause" ? "paused" : "pending";
    tasks[idx].updatedAt = Date.now();
    writeTasks(tasks);
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ success: true, data: tasks[idx] }));
  });
}
