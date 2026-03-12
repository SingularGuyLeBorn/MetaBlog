<!--
  AgentDetailPanel - Agent 详情三栏布局
  
  布局：
  - 左栏 (240px): 导航菜单
  - 中栏 (flex): 内容区
  - 右栏 (320px): 预览/状态
-->
<template>
  <div class="agent-detail-panel">
    <!-- 头部 -->
    <div class="detail-header">
      <button class="btn-back" @click="$emit('back')">
        <span>←</span>
        <span>返回列表</span>
      </button>
      
      <div class="header-actions">
        <button 
          v-if="agent.status === 'running'"
          class="btn-action pause"
          @click="$emit('pause', agent)"
        >
          <span>⏸️</span>
          <span>暂停</span>
        </button>
        <button 
          v-else
          class="btn-action start"
          @click="$emit('start', agent)"
          :disabled="agent.status === 'busy'"
        >
          <span>▶️</span>
          <span>启动</span>
        </button>
        
        <button class="btn-action save" @click="handleSave">
          <span>💾</span>
          <span>保存</span>
        </button>
      </div>
    </div>
    
    <!-- 三栏主体 -->
    <div class="detail-body">
      <!-- 左栏：导航 -->
      <aside class="left-sidebar">
        <div class="nav-section">
          <div class="nav-title">配置</div>
          <nav class="nav-menu">
            <button
              v-for="item in navItems"
              :key="item.id"
              class="nav-item"
              :class="{ active: currentSection === item.id }"
              @click="currentSection = item.id"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-name">{{ item.name }}</span>
              <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
            </button>
          </nav>
        </div>
        
        <div class="nav-section">
          <div class="nav-title">高级</div>
          <nav class="nav-menu">
            <button
              v-for="item in advancedNavItems"
              :key="item.id"
              class="nav-item"
              :class="{ active: currentSection === item.id }"
              @click="currentSection = item.id"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              <span class="nav-name">{{ item.name }}</span>
            </button>
          </nav>
        </div>
      </aside>
      
      <!-- 中栏：内容 -->
      <main class="main-content">
        <!-- 基本信息 -->
        <template v-if="currentSection === 'basic'">
          <section class="content-section">
            <h3>基本信息</h3>
            
            <div class="form-group">
              <label>名称</label>
              <input 
                v-model="formData.name" 
                type="text" 
                placeholder="Agent 名称"
                class="form-input"
              />
            </div>
            
            <div class="form-group">
              <label>描述</label>
              <textarea 
                v-model="formData.description" 
                rows="3"
                placeholder="描述这个 Agent 的用途..."
                class="form-textarea"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>头像</label>
              <div class="avatar-selector">
                <div class="current-avatar">
                  <img :src="currentAvatarUrl" :alt="formData.name" />
                  <span>#{{ formData.avatarId || 1 }}</span>
                </div>
                <button class="btn-random" @click="randomizeAvatar">
                  🎲 随机更换
                </button>
              </div>
            </div>
          </section>
          
          <section class="content-section">
            <h3>系统提示词</h3>
            <div class="form-group">
              <textarea 
                v-model="formData.systemPrompt" 
                rows="10"
                placeholder="定义 AI 的角色、行为和回答风格..."
                class="form-textarea code"
              ></textarea>
            </div>
          </section>
        </template>
        
        <!-- 触发条件 -->
        <template v-if="currentSection === 'triggers'">
          <section class="content-section">
            <div class="section-header">
              <h3>触发条件</h3>
              <button class="btn-add" @click="addTrigger">
                <span>+</span>
                <span>添加触发器</span>
              </button>
            </div>
            
            <div class="triggers-list">
              <div 
                v-for="(trigger, index) in (formData.triggers || [])" 
                :key="trigger.id"
                class="trigger-item"
              >
                <div class="trigger-header">
                  <select v-model="trigger.type" class="form-select">
                    <option value="manual">👆 手动触发</option>
                    <option value="scheduled">⏰ 定时触发</option>
                    <option value="event">⚡ 事件触发</option>
                    <option value="webhook">🔌 Webhook</option>
                    <option value="mention">@️ 提及触发</option>
                  </select>
                  
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="trigger.enabled" />
                    <span class="toggle-slider"></span>
                  </label>
                  
                  <button class="btn-remove" @click="removeTrigger(index)">🗑️</button>
                </div>
                
                <div class="trigger-config">
                  <input 
                    v-model="trigger.name" 
                    type="text" 
                    placeholder="触发器名称"
                    class="form-input"
                  />
                  
                  <!-- 定时触发配置 -->
                  <template v-if="trigger.type === 'scheduled'">
                    <input 
                      v-model="trigger.config.cron" 
                      type="text" 
                      placeholder="Cron 表达式 (如: 0 9 * * *)"
                      class="form-input"
                    />
                  </template>
                  
                  <!-- Webhook 配置 -->
                  <template v-if="trigger.type === 'webhook'">
                    <input 
                      v-model="trigger.config.webhookUrl" 
                      type="text" 
                      placeholder="Webhook URL"
                      class="form-input"
                    />
                    <input 
                      v-model="trigger.config.webhookSecret" 
                      type="password" 
                      placeholder="Secret Key"
                      class="form-input"
                    />
                  </template>
                  
                  <!-- 提及触发配置 -->
                  <template v-if="trigger.type === 'mention'">
                    <input 
                      v-model="mentionKeywords" 
                      type="text" 
                      placeholder="关键词，用逗号分隔"
                      class="form-input"
                      @change="updateMentionKeywords(trigger, $event)"
                    />
                  </template>
                </div>
              </div>
            </div>
          </section>
        </template>
        
        <!-- 记忆管理 -->
        <template v-if="currentSection === 'memory' && formData.memory">
          <section class="content-section">
            <h3>短期记忆</h3>
            <div class="form-row">
              <div class="form-group">
                <label>最大消息数</label>
                <input 
                  v-model.number="formData.memory.shortTerm.maxMessages" 
                  type="number"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>TTL (秒)</label>
                <input 
                  v-model.number="formData.memory.shortTerm.ttl" 
                  type="number"
                  class="form-input"
                />
              </div>
            </div>
          </section>
          
          <section class="content-section">
            <div class="section-header">
              <h3>长期记忆</h3>
              <label class="toggle-switch">
                <input type="checkbox" v-model="formData.memory.longTerm.enabled" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div v-if="formData.memory.longTerm.enabled" class="memory-entries">
              <div 
                v-for="(entry, index) in (formData.memory?.longTerm?.entries || [])" 
                :key="index"
                class="memory-entry"
              >
                <input v-model="entry.key" placeholder="Key" class="form-input" />
                <input v-model="entry.value" placeholder="Value" class="form-input" />
                <input 
                  v-model.number="entry.importance" 
                  type="number" 
                  min="0" 
                  max="1" 
                  step="0.1"
                  placeholder="重要性"
                  class="form-input small"
                />
                <button class="btn-remove" @click="removeMemoryEntry(index)">🗑️</button>
              </div>
              <button class="btn-add-item" @click="addMemoryEntry">
                <span>+</span>
                <span>添加记忆</span>
              </button>
            </div>
          </section>
        </template>
        
        <!-- 技能配置 -->
        <template v-if="currentSection === 'skills'">
          <section class="content-section">
            <h3>技能配置</h3>
            <p class="section-desc">为此 Agent 配置可用的技能</p>
            
            <div class="skills-grid">
              <label 
                v-for="skill in availableSkills" 
                :key="skill.id"
                class="skill-checkbox"
                :class="{ checked: (formData.skills || []).includes(skill.id) }"
              >
                <input 
                  type="checkbox" 
                  :value="skill.id"
                  v-model="formData.skills"
                />
                <span class="skill-icon">{{ skill.icon }}</span>
                <div class="skill-info">
                  <span class="skill-name">{{ skill.name }}</span>
                  <span class="skill-desc">{{ skill.description }}</span>
                </div>
              </label>
            </div>
          </section>
        </template>
        
        <!-- 工具调用 -->
        <template v-if="currentSection === 'functions' && formData.functionCall">
          <section class="content-section">
            <div class="section-header">
              <h3>工具调用 (Function Call)</h3>
              <label class="toggle-switch">
                <input type="checkbox" v-model="formData.functionCall.enabled" />
                <span class="toggle-slider"></span>
              </label>
            </div>
            
            <div v-if="formData.functionCall.enabled" class="function-config">
              <div class="form-row">
                <div class="form-group">
                  <label>超时时间 (秒)</label>
                  <input 
                    v-model.number="formData.functionCall.timeout" 
                    type="number"
                    class="form-input"
                  />
                </div>
                <div class="form-group">
                  <label>每请求最大调用次数</label>
                  <input 
                    v-model.number="formData.functionCall.maxCallsPerRequest" 
                    type="number"
                    class="form-input"
                  />
                </div>
              </div>
              
              <h4>允许的工具</h4>
              <div class="tools-checklist">
                <label class="checkbox-item">
                  <input type="checkbox" value="file_read" v-model="formData.functionCall.allowedTools" />
                  <span>📄 文件读取</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" value="file_write" v-model="formData.functionCall.allowedTools" />
                  <span>📝 文件写入</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" value="web_search" v-model="formData.functionCall.allowedTools" />
                  <span>🔍 网络搜索</span>
                </label>
                <label class="checkbox-item">
                  <input type="checkbox" value="code_execute" v-model="formData.functionCall.allowedTools" />
                  <span>💻 代码执行</span>
                </label>
              </div>
            </div>
          </section>
        </template>
        
        <!-- 权限设置 -->
        <template v-if="currentSection === 'permissions'">
          <section class="content-section">
            <h3>权限设置</h3>
            <p class="section-desc">配置此 Agent 的权限（权限以权限列表形式存储）</p>
            
            <div class="permission-list">
              <label 
                v-for="perm in (formData.permissions || [])" 
                :key="perm.id"
                class="permission-item"
              >
                <input type="checkbox" v-model="perm.granted" />
                <div class="permission-info">
                  <span class="permission-name">{{ perm.name }}</span>
                  <span class="permission-desc">{{ perm.description }}</span>
                </div>
              </label>
            </div>
          </section>
        </template>
        
        <!-- 运行配置 -->
        <template v-if="currentSection === 'runtime' && formData.runtime">
          <section class="content-section">
            <h3>运行配置</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label>模型</label>
                <select v-model="formData.runtime.model" class="form-select">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                  <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                  <option value="claude-3-opus">Claude 3 Opus</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>温度 ({{ formData.runtime?.temperature || 0.7 }})</label>
                <input 
                  :value="formData.runtime?.temperature || 0.7"
                  @input="updateRuntimeTemperature"
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  class="form-slider"
                />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>最大 Token</label>
                <input 
                  :value="formData.runtime?.maxTokens || 2048"
                  @input="updateRuntimeMaxTokens"
                  type="number"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label>超时时间 (秒)</label>
                <input 
                  :value="formData.runtime?.timeout || 60"
                  @input="updateRuntimeTimeout"
                  type="number"
                  class="form-input"
                />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>重试次数</label>
                <input 
                  :value="formData.runtime?.retryCount || 3"
                  @input="updateRuntimeRetryCount"
                  type="number"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label>重试延迟 (秒)</label>
                <input 
                  :value="formData.runtime?.retryDelay || 1"
                  @input="updateRuntimeRetryDelay"
                  type="number"
                  class="form-input"
                />
              </div>
            </div>
          </section>
        </template>
        
        <!-- 生命周期 -->
        <template v-if="currentSection === 'lifecycle' && formData.lifecycle">
          <section class="content-section">
            <h3>生命周期</h3>
            
            <label class="permission-item">
              <input type="checkbox" v-model="formData.lifecycle.autoStart" />
              <div class="permission-info">
                <span class="permission-name">🚀 自动启动</span>
                <span class="permission-desc">系统启动时自动运行此 Agent</span>
              </div>
            </label>
            
            <div class="form-row">
              <div class="form-group">
                <label>最大运行时间 (秒, 0=无限制)</label>
                <input 
                  :value="formData.lifecycle?.maxRunTime || 0"
                  @input="updateLifecycleMaxRunTime"
                  type="number"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
                <label>空闲超时 (秒)</label>
                <input 
                  :value="formData.lifecycle?.idleTimeout || 300"
                  @input="updateLifecycleIdleTimeout"
                  type="number"
                  class="form-input"
                />
              </div>
            </div>
            
            <div class="form-group">
              <label>清理策略</label>
              <select :value="formData.lifecycle?.cleanupPolicy ?? 'keep'" @change="updateLifecycleCleanupPolicy" class="form-select">
                <option value="keep">保留</option>
                <option value="archive">归档</option>
                <option value="delete">删除</option>
              </select>
            </div>
            
            <div v-if="(formData.lifecycle?.cleanupPolicy ?? 'keep') !== 'keep'" class="form-group">
              <label>归档/删除前 (天)</label>
              <input 
                :value="formData.lifecycle?.archiveAfter ?? 30"
                @input="updateLifecycleArchiveAfter"
                type="number"
                class="form-input"
              />
            </div>
          </section>
        </template>
      </main>
      
      <!-- 右栏：预览/状态 -->
      <aside class="right-sidebar">
        <!-- Agent 预览卡片 -->
        <div class="preview-card">
          <div class="preview-avatar">
            <img :src="currentAvatarUrl" :alt="formData.name" />
            <div class="preview-status" :class="agent.status"></div>
          </div>
          <h4 class="preview-name">{{ formData.name || '未命名' }}</h4>
          <p class="preview-desc">{{ formData.description || '暂无描述' }}</p>
          
          <div class="preview-stats">
            <div class="preview-stat">
              <span class="stat-label">状态</span>
              <span class="stat-value" :class="agent.status">{{ statusText }}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">运行次数</span>
              <span class="stat-value">{{ agent.totalRuns || 0 }}</span>
            </div>
            <div class="preview-stat">
              <span class="stat-label">创建时间</span>
              <span class="stat-value">{{ formatDate(agent.createdAt) }}</span>
            </div>
          </div>
        </div>
        
        <!-- 快速测试 -->
        <div class="test-card">
          <h4>🧪 快速测试</h4>
          <textarea 
            v-model="testMessage" 
            rows="3"
            placeholder="输入测试消息..."
            class="form-textarea"
          ></textarea>
          <button 
            class="btn-test" 
            @click="handleTest"
            :disabled="!testMessage.trim() || agent.status !== 'running'"
          >
            发送测试
          </button>
        </div>
        
        <!-- 最近日志 -->
        <div class="logs-card">
          <h4>📋 最近活动</h4>
          <div class="logs-list">
            <div v-if="recentLogs.length === 0" class="logs-empty">
              暂无活动记录
            </div>
            <div 
              v-for="log in recentLogs" 
              :key="log.id"
              class="log-item"
              :class="log.level"
            >
              <span class="log-time">{{ formatTime(log.time) }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import type { Agent, Trigger, RuntimeConfig, LifecycleConfig } from '../../../core/composables'
import { generateAvatarUrl } from '../../../core/composables'

const props = defineProps<{
  agent: Agent
}>()

const emit = defineEmits<{
  back: []
  save: [data: Partial<Agent>]
  start: [agent: Agent]
  pause: [agent: Agent]
  test: [message: string]
}>()

// 当前导航项
const currentSection = ref('basic')

// 导航菜单
const navItems = [
  { id: 'basic', name: '基本信息', icon: '📝' },
  { id: 'triggers', name: '触发条件', icon: '⚡', badge: 0 },
  { id: 'memory', name: '记忆管理', icon: '🧠' },
  { id: 'skills', name: '技能配置', icon: '🎯' },
  { id: 'functions', name: '工具调用', icon: '🔧' },
]

const advancedNavItems = [
  { id: 'permissions', name: '权限设置', icon: '🔒' },
  { id: 'runtime', name: '运行配置', icon: '⚙️' },
  { id: 'lifecycle', name: '生命周期', icon: '♻️' },
]

// 表单数据 (深拷贝，带默认值)
const createDefaultFormData = (): Agent => ({
  id: '',
  name: '',
  avatar: '🤖',
  avatarId: 1,
  description: '',
  level: 'custom',
  status: 'idle',
  seat: 1,
  skills: [],
  permissions: [],
  systemPrompt: '',
  memoryEnabled: false,
  memoryContent: '',
  memory: {
    shortTerm: { maxMessages: 20, ttl: 3600, messages: [] },
    longTerm: { enabled: false, storagePath: '', entries: [] },
    contextWindow: 4096
  },
  functionCall: {
    enabled: false,
    allowedTools: [],
    customTools: [],
    timeout: 30,
    maxCallsPerRequest: 5
  },
  runtime: {
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2048,
    timeout: 60,
    retryCount: 3,
    retryDelay: 1
  },
  lifecycle: {
    autoStart: false,
    maxRunTime: 0,
    idleTimeout: 300,
    cleanupPolicy: 'keep',
    archiveAfter: 30
  },
  triggers: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
  lastActiveAt: Date.now(),
  callCount: 0,
  totalRuns: 0,
  errorCount: 0,
  isDefault: false
})

// 合并默认值与实际数据
const formData = reactive<Agent>({
  ...createDefaultFormData(),
  ...JSON.parse(JSON.stringify(props.agent))
})

// 同步 props 变化
watch(() => props.agent, (newAgent) => {
  Object.assign(formData, createDefaultFormData(), JSON.parse(JSON.stringify(newAgent)))
}, { deep: true })

// 当前头像 URL
const currentAvatarUrl = computed(() => 
  generateAvatarUrl(formData.avatarId || 1, formData.id)
)

// 状态文本
const statusText = computed(() => {
  const texts: Record<string, string> = {
    running: '运行中',
    paused: '已暂停',
    error: '错误',
    idle: '空闲',
    busy: '忙碌',
    online: '在线',
    offline: '离线'
  }
  return texts[props.agent.status] || props.agent.status
})

// 提及关键词
const mentionKeywords = ref('')

// 测试消息
const testMessage = ref('')

// 模拟日志
const recentLogs = ref<Array<{id: string, time: Date, message: string, level: string}>>([
  { id: '1', time: new Date(Date.now() - 60000), message: 'Agent 启动成功', level: 'info' },
  { id: '2', time: new Date(Date.now() - 300000), message: '配置已更新', level: 'info' },
])

// 可用技能 (模拟)
const availableSkills = [
  { id: 'writing', name: '写作助手', icon: '✍️', description: '帮助撰写和编辑文章' },
  { id: 'coding', name: '代码助手', icon: '💻', description: '协助编程和代码审查' },
  { id: 'analysis', name: '数据分析', icon: '📊', description: '分析和可视化数据' },
  { id: 'translation', name: '翻译', icon: '🌐', description: '多语言翻译服务' },
]

// 随机更换头像
function randomizeAvatar() {
  formData.avatarId = Math.floor(Math.random() * 100) + 1
}

// 添加触发器
function addTrigger() {
  const newTrigger: Trigger = {
    id: `trigger-${Date.now()}`,
    type: 'manual',
    name: '新触发器',
    enabled: true,
    config: {},
    triggerCount: 0
  }
  if (!formData.triggers) {
    formData.triggers = []
  }
  formData.triggers.push(newTrigger)
}

// 删除触发器
function removeTrigger(index: number) {
  formData.triggers?.splice(index, 1)
}

// 更新提及关键词
function updateMentionKeywords(trigger: Trigger, event: Event) {
  const value = (event.target as HTMLInputElement).value
  trigger.config.mentionKeywords = value.split(',').map(k => k.trim()).filter(Boolean)
}

// 添加记忆条目
function addMemoryEntry() {
  if (!formData.memory) {
    formData.memory = {
      shortTerm: { maxMessages: 10, ttl: 3600, messages: [] },
      longTerm: { enabled: true, storagePath: '', entries: [] },
      contextWindow: 10
    }
  }
  if (!formData.memory.longTerm) {
    formData.memory.longTerm = { enabled: true, storagePath: '', entries: [] }
  }
  if (!formData.memory.longTerm.entries) {
    formData.memory.longTerm.entries = []
  }
  formData.memory.longTerm.entries.push({
    key: '',
    value: '',
    importance: 0.5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}

// 删除记忆条目
function removeMemoryEntry(index: number) {
  formData.memory?.longTerm?.entries?.splice(index, 1)
}

// Runtime config update helpers
function updateRuntimeTemperature(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!formData.runtime) formData.runtime = {} as RuntimeConfig
  formData.runtime.temperature = val
}

function updateRuntimeMaxTokens(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.runtime) formData.runtime = {} as RuntimeConfig
  formData.runtime.maxTokens = val
}

function updateRuntimeTimeout(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.runtime) formData.runtime = {} as RuntimeConfig
  formData.runtime.timeout = val
}

function updateRuntimeRetryCount(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.runtime) formData.runtime = {} as RuntimeConfig
  formData.runtime.retryCount = val
}

function updateRuntimeRetryDelay(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.runtime) formData.runtime = {} as RuntimeConfig
  formData.runtime.retryDelay = val
}

// Lifecycle config update helpers
function updateLifecycleMaxRunTime(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.lifecycle) formData.lifecycle = {} as LifecycleConfig
  formData.lifecycle.maxRunTime = val
}

function updateLifecycleIdleTimeout(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.lifecycle) formData.lifecycle = {} as LifecycleConfig
  formData.lifecycle.idleTimeout = val
}

function updateLifecycleCleanupPolicy(e: Event) {
  const val = (e.target as HTMLSelectElement).value as 'keep' | 'archive' | 'delete'
  if (!formData.lifecycle) formData.lifecycle = {} as LifecycleConfig
  formData.lifecycle.cleanupPolicy = val
}

function updateLifecycleArchiveAfter(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.lifecycle) formData.lifecycle = {} as LifecycleConfig
  formData.lifecycle.archiveAfter = val
}

// Memory config update helpers
function updateMemoryMaxMessages(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.memory) {
    formData.memory = {
      shortTerm: { maxMessages: 10, ttl: 3600, messages: [] },
      longTerm: { enabled: true, storagePath: '', entries: [] },
      contextWindow: 10
    }
  }
  formData.memory.shortTerm.maxMessages = val
}

function updateMemoryTtl(e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value)
  if (!formData.memory) {
    formData.memory = {
      shortTerm: { maxMessages: 10, ttl: 3600, messages: [] },
      longTerm: { enabled: true, storagePath: '', entries: [] },
      contextWindow: 10
    }
  }
  formData.memory.shortTerm.ttl = val
}

function updateMemoryLongTermEnabled(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (!formData.memory) {
    formData.memory = {
      shortTerm: { maxMessages: 10, ttl: 3600, messages: [] },
      longTerm: { enabled: true, storagePath: '', entries: [] },
      contextWindow: 10
    }
  }
  if (!formData.memory.longTerm) {
    formData.memory.longTerm = { enabled: true, storagePath: '', entries: [] }
  }
  formData.memory.longTerm.enabled = checked
}

function updateMemoryEntry(index: number, field: 'key' | 'value', value: string) {
  if (formData.memory?.longTerm?.entries?.[index]) {
    formData.memory.longTerm.entries[index][field] = value
  }
}

function updateMemoryEntryImportance(index: number, value: string) {
  if (formData.memory?.longTerm?.entries?.[index]) {
    formData.memory.longTerm.entries[index].importance = parseFloat(value)
  }
}

// FunctionCall config update helpers
function updateFunctionCallEnabled(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (!formData.functionCall) {
    formData.functionCall = {
      enabled: false,
      allowedTools: [],
      customTools: [],
      timeout: 30,
      maxCallsPerRequest: 5
    }
  }
  formData.functionCall.enabled = checked
}

function toggleAllowedTool(tool: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (!formData.functionCall) {
    formData.functionCall = {
      enabled: false,
      allowedTools: [],
      customTools: [],
      timeout: 30,
      maxCallsPerRequest: 5
    }
  }
  if (!formData.functionCall.allowedTools) {
    formData.functionCall.allowedTools = []
  }
  if (checked) {
    if (!formData.functionCall.allowedTools.includes(tool)) {
      formData.functionCall.allowedTools.push(tool)
    }
  } else {
    formData.functionCall.allowedTools = formData.functionCall.allowedTools.filter(t => t !== tool)
  }
}

// Runtime model update helper
function updateRuntimeModel(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  if (!formData.runtime) {
    formData.runtime = {
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 2048,
      timeout: 60,
      retryCount: 3,
      retryDelay: 1
    }
  }
  formData.runtime.model = val
}

// Lifecycle autoStart update helper
function updateLifecycleAutoStart(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (!formData.lifecycle) {
    formData.lifecycle = {
      autoStart: false,
      maxRunTime: 0,
      idleTimeout: 300,
      cleanupPolicy: 'keep',
      archiveAfter: 30
    }
  }
  formData.lifecycle.autoStart = checked
}

// 保存
function handleSave() {
  emit('save', {
    name: formData.name,
    description: formData.description,
    avatarId: formData.avatarId,
    systemPrompt: formData.systemPrompt,
    triggers: formData.triggers,
    memory: formData.memory,
    skills: formData.skills,
    functionCall: formData.functionCall,
    permissions: formData.permissions,
    runtime: formData.runtime,
    lifecycle: formData.lifecycle,
  })
}

// 测试
function handleTest() {
  emit('test', testMessage.value)
  testMessage.value = ''
}

// 格式化日期
function formatDate(timestamp: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleDateString('zh-CN')
}

// 格式化时间
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.agent-detail-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vp-c-bg);
}

/* 头部 */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action.start {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}
.btn-action.start:hover {
  background: rgba(34, 197, 94, 0.2);
}

.btn-action.pause {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}
.btn-action.pause:hover {
  background: rgba(245, 158, 11, 0.2);
}

.btn-action.save {
  background: var(--vp-c-brand);
  color: white;
}
.btn-action.save:hover {
  background: var(--vp-c-brand-dark);
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 三栏主体 */
.detail-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左栏导航 */
.left-sidebar {
  width: 220px;
  padding: 20px;
  border-right: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 24px;
}

.nav-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  padding-left: 12px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav-item:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.nav-item.active {
  background: var(--vp-c-brand);
  color: white;
}

.nav-icon {
  font-size: 16px;
}

.nav-name {
  flex: 1;
}

.nav-badge {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
}

/* 中栏内容 */
.main-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.content-section {
  margin-bottom: 32px;
}

.content-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
}

.section-desc {
  margin: -8px 0 16px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* 表单元素 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-textarea.code {
  font-family: monospace;
  font-size: 13px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-slider {
  width: 100%;
}

/* 头像选择器 */
.avatar-selector {
  display: flex;
  align-items: center;
  gap: 16px;
}

.current-avatar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.current-avatar img {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--vp-c-bg-mute);
}

.current-avatar span {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.btn-random {
  padding: 8px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-random:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
}

/* 触发器列表 */
.triggers-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trigger-item {
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.trigger-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.trigger-header .form-select {
  flex: 1;
}

.btn-remove {
  padding: 6px 10px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  opacity: 0.6;
  transition: all 0.2s;
}

.btn-remove:hover {
  opacity: 1;
  background: rgba(212, 184, 184, 0.1);
}

.trigger-config {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  background: var(--vp-c-brand-dark);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--vp-c-divider);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: var(--vp-c-brand);
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 记忆条目 */
.memory-entries {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-entry {
  display: grid;
  grid-template-columns: 1fr 2fr 80px auto;
  gap: 8px;
  align-items: center;
}

.btn-add-item {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-item:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

/* 技能网格 */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.skill-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.skill-checkbox:hover {
  border-color: var(--vp-c-brand);
}

.skill-checkbox.checked {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.skill-checkbox input {
  display: none;
}

.skill-icon {
  font-size: 24px;
}

.skill-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.skill-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* 权限列表 */
.permission-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.permission-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.permission-item:hover {
  border-color: var(--vp-c-brand);
}

.permission-item input {
  margin-top: 2px;
}

.permission-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.permission-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.permission-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.permission-config {
  margin-top: 8px;
  padding-left: 28px;
}

/* 工具清单 */
.tools-checklist {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  cursor: pointer;
}

.checkbox-item:hover {
  background: var(--vp-c-bg);
}

/* 右栏 */
.right-sidebar {
  width: 300px;
  padding: 20px;
  border-left: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-card,
.test-card,
.logs-card {
  padding: 16px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

.preview-avatar {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  border-radius: 20px;
  background: var(--vp-c-bg-mute);
}

.preview-status {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 3px solid var(--vp-c-bg);
}

.preview-status.running { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
.preview-status.paused { background: #f59e0b; }
.preview-status.error { background: var(--sr-morandi-pink, #d4b8b8); }
.preview-status.idle { background: #6b7280; }

.preview-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  text-align: center;
  color: var(--vp-c-text-1);
}

.preview-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  text-align: center;
  color: var(--vp-c-text-2);
}

.preview-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.preview-stat {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.preview-stat .stat-label {
  color: var(--vp-c-text-2);
}

.preview-stat .stat-value {
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.preview-stat .stat-value.running { color: #22c55e; }
.preview-stat .stat-value.paused { color: #f59e0b; }
.preview-stat .stat-value.error { color: var(--sr-morandi-pink, #d4b8b8); }

.test-card h4,
.logs-card h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.btn-test {
  width: 100%;
  margin-top: 8px;
  padding: 10px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-test:hover {
  background: var(--vp-c-brand-dark);
}

.btn-test:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.logs-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.log-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
  font-size: 12px;
}

.log-time {
  color: var(--vp-c-text-3);
  font-size: 11px;
}

.log-message {
  color: var(--vp-c-text-1);
}

.log-item.error .log-message { color: var(--sr-morandi-pink, #d4b8b8); }
.log-item.warn .log-message { color: #f59e0b; }

/* 深色模式 */
.dark .left-sidebar,
.dark .right-sidebar {
  background: rgba(255, 255, 255, 0.02);
}

.dark .preview-card,
.dark .test-card,
.dark .logs-card,
.dark .trigger-item,
.dark .skill-checkbox,
.dark .permission-item,
.dark .checkbox-item {
  background: rgba(255, 255, 255, 0.03);
}

/* 响应式 */
@media (max-width: 1200px) {
  .right-sidebar {
    display: none;
  }
}

@media (max-width: 768px) {
  .left-sidebar {
    display: none;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .memory-entry {
    grid-template-columns: 1fr;
  }
}
</style>
