import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

export function registerMcpRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // MCP Servers API - MCP 服务器管理
  // ============================================

  const MCP_SERVERS_FILE = path.join(
    process.cwd(),
    ".data",
    "mcp-servers.json",
  );

  function readMCPServers(): any[] {
    try {
      if (fs.existsSync(MCP_SERVERS_FILE)) {
        return JSON.parse(fs.readFileSync(MCP_SERVERS_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[API] Failed to read MCP servers:", e);
    }
    return [];
  }

  function writeMCPServers(servers: any[]) {
    try {
      fs.writeFileSync(
        MCP_SERVERS_FILE,
        JSON.stringify(servers, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("[API] Failed to write MCP servers:", e);
    }
  }

  // GET /api/mcp/servers - 获取所有 MCP 服务器
  // POST /api/mcp/servers - 创建 MCP 服务器
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
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const servers = readMCPServers();

          // FIX: 统一生成一个 ID，避免 server.id 和 server.config.id 不一致
          const serverId =
            body.id ||
            `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          const newServer = {
            id: serverId,
            config: { ...body, id: serverId },
            status: "disconnected",
            tools: [],
            resources: [],
            prompts: [],
            connectAttempts: 0,
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

  // GET /api/mcp/servers/:id - 获取单个 MCP 服务器
  server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 只处理单个 ID 的情况，排除 update/delete/connect/disconnect/tools 等子路径
    const reservedPaths = [
      "update",
      "delete",
      "connect",
      "disconnect",
      "tools",
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
      const servers = readMCPServers();
      const server = servers.find((s: any) => s.id === id);

      if (!server) {
        res.statusCode = 404;
        res.end(
          JSON.stringify({ success: false, error: "Server not found" }),
        );
        return;
      }

      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ success: true, data: server }));
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: String(e) }));
    }
  });

  // POST /api/mcp/servers/update - 更新 MCP 服务器
  server.middlewares.use(
    "/api/mcp/servers/update",
    (req, res, next) => {
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
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
                  error: "Server ID required",
                }),
              );
              return;
            }

            const servers = readMCPServers();
            const index = servers.findIndex((s: any) => s.id === id);

            if (index === -1) {
              res.statusCode = 404;
              res.end(
                JSON.stringify({
                  success: false,
                  error: "Server not found",
                }),
              );
              return;
            }

            // FIX: 只将 configUpdates 合并到 config 中
            servers[index] = {
              ...servers[index],
              config: { ...servers[index].config, ...configUpdates },
              updatedAt: Date.now(),
            };
            writeMCPServers(servers);

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({ success: true, data: servers[index] }),
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

  // POST /api/mcp/servers/delete - 删除 MCP 服务器
  server.middlewares.use(
    "/api/mcp/servers/delete",
    (req, res, next) => {
      if (req.method === "POST") {
        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString());
            const { id } = body;

            let servers = readMCPServers();
            servers = servers.filter((s: any) => s.id !== id);
            writeMCPServers(servers);

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
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

  // POST /api/mcp/servers/:id/connect - 连接 MCP Server
  server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 处理 /:id/connect 路径 (parts = [id, 'connect'])
    if (parts.length !== 2 || parts[1] !== "connect") return next();

    const id = parts[0].split("?")[0];

    if (req.method === "POST") {
      try {
        const servers = readMCPServers();
        const index = servers.findIndex((s: any) => s.id === id);

        if (index === -1) {
          res.statusCode = 404;
          res.end(
            JSON.stringify({
              success: false,
              error: "MCP server not found",
            }),
          );
          return;
        }

        // 更新连接状态为 connected
        servers[index].status = "connected";
        servers[index].lastConnectedAt = Date.now();
        writeMCPServers(servers);

        console.log(
          `[API] MCP server connected: ${servers[index].name}`,
        );
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ success: true, data: servers[index] }),
        );
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else next();
  });

  // POST /api/mcp/servers/:id/disconnect - 断开 MCP Server
  server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 处理 /:id/disconnect 路径 (parts = [id, 'disconnect'])
    if (parts.length !== 2 || parts[1] !== "disconnect") return next();

    const id = parts[0].split("?")[0];

    if (req.method === "POST") {
      try {
        const servers = readMCPServers();
        const index = servers.findIndex((s: any) => s.id === id);

        if (index === -1) {
          res.statusCode = 404;
          res.end(
            JSON.stringify({
              success: false,
              error: "MCP server not found",
            }),
          );
          return;
        }

        // 更新连接状态为 disconnected
        servers[index].status = "disconnected";
        writeMCPServers(servers);

        console.log(
          `[API] MCP server disconnected: ${servers[index].name}`,
        );
        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ success: true, data: servers[index] }),
        );
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else next();
  });

  // POST /api/mcp/servers/:id/tools/:toolName/execute - 执行 MCP 工具
  server.middlewares.use("/api/mcp/servers/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 处理 /:id/tools/:toolName/execute 路径 (parts = [id, 'tools', toolName, 'execute'])
    if (
      parts.length !== 4 ||
      parts[1] !== "tools" ||
      parts[3] !== "execute"
    )
      return next();

    const id = parts[0].split("?")[0];
    const toolName = parts[2];

    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const args = JSON.parse(Buffer.concat(chunks).toString());
          const servers = readMCPServers();
          const server = servers.find((s: any) => s.id === id);

          if (!server) {
            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: "MCP server not found",
              }),
            );
            return;
          }

          if (server.status !== "connected") {
            res.statusCode = 400;
            res.end(
              JSON.stringify({
                success: false,
                error: "MCP server not connected",
              }),
            );
            return;
          }

          // 检查工具是否存在
          const tool = server.tools?.find(
            (t: any) => t.name === toolName,
          );
          if (!tool) {
            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: `Tool '${toolName}' not found`,
              }),
            );
            return;
          }

          // 模拟工具执行（实际项目中这里应该调用 MCP 客户端）
          console.log(
            `[API] Executing MCP tool: ${server.name}/${toolName}`,
            args,
          );

          // 返回模拟成功响应
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              success: true,
              data: {
                success: true,
                result: JSON.stringify({
                  executed: true,
                  tool: toolName,
                  args,
                }),
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

}
