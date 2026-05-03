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
      <ChatHeader
        :title="currentSession?.title || ''"
        :model="currentSession?.config.model || ''"
        :selected-agent="selectedAgent"
        :token-usage="tokenUsage"
        :context-window="currentModelConfig.contextWindow"
        :left-collapsed="leftCollapsed"
        :right-collapsed="rightCollapsed"
        :show-log-dashboard="showLogDashboard"
        :show-agent-admin="showAgentAdmin"
        :session-id="currentSessionId"
        @toggle-left="leftCollapsed = !leftCollapsed"
        @toggle-right="rightCollapsed = !rightCollapsed"
        @open-agent-admin="openAgentAdmin"
        @go-home="goHome"
        @toggle-log-dashboard="showLogDashboard = !showLogDashboard"
        @clear-messages="clearMessages()"
      />

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
        @active-message-change="handleActiveMessageChange"
      />

      <!-- 输入框 -->
      <ChatInput
        ref="chatInputRef"
        v-model="inputText"
        :is-streaming="isStreaming"
        :task-queue="taskQueue"
        :selected-skill="selectedSkill"
        :skills="allSkills"
        :supports-vision="currentModelSupportsVision"
        :supports-video="currentModelSupportsVideo"
        :max-attachments="10"
        @send="handleSend"
        @stop="interruptGeneration"
        @remove-from-queue="(index: number) => taskQueue.splice(index, 1)"
        @select-skill="handleSelectSkill"
      />
    </main>

    <!-- 右侧对话导航栏 -->
    <aside
      v-if="showNavigator && messages.length > 0"
      class="chat-navigator"
      :class="{ expanded: !navCollapsed || isHovering }"
      @mouseenter="isHovering = true"
      @mouseleave="isHovering = false"
    >
      <div class="nav-content">
        <div class="nav-header">
          <span class="nav-title">对话导航</span>
          <button class="nav-toggle" @click.stop="navCollapsed = !navCollapsed">
            <Icon name="chevron-right" :size="14" />
          </button>
        </div>
        <div class="nav-list">
          <div
            v-for="item in messageNavItems"
            :key="item.id"
            class="nav-item"
            :class="{ active: activeMessageId === item.id }"
            @click="scrollToMessage(item.id)"
          >
            <span class="nav-dot" :class="{ active: activeMessageId === item.id }" />
            <span class="nav-text">{{ item.summary }}</span>
          </div>
        </div>
      </div>
    </aside>

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
    
    <!-- 工具结果侧面板 -->
    <ToolResultSidebar />

    <!-- 日志监控面板 (组件暂缺) -->
    <!-- <LogDashboard v-model:visible="showLogDashboard" /> -->
    
    <!-- 删除确认弹窗 - Star River 风格 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <div class="modal-card">
            <div class="modal-icon">⚠️</div>
            <h4 class="modal-title">确认删除会话</h4>
            <p class="modal-desc">删除后无法恢复，该会话的所有消息都将被清除</p>
            <div class="modal-actions">
              <button class="modal-btn cancel" @click="showDeleteConfirm = false">取消</button>
              <button class="modal-btn danger" @click="executeDelete">确认删除</button>
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
import ChatHeader from './ChatHeader.vue'
import ChatInput from './ChatInput.vue'
import ToolResultSidebar from './ToolResultSidebar.vue'
import MessageList from './MessageList.vue'
import SessionManager from './SessionManager.vue'
import SessionPanel from './SessionPanel.vue'
import SettingsPanel from './SettingsPanel.vue'

const {
  sessions,
  currentSessionId,
  currentSession,
  messages,
  messageGroups,
  isStreaming,
  pendingMessages,
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

// 前端消息队列（AI 执行期间用户发送的消息暂存于此）
interface QueuedTask {
  id: string
  content: string
  attachments: MessageAttachment[]
  skillInfo?: Skill
}
const taskQueue = ref<QueuedTask[]>([])

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

// 右侧对话导航栏状态
const showNavigator = ref(true)
const navCollapsed = ref(true)     // 默认折叠成窄条
const isHovering = ref(false)      // 鼠标悬停时临时展开
const activeMessageId = ref('')

// 用户消息导航项
const messageNavItems = computed(() => {
  return messages.value
    .filter(m => m.role === 'user')
    .map(m => {
      const text = m.content.replace(/<[^>]+>/g, '').trim()
      const summary = text.length > 20 ? text.slice(0, 20) + '…' : text || '无内容'
      return { id: m.id, summary }
    })
})

function handleActiveMessageChange(messageId: string) {
  activeMessageId.value = messageId
}

function scrollToMessage(messageId: string) {
  messageListRef.value?.scrollToMessage(messageId)
}

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
  const model = currentSession.value?.config?.model || 'deepseek-v4-flash'
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
  // 如果会话有 _customSystemPrompt 标记,说明用户手动修改过
  if (currentSession.value.config._customSystemPrompt) return true
  
  // 或者与会话创建时的 Agent systemPrompt 不同
  const agentPrompt = currentAgentSystemPrompt.value
  const sessionPrompt = currentSession.value.config.systemPrompt
  
  // 如果两者不同,且 sessionPrompt 不为空,说明被自定义了
  return !!(sessionPrompt && sessionPrompt !== agentPrompt)
})

// 键盘快捷键：Ctrl+L 打开日志面板
function handleKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
    e.preventDefault()
    showLogDashboard.value = true
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)

  // 初始化：如果有活跃 Agent,选中它
  if (activeAgent.value) {
    selectedAgent.value = activeAgent.value
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// 监听活跃 Agent 变化
watch(() => activeAgent.value, (agent) => {
  if (agent && !selectedAgent.value) {
    selectedAgent.value = agent
  }
})

// 监听 AI 执行状态：执行完成后自动消费队列
watch(isStreaming, (newVal, oldVal) => {
  if (oldVal === true && newVal === false && taskQueue.value.length > 0) {
    nextTick(() => consumeQueue())
  }
})

// 监听当前选中 Agent 的配置变化(实时同步 systemPrompt)
watchEffect(() => {
  if (!selectedAgent.value || !currentSession.value) return
  
  // 获取当前 Agent 的最新配置
  const currentAgent = allAgents.value.find(a => a.id === selectedAgent.value?.id)
  if (!currentAgent) return
  
  // 如果会话没有自定义 systemPrompt,则同步 Agent 的配置
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

  // 检查是否已有该 Agent 的会话
  const agentSessions = sessions.value.filter(s => (s.config as any)?.agentId === agent.id)
  
  if (agentSessions.length === 0) {
    // 没有会话,自动创建一个
    await createSessionForCurrentAgent()
  } else {
    // 切换到最新的会话 (因为 sessions 是最新的在前面,所以取 [0])
    const latestSession = agentSessions[0]
    switchSession(latestSession.id)
    
    // 如果当前会话没有自定义 systemPrompt,更新为新 Agent 的
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
  // 严格拦截：如果当前已经在空会话中,绝不重复新建空会话(直接转给新选的Agent用就行了)
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
      _customSystemPrompt: false, // 标记为未自定义,跟随 Agent
    } as any)
    
    // 强制切换到新创建的会话
    switchSession(newSession.id)
  }
}

// 打开 Agent 管理
function openAgentAdmin() {
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

// ═══════════════════════════════════════════════════════════════
// 消息队列管理
// ═══════════════════════════════════════════════════════════════

/**
 * 用户触发发送：消息先入队，然后尝试消费
 * 无论 isStreaming 状态如何，行为一致
 */
function handleSend(content: string, attachments: MessageAttachment[] = [], skillInfo?: Skill) {
  if (!content.trim() && attachments.length === 0) return

  taskQueue.value.push({
    id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    content: content.trim(),
    attachments: [...attachments],
    skillInfo
  })

  inputText.value = ''

  nextTick(() => {
    messageListRef.value?.scrollToBottom()
    chatInputRef.value?.focus()
  })

  consumeQueue()
}

/**
 * 消费队列：取出最前面的一条消息执行
 * 只有 !isStreaming 时才能真正发送
 */
async function consumeQueue() {
  if (taskQueue.value.length === 0) return
  if (isStreaming.value) return // 当前正在执行，等完成后再消费

  const next = taskQueue.value.shift()!
  let finalContent = next.content

  // ═════════════════════════════════════════════════════════════════
  // 图片 OCR：模型不支持 vision 时,自动解析图片文字
  // ═════════════════════════════════════════════════════════════════
  if (!currentModelSupportsVision.value) {
    const imageAttachments = next.attachments.filter(a => a.type === 'image')
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

  // 只有在使用了技能且技能有 content 时才更新
  if (currentSessionId.value && next.skillInfo?.content) {
    updateSessionConfig(currentSessionId.value, { systemPrompt: next.skillInfo.content })
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session) {
      session.config._customSystemPrompt = true
    }
  }

  await sendMessage(finalContent, next.attachments, next.skillInfo)
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
async function handleBatchDelete(sessionIds: string[]) {
  for (const id of sessionIds) {
    await deleteSession(id)
  }
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
    // 如果修改了 systemPrompt,检查是否与会话初始值不同
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

// 从 AgentAdmin 切换 Agent(旧版方式,保留兼容)
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
  
  // 如果对话框有消息,可以合并到新会话
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

/* ========== 弹窗 - Star River 风格 ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 32px 28px;
  width: 360px;
  max-width: 90vw;
  text-align: center;
}

.modal-icon {
  width: 52px;
  height: 52px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 168, 168, 0.12);
  border-radius: 50%;
  font-size: 22px;
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--sr-text-primary, #2d2a26);
  margin: 0 0 8px;
}

.modal-desc {
  font-size: 13.5px;
  color: var(--sr-text-secondary, #6a6560);
  line-height: 1.6;
  margin: 0 0 24px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.modal-btn {
  padding: 10px 22px;
  border-radius: 10px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.modal-btn.cancel {
  background: rgba(245, 243, 240, 0.8);
  color: var(--sr-text-secondary, #6a6560);
  border-color: rgba(200, 195, 188, 0.4);
}

.modal-btn.cancel:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(200, 195, 188, 0.6);
}

.modal-btn.danger {
  background: rgba(201, 168, 168, 0.12);
  color: #a88080;
  border-color: rgba(201, 168, 168, 0.35);
}

.modal-btn.danger:hover {
  background: rgba(201, 168, 168, 0.22);
  border-color: rgba(201, 168, 168, 0.55);
}

/* 弹窗过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-fade-enter-from .modal-card,
.modal-fade-leave-to .modal-card {
  transform: scale(0.96);
  opacity: 0;
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
  background: #1e293b;
  color: #fff;
  border: none;
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

/* ========== 右侧对话导航栏 ========== */
.chat-navigator {
  width: 6px;
  flex-shrink: 0;
  background: rgba(184, 160, 144, 0.08);
  border-left: 1px solid rgba(184, 160, 144, 0.15);
  transition: width 0.25s ease, background 0.25s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.chat-navigator:hover,
.chat-navigator.expanded {
  width: 180px;
  background: rgba(248, 250, 252, 0.6);
  border-left-color: var(--ai-border-light);
  cursor: default;
}

.nav-content {
  width: 180px;
  height: 100%;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.chat-navigator:hover .nav-content,
.chat-navigator.expanded .nav-content {
  opacity: 1;
  transition: opacity 0.2s ease 0.08s;
}

.nav-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid var(--ai-border-light);
}

.nav-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--ai-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.nav-toggle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all 0.2s;
}

.nav-toggle:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

.nav-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 2px solid transparent;
}

.nav-item:hover {
  background: rgba(184, 160, 144, 0.06);
}

.nav-item.active {
  background: rgba(184, 160, 144, 0.08);
  border-left-color: var(--vp-c-brand);
}

.nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ai-gray-300);
  flex-shrink: 0;
  transition: all 0.2s;
}

.nav-dot.active {
  background: var(--vp-c-brand);
  box-shadow: 0 0 0 3px rgba(184, 160, 144, 0.15);
}

.nav-text {
  font-size: 12px;
  color: var(--ai-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.nav-item.active .nav-text {
  color: var(--ai-text-primary);
  font-weight: 500;
}

/* 小屏幕隐藏导航栏 */
@media (max-width: 1200px) {
  .chat-navigator {
    display: none;
  }
}
</style>
