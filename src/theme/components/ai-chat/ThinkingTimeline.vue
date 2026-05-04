<!--
  ThinkingTimeline - 思考时间线组件
  从 MessageBubble 拆分,负责展示推理过程、中间文本和工具调用.
-->
<template>
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
        v-html="renderHtml ? renderHtml(item.content || '') : item.content"
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
          <!-- 工具执行成功后的实体链接卡片 -->
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
          <button
            v-if="item.toolRecord.status === 'success' || item.toolRecord.status === 'error'"
            class="tool-view-btn icon-only"
            title="查看详情"
            @click.stop="viewToolDetail(item.toolRecord)"
          >
            <Icon name="external-link" :size="12" />
          </button>
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

  <!-- 传统思考框(兼容旧数据) -->
  <div v-if="!hasTimelineItems && displayReasoning" class="legacy-reasoning">
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
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import { useToolStore } from '@/theme/stores'
import type { ChatMessage, ThinkingStep, ToolChainItem } from '@/theme/types'
import { extractLinksFromRecord, type EntityLink } from '@/theme/utils/extractEntityLinks'
import { computed, ref, watch } from 'vue'
import EntityLinkCard from './EntityLinkCard.vue'

interface ThinkingTimelineProps {
  message: ChatMessage
  isStreaming: boolean
  /** 可选的 HTML 渲染函数(用于中间文本的 markdown 渲染) */
  renderHtml?: (content: string) => string
}

const props = defineProps<ThinkingTimelineProps>()

const emit = defineEmits<{
  (e: 'view-detail', toolId: string): void
}>()

const toolStore = useToolStore()

// ========== 状态管理 ==========
const isExpanded = ref(true)
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
  return str.slice(0, RESULT_TRUNCATE_LENGTH) + '\n\n... [内容已截断,点击展开查看全部]'
}

// 从单个工具记录中提取链接
function getToolLinks(toolRecord: any): EntityLink[] {
  return extractLinksFromRecord(toolRecord)
}

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

const displayReasoning = computed(() => props.message.reasoning?.content || '')

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

function getToolArgsSummary(args: Record<string, any>): string {
  if (!args || typeof args !== 'object') return ''
  // 优先显示人类可读的标题/名称类字段，而不是 ID 类字段
  const priorityKeys = ['title', 'name', 'document_id', 'query', 'keyword', 'q', 'url', 'path', 'text', 'content', 'message']
  for (const key of priorityKeys) {
    if (args[key] && typeof args[key] === 'string') {
      const val = args[key] as string
      return val.length > 60 ? val.slice(0, 60) + '...' : val
    }
  }
  // 如果 title/name/document_id 等都不存在，才回退到任意字符串值
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

function viewToolDetail(record: any) {
  const id = record.id || `tool_${Date.now()}`
  const fallback: ToolChainItem = {
    id,
    stepId: id,
    name: record.name || record.toolName || 'unknown',
    arguments: record.arguments || record.args || {},
    status: record.status,
    startTime: record.startTime || Date.now(),
    endTime: record.endTime,
    duration: record.duration,
    result: record.result,
    error: record.error,
    round: 1,
    index: 0
  }
  toolStore.inspectTool(id, fallback)
}
</script>

<style scoped>
.spacer {
  flex: 1;
}

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

.tool-view-btn {
  padding: 3px 10px;
  background: rgba(179, 168, 184, 0.15);
  border: 1px solid rgba(179, 168, 184, 0.4);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--sr-text-secondary, #6a6560);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tool-view-btn:hover {
  background: rgba(179, 168, 184, 0.3);
  border-color: rgba(179, 168, 184, 0.6);
}

.tool-view-btn.icon-only {
  padding: 4px;
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
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

/* 传统兼容 */
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

/* 响应式 */
@media (max-width: 640px) {
  .tool-args {
    max-width: 120px;
  }
}
</style>
