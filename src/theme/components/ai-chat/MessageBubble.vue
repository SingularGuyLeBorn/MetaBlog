<!--
  MessageBubble - 消息气泡组件(Star River 风格)
  紧凑单行 timeline indicator + 玻璃拟态卡片
-->
<template>
  <div :id="'msg-' + message.id" class="message-wrapper" :class="[message.role, { last: isLast }]">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message">
      <div class="user-bubble-wrapper">
        <div class="user-bubble">
          <div v-if="parsedMessage.skill" class="skill-capsule">
            <span class="skill-icon">{{ parsedMessage.skill.icon }}</span>
            <span class="skill-name">{{ parsedMessage.skill.name }}</span>
          </div>
          <div class="message-text" v-html="parsedMessage.displayHtml"></div>
          <div v-if="!isStreaming" class="message-token-count">{{ formatTokenCount(tokenCount) }} tokens</div>
        </div>
        <!-- 附件缩略图 -->
        <div v-if="message.attachments && message.attachments.length > 0" class="user-attachments">
          <div
            v-for="att in message.attachments"
            :key="att.id || att.url"
            class="user-attachment-thumb"
            :class="att.type"
          >
            <img v-if="att.type === 'image'" :src="att.url" :alt="att.name" />
            <video v-else-if="att.type === 'video'" :src="att.url" />
            <div v-else class="file-thumb">
              <Icon name="file" :size="20" />
              <span class="file-thumb-name">{{ att.name }}</span>
            </div>
          </div>
        </div>
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
                  <!-- 工具执行成功后的实体链接卡片(无需展开直接可见) -->
                  <template v-if="item.toolRecord.status === 'success'">
                    <EntityLinkCard
                      v-for="link in getToolLinks(item.toolRecord).slice(0, 1)"
                      :key="link.url"
                      :link="link"
                      class="timeline-link-card"
                      @click.stop
                    />
                  </template>
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

        <!-- 传统思考框(兼容旧数据) -->
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

        <!-- 实体链接卡片(工具执行产生的可点击链接) -->
        <div v-if="entityLinks.length > 0" class="entity-links-section">
          <div class="entity-links-label">生成的链接</div>
          <div class="entity-links-list">
            <EntityLinkCard
              v-for="link in entityLinks"
              :key="link.url"
              :link="link"
            />
          </div>
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
          <span v-if="!isStreaming" class="token-badge">{{ formatTokenCount(tokenCount) }} tokens</span>
          <button
            v-if="message.role === 'assistant' && !isStreaming"
            class="action-btn"
            :class="{ speaking: isSpeaking }"
            @click="handleSpeak"
          >
            <Icon :name="isSpeaking ? 'square' : 'volume-2'" :size="14" />
            <span>{{ isSpeaking ? '停止' : '朗读' }}</span>
          </button>
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
import { AIAvatar, Avatar, Icon, TypewriterText } from '@/theme/components/common'
import type { ChatMessage, ChatMessage as ChatMessageType, ThinkingStep } from '@/theme/types'
import { extractAllEntityLinks, extractLinksFromRecord, type EntityLink } from '@/theme/utils/extractEntityLinks'
import { estimateTextTokens, formatTokenCount } from '@/theme/utils/tokenEstimator'
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import markedKatex from 'marked-katex-extension'
import { useVoice } from '@/theme/composables/useVoice'
import { computed, onMounted, ref, watch } from 'vue'
import 'katex/dist/katex.min.css'

// 启用 GFM(表格、任务列表、删除线等)
marked.use({ gfm: true })

// 启用 LaTeX 公式渲染
marked.use(markedKatex({ throwOnError: false, nonStandard: true }))

// 图片 URL 代理(绕过微信/知乎防盗链)
const proxyImageRenderer = new marked.Renderer()
proxyImageRenderer.image = ({ href, title, text }: any) => {
  const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(href)}`
  return `<img src="${proxyUrl}" alt="${text || ''}" title="${title || ''}" loading="lazy" />`
}
marked.use({ renderer: proxyImageRenderer })
import EntityLinkCard from './EntityLinkCard.vue'
import MessageVersions from './MessageVersions.vue'

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

// TTS
const { speak, stopSpeaking, status: voiceStatus } = useVoice()
const isSpeaking = computed(() => voiceStatus.value === 'speaking')

async function handleSpeak() {
  if (isSpeaking.value) {
    stopSpeaking()
    return
  }
  const text = props.message.content
  if (!text.trim()) return
  await speak(text)
}

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
  return str.slice(0, RESULT_TRUNCATE_LENGTH) + '\n\n... [内容已截断,点击展开查看全部]'
}

// 从单个工具记录中提取链接(用于 timeline 中每个 tool_call 项)
function getToolLinks(toolRecord: any): EntityLink[] {
  const links = extractLinksFromRecord(toolRecord)
  if (links.length > 0) {
    // 提取链接(调试用日志已移除)
  }
  return links
}

const typewriterRef = ref<InstanceType<typeof TypewriterText> | null>(null)

// Token 计数
const tokenCount = computed(() => {
  const content = props.message.content || ''
  const reasoning = (props.message as any).reasoning_content || ''
  return estimateTextTokens(content) + estimateTextTokens(reasoning)
})

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

// 从工具记录中提取实体链接(飞书/GitHub/语雀等)
const entityLinks = computed((): EntityLink[] => {
  if (!props.message.metadata?.toolRecords?.length) return []
  return extractAllEntityLinks(props.message.metadata.toolRecords)
})

// 初始化折叠状态：thinking 默认展开,tool_call 默认折叠
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

/**
 * 预处理 Markdown,修复表格行中公式包含 | 管道符的问题
 *
 * Markdown 表格使用 | 作为列分隔符,公式如 $Q(y|x)$ 中的 | 会被错误分割. 
 * 本函数检测表格区域,将表格行公式中的 | 替换为 \vert(LaTeX 等价符号),
 * 确保 marked 的 GFM 表格解析器正确处理. 
 *
 * @param markdown - 原始 Markdown 文本
 * @returns 预处理后的 Markdown 文本
 */
function preprocessMarkdownForTables(markdown: string): string {
  const lines = markdown.split('\n')
  const result: string[] = []
  let inTable = false

  // 判断是否是表格行(以 | 开头或结尾)
  const isTableLine = (line: string): boolean => /^\s*\|/.test(line) || /\|\s*$/.test(line)
  // 判断是否是表格分隔行 |---|---|
  const isTableDivider = (line: string): boolean => /^\s*\|?[-:\|\s]+\|?\s*$/.test(line)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 检测表格开始：当前行是表格行,且下一行是分隔行
    if (!inTable && isTableLine(line) && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
      inTable = true
    }

    if (inTable) {
      if (!isTableLine(line) && !isTableDivider(line)) {
        inTable = false
        result.push(line)
      } else {
        // 保护表格行公式中的 |：将 $...$ 内的 | 替换为 \vert
        result.push(
          line.replace(/\$[^$\n]*\$/g, (match) => match.replace(/\|/g, '\\vert'))
        )
      }
    } else {
      result.push(line)
    }
  }

  return result.join('\n')
}

const markdownCache = new Map<string, string>()
function renderMarkdown(content: string): string {
  if (!content) return ''
  const processed = preprocessMarkdownForTables(content)
  const cached = markdownCache.get(processed)
  if (cached !== undefined) return cached
  try {
    const raw = marked.parse(processed, { async: false }) as string
    const html = DOMPurify.sanitize(raw)
    markdownCache.set(processed, html)
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
      const processed = preprocessMarkdownForTables(content)
      renderedHtml.value = DOMPurify.sanitize(marked.parse(processed) as string)
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
    // 流式时 throttle,避免每帧都 parse 导致 O(n²) 卡顿
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

.user-bubble-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  max-width: 70%;
}

.user-bubble {
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

/* 用户消息附件缩略图 */
.user-attachments {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.user-attachment-thumb {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  overflow: hidden;
  background: #f1f5f9;
  border: 1px solid rgba(226, 232, 240, 0.8);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.user-attachment-thumb:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.user-attachment-thumb img,
.user-attachment-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-attachment-thumb .file-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 8px;
  color: #64748b;
}

.user-attachment-thumb .file-thumb-name {
  font-size: 10px;
  margin-top: 4px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70px;
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

/* 图片代理渲染 */
.response-body :deep(img) {
  max-width: 100%;
  border-radius: 10px;
  margin: 8px 0;
  display: block;
}

/* LaTeX 公式样式 */
.response-body :deep(.katex) {
  font-size: 1.05em;
}
.response-body :deep(.katex-display) {
  margin: 12px 0;
  overflow-x: auto;
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

/* ========== Token 计数 ========== */
.token-badge {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  font-size: 11px;
  color: var(--sr-text-muted, #9a9588);
  font-family: monospace;
  user-select: none;
}

.message-token-count {
  text-align: right;
  font-size: 11px;
  color: var(--sr-text-muted, #9a9588);
  font-family: monospace;
  margin-top: 4px;
  padding-right: 4px;
  user-select: none;
}

/* ========== 操作按钮 ========== */
.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  align-items: center;
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

.action-btn.speaking {
  color: #d97706;
  border-color: rgba(217, 119, 6, 0.4);
  background: rgba(217, 119, 6, 0.1);
  animation: pulse-speak 1.5s ease-in-out infinite;
}

@keyframes pulse-speak {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
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

/* ========== 实体链接卡片区域 ========== */
.entity-links-section {
  margin-top: 12px;
  margin-bottom: 4px;
}

.entity-links-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  margin-bottom: 8px;
  letter-spacing: 0.5px;
}

.entity-links-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* timeline 头部的紧凑链接卡片 */
.timeline-link-card {
  max-width: 280px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
}
.timeline-link-card .entity-icon {
  font-size: 16px;
}
.timeline-link-card .entity-title {
  font-size: 12px;
}
.timeline-link-card .entity-url {
  font-size: 10px;
}
.timeline-link-card .entity-arrow {
  font-size: 12px;
}

/* ========== Markdown 表格 ========== */
.message-text :deep(table),
.response-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 14px;
}
.message-text :deep(thead),
.response-body :deep(thead) {
  background-color: rgba(0, 0, 0, 0.04);
}
.message-text :deep(th),
.response-body :deep(th) {
  padding: 8px 12px;
  text-align: left;
  font-weight: 600;
  border: 1px solid rgba(0, 0, 0, 0.1);
  color: #333;
}
.message-text :deep(td),
.response-body :deep(td) {
  padding: 8px 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  vertical-align: top;
}
.message-text :deep(tr:nth-child(even)),
.response-body :deep(tr:nth-child(even)) {
  background-color: rgba(0, 0, 0, 0.015);
}
.message-text :deep(tr:hover),
.response-body :deep(tr:hover) {
  background-color: rgba(0, 0, 0, 0.04);
}

/* ========== 响应式 ========== */
@media (max-width: 640px) {
  .ai-body {
    max-width: calc(100% - 50px);
  }
  .user-bubble-wrapper {
    max-width: 82%;
  }
  .user-bubble {
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
