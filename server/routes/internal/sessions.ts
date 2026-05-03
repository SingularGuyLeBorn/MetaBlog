/**
 * ============================================================================
 * 内部业务路由 - sessions
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
 * 注册会话管理路由
 *
 * 挂载以下端点：
 * - /api/sessions —— 会话列表(GET)和创建(POST)
 * - /api/sessions/:id —— 单会话读取、更新、删除
 * - /api/sessions/:id/messages —— 消息追加和批量保存
 * - /api/agent-chat/sessions —— Agent 专用会话存储
 *
 * 数据持久化：会话存储在 .data/sessions.json,消息存储在 .data/session-messages.json. 
 *
 * @param server - Vite 开发服务器实例
 * @param ctx    - 路由上下文
 */
export function registerSessionsRoutes(server: ViteDevServer, ctx: RouteContext) {
  const { system, structuredLog, gitCommit, triggerReload } = ctx;
  // ============================================
  // Chat Sessions API - 聊天会话管理
  // ============================================

  const SESSIONS_FILE = path.join(
    process.cwd(),
    ".data",
    "sessions.json",
  );
  const SESSION_MESSAGES_FILE = path.join(
    process.cwd(),
    ".data",
    "session-messages.json",
  );

  function readSessions(): any[] {
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        return JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8"));
      }
    } catch (e) {
      console.error("[API] Failed to read sessions:", e);
    }
    return [];
  }

  function writeSessions(sessions: any[]) {
    try {
      fs.writeFileSync(
        SESSIONS_FILE,
        JSON.stringify(sessions, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("[API] Failed to write sessions:", e);
    }
  }

  function readSessionMessages(): Record<string, any[]> {
    try {
      if (fs.existsSync(SESSION_MESSAGES_FILE)) {
        const content = fs.readFileSync(SESSION_MESSAGES_FILE, "utf-8");
        // 处理空文件的情况
        if (!content || content.trim() === "") {
          return {};
        }
        return JSON.parse(content);
      }
    } catch (e) {
      console.error("[API] Failed to read session messages:", e);
    }
    return {};
  }

  function writeSessionMessages(messages: Record<string, any[]>) {
    try {
      fs.writeFileSync(
        SESSION_MESSAGES_FILE,
        JSON.stringify(messages, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("[API] Failed to write session messages:", e);
    }
  }

  // GET /api/sessions - 获取所有会话
  // POST /api/sessions - 创建会话
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
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const sessions = readSessions();

          // 如果传入了已有 ID，更新而不是创建（防止重复）
          const existingIndex = body.id ? sessions.findIndex((s: any) => s.id === body.id) : -1;

          if (existingIndex > -1) {
            sessions[existingIndex] = {
              ...sessions[existingIndex],
              ...body,
              updatedAt: Date.now(),
            };
            writeSessions(sessions);
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true, data: sessions[existingIndex] }));
            return;
          }

          const newSession = {
            id:
              body.id ||
              `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            title: body.title || "新对话",
            config: {
              model: "deepseek-v4-pro",
              temperature: 0.7,
              maxTokens: 8192,
              systemPrompt: "",
              enableReasoning: true,
              reasoningEffort: "high",
              streaming: true,
              ...body.config,
            },
            stats: { messageCount: 0, totalTokens: 0, ...body.stats },
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          sessions.unshift(newSession);
          writeSessions(sessions);

          // 初始化消息组
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

  // ============================================
  // Sessions Message API - 按特定性排序(最具体的优先)
  // ============================================

  // POST /api/sessions/:id/messages/batch - 批量保存消息组 (3 parts - 最具体)
  server.middlewares.use("/api/sessions/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 处理 /:id/messages/batch 路径 (parts = [id, 'messages', 'batch'])
    if (
      parts.length !== 3 ||
      parts[1] !== "messages" ||
      parts[2] !== "batch"
    )
      return next();

    const sessionId = parts[0];

    if (req.method === "POST") {
      const chunks: Buffer[] = [];
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

  // GET /api/sessions/:id/messages - 获取会话消息
  // POST /api/sessions/:id/messages - 保存会话消息 (2 parts)
  server.middlewares.use("/api/sessions/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 处理 /:id/messages 路径 (parts = [id, 'messages'])
    if (parts.length !== 2 || parts[1] !== "messages") return next();

    const sessionId = parts[0];

    if (req.method === "GET") {
      try {
        const messages = readSessionMessages();
        const sessionMessages = messages[sessionId] || [];

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({ success: true, data: sessionMessages }),
        );
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: String(e) }));
      }
    } else if (req.method === "POST") {
      const chunks: Buffer[] = [];
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

  // GET /api/sessions/:id - 获取单个会话
  // PUT /api/sessions/:id - 更新会话
  // DELETE /api/sessions/:id - 删除会话 (1 part - 最通用)
  server.middlewares.use("/api/sessions/", (req, res, next) => {
    const url = req.url || "";
    const parts = url.split("/").filter(Boolean);
    // 只处理单个 ID 的情况
    if (parts.length !== 1) return next();

    const id = parts[0].split("?")[0];

    if (req.method === "GET") {
      try {
        const sessions = readSessions();
        const session = sessions.find((s: any) => s.id === id);

        if (!session) {
          res.statusCode = 404;
          res.end(
            JSON.stringify({
              success: false,
              error: "Session not found",
            }),
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
      const chunks: Buffer[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString());
          const sessions = readSessions();
          const index = sessions.findIndex((s: any) => s.id === id);

          if (index === -1) {
            res.statusCode = 404;
            res.end(
              JSON.stringify({
                success: false,
                error: "Session not found",
              }),
            );
            return;
          }

          sessions[index] = {
            ...sessions[index],
            ...body,
            updatedAt: Date.now(),
          };
          writeSessions(sessions);

          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ success: true, data: sessions[index] }),
          );
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      });
    } else if (req.method === "DELETE") {
      try {
        let sessions = readSessions();
        sessions = sessions.filter((s: any) => s.id !== id);
        writeSessions(sessions);

        // 同时删除消息
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

  // ============================================
  // Agent Chat Sessions API - Agent 独立会话
  // ============================================

  const AGENT_CHAT_SESSIONS_FILE = path.join(
    process.cwd(),
    ".data",
    "agent-chat-sessions.json",
  );

  function readAgentChatSessions(): Record<string, any[]> {
    try {
      if (fs.existsSync(AGENT_CHAT_SESSIONS_FILE)) {
        return JSON.parse(
          fs.readFileSync(AGENT_CHAT_SESSIONS_FILE, "utf-8"),
        );
      }
    } catch (e) {
      console.error("[API] Failed to read agent chat sessions:", e);
    }
    return {};
  }

  function writeAgentChatSessions(sessions: Record<string, any[]>) {
    try {
      fs.writeFileSync(
        AGENT_CHAT_SESSIONS_FILE,
        JSON.stringify(sessions, null, 2),
        "utf-8",
      );
    } catch (e) {
      console.error("[API] Failed to write agent chat sessions:", e);
    }
  }

  // GET /api/agent-chat/sessions - 获取所有 Agent 会话列表
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
              lastUpdated:
                messages.length > 0
                  ? messages[messages.length - 1].timestamp
                  : 0,
            }),
          );

          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: true, data: list }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ success: false, error: String(e) }));
        }
      } else next();
    },
  );

  // GET /api/agent-chat/sessions/:agentId/messages - 获取 Agent 会话消息
  // POST /api/agent-chat/sessions/:agentId/messages - 保存 Agent 会话消息
  // DELETE /api/agent-chat/sessions/:agentId - 清空 Agent 会话
  server.middlewares.use(
    "/api/agent-chat/sessions/",
    (req, res, next) => {
      const url = req.url || "";
      const parts = url.split("/").filter(Boolean);
      // 处理 /:agentId/messages 路径 (parts = [agentId, 'messages'])
      // 或 /:agentId 路径 (parts = [agentId]) 用于 DELETE
      if (parts.length < 1 || parts.length > 2) return next();
      if (parts.length === 2 && parts[1] !== "messages") return next();

      const agentId = parts[0].split("?")[0];
      const isMessagesPath =
        parts.length === 2 && parts[1] === "messages";

      // GET /api/agent-chat/sessions/:agentId/messages
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
      }
      // POST /api/agent-chat/sessions/:agentId/messages
      else if (req.method === "POST" && isMessagesPath) {
        const chunks: Buffer[] = [];
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
              JSON.stringify({ success: false, error: String(e) }),
            );
          }
        });
      }
      // DELETE /api/agent-chat/sessions/:agentId
      else if (req.method === "DELETE" && !isMessagesPath) {
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
    },
  );
}
