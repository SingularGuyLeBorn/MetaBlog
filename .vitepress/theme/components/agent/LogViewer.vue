<template>
  <div class="log-viewer">
    <!-- Header -->
    <div class="viewer-header">
      <h3 class="viewer-title">
        <span class="title-icon">📋</span>
        日志查看器
      </h3>
      <div class="header-actions">
        <button class="btn-action" @click="refreshLogs" title="刷新">
          🔄
        </button>
        <button class="btn-action" @click="exportLogs" title="导出">
          📥
        </button>
        <button class="btn-action danger" @click="confirmClear" title="清空">
          🗑️
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">总日志数</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">{{ stats.byLevel.info || 0 }}</div>
        <div class="stat-label">信息</div>
      </div>
      <div class="stat-card warn">
        <div class="stat-value">{{ stats.byLevel.warn || 0 }}</div>
        <div class="stat-label">警告</div>
      </div>
      <div class="stat-card error">
        <div class="stat-value">{{ stats.byLevel.error || 0 }}</div>
        <div class="stat-label">错误</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="filter-group">
        <input
          v-model="filters.search"
          type="text"
          placeholder="搜索日志..."
          class="filter-input"
        />
      </div>
      <div class="filter-group">
        <select v-model="filters.level" class="filter-select">
          <option value="">所有级别</option>
          <option value="debug">Debug</option>
          <option value="info">Info</option>
          <option value="warn">Warn</option>
          <option value="error">Error</option>
        </select>
      </div>
      <div class="filter-group">
        <select v-model="filters.event" class="filter-select">
          <option value="">所有事件</option>
          <option v-for="event in uniqueEvents" :key="event" :value="event">
            {{ event }}
          </option>
        </select>
      </div>
      <div class="filter-group">
        <button 
          class="btn-toggle" 
          :class="{ active: autoRefresh }"
          @click="autoRefresh = !autoRefresh"
        >
          {{ autoRefresh ? '⏸️' : '▶️' }} 自动刷新
        </button>
      </div>
    </div>

    <!-- Log List -->
    <div class="log-list" ref="logListRef">
      <div v-if="filteredLogs.length === 0" class="empty-state">
        <div class="empty-icon">📭</div>
        <div class="empty-text">暂无日志</div>
      </div>
      
      <div
        v-for="log in filteredLogs"
        :key="log.id"
        class="log-item"
        :class="[`level-${log.level}`, { expanded: expandedLog === log.id }]"
        @click="toggleExpand(log.id)"
      >
        <div class="log-header">
          <span class="log-time">{{ formatTime(log.timestamp) }}</span>
          <span class="log-level" :class="log.level">{{ log.level.toUpperCase() }}</span>
          <span class="log-event">{{ log.event }}</span>
          <span class="log-message">{{ log.message }}</span>
          <span v-if="log.taskId" class="log-task">📋 {{ log.taskId.slice(-6) }}</span>
        </div>
        
        <div v-if="expandedLog === log.id" class="log-details">
          <div class="detail-row">
            <span class="detail-label">ID:</span>
            <span class="detail-value">{{ log.id }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Session:</span>
            <span class="detail-value">{{ log.sessionId }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Trace:</span>
            <span class="detail-value">{{ log.traceId }}</span>
          </div>
          <div v-if="log.taskId" class="detail-row">
            <span class="detail-label">Task:</span>
            <span class="detail-value">{{ log.taskId }}</span>
          </div>
          <div v-if="log.skillName" class="detail-row">
            <span class="detail-label">Skill:</span>
            <span class="detail-value">{{ log.skillName }}</span>
          </div>
          <div v-if="log.duration" class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">{{ log.duration }}ms</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Source:</span>
            <span class="detail-value">{{ log.source }}</span>
          </div>
          <div v-if="Object.keys(log.data).length > 0" class="detail-row">
            <span class="detail-label">Data:</span>
            <pre class="detail-code">{{ JSON.stringify(log.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="pagination" v-if="totalPages > 1">
      <button 
        class="page-btn" 
        :disabled="currentPage === 1"
        @click="currentPage--"
      >
        ←
      </button>
      <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
      <button 
        class="page-btn" 
        :disabled="currentPage === totalPages"
        @click="currentPage++"
      >
        →
      </button>
    </div>

    <!-- Clear Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showClearModal" class="modal-overlay" @click="showClearModal = false">
          <div class="modal-content modal-small" @click.stop>
            <div class="modal-header">
              <h4>⚠️ 确认清空</h4>
            </div>
            <div class="modal-body">
              <p>确定要清空所有日志吗？</p>
              <p class="warning-text">此操作不可恢复！</p>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showClearModal = false">取消</button>
              <button class="btn-danger" @click="clearLogs">确认清空</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getEnhancedLogger, type EnhancedLogEntry, type LogStats } from '../../../agent/runtime/EnhancedLogger'

// ==================== State ====================
const logger = getEnhancedLogger()
const logs = ref<EnhancedLogEntry[]>([])
const stats = ref<LogStats>({
  total: 0,
  byLevel: { debug: 0, info: 0, warn: 0, error: 0 },
  byEvent: {},
  byTask: {},
  byDay: {},
  recentErrors: []
})

const filters = ref({
  search: '',
  level: '',
  event: '',
  skillName: ''
})

const expandedLog = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = 50
const autoRefresh = ref(true)
const showClearModal = ref(false)
const logListRef = ref<HTMLElement>()

let refreshInterval: number | null = null

// ==================== Computed ====================
const filteredLogs = computed(() => {
  let result = logger.getLogs({
    level: filters.value.level as any,
    event: filters.value.event || undefined,
    skillName: filters.value.skillName || undefined,
    search: filters.value.search || undefined
  })
  
  // Pagination
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return result.slice(start, end)
})

const totalPages = computed(() => {
  const filter = {
    level: filters.value.level as any,
    event: filters.value.event || undefined,
    skillName: filters.value.skillName || undefined,
    search: filters.value.search || undefined
  }
  const total = logger.getLogs(filter).length
  return Math.ceil(total / pageSize)
})

const uniqueEvents = computed(() => {
  const events = new Set<string>()
  logs.value.forEach(l => events.add(l.event))
  return Array.from(events).sort()
})

// ==================== Methods ====================
function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function toggleExpand(logId: string) {
  expandedLog.value = expandedLog.value === logId ? null : logId
}

function refreshLogs() {
  logs.value = logger.getLogs()
  stats.value = logger.getStats()
}

function exportLogs() {
  const json = logger.exportLogs('json')
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `metablog-logs-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function confirmClear() {
  showClearModal.value = true
}

function clearLogs() {
  logger.clear()
  refreshLogs()
  showClearModal.value = false
}

// ==================== Lifecycle ====================
onMounted(() => {
  refreshLogs()
  
  // Auto refresh every 3 seconds
  refreshInterval = window.setInterval(() => {
    if (autoRefresh.value) {
      refreshLogs()
    }
  }, 3000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Reset page when filters change
watch(filters, () => {
  currentPage.value = 1
}, { deep: true })
</script>

<style scoped>
.log-viewer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafaf9;
}

/* Header */
.viewer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e7e5e4;
  background: white;
}

.viewer-title {
  font-size: 16px;
  font-weight: 600;
  color: #292524;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 18px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: #f5f5f4;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #e7e5e4;
}

.btn-action.danger:hover {
  background: #fee2e2;
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #f5f5f4;
}

.stat-card {
  padding: 12px;
  background: #f5f5f4;
  border-radius: 8px;
  text-align: center;
}

.stat-card.info {
  background: #dbeafe;
}

.stat-card.warn {
  background: #fef3c7;
}

.stat-card.error {
  background: #fee2e2;
}

.stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #292524;
}

.stat-label {
  font-size: 12px;
  color: #78716c;
  margin-top: 4px;
}

/* Filters */
.filter-bar {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #f5f5f4;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
}

.filter-input,
.filter-select {
  padding: 8px 12px;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  font-size: 13px;
  background: #fafaf9;
  min-width: 150px;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #94a3b8;
  background: white;
}

.btn-toggle {
  padding: 8px 12px;
  border: 1px solid #e7e5e4;
  border-radius: 6px;
  font-size: 13px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-toggle.active {
  background: #dcfce7;
  border-color: #86efac;
  color: #166534;
}

/* Log List */
.log-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-item {
  background: white;
  border-radius: 8px;
  margin-bottom: 4px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}

.log-item:hover {
  background: #f5f5f4;
}

.log-item.level-debug {
  border-left-color: #9ca3af;
}

.log-item.level-info {
  border-left-color: #3b82f6;
}

.log-item.level-warn {
  border-left-color: #f59e0b;
}

.log-item.level-error {
  border-left-color: #dc2626;
}

.log-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  font-size: 13px;
}

.log-time {
  color: #a8a29e;
  font-family: monospace;
  font-size: 12px;
  min-width: 70px;
}

.log-level {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  min-width: 45px;
  text-align: center;
}

.log-level.debug {
  background: #f3f4f6;
  color: #6b7280;
}

.log-level.info {
  background: #dbeafe;
  color: #1e40af;
}

.log-level.warn {
  background: #fef3c7;
  color: #92400e;
}

.log-level.error {
  background: #fee2e2;
  color: #991b1b;
}

.log-event {
  padding: 2px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  color: #475569;
  font-size: 11px;
  font-weight: 500;
}

.log-message {
  flex: 1;
  color: #292524;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-task {
  font-size: 11px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
}

/* Log Details */
.log-details {
  padding: 12px 16px;
  background: #fafaf9;
  border-top: 1px solid #f5f5f4;
  font-size: 12px;
}

.detail-row {
  display: flex;
  margin-bottom: 8px;
}

.detail-label {
  width: 80px;
  color: #78716c;
  flex-shrink: 0;
}

.detail-value {
  color: #292524;
  font-family: monospace;
}

.detail-code {
  background: #f5f5f4;
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 11px;
  margin: 8px 0 0 0;
}

/* Empty State */
.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #a8a29e;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-top: 1px solid #f5f5f4;
  background: white;
}

.page-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e7e5e4;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  background: #f5f5f4;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: #57534e;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-small {
  max-width: 320px;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f4;
}

.modal-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #292524;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 0 0 8px 0;
  color: #57534e;
}

.warning-text {
  color: #dc2626;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #f5f5f4;
  background: #fafaf9;
}

.btn-secondary,
.btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f5f5f4;
  color: #57534e;
}

.btn-secondary:hover {
  background: #e7e5e4;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}
</style>
