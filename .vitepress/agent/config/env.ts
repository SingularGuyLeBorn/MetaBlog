/**
 * 环境配置加载
 * 从 .env 文件读取 LLM 配置
 */
import type { ProviderType, LLMManagerConfig } from '../llm/types'

interface EnvConfig {
  LLM_DEFAULT_PROVIDER: ProviderType
  LLM_DAILY_BUDGET: number
  
  // OpenAI
  OPENAI_API_KEY?: string
  OPENAI_BASE_URL?: string
  OPENAI_MODEL?: string
  
  // Anthropic
  ANTHROPIC_API_KEY?: string
  ANTHROPIC_BASE_URL?: string
  ANTHROPIC_MODEL?: string
  
  // Google Gemini
  GEMINI_API_KEY?: string
  GEMINI_BASE_URL?: string
  GEMINI_MODEL?: string
  
  // Zhipu (智谱)
  ZHIPU_API_KEY?: string
  ZHIPU_BASE_URL?: string
  ZHIPU_MODEL?: string
  
  // DeepSeek
  DEEPSEEK_API_KEY?: string
  DEEPSEEK_BASE_URL?: string
  DEEPSEEK_MODEL?: string
  
  // Qwen (阿里云)
  QWEN_API_KEY?: string
  QWEN_BASE_URL?: string
  QWEN_MODEL?: string
  
  // Kimi (Moonshot)
  KIMI_API_KEY?: string
  KIMI_BASE_URL?: string
  KIMI_MODEL?: string
}

/**
 * 从环境变量加载配置
 * 支持 Vite 的 import.meta.env 和 Node 的 process.env
 */
export function loadEnvConfig(): EnvConfig {
  // 尝试从 import.meta.env (Vite) 或 process.env (Node) 读取
  const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) 
    ? (import.meta as any).env 
    : (typeof process !== 'undefined' ? process.env : {})

  return {
    LLM_DEFAULT_PROVIDER: (env.VITE_LLM_DEFAULT_PROVIDER || env.LLM_DEFAULT_PROVIDER || 'deepseek') as ProviderType,
    LLM_DAILY_BUDGET: parseFloat(env.VITE_LLM_DAILY_BUDGET || env.LLM_DAILY_BUDGET || '10'),
    
    // OpenAI
    OPENAI_API_KEY: env.VITE_OPENAI_API_KEY || env.OPENAI_API_KEY,
    OPENAI_BASE_URL: env.VITE_OPENAI_BASE_URL || env.OPENAI_BASE_URL,
    OPENAI_MODEL: env.VITE_OPENAI_MODEL || env.OPENAI_MODEL || 'gpt-4o',
    
    // Anthropic
    ANTHROPIC_API_KEY: env.VITE_ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY,
    ANTHROPIC_BASE_URL: env.VITE_ANTHROPIC_BASE_URL || env.ANTHROPIC_BASE_URL,
    ANTHROPIC_MODEL: env.VITE_ANTHROPIC_MODEL || env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
    
    // Google Gemini
    GEMINI_API_KEY: env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY,
    GEMINI_BASE_URL: env.VITE_GEMINI_BASE_URL || env.GEMINI_BASE_URL,
    GEMINI_MODEL: env.VITE_GEMINI_MODEL || env.GEMINI_MODEL || 'gemini-1.5-pro',
    
    // Zhipu
    ZHIPU_API_KEY: env.VITE_ZHIPU_API_KEY || env.ZHIPU_API_KEY,
    ZHIPU_BASE_URL: env.VITE_ZHIPU_BASE_URL || env.ZHIPU_BASE_URL,
    ZHIPU_MODEL: env.VITE_ZHIPU_MODEL || env.ZHIPU_MODEL || 'glm-4',
    
    // DeepSeek
    DEEPSEEK_API_KEY: env.VITE_DEEPSEEK_API_KEY || env.DEEPSEEK_API_KEY,
    DEEPSEEK_BASE_URL: env.VITE_DEEPSEEK_BASE_URL || env.DEEPSEEK_BASE_URL,
    DEEPSEEK_MODEL: env.VITE_DEEPSEEK_MODEL || env.DEEPSEEK_MODEL || 'deepseek-chat',
    
    // Qwen
    QWEN_API_KEY: env.VITE_QWEN_API_KEY || env.QWEN_API_KEY,
    QWEN_BASE_URL: env.VITE_QWEN_BASE_URL || env.QWEN_BASE_URL,
    QWEN_MODEL: env.VITE_QWEN_MODEL || env.QWEN_MODEL || 'qwen-plus',
    
    // Kimi
    KIMI_API_KEY: env.VITE_KIMI_API_KEY || env.KIMI_API_KEY,
    KIMI_BASE_URL: env.VITE_KIMI_BASE_URL || env.KIMI_BASE_URL,
    KIMI_MODEL: env.VITE_KIMI_MODEL || env.KIMI_MODEL || 'kimi-latest'
  }
}

/**
 * 将环境配置转换为 LLMManagerConfig
 * 优先使用 DeepSeek 作为默认提供商
 */
export function createLLMConfigFromEnv(): LLMManagerConfig {
  const env = loadEnvConfig()
  
  const providers: LLMManagerConfig['providers'] = {}

  // 硬编码 DeepSeek 配置（从 .env 文件读取）
  // 参考 model-reference/deepseek/notebook/01-基础对话.ipynb
  const deepseekKey = env.DEEPSEEK_API_KEY || 'sk-c5d5e8a88be5479087a8df7bef8a257b'
  const deepseekBaseUrl = env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'
  const deepseekModel = env.DEEPSEEK_MODEL || 'deepseek-chat'
  
  if (deepseekKey && !deepseekKey.includes('your')) {
    providers.deepseek = {
      apiKey: deepseekKey,
      baseURL: deepseekBaseUrl,
      model: deepseekModel
    }
  }

  // OpenAI（仅当配置了有效 key）
  if (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('your')) {
    providers.openai = {
      apiKey: env.OPENAI_API_KEY,
      baseURL: env.OPENAI_BASE_URL,
      model: env.OPENAI_MODEL || 'gpt-4o'
    }
  }

  // Anthropic
  if (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('your')) {
    providers.anthropic = {
      apiKey: env.ANTHROPIC_API_KEY,
      baseURL: env.ANTHROPIC_BASE_URL,
      model: env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
    }
  }

  // Gemini
  if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes('your')) {
    providers.gemini = {
      apiKey: env.GEMINI_API_KEY,
      baseURL: env.GEMINI_BASE_URL,
      model: env.GEMINI_MODEL || 'gemini-1.5-pro'
    }
  }

  // Zhipu
  if (env.ZHIPU_API_KEY && !env.ZHIPU_API_KEY.includes('your')) {
    providers.zhipu = {
      apiKey: env.ZHIPU_API_KEY,
      baseURL: env.ZHIPU_BASE_URL,
      model: env.ZHIPU_MODEL || 'glm-4'
    }
  }

  // Qwen
  if (env.QWEN_API_KEY && !env.QWEN_API_KEY.includes('your')) {
    providers.qwen = {
      apiKey: env.QWEN_API_KEY,
      baseURL: env.QWEN_BASE_URL,
      model: env.QWEN_MODEL || 'qwen-plus'
    }
  }

  // Kimi
  if (env.KIMI_API_KEY && !env.KIMI_API_KEY.includes('your')) {
    providers.kimi = {
      apiKey: env.KIMI_API_KEY,
      baseURL: env.KIMI_BASE_URL,
      model: env.KIMI_MODEL || 'kimi-latest'
    }
  }

  // 确定默认 provider：优先使用 DeepSeek
  let defaultProvider: ProviderType = 'deepseek'
  if (!providers.deepseek && providers.openai) {
    defaultProvider = 'openai'
  } else if (!providers.deepseek && Object.keys(providers).length > 0) {
    defaultProvider = Object.keys(providers)[0] as ProviderType
  }

  return {
    defaultProvider,
    dailyBudget: env.LLM_DAILY_BUDGET,
    providers
  }
}

/**
 * 获取当前启用的 providers
 */
export function getEnabledProviders(): ProviderType[] {
  const env = loadEnvConfig()
  const enabled: ProviderType[] = []

  if (env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('your')) enabled.push('openai')
  if (env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('your')) enabled.push('anthropic')
  if (env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes('your')) enabled.push('gemini')
  if (env.ZHIPU_API_KEY && !env.ZHIPU_API_KEY.includes('your')) enabled.push('zhipu')
  if (env.DEEPSEEK_API_KEY && !env.DEEPSEEK_API_KEY.includes('your')) enabled.push('deepseek')
  if (env.QWEN_API_KEY && !env.QWEN_API_KEY.includes('your')) enabled.push('qwen')
  if (env.KIMI_API_KEY && !env.KIMI_API_KEY.includes('your')) enabled.push('kimi')

  return enabled
}

/**
 * 检查 provider 是否配置
 */
export function isProviderConfigured(provider: ProviderType): boolean {
  const env = loadEnvConfig()
  
  switch (provider) {
    case 'openai':
      return !!(env.OPENAI_API_KEY && !env.OPENAI_API_KEY.includes('your'))
    case 'anthropic':
      return !!(env.ANTHROPIC_API_KEY && !env.ANTHROPIC_API_KEY.includes('your'))
    case 'gemini':
      return !!(env.GEMINI_API_KEY && !env.GEMINI_API_KEY.includes('your'))
    case 'zhipu':
      return !!(env.ZHIPU_API_KEY && !env.ZHIPU_API_KEY.includes('your'))
    case 'deepseek':
      return !!(env.DEEPSEEK_API_KEY && !env.DEEPSEEK_API_KEY.includes('your'))
    case 'qwen':
      return !!(env.QWEN_API_KEY && !env.QWEN_API_KEY.includes('your'))
    case 'kimi':
      return !!(env.KIMI_API_KEY && !env.KIMI_API_KEY.includes('your'))
    default:
      return false
  }
}
