<!--
  ChatLayout - 聊天主布局(支持多 Agent 独立会话)
-->
<template>
  <div class="chat-layout">
    <!-- 左侧会话面板 -->
    <SessionPanel
      :sessions="filteredSessions"
      :current-id="currentSessionId"
      :collapsed="leftCollapsed"
      :agent-name="selectedAgent?.name"
      @create="createSessionForCurrentAgent"
      @switch="switchSession"
      @rename="handleRename"
      @delete="handleDelete"
      @manage="showSessionManager = true"
    />

    <!-- 中间聊天区域 -->
    <main class="chat-main">
      <!-- 顶部栏 -->
      <header class="main-header">
        <div class="header-left">
          <button class="menu-btn" @click="leftCollapsed = !leftCollapsed">
            <Icon name="menu" :size="20" />
          </button>
          <div class="header-info">
            <h1 class="session-title">{{ currentSession?.title || '新对话' }}</h1>
            
            <!-- Agent 选择下拉框 -->
            <div class="agent-selector" ref="agentSelectorRef">
              <button 
                class="agent-select-trigger"
                :class="{ 'open': showAgentDropdown }"
                @click="showAgentDropdown = !showAgentDropdown"
              >
                <span class="selected-avatar">{{ selectedAgent?.avatar || '🤖' }}</span>
                <span class="selected-name">{{ selectedAgent?.name || '选择 Agent' }}</span>
                <Icon name="chevron-down" :size="14" class="dropdown-icon" />
              </button>
              
              <!-- 下拉菜单 -->
              <Transition name="dropdown">
                <div v-if="showAgentDropdown" class="agent-dropdown">
                  <div class="dropdown-header">
                    <span>选择 Agent</span>
                    <button class="manage-btn" @click="openAgentAdmin">
                      <Icon name="settings" :size="12" />
                      管理
                    </button>
                  </div>
                  <div class="dropdown-divider"></div>
                  <div class="agent-list">
                    <button
                      v-for="agent in allAgents"
                      :key="agent.id"
                      class="agent-option"
                      :class="{ 'active': selectedAgent?.id === agent.id }"
                      @click="selectAgent(agent)"
                    >
                      <span class="option-avatar">{{ agent.avatar }}</span>
                      <div class="option-info">
                        <span class="option-name">{{ agent.name }}</span>
                        <span class="option-desc">{{ agent.description }}</span>
                      </div>
                      <span v-if="selectedAgent?.id === agent.id" class="check-icon">✓</span>
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
            
            <span v-if="currentSession" class="model-tag">
              {{ currentSession.config.model }}
            </span>
          </div>
        </div>
        <div class="header-right">
          <!-- Token 用量条 -->
          <TokenUsageBar
            v-if="currentSession"
            :usage="tokenUsage"
            :context-window="currentModelConfig.contextWindow"
          />
          
          <!-- 返回首页按钮 -->
          <button 
            class="icon-btn home-btn" 
            title="返回首页"
            @click="goHome"
          >
            <Icon name="home" :size="18" />
          </button>
          <!-- 日志监控按钮 -->
          <button 
            class="icon-btn log-dashboard-btn" 
            :class="{ active: showLogDashboard }"
            title="日志监控 (Ctrl+L)"
            @click="showLogDashboard = !showLogDashboard"
          >
            <Icon name="terminal" :size="18" />
          </button>
          <!-- Agent 管理中心按钮 -->
          <button 
            class="icon-btn agent-admin-btn" 
            :class="{ active: showAgentAdmin }"
            title="Agent 控制中心"
            @click="showAgentAdmin = true"
          >
            <Icon name="sparkles" :size="18" />
          </button>
          <button class="icon-btn" @click="clearMessages()">
            <Icon name="trash" :size="18" />
          </button>
          <button class="icon-btn" @click="rightCollapsed = !rightCollapsed">
            <Icon name="settings" :size="18" />
          </button>
        </div>
      </header>

      <!-- 消息列表 -->
      <MessageList
        ref="messageListRef"
        :messages="messages"
        :message-groups="messageGroups"
        :session-id="currentSessionId"
        :is-streaming="isStreaming"
        :agent-name="selectedAgent?.name"
        :agent-avatar="selectedAgent?.avatar"
        @use-prompt="handleQuickPrompt"
        @regenerate="handleRegenerate"
        @switch-version="switchVersion"
      />

      <!-- 输入框 -->
      <ChatInput
        ref="chatInputRef"
        v-model="inputText"
        :is-streaming="isStreaming"
        :selected-skill="selectedSkill"
        :skills="allSkills"
        :supports-vision="currentModelSupportsVision"
        :supports-video="currentModelSupportsVideo"
        :max-attachments="10"
        @send="handleSend"
        @stop="interruptGeneration"
        @select-skill="handleSelectSkill"
      />
    </main>

    <!-- 右侧设置面板 -->
    <SettingsPanel
      :config="currentConfig"
      :collapsed="rightCollapsed"
      :agent-system-prompt="currentAgentSystemPrompt"
      :is-system-prompt-customized="isSystemPromptCustomized"
      @update:config="handleUpdateConfig"
      @toggle-collapse="rightCollapsed = !rightCollapsed"
      @open-agent-center="showAgentAdmin = true"
      @reset-system-prompt="resetSystemPromptToAgent"
    />

    <!-- Agent 管理中心 -->
    <AgentAdmin
      v-model:visible="showAgentAdmin"
      @agent-change="handleAgentChange"
      @start-chat="handleStartChatFromAdmin"
    />
    
    <!-- Agent 简易聊天对话框 -->
    <AgentChatDialog
      v-model:visible="showAgentChatDialog"
      :agent="dialogAgent"
      @expand="handleExpandDialog"
    />
    
    <!-- 会话管理器 -->
    <SessionManager
      v-model:visible="showSessionManager"
      :sessions="sessions"
      :agents="allAgents"
      :current-session-id="currentSessionId"
      :current-agent="selectedAgent"
      @create="createSessionForCurrentAgent"
      @switch="handleSwitchFromManager"
      @rename="renameSession"
      @delete="handleBatchDelete"
    />
    
    <!-- 日志监控面板 (组件暂缺) -->
    <!-- <LogDashboard v-model:visible="showLogDashboard" /> -->
    
    <!-- 删除确认弹窗 - 液态玻璃 3D 风格 -->
    <Teleport to="body">
      <Transition name="glass-modal">
        <div v-if="showDeleteConfirm" class="glass-overlay" @click.self="showDeleteConfirm = false">
          <div class="glass-modal-3d">
            <!-- 玻璃光效 -->
            <div class="glass-shine"></div>
            <div class="glass-glow"></div>
            
            <div class="glass-content">
              <!-- 警告图标 -->
              <div class="glass-icon-wrapper">
                <div class="glass-icon">⚠️</div>
                <div class="icon-ring"></div>
              </div>
              
              <h4 class="glass-title">确认删除会话</h4>
              <p class="glass-hint">删除后无法恢复，该会话的所有消息都将被清除</p>
              
              <div class="glass-actions">
                <button class="glass-btn secondary" @click="showDeleteConfirm = false">
                  <span class="btn-shine"></span>
                  取消
                </button>
                <button class="glass-btn danger" @click="executeDelete">
                  <span class="btn-shine"></span>
                  <span class="danger-pulse"></span>
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Toast 提示 -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toastVisible" class="chat-toast">{{ toastMessage }}</div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { AgentAdmin, AgentChatDialog } from '@/theme/components/agent'
import { Icon } from '@/theme/components/common'
import { useAIChat, useAgentConfig } from '@/theme/stores'
import type { Agent, MessageAttachment, SessionConfig, Skill } from '@/theme/types'
import { Teleport, computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import ChatInput from './ChatInput.vue'
import MessageList from './MessageList.vue'
import SessionManager from './SessionManager.vue'
import SessionPanel from './SessionPanel.vue'
import SettingsPanel from './SettingsPanel.vue'
import TokenUsageBar from './TokenUsageBar.vue'

const {
  sessions,
  currentSessionId,
  currentSession,
  messages,
  messageGroups,
  isStreaming,
  defaultConfig,
  createSession,
  switchSession,
  renameSession,
  deleteSession,
  sendMessage,
  interruptGeneration,
  clearMessages,
  regenerateResponse,
  switchVersion,
  updateSessionConfig,
  tokenUsage
} = useAIChat()

const { activeAgent, agents: allAgents, skills: allSkills, setActive } = useAgentConfig()
const { buildSystemPrompt } = useAgentConfig()

// UI 状态
const leftCollapsed = ref(false)
const rightCollapsed = ref(false)  // 默认打开右侧配置栏
const inputText = ref('')
const messageListRef = ref<InstanceType<typeof MessageList>>()
const chatInputRef = ref<InstanceType<typeof ChatInput>>()
const showAgentAdmin = ref(false)
const showLogDashboard = ref(false)
const selectedSkill = ref<Skill | undefined>(undefined)

// Toast 状态
const toastMessage = ref('')
const toastVisible = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | null = null

function showToast(msg: string, duration = 2000) {
  toastMessage.value = msg
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, duration)
}

// Agent 选择相关
const selectedAgent = ref<Agent | null>(null)
const showAgentDropdown = ref(false)
const agentSelectorRef = ref<HTMLElement>()

// 对话框相关
const showAgentChatDialog = ref(false)
const dialogAgent = ref<Agent | null>(null)

// 删除确认状态
const showDeleteConfirm = ref(false)
const sessionToDelete = ref<string | null>(null)

// 会话管理器
const showSessionManager = ref(false)

// 计算属性：按 Agent 过滤的会话列表
const filteredSessions = computed(() => {
  if (!selectedAgent.value) return sessions.value
  
  const agentId = selectedAgent.value.id
  return sessions.value.filter(s => {
    const sid = (s.config as any)?.agentId
    // 匹配当前 Agent 的会话
    if (sid) return sid === agentId
    // 没有 agentId 的旧数据 → 不显示(避免所有 Agent 都看到同一批旧会话)
    return false
  })
})

// 输入框占位符
const inputPlaceholder = computed(() => {
  if (selectedAgent.value) {
    return `给 ${selectedAgent.value.name} 发送消息...`
  }
  return '发送消息...'
})

// 当前 Agent 的系统提示词
const currentAgentSystemPrompt = computed(() => {
  if (!selectedAgent.value) return ''
  return selectedAgent.value.systemPrompt || buildSystemPrompt(selectedAgent.value)
})

// 当前模型配置
const currentModelConfig = computed(() => {
  const model = currentSession.value?.config?.model || 'deepseek-v4-pro'
  const configs: Record<string, { supportsVision?: boolean; supportsVideo?: boolean; contextWindow: number }> = {
    'deepseek-v4-pro': { supportsVision: false, supportsVideo: false, contextWindow: 1000000 },
    'deepseek-v4-flash': { supportsVision: false, supportsVideo: false, contextWindow: 1000000 },
    'kimi-k2.5': { supportsVision: true, supportsVideo: true, contextWindow: 256000 }
  }
  return configs[model] || { supportsVision: false, supportsVideo: false, contextWindow: 1000000 }
})

// 当前模型是否支持视觉
const currentModelSupportsVision = computed(() => currentModelConfig.value.supportsVision)

// 当前模型是否支持视频
const currentModelSupportsVideo = computed(() => currentModelConfig.value.supportsVideo)

// System Prompt 是否已自定义(与会话初始值不同)
const isSystemPromptCustomized = computed((): boolean => {
  if (!currentSession.value) return false
  // 如果会话有 _customSystemPrompt 标记，说明用户手动修改过
  if (currentSession.value.config._customSystemPrompt) return true
  
  // 或者与会话创建时的 Agent systemPrompt 不同
  const agentPrompt = currentAgentSystemPrompt.value
  const sessionPrompt = currentSession.value.config.systemPrompt
  
  // 如果两者不同，且 sessionPrompt 不为空，说明被自定义了
  return !!(sessionPrompt && sessionPrompt !== agentPrompt)
})

// 键盘快捷键：Ctrl+L 打开日志面板
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault()
    showLogDashboard.value = true
  }
}

// 点击外部关闭下拉框
function handleClickOutside(e: MouseEvent) {
  if (agentSelectorRef.value && !agentSelectorRef.value.contains(e.target as Node)) {
    showAgentDropdown.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
  
  // 初始化：如果有活跃 Agent，选中它
  if (activeAgent.value) {
    selectedAgent.value = activeAgent.value
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
})

// 监听活跃 Agent 变化
watch(() => activeAgent.value, (agent) => {
  if (agent && !selectedAgent.value) {
    selectedAgent.value = agent
  }
})

// 监听当前选中 Agent 的配置变化(实时同步 systemPrompt)
watchEffect(() => {
  if (!selectedAgent.value || !currentSession.value) return
  
  // 获取当前 Agent 的最新配置
  const currentAgent = allAgents.value.find(a => a.id === selectedAgent.value?.id)
  if (!currentAgent) return
  
  // 如果会话没有自定义 systemPrompt，则同步 Agent 的配置
  if (!currentSession.value.config._customSystemPrompt) {
    const newSystemPrompt = currentAgent.systemPrompt || buildSystemPrompt(currentAgent)
    const currentSystemPrompt = currentSession.value.config.systemPrompt
    
    // 只有当 systemPrompt 发生变化时才更新
    if (newSystemPrompt !== currentSystemPrompt) {
      updateSessionConfig(currentSession.value.id, { systemPrompt: newSystemPrompt })
    }
  }
  
  // 同步更新 selectedAgent 的引用
  if (currentAgent !== selectedAgent.value) {
    selectedAgent.value = currentAgent
  }
})

const currentConfig = computed({
  get: () => currentSession.value?.config || defaultConfig,
  set: (val) => {
    // 更新配置
  }
})

// 选择 Agent
async function selectAgent(agent: Agent) {
  selectedAgent.value = agent
  setActive(agent.id)
  showAgentDropdown.value = false
  
  // 检查是否已有该 Agent 的会话
  const agentSessions = sessions.value.filter(s => (s.config as any)?.agentId === agent.id)
  
  if (agentSessions.length === 0) {
    // 没有会话，自动创建一个
    await createSessionForCurrentAgent()
  } else {
    // 切换到最新的会话 (因为 sessions 是最新的在前面，所以取 [0])
    const latestSession = agentSessions[0]
    switchSession(latestSession.id)
    
    // 如果当前会话没有自定义 systemPrompt，更新为新 Agent 的
    if (!latestSession.config._customSystemPrompt) {
      const agentPrompt = agent.capabilities?.customSystemPrompt || buildSystemPrompt(agent)
      updateSessionConfig(latestSession.id, { 
        systemPrompt: agentPrompt
      })
      latestSession.config._customSystemPrompt = false
    }
  }
}

// 为当前 Agent 创建会话
async function createSessionForCurrentAgent() {
  // 严格拦截：如果当前已经在空会话中，绝不重复新建空会话(直接转给新选的Agent用就行了)
  if (currentSessionId.value) {
    const sid = currentSessionId.value
    const currentGroups = messageGroups.value
    
    if (currentGroups.length === 0) {
      showToast('已经在新会话中了')
      
      // 直接把当前空会话分配给选中的 Agent
      if (selectedAgent.value) {
        updateSessionConfig(sid, {
          agentId: selectedAgent.value.id,
          agentName: selectedAgent.value.name,
          systemPrompt: selectedAgent.value.systemPrompt || buildSystemPrompt(selectedAgent.value),
          _customSystemPrompt: false
        } as any)
      }
      return
    }
  }
  
  const newSession = await createSession()
  if (newSession && selectedAgent.value) {
    // 设置会话标题
    renameSession(newSession.id, `与 ${selectedAgent.value.name} 的对话`)
    
    // 持久化 agentId + systemPrompt 到 config(会随会话保存到后端)
    const systemPrompt = selectedAgent.value.systemPrompt || buildSystemPrompt(selectedAgent.value)
    updateSessionConfig(newSession.id, {
      agentId: selectedAgent.value.id,
      agentName: selectedAgent.value.name,
      systemPrompt,
      _customSystemPrompt: false, // 标记为未自定义，跟随 Agent
    } as any)
    
    // 强制切换到新创建的会话
    switchSession(newSession.id)
  }
}

// 打开 Agent 管理
function openAgentAdmin() {
  showAgentDropdown.value = false
  showAgentAdmin.value = true
}

// 返回首页
function goHome() {
  window.location.href = '/'
}

async function handleRegenerate() {
  if (!currentSessionId.value) return
  
  // 找到最后一条用户消息重新生成
  const sessionMessages = messages.value
  for (let i = sessionMessages.length - 1; i >= 0; i--) {
    if (sessionMessages[i].role === 'user') {
      await regenerateResponse(sessionMessages[i].id)
      break
    }
  }
}

async function handleSend(content: string, attachments: MessageAttachment[] = [], skillInfo?: Skill) {
  if (!content.trim() && attachments.length === 0) return
  // isStreaming 时不再阻止发送，消息会进入队列

  let finalContent = content.trim()

  // ═════════════════════════════════════════════════════════════════
  // 图片 OCR：模型不支持 vision 时，自动解析图片文字
  // 结果写入 attachment.ocrText，不混入 content，用户看不见
  // ═════════════════════════════════════════════════════════════════
  if (!currentModelSupportsVision.value) {
    const imageAttachments = attachments.filter(a => a.type === 'image')
    for (const att of imageAttachments) {
      try {
        const resp = await fetch(att.url)
        if (!resp.ok) throw new Error(`fetch blob 失败: ${resp.status}`)
        const blob = await resp.blob()

        const formData = new FormData()
        formData.append('file', blob, att.name || 'image.png')
        formData.append('language', 'auto')

        const ocrResp = await fetch('/api/ocr', {
          method: 'POST',
          body: formData
        })
        if (!ocrResp.ok) {
          const errText = await ocrResp.text().catch(() => '')
          throw new Error(`OCR 服务 HTTP ${ocrResp.status}: ${errText}`)
        }
        const ocrResult = await ocrResp.json()

        if (ocrResult.success && ocrResult.data?.text) {
          att.ocrText = ocrResult.data.text
        } else if (ocrResult.error) {
          att.ocrText = `(OCR 失败: ${ocrResult.error})`
        } else {
          att.ocrText = '(未识别到文字)'
        }
      } catch (e: any) {
        console.error('[OCR] 解析失败:', e)
        att.ocrText = `(OCR 失败: ${e.message || '未知错误'})`
      }
    }
  }

  inputText.value = ''

  // 立即滚动到底部
  nextTick(() => {
    messageListRef.value?.scrollToBottom()
    chatInputRef.value?.focus()
  })

  // 只有在使用了技能且技能有 content 时才更新
  // 保持用户自定义的 systemPrompt 不被覆盖
  if (currentSessionId.value && skillInfo?.content) {
    updateSessionConfig(currentSessionId.value, { systemPrompt: skillInfo.content })
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session) {
      session.config._customSystemPrompt = true // 标记为用户自定义
    }
  }

  // 发送消息（attachments 保留给 UI 预览，content 已包含 OCR 结果）
  await sendMessage(finalContent, attachments, skillInfo)
}

function handleQuickPrompt(text: string) {
  inputText.value = text
  nextTick(() => {
    chatInputRef.value?.focus()
  })
}

function handleRename(id: string, newTitle: string) {
  if (newTitle?.trim()) {
    renameSession(id, newTitle.trim())
  }
}

function handleDelete(id: string) {
  sessionToDelete.value = id
  showDeleteConfirm.value = true
}

// 从会话管理器切换会话
function handleSwitchFromManager(sessionId: string) {
  // 找到会话对应的 Agent
  const session = sessions.value.find(s => s.id === sessionId)
  if (session) {
    const agentId = (session.config as any)?.agentId
    if (agentId) {
      const agent = allAgents.value.find(a => a.id === agentId)
      if (agent) {
        selectedAgent.value = agent
        setActive(agent.id)
      }
    }
  }
  switchSession(sessionId)
  showSessionManager.value = false
}

// 批量删除会话
function handleBatchDelete(sessionIds: string[]) {
  sessionIds.forEach(id => deleteSession(id))
}

// 重置 System Prompt 到 Agent 默认
function resetSystemPromptToAgent() {
  if (!currentSessionId.value || !selectedAgent.value) return
  
  const agentPrompt = selectedAgent.value.systemPrompt || buildSystemPrompt(selectedAgent.value)
  updateSessionConfig(currentSessionId.value, { 
    systemPrompt: agentPrompt,
    _customSystemPrompt: false 
  })
}

function executeDelete() {
  if (sessionToDelete.value) {
    deleteSession(sessionToDelete.value)
    sessionToDelete.value = null
    showDeleteConfirm.value = false
  }
}

function updateConfig(config: Partial<SessionConfig>) {
  if (currentSessionId.value) {
    // 如果修改了 systemPrompt，检查是否与会话初始值不同
  if ('systemPrompt' in config) {
    const newPrompt = config.systemPrompt
    const agentPrompt = currentAgentSystemPrompt.value
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session && newPrompt !== undefined) {
      session.config._customSystemPrompt = newPrompt !== agentPrompt
    }
  }
    
  updateSessionConfig(currentSessionId.value, config)
  }
}

// 包装 updateConfig 以处理 SettingsPanel 的事件
function handleUpdateConfig(config: Partial<SessionConfig>) {
  updateConfig(config)
}

function handleSelectSkill(skill: Skill | undefined) {
  selectedSkill.value = skill
}

// 从 AgentAdmin 切换 Agent(旧版方式，保留兼容)
async function handleAgentChange(agent: Agent) {
  await selectAgent(agent)
  showAgentAdmin.value = false
}

// 从 AgentAdmin 点击聊天按钮 - 打开简易对话框
function handleStartChatFromAdmin(agent: Agent) {
  dialogAgent.value = agent
  showAgentChatDialog.value = true
  setActive(agent.id)
}

// 从对话框展开到完整界面
async function handleExpandDialog(agent: Agent, dialogMessages: any[]) {
  // 关闭对话框
  showAgentChatDialog.value = false
  
  // 在完整界面中选中该 Agent
  await selectAgent(agent)
  
  // 如果对话框有消息，可以合并到新会话
  if (dialogMessages.length > 1) { // 不止欢迎消息
    // 可以在这里实现消息同步
    console.log('同步对话框消息:', dialogMessages.length)
  }
}
</script>

<style scoped>

.chat-layout {
  display: flex;
  height: calc(100vh - var(--vp-nav-height, 64px));
  background: var(--ai-bg-body);
  overflow: hidden;
  font-family: var(--sr-font-primary, 'Inter', sans-serif);
}

/* 主聊天区 */
.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: transparent;
  position: relative;
}

/* 顶部栏 */
.main-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ai-space-3) var(--ai-space-5);
  background: transparent;
  border-bottom: 1px solid var(--ai-border-light);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
}

.menu-btn,
.icon-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-md);
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.menu-btn:hover,
.icon-btn:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

.icon-btn.active {
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.header-info {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
}

.session-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ai-text-primary);
  margin: 0;
}

.model-tag {
  padding: 2px 10px;
  background: var(--ai-primary-100);
  color: var(--ai-primary-700);
  border-radius: var(--ai-radius-full);
  font-size: 11px;
  font-weight: 500;
}

/* Agent 选择器 */
.agent-selector {
  position: relative;
}

.agent-select-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.agent-select-trigger:hover,
.agent-select-trigger.open {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(184, 160, 144, 0.4);
  box-shadow: 0 4px 12px rgba(184, 160, 144, 0.1);
}

.selected-avatar {
  font-size: 16px;
}

.selected-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-brand);
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-icon {
  color: var(--vp-c-brand);
  transition: transform 0.2s;
}

.agent-select-trigger.open .dropdown-icon {
  transform: rotate(180deg);
}

/* Agent 下拉菜单 */
.agent-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  left: 0;
  min-width: 280px;
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.88));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  z-index: 100;
  overflow: hidden;
}

.dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.manage-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 11px;
  color: var(--vp-c-brand);
  cursor: pointer;
  transition: all 0.2s;
}

.manage-btn:hover {
  background: var(--vp-c-brand-soft);
}

.dropdown-divider {
  height: 1px;
  background: var(--ai-border-light);
  margin: 0 16px;
}

.agent-list {
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
}

.agent-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.agent-option:hover {
  background: rgba(184, 160, 144, 0.08);
}

.agent-option.active {
  background: rgba(184, 160, 144, 0.12);
}

.option-avatar {
  font-size: 20px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-bg-secondary, rgba(0, 0, 0, 0.02));
  border-radius: 12px;
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
}

.option-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.option-desc {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.check-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-accent-star, #b8a090);
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
}

/* 下拉动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

.header-right {
  display: flex;
  gap: var(--ai-space-2);
}

/* Agent 管理按钮特殊样式 */
.agent-admin-btn {
  position: relative;
}

.agent-admin-btn::after {
  content: '';
  position: absolute;
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  background: var(--vp-c-brand);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.2s;
}

.agent-admin-btn.active::after {
  opacity: 1;
}

/* 首页按钮特殊样式 */
.home-btn {
  color: var(--ai-text-secondary);
}

.home-btn:hover {
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

/* 日志按钮特殊样式 */
.log-dashboard-btn {
  position: relative;
}

.log-dashboard-btn:hover {
  color: var(--sr-morandi-green, #a8b3a8);
  background: rgba(168, 179, 168, 0.1);
}

.log-dashboard-btn.active {
  color: var(--sr-morandi-green, #a8b3a8);
  background: rgba(168, 179, 168, 0.15);
}

/* ========== 液态玻璃 3D 弹窗 ========== */
.glass-overlay {
  position: fixed;
  inset: 0;
  background: rgba(241, 245, 249, 0.6);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  perspective: 1000px;
}

.glass-modal-3d {
  position: relative;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  max-width: 400px;
  width: 90%;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 
    0 25px 50px -12px rgba(31, 38, 135, 0.1),
    0 0 60px rgba(179, 168, 184, 0.1);
  transform-style: preserve-3d;
  animation: modal-enter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);

  overflow: hidden;
}

@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(30px) rotateX(-10deg) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) rotateX(0) scale(1);
  }
}

.glass-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  animation: shine 3s infinite;
}

@keyframes shine {
  0%, 100% { left: -100%; }
  50% { left: 100%; }
}

.glass-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 200px;
  height: 200px;
  background: radial-gradient(
    circle,
    rgba(184, 160, 144, 0.15) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.glass-content {
  position: relative;
  z-index: 1;
}

.glass-icon-wrapper {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

.glass-icon {
  font-size: 56px;
  position: relative;
  z-index: 1;
  animation: icon-pulse 2s ease-in-out infinite;
}

@keyframes icon-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.icon-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80px;
  height: 80px;
  border: 2px solid rgba(212, 184, 184, 0.2);
  border-radius: 50%;
  animation: ring-expand 2s ease-out infinite;
}

@keyframes ring-expand {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

.glass-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 12px;
  color: var(--sr-text-primary, #1a1a2e);
  background: linear-gradient(135deg, var(--sr-text-primary, #1a1a2e), #475569);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glass-hint {
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
  margin: 0 0 28px;
  line-height: 1.6;
}

.glass-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.glass-btn {
  position: relative;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  overflow: hidden;
}

.glass-btn .btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  transition: left 0.5s;
}

.glass-btn:hover .btn-shine {
  left: 100%;
}

.glass-btn.secondary {
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  color: #475569;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.glass-btn.secondary:hover {
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.glass-btn.danger {
  background: linear-gradient(135deg, var(--sr-morandi-pink, #d4b8b8), #dc2626);
  color: white;
  box-shadow: 0 4px 14px rgba(212, 184, 184, 0.3);
}

.glass-btn.danger:hover {
  background: linear-gradient(135deg, #dc2626, #b91c1c);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(212, 184, 184, 0.4);
}

.danger-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 12px;
  border: 2px solid rgba(212, 184, 184, 0.5);
  animation: danger-pulse 2s ease-out infinite;
}

@keyframes danger-pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0;
  }
}

/* 弹窗过渡动画 */
.glass-modal-enter-active,
.glass-modal-leave-active {
  transition: all 0.3s ease;
}

.glass-modal-enter-from,
.glass-modal-leave-to {
  opacity: 0;
}

.glass-modal-enter-from .glass-modal-3d,
.glass-modal-leave-to .glass-modal-3d {
  transform: translateY(20px) scale(0.95);
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .selected-name {
    max-width: 60px;
  }
  
  .agent-dropdown {
    left: auto;
    right: 0;
  }
}

/* Toast 提示 */
.chat-toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.88);
  color: var(--sr-text-primary, #1a1a2e);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 500;
  z-index: 10000;
  pointer-events: none;
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-12px);
}
</style>
