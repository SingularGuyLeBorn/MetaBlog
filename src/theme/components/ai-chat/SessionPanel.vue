<!--
  SessionPanel - 会话列表面板(3D 液态玻璃风格)
-->
<template>
  <aside class="session-panel-3d" :class="{ collapsed }">
    <!-- 背景光效 -->
    <div class="panel-glow"></div>
    
    <div class="panel-content">
      <div class="panel-header-3d">
        <button class="btn-new-chat-3d" @click="$emit('create')">
          <Icon name="plus" :size="16" />
          <span>新对话</span>
        </button>
      </div>
      
      <!-- Agent 标识 -->
      <div v-if="agentName" class="agent-indicator">
        <span class="agent-dot"></span>
        <span class="agent-label">{{ agentName }}</span>
      </div>

      <!-- 搜索和管理 -->
      <div class="search-manage-row">
        <div class="search-box-3d">
          <Icon name="search" :size="16" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="搜索当前 Agent 的会话..."
            class="search-input"
          >
        </div>
      </div>
      
      <!-- 管理所有会话按钮 -->
      <button 
        class="manage-all-btn"
        @click="$emit('manage')"
      >
        <Icon name="layers" :size="14" />
        <span>管理所有会话</span>
      </button>

      <div class="session-list ai-scroll">
        <div v-for="group in filteredGroups" :key="group.label" class="session-group">
          <div class="group-header-3d">{{ group.label }}</div>
          <div
            v-for="(session, index) in group.sessions"
            :key="session.id"
            class="session-item-3d"
            :class="{ 
              active: currentId === session.id,
              streaming: streamingIds.includes(session.id)
            }"
            @click="handleSessionClick(session.id)"
          >
            <div class="session-icon-3d">
              <Icon name="message" :size="16" />
              <span v-if="streamingIds.includes(session.id)" class="streaming-dot-3d" />
            </div>
            <div class="session-info">
              <!-- 行内编辑模式 -->
              <div v-if="editingId === session.id" class="session-title-edit" @click.stop>
                <input
                  :ref="(el) => { if (el) inputRefs[session.id] = el as HTMLInputElement }"
                  v-model="editingTitle"
                  type="text"
                  @keydown.enter="saveRename"
                  @keydown.esc="cancelRename"
                  @blur="saveRename"
                />
              </div>
              <!-- 正常显示模式 -->
              <div v-else class="session-title">{{ session.title }}</div>
              <div class="session-meta">
                <span class="session-time">
                  {{ streamingIds.includes(session.id) ? '生成中...' : formatTime(session.updatedAt) }}
                </span>
                <span v-if="getSessionTokenUsage(session.id).estimatedInput > 0" class="session-tokens">
                  {{ formatTokenCount(getSessionTokenUsage(session.id).estimatedInput + getSessionTokenUsage(session.id).estimatedOutput) }} tokens
                </span>
              </div>
            </div>
            <div class="session-actions" @click.stop>
              <button class="action-btn-3d" @click.prevent="startRename(session)" title="重命名">
                <Icon name="edit" :size="14" />
              </button>
              <button class="action-btn-3d delete" @click.prevent="$emit('delete', session.id)" title="删除">
                <Icon name="trash" :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </aside>
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import { useAIChat } from '@/theme/stores'
import type { ChatSession } from '@/theme/types'
import { formatTokenCount } from '@/theme/utils/tokenEstimator'
import { computed, nextTick, ref } from 'vue'

interface Props {
  sessions: ChatSession[]
  currentId: string | null
  collapsed: boolean
  streamingIds?: string[]
  agentName?: string
}

const props = withDefaults(defineProps<Props>(), {
  streamingIds: () => [],
  agentName: ''
})

const { getSessionTokenUsage } = useAIChat()

const emit = defineEmits<{
  create: []
  switch: [id: string]
  rename: [id: string, newTitle: string]
  delete: [id: string]
  manage: []
}>()

// 搜索
const searchQuery = ref('')

// 行内编辑状态
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const editInput = ref<HTMLInputElement | null>(null)

// 存储每个会话的 input ref
const inputRefs = ref<Record<string, HTMLInputElement>>({})

/**
 * 自然排序：把字符串按数字和非数字分段比较
 * 示例：'新对话 1' < '新对话 2' < '新对话 10'
 */
function naturalSort(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const aParts = a.match(re) || []
  const bParts = b.match(re) || []

  for (let i = 0; i < Math.min(aParts.length, bParts.length); i++) {
    const aNum = parseInt(aParts[i], 10)
    const bNum = parseInt(bParts[i], 10)

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum
    } else {
      if (aParts[i] !== bParts[i]) return aParts[i].localeCompare(bParts[i])
    }
  }

  return aParts.length - bParts.length
}

const filteredGroups = computed(() => {
  let sessions = props.sessions
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    sessions = sessions.filter(s => s.title.toLowerCase().includes(query))
  }
  
  const groups: { label: string; sessions: ChatSession[] }[] = [
    { label: '今天', sessions: [] },
    { label: '昨天', sessions: [] },
    { label: '更早', sessions: [] }
  ]
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  
  sessions.forEach(session => {
    const date = new Date(session.updatedAt)
    if (date >= today) {
      groups[0].sessions.push(session)
    } else if (date >= yesterday) {
      groups[1].sessions.push(session)
    } else {
      groups[2].sessions.push(session)
    }
  })

  // 每组内按标题自然排序（和本地文件夹顺序一致：1, 2, ..., 10）
  groups.forEach(g => {
    g.sessions.sort((a, b) => naturalSort(a.title, b.title))
  })

  return groups.filter(g => g.sessions.length > 0)
})

function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

// 处理会话点击
function handleSessionClick(id: string) {
  if (editingId.value !== id) {
    emit('switch', id)
  }
}

// 开始重命名
function startRename(session: ChatSession) {
  editingId.value = session.id
  editingTitle.value = session.title
  nextTick(() => {
    const input = inputRefs.value[session.id]
    if (input) {
      input.focus()
      input.select()
    }
  })
}

// 保存重命名
function saveRename() {
  if (editingId.value && editingTitle.value.trim()) {
    emit('rename', editingId.value, editingTitle.value.trim())
  }
  editingId.value = null
  editingTitle.value = ''
}

// 取消重命名
function cancelRename() {
  editingId.value = null
  editingTitle.value = ''
}
</script>

<style scoped>
.session-panel-3d {
  position: relative;
  width: 280px;
  display: flex;
  flex-direction: column;
  background: transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border-right: none;
}

.session-panel-3d.collapsed {
  width: 0;
}

/* 背景光效 */
.panel-glow {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 0% 0%, rgba(16, 185, 129, 0.1) 0%, transparent 60%),
    radial-gradient(ellipse at 100% 100%, rgba(59, 130, 246, 0.08) 0%, transparent 60%);
  pointer-events: none;
}

.panel-content {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  z-index: 1;
}

/* 头部 - 3D 新对话按钮 */
.panel-header-3d {
  padding: 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.btn-new-chat-3d {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 20px;
  background: rgba(107, 231, 142, 0.1);
  color: #6BE78E;
  border: 1px solid rgba(107, 231, 142, 0.2);
  border-radius: 16px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 0 12px rgba(107, 231, 142, 0);
  transform-style: preserve-3d;
}

.btn-new-chat-3d:hover {
  transform: translateY(-2px);
  background: rgba(107, 231, 142, 0.2);
  box-shadow: inset 0 0 12px rgba(107, 231, 142, 0.1), 0 0 24px rgba(107, 231, 142, 0.15);
}

.btn-new-chat-3d:active {
  transform: translateY(0) rotateX(0);
}

/* 搜索和管理行 */
.search-manage-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 16px 20px;
}

/* 3D 搜索框 */
.search-box-3d {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  color: #64748b;
  transition: all 0.3s ease;
}

.search-box-3d:focus-within {
  border-color: #6BE78E;
  box-shadow: 0 0 16px rgba(107, 231, 142, 0.1);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 13px;
  color: #1e293b;
  outline: none;
}

.search-input::placeholder {
  color: #94a3b8;
}

/* 管理所有会话按钮 */
.manage-all-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: calc(100% - 40px);
  margin: 0 20px 16px;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.manage-all-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  transform: translateY(-1px);
}

/* 会话列表 */
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.session-group {
  margin-bottom: 20px;
}

.group-header-3d {
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 3D 会话项 */
.session-item-3d {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  margin-bottom: 6px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid transparent;
  border-radius: 16px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s ease;
  position: relative;
}

.session-item-3d:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #1e293b;
}

.session-item-3d.active {
  background: rgba(107, 231, 142, 0.1);
  border-color: rgba(107, 231, 142, 0.3);
  color: #6BE78E;
  box-shadow: inset 0 0 12px rgba(107, 231, 142, 0.05);
}

.session-item-3d.active :deep(.icon) {
  color: #6BE78E;
}

.session-item-3d.streaming {
  border-color: rgba(107, 231, 142, 0.5);
  background: rgba(107, 231, 142, 0.05);
}

/* 会话图标 */
.session-icon-3d {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(241, 245, 249, 0.8);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.session-item-3d:hover .session-icon-3d {
  background: rgba(226, 232, 240, 0.8);
}

.session-item-3d.active .session-icon-3d {
  background: rgba(107, 231, 142, 0.2);
  box-shadow: 0 0 16px rgba(107, 231, 142, 0.2);
}

.session-item-3d.active .session-icon-3d :deep(.icon) {
  color: #6BE78E;
}

/* 流式生成指示器 */
.streaming-dot-3d {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: #6BE78E;
  border-radius: 50%;
  border: 2px solid #000B1A;
  animation: pulse-glow 1.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(107, 231, 142, 0.6);
}

@keyframes pulse-glow {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
    box-shadow: 0 0 8px rgba(107, 231, 142, 0.6);
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.2);
    box-shadow: 0 0 16px rgba(107, 231, 142, 0.8);
  }
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #1e293b;
}

.session-title-edit {
  flex: 1;
}

.session-title-edit input {
  width: 100%;
  padding: 4px 8px;
  font-size: 13px;
  font-weight: 600;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 6px;
  outline: none;
  color: #1e293b;
}

.session-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.session-time {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}

.session-tokens {
  font-size: 10px;
  color: #b8a090;
  font-family: monospace;
  background: rgba(184, 160, 144, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

.session-item-3d.active .session-time {
  color: rgba(107, 231, 142, 0.8);
}

.session-item-3d.active .session-tokens {
  color: rgba(107, 231, 142, 0.7);
  background: rgba(107, 231, 142, 0.1);
}

/* 操作按钮 */
.session-actions {
  display: flex;
  gap: 4px;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}

.session-item-3d:hover .session-actions {
  opacity: 1;
}

.action-btn-3d {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.action-btn-3d:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.action-btn-3d.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* 3D 折叠按钮 */
/* Agent 标识 */
.agent-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  margin: 0 12px 12px;
  background: rgba(107, 231, 142, 0.05);
  border: 1px solid rgba(107, 231, 142, 0.1);
  border-radius: 100px;
}

.agent-dot {
  width: 8px;
  height: 8px;
  background: #6BE78E;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(107, 231, 142, 0.5);
}

.agent-label {
  font-size: 12px;
  font-weight: 500;
  color: #6BE78E;
}

/* 响应式 */
@media (max-width: 1024px) {
  .session-panel-3d {
    position: absolute;
    z-index: 100;
    height: 100%;
    box-shadow: 0 0 40px rgba(0, 0, 0, 0.1);
  }
}
</style>
