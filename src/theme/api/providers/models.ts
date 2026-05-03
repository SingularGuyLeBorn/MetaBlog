/**
 * ============================================================================
 * API 服务 - models
 * ============================================================================
 *
 * 本文件属于 MetaBlog 项目,遵循项目注释规范. 
 *
 * @module src/theme/api
 */


/**
 * 模型配置中心
 * 集中管理所有支持的模型详细信息
 * 
 * 设计原则：
 * 1. 单一数据源 - 所有模型信息都从这里获取
 * 2. 与 Provider 解耦 - 模型信息由配置中心管理,Provider 只负责 API 调用
 * 3. 丰富的元数据 - 支持 UI 展示所需的所有信息
 */

import type { ModelCapabilities, ModelInfo, ProviderInfo } from './types'

// ==================== 厂商信息 ====================

export const PROVIDERS: Record<string, ProviderInfo> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    description: '深度求索,专注于大语言模型研发',
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
  // DeepSeek V4 Pro - 最强推理,非多模态
  deepseekV4Pro: {
    vision: false,
    video: false,
    functionCalling: true,
    streaming: true,
    reasoning: true
  } as ModelCapabilities,

  // DeepSeek V4 Flash - 快速响应,非多模态
  deepseekV4Flash: {
    vision: false,
    video: false,
    functionCalling: true,
    streaming: true,
    reasoning: true
  } as ModelCapabilities,

  // Kimi K2.5 - 原生多模态(图片+视频)
  kimiK2_5: {
    vision: true,
    video: true,
    functionCalling: true,
    streaming: true,
    reasoning: true
  } as ModelCapabilities
}

// ==================== 模型定价(元/1K tokens)====================

const PRICING = {
  deepseek: {
    v4_pro: { input: 0.004, output: 0.016 },
    v4_flash: { input: 0.001, output: 0.002 }
  },
  kimi: {
    k2_5: { input: 0.015, output: 0.06 }
  }
}

// ==================== 模型详细配置 ====================

export const MODELS: ModelInfo[] = [
  // ═══════════════════════════════════════════════════════════════
  // DeepSeek V4 Pro - 最强推理模型
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek V4 Pro',
    description: '最强推理,适合深度分析与复杂任务',
    fullDescription: 'DeepSeek-V4-Pro 是 DeepSeek 最强推理模型,支持 reasoning_effort 调节(high/max). 1M 上下文窗口,擅长数学、编程、逻辑推理等复杂任务. 不支持直接识图,上传图片将通过 OCR 提取文字. ',
    providerId: 'deepseek',
    capabilities: CAPABILITIES.deepseekV4Pro,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    pricing: PRICING.deepseek.v4_pro,
    defaultTemperature: 0.7,
    recommended: true,
    tags: ['最强推理', '深度分析', '代码生成', '文本-only'],
    theme: {
      primaryColor: '#4D6BFA',
      secondaryColor: '#7B8FFC',
      icon: '🧠'
    }
  },
  // ═══════════════════════════════════════════════════════════════
  // DeepSeek V4 Flash - 快速响应模型
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    description: '快速响应,性价比高,支持思考模式',
    fullDescription: 'DeepSeek-V4-Flash 是高效快速模型,支持思考/非思考模式切换. 1M 上下文窗口,适合日常对话和轻量级任务. 不支持直接识图,上传图片将通过 OCR 提取文字. ',
    providerId: 'deepseek',
    capabilities: CAPABILITIES.deepseekV4Flash,
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    pricing: PRICING.deepseek.v4_flash,
    defaultTemperature: 0.7,
    recommended: false,
    tags: ['快速响应', '高性价比', '日常对话', '文本-only'],
    theme: {
      primaryColor: '#5B8DEF',
      secondaryColor: '#8FB8FF',
      icon: '⚡'
    }
  },

  // ═══════════════════════════════════════════════════════════════
  // Kimi K2.5 - 原生多模态模型
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'kimi-k2.5',
    name: 'Kimi K2.5',
    description: '原生多模态,支持图片/视频理解',
    fullDescription: 'Kimi K2.5 是月之暗面最新多模态模型,支持文本、图片、视频输入. 支持 enable_thinking 开关控制思考模式. 256K 上下文,在复杂推理、编程、视觉理解方面表现优秀. ',
    providerId: 'kimi',
    capabilities: CAPABILITIES.kimiK2_5,
    contextWindow: 256000,
    maxOutputTokens: 8192,
    pricing: PRICING.kimi.k2_5,
    defaultTemperature: 0.6,
    recommended: true,
    tags: ['多模态', '视觉理解', '视频分析', '图片输入'],
    theme: {
      primaryColor: '#00A9FF',
      secondaryColor: '#66D4FF',
      icon: '🌟'
    }
  }
]

// ==================== 便捷查询方法 ====================

/** 获取所有模型 */
/**
 * 获取AllModels
 *
 * @returns 返回值(ModelInfo[])
 */
export function getAllModels(): ModelInfo[] {
  return MODELS
}

/** 根据ID获取模型 */
/**
 * 获取ModelById
 *
 * @param modelId - 参数(string)
 * @returns 返回值(ModelInfo | undefined)
 */
export function getModelById(modelId: string): ModelInfo | undefined {
  return MODELS.find(m => m.id === modelId)
}

/** 获取指定厂商的模型 */
/**
 * 获取ModelsByProvider
 *
 * @param providerId - 参数(string)
 * @returns 返回值(ModelInfo[])
 */
export function getModelsByProvider(providerId: string): ModelInfo[] {
  return MODELS.filter(m => m.providerId === providerId)
}

/** 获取所有厂商 */
/**
 * 获取AllProviders
 *
 * @returns 返回值(ProviderInfo[])
 */
export function getAllProviders(): ProviderInfo[] {
  return Object.values(PROVIDERS)
}

/** 根据ID获取厂商 */
/**
 * 获取ProviderById
 *
 * @param providerId - 参数(string)
 * @returns 返回值(ProviderInfo | undefined)
 */
export function getProviderById(providerId: string): ProviderInfo | undefined {
  return PROVIDERS[providerId]
}

/** 获取支持的模型ID列表(用于类型检查) */
/**
 * 获取ModelIds
 *
 * @returns 返回值(string[])
 */
export function getModelIds(): string[] {
  return MODELS.map(m => m.id)
}

/** 检查模型是否支持某能力 */
/**
 * modelSupports 函数
 *
 * @param modelId - 参数(string)
 * @param capability - 参数(keyof ModelCapabilities)
 * @returns 返回值(boolean)
 */
export function modelSupports(modelId: string, capability: keyof ModelCapabilities): boolean {
  const model = getModelById(modelId)
  return model?.capabilities[capability] ?? false
}

/** 获取推荐模型 */
/**
 * 获取RecommendedModels
 *
 * @returns 返回值(ModelInfo[])
 */
export function getRecommendedModels(): ModelInfo[] {
  return MODELS.filter(m => m.recommended)
}

/** 按厂商分组的模型 */
/**
 * 获取ModelsByProviderGroup
 *
 * @returns 返回值(Record<string, ModelInfo[]>)
 */
export function getModelsByProviderGroup(): Record<string, ModelInfo[]> {
  return MODELS.reduce((acc, model) => {
    if (!acc[model.providerId]) {
      acc[model.providerId] = []
    }
    acc[model.providerId].push(model)
    return acc
  }, {} as Record<string, ModelInfo[]>)
}
