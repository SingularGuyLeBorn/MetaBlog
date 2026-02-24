/**
 * useAgents - Agent 管理中心（后端持久化版）
 * 
 * Agent 等级体系：
 * - meta: 元 Agent，最高权限，可管理其他 Agent
 * - core: 核心 Agent，系统级功能
 * - fixed: 固定唤起 Agent，常驻助手
 * - custom: 自定义 Agent，用户创建的
 * - temp: 临时 Agent，一次性任务
 */

import { ref, computed } from 'vue'

export type AgentLevel = 'meta' | 'core' | 'fixed' | 'custom' | 'temp'
export type AgentStatus = 'online' | 'offline' | 'busy' | 'idle'

export interface AgentPermission {
  id: string
  name: string
  description: string
  granted: boolean
}

export interface Agent {
  id: string
  name: string
  avatar: string
  description: string
  level: AgentLevel
  status: AgentStatus
  seat: number
  skills: string[]
  permissions: AgentPermission[]
  systemPrompt: string
  memoryEnabled: boolean
  memoryContent: string
  createdAt: number
  updatedAt: number
  lastActiveAt: number
  callCount: number
  isDefault: boolean
}

export interface AgentCreateParams {
  name: string
  avatar?: string
  description: string
  level: AgentLevel
  skills?: string[]
  systemPrompt?: string
}

// 权限模板
export const PERMISSION_TEMPLATES: Omit<AgentPermission, 'granted'>[] = [
  { id: 'chat', name: '对话权限', description: '可以进行对话交流' },
  { id: 'file_read', name: '文件读取', description: '可以读取项目文件' },
  { id: 'file_write', name: '文件写入', description: '可以修改项目文件' },
  { id: 'skill_use', name: '技能调用', description: '可以使用已配置的技能' },
  { id: 'skill_create', name: '技能创建', description: '可以创建新技能' },
  { id: 'agent_manage', name: 'Agent 管理', description: '可以管理其他 Agent' },
  { id: 'memory_access', name: '记忆访问', description: '可以访问长期记忆' },
  { id: 'web_search', name: '网络搜索', description: '可以进行网络搜索' },
  { id: 'code_execute', name: '代码执行', description: '可以执行代码' },
  { id: 'system_config', name: '系统配置', description: '可以修改系统配置' }
]

// 等级配置
export const LEVEL_CONFIG: Record<AgentLevel, { label: string; color: string; icon: string; maxSeat: number }> = {
  meta: { label: '元 Agent', color: '#8b5cf6', icon: '👑', maxSeat: 1 },
  core: { label: '核心 Agent', color: '#3b82f6', icon: '🔧', maxSeat: 3 },
  fixed: { label: '固定 Agent', color: '#10b981', icon: '📌', maxSeat: 5 },
  custom: { label: '自定义 Agent', color: '#f59e0b', icon: '✨', maxSeat: 20 },
  temp: { label: '临时 Agent', color: '#6b7280', icon: '⏱️', maxSeat: 10 }
}

// 默认 Agent - Meta 助手（L3 稍后阅读 + 知识库管理）
const DEFAULT_AGENT: Agent = {
  id: 'default-assistant',
  name: 'Meta 助手',
  avatar: '🤖',
  description: '你的个人知识管家。帮你保存网页内容、整理知识库、生成阅读笔记。支持知乎、小红书、公众号等平台链接解析。',
  level: 'meta',
  status: 'online',
  seat: 1,
  skills: ['readlater', 'knowledge_manage', 'content_extract', 'note_create'],
  permissions: PERMISSION_TEMPLATES.map(p => ({ ...p, granted: true })),
  systemPrompt: `你是 Meta 助手，用户的个人知识管家。你的核心使命是帮用户收集、整理和管理知识。

## 🎯 核心能力

### 1. 稍后阅读（链接/图片收藏）
当用户发送链接时，自动识别平台并提取内容：
- 知乎：调用 parse_zhihu(url) 获取文章/回答
- 小红书：调用 parse_xiaohongshu(url) 获取笔记
- 微信公众号：调用 parse_wechat(url) 获取文章
- 其他链接：使用 fetch_url(url) 获取内容

提取内容后，自动生成阅读笔记并保存：
1. 调用 create_article 保存到 sections/readflow/YYYY-MM/ 目录
2. 生成结构化 frontmatter：title, date, source, platform, tags, category
3. 返回保存路径和简短摘要

当用户发送图片时：
1. 调用 ocr_image(imageData) 识别图片文字
2. 如果识别到链接，走链接解析流程
3. 如果没有链接，根据内容生成文字笔记

### 2. 知识库整理
当用户要求"整理知识库"或"检查文章"时：
1. 调用 list_articles 获取所有文章列表
2. 逐一检查 frontmatter 完整性、格式规范性
3. 发现问题：记录并询问用户是否修复
4. 生成整理报告保存到 sections/knowledge/maintenance-report-YYYY-MM-DD.md

### 3. 智能归档规则
- 技术类文章 → sections/readflow/YYYY-MM/tech/
- 产品/设计类 → sections/readflow/YYYY-MM/product/
- 个人成长类 → sections/readflow/YYYY-MM/growth/
- 其他 → sections/readflow/YYYY-MM/misc/

## 📝 输出格式规范

保存阅读笔记时使用以下结构：

\`\`\`yaml
---
title: 文章标题
date: YYYY-MM-DD
source: 原始链接
platform: 知乎/小红书/公众号/其他
tags: [标签1, 标签2]
category: 技术/产品/生活/其他
---
\`\`\`

# 文章标题

## 📋 原文信息
- 作者：xxx
- 来源：xxx
- 链接：xxx

## 📝 内容摘要
（3-5句话概括核心内容）

## 💡 关键要点
- 要点1
- 要点2
- ...

## 🤔 个人思考
（留给用户填写）

## ✅ 行动项
- [ ] 是否需要深入阅读？
- [ ] 是否有实践价值？
- [ ] 是否需要分享给他人？

## 🏷️ 相关标签
#标签1 #标签2

## 💾 归档路径
sections/readflow/YYYY-MM/category/文件名.md

## ⚠️ 注意事项
1. 保持原文完整性，重要信息不要删减
2. 生成有意义的文件名（文章标题拼音或英文）
3. 内容很长时标记"完整内容见原文"
4. 解析失败时告知用户并提供备用方案
5. 主动询问用户分类偏好（技术/产品/生活）

## 💬 交互示例

用户："https://zhuanlan.zhihu.com/p/12345 保存一下"
→ 调用 parse_zhihu → create_article → 返回"已保存到 sections/readflow/2025-02/tech/文章标题.md"

用户："[图片]"
→ 调用 ocr_image → 如果识别到链接 → parse_zhihu → create_article

用户："整理一下我的知识库"
→ 调用 list_articles → 逐一检查 → 生成报告 → 询问是否修复`,
  memoryEnabled: true,
  memoryContent: '',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastActiveAt: Date.now(),
  callCount: 0,
  isDefault: true
}

// 存储键（仅用于活跃 Agent ID）
const ACTIVE_AGENT_KEY = 'ai-active-agent-id'

// 状态
const agents = ref<Agent[]>([])
const activeAgentId = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)

// API 函数
async function fetchAgents(): Promise<Agent[]> {
  const response = await fetch('/api/agents')
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function createAgentAPI(params: AgentCreateParams): Promise<Agent> {
  const response = await fetch('/api/agents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function updateAgentAPI(id: string, updates: Partial<Agent>): Promise<Agent> {
  const response = await fetch('/api/agents/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, ...updates })
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
  return result.data
}

async function deleteAgentAPI(id: string): Promise<void> {
  const response = await fetch('/api/agents/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id })
  })
  const result = await response.json()
  if (!result.success) throw new Error(result.error)
}

export function useAgents() {
  // 计算属性
  const activeAgent = computed(() => 
    agents.value.find(a => a.id === activeAgentId.value) || agents.value[0] || null
  )
  
  const agentsByLevel = computed(() => {
    const result: Record<AgentLevel, Agent[]> = {
      meta: [],
      core: [],
      fixed: [],
      custom: [],
      temp: []
    }
    agents.value.forEach(agent => {
      result[agent.level].push(agent)
    })
    return result
  })
  
  const sortedAgents = computed(() => {
    return [...agents.value].sort((a, b) => {
      if (a.isDefault) return -1
      if (b.isDefault) return 1
      return a.seat - b.seat
    })
  })

  // 初始化 - 从后端加载
  async function init() {
    isLoading.value = true
    error.value = null
    
    try {
      const data = await fetchAgents()
      
      // 过滤掉无效数据（缺少必要字段的）
      const validData = data.filter((a: any) => a.name && a.id)
      
      // 确保每个 Agent 都有完整的属性
      const completeData = validData.map((a: Partial<Agent>) => ({
        ...DEFAULT_AGENT,
        ...a,
        id: a.id || `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name: a.name || '未命名 Agent',
        avatar: a.avatar || '🤖',
        description: a.description || '',
        level: (a.level || 'custom') as AgentLevel,
        status: (a.status || 'idle') as AgentStatus,
        seat: a.seat ?? 999,
        skills: a.skills || [],
        permissions: a.permissions || PERMISSION_TEMPLATES.map(p => ({ ...p, granted: p.id === 'chat' })),
        systemPrompt: a.systemPrompt || '',
        memoryEnabled: a.memoryEnabled ?? false,
        memoryContent: a.memoryContent || '',
        callCount: a.callCount ?? 0,
        isDefault: a.isDefault ?? false,
        createdAt: a.createdAt ?? Date.now(),
        updatedAt: a.updatedAt ?? Date.now(),
        lastActiveAt: a.lastActiveAt ?? Date.now()
      }))
      
      // 确保只有一个默认 Agent 且存在
      const defaultAgentIndex = completeData.findIndex((a: Agent) => a.id === DEFAULT_AGENT.id)
      if (defaultAgentIndex === -1) {
        // 不存在则添加
        completeData.unshift({ ...DEFAULT_AGENT })
      } else {
        // 存在则确保数据完整
        completeData[defaultAgentIndex] = { ...DEFAULT_AGENT, ...completeData[defaultAgentIndex] }
      }
      
      agents.value = completeData
      
      // 加载活跃 Agent ID（从 localStorage，这只是 UI 状态）
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(ACTIVE_AGENT_KEY)
        if (stored && agents.value.find(a => a.id === stored)) {
          activeAgentId.value = stored
        } else {
          activeAgentId.value = agents.value[0]?.id || null
        }
      }
    } catch (e) {
      error.value = String(e)
      console.error('[useAgents] Failed to load:', e)
    } finally {
      isLoading.value = false
    }
  }

  // 创建 Agent
  async function create(params: AgentCreateParams): Promise<Agent> {
    const now = Date.now()
    const newAgentData = {
      name: params.name,
      avatar: params.avatar || '🤖',
      description: params.description,
      level: params.level,
      status: 'idle' as AgentStatus,
      seat: 999,
      skills: params.skills || [],
      permissions: PERMISSION_TEMPLATES.map(p => ({
        ...p,
        granted: p.id === 'chat'
      })),
      systemPrompt: params.systemPrompt || '',
      memoryEnabled: false,
      memoryContent: '',
      lastActiveAt: now,
      callCount: 0,
      isDefault: false
    }
    
    const newAgent = await createAgentAPI(newAgentData)
    agents.value.push(newAgent)
    
    // 如果是第一个 Agent，设为活跃
    if (agents.value.length === 1) {
      setActive(newAgent.id)
    }
    
    return newAgent
  }

  // 更新 Agent
  async function update(id: string, data: Partial<Agent>): Promise<void> {
    const updated = await updateAgentAPI(id, data)
    const index = agents.value.findIndex(a => a.id === id)
    if (index !== -1) {
      agents.value[index] = updated
    }
  }

  // 删除 Agent
  async function remove(id: string): Promise<void> {
    await deleteAgentAPI(id)
    agents.value = agents.value.filter(a => a.id !== id)
    
    // 如果删除的是活跃 Agent，重置
    if (activeAgentId.value === id) {
      activeAgentId.value = agents.value[0]?.id || null
      if (typeof localStorage !== 'undefined' && activeAgentId.value) {
        localStorage.setItem(ACTIVE_AGENT_KEY, activeAgentId.value)
      }
    }
  }

  // 设置活跃 Agent
  function setActive(id: string) {
    activeAgentId.value = id
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ACTIVE_AGENT_KEY, id)
    }
  }

  // 获取统计
  function getStats() {
    return {
      total: agents.value.length,
      online: agents.value.filter(a => a.status === 'online').length,
      byLevel: {
        meta: agents.value.filter(a => a.level === 'meta').length,
        core: agents.value.filter(a => a.level === 'core').length,
        fixed: agents.value.filter(a => a.level === 'fixed').length,
        custom: agents.value.filter(a => a.level === 'custom').length,
        temp: agents.value.filter(a => a.level === 'temp').length
      }
    }
  }

  return {
    // 状态
    agents,
    activeAgentId,
    activeAgent,
    isLoading,
    error,
    
    // 计算属性
    agentsByLevel,
    sortedAgents,
    
    // 方法
    init,
    create,
    update,
    remove,
    setActive,
    getStats
  }
}
