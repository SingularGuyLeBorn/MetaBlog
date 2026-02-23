<!--
  MessageBubble - 消息气泡组件（3D 液态玻璃风格）
-->
<template>
  <div class="message-wrapper-3d" :class="[message.role, { last: isLast }]">
    <!-- 用户消息 -->
    <div v-if="message.role === 'user'" class="user-message-3d">
      <div class="message-content-3d">
        <!-- 技能胶囊（如果有） -->
        <div v-if="parsedMessage.skill" class="skill-capsule-3d">
          <span class="skill-icon">{{ parsedMessage.skill.icon }}</span>
          <span class="skill-name">{{ parsedMessage.skill.name }}</span>
        </div>
        <!-- 消息文本（带引用胶囊） -->
        <div class="message-text" v-html="parsedMessage.displayHtml"></div>
      </div>
      <Avatar type="user" />
    </div>

    <!-- AI 消息 -->
    <div v-else class="ai-message-3d">
      <AIAvatar :typing="isStreaming" />
      <div class="message-body">
        <!-- 思考步骤控制面板 -->
        <div v-if="thinkingSteps && thinkingSteps.length > 0" class="thinking-steps-panel">
          <div class="thinking-steps-header" @click="showThinkingSteps = !showThinkingSteps">
            <span class="thinking-steps-icon">🧠</span>
            <span class="thinking-steps-title">思考过程 ({{ thinkingSteps.length }} 步)</span>
            <Icon :name="showThinkingSteps ? 'chevron-down' : 'chevron-right'" :size="14" />
          </div>
          
          <!-- 思考步骤列表 -->
          <div v-show="showThinkingSteps" class="thinking-steps-list">
            <div 
              v-for="(step, index) in thinkingSteps" 
              :key="step.id"
              class="thinking-step"
              :class="[step.type, { 'last': index === thinkingSteps.length - 1 && !message.content }]"
            >
              <!-- 思考步骤 -->
              <template v-if="step.type === 'thinking'">
                <div class="step-header" @click="expandedThinkingSteps[step.id] = !expandedThinkingSteps[step.id]">
                  <span class="step-icon">💭</span>
                  <span class="step-title">思考 {{ step.index + 1 }}</span>
                  <Icon :name="expandedThinkingSteps[step.id] ? 'chevron-down' : 'chevron-right'" :size="12" />
                </div>
                <div v-show="expandedThinkingSteps[step.id]" class="step-content thinking-content">
                  {{ step.content }}
                </div>
              </template>
              
              <!-- 工具调用步骤 -->
              <template v-else-if="step.type === 'tool_call' && step.toolRecord">
                <div class="step-header" @click="expandedThinkingSteps[step.id] = !expandedThinkingSteps[step.id]">
                  <span class="step-icon">🔨</span>
                  <span class="step-title">{{ step.toolRecord.name }}</span>
                  <span :class="['step-status', step.toolRecord.status]">
                    {{ statusText(step.toolRecord.status) }}
                  </span>
                  <Icon :name="expandedThinkingSteps[step.id] ? 'chevron-down' : 'chevron-right'" :size="12" />
                </div>
                <div v-show="expandedThinkingSteps[step.id]" class="step-content tool-content">
                  <div class="tool-args">
                    <span class="label">参数:</span>
                    <code>{{ JSON.stringify(step.toolRecord.arguments, null, 2) }}</code>
                  </div>
                  <div v-if="step.toolRecord.status !== 'pending' && step.toolRecord.status !== 'running'" class="tool-result">
                    <span class="label">结果:</span>
                    <pre>{{ step.toolRecord.result }}</pre>
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
        </div>
        
        <!-- 传统思考框（兼容旧数据）-->
        <div v-else-if="displayReasoning" class="reasoning-box-3d">
          <div class="reasoning-header" @click="isExpanded = !isExpanded">
            <span class="reasoning-icon">💭</span>
            <span>思考过程</span>
            <Icon :name="isExpanded ? 'chevron-down' : 'chevron-right'" :size="14" />
          </div>
          <div v-show="isExpanded" class="reasoning-content">
            {{ displayReasoning }}
          </div>
        </div>

        <!-- 消息内容（最终回复） -->
        <div 
          v-if="message.content" 
          class="message-bubble-3d" 
          :class="{ 'typing-effect': shouldUseTypewriter }"
          v-html="renderedHtml"
        ></div>
        <!-- 思考中占位 - 仅当非推理模型或没有思考内容时显示 -->
        <div v-else-if="isStreaming && !displayReasoning && thinkingSteps.length === 0" class="thinking-placeholder-3d">
          <span class="thinking-dot-3d"></span>
          <span class="thinking-dot-3d"></span>
          <span class="thinking-dot-3d"></span>
        </div>

        <!-- 工具调用记录 - 显示在消息内容之后（兼容旧数据） -->
        <div v-if="toolRecords.length > 0 && thinkingSteps.length === 0" class="tool-panel">
          <div class="tool-panel-header" @click="showToolRecords = !showToolRecords">
            <div class="tool-panel-title">
              <span class="tool-icon">🔧</span>
              <span>工具调用</span>
              <span class="tool-count">{{ toolRecords.length }}</span>
            </div>
            <Icon :name="showToolRecords ? 'chevron-down' : 'chevron-right'" :size="14" class="tool-toggle-icon" />
          </div>
          <div v-show="showToolRecords" class="tool-panel-content">
            <div v-for="(record, index) in toolRecords" :key="record.id" class="tool-item">
              <!-- 工具头部：始终显示 -->
              <div class="tool-item-header" @click="toggleToolDetail(index)">
                <div class="tool-item-left">
                  <span class="tool-round-num">#{{ index + 1 }}</span>
                  <span class="tool-item-name">{{ record.name }}</span>
                  <span :class="['tool-item-status', record.status]">{{ statusText(record.status) }}</span>
                </div>
                <div class="tool-item-right">
                  <span v-if="record.duration" class="tool-item-time">⏱️ {{ record.duration }}ms</span>
                  <Icon :name="expandedTools[index] ? 'chevron-down' : 'chevron-right'" :size="12" />
                </div>
              </div>
              
              <!-- 工具详情：默认折叠 -->
              <div v-show="expandedTools[index]" class="tool-item-detail">
                <!-- 参数 - 可折叠 -->
                <div class="tool-detail-section">
                  <div class="tool-detail-header" @click="toggleSection(index, 'args')">
                    <span>📥 参数</span>
                    <Icon :name="expandedSections[`${index}-args`] ? 'chevron-down' : 'chevron-right'" :size="10" />
                  </div>
                  <div v-show="expandedSections[`${index}-args`]" class="tool-detail-content">
                    <pre class="tool-code-light">{{ JSON.stringify(record.arguments, null, 2) }}</pre>
                  </div>
                </div>
                
                <!-- 结果 - 可折叠 -->
                <div class="tool-detail-section">
                  <div class="tool-detail-header" @click="toggleSection(index, 'result')">
                    <span>📤 结果</span>
                    <Icon :name="expandedSections[`${index}-result`] ? 'chevron-down' : 'chevron-right'" :size="10" />
                  </div>
                  <div v-show="expandedSections[`${index}-result`]" class="tool-detail-content">
                    <pre class="tool-code-light">{{ record.result }}</pre>
                  </div>
                </div>
                
                <!-- 错误 - 始终显示（如果有） -->
                <div v-if="record.error" class="tool-detail-section error">
                  <div class="tool-detail-header">
                    <span>❌ 错误</span>
                  </div>
                  <div class="tool-detail-content">
                    <pre class="tool-code-error">{{ record.error }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
import { ref, computed } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { Avatar, AIAvatar, Icon, TypewriterText } from '../../../ui'
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

const isExpanded = ref(false) // 传统思考框默认折叠
const copied = ref(false)
const showToolRecords = ref(false) // 工具调用面板默认折叠
const expandedTools = ref<boolean[]>([]) // 每个工具的详情默认折叠
const expandedSections = ref<Record<string, boolean>>({}) // 参数/结果区域折叠状态
const showThinkingSteps = ref(false) // 思考步骤默认折叠
const expandedThinkingSteps = ref<Record<string, boolean>>({}) // 单个思考步骤的展开状态

const toolRecords = computed(() => props.message.metadata?.toolRecords || [])

// 切换工具详情展开/折叠
const toggleToolDetail = (index: number) => {
  expandedTools.value[index] = !expandedTools.value[index]
}

// 切换参数/结果区域展开/折叠
const toggleSection = (toolIndex: number, section: string) => {
  const key = `${toolIndex}-${section}`
  expandedSections.value[key] = !expandedSections.value[key]
}

function statusText(status: string): string {
  const map: Record<string, string> = {
    'pending': '等待中',
    'running': '执行中',
    'success': '成功',
    'error': '失败'
  }
  return map[status] || status
}

interface ParsedMessage {
  skill: { name: string; icon: string } | null
  textBefore: string
  mentions: Array<{ title: string; fullMatch: string }>
  textAfter: string
  displayHtml: string
}

const parsedMessage = computed((): ParsedMessage => {
  const content = props.message.content || ''
  
  let skill: { name: string; icon: string } | null = null
  if ((props.message.metadata as any)?.skill) {
    skill = (props.message.metadata as any).skill as { name: string; icon: string }
  }
  
  const mentionRegex = /<reference\s+title="([^"]+)"\s+path="([^"]+)"[^>]*>[\s\S]*?<\/reference>/g
  const mentions: Array<{ title: string; fullMatch: string }> = []
  let match
  let cleanedContent = content
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      title: match[1],
      fullMatch: match[0]
    })
    cleanedContent = cleanedContent.replace(match[0], '')
  }
  
  cleanedContent = cleanedContent
    .replace(/\n?---+\n?引用资料：\n?/g, '')
    .replace(/\n?---+\n?$/g, '')
    .trim()
  
  let displayHtml = cleanedContent
  displayHtml = displayHtml
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  for (const mention of mentions) {
    const escapedTitle = mention.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const regex = new RegExp(`@${escapedTitle}\s?`, 'g')
    displayHtml = displayHtml.replace(regex, 
      `<span class="mention-capsule-3d" data-title="${mention.title}">📄 ${mention.title}</span>`
    )
  }
  
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

// 思考步骤（新的串行展示方式）
const thinkingSteps = computed(() => {
  const steps = props.message.metadata?.thinkingSteps || []
  // 按 index 排序
  return [...steps].sort((a, b) => a.index - b.index)
})

// 是否使用打字机效果：思考模式下且是最后一条消息且不是流式状态
const shouldUseTypewriter = computed(() => {
  return props.isLast && 
         !props.isStreaming && 
         props.message.role === 'assistant' &&
         props.message.metadata?.model?.includes('reasoner')
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
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ========== 用户消息 ========== */
.user-message-3d {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.user-message-3d .message-content-3d {
  position: relative;
  max-width: 70%;
  padding: 16px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  color: white;
  border-radius: 20px 20px 4px 20px;
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.3),
    0 8px 24px rgba(59, 130, 246, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: all 0.3s ease;
  transform-style: preserve-3d;
}

.user-message-3d .message-content-3d:hover {
  transform: translateY(-2px) rotateX(2deg);
  box-shadow: 
    0 8px 20px rgba(59, 130, 246, 0.4),
    0 16px 40px rgba(59, 130, 246, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.user-message-3d .message-text {
  font-size: 15px;
  line-height: 1.7;
}

/* 技能胶囊 - 3D 玻璃效果 */
.skill-capsule-3d {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  margin-bottom: 10px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.skill-icon {
  font-size: 14px;
}

.skill-name {
  opacity: 0.95;
}

/* 引用胶囊 - 3D 效果 */
:deep(.mention-capsule-3d) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  margin: 0 3px;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  color: #2563eb;
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  vertical-align: middle;
  cursor: default;
  user-select: none;
  transition: all 0.2s ease;
}

:deep(.mention-capsule-3d:hover) {
  transform: translateY(-1px);
  box-shadow: 
    0 4px 8px rgba(0, 0, 0, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
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

/* 思考过程 - 3D 卡片 */
.reasoning-box-3d {
  margin-bottom: 16px;
  background: linear-gradient(145deg, #f0fdf4, #dcfce7);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 
    0 4px 12px rgba(16, 185, 129, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.3s ease;
}

.reasoning-box-3d:hover {
  transform: translateY(-1px);
  box-shadow: 
    0 8px 20px rgba(16, 185, 129, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

/* 思考步骤面板样式 */
.thinking-steps-panel {
  margin-bottom: 16px;
  background: linear-gradient(145deg, #f0fdf4, #dcfce7);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 
    0 4px 12px rgba(16, 185, 129, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.thinking-steps-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;
}

.thinking-steps-header:hover {
  background: rgba(16, 185, 129, 0.1);
}

.thinking-steps-icon {
  font-size: 18px;
}

.thinking-steps-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #065f46;
}

.thinking-steps-list {
  border-top: 1px solid rgba(16, 185, 129, 0.2);
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #059669;
  cursor: pointer;
  transition: background 0.2s;
}

/* ========== 思考步骤（串行展示） ========== */
.thinking-step {
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
  animation: step-fade-in 0.4s ease-out;
}

@keyframes step-fade-in {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.thinking-step.thinking {
  background: linear-gradient(145deg, #f0fdf4, #dcfce7);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.thinking-step.tool_call {
  background: linear-gradient(145deg, #fefce8, #fef9c3);
  border: 1px solid rgba(234, 179, 8, 0.2);
}

.thinking-step.last {
  margin-bottom: 16px;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
}

.thinking-step.thinking .step-header {
  color: #059669;
}

.thinking-step.tool_call .step-header {
  color: #ca8a04;
}

.step-icon {
  font-size: 14px;
}

.step-title {
  flex: 1;
}

.step-status {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  text-transform: uppercase;
  font-weight: 700;
}

.step-status.pending {
  background: #fef3c7;
  color: #92400e;
}

.step-status.running {
  background: #dbeafe;
  color: #1e40af;
}

.step-status.success {
  background: #d1fae5;
  color: #065f46;
}

.step-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.step-content {
  padding: 0 14px 12px;
  font-size: 13px;
  line-height: 1.7;
}

.thinking-content {
  color: #374151;
  font-style: italic;
  white-space: pre-wrap;
}

.tool-content {
  color: #4b5563;
}

.tool-content .tool-name {
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 6px;
}

.tool-content .label {
  font-weight: 600;
  color: #6b7280;
  font-size: 11px;
  text-transform: uppercase;
}

.tool-content code {
  display: block;
  background: rgba(0, 0, 0, 0.04);
  padding: 8px 10px;
  border-radius: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  margin-top: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-content pre {
  background: rgba(0, 0, 0, 0.04);
  padding: 10px;
  border-radius: 6px;
  font-size: 11px;
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 150px;
  overflow-y: auto;
}

.tool-running {
  display: flex;
  gap: 6px;
  padding: 10px 0;
  align-items: center;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: #ca8a04;
  border-radius: 50%;
  animation: loading-bounce 1.4s ease-in-out infinite;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.loading-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes loading-bounce {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.reasoning-header:hover {
  background: rgba(16, 185, 129, 0.08);
}

.reasoning-icon {
  font-size: 14px;
}

.reasoning-content {
  padding: 0 16px 16px;
  font-size: 13px;
  color: #64748b;
  font-style: italic;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* 工具调用 Panel - 简洁设计 */
.tool-panel {
  margin-bottom: 16px;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 
    0 2px 8px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.tool-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s;
  background: linear-gradient(145deg, #f1f5f9, #e8ecf1);
}

.tool-panel-header:hover {
  background: linear-gradient(145deg, #e2e8f0, #d1d5db);
}

.tool-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-icon {
  font-size: 14px;
}

.tool-count {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}

.tool-toggle-icon {
  color: #94a3b8;
  transition: all 0.2s;
}

.tool-panel-header:hover .tool-toggle-icon {
  color: #64748b;
}

.tool-panel-content {
  padding: 12px;
}

/* 单个工具项 */
.tool-item {
  margin-bottom: 8px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  transition: all 0.2s ease;
}

.tool-item:last-child {
  margin-bottom: 0;
}

.tool-item:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.08);
}

.tool-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.tool-item-header:hover {
  background: rgba(59, 130, 246, 0.03);
}

.tool-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tool-round-num {
  background: linear-gradient(145deg, #e0e7ff, #c7d2fe);
  color: #4338ca;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
}

.tool-item-name {
  font-weight: 600;
  color: #1e293b;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 12px;
}

.tool-item-status {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
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

.tool-item-right {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #94a3b8;
}

.tool-item-time {
  font-size: 11px;
  color: #94a3b8;
}

/* 工具详情区域 */
.tool-item-detail {
  padding: 0 12px 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.5);
}

.tool-detail-section {
  margin-top: 10px;
}

.tool-detail-section.error {
  margin-top: 10px;
}

.tool-detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.tool-detail-header:hover {
  background: rgba(0, 0, 0, 0.03);
}

.tool-detail-content {
  margin-top: 6px;
  padding: 0 4px;
}

/* 浅色代码块 */
.tool-code-light {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  color: #334155;
  padding: 10px 12px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(203, 213, 225, 0.5);
  margin: 0;
}

.tool-code-error {
  background: linear-gradient(145deg, #fef2f2, #fee2e2);
  color: #991b1b;
  padding: 10px 12px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.5;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid rgba(254, 202, 202, 0.5);
  margin: 0;
}

/* 3D 消息气泡 */
.message-bubble-3d {
  position: relative;
  padding: 20px 24px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 4px 20px 20px 20px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  font-size: 15px;
  line-height: 1.8;
  color: #1e293b;
  transition: all 0.3s ease;
  transform-style: preserve-3d;
}

.message-bubble-3d:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.06),
    0 16px 40px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

/* 打字机效果 */
.message-bubble-3d.typing-effect {
  animation: typing-fade-in 0.6s ease-out;
}

@keyframes typing-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Markdown 样式增强 */
.message-bubble-3d :deep(p) {
  margin: 0 0 14px;
}

.message-bubble-3d :deep(p:last-child) {
  margin-bottom: 0;
}

.message-bubble-3d :deep(pre) {
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border-radius: 12px;
  padding: 16px 20px;
  overflow-x: auto;
  margin: 16px 0;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.message-bubble-3d :deep(code) {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
}

.message-bubble-3d :deep(pre code) {
  color: #e2e8f0;
  background: none;
  padding: 0;
}

.message-bubble-3d :deep(:not(pre) > code) {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.message-bubble-3d :deep(ul),
.message-bubble-3d :deep(ol) {
  margin: 14px 0;
  padding-left: 24px;
}

.message-bubble-3d :deep(li) {
  margin: 6px 0;
}

.message-bubble-3d :deep(blockquote) {
  margin: 16px 0;
  padding: 16px 20px;
  border-left: 4px solid #3b82f6;
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  border-radius: 0 12px 12px 0;
  color: #1e40af;
  font-style: italic;
}

.message-bubble-3d :deep(h1),
.message-bubble-3d :deep(h2),
.message-bubble-3d :deep(h3) {
  margin: 24px 0 14px;
  color: #1e293b;
  font-weight: 700;
}

.message-bubble-3d :deep(h1) { font-size: 22px; }
.message-bubble-3d :deep(h2) { font-size: 18px; }
.message-bubble-3d :deep(h3) { font-size: 16px; }

.message-bubble-3d :deep(a) {
  color: #3b82f6;
  text-decoration: none;
  font-weight: 600;
  border-bottom: 1px solid rgba(59, 130, 246, 0.3);
  transition: all 0.2s;
}

.message-bubble-3d :deep(a:hover) {
  border-bottom-color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

/* 3D 操作按钮 */
.message-actions-3d {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s ease;
}

.message-wrapper-3d:hover .message-actions-3d {
  opacity: 1;
  transform: translateY(0);
}

.action-btn-3d {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.action-btn-3d:hover {
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.15);
}

.action-btn-3d.copied {
  background: linear-gradient(145deg, #d1fae5, #a7f3d0);
  color: #059669;
  border-color: rgba(16, 185, 129, 0.3);
}

.action-btn-3d.regenerate:hover {
  background: linear-gradient(145deg, #fef3c7, #fde68a);
  color: #d97706;
  border-color: rgba(245, 158, 11, 0.3);
  box-shadow: 0 4px 8px rgba(245, 158, 11, 0.15);
}

/* 3D 思考中动画 */
.thinking-placeholder-3d {
  display: flex;
  gap: 8px;
  padding: 24px 20px;
  align-items: center;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border-radius: 16px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.02);
}

.thinking-dot-3d {
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  animation: thinking-bounce-3d 1.4s ease-in-out infinite;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.5);
}

.thinking-dot-3d:nth-child(2) {
  animation-delay: 0.2s;
}

.thinking-dot-3d:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes thinking-bounce-3d {
  0%, 80%, 100% { 
    transform: scale(0.6) translateY(0); 
    opacity: 0.5;
  }
  40% { 
    transform: scale(1) translateY(-8px); 
    opacity: 1;
  }
}

/* 流式光标 */
.cursor {
  display: inline-block;
  width: 8px;
  height: 18px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  margin-left: 4px;
  border-radius: 2px;
  animation: cursor-blink 1s step-end infinite;
  vertical-align: middle;
  box-shadow: 0 0 8px rgba(59, 130, 246, 0.6);
}

@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* 表格样式 */
.message-bubble-3d :deep(table) {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 16px 0;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.message-bubble-3d :deep(th) {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  padding: 12px 16px;
  font-weight: 700;
  color: #1e293b;
  text-align: left;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.message-bubble-3d :deep(td) {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.message-bubble-3d :deep(tr:last-child td) {
  border-bottom: none;
}

.message-bubble-3d :deep(tr:hover) {
  background: rgba(59, 130, 246, 0.03);
}
</style>
