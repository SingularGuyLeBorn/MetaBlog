import type { ViteDevServer } from "vite";
import path from "path";
import fs from "fs";
import { Tiktoken } from "js-tiktoken/lite";
import cl100k_base from "js-tiktoken/ranks/cl100k_base";

export interface RouteContext {
  system: any;
  structuredLog: any;
  gitCommit: (files: string | string[], message: string) => void;
  triggerReload: () => void;
}

// ==================== 模型配置 ====================

type ModelProvider = "deepseek" | "kimi";

interface ModelConfig {
  provider: ModelProvider;
  model: string;
  baseURL: string;
  apiKey: string;
  supportsVision: boolean;
  supportsVideo: boolean;
  supportsFunctionCalling: boolean;
  maxTokens: number;
  contextWindow: number;
}

// 环境变量兼容：优先 LLM_ 前缀，回退 VITE_ 前缀
function env(key: string, fallback: string = ""): string {
  return process.env[key] || process.env[key.replace("LLM_", "VITE_")] || fallback;
}

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  "deepseek-chat": {
    provider: "deepseek",
    model: "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: env("LLM_DEEPSEEK_API_KEY"),
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 128000,
  },
  "deepseek-reasoner": {
    provider: "deepseek",
    model: "deepseek-reasoner",
    baseURL: "https://api.deepseek.com/v1",
    apiKey: env("LLM_DEEPSEEK_API_KEY"),
    supportsVision: false,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 64000,
    contextWindow: 128000,
  },
  "kimi-k2.5": {
    provider: "kimi",
    model: "kimi-k2.5",
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: env("LLM_KIMI_API_KEY"),
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000,
  },
  "kimi-k2-turbo-preview": {
    provider: "kimi",
    model: "kimi-k2-turbo-preview",
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: env("LLM_KIMI_API_KEY"),
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000,
  },
  "kimi-k2-thinking": {
    provider: "kimi",
    model: "kimi-k2-thinking",
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: env("LLM_KIMI_API_KEY"),
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000,
  },
  "kimi-k2-thinking-turbo": {
    provider: "kimi",
    model: "kimi-k2-thinking-turbo",
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: env("LLM_KIMI_API_KEY"),
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 256000,
  },
  "moonshot-v1-8k-vision-preview": {
    provider: "kimi",
    model: "moonshot-v1-8k-vision-preview",
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: env("LLM_KIMI_API_KEY"),
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 8192,
    contextWindow: 8192,
  },
  "moonshot-v1-32k-vision-preview": {
    provider: "kimi",
    model: "moonshot-v1-32k-vision-preview",
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: env("LLM_KIMI_API_KEY"),
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 32000,
    contextWindow: 32000,
  },
  "moonshot-v1-128k-vision-preview": {
    provider: "kimi",
    model: "moonshot-v1-128k-vision-preview",
    baseURL: "https://api.moonshot.cn/v1",
    apiKey: env("LLM_KIMI_API_KEY"),
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 128000,
    contextWindow: 128000,
  },
};

function getModelConfig(modelName: string): ModelConfig {
  const config = MODEL_CONFIGS[modelName];
  if (config) return config;
  throw new Error(`不支持的模型: ${modelName}`);
}

function validateApiKey(config: ModelConfig): void {
  if (!config.apiKey || config.apiKey.includes("your-api-key") || config.apiKey.length < 10) {
    throw new Error(`${config.provider} API Key not configured`);
  }
}

// ==================== Token 估算 ====================

let cachedEncoder: Tiktoken | null = null;
function getEncoder(): Tiktoken {
  if (!cachedEncoder) {
    cachedEncoder = new Tiktoken(cl100k_base);
  }
  return cachedEncoder;
}

function estimateTextTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  try {
    return getEncoder().encode(text).length;
  } catch {
    return Math.ceil(text.length / 3);
  }
}

function estimateMessageTokens(msg: any): number {
  let tokens = 4; // 消息格式开销
  const content = msg.content;
  if (typeof content === "string") {
    tokens += estimateTextTokens(content);
  } else if (Array.isArray(content)) {
    for (const part of content) {
      if (part.type === "text" && part.text) {
        tokens += estimateTextTokens(part.text);
      } else if (part.type === "image_url" || part.type === "image") {
        tokens += 500;
      }
    }
  }
  return tokens;
}

function estimateChatTokens(messages: any[]): number {
  if (!messages || messages.length === 0) return 0;
  let total = 3; // 最后回复前缀
  for (const msg of messages) {
    total += estimateMessageTokens(msg);
  }
  return total;
}

// ==================== 智能截断 ====================

function smartTruncateMessages(
  messages: any[],
  modelConfig: ModelConfig,
  systemPrompt: string = ""
): any[] {
  const contextWindow = modelConfig.contextWindow;
  const outputReserve = modelConfig.maxTokens;
  const systemTokens = systemPrompt ? estimateTextTokens(systemPrompt) + 2000 : 2000;
  const safetyMargin = 1000;
  const availableTokens = contextWindow - outputReserve - systemTokens - safetyMargin;

  const currentTokens = messages.reduce((sum, m) => {
    const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
    return sum + estimateTextTokens(text);
  }, 0);

  if (currentTokens <= availableTokens) return messages;

  // 第一阶段：截断 tool 结果
  const toolMsgs = messages.filter((m) => m.role === "tool");
  const nonToolMsgs = messages.filter((m) => m.role !== "tool");
  const nonToolTokens = nonToolMsgs.reduce((sum, m) => {
    const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
    return sum + estimateTextTokens(text);
  }, 0);
  const toolBudget = Math.max(availableTokens - nonToolTokens, Math.floor(availableTokens * 0.3));
  const perToolTokens = toolMsgs.length > 0 ? Math.floor(toolBudget / toolMsgs.length) : 0;
  const maxToolChars =
    contextWindow >= 256000 ? 48000 : contextWindow >= 128000 ? 24000 : contextWindow >= 64000 ? 12000 : 4000;
  const toolTruncateLimit = Math.max(Math.min(perToolTokens * 3, maxToolChars), 3000);

  let processed = messages.map((m) => {
    if (m.role !== "tool" || typeof m.content !== "string") return m;
    if (m.content.length <= toolTruncateLimit) return m;
    return {
      ...m,
      content:
        m.content.substring(0, toolTruncateLimit) +
        `\n\n---` +
        `\n[历史消息中的工具结果被截断] 原长 ${m.content.length} 字符，当前限制 ${toolTruncateLimit} 字符。` +
        `\n注意：这是之前某次工具调用的返回结果，因上下文长度限制被截断。如需完整信息，请重新调用相关工具。`,
    };
  });

  // 第二阶段：截断早期 assistant 消息
  const afterToolTokens = processed.reduce((sum, m) => {
    const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
    return sum + estimateTextTokens(text);
  }, 0);

  if (afterToolTokens > availableTokens) {
    const keepRecent = 8;
    const recent = processed.slice(-keepRecent);
    const older = processed.slice(0, -keepRecent);
    const truncatedOlder = older.map((m) => {
      if (m.role !== "assistant" || typeof m.content !== "string") return m;
      if (m.content.length <= 800) return m;
      return {
        ...m,
        content: m.content.substring(0, 800) + `\n\n... [早期 assistant 消息已截断，仅保留摘要]`,
      };
    });
    processed = [...truncatedOlder, ...recent];
  }

  // 第三阶段：丢弃最早的消息
  let finalTokens = processed.reduce((sum, m) => {
    const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
    return sum + estimateTextTokens(text);
  }, 0);

  while (finalTokens > availableTokens && processed.length > 6) {
    const toolIndex = processed.findIndex((m) => m.role === "tool");
    if (toolIndex >= 0 && toolIndex < processed.length - 6) {
      processed.splice(toolIndex, 1);
    } else {
      const assistantIndex = processed.findIndex((m) => m.role === "assistant");
      if (assistantIndex >= 0 && assistantIndex < processed.length - 6) {
        processed.splice(assistantIndex, 1);
      } else {
        processed.shift();
      }
    }
    finalTokens = processed.reduce((sum, m) => {
      const text = typeof m.content === "string" ? m.content : JSON.stringify(m.content || "");
      return sum + estimateTextTokens(text);
    }, 0);
  }

  return processed;
}

// ==================== 审计日志 ====================

const LOGS_DIR = path.join(process.cwd(), ".logs", "chat");
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function logChatEvent(event: string, data: any) {
  try {
    ensureLogsDir();
    const entry = {
      timestamp: new Date().toISOString(),
      event,
      ...data,
    };
    const date = new Date().toISOString().split("T")[0];
    const logFile = path.join(LOGS_DIR, `${date}.jsonl`);
    fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
  } catch {
    // 日志失败不阻断主流程
  }
}

// ==================== 读取请求体 ====================

async function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// ==================== 主路由 ====================

export function registerChatRoutes(server: ViteDevServer, _ctx: RouteContext) {
  server.middlewares.use("/api/chat", async (req, res, next) => {
    if (req.method !== "POST") return next();

    try {
      const body = await readBody(req);
      const { messages, config, stream = true, sessionId, toolContext, tools: clientTools } = body;

      if (!config || !config.model) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: "config.model is required" }));
        return;
      }

      const modelConfig = getModelConfig(config.model);
      validateApiKey(modelConfig);

      // Token 估算（基于原始消息）
      const inputTokens = estimateChatTokens(messages);

      // 智能截断
      let processedMessages = messages;
      if (config.systemPrompt) {
        processedMessages = smartTruncateMessages(messages, modelConfig, config.systemPrompt);
      }

      // 构建 LLM 请求体
      const requestBody: any = {
        model: modelConfig.model,
        messages: processedMessages,
        max_tokens: Math.min(config.maxTokens || modelConfig.maxTokens, modelConfig.maxTokens),
        stream: stream !== false,
      };

      if (!config.model?.includes("reasoner")) {
        requestBody.temperature = config.temperature ?? 1.0;
      }

      if (config.model === "deepseek-chat" && config.enableReasoning) {
        requestBody.thinking = { type: "enabled" };
      }

      // Kimi K2.5 思考模式与内置工具冲突处理
      if (config.model === "kimi-k2.5" && config.enableReasoning) {
        const hasBuiltinTools = clientTools?.some((t: any) => t.function?.name?.startsWith("$"));
        requestBody.thinking = { type: hasBuiltinTools ? "disabled" : "enabled" };
      }

      // 透传工具定义（前端传入）
      if (clientTools && clientTools.length > 0 && modelConfig.supportsFunctionCalling) {
        requestBody.tools = clientTools;
      }

      // 记录审计日志
      logChatEvent("chat_request", {
        sessionId,
        model: config.model,
        messageCount: messages.length,
        inputTokens,
        hasTools: !!requestBody.tools,
        stream: requestBody.stream,
      });

      // ===== 非流式响应 =====
      if (stream === false) {
        const startTime = Date.now();
        const response = await fetch(`${modelConfig.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${modelConfig.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: `HTTP ${response.status}: ${errorText}` }));

          logChatEvent("chat_error", {
            sessionId,
            model: config.model,
            error: `HTTP ${response.status}: ${errorText}`,
          });
          return;
        }

        const result = await response.json();
        const duration = Date.now() - startTime;

        logChatEvent("chat_response", {
          sessionId,
          model: config.model,
          duration,
          usage: result.usage,
          finishReason: result.choices?.[0]?.finish_reason,
        });

        res.setHeader("Content-Type", "application/json");
        res.end(
          JSON.stringify({
            success: true,
            data: result,
            meta: {
              tokenEstimate: { input: inputTokens },
            },
          })
        );
        return;
      }

      // ===== 流式 SSE 响应 =====
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const startTime = Date.now();

      const llmResponse = await fetch(`${modelConfig.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${modelConfig.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!llmResponse.ok) {
        const errorText = await llmResponse.text();
        res.write(`data: ${JSON.stringify({ error: `HTTP ${llmResponse.status}: ${errorText}` })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();

        logChatEvent("chat_error", {
          sessionId,
          model: config.model,
          error: `HTTP ${llmResponse.status}: ${errorText}`,
        });
        return;
      }

      // 注入 token 估算事件
      res.write(`data: ${JSON.stringify({ token_estimate: { input: inputTokens } })}\n\n`);

      const reader = llmResponse.body?.getReader();
      if (!reader) {
        res.write(`data: ${JSON.stringify({ error: "Response body is null" })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let chunkCount = 0;
      let hasError = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunkCount++;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            res.write(`data: ${data}\n\n`);

            if (data === "[DONE]") {
              const duration = Date.now() - startTime;
              logChatEvent("chat_stream_complete", {
                sessionId,
                model: config.model,
                duration,
                chunkCount,
              });
            }
          }
        }

        // 处理剩余 buffer
        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            res.write(`data: ${data}\n\n`);
          }
        }

        if (!hasError) {
          res.write("data: [DONE]\n\n");
        }
      } catch (error: any) {
        hasError = true;
        console.error("[Chat Route] Stream error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.write("data: [DONE]\n\n");

        logChatEvent("chat_stream_error", {
          sessionId,
          model: config.model,
          error: error.message,
        });
      }

      res.end();
    } catch (error: any) {
      console.error("[Chat Route] Error:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ success: false, error: error.message }));
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  });
}
