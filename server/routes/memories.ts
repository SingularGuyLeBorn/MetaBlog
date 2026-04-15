import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

export function registerMemoriesRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // Memory API - 记忆管理
  // ============================================

  const MEMORIES_FILE = path.join(
    process.cwd(),
    ".data",
    "memories.json",
  );

  function readMemories(): any[] {
    try {
      if (fs.existsSync(MEMORIES_FILE)) {
        return JSON.parse(fs.readFileSync(MEMORIES_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[API] Failed to read memories:", e);
    }
    return [];
  }

  function writeMemories(memories: any[]) {
    try {
      fs.writeFileSync(
        MEMORIES_FILE,
        JSON.stringify(memories, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("[API] Failed to write memories:", e);
    }
  }

  // GET /api/memories - 获取所有记忆
  // POST /api/memories - 创建记忆
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
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const memories = readMemories();

          // FIX: 添加 enabled 默认值 true
          const newMemory = {
            id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            enabled: true,
            ...body,
            createdAt: Date.now(),
            updatedAt: Date.now(),
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

  // GET /api/memories/:id - 获取单个记忆
  server.middlewares.use("/api/memories/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 只处理单个 ID 的情况，排除 update/delete/search/stats/clear 等子路径
    const reservedPaths = [
      "update",
      "delete",
      "search",
      "stats",
      "clear",
    ];
    if (
      parts.length !== 1 ||
      reservedPaths.includes(parts[0]) ||
      req.method !== "GET"
    ) {
      return next();
    }

    const id = parts[0].split("?")[0];
    try {
      const memories = readMemories();
      const memory = memories.find((m: any) => m.id === id);

      if (!memory) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({ success: false, error: "Memory not found" }),
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

  // POST /api/memories/update - 更新记忆
  server.middlewares.use("/api/memories/update", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { id, ...updates } = body;

          const memories = readMemories();
          const index = memories.findIndex((m: any) => m.id === id);

          if (index === -1) {
            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: "Memory not found",
              }),
            );
            return;
          }

          memories[index] = {
            ...memories[index],
            ...updates,
            updatedAt: Date.now(),
          };
          writeMemories(memories);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ success: true, data: memories[index] }),
          );
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // POST /api/memories/delete - 删除记忆
  server.middlewares.use("/api/memories/delete", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { id } = body;

          let memories = readMemories();
          memories = memories.filter((m: any) => m.id !== id);
          writeMemories(memories);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: true,
              data: { id, deleted: true },
            }),
          );
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else next();
  });

  // POST /api/memories/search - 搜索记忆
  server.middlewares.use("/api/memories/search", (req, res, next) => {
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const { query, category, minImportance, limit = 50 } = body;

          let memories = readMemories();

          if (category) {
            memories = memories.filter(
              (m: any) => m.category === category,
            );
          }

          if (minImportance !== undefined) {
            memories = memories.filter(
              (m: any) => m.importance >= minImportance,
            );
          }

          if (query) {
            const q = query.toLowerCase();
            memories = memories.filter((m: any) =>
              m.content.toLowerCase().includes(q),
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

  // GET /api/memories/stats - 获取记忆统计
  server.middlewares.use("/api/memories/stats", (req, res, next) => {
    if (req.method === "GET") {
      try {
        const memories = readMemories();
        const byCategory: Record<string, number> = {};

        memories.forEach((m: any) => {
          byCategory[m.category] = (byCategory[m.category] || 0) + 1;
        });

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            data: {
              total: memories.length,
              enabled: memories.filter((m: any) => m.enabled).length,
              byCategory,
            },
          }),
        );
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else next();
  });

  // POST /api/memories/clear - 清空所有记忆
  server.middlewares.use("/api/memories/clear", (req, res, next) => {
    if (req.method === "POST") {
      try {
        writeMemories([]);
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ success: true, data: { cleared: true } }),
        );
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else next();
  });

}
