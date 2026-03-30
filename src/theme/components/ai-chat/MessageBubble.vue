<!--
  MessageBubble - 消息气泡组件（3D 液态玻璃风格）
  
  按官方文档设计：垂直时间线展示
  思维链 → 工具调用 → 思维链 → 工具调用 → ... → 思维链 → 最终回复
  每一轮的思维链和它产生的动作紧密相连
-->
<template>
  <div class="message-wrapper-3d" :class="[message.role, { last: isLast }]">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message-3d">
      <div class="message-content-3d">
        <div v-if="parsedMessage.skill" class="skill-capsule-3d">
          <span class="skill-icon">{{ parsedMessage.skill.icon }}</span>
          <span class="skill-name">{{ parsedMessage.skill.name }}</span>
        </div>
        <div class="message-text" v-html="parsedMessage.displayHtml"></div>
      </div>
      <Avatar type="user" />
    </div>

    <!-- AI 消息 -->
    <div v-else class="ai-message-3d">
      <AIAvatar :typing="isStreaming" />
      <div class="message-body">
        <!-- 
          思考时间线 - 按官方文档垂直排列
          顺序：思维链1.1 → 工具调用1.1 → 思维链1.2 → 工具调用1.2 → ... → 思维链1.N → 最终回复
        -->
        <template v-if="hasTimelineItems">
          <div class="thinking-timeline">
            <div 
              v-for="(item, index) in timelineItems" 
              :key="item.id"
              class="timeline-card"
              :class="[item.type]"
            >
              <!-- 思维链卡片 -->
              <template v-if="item.type === 'thinking'">
                <div class="card-header" @click="toggleItem(item.id)">
                  <span class="card-icon">💡</span>
                  <span class="card-title">思考{{ item.type === 'thinking' && (item as any).status === 'completed' ? '已完成' : '中' }}</span>
                  <Icon :name="expandedItems[item.id] ? 'chevron-down' : 'chevron-right'" :size="12" />
                </div>
                <div v-show="expandedItems[item.id]" class="card-body">
                  <div class="thinking-content">{{ item.content }}</div>
                </div>
              </template>

              <!-- 中间文本（模型在工具调用之间生成的说明文字） -->
              <template v-else-if="item.type === 'text'">
                <div class="intermediate-text" v-html="renderMarkdown(item.content || '')"></div>
              </template>
              
              <!-- 工具调用卡片 -->
              <template v-else-if="item.type === 'tool_call' && item.toolRecord">
                <div class="card-header tool-call-header" @click="toggleItem(item.id)">
                  <div class="tool-call-left">
                    <span class="card-icon">🔧</span>
                    <span class="tool-call-name">{{ item.toolRecord.name }}</span>
                    <span v-if="item.toolRecord.arguments" class="tool-call-args">
                      {{ getToolArgsSummary(item.toolRecord.arguments) }}
                    </span>
                  </div>
                  <div class="tool-call-right">
                    <span v-if="item.toolRecord.duration" class="tool-call-time">{{ item.toolRecord.duration }}ms</span>
                    <span :class="['card-status', item.toolRecord.status]">
                      {{ statusText(item.toolRecord.status) }}
                    </span>
                    <Icon :name="expandedItems[item.id] ? 'chevron-down' : 'chevron-right'" :size="12" />
                  </div>
                </div>
                <div v-show="expandedItems[item.id]" class="card-body">
                  <div class="tool-section">
                    <span class="section-label">📥 参数</span>
                    <code class="section-code">{{ JSON.stringify(item.toolRecord.arguments, null, 2) }}</code>
                  </div>
                  <div v-if="item.toolRecord.status !== 'pending' && item.toolRecord.status !== 'running'" class="tool-section">
                    <span class="section-label">📤 结果</span>
                    <pre class="section-pre">{{ item.toolRecord.result }}</pre>
                  </div>
                  <div v-else class="tool-running">
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </template>
        
        <!-- 传统思考框（兼容旧数据，无 thinkingSteps 时） -->
        <div v-else-if="displayReasoning" class="reasoning-box-3d">
          <div class="reasoning-header" @click="isExpanded = !isExpanded">
            <span class="reasoning-icon">💡</span>
            <span>思考过程</span>
            <Icon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
          </div>
          <div v-show="isExpanded" class="reasoning-content">
            {{ displayReasoning }}
          </div>
        </div>

        <!-- 最终回复 -->
        <div 
          v-if="message.content && shouldUseTypewriter" 
          class="final-response typing-effect"
        >
          <div class="response-header">
            <span class="response-icon">✨</span>
            <span>回答</span>
          </div>
          <div class="response-body">
            <TypewriterText
              ref="typewriterRef"
              :content="renderedHtml"
              :speed="12"
              :html="true"
              :enabled="true"
              @complete="onTypewriterComplete"
            />
          </div>
        </div>
        
        <div 
          v-else-if="message.content" 
          class="final-response"
        >
          <div class="response-header">
            <span class="response-icon">✨</span>
            <span>回答</span>
          </div>
          <div class="response-body" v-html="renderedHtml"></div>
        </div>
        
        <!-- 思考中占位 -->
        <div v-else-if="isStreaming" class="thinking-placeholder-3d">
          <span class="thinking-dot-3d"></span>
          <span class="thinking-dot-3d"></span>
          <span class="thinking-dot-3d"></span>
        </div>

        <!-- legacy 工具面板已移除，统一走 timeline 路径 -->

        <!-- 版本切换器 -->
        <MessageVersions
          v-if="versions && !isStreaming"
          :versions="versions.versions"
          :current-index="versions.currentIndex"
          :user-message-id="versions.userMessageId"
          :is-streaming="isStreaming"
          @switch="(index) => $emit('switch-version', { userMessageId: versions!.userMessageId, versionIndex: index })"
          @regenerate="$emit('regenerate')"
        />

        <!-- 操作按钮 -->
        <div class="message-actions-3d">
          <button class="action-btn-3d" :class="{ copied }" @click="copyContent">
            <Icon :name="copied ? 'check' : 'copy'" :size="14" />
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
          <button v-if="isLast && !versions" class="action-btn-3d regenerate" @click="$emit('regenerate')">
            <Icon name="refresh" :size="14" />
            <span>重新生成</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Avatar, AIAvatar, Icon, TypewriterText } from '../../common'
import MessageVersions from './MessageVersions.vue'
import type { ChatMessage, ChatMessage as ChatMessageType, ThinkingStep } from '../../types'

interface VersionInfo {
  versions: ChatMessageType[]
  currentIndex: number
  userMessageId: string
}

interface MessageBubbleProps {
  message: ChatMessage
  isStreaming: boolean
  isLast: boolean
  versions?: VersionInfo | null
}

const props = defineProps<MessageBubbleProps>()

const emit = defineEmits<{
  regenerate: []
  'switch-version': [payload: { userMessageId: string; versionIndex: number }]
}>()

// ============ 状态管理 ============
const isExpanded = ref(true)
const copied = ref(false)
const showToolRecords = ref(false)
const expandedTools = ref<boolean[]>([])
const expandedSections = ref<Record<string, boolean>>({})
const expandedItems = ref<Record<string, boolean>>({})

const typewriterRef = ref<InstanceType<typeof TypewriterText> | null>(null)

// ============ 计算属性 ============

// 所有思考步骤，按索引排序
const allThinkingSteps = computed((): ThinkingStep[] => {
  const steps = props.message.metadata?.thinkingSteps || []
  return [...steps].sort((a, b) => a.index - b.index)
})

// 传统工具记录
const toolRecords = computed(() => props.message.metadata?.toolRecords || [])

// 统一时间线：thinkingSteps 优先，否则将 toolRecords 转换为 timeline items
const timelineItems = computed((): ThinkingStep[] => {
  if (allThinkingSteps.value.length > 0) {
    return allThinkingSteps.value
  }
  // 兼容旧数据：将 toolRecords 转换为 ThinkingStep
  if (toolRecords.value.length > 0) {
    return toolRecords.value.map((record, index) => ({
      id: `legacy_tool_${record.id || index}`,
      type: 'tool_call' as const,
      round: 1,
      index,
      toolRecord: record,
      createdAt: record.startTime || Date.now()
    }))
  }
  return []
})

// 是否有时间线项目（统一判断）
const hasTimelineItems = computed(() => timelineItems.value.length > 0)

// 传统思考内容
const displayReasoning = computed(() => props.message.reasoning?.content || '')

// ============ 打字机效果控制 ============
// 使用 sessionStorage 持久化，避免刷新后重复播放
const TYPEWRISTER_KEY = 'ai_chat_shown_message_ids'

function getShownMessageIds(): Set<string> {
  if (typeof sessionStorage === 'undefined') return new Set()
  try {
    const stored = sessionStorage.getItem(TYPEWRISTER_KEY)
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch (e) {
    console.warn('[MessageBubble] Failed to load shown message ids:', e)
  }
  return new Set()
}

function saveShownMessageId(id: string) {
  if (typeof sessionStorage === 'undefined') return
  try {
    const ids = getShownMessageIds()
    ids.add(id)
    sessionStorage.setItem(TYPEWRISTER_KEY, JSON.stringify(Array.from(ids)))
  } catch (e) {
    console.warn('[MessageBubble] Failed to save shown message id:', e)
  }
}

// 页面加载时的消息ID集合（用于判断历史消息）
const initialMessageIds = ref<Set<string>>(new Set())

const shouldUseTypewriter = computed(() => {
  if (props.message.role !== 'assistant') return false
  if (props.isStreaming) return false
  if (props.message.status !== 'completed') return false
  // 如果是页面加载时就存在的消息（历史消息），不使用打字机效果
  if (initialMessageIds.value.has(props.message.id)) return false
  // 如果已经播放过打字机效果
  if (getShownMessageIds().has(props.message.id)) return false
  return true
})

onMounted(() => {
  // 记录页面加载时已存在的消息ID
  initialMessageIds.value.add(props.message.id)
  
  if (props.message.role === 'assistant' && props.message.content) {
    setTimeout(() => {
      saveShownMessageId(props.message.id)
    }, 100)
  }
})

watch(() => props.message.status, (newStatus, oldStatus) => {
  if (newStatus === 'completed' && oldStatus === 'streaming') {
    setTimeout(() => {
      saveShownMessageId(props.message.id)
    }, 500)
  }
})

function onTypewriterComplete() {
  saveShownMessageId(props.message.id)
}

// ============ 辅助函数 ============

function statusText(status: string): string {
  const map: Record<string, string> = {
    'pending': '等待中',
    'running': '执行中',
    'success': '成功',
    'error': '失败'
  }
  return map[status] || status
}

// 将 markdown 渲染为安全 HTML（用于中间文本块）
function renderMarkdown(content: string): string {
  if (!content) return ''
  try {
    const raw = marked.parse(content, { async: false }) as string
    return DOMPurify.sanitize(raw)
  } catch {
    return content
  }
}

// 提取工具参数摘要（显示在卡片标题中）
function getToolArgsSummary(args: Record<string, any>): string {
  if (!args || typeof args !== 'object') return ''
  // 优先显示 query/keyword/url/path 等关键参数
  const priorityKeys = ['query', 'keyword', 'q', 'url', 'path', 'text', 'content', 'message']
  for (const key of priorityKeys) {
    if (args[key] && typeof args[key] === 'string') {
      const val = args[key] as string
      return val.length > 60 ? val.slice(0, 60) + '...' : val
    }
  }
  // 回退：显示第一个字符串参数
  for (const val of Object.values(args)) {
    if (typeof val === 'string' && val.length > 0) {
      return val.length > 60 ? val.slice(0, 60) + '...' : val
    }
  }
  return ''
}

function toggleItem(itemId: string) {
  expandedItems.value[itemId] = !expandedItems.value[itemId]
}

function toggleToolDetail(index: number) {
  expandedTools.value[index] = !expandedTools.value[index]
}

function toggleSection(toolIndex: number, section: string) {
  const key = `${toolIndex}-${section}`
  expandedSections.value[key] = !expandedSections.value[key]
}

// ============ 消息解析 ============

interface ParsedMessage {
  skill: { name: string; icon: string } | null
  displayHtml: string
}

const parsedMessage = computed((): ParsedMessage => {
  const content = props.message.content || ''
  
  let skill: { name: string; icon: string } | null = null
  if ((props.message.metadata as any)?.skill) {
    skill = (props.message.metadata as any).skill as { name: string; icon: string }
  }
  
  const mentionRegex = /<reference\s+title="([^"]+)"\s+path="([^"]+)"[^>]*>[\s\S]*?<\/reference>/g
  let cleanedContent = content
  let match
  
  while ((match = mentionRegex.exec(content)) !== null) {
    cleanedContent = cleanedContent.replace(match[0], '')
  }
  
  cleanedContent = cleanedContent
    .replace(/\n?---+\n?引用资料：\n?/g, '')
    .replace(/\n?---+\n?$/g, '')
    .trim()
  
  let displayHtml = cleanedContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  const mentions = [...content.matchAll(mentionRegex)]
  for (const m of mentions) {
    const title = m[1]
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`@${escapedTitle}\s?`, 'g')
    displayHtml = displayHtml.replace(regex, 
      `<span class="mention-capsule-3d" data-title="${title}">📄 ${title}</span>`
    )
  }
  
  displayHtml = displayHtml.replace(/\n/g, '<br>')
  
  return { skill, displayHtml }
})

const renderedHtml = computed(() => {
  const content = props.message.content
  if (!content) return ''
  try {
    if (props.message.role === 'assistant') {
      return DOMPurify.sanitize(marked.parse(content) as string)
    }
    return content
  } catch (e) {
    return content
  }
})

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (err) {
    console.error('Copy failed:', err)
  }
}
</script>

<style scoped>
.message-wrapper-3d {
  margin-bottom: 24px;
  animation: message-fade-in 0.4s ease-out;
}

@keyframes message-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ========== 用户消息 ========== */
.user-message-3d {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.user-message-3d .message-content-3d {
  max-width: 70%;
  padding: 16px 20px;
  background: rgba(107, 231, 142, 0.15);
  backdrop-filter: blur(24px);
  color: #1e293b;
  border-radius: 20px;
  border: 1px solid rgba(107, 231, 142, 0.4);
}

.message-text {
  font-size: 15px;
  line-height: 1.7;
}

.skill-capsule-3d {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

/* ========== AI 消息 ========== */
.ai-message-3d {
  display: flex;
  gap: 12px;
}

.message-body {
  flex: 1;
  max-width: calc(100% - 60px);
}

/* ========== 思考时间线（官方文档风格） ========== */
.thinking-timeline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.timeline-card {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
  animation: card-fade-in 0.3s ease-out;
}

@keyframes card-fade-in {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.timeline-card.thinking {
  border-left: 4px solid #6BE78E;
}

.timeline-card.tool_call {
  border-left: 4px solid #f59e0b;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  user-select: none;
}

.timeline-card.thinking .card-header:hover {
  background: rgba(107, 231, 142, 0.08);
}

.timeline-card.tool_call .card-header:hover {
  background: rgba(251, 191, 36, 0.08);
}

.card-icon {
  font-size: 16px;
}

.card-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.timeline-card.thinking .card-title {
  color: #059669;
}

.timeline-card.tool_call .card-title {
  color: #b45309;
  font-family: 'JetBrains Mono', monospace;
}

.card-round {
  font-size: 12px;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.15);
  padding: 2px 8px;
  border-radius: 10px;
}

.card-status {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.card-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.card-status.running {
  background: #dbeafe;
  color: #1e40af;
}

.card-status.success {
  background: #d1fae5;
  color: #065f46;
}

.card-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.card-body {
  padding: 0 16px 16px;
  border-top: 1px solid rgba(226, 232, 240, 0.5);
}

.thinking-content {
  font-size: 14px;
  line-height: 1.8;
  color: #374151;
  font-style: italic;
  white-space: pre-wrap;
  padding-top: 12px;
}

.tool-section {
  margin-top: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  margin-bottom: 6px;
  display: block;
}

.section-code {
  display: block;
  background: rgba(0, 0, 0, 0.04);
  padding: 10px 12px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
}

.section-pre {
  background: rgba(0, 0, 0, 0.04);
  padding: 12px;
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
  max-height: 200px;
  overflow-y: auto;
}

.tool-running {
  display: flex;
  gap: 6px;
  padding: 12px 0;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: #f59e0b;
  border-radius: 50%;
  animation: loading-bounce 1.4s ease-in-out infinite;
}

.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes loading-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ========== 中间文本 ========== */
.timeline-card.text {
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.intermediate-text {
  font-size: 15px;
  line-height: 1.8;
  color: #1e293b;
  padding: 4px 0;
  font-weight: 600;
}

.intermediate-text :deep(p) {
  margin: 0 0 8px;
}

.intermediate-text :deep(p:last-child) {
  margin-bottom: 0;
}

.intermediate-text :deep(strong) {
  color: #0f172a;
}

/* ========== 工具调用卡片增强 ========== */
.tool-call-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tool-call-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.tool-call-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: 12px;
}

.tool-call-name {
  font-size: 13px;
  font-weight: 700;
  color: #b45309;
  font-family: 'JetBrains Mono', monospace;
  white-space: nowrap;
}

.tool-call-args {
  font-size: 12px;
  color: #94a3b8;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 300px;
  border-left: 2px solid rgba(148, 163, 184, 0.3);
  padding-left: 8px;
}

.tool-call-time {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  font-family: 'JetBrains Mono', monospace;
}

/* ========== 最终回复 ========== */
.final-response {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(107, 231, 142, 0.3);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.response-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(107, 231, 142, 0.1);
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

.response-icon {
  font-size: 16px;
}

.response-body {
  padding: 20px 24px;
  font-size: 15px;
  line-height: 1.8;
  color: #1e293b;
}

.response-body :deep(p) {
  margin: 0 0 12px;
}

.response-body :deep(p:last-child) {
  margin-bottom: 0;
}

.response-body :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
}

/* ========== 传统样式兼容 ========== */
.reasoning-box-3d {
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  overflow: hidden;
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
  color: #64748b;
}

.reasoning-content {
  padding: 0 16px 16px;
  font-size: 13px;
  color: #64748b;
  font-style: italic;
  white-space: pre-wrap;
}

.tool-panel {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.tool-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  font-weight: 600;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
  transition: background 0.2s ease;
}

.tool-panel-header:hover {
  background: rgba(0, 0, 0, 0.02);
}

.tool-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
}

.tool-icon {
  font-size: 16px;
}

.tool-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: rgba(245, 158, 11, 0.15);
  color: #b45309;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 700;
}

.tool-panel-content {
  padding: 8px 12px 12px;
}

.tool-item {
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  margin-bottom: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.5);
  transition: box-shadow 0.2s ease;
}

.tool-item:last-child {
  margin-bottom: 0;
}

.tool-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.tool-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.2s ease;
  user-select: none;
}

.tool-item-header:hover {
  background: rgba(245, 158, 11, 0.06);
}

.tool-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.tool-item-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.tool-round-num {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  background: rgba(148, 163, 184, 0.12);
  padding: 2px 6px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
}

.tool-item-name {
  font-size: 13px;
  font-weight: 600;
  color: #b45309;
  font-family: 'JetBrains Mono', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-item-status {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 700;
}

.tool-item-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.tool-item-status.running {
  background: #dbeafe;
  color: #1e40af;
}

.tool-item-status.success {
  background: #d1fae5;
  color: #065f46;
}

.tool-item-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.tool-item-time {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.tool-item-detail {
  border-top: 1px solid rgba(226, 232, 240, 0.5);
  padding: 12px 14px;
  background: rgba(248, 250, 252, 0.8);
}

.tool-detail-section {
  margin-bottom: 10px;
}

.tool-detail-section:last-child {
  margin-bottom: 0;
}

.tool-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  user-select: none;
}

.tool-detail-header:hover {
  color: #475569;
}

.tool-detail-content {
  margin-top: 6px;
}

.tool-code-light {
  display: block;
  background: rgba(0, 0, 0, 0.04);
  padding: 10px 12px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 200px;
  overflow-y: auto;
  color: #374151;
}

.message-actions-3d {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn-3d {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

/* 响应式 */
@media (max-width: 640px) {
  .message-body {
    max-width: calc(100% - 50px);
  }
  
  .card-header {
    padding: 10px 12px;
  }
  
  .card-title {
    font-size: 13px;
  }
  
  .response-body {
    padding: 16px;
  }
}
</style>
