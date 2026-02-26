<!--
  SessionPanel - 会话列表面板（3D 液态玻璃风格）
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
              <div class="session-time">
                {{ streamingIds.includes(session.id) ? '生成中...' : formatTime(session.updatedAt) }}
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
import { ref, computed, nextTick } from 'vue'
import { Icon } from '../../../ui'
import type { ChatSession } from '../../../core/types'

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
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-right: 1px solid rgba(226, 232, 240, 0.8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.session-panel-3d.collapsed {
  width: 0;
}

/* 背景光效 */
.panel-glow {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 0% 0%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 100% 100%, rgba(139, 92, 246, 0.06) 0%, transparent 50%);
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
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.4),
    0 8px 24px rgba(59, 130, 246, 0.2);
  transform-style: preserve-3d;
}

.btn-new-chat-3d:hover {
  transform: translateY(-2px) rotateX(5deg);
  box-shadow: 
    0 8px 20px rgba(59, 130, 246, 0.5),
    0 16px 40px rgba(59, 130, 246, 0.3);
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
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  color: #94a3b8;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.search-box-3d:focus-within {
  border-color: #3b82f6;
  box-shadow: 
    0 0 0 3px rgba(59, 130, 246, 0.1),
    0 4px 12px rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
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
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.manage-all-btn:hover {
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  border-color: #3b82f6;
  color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
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
  color: #64748b;
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
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 14px;
  cursor: pointer;
  color: #475569;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
  position: relative;
}

.session-item-3d:hover {
  background: linear-gradient(145deg, #ffffff, #eff6ff);
  border-color: rgba(59, 130, 246, 0.3);
  color: #1e293b;
  transform: translateY(-1px);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(59, 130, 246, 0.1);
}

.session-item-3d.active {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #3b82f6;
  color: #1d4ed8;
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.2),
    0 0 0 1px rgba(59, 130, 246, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.session-item-3d.active :deep(.icon) {
  color: #3b82f6;
}

.session-item-3d.streaming {
  border-color: rgba(16, 185, 129, 0.4);
  background: linear-gradient(145deg, #ffffff, #f0fdf4);
}

/* 会话图标 */
.session-icon-3d {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border-radius: 10px;
  transition: all 0.3s ease;
}

.session-item-3d:hover .session-icon-3d {
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  transform: scale(1.1);
}

.session-item-3d.active .session-icon-3d {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.session-item-3d.active .session-icon-3d :deep(.icon) {
  color: white;
}

/* 流式生成指示器 */
.streaming-dot-3d {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #10b981, #34d399);
  border-radius: 50%;
  border: 2px solid #f8fafc;
  animation: pulse-glow 1.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
}

@keyframes pulse-glow {
  0%, 100% { 
    opacity: 1; 
    transform: scale(1);
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
  }
  50% { 
    opacity: 0.7; 
    transform: scale(1.2);
    box-shadow: 0 0 16px rgba(16, 185, 129, 0.8);
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

.session-time {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
  font-weight: 500;
}

.session-item-3d.active .session-time {
  color: #60a5fa;
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
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.action-btn-3d:hover {
  background: #f1f5f9;
  color: #334155;
  border-color: #cbd5e1;
}

.action-btn-3d.delete:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}

/* 3D 折叠按钮 */
/* Agent 标识 */
.agent-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  margin: 0 12px 12px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1));
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 100px;
}

.agent-dot {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.5);
}

.agent-label {
  font-size: 12px;
  font-weight: 500;
  color: #6366f1;
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
