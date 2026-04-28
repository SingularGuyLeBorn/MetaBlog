declare module 'markdown-it-mathjax3';
declare module 'diff';
declare module 'cytoscape-dagre';

/// <reference types="vite/client" />

/**
 * Vite 客户端环境变量类型声明
 *
 * 安全原则：API Key 等敏感信息不得使用 VITE_ 前缀，避免打包到前端 bundle。
 * 所有 LLM API Key 应在服务端通过 LLM_* 前缀读取(由 dotenv 预加载到 process.env)。
 */
declare global {
  interface ImportMetaEnv {
    // 服务端代理配置(非敏感，可透传前端了解后端行为)
    readonly VITE_LLM_DEFAULT_PROVIDER: string
    readonly VITE_LLM_DAILY_BUDGET: string
    // 模型默认选择(非敏感)
    readonly VITE_DEEPSEEK_MODEL: string
    readonly VITE_OPENAI_MODEL: string
    readonly VITE_ANTHROPIC_MODEL: string
    readonly VITE_GEMINI_MODEL: string
    readonly VITE_ZHIPU_MODEL: string
    readonly VITE_QWEN_MODEL: string
    readonly VITE_KIMI_MODEL: string
    readonly [key: string]: string | undefined
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }

  // VLS types for Vue files
  var _VLS_ctx: any
}

export { }

