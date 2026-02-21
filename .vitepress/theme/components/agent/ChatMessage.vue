<!--
  ChatMessage - 消息组件
  
  显示单条消息，支持 Markdown、代码高亮、流式效果
-->
<template>
  <div 
    class="message"
    :class="[
      message.role,
      { 
        'streaming': isStreaming,
        'first': isFirst,
        'last': isLast
      }
    ]"
  >
    <!-- 头像 -->
    <div class="avatar">
      <div v-if="message.role === 'user'" class="user-avatar">
        <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      </div>
      <div v-else class="ai-avatar">
        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>
      </div>
    </div>
    
    <!-- 内容区域 -->
    <div class="content-wrapper">
      <!-- 头部信息 -->
      <div class="message-header">
        <span class="role-name">{{ roleName }}</span>
        <span class="timestamp">{{ formattedTime }}</span>
        <span v-if="message.metadata?.model" class="model-badge">
          {{ message.metadata.model }}
        </span>
      </div>
      
      <!-- 消息内容 -->
      <div class="message-body">
        <!-- 用户消息：纯文本 -->
        <div v-if="message.role === 'user'" class="text-content">
          {{ message.content }}
        </div>
        
        <!-- AI消息：Markdown渲染 -->
        <div v-else class="markdown-content">
          <!-- 思考过程（如果有） -->
          <div v-if="message.reasoning" class="reasoning-block">
            <div class="reasoning-header" @click="showReasoning = !showReasoning">
              <svg viewBox="0 0 24 24" :class="{ 'expanded': showReasoning }">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
              <span>思考过程</span>
            </div>
            <div v-show="showReasoning" class="reasoning-content">
              {{ message.reasoning }}
            </div>
          </div>
          
          <!-- 主要内容 -->
          <div class="markdown-body" v-html="renderedContent"></div>
          
          <!-- 流式光标 -->
          <span v-if="isStreaming" class="cursor">▋</span>
        </div>
      </div>
      
      <!-- 工具栏 -->
      <div class="message-toolbar">
        <button 
          v-for="action in toolbarActions" 
          :key="action.key"
          class="toolbar-btn"
          :title="action.title"
          @click="action.handler"
        >
          <svg viewBox="0 0 24 24" v-html="action.icon"></svg>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { onMounted, ref, computed } from 'vue'
import type { Message } from '../../../agent/stores'

interface Props {
  message: Message
  isStreaming?: boolean
  isFirst?: boolean
  isLast?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  copy: [content: string]
  regenerate: []
  delete: []
  edit: [content: string]
}>()

const showReasoning = ref(false)
const isEditing = ref(false)
const editContent = ref('')

const roleName = computed(() => {
  const names: Record<string, string> = {
    user: '用户',
    assistant: 'AI 助手',
    system: '系统'
  }
  return names[props.message.role] || props.message.role
})

const formattedTime = computed(() => {
  const date = new Date(props.message.createdAt)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit'
  })
})

const isClient = ref(false)

onMounted(() => {
  isClient.value = true
})

const renderedContent = computed(() => {
  if (!props.message.content || !isClient.value) return ''
  
  // 使用 marked 渲染 Markdown
  const rawHtml = marked.parse(props.message.content, { 
    async: false,
    breaks: true,
    gfm: true
  }) as string
  
  // 净化 HTML 防止 XSS
  return DOMPurify.sanitize(rawHtml)
})

const toolbarActions = computed(() => {
  const actions = []
  
  if (props.message.role === 'assistant') {
    actions.push({
      key: 'copy',
      icon: '<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>',
      title: '复制内容',
      label: '复制',
      handler: () => emit('copy', props.message.content)
    })
    
    if (props.isLast) {
      actions.push({
        key: 'regenerate',
        icon: '<path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>',
        title: '重新生成',
        label: '重新生成',
        handler: () => emit('regenerate')
      })
    }
  }
  
  if (props.message.role === 'user') {
    actions.push({
      key: 'edit',
      icon: '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
      title: '编辑消息',
      label: '编辑',
      handler: startEdit
    })
  }
  
  actions.push({
    key: 'delete',
    icon: '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
    title: '删除消息',
    label: '删除',
    handler: () => emit('delete')
  })
  
  return actions
})

function startEdit() {
  isEditing.value = true
  editContent.value = props.message.content
}

function saveEdit() {
  emit('edit', editContent.value)
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
  editContent.value = ''
}
</script>

<style scoped>
.message {
  display: flex;
  gap: 16px;
  padding: 24px;
  transition: background-color 0.2s;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message:hover {
  background-color: var(--vp-c-bg-alt);
}

.message.user {
  background-color: rgba(var(--vp-c-brand-rgb), 0.03);
}

/* Avatar */
.avatar {
  flex-shrink: 0;
}

.user-avatar,
.ai-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-avatar {
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark) 100%);
  color: white;
}

.ai-avatar {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
}

.user-avatar svg,
.ai-avatar svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

/* Content Wrapper */
.content-wrapper {
  flex: 1;
  min-width: 0;
}

/* Header */
.message-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.role-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.timestamp {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.model-badge {
  padding: 2px 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
}

/* Body */
.message-body {
  font-size: 15px;
  line-height: 1.8;
}

/* Text Content (User) */
.text-content {
  color: var(--vp-c-text-1);
  white-space: pre-wrap;
  word-break: break-word;
}

/* Markdown Content (AI) */
.markdown-content {
  color: var(--vp-c-text-1);
}

/* Reasoning Block */
.reasoning-block {
  margin-bottom: 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

.reasoning-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vp-c-bg-alt);
  cursor: pointer;
  user-select: none;
  transition: background-color 0.2s;
}

.reasoning-header:hover {
  background: var(--vp-c-divider);
}

.reasoning-header svg {
  width: 20px;
  height: 20px;
  fill: var(--vp-c-text-3);
  transition: transform 0.2s;
}

.reasoning-header svg.expanded {
  transform: rotate(90deg);
}

.reasoning-header span {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
}

.reasoning-content {
  padding: 16px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  white-space: pre-wrap;
  font-style: italic;
}

/* Markdown Body */
.markdown-body :deep(p) {
  margin: 0 0 16px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(code) {
  padding: 2px 6px;
  background: var(--vp-c-bg-alt);
  border-radius: 4px;
  font-family: var(--vp-font-family-mono);
  font-size: 13px;
}

.markdown-body :deep(pre) {
  padding: 16px;
  background: var(--vp-c-bg-alt);
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
}

.markdown-body :deep(pre code) {
  padding: 0;
  background: none;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 16px 0;
  padding-left: 24px;
}

.markdown-body :deep(li) {
  margin: 8px 0;
}

.markdown-body :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  border-left: 4px solid var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  border-radius: 0 8px 8px 0;
}

.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  text-align: left;
}

.markdown-body :deep(th) {
  background: var(--vp-c-bg-alt);
  font-weight: 600;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 24px 0 16px;
  font-weight: 600;
}

.markdown-body :deep(h1) { font-size: 24px; }
.markdown-body :deep(h2) { font-size: 20px; }
.markdown-body :deep(h3) { font-size: 18px; }
.markdown-body :deep(h4) { font-size: 16px; }

.markdown-body :deep(a) {
  color: var(--vp-c-brand);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
}

/* Streaming Cursor */
.cursor {
  display: inline-block;
  width: 8px;
  height: 20px;
  background: var(--vp-c-brand);
  margin-left: 4px;
  animation: blink 1s step-end infinite;
  vertical-align: middle;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

/* Toolbar */
.message-toolbar {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message:hover .message-toolbar {
  opacity: 1;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--vp-c-text-3);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.toolbar-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

/* Streaming State */
.message.streaming .markdown-content {
  min-height: 60px;
}

/* Responsive */
@media (max-width: 768px) {
  .message {
    padding: 16px;
    gap: 12px;
  }
  
  .user-avatar,
  .ai-avatar {
    width: 32px;
    height: 32px;
  }
  
  .user-avatar svg,
  .ai-avatar svg {
    width: 18px;
    height: 18px;
  }
  
  .message-toolbar {
    opacity: 1;
  }
}
</style>
