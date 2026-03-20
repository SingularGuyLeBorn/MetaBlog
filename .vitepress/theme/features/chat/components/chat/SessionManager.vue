<!--
  SessionManager - 会话管理模态框（液态玻璃风格）
  
  功能：
  - 显示所有会话（跨 Agent）
  - 搜索和过滤
  - 批量操作（删除）
  - 编辑会话信息
-->
<template>
  <Teleport to="body">
    <Transition name="manager-fade">
      <div v-if="visible" class="session-manager-overlay" @click.self="close">
        <Transition name="manager-scale">
          <div v-if="visible" class="session-manager-modal">
            <!-- 玻璃光效 -->
            <div class="manager-glow"></div>
            <div class="manager-shine"></div>
            
            <!-- 头部 -->
            <div class="manager-header">
              <div class="header-title">
                <div class="title-icon-wrapper">
                  <Icon name="message" :size="24" />
                </div>
                <div class="title-text">
                  <h3>会话管理</h3>
                  <span class="subtitle">{{ filteredSessions.length }} 个会话</span>
                </div>
              </div>
              <button class="close-btn" @click="close">
                <Icon name="close" :size="20" />
              </button>
            </div>

            <!-- 工具栏 -->
            <div class="manager-toolbar">
              <!-- 搜索 -->
              <div class="toolbar-search">
                <Icon name="search" :size="16" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索会话标题..."
                />
                <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">
                  <Icon name="close" :size="14" />
                </button>
              </div>

              <!-- 过滤器 -->
              <div class="toolbar-filters">
                <GlassSelect
                  v-model="agentFilter"
                  :options="agentOptions"
                  placeholder="全部 Agent"
                  size="small"
                />
                <GlassSelect
                  v-model="dateFilter"
                  :options="dateOptions"
                  placeholder="全部时间"
                  size="small"
                />
              </div>

              <!-- 批量操作 -->
              <div class="toolbar-actions">
                <button
                  v-if="selectedSessions.length > 0"
                  class="btn-batch-delete"
                  @click="confirmBatchDelete"
                >
                  <Icon name="trash" :size="14" />
                  删除选中 ({{ selectedSessions.length }})
                </button>
                <button class="btn-create" @click="createNewSession">
                  <Icon name="plus" :size="14" />
                  新建会话
                </button>
              </div>
            </div>

            <!-- 会话列表 -->
            <div class="manager-content">
              <!-- 表头 -->
              <div class="list-header">
                <label class="header-checkbox">
                  <input
                    type="checkbox"
                    :checked="isAllSelected"
                    @change="toggleSelectAll"
                  />
                  <span class="check-box"></span>
                </label>
                <span class="header-title-col">会话标题</span>
                <span class="header-agent-col">所属 Agent</span>
                <span class="header-time-col">最后更新</span>
                <span class="header-actions-col">操作</span>
              </div>

              <!-- 列表内容 -->
              <div class="list-body">
                <TransitionGroup name="list-item">
                  <div
                    v-for="session in filteredSessions"
                    :key="session.id"
                    class="session-row"
                    :class="{ 
                      active: currentSessionId === session.id,
                      selected: selectedSessions.includes(session.id)
                    }"
                  >
                    <label class="row-checkbox">
                      <input
                        type="checkbox"
                        :checked="selectedSessions.includes(session.id)"
                        @change="toggleSelect(session.id)"
                      />
                      <span class="check-box"></span>
                    </label>

                    <!-- 标题 -->
                    <div class="row-title">
                      <div v-if="editingId === session.id" class="title-edit">
                        <input
                          ref="editInputRef"
                          v-model="editingTitle"
                          type="text"
                          @keydown.enter="saveEdit"
                          @keydown.esc="cancelEdit"
                          @blur="saveEdit"
                        />
                      </div>
                      <div v-else class="title-text" @click="switchToSession(session.id)">
                        <Icon name="message" :size="14" />
                        <span>{{ session.title }}</span>
                        <span v-if="currentSessionId === session.id" class="current-badge">当前</span>
                      </div>
                    </div>

                    <!-- Agent -->
                    <div class="row-agent">
                      <span class="agent-badge" :class="getAgentById(getSessionAgentId(session))?.status">
                        {{ getAgentById(getSessionAgentId(session))?.avatar || '🤖' }}
                        {{ getAgentById(getSessionAgentId(session))?.name || '未分配' }}
                      </span>
                    </div>

                    <!-- 时间 -->
                    <div class="row-time">
                      {{ formatDateTime(session.updatedAt) }}
                    </div>

                    <!-- 操作 -->
                    <div class="row-actions">
                      <button
                        class="action-btn"
                        title="重命名"
                        @click="startEdit(session)"
                      >
                        <Icon name="edit" :size="14" />
                      </button>
                      <button
                        class="action-btn switch"
                        title="切换到该会话"
                        @click="switchToSession(session.id)"
                      >
                        <Icon name="arrow-right" :size="14" />
                      </button>
                      <button
                        class="action-btn delete"
                        title="删除"
                        @click="confirmDelete(session)"
                      >
                        <Icon name="trash" :size="14" />
                      </button>
                    </div>
                  </div>
                </TransitionGroup>

                <!-- 空状态 -->
                <div v-if="filteredSessions.length === 0" class="empty-state">
                  <div class="empty-icon">🔍</div>
                  <p>没有找到匹配的会话</p>
                  <button v-if="hasFilters" class="btn-clear" @click="clearFilters">
                    清除筛选条件
                  </button>
                </div>
              </div>
            </div>

            <!-- 底部统计 -->
            <div class="manager-footer">
              <div class="footer-stats">
                <span>共 {{ sessions.length }} 个会话</span>
                <span class="divider">|</span>
                <span>当前 Agent: {{ currentAgent?.name || '未选择' }}</span>
              </div>
            </div>
          </div>
        </Transition>

        <!-- 删除确认弹窗 -->
        <Transition name="confirm-fade">
          <div v-if="showDeleteConfirm" class="confirm-overlay" @click.self="cancelDelete">
            <div class="confirm-modal">
              <div class="confirm-icon">⚠️</div>
              <h4>{{ isBatchDelete ? `确认删除 ${sessionsToDelete.length} 个会话?` : '确认删除会话?' }}</h4>
              <p>删除后无法恢复，会话中的所有消息都将被清除</p>
              <div class="confirm-actions">
                <button class="btn-cancel" @click="cancelDelete">取消</button>
                <button class="btn-confirm" @click="executeDelete">确认删除</button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Icon } from '../../../ui'
import GlassSelect from '../../agent/admin/GlassSelect.vue'
import type { ChatSession } from '../../../core/types'
import type { Agent } from '../../../core/types/agent'

const props = defineProps<{
  visible: boolean
  sessions: ChatSession[]
  agents: Agent[]
  currentSessionId: string | null
  currentAgent: Agent | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'create': []
  'switch': [sessionId: string]
  'rename': [sessionId: string, newTitle: string]
  'delete': [sessionIds: string[]]
}>()

// 搜索和过滤
const searchQuery = ref('')
const agentFilter = ref('')
const dateFilter = ref('')

// 选择状态
const selectedSessions = ref<string[]>([])

// 编辑状态
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const editInputRef = ref<HTMLInputElement>()

// 删除确认
const showDeleteConfirm = ref(false)
const sessionsToDelete = ref<string[]>([])
const isBatchDelete = computed(() => sessionsToDelete.value.length > 1)

// Agent 选项
const agentOptions = computed(() => [
  { value: '', label: '全部 Agent', subLabel: `${props.sessions.length} 个会话` },
  ...props.agents.map(agent => ({
    value: agent.id,
    label: agent.name,
    subLabel: `${countSessionsByAgent(agent.id)} 个会话`
  }))
])

// 时间选项
const dateOptions = [
  { value: '', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: 'yesterday', label: '昨天' },
  { value: 'week', label: '最近7天' },
  { value: 'month', label: '最近30天' }
]

// 过滤后的会话
const filteredSessions = computed(() => {
  let result = [...props.sessions]

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s => s.title.toLowerCase().includes(query))
  }

  // Agent 过滤
  if (agentFilter.value) {
    result = result.filter(s => getSessionAgentId(s) === agentFilter.value)
  }

  // 时间过滤
  if (dateFilter.value) {
    const now = Date.now()
    const oneDay = 24 * 60 * 60 * 1000
    
    switch (dateFilter.value) {
      case 'today':
        result = result.filter(s => isToday(s.updatedAt))
        break
      case 'yesterday':
        result = result.filter(s => isYesterday(s.updatedAt))
        break
      case 'week':
        result = result.filter(s => now - s.updatedAt < 7 * oneDay)
        break
      case 'month':
        result = result.filter(s => now - s.updatedAt < 30 * oneDay)
        break
    }
  }

  // 按时间倒序
  return result.sort((a, b) => b.updatedAt - a.updatedAt)
})

// 全选状态
const isAllSelected = computed(() => {
  if (filteredSessions.value.length === 0) return false
  return filteredSessions.value.every(s => selectedSessions.value.includes(s.id))
})

// 是否有筛选条件
const hasFilters = computed(() => {
  return searchQuery.value || agentFilter.value || dateFilter.value
})

// 方法
function close() {
  emit('update:visible', false)
  clearSelection()
  clearFilters()
}

function clearFilters() {
  searchQuery.value = ''
  agentFilter.value = ''
  dateFilter.value = ''
}

function clearSelection() {
  selectedSessions.value = []
}

function toggleSelectAll() {
  if (isAllSelected.value) {
    // 取消全选
    const filteredIds = filteredSessions.value.map(s => s.id)
    selectedSessions.value = selectedSessions.value.filter(id => !filteredIds.includes(id))
  } else {
    // 全选
    const filteredIds = filteredSessions.value.map(s => s.id)
    selectedSessions.value = [...new Set([...selectedSessions.value, ...filteredIds])]
  }
}

function toggleSelect(sessionId: string) {
  const index = selectedSessions.value.indexOf(sessionId)
  if (index > -1) {
    selectedSessions.value.splice(index, 1)
  } else {
    selectedSessions.value.push(sessionId)
  }
}

function countSessionsByAgent(agentId: string): number {
  return props.sessions.filter(s => getSessionAgentId(s) === agentId).length
}

function getSessionAgentId(session: ChatSession): string {
  return (session.config as any)?.agentId || ''
}

function getAgentById(agentId: string): Agent | undefined {
  return props.agents.find(a => a.id === agentId)
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function isToday(timestamp: number): boolean {
  const date = new Date(timestamp)
  const now = new Date()
  return date.toDateString() === now.toDateString()
}

function isYesterday(timestamp: number): boolean {
  const date = new Date(timestamp)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return date.toDateString() === yesterday.toDateString()
}

function createNewSession() {
  emit('create')
  close()
}

function switchToSession(sessionId: string) {
  emit('switch', sessionId)
  close()
}

function startEdit(session: ChatSession) {
  editingId.value = session.id
  editingTitle.value = session.title
  nextTick(() => {
    editInputRef.value?.focus()
    editInputRef.value?.select()
  })
}

function saveEdit() {
  if (editingId.value && editingTitle.value.trim()) {
    emit('rename', editingId.value, editingTitle.value.trim())
  }
  editingId.value = null
  editingTitle.value = ''
}

function cancelEdit() {
  editingId.value = null
  editingTitle.value = ''
}

function confirmDelete(session: ChatSession) {
  sessionsToDelete.value = [session.id]
  showDeleteConfirm.value = true
}

function confirmBatchDelete() {
  sessionsToDelete.value = [...selectedSessions.value]
  showDeleteConfirm.value = true
}

function cancelDelete() {
  showDeleteConfirm.value = false
  sessionsToDelete.value = []
}

function executeDelete() {
  if (sessionsToDelete.value.length > 0) {
    emit('delete', sessionsToDelete.value)
    selectedSessions.value = selectedSessions.value.filter(id => !sessionsToDelete.value.includes(id))
  }
  cancelDelete()
}
</script>

<style scoped lang="scss">
/* ===== 遮罩层 ===== */
.session-manager-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

/* ===== 模态框 - 液态玻璃 ===== */
.session-manager-modal {
  position: relative;
  width: 100%;
  max-width: 900px;
  height: 80vh;
  max-height: 700px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 28px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 
    0 32px 64px rgba(31, 38, 135, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.6);
}

.manager-glow {
  position: absolute;
  top: -100px;
  right: -100px;
  width: 300px;
  height: 300px;
  background: radial-gradient(
    circle,
    rgba(59, 130, 246, 0.1) 0%,
    transparent 70%
  );
  pointer-events: none;
}

.manager-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 60%
  );
  pointer-events: none;
}

/* ===== 头部 ===== */
.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon-wrapper {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 14px;
  color: #3b82f6;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
}

.title-text h3 {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.subtitle {
  font-size: 13px;
  color: #64748b;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* ===== 工具栏 ===== */
.manager-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 28px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.toolbar-search {
  flex: 1;
  max-width: 280px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  color: #94a3b8;
  transition: all 0.3s ease;
}

.toolbar-search:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.toolbar-search input {
  flex: 1;
  background: transparent;
  border: none;
  font-size: 14px;
  color: #1e293b;
  outline: none;
}

.clear-search {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(148, 163, 184, 0.2);
  border: none;
  border-radius: 50%;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-search:hover {
  background: rgba(148, 163, 184, 0.3);
  color: #475569;
}

.toolbar-filters {
  display: flex;
  gap: 12px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}

.btn-batch-delete {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-batch-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  transform: translateY(-1px);
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #6366f1, #3b82f6);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 10px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-create:hover {
  transform: translateY(-1px);
  background: linear-gradient(135deg, #4f46e5, #2563eb);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

/* ===== 内容区 ===== */
.manager-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: grid;
  grid-template-columns: 40px 1fr 140px 140px 120px;
  gap: 12px;
  align-items: center;
  padding: 12px 28px;
  background: rgba(241, 245, 249, 0.5);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.list-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
}

/* ===== 会话行 ===== */
.session-row {
  display: grid;
  grid-template-columns: 40px 1fr 140px 140px 120px;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid transparent;
  border-radius: 12px;
  margin-bottom: 4px;
  transition: all 0.3s ease;
}

.session-row:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(59, 130, 246, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.session-row.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(99, 102, 241, 0.04));
  border-color: rgba(59, 130, 246, 0.3);
}

.session-row.selected {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(59, 130, 246, 0.4);
}

/* 复选框 */
.header-checkbox,
.row-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-checkbox input,
.row-checkbox input {
  position: absolute;
  opacity: 0;
}

.check-box {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.header-checkbox input:checked + .check-box,
.row-checkbox input:checked + .check-box {
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-color: transparent;
}

.header-checkbox input:checked + .check-box::after,
.row-checkbox input:checked + .check-box::after {
  content: '✓';
  color: white;
  font-size: 11px;
  font-weight: 700;
}

/* 标题列 */
.row-title {
  min-width: 0;
}

.title-text {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #1e293b;
  font-weight: 500;
}

.title-text span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-badge {
  padding: 2px 8px;
  background: linear-gradient(135deg, #3b82f6, #6366f1);
  border-radius: 100px;
  color: white;
  font-size: 10px;
  font-weight: 600;
  flex-shrink: 0;
}

.title-edit input {
  width: 100%;
  padding: 6px 10px;
  background: white;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  color: #1e293b;
}

/* Agent 列 */
.agent-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(241, 245, 249, 0.8);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
  color: #475569;
}

.agent-badge.online {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

/* 操作列 */
.row-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.action-btn.switch:hover {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.action-btn.delete:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

/* ===== 空状态 ===== */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-state p {
  font-size: 15px;
  color: #64748b;
  margin: 0 0 16px;
}

.btn-clear {
  padding: 10px 20px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 10px;
  color: #6366f1;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-clear:hover {
  background: rgba(99, 102, 241, 0.2);
}

/* ===== 底部 ===== */
.manager-footer {
  padding: 16px 28px;
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.footer-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
}

.divider {
  color: #cbd5e1;
}

/* ===== 删除确认弹窗 ===== */
.confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.confirm-modal {
  background: white;
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  max-width: 360px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-modal h4 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
}

.confirm-modal p {
  font-size: 14px;
  color: #64748b;
  margin: 0 0 24px;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel {
  padding: 12px 24px;
  background: #f1f5f9;
  border: none;
  border-radius: 10px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-confirm {
  padding: 12px 24px;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-confirm:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

/* ===== 过渡动画 ===== */
.manager-fade-enter-active,
.manager-fade-leave-active {
  transition: opacity 0.3s ease;
}

.manager-fade-enter-from,
.manager-fade-leave-to {
  opacity: 0;
}

.manager-scale-enter-active {
  transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.manager-scale-leave-active {
  transition: all 0.3s ease;
}

.manager-scale-enter-from {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.manager-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.list-item-enter-active,
.list-item-leave-active {
  transition: all 0.3s ease;
}

.list-item-enter-from,
.list-item-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .session-manager-modal {
    max-width: 100%;
    height: 100vh;
    max-height: 100vh;
    border-radius: 0;
  }
  
  .manager-toolbar {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .toolbar-search {
    max-width: 100%;
    width: 100%;
  }
  
  .toolbar-filters {
    width: 100%;
  }
  
  .list-header {
    display: none;
  }
  
  .session-row {
    grid-template-columns: 40px 1fr 40px;
    gap: 8px;
    padding: 16px;
  }
  
  .row-agent,
  .row-time {
    display: none;
  }
}
</style>
