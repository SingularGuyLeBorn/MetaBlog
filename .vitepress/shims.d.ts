declare module 'markdown-it-mathjax3';
declare module 'diff';
declare module 'cytoscape-dagre';

/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_DEEPSEEK_API_KEY: string
    readonly VITE_DEEPSEEK_BASE_URL: string
    readonly VITE_DEEPSEEK_MODEL: string
    readonly VITE_LLM_DEFAULT_PROVIDER: string
    readonly VITE_LLM_DAILY_BUDGET: string
    readonly VITE_OPENAI_API_KEY: string
    readonly VITE_OPENAI_MODEL: string
    readonly VITE_ANTHROPIC_API_KEY: string
    readonly VITE_ANTHROPIC_MODEL: string
    readonly VITE_GEMINI_API_KEY: string
    readonly VITE_GEMINI_MODEL: string
    readonly VITE_ZHIPU_API_KEY: string
    readonly VITE_ZHIPU_MODEL: string
    readonly VITE_QWEN_API_KEY: string
    readonly VITE_QWEN_MODEL: string
    readonly VITE_KIMI_API_KEY: string
    readonly VITE_KIMI_MODEL: string
    readonly [key: string]: string | undefined
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  
  // VLS types for Vue files
  var _VLS_ctx: any
}

export {}
