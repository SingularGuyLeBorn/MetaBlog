<!--
  MessageBubble - 消息气泡组件
  
  特性：
  1. 用户消息中的 @文章 显示为浅色胶囊
  2. 技能显示为彩色胶囊
  3. 实际发送给AI的包含完整内容
-->
<template>
  <div class="message-wrapper" :class="[message.role, { last: isLast }]">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message">
      <div class="message-content">
        <!-- 技能胶囊（如果有） -->
        <div v-if="parsedMessage.skill" class="skill-capsule">
          <span class="skill-icon">{{ parsedMessage.skill.icon }}</span>
          <span class="skill-name">{{ parsedMessage.skill.name }}</span>
        </div>
        <!-- 消息文本（带引用胶囊） -->
        <div class="message-text" v-html="parsedMessage.displayHtml"></div>
      </div>
      <Avatar type="user" />
    </div>

    <!-- AI 消息 -->
    <div v-else class="ai-message">
      <AIAvatar :typing="isStreaming" />
      <div class="message-body">
        <!-- 工具调用记录 -->
        <div v-if="toolRecords.length > 0" class="tool-records-box">
          <div class="tool-records-header" @click="showToolRecords = !showToolRecords">
            <span class="tool-icon">🔧</span>
            <span>工具调用 ({{ toolRecords.length }})</span>
            <Icon :name="showToolRecords ? 'chevron-down' : 'chevron-right'" :size="14" />
          </div>
          <div v-show="showToolRecords" class="tool-records-content">
            <div v-for="record in toolRecords" :key="record.id" class="tool-record-item">
              <div class="tool-record-header">
                <span class="tool-name">{{ record.name }}</span>
                <span :class="['tool-status', record.status]">{{ statusText(record.status) }}</span>
                <span v-if="record.duration" class="tool-duration">{{ record.duration }}ms</span>
              </div>
              <div class="tool-record-detail">
                <div class="tool-section">
                  <div class="tool-section-title">📥 参数:</div>
                  <pre class="tool-code">{{ JSON.stringify(record.arguments, null, 2) }}</pre>
                </div>
                <div class="tool-section">
                  <div class="tool-section-title">📤 结果:</div>
                  <pre class="tool-code">{{ record.result }}</pre>
                </div>
                <div v-if="record.error" class="tool-section">
                  <div class="tool-section-title">❌ 错误:</div>
                  <pre class="tool-code error">{{ record.error }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 思考过程 -->
        <div v-if="displayReasoning" class="reasoning-box">
          <div class="reasoning-header" @click="isExpanded = !isExpanded">
            <span class="reasoning-icon">💭</span>
            <span>思考过程</span>
            <Icon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
          </div>
          <div v-show="isExpanded" class="reasoning-content">
            {{ displayReasoning }}
          </div>
        </div>

        <!-- 消息内容 - 有内容时才显示气泡 -->
        <div v-if="message.content" class="message-bubble" v-html="renderedHtml"></div>
        <!-- 思考中占位 -->
        <div v-else-if="isStreaming" class="thinking-placeholder">
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
          <span class="thinking-dot"></span>
        </div>

        <!-- 版本切换器（AI 消息始终显示） -->
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
          <button class="action-btn" @click="copyContent">
            <Icon name="copy" :size="14" />
            <span>{{ copied ? '已复制' : '复制' }}</span>
          </button>
          <button v-if="isLast && !versions" class="action-btn" @click="$emit('regenerate')">
            <Icon name="refresh" :size="14" />
            <span>重新生成</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Avatar, AIAvatar, Icon } from '../../../ui'
import MessageVersions from './MessageVersions.vue'
import type { ChatMessage, ChatMessage as ChatMessageType } from '../../../core/types'

interface VersionInfo {
  versions: ChatMessageType[]
  currentIndex: number
  userMessageId: string
}

interface Props {
  message: ChatMessage
  isStreaming: boolean
  isLast: boolean
  versions?: VersionInfo | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  regenerate: []
  'switch-version': [payload: { userMessageId: string; versionIndex: number }]
}>()

const isExpanded = ref(true)
const copied = ref(false)
const showToolRecords = ref(true)

// ==================== 工具调用记录 ====================
const toolRecords = computed(() => {
  return props.message.metadata?.toolRecords || []
})

function statusText(status: string): string {
  const map: Record<string, string> = {
    'pending': '等待中',
    'running': '执行中',
    'success': '成功',
    'error': '失败'
  }
  return map[status] || status
}

// ==================== 消息解析 ====================

interface ParsedMessage {
  skill: { name: string; icon: string } | null
  textBefore: string
  mentions: Array<{ title: string; fullMatch: string }>
  textAfter: string
  displayHtml: string
}

const parsedMessage = computed((): ParsedMessage => {
  const content = props.message.content || ''
  
  // 解析技能信息（从 metadata 或内容中提取）
  let skill: { name: string; icon: string } | null = null
  if ((props.message.metadata as any)?.skill) {
    skill = (props.message.metadata as any).skill as { name: string; icon: string }
  }
  
  // 提取引用信息 <reference title="xxx" path="xxx">...</reference>
  const mentionRegex = /<reference\s+title="([^"]+)"\s+path="([^"]+)"[^>]*>[\s\S]*?<\/reference>/g
  const mentions: Array<{ title: string; fullMatch: string }> = []
  let match
  let cleanedContent = content
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      title: match[1],
      fullMatch: match[0]
    })
    // 从显示内容中移除完整引用标签
    cleanedContent = cleanedContent.replace(match[0], '')
  }
  
  // 移除 --- 引用资料 --- 等标记
  cleanedContent = cleanedContent
    .replace(/\n?---+\n?引用资料：\n?/g, '')
    .replace(/\n?---+\n?$/g, '')
    .trim()
  
  // 构建显示 HTML：将 @文章标题 渲染为浅色胶囊
  let displayHtml = cleanedContent
  
  // 转义 HTML
  displayHtml = displayHtml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // 将提到的文章标题替换为胶囊样式
  for (const mention of mentions) {
    const escapedTitle = mention.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`@${escapedTitle}\\s?`, 'g')
    displayHtml = displayHtml.replace(regex, 
      `<span class="mention-capsule" data-title="${mention.title}">📄 ${mention.title}</span>`
    )
  }
  
  // 转换换行
  displayHtml = displayHtml.replace(/\n/g, '<br>')
  
  return {
    skill,
    textBefore: cleanedContent,
    mentions,
    textAfter: '',
    displayHtml
  }
})

const displayReasoning = computed(() => props.message.reasoning?.content || '')

const renderedHtml = computed(() => {
  const content = props.message.content
  if (!content) return ''
  try {
    // AI 消息正常渲染 Markdown
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
.message-wrapper {
  margin-bottom: var(--ai-space-6);
}

/* 用户消息 */
.user-message {
  display: flex;
  justify-content: flex-end;
  gap: var(--ai-space-3);
}

.user-message .message-content {
  max-width: 70%;
  padding: var(--ai-space-4) var(--ai-space-5);
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 18px 18px 4px 18px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.user-message .message-text {
  font-size: 15px;
  line-height: 1.6;
}

/* 技能胶囊（用户消息内） */
.skill-capsule {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  margin-bottom: 8px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(4px);
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.skill-icon {
  font-size: 12px;
}

.skill-name {
  opacity: 0.95;
}

/* 引用胶囊（用户消息内） */
:deep(.mention-capsule) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  margin: 0 2px;
  background: rgba(255, 255, 255, 0.9);
  color: #2563eb;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  vertical-align: middle;
  cursor: default;
  user-select: none;
}

/* AI 消息 */
.ai-message {
  display: flex;
  gap: var(--ai-space-3);
}

.message-body {
  flex: 1;
  max-width: calc(100% - 60px);
}

/* 思考过程 */
.reasoning-box {
  margin-bottom: var(--ai-space-3);
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: var(--ai-radius-lg);
  overflow: hidden;
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  padding: var(--ai-space-2) var(--ai-space-4);
  font-size: 13px;
  color: #059669;
  cursor: pointer;
  transition: background var(--ai-transition-fast);
}

.reasoning-header:hover {
  background: #dcfce7;
}

.reasoning-icon {
  font-size: 14px;
}

.reasoning-content {
  padding: 0 var(--ai-space-4) var(--ai-space-3);
  font-size: 13px;
  color: var(--ai-text-tertiary);
  font-style: italic;
  line-height: 1.7;
  white-space: pre-wrap;
}

/* 工具调用记录 */
.tool-records-box {
  margin-bottom: var(--ai-space-3);
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--ai-radius-lg);
  overflow: hidden;
}

.tool-records-header {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  padding: var(--ai-space-2) var(--ai-space-4);
  font-size: 13px;
  color: #475569;
  cursor: pointer;
  transition: background var(--ai-transition-fast);
}

.tool-records-header:hover {
  background: #f1f5f9;
}

.tool-icon {
  font-size: 14px;
}

.tool-records-content {
  padding: 0 var(--ai-space-4) var(--ai-space-3);
}

.tool-record-item {
  margin-bottom: var(--ai-space-3);
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: var(--ai-radius-md);
  overflow: hidden;
}

.tool-record-item:last-child {
  margin-bottom: 0;
}

.tool-record-header {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  padding: var(--ai-space-2) var(--ai-space-3);
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
  font-size: 12px;
}

.tool-name {
  font-weight: 600;
  color: #1e293b;
}

.tool-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
}

.tool-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.tool-status.running {
  background: #dbeafe;
  color: #1e40af;
}

.tool-status.success {
  background: #d1fae5;
  color: #065f46;
}

.tool-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.tool-duration {
  margin-left: auto;
  color: #64748b;
  font-size: 11px;
}

.tool-record-detail {
  padding: var(--ai-space-3);
}

.tool-section {
  margin-bottom: var(--ai-space-2);
}

.tool-section:last-child {
  margin-bottom: 0;
}

.tool-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 4px;
}

.tool-code {
  background: #1e293b;
  color: #e2e8f0;
  padding: var(--ai-space-2) var(--ai-space-3);
  border-radius: var(--ai-radius-md);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-code.error {
  background: #7f1d1d;
  color: #fecaca;
}

/* 消息气泡 */
.message-bubble {
  padding: var(--ai-space-4) var(--ai-space-5);
  background: var(--ai-bg-card);
  border: 1px solid var(--ai-border-light);
  border-radius: 4px 18px 18px 18px;
  box-shadow: var(--ai-shadow-sm);
  font-size: 15px;
  line-height: 1.8;
  color: var(--ai-text-primary);
}

/* Markdown 样式 */
.message-bubble :deep(p) {
  margin: 0 0 12px;
}

.message-bubble :deep(p:last-child) {
  margin-bottom: 0;
}

.message-bubble :deep(pre) {
  background: #1e293b;
  border-radius: var(--ai-radius-md);
  padding: var(--ai-space-4);
  overflow-x: auto;
  margin: var(--ai-space-3) 0;
}

.message-bubble :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
}

.message-bubble :deep(pre code) {
  color: #e2e8f0;
  background: none;
  padding: 0;
}

.message-bubble :deep(:not(pre) > code) {
  background: var(--ai-gray-100);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--ai-primary-700);
}

.message-bubble :deep(ul),
.message-bubble :deep(ol) {
  margin: var(--ai-space-3) 0;
  padding-left: var(--ai-space-6);
}

.message-bubble :deep(li) {
  margin: var(--ai-space-1) 0;
}

.message-bubble :deep(blockquote) {
  margin: var(--ai-space-3) 0;
  padding: var(--ai-space-3) var(--ai-space-4);
  border-left: 4px solid var(--ai-primary-400);
  background: var(--ai-primary-50);
  border-radius: 0 var(--ai-radius-md) var(--ai-radius-md) 0;
  color: var(--ai-text-secondary);
}

/* 流式光标 */
.cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background: var(--ai-primary-500);
  margin-left: 4px;
  border-radius: 2px;
  animation: cursorBlink 1s step-end infinite;
  vertical-align: middle;
}

@keyframes cursorBlink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 操作按钮 */
.message-actions {
  display: flex;
  gap: var(--ai-space-2);
  margin-top: var(--ai-space-3);
  opacity: 0;
  transition: opacity var(--ai-transition-fast);
}

.message-wrapper:hover .message-actions {
  opacity: 1;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: var(--ai-space-1);
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-md);
  font-size: 12px;
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.action-btn:hover {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

/* 思考中占位 */
.thinking-placeholder {
  display: flex;
  gap: 6px;
  padding: var(--ai-space-4);
  align-items: center;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  background: var(--ai-primary-400);
  border-radius: 50%;
  animation: thinkingBounce 1.4s ease-in-out infinite;
}

.thinking-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinkingBounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
  40% { transform: scale(1); opacity: 1; }
}

/* 动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
