/**
 * ============================================================================
 * 配置模块 - env
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module server/config
 */


/**
 * ============================================================================
 * 统一环境变量配置层
 * ============================================================================
 *
 * 设计原则：
 * 1. 禁止业务代码直接读取 process.env,所有配置通过本文件收口
 * 2. 敏感变量(Token/Key)绝不以 VITE_ 前缀暴露给前端
 * 3. 兼容旧变量名(如 FEISHU_APP_ID / LARK_APP_ID),平滑迁移
 * 4. 配置加载时自动清理引号和空值
 */

function cleanEnv(v: string | undefined): string | undefined {
  if (!v) return undefined;
  const trimmed = v.trim().replace(/^["']|["']$/g, "");
  return trimmed === "" ? undefined : trimmed;
}

function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const val = cleanEnv(process.env[key]);
    if (val) return val;
  }
  return undefined;
}

function readEnvBool(...keys: string[]): boolean {
  const val = readEnv(...keys);
  return val === "true" || val === "1" || val === "yes";
}

function readEnvNumber(...keys: string[]): number | undefined {
  const val = readEnv(...keys);
  if (!val) return undefined;
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
}

// ─────────────────────────────────────────────────────────────────────────────
// 外部 API Token 配置
// ─────────────────────────────────────────────────────────────────────────────

export const github = {
  /** GitHub Personal Access Token(后端 BFF 注入,不暴露前端) */
  get token(): string {
    return readEnv("GITHUB_TOKEN", "VITE_GITHUB_TOKEN") || "";
  },
} as const;

export const lark = {
  get appId() { return readEnv("FEISHU_APP_ID", "LARK_APP_ID") || ""; },
  get appSecret() { return readEnv("FEISHU_APP_SECRET", "LARK_APP_SECRET") || ""; },
  get userAccessToken() { return readEnv("FEISHU_USER_ACCESS_TOKEN") || ""; },
} as const;

export const yuque = {
  get session() { return readEnv("YUQUE_SESSION") || ""; },
  get ctoken() { return readEnv("YUQUE_CTOKEN") || ""; },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// LLM 配置(与 server/routes/init.ts 中的逻辑保持一致)
// ─────────────────────────────────────────────────────────────────────────────

export const llm = {
  defaultProvider: readEnv("LLM_DEFAULT_PROVIDER") || "deepseek",
  dailyBudget: readEnvNumber("LLM_DAILY_BUDGET") || 10,
} as const;

/** 按优先级读取 LLM Provider 配置(LLM_ 优先,兼容 VITE_ 回退) */
export function getLLMConfig(key: string): string | undefined {
  return readEnv(`LLM_${key}`, `VITE_${key}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 通用配置
// ─────────────────────────────────────────────────────────────────────────────

export const app = {
  apiBase: readEnv("API_BASE") || "http://localhost:5173",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// 调试与开发
// ─────────────────────────────────────────────────────────────────────────────

export const isDev = process.env.NODE_ENV !== "production";
