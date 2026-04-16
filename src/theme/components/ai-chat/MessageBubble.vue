<!--
  MessageBubble - 消息气泡组件（Star River 风格）
  紧凑单行 timeline indicator + 玻璃拟态卡片
-->
<template>
  <div class="message-wrapper" :class="[message.role, { last: isLast }]">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message">
      <div class="user-bubble">
        <div v-if="parsedMessage.skill" class="skill-capsule">
          <span class="skill-icon">{{ parsedMessage.skill.icon }}</span>
          <span class="skill-name">{{ parsedMessage.skill.name }}</span>
        </div>
        <div class="message-text" v-html="parsedMessage.displayHtml"></div>
      </div>
      <Avatar type="user" />
    </div>

    <!-- AI 消息 -->
    <div v-else class="ai-message">
      <AIAvatar :typing="isStreaming" />
      <div class="ai-body">
        <!-- 思考时间线 -->
        <template v-if="hasTimelineItems">
          <div class="thinking-timeline">
            <div
              v-for="item in timelineItems"
              :key="item.id"
              class="timeline-item"
            >
              <!-- 思考过程 -->
              <div
                v-if="item.type === 'thinking'"
                class="thinking-compact"
                :class="{ expanded: expandedItems[item.id] }"
              >
                <div class="thinking-header" @click="toggleItem(item.id)">
                  <span class="dot-thinking"></span>
                  <span class="thinking-label">思考过程</span>
                  <span class="spacer"></span>
                  <Icon
                    :name="expandedItems[item.id] ? 'chevron-up' : 'chevron-down'"
                    :size="12"
                  />
                </div>
                <div v-if="expandedItems[item.id]" class="thinking-body">
                  <div class="thinking-scroll">{{ item.content }}</div>
                </div>
              </div>

              <!-- 中间说明 -->
              <div
                v-else-if="item.type === 'text'"
                class="intermediate-text"
                v-html="renderMarkdown(item.content || '')"
              ></div>

              <!-- 工具调用 -->
              <div
                v-else-if="item.type === 'tool_call' && item.toolRecord"
                class="tool-indicator"
                :class="[item.toolRecord.status]"
              >
                <div class="tool-row" @click="toggleItem(item.id)">
                  <span class="tool-icon">{{ toolIcon(item.toolRecord.name) }}</span>
                  <span class="tool-name">{{ item.toolRecord.name }}</span>
                  <span
                    v-if="getToolArgsSummary(item.toolRecord.arguments)"
                    class="tool-args"
                  >
                    {{ getToolArgsSummary(item.toolRecord.arguments) }}
                  </span>
                  <span class="spacer"></span>
                  <span
                    v-if="item.toolRecord.duration"
                    class="tool-time"
                  >
                    {{ item.toolRecord.duration }}ms
                  </span>
                  <span class="tool-status">{{ statusText(item.toolRecord.status) }}</span>
                  <Icon
                    :name="expandedItems[item.id] ? 'chevron-up' : 'chevron-down'"
                    :size="12"
                  />
                </div>
                <div v-if="expandedItems[item.id]" class="tool-detail">
                  <div class="detail-section">
                    <div class="detail-label">参数</div>
                    <pre class="detail-code">{{ JSON.stringify(item.toolRecord.arguments, null, 2) }}</pre>
                  </div>
                  <div
                    v-if="item.toolRecord.status !== 'pending' && item.toolRecord.status !== 'running'"
                    class="detail-section"
                  >
                    <div class="detail-label">结果</div>
                    <pre class="detail-pre">{{ formatToolResult(item.toolRecord.result, item.id) }}</pre>
                    <button
                      v-if="shouldTruncateResult(item.toolRecord.result)"
                      class="expand-btn"
                      @click.stop="toggleResultExpand(item.id)"
                    >
                      {{ isResultExpanded(item.id) ? '收起' : '展开全部' }}
                    </button>
                  </div>
                  <div v-else class="tool-running">
                    <span class="pulse-dot"></span>
                    <span class="pulse-dot"></span>
                    <span class="pulse-dot"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 传统思考框（兼容旧数据） -->
        <div v-else-if="displayReasoning" class="legacy-reasoning">
          <div class="legacy-header" @click="isExpanded = !isExpanded">
            <span class="dot-thinking"></span>
            <span>思考过程</span>
            <span class="spacer"></span>
            <Icon :name="isExpanded ? 'chevron-up' : 'chevron-down'" :size="12" />
          </div>
          <div v-show="isExpanded" class="legacy-content">
            {{ displayReasoning }}
          </div>
        </div>

        <!-- 最终回复 -->
        <div
          v-if="message.content && shouldUseTypewriter"
          class="final-response"
        >
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

        <div v-else-if="message.content" class="final-response">
          <div class="response-body" v-html="renderedHtml"></div>
        </div>

        <!-- 思考中占位 -->
        <div v-else-if="isStreaming" class="typing-placeholder">
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
          <span class="typing-dot"></span>
        </div>

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
        <div class="message-actions">
          <button class="action-btn" :class="{ copied }" @click="copyContent">
            <Icon :name="copied ? 'check' : 'copy'" :size="14" />
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
          <button
            v-if="isLast && !versions"
            class="action-btn regenerate"
            @click="$emit('regenerate')"
          >
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
import { Avatar, AIAvatar, Icon, TypewriterText } from '@/theme/components/common'
import MessageVersions from './MessageVersions.vue'
import type { ChatMessage, ChatMessage as ChatMessageType, ThinkingStep } from '@/theme/types'

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

// ========== 状态管理 ==========
const isExpanded = ref(true)
const copied = ref(false)
const expandedItems = ref<Record<string, boolean>>({})
const resultExpandedMap = ref<Record<string, boolean>>({})

const RESULT_TRUNCATE_LENGTH = 1200

function isResultExpanded(itemId: string): boolean {
  return resultExpandedMap.value[itemId] || false
}

function toggleResultExpand(itemId: string) {
  resultExpandedMap.value[itemId] = !isResultExpanded(itemId)
}

function shouldTruncateResult(result: any): boolean {
  const str = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  return str.length > RESULT_TRUNCATE_LENGTH
}

function formatToolResult(result: any, itemId: string): string {
  const str = typeof result === 'string' ? result : JSON.stringify(result, null, 2)
  if (str.length <= RESULT_TRUNCATE_LENGTH || isResultExpanded(itemId)) {
    return str
  }
  return str.slice(0, RESULT_TRUNCATE_LENGTH) + '\n\n... [内容已截断，点击展开查看全部]'
}

const typewriterRef = ref<InstanceType<typeof TypewriterText> | null>(null)

// ========== 计算属性 ==========
const allThinkingSteps = computed((): ThinkingStep[] => {
  return props.message.metadata?.thinkingSteps || []
})

const toolRecords = computed(() => props.message.metadata?.toolRecords || [])

const timelineItems = computed((): ThinkingStep[] => {
  if (allThinkingSteps.value.length > 0) {
    return allThinkingSteps.value
  }
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

const hasTimelineItems = computed(() => timelineItems.value.length > 0)

// 初始化折叠状态：thinking 默认展开，tool_call 默认折叠
watch(
  timelineItems,
  (items) => {
    if (!items.length) return
    const next: Record<string, boolean> = { ...expandedItems.value }
    let changed = false
    items.forEach((item) => {
      if (next[item.id] === undefined) {
        next[item.id] = item.type !== 'tool_call'
        changed = true
      }
    })
    if (changed) {
      expandedItems.value = next
    }
  },
  { immediate: true }
)

const displayReasoning = computed(() => props.message.reasoning?.content || '')

// ========== 打字机效果控制 ==========
const TYPEWRISTER_KEY = 'ai_chat_shown_message_ids'

function getShownMessageIds(): Set<string> {
  if (typeof sessionStorage === 'undefined') return new Set()
  try {
    const stored = sessionStorage.getItem(TYPEWRISTER_KEY)
    if (stored) return new Set(JSON.parse(stored))
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

const initialMessageIds = ref<Set<string>>(new Set())

const shouldUseTypewriter = computed(() => {
  if (props.message.role !== 'assistant') return false
  if (props.isStreaming) return false
  if (props.message.status !== 'completed') return false
  if (initialMessageIds.value.has(props.message.id)) return false
  if (getShownMessageIds().has(props.message.id)) return false
  return true
})

onMounted(() => {
  initialMessageIds.value.add(props.message.id)
  if (props.message.role === 'assistant' && props.message.content) {
    setTimeout(() => saveShownMessageId(props.message.id), 100)
  }
})

watch(
  () => props.message.status,
  (newStatus, oldStatus) => {
    if (newStatus === 'completed' && oldStatus === 'streaming') {
      setTimeout(() => saveShownMessageId(props.message.id), 500)
    }
  }
)

function onTypewriterComplete() {
  saveShownMessageId(props.message.id)
}

// ========== 辅助函数 ==========
function statusText(status: string): string {
  const map: Record<string, string> = {
    pending: '等待中',
    running: '执行中',
    success: '成功',
    error: '失败'
  }
  return map[status] || status
}

function toolIcon(name?: string): string {
  const n = (name || '').toLowerCase()
  if (n.includes('search')) return '🔍'
  if (n.includes('fetch') || n.includes('proxy')) return '🌐'
  if (n.includes('read') || n.includes('get')) return '📄'
  if (n.includes('write') || n.includes('edit')) return '✏️'
  if (n.includes('create') || n.includes('article')) return '📝'
  if (n.includes('arxiv')) return '📚'
  if (n.includes('scholar')) return '🎓'
  return '🔧'
}

const markdownCache = new Map<string, string>()
function renderMarkdown(content: string): string {
  if (!content) return ''
  const cached = markdownCache.get(content)
  if (cached !== undefined) return cached
  try {
    const raw = marked.parse(content, { async: false }) as string
    const html = DOMPurify.sanitize(raw)
    markdownCache.set(content, html)
    return html
  } catch {
    return content
  }
}

function getToolArgsSummary(args: Record<string, any>): string {
  if (!args || typeof args !== 'object') return ''
  const priorityKeys = ['query', 'keyword', 'q', 'url', 'path', 'text', 'content', 'message']
  for (const key of priorityKeys) {
    if (args[key] && typeof args[key] === 'string') {
      const val = args[key] as string
      return val.length > 60 ? val.slice(0, 60) + '...' : val
    }
  }
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

// ========== 消息解析 ==========
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
    displayHtml = displayHtml.replace(
      regex,
      `<span class="mention-capsule" data-title="${title}">📄 ${title}</span>`
    )
  }

  displayHtml = displayHtml.replace(/\n/g, '<br>')
  return { skill, displayHtml }
})

const renderedHtml = ref('')
let parseTimer: ReturnType<typeof setTimeout> | null = null

function doParseHtml() {
  const content = props.message.content
  if (!content) {
    renderedHtml.value = ''
    return
  }
  try {
    if (props.message.role === 'assistant') {
      renderedHtml.value = DOMPurify.sanitize(marked.parse(content) as string)
    } else {
      renderedHtml.value = content
    }
  } catch {
    renderedHtml.value = content
  }
}

watch(
  () => [props.message.content, props.isStreaming] as const,
  ([, isStreaming]) => {
    if (!isStreaming) {
      if (parseTimer) {
        clearTimeout(parseTimer)
        parseTimer = null
      }
      doParseHtml()
      return
    }
    // 流式时 throttle，避免每帧都 parse 导致 O(n²) 卡顿
    if (parseTimer) return
    parseTimer = setTimeout(() => {
      parseTimer = null
      doParseHtml()
    }, 120)
  },
  { immediate: true, flush: 'post' }
)

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch (err) {
    console.error('Copy failed:', err)
  }
}
</script>

<style scoped>
/* ========== 基础 ========== */
.message-wrapper {
  margin-bottom: 24px;
  animation: msg-fade-in 0.35s ease-out;
}

@keyframes msg-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

.spacer {
  flex: 1;
}

/* ========== 用户消息 ========== */
.user-message {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.user-bubble {
  max-width: 70%;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(200, 195, 188, 0.5);
  border-radius: 20px;
  color: var(--sr-text-primary, #2d2a26);
  box-shadow:
    0 4px 20px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.message-text {
  font-size: 15px;
  line-height: 1.7;
}

.skill-capsule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  margin-bottom: 8px;
  background: rgba(248, 246, 243, 0.8);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sr-text-secondary, #6a6560);
}

/* ========== AI 消息 ========== */
.ai-message {
  display: flex;
  gap: 12px;
}

.ai-body {
  flex: 1;
  max-width: calc(100% - 60px);
}

/* ========== Timeline ========== */
.thinking-timeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

/* 思考过程 */
.thinking-compact {
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 12px;
  overflow: hidden;
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.thinking-compact:hover {
  background: rgba(255, 255, 255, 0.75);
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-secondary, #6a6560);
}

.dot-thinking {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sr-morandi-purple, #b3a8b8);
}

.thinking-label {
  color: var(--sr-text-secondary, #6a6560);
}

.thinking-body {
  padding: 0 14px 12px;
}

.thinking-scroll {
  font-size: 14px;
  line-height: 1.8;
  color: var(--sr-text-secondary, #6a6560);
  font-style: italic;
  white-space: pre-wrap;
  max-height: 260px;
  overflow-y: auto;
}

/* 中间说明 */
.intermediate-text {
  font-size: 14px;
  line-height: 1.75;
  color: var(--sr-text-secondary, #6a6560);
  padding: 4px 2px;
  border-left: 2px solid rgba(154, 168, 179, 0.35);
  padding-left: 12px;
  margin: 2px 0;
}

.intermediate-text :deep(p) {
  margin: 0 0 8px;
}
.intermediate-text :deep(p:last-child) {
  margin-bottom: 0;
}
.intermediate-text :deep(strong) {
  color: var(--sr-text-primary, #2d2a26);
}

/* 工具指示器 */
.tool-indicator {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 10px;
  overflow: hidden;
  transition: background 0.2s ease;
}

.tool-indicator:hover {
  background: rgba(255, 255, 255, 0.8);
}

.tool-indicator.pending { border-left: 3px solid #d4c4b0; }
.tool-indicator.running { border-left: 3px solid #9aa8b3; }
.tool-indicator.success { border-left: 3px solid #a8b3a8; }
.tool-indicator.error   { border-left: 3px solid #c9a8a8; }

.tool-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}

.tool-icon {
  font-size: 14px;
  opacity: 0.9;
}

.tool-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-text-primary, #2d2a26);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  white-space: nowrap;
}

.tool-args {
  font-size: 12px;
  color: var(--sr-text-muted, #9a9588);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 260px;
}

.tool-time {
  font-size: 11px;
  color: var(--sr-text-muted, #9a9588);
  white-space: nowrap;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
}

.tool-status {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.tool-indicator.pending .tool-status {
  color: #a89088;
  background: rgba(212, 196, 176, 0.2);
}
.tool-indicator.running .tool-status {
  color: #788898;
  background: rgba(154, 168, 179, 0.2);
}
.tool-indicator.success .tool-status {
  color: #889888;
  background: rgba(168, 179, 168, 0.2);
}
.tool-indicator.error .tool-status {
  color: #a88080;
  background: rgba(201, 168, 168, 0.2);
}

/* 工具详情 */
.tool-detail {
  padding: 0 14px 12px;
  border-top: 1px solid rgba(200, 195, 188, 0.25);
  background: rgba(255, 255, 255, 0.4);
}

.detail-section {
  margin-top: 12px;
}

.detail-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--sr-text-muted, #9a9588);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.detail-code,
.detail-pre {
  display: block;
  background: rgba(0, 0, 0, 0.035);
  padding: 10px 12px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
  color: var(--sr-text-secondary, #6a6560);
  max-height: 180px;
  overflow-y: auto;
}

.expand-btn {
  margin-top: 8px;
  padding: 4px 10px;
  background: rgba(179, 168, 184, 0.12);
  border: 1px solid rgba(179, 168, 184, 0.35);
  border-radius: 6px;
  font-size: 12px;
  color: var(--sr-text-secondary, #6a6560);
  cursor: pointer;
  transition: all 0.2s ease;
}

.expand-btn:hover {
  background: rgba(179, 168, 184, 0.22);
}

.tool-running {
  display: flex;
  gap: 6px;
  padding: 14px 0;
}

.pulse-dot {
  width: 7px;
  height: 7px;
  background: var(--sr-morandi-warm, #d4c4b0);
  border-radius: 50%;
  animation: pulse-bounce 1.2s ease-in-out infinite;
}
.pulse-dot:nth-child(2) { animation-delay: 0.2s; }
.pulse-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes pulse-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ========== 最终回复 ========== */
.final-response {
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.04),
    0 1px 2px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.response-body {
  padding: 20px 24px;
  font-size: 15px;
  line-height: 1.8;
  color: var(--sr-text-primary, #2d2a26);
}

.response-body :deep(p) {
  margin: 0 0 12px;
}
.response-body :deep(p:last-child) {
  margin-bottom: 0;
}
.response-body :deep(pre) {
  background: rgba(0, 0, 0, 0.04);
  padding: 14px 16px;
  border-radius: 10px;
  overflow-x: auto;
}
.response-body :deep(code) {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 13px;
}
.response-body :deep(ul),
.response-body :deep(ol) {
  margin: 8px 0;
  padding-left: 22px;
}
.response-body :deep(li) {
  margin: 4px 0;
}
.response-body :deep(a) {
  color: var(--sr-morandi-blue, #9aa8b3);
  text-decoration: underline;
}

/* ========== 传统兼容 ========== */
.legacy-reasoning {
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 12px;
  overflow: hidden;
}

.legacy-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-secondary, #6a6560);
}

.legacy-content {
  padding: 0 14px 12px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--sr-text-secondary, #6a6560);
  font-style: italic;
  white-space: pre-wrap;
  max-height: 260px;
  overflow-y: auto;
}

/* ========== 思考中占位 ========== */
.typing-placeholder {
  display: flex;
  gap: 5px;
  padding: 18px 24px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 20px;
  width: fit-content;
}

.typing-dot {
  width: 7px;
  height: 7px;
  background: var(--sr-morandi-warm, #d4c4b0);
  border-radius: 50%;
  animation: typing-bounce 1.4s ease-in-out infinite;
}
.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* ========== 操作按钮 ========== */
.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 8px;
  font-size: 12px;
  color: var(--sr-text-secondary, #6a6560);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(200, 195, 188, 0.6);
}

.action-btn.copied {
  color: #889888;
  border-color: rgba(168, 179, 168, 0.5);
  background: rgba(168, 179, 168, 0.12);
}

/* mention capsule */
:deep(.mention-capsule) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(179, 168, 184, 0.15);
  border: 1px solid rgba(179, 168, 184, 0.35);
  border-radius: 999px;
  font-size: 13px;
  color: var(--sr-text-secondary, #6a6560);
  vertical-align: middle;
}

/* ========== 响应式 ========== */
@media (max-width: 640px) {
  .ai-body {
    max-width: calc(100% - 50px);
  }
  .user-bubble {
    max-width: 82%;
    padding: 12px 16px;
  }
  .response-body {
    padding: 16px;
  }
  .tool-args {
    max-width: 120px;
  }
}
</style>
