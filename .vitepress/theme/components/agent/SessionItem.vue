<!--
  SessionItem - 会话列表项组件
  
  显示单个会话的摘要信息
-->
<template>
  <div 
    class="session-item"
    :class="{ active }"
    @click="emit('click')"
  >
    <div class="session-icon">
      <svg v-if="session.type === 'writing'" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
      <svg v-else viewBox="0 0 24 24">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
      </svg>
    </div>
    
    <div class="session-info">
      <div v-if="!isEditing" class="session-title" @dblclick.stop="startEdit">
        {{ session.title || '新对话' }}
      </div>
      <input
        v-else
        v-model="editTitle"
        class="session-title-input"
        @blur="saveEdit"
        @keydown.enter="saveEdit"
        @keydown.esc="cancelEdit"
        autofocus
      />
      <div class="session-meta">
        <span>{{ formatTime(session.updatedAt) }}</span>
        <span v-if="session.stats?.messageCount">· {{ session.stats.messageCount }} 条消息</span>
      </div>
    </div>
    
    <div class="session-actions">
      <button 
        class="action-btn rename-btn"
        @click.stop="startEdit"
        title="重命名"
      >
        <svg viewBox="0 0 24 24">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      </button>
      <button 
        class="action-btn delete-btn"
        @click.stop="emit('delete')"
        title="删除"
      >
        <svg viewBox="0 0 24 24">
          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Session } from '../../../agent/stores'

interface Props {
  session: Session
  active?: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: []
  delete: []
  rename: [newTitle: string]
}>()

const isEditing = ref(false)
const editTitle = ref('')

function startEdit() {
  editTitle.value = props.session.title
  isEditing.value = true
}

function saveEdit() {
  if (editTitle.value.trim() && editTitle.value !== props.session.title) {
    emit('rename', editTitle.value.trim())
  }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
  editTitle.value = ''
}

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  // 小于1小时显示相对时间
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return '刚刚'
    return `${minutes} 分钟前`
  }
  
  // 今天显示时间
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 其他显示日期
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}
</script>

<style scoped>
.session-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.session-item:hover {
  background: var(--hover-bg, rgba(0,0,0,0.03));
}

.session-item.active {
  background: rgba(102, 126, 234, 0.1);
}

.session-item:hover .session-actions,
.session-item.active .session-actions {
  opacity: 1;
}

.session-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--bg-tertiary, #e5e7eb);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.session-icon svg {
  width: 18px;
  height: 18px;
  fill: var(--text-secondary, #6b7280);
}

.session-info {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary, #111827);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-item.active .session-title {
  color: var(--primary-color, #667eea);
}

.session-meta {
  font-size: 11px;
  color: var(--text-tertiary, #9ca3af);
  margin-top: 2px;
}

.delete-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary, #9ca3af);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.delete-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}

.session-title-input {
  width: 100%;
  padding: 2px 6px;
  border: 1px solid var(--vp-c-brand);
  border-radius: 4px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 13px;
  outline: none;
}

.session-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-tertiary, #9ca3af);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.rename-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.action-btn svg {
  width: 16px;
  height: 16px;
  fill: currentColor;
}
</style>
