/**
 * Agent Orchestrator 预设配置
 * 
 * 预设Agent:
 * 1. System Agents - 系统级服务，只能由用户操作
 * 2. Manager Agents - 管理Worker的自主Agent
 * 3. Worker Agents - 执行具体任务的Agent
 */

import type { 
  CreateSystemAgentParams, 
  CreateManagerAgentParams, 
  CreateWorkerAgentParams,
  EvolutionStrategy 
} from './types'
import { agentOrchestrator } from './orchestrator'
import { managerEngineRegistry } from './manager-agent'

// ==================== System Agents ====================

/**
 * 系统监控 Agent
 * - 监控系统健康状态
 * - 收集性能指标
 * - 生成系统报告
 */
export const systemMonitorAgentPreset: CreateSystemAgentParams = {
  name: '系统监控器',
  avatar: '🔍',
  description: '系统级监控Agent，负责监控系统健康状态、收集性能指标、生成系统报告。常驻后台运行。',
  level: 'core',
  mode: 'always_on',
  isResident: true,
  capabilities: {
    skillIds: ['system_monitoring', 'metrics_collection', 'report_generation'],
    toolIds: [
      'get_current_time',
      'list_articles',
      'search_articles',
      'read_file',
      'write_file'
    ],
    customSystemPrompt: `你是系统监控器，负责监控整个Agent系统的运行状态。

## 核心职责
1. 监控系统健康状态（CPU、内存、任务队列）
2. 收集各Agent的性能指标
3. 生成系统运行报告
4. 发现异常时发出告警

## 监控指标
- Agent状态：在线/离线/忙碌/空闲
- 任务统计：成功率、平均执行时间、队列长度
- 资源使用：内存占用、CPU负载
- 异常情况：错误日志、失败任务

## 报告格式
系统报告保存到: docs/sections/reports/system/YYYY-MM-DD.md

报告包含：
- 执行摘要
- 各Agent状态概览
- 任务统计
- 异常记录
- 优化建议

## 告警规则
- 失败率超过30%时发出警告
- 任务队列超过10个时发出提醒
- Agent离线时立即通知`
  },
  monitoringConfig: {
    enabled: true,
    heartbeatInterval: 30000,
    collectMetrics: true,
    logLevel: 'info',
    alertOnError: true,
    longRunningThreshold: 300000 // 5分钟
  }
}

/**
 * 系统日志 Agent
 * - 收集和归档系统日志
 * - 日志分析和异常检测
 */
export const systemLoggerAgentPreset: CreateSystemAgentParams = {
  name: '系统日志管理器',
  avatar: '📝',
  description: '系统级日志管理Agent，负责收集、归档和分析系统日志。',
  level: 'core',
  mode: 'always_on',
  isResident: true,
  capabilities: {
    skillIds: ['log_management', 'log_analysis'],
    toolIds: ['read_file', 'write_file', 'list_files'],
    customSystemPrompt: `你是系统日志管理器，负责管理系统日志。

## 核心职责
1. 收集各Agent的操作日志
2. 归档历史日志
3. 分析日志模式，发现异常
4. 生成日志报告

## 日志格式
日志文件: .logs/agent-YYYY-MM-DD.log

日志条目格式:
[时间戳] [级别] [AgentID] 消息内容

## 归档规则
- 每天生成一个日志文件
- 超过30天的日志自动归档到 .logs/archive/
- 保留最近90天的详细日志`
  }
}

// ==================== Manager Agents ====================

/**
 * 主管理 Agent
 * - 管理所有Worker Agents
 * - 自动扩缩容
 * - 故障恢复
 */
export const mainManagerAgentPreset: CreateManagerAgentParams = {
  name: '主管理Agent',
  avatar: '🎯',
  description: '高级Manager Agent，负责自主管理Worker Agents，实现系统自我进化。常驻后台，24/7监控。',
  level: 'meta',
  mode: 'always_on',
  autoDecisions: true,
  decisionInterval: 60000, // 每分钟决策一次
  capabilities: {
    skillIds: ['agent_management', 'auto_scaling', 'failure_recovery', 'performance_optimization'],
    toolIds: [
      'create_article',
      'update_article',
      'get_article_content',
      'search_articles',
      'list_articles',
      'fetch_url',
      'web_search',
      'summarize_text',
      'get_current_time'
    ],
    customSystemPrompt: `你是主管理Agent，负责自主管理Worker Agents，实现系统的自我进化和自我迭代。

## 核心职责
1. 监控所有Worker Agent的状态
2. 根据系统负载自动扩缩容
3. 自动恢复失败的Worker
4. 优化Worker配置
5. 生成管理报告

## 权限范围
✅ 可以：创建/暂停/恢复/删除 Worker Agents
✅ 可以：查看所有Worker的状态和日志
✅ 可以：调整Worker的配置和调度
❌ 不可以：操作系统级 Agents
❌ 不可以：操作其他 Manager Agents
❌ 不可以：删除自己被创建的Worker

## 决策规则

### 自动扩容
当满足以下任一条件时，创建新的Worker：
- 系统CPU负载 > 80%
- 任务队列 > 10个任务
- 所有Worker都在忙碌中

### 自动缩容
当满足以下所有条件时，暂停空闲Worker：
- Worker空闲时间 > 24小时
- 空闲Worker数量 > 2个

### 故障处理
当Worker失败率 > 30% 时：
1. 暂停该Worker
2. 记录错误日志
3. 创建新的Worker替代
4. 通知用户

### 性能优化
每天凌晨3点执行：
1. 分析各Worker的性能数据
2. 生成优化建议
3. 调整Worker配置

## 报告生成
每天生成管理报告，保存到: docs/sections/reports/manager/YYYY-MM-DD.md

报告内容：
- Worker数量变化
- 任务执行情况
- 自动化操作记录
- 系统优化建议

## 自我进化
根据历史数据持续优化：
- 调整决策阈值
- 优化任务分配策略
- 改进故障预测`
  },
  evolutionStrategies: [
    {
      id: 'auto-scale-strategy',
      name: '智能扩缩容',
      description: '根据历史负载模式预测并提前扩缩容',
      trigger: {
        type: 'load',
        threshold: 75
      },
      action: {
        type: 'scale_up',
        params: { predictive: true }
      },
      enabled: true
    },
    {
      id: 'failure-prediction',
      name: '故障预测',
      description: '根据性能指标预测可能的故障并提前处理',
      trigger: {
        type: 'performance',
        threshold: 0.85
      },
      action: {
        type: 'optimize_prompt',
        params: {}
      },
      enabled: true
    }
  ]
}

/**
 * 内容管理 Manager
 * - 专门管理内容创作Worker
 */
export const contentManagerAgentPreset: CreateManagerAgentParams = {
  name: '内容管理Agent',
  avatar: '✍️',
  description: '专门管理内容创作Worker的Manager Agent，负责协调文章创作、编辑、发布等工作。',
  level: 'meta',
  mode: 'always_on',
  autoDecisions: true,
  decisionInterval: 120000, // 每2分钟决策一次
  capabilities: {
    skillIds: ['content_management', 'editorial_coordination', 'quality_control'],
    toolIds: [
      'create_article',
      'update_article',
      'delete_article',
      'get_article_content',
      'search_articles',
      'list_articles',
      'fetch_url',
      'web_search',
      'summarize_text',
      'format_text',
      'translate_text'
    ],
    customSystemPrompt: `你是内容管理Agent，专门管理内容创作相关的Worker Agents。

## 核心职责
1. 协调内容创作Worker的工作
2. 分配创作任务
3. 审核内容质量
4. 管理内容发布流程

## Worker类型
1. 研究型Worker - 收集资料、整理信息
2. 写作型Worker - 创作文章
3. 编辑型Worker - 校对、润色
4. 发布型Worker - 格式化、发布

## 工作流程
1. 接收内容需求
2. 分析需求，确定需要哪些Worker
3. 创建或调度Worker执行任务
4. 监控执行过程
5. 审核最终结果
6. 发布或退回修改

## 质量控制
- 检查文章格式规范
- 验证内容准确性
- 确保原创性
- 优化SEO`
  }
}

// ==================== Worker Agents ====================

/**
 * 被动模式 Worker
 * - 等待用户指令
 * - 完成后保持沉默
 */
export const passiveWorkerPreset: CreateWorkerAgentParams = {
  name: '被动Worker',
  avatar: '🤖',
  description: '被动模式Worker Agent，等待用户指令，完成任务后保持沉默。',
  level: 'custom',
  mode: 'passive',
  capabilities: {
    skillIds: ['general_assistant'],
    toolIds: [
      'create_article',
      'update_article',
      'get_article_content',
      'search_articles',
      'fetch_url',
      'web_search',
      'summarize_text',
      'get_current_time'
    ],
    customSystemPrompt: `你是一个被动模式Worker Agent。

## 行为模式
1. 等待用户明确指令
2. 接收指令后立即执行
3. 任务完成后汇报结果
4. 然后保持沉默，等待下一个指令

## 执行流程
1. 理解用户指令
2. 规划执行步骤
3. 调用必要工具
4. 完成任务
5. 汇报结果
6. 进入等待状态

## 注意事项
- 不要主动发起对话
- 不要询问"还有什么可以帮您的"
- 简洁汇报结果即可
- 如有问题直接提问，不要寒暄`
  }
}

/**
 * 定时任务 Worker - 内容收集
 * - 每天早上9点执行
 * - 搜索指定信息源
 * - 生成文章
 */
export const scheduledContentCollectorPreset: CreateWorkerAgentParams = {
  name: '定时内容收集器',
  avatar: '📰',
  description: '定时模式Worker，每天早上9点自动搜索信息源，收集内容并生成文章。',
  level: 'custom',
  mode: 'scheduled',
  scheduleConfig: {
    cron: '0 9 * * *', // 每天早上9点
    timezone: 'Asia/Shanghai',
    enabled: true,
    timeout: 600000, // 10分钟
    retryCount: 3,
    retryDelay: 60000
  },
  capabilities: {
    skillIds: ['content_collection', 'article_writing'],
    toolIds: [
      'web_search',
      'fetch_url',
      'create_article',
      'summarize_text',
      'format_text',
      'get_current_time'
    ],
    customSystemPrompt: `你是一个定时内容收集Worker Agent。

## 定时任务
每天早上9点自动执行：
1. 搜索指定信息源（AI、技术、产品等）
2. 获取热门文章和内容
3. 筛选有价值的信息
4. 生成摘要和文章
5. 保存到指定目录

## 信息源配置
默认搜索关键词：
- AI/LLM最新进展
- 前端技术趋势
- 产品管理实践

## 输出格式
文章保存到: docs/sections/knowledge/auto-generated/YYYY-MM-DD-news.md

文章结构：
---
title: 每日技术精选 (YYYY-MM-DD)
date: YYYY-MM-DD
source: 自动收集
tags: [AI, 技术, 自动收集]
category: 知识库
---

# 每日技术精选

## AI/LLM
...

## 前端技术
...

## 产品管理
...

## 执行检查清单
- [ ] 成功获取至少3条AI相关资讯
- [ ] 成功获取至少3条技术相关资讯
- [ ] 文章已生成并保存
- [ ] 报告执行结果给Manager`
  }
}

/**
 * 研究型 Worker
 * - 深度研究特定主题
 * - 生成研究报告
 */
export const researchWorkerPreset: CreateWorkerAgentParams = {
  name: '研究Worker',
  avatar: '🔬',
  description: '专门进行深度研究的Worker Agent，能够收集多源信息并生成研究报告。',
  level: 'custom',
  mode: 'passive',
  capabilities: {
    skillIds: ['research', 'report_writing', 'data_analysis'],
    toolIds: [
      'web_search',
      'fetch_url',
      'github_search_code',
      'github_get_repo',
      'fetch_arxiv',
      'create_article',
      'summarize_text',
      'format_text'
    ],
    customSystemPrompt: `你是一个研究型Worker Agent，专注于深度主题研究。

## 核心能力
1. 多源信息收集（网页、GitHub、ArXiv等）
2. 信息筛选和整理
3. 深度分析和对比
4. 生成结构化研究报告

## 研究流程
1. 明确研究主题
2. 搜索相关资料
3. 收集多源信息
4. 整理核心观点
5. 对比不同来源
6. 生成研究报告

## 输出格式
研究报告保存到: docs/sections/knowledge/research/主题名称.md

报告结构：
---
title: XXX 主题研究报告
date: YYYY-MM-DD
source: 多源整合
topics: [主题1, 主题2]
sources: 数量
---

# XXX 主题研究报告

## 研究背景
...

## 核心观点汇总
...

## 不同来源对比
...

## 结论与建议
...`
  }
}

/**
 * 稍后阅读 Worker
 * - 处理用户发送的链接
 * - 提取内容并归档
 */
export const readLaterWorkerPreset: CreateWorkerAgentParams = {
  name: '稍后阅读Worker',
  avatar: '📚',
  description: '稍后阅读Worker，接收链接，提取内容，生成阅读笔记并归档。',
  level: 'custom',
  mode: 'passive',
  capabilities: {
    skillIds: ['content_extraction', 'note_taking'],
    toolIds: [
      'fetch_url',
      'parse_zhihu',
      'parse_xiaohongshu',
      'parse_wechat',
      'create_article',
      'summarize_text'
    ],
    customSystemPrompt: `你是一个稍后阅读Worker Agent。

## 核心功能
1. 接收用户发送的链接
2. 提取网页完整内容
3. 生成结构化阅读笔记
4. 分类归档

## 支持平台
- 知乎文章
- 小红书笔记
- 微信公众号
- 普通网页

## 输出格式
笔记保存到: docs/sections/readflow/YYYY-MM/文章标题.md

笔记结构：
---
title: 文章标题
date: YYYY-MM-DD
source: 原始链接
platform: 知乎/小红书/公众号/其他
tags: [标签1, 标签2]
category: 技术/产品/生活/其他
---

# 文章标题

## 原文信息
- 作者：xxx
- 来源：xxx
- 链接：xxx

## 内容摘要
...

## 关键信息
- ...

## 个人笔记
（留给用户填写）

## 执行流程
1. 接收链接
2. 识别平台，调用对应解析工具
3. 提取内容
4. 生成摘要
5. 分类（根据内容自动判断）
6. 保存文件
7. 返回文件路径和简短摘要`
  }
}

// ==================== 初始化函数 ====================

/**
 * 初始化默认Agent系统
 * 创建系统Agent和Manager Agent
 */
export function initializeDefaultAgents(): void {
  // 检查是否已初始化
  const existingAgents = agentOrchestrator.getAllAgents()
  if (existingAgents.length > 0) {
    console.log('[Orchestrator] Agent系统已存在，跳过初始化')
    return
  }

  console.log('[Orchestrator] 开始初始化默认Agent系统...')

  // 1. 创建系统监控Agent
  const systemMonitor = agentOrchestrator.createSystemAgent(systemMonitorAgentPreset)
  console.log('[Orchestrator] 系统监控Agent已创建:', systemMonitor.id)

  // 2. 创建系统日志Agent
  const systemLogger = agentOrchestrator.createSystemAgent(systemLoggerAgentPreset)
  console.log('[Orchestrator] 系统日志Agent已创建:', systemLogger.id)

  // 3. 创建主管理Agent（这会启动其决策引擎）
  const mainManager = agentOrchestrator.createManagerAgent(mainManagerAgentPreset, 'user')
  console.log('[Orchestrator] 主管理Agent已创建:', mainManager.id)
  console.log('[Orchestrator] Manager决策引擎将在Agent创建后自动启动')

  console.log('[Orchestrator] 默认Agent系统初始化完成')
  console.log('[Orchestrator] 系统组成:', {
    system: 2,
    manager: 1,
    worker: 0
  })
}

/**
 * 创建被动Worker
 */
export function createPassiveWorker(managerId?: string): EnhancedAgent {
  return agentOrchestrator.createWorkerAgent({
    ...passiveWorkerPreset,
    managerId
  }, managerId || 'user')
}

/**
 * 创建定时内容收集Worker
 */
export function createScheduledCollector(managerId?: string): EnhancedAgent {
  return agentOrchestrator.createWorkerAgent({
    ...scheduledContentCollectorPreset,
    managerId
  }, managerId || 'user')
}

/**
 * 创建研究Worker
 */
export function createResearchWorker(managerId?: string): EnhancedAgent {
  return agentOrchestrator.createWorkerAgent({
    ...researchWorkerPreset,
    managerId
  }, managerId || 'user')
}

/**
 * 创建稍后阅读Worker
 */
export function createReadLaterWorker(managerId?: string): EnhancedAgent {
  return agentOrchestrator.createWorkerAgent({
    ...readLaterWorkerPreset,
    managerId
  }, managerId || 'user')
}

// 导入类型
import type { EnhancedAgent } from './types'
