/**
 * 模型配置中心
 * 集中管理所有支持的模型详细信息
 * 
 * 设计原则：
 * 1. 单一数据源 - 所有模型信息都从这里获取
 * 2. 与 Provider 解耦 - 模型信息由配置中心管理，Provider 只负责 API 调用
 * 3. 丰富的元数据 - 支持 UI 展示所需的所有信息
 */

import type { ModelInfo, ProviderInfo, ModelCapabilities } from './types'

// ==================== 厂商信息 ====================

export const PROVIDERS: Record<string, ProviderInfo> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '深度求索，专注于大语言模型研发',
    themeColor: '#4D6BFA',
    website: 'https://deepseek.com',
    icon: '🔍'
  },
  kimi: {
    id: 'kimi',
    name: 'Kimi',
    description: '月之暗面 Moonshot AI',
    themeColor: '#00A9FF',
    website: 'https://moonshot.cn',
    icon: '🌙'
  }
}

// ==================== 模型能力模板 ====================

const CAPABILITIES = {
  // DeepSeek 基础能力
  deepseekBase: {
    vision: false,
    video: false,
    functionCalling: true,
    streaming: true,
    reasoning: false
  } as ModelCapabilities,
  
  // DeepSeek 推理能力
  deepseekReasoning: {
    vision: false,
    video: false,
    functionCalling: true,
    streaming: true,
    reasoning: true
  } as ModelCapabilities,
  
  // Kimi 基础多模态能力
  kimiBase: {
    vision: true,
    video: false,
    functionCalling: true,
    streaming: true,
    reasoning: false
  } as ModelCapabilities,
  
  // Kimi 完整多模态能力（含视频）
  kimiFull: {
    vision: true,
    video: true,
    functionCalling: true,
    streaming: true,
    reasoning: false
  } as ModelCapabilities,
  
  // Kimi 思考能力
  kimiThinking: {
    vision: true,
    video: false,
    functionCalling: true,
    streaming: true,
    reasoning: true
  } as ModelCapabilities
}

// ==================== 模型定价（元/1K tokens）====================

const PRICING = {
  deepseek: {
    chat: { input: 0.001, output: 0.002 },
    reasoner: { input: 0.004, output: 0.016 }
  },
  kimi: {
    k2_5: { input: 0.015, output: 0.06 },
    k2_turbo: { input: 0.005, output: 0.02 },
    k2_thinking: { input: 0.015, output: 0.06 },
    k2_thinking_turbo: { input: 0.008, output: 0.032 }
  }
}

// ==================== 模型详细配置 ====================

export const MODELS: ModelInfo[] = [
  // ═══════════════════════════════════════════════════════════════
  // DeepSeek 模型
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: '通用对话，适合日常交流',
    fullDescription: 'DeepSeek-V3 基础对话模型，擅长中文和英文日常对话、文本生成、知识问答等任务。响应快速，性价比高。',
    providerId: 'deepseek',
    capabilities: CAPABILITIES.deepseekBase,
    contextWindow: 64000,
    maxOutputTokens: 8192,
    pricing: PRICING.deepseek.chat,
    defaultTemperature: 0.7,
    recommended: true,
    tags: ['高性价比', '日常对话', '快速响应'],
    theme: {
      primaryColor: '#4D6BFA',
      secondaryColor: '#7B8FFC',
      icon: '💬'
    }
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    description: '深度思考，自动展示推理过程',
    fullDescription: 'DeepSeek-R1 推理模型，擅长数学、编程、逻辑推理等复杂任务。会展示完整的思考过程，适合需要深度分析的场景。',
    providerId: 'deepseek',
    capabilities: CAPABILITIES.deepseekReasoning,
    contextWindow: 64000,
    maxOutputTokens: 8192,
    pricing: PRICING.deepseek.reasoner,
    defaultTemperature: 0.7,
    recommended: false,
    tags: ['深度思考', '数学推理', '代码生成'],
    theme: {
      primaryColor: '#6B4DFA',
      secondaryColor: '#9B8FFC',
      icon: '🧠'
    }
  },
  
  // ═══════════════════════════════════════════════════════════════
  // Kimi 模型
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    description: '最新多模态模型，支持图片和视频',
    fullDescription: 'Kimi K2.5 是月之暗面最新多模态模型，支持图片和视频理解。在复杂推理、编程、视觉理解方面表现优秀。',
    providerId: 'kimi',
    capabilities: CAPABILITIES.kimiFull,
    contextWindow: 256000,
    maxOutputTokens: 8192,
    pricing: PRICING.kimi.k2_5,
    defaultTemperature: 0.6,
    recommended: true,
    tags: ['多模态', '视觉理解', '视频分析', '最强性能'],
    theme: {
      primaryColor: '#00A9FF',
      secondaryColor: '#66D4FF',
      icon: '🌟'
    }
  },
  {
    id: 'kimi-k2-turbo-preview',
    name: 'Kimi K2 Turbo',
    description: '快速响应，支持图片理解',
    fullDescription: 'K2 Turbo 预览版，在保持多模态能力的同时提供更快的响应速度。支持图片理解，适合日常对话和轻量级任务。',
    providerId: 'kimi',
    capabilities: CAPABILITIES.kimiBase,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    pricing: PRICING.kimi.k2_turbo,
    defaultTemperature: 0.6,
    recommended: false,
    tags: ['快速响应', '图片理解', '性价比高'],
    theme: {
      primaryColor: '#00D4AA',
      secondaryColor: '#66E5CC',
      icon: '⚡'
    }
  },
  {
    id: 'kimi-k2-thinking',
    name: 'Kimi K2 Thinking',
    description: '思考模式，支持图片理解',
    fullDescription: 'K2 思考模式，结合多模态能力和深度推理。适合需要分析图片并给出详细推理的复杂场景。',
    providerId: 'kimi',
    capabilities: CAPABILITIES.kimiThinking,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    pricing: PRICING.kimi.k2_thinking,
    defaultTemperature: 0.6,
    recommended: false,
    tags: ['思考模式', '图片理解', '深度推理'],
    theme: {
      primaryColor: '#FF6B6B',
      secondaryColor: '#FF9999',
      icon: '🤔'
    }
  },
  {
    id: 'kimi-k2-thinking-turbo',
    name: 'Kimi K2 Thinking Turbo',
    description: '思考模式快速版',
    fullDescription: 'K2 思考模式快速版，在保持推理能力的同时提供更快的响应速度。适合需要快速思考的交互场景。',
    providerId: 'kimi',
    capabilities: CAPABILITIES.kimiThinking,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    pricing: PRICING.kimi.k2_thinking_turbo,
    defaultTemperature: 0.6,
    recommended: false,
    tags: ['思考模式', '快速响应', '图片理解'],
    theme: {
      primaryColor: '#FF8C42',
      secondaryColor: '#FFB380',
      icon: '💭'
    }
  }
]

// ==================== 便捷查询方法 ====================

/** 获取所有模型 */
export function getAllModels(): ModelInfo[] {
  return MODELS
}

/** 根据ID获取模型 */
export function getModelById(modelId: string): ModelInfo | undefined {
  return MODELS.find(m => m.id === modelId)
}

/** 获取指定厂商的模型 */
export function getModelsByProvider(providerId: string): ModelInfo[] {
  return MODELS.filter(m => m.providerId === providerId)
}

/** 获取所有厂商 */
export function getAllProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS)
}

/** 根据ID获取厂商 */
export function getProviderById(providerId: string): ProviderInfo | undefined {
  return PROVIDERS[providerId]
}

/** 获取支持的模型ID列表（用于类型检查） */
export function getModelIds(): string[] {
  return MODELS.map(m => m.id)
}

/** 检查模型是否支持某能力 */
export function modelSupports(modelId: string, capability: keyof ModelCapabilities): boolean {
  const model = getModelById(modelId)
  return model?.capabilities[capability] ?? false
}

/** 获取推荐模型 */
export function getRecommendedModels(): ModelInfo[] {
  return MODELS.filter(m => m.recommended)
}

/** 按厂商分组的模型 */
export function getModelsByProviderGroup(): Record<string, ModelInfo[]> {
  return MODELS.reduce((acc, model) => {
    if (!acc[model.providerId]) {
      acc[model.providerId] = []
    }
    acc[model.providerId].push(model)
    return acc
  }, {} as Record<string, ModelInfo[]>)
}
