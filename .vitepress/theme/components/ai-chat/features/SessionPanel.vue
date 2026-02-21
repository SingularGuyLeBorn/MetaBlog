<!--
  SessionPanel - 会话列表面板
-->
<template>
  <aside class="session-panel" :class="{ collapsed }">
    <div class="panel-header">
      <Button variant="primary" block @click="$emit('create')">
        <Icon name="plus" :size="16" />
        <span>新对话</span>
      </Button>
    </div>

    <div class="search-box">
      <Icon name="search" :size="16" />
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="搜索会话..."
        class="search-input"
      >
    </div>

    <div class="session-list ai-scroll">
      <div v-for="group in filteredGroups" :key="group.label" class="session-group">
        <div class="group-header">{{ group.label }}</div>
        <div
          v-for="session in group.sessions"
          :key="session.id"
          class="session-item"
          :class="{ 
            active: currentId === session.id,
            streaming: streamingIds.includes(session.id)
          }"
          @click="$emit('switch', session.id)"
        >
          <div class="session-icon">
            <Icon name="message" :size="16" />
            <span v-if="streamingIds.includes(session.id)" class="streaming-dot" />
          </div>
          <div class="session-info">
            <div class="session-title">{{ session.title }}</div>
            <div class="session-time">
              {{ streamingIds.includes(session.id) ? '生成中...' : formatTime(session.updatedAt) }}
            </div>
          </div>
          <div class="session-actions" @click.stop>
            <button class="action-btn" @click="$emit('rename', session.id)">
              <Icon name="edit" :size="14" />
            </button>
            <button class="action-btn delete" @click="$emit('delete', session.id)">
              <Icon name="trash" :size="14" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <button class="collapse-btn" @click="$emit('toggle-collapse')">
      <Icon :name="collapsed ? 'chevron-right' : 'chevron-down'" :size="16" />
    </button>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button, Icon } from '../ui'
import type { ChatSession } from '../composables/types'

interface Props {
  sessions: ChatSession[]
  currentId: string | null
  collapsed: boolean
  streamingIds?: string[]  // 正在生成的会话ID列表
}

const props = withDefaults(defineProps<Props>(), {
  streamingIds: () => []
})

defineEmits<{
  create: []
  switch: [id: string]
  rename: [id: string]
  delete: [id: string]
  'toggle-collapse': []
}>()

const searchQuery = ref('')

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
</script>

<style scoped>

.session-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--ai-bg-sidebar);
  border-right: 1px solid var(--ai-border-light);
  transition: all var(--ai-transition-normal);
}

.session-panel.collapsed {
  width: 0;
  overflow: hidden;
}

.panel-header {
  padding: var(--ai-space-4);
  border-bottom: 1px solid var(--ai-border-light);
}

.search-box {
  display: flex;
  align-items: center;
  gap: var(--ai-space-2);
  margin: var(--ai-space-3) var(--ai-space-4);
  padding: var(--ai-space-2) var(--ai-space-3);
  background: var(--ai-gray-100);
  border-radius: var(--ai-radius-md);
  color: var(--ai-text-tertiary);
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 13px;
  color: var(--ai-text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--ai-text-muted);
}

.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--ai-space-3);
}

.session-group {
  margin-bottom: var(--ai-space-4);
}

.group-header {
  padding: var(--ai-space-2) var(--ai-space-3);
  font-size: 11px;
  font-weight: 600;
  color: var(--ai-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: var(--ai-space-3);
  padding: var(--ai-space-3);
  margin-bottom: var(--ai-space-1);
  border-radius: var(--ai-radius-md);
  cursor: pointer;
  color: var(--ai-text-secondary);
  transition: all var(--ai-transition-fast);
}

.session-item:hover {
  background: var(--ai-bg-hover);
  color: var(--ai-text-primary);
}

.session-item.active {
  background: var(--ai-bg-active);
  color: var(--ai-primary-600);
}

.session-item :deep(.icon) {
  color: var(--ai-text-muted);
}

.session-item.active :deep(.icon) {
  color: var(--ai-primary-600);
}

.session-icon {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.streaming-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  border: 2px solid var(--ai-bg-sidebar);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.1); }
}

.session-info {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 11px;
  color: var(--ai-text-muted);
  margin-top: 2px;
}

.session-actions {
  display: flex;
  gap: var(--ai-space-1);
  opacity: 0;
  transition: opacity var(--ai-transition-fast);
}

.session-item:hover .session-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-sm);
  color: var(--ai-text-muted);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.action-btn:hover {
  background: var(--ai-gray-200);
  color: var(--ai-text-primary);
}

.action-btn.delete:hover {
  background: #fee2e2;
  color: #ef4444;
}

.collapse-btn {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ai-bg-sidebar);
  border: 1px solid var(--ai-border-light);
  border-radius: 0 var(--ai-radius-md) var(--ai-radius-md) 0;
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
}

.collapse-btn:hover {
  background: var(--ai-bg-hover);
  color: var(--ai-text-primary);
}
</style>
