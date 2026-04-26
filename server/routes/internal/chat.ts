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

// ==================== LLM API 错误翻译器 ====================

function translateLLMError(status: number, errorText: string, provider: string): { message: string; suggestion: string } {
  const lower = errorText.toLowerCase();

  if (status === 401) {
    return {
      message: `${provider} API Key 无效或已过期`,
      suggestion: "请检查 LLM API Key 配置是否正确（DEEPSEEK_API_KEY 或 KIMI_API_KEY），或密钥是否已过期/被撤销",
    };
  }
  if (status === 402 || lower.includes("insufficient_quota") || lower.includes("quota") || lower.includes("billing") || lower.includes("balance")) {
    return {
      message: `${provider} 账户额度不足`,
      suggestion: "API 账户余额已用完或超出配额限制，请充值或检查账单设置",
    };
  }
  if (status === 429 || lower.includes("rate limit") || lower.includes("too many requests")) {
    return {
      message: `${provider} 请求过于频繁（速率限制）`,
      suggestion: "触发了 API 速率限制，请降低请求频率，稍后重试。如频繁出现，考虑升级账户或增加并发配额",
    };
  }
  if (status === 400) {
    if (lower.includes("context length") || lower.includes("too long") || lower.includes("maximum context")) {
      return {
        message: `${provider} 上下文长度超出限制`,
        suggestion: "当前对话历史+输入内容超出了模型的最大上下文长度，请删除部分历史消息或缩短输入",
      };
    }
    if (lower.includes("invalid") || lower.includes("bad request")) {
      return {
        message: `${provider} 请求参数无效`,
        suggestion: "请检查请求体格式、模型名称、temperature 等参数是否符合 API 规范",
      };
    }
    return {
      message: `${provider} 请求格式错误`,
      suggestion: "请检查请求参数是否正确，常见原因：上下文过长、JSON 格式错误、参数值不合法",
    };
  }
  if (status === 403) {
    return {
      message: `${provider} 访问被拒绝`,
      suggestion: "API Key 无权访问该模型或功能，请确认密钥权限范围",
    };
  }
  if (status === 404) {
    return {
      message: `${provider} 模型不存在`,
      suggestion: "请求的模型名称可能不正确或该模型已下线，请检查模型 ID",
    };
  }
  if (status === 500) {
    return {
      message: `${provider} 服务器内部错误`,
      suggestion: "LLM 服务端异常，请稍后重试。如持续出现，可能是模型临时不可用",
    };
  }
  if (status === 502 || status === 503) {
    return {
      message: `${provider} 服务暂时不可用`,
      suggestion: "LLM 服务可能正在维护或过载，请稍后重试",
    };
  }
  if (status === 504) {
    return {
      message: `${provider} 请求超时`,
      suggestion: "LLM 服务端处理超时，请稍后重试或简化请求",
    };
  }

  return {
    message: `${provider} API 错误 (HTTP ${status})`,
    suggestion: `请求失败，原始错误：${errorText.slice(0, 200)}。建议检查 API Key、模型名称、网络连接`,
  };
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

/**
 * 读取环境变量（兼容 LLM_ 和 VITE_ 前缀）
 *
 * 设计说明：
 *   依赖 server/vitepress-integration.ts 顶部预加载的 process.env。
 *   由于 .env 在 server entry 点已加载，此处直接使用 process.env 即可，
 *   无需每次调用 loadEnv() 读文件。
 *
 * 优先级：
 *   1. process.env[key]（精确匹配）
 *   2. process.env[key.replace("LLM_", "VITE_")]（VITE_ 前缀回退）
 *   3. fallback（默认值）
 */
function env(key: string, fallback: string = ""): string {
  return process.env[key] || process.env[key.replace("LLM_", "VITE_")] || fallback;
}

/**
 * 模型配置模板（不含动态 apiKey）
 *
 * 注意：apiKey 等敏感配置在 getModelConfig() 中动态读取，
 * 避免模块级常量导致的初始化时机问题。
 */
const MODEL_CONFIG_TEMPLATES: Record<string, Omit<ModelConfig, "apiKey"> & { apiKeyEnv: string }> = {
  "deepseek-chat": {
    provider: "deepseek",
    model: "deepseek-chat",
    baseURL: "https://api.deepseek.com/v1",
    apiKeyEnv: "LLM_DEEPSEEK_API_KEY",
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
    apiKeyEnv: "LLM_DEEPSEEK_API_KEY",
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
    apiKeyEnv: "LLM_KIMI_API_KEY",
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
    apiKeyEnv: "LLM_KIMI_API_KEY",
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
    apiKeyEnv: "LLM_KIMI_API_KEY",
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
    apiKeyEnv: "LLM_KIMI_API_KEY",
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
    apiKeyEnv: "LLM_KIMI_API_KEY",
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
    apiKeyEnv: "LLM_KIMI_API_KEY",
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
    apiKeyEnv: "LLM_KIMI_API_KEY",
    supportsVision: true,
    supportsVideo: false,
    supportsFunctionCalling: true,
    maxTokens: 128000,
    contextWindow: 128000,
  },
};

/**
 * 获取模型配置（惰性初始化）
 *
 * 每次调用时从 process.env 动态读取 apiKey，确保：
 * 1. 不依赖模块加载顺序（.env 预加载后 process.env 始终可用）
 * 2. 支持运行时更换 Key（无需重启服务器）
 * 3. 避免模块级常量导致的初始化时机问题
 *
 * @param modelName - 模型名称，如 "deepseek-chat"、"kimi-k2.5"
 * @returns 完整的 ModelConfig（含动态读取的 apiKey）
 * @throws Error 当模型名称不存在时
 */
function getModelConfig(modelName: string): ModelConfig {
  const template = MODEL_CONFIG_TEMPLATES[modelName];
  if (!template) {
    throw new Error(`不支持的模型: ${modelName}`);
  }
  return {
    ...template,
    apiKey: env(template.apiKeyEnv),
  };
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
          const translated = translateLLMError(response.status, errorText, modelConfig.provider);
          res.statusCode = response.status;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            success: false,
            error: `HTTP ${response.status}: ${errorText.slice(0, 500)}`,
            message: translated.message,
            suggestion: translated.suggestion,
            code: response.status,
          }));

          logChatEvent("chat_error", {
            sessionId,
            model: config.model,
            error: `HTTP ${response.status}: ${errorText}`,
            translated: translated.message,
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
        const translated = translateLLMError(llmResponse.status, errorText, modelConfig.provider);
        res.write(`data: ${JSON.stringify({
          error: `HTTP ${llmResponse.status}: ${errorText.slice(0, 500)}`,
          message: translated.message,
          suggestion: translated.suggestion,
          code: llmResponse.status,
        })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();

        logChatEvent("chat_error", {
          sessionId,
          model: config.model,
          error: `HTTP ${llmResponse.status}: ${errorText}`,
          translated: translated.message,
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
