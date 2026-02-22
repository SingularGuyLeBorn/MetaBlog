<!--
  LogDashboard - 日志监控面板
  
  功能：
  1. 实时日志流
  2. 对话链路可视化
  3. 组件生命周期追踪
  4. 搜索和筛选
  5. 性能统计
-->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="log-dashboard-overlay" @click.self="close">
        <div class="log-dashboard-panel">
          <!-- 头部 -->
          <div class="dashboard-header">
            <div class="header-title">
              <span class="title-icon">📊</span>
              <h3>系统日志监控</h3>
              <span v-if="isRecording" class="recording-badge">● 录制中</span>
            </div>
            <div class="header-actions">
              <button class="action-btn" @click="clearAllLogs" title="清空日志">
                🗑️
              </button>
              <button class="action-btn" @click="exportLogs" title="导出日志">
                📥
              </button>
              <button class="close-btn" @click="close">✕</button>
            </div>
          </div>
          
          <!-- 统计卡片 -->
          <div class="stats-bar">
            <div class="stat-card">
              <div class="stat-value">{{ totalLogs }}</div>
              <div class="stat-label">总日志</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ todayLogs }}</div>
              <div class="stat-label">今日</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ errorCount }}</div>
              <div class="stat-label">错误</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ activeTraces }}</div>
              <div class="stat-label">进行中</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">{{ avgResponseTime }}ms</div>
              <div class="stat-label">平均响应</div>
            </div>
          </div>
          
          <!-- 主内容区 -->
          <div class="dashboard-body">
            <!-- 左侧：筛选器 -->
            <div class="filter-sidebar">
              <div class="filter-section">
                <h4>🔍 搜索</h4>
                <input
                  v-model="filter.keyword"
                  type="text"
                  placeholder="搜索关键词..."
                  class="search-input"
                  @input="applyFilter"
                />
              </div>
              
              <div class="filter-section">
                <h4>📂 类别</h4>
                <label v-for="cat in categories" :key="cat" class="filter-checkbox">
                  <input
                    v-model="filter.categories"
                    type="checkbox"
                    :value="cat"
                    @change="applyFilter"
                  />
                  <span>{{ categoryLabels[cat] }}</span>
                </label>
              </div>
              
              <div class="filter-section">
                <h4>⚠️ 级别</h4>
                <select v-model="filter.level" @change="applyFilter" class="filter-select">
                  <option value="">全部</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
              </div>
              
              <div class="filter-section">
                <h4>🔧 组件</h4>
                <select v-model="filter.component" @change="applyFilter" class="filter-select">
                  <option value="">全部组件</option>
                  <option v-for="comp in uniqueComponents" :key="comp" :value="comp">
                    {{ comp }}
                  </option>
                </select>
              </div>
              
              <button class="btn-reset" @click="resetFilter">重置筛选</button>
            </div>
            
            <!-- 中间：日志列表 -->
            <div class="logs-panel">
              <div class="logs-header">
                <span>日志列表 ({{ filteredLogs.length }})</span>
                <div class="logs-actions">
                  <button :class="['toggle-btn', { active: autoScroll }]" @click="autoScroll = !autoScroll">
                    {{ autoScroll ? '⏸️' : '▶️' }} 自动滚动
                  </button>
                </div>
              </div>
              
              <div ref="logsContainer" class="logs-list" @scroll="handleScroll">
                <div
                  v-for="log in filteredLogs"
                  :key="log.id"
                  :class="['log-item', log.level, { expanded: expandedLogs.has(log.id) }]"
                  @click="toggleLog(log.id)"
                >
                  <div class="log-header">
                    <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                    <span :class="['log-level', log.level]">{{ log.level.toUpperCase() }}</span>
                    <span :class="['log-category', log.category]">{{ categoryLabels[log.category] }}</span>
                    <span v-if="log.component" class="log-component">{{ log.component }}</span>
                    <span class="log-message">{{ log.message }}</span>
                  </div>
                  
                  <div v-if="expandedLogs.has(log.id) && log.data" class="log-detail">
                    <pre>{{ JSON.stringify(log.data, null, 2) }}</pre>
                  </div>
                </div>
                
                <div v-if="filteredLogs.length === 0" class="empty-logs">
                  暂无日志
                </div>
              </div>
            </div>
            
            <!-- 右侧：日志详情 -->
            <div class="traces-panel">
              <div class="panel-header">
                <h4>📋 日志详情</h4>
              </div>
              
              <div class="log-detail-placeholder">
                <p>点击左侧日志查看详情</p>
                <div class="log-stats-summary">
                  <div class="summary-item">
                    <span class="summary-label">总日志数:</span>
                    <span class="summary-value">{{ totalLogs }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">今日日志:</span>
                    <span class="summary-value">{{ todayLogs }}</span>
                  </div>
                  <div class="summary-item">
                    <span class="summary-label">错误数:</span>
                    <span class="summary-value" :class="{ 'text-error': errorCount > 0 }">
                      {{ errorCount }}
                    </span>
                  </div>
                </div>
                
                <div v-if="uniqueComponents.length > 0" class="components-list">
                  <h5>活跃组件</h5>
                  <div class="component-tags">
                    <span 
                      v-for="comp in uniqueComponents.slice(0, 10)" 
                      :key="comp"
                      class="component-tag"
                      @click="filter.component = comp"
                    >
                      {{ comp }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { 
  logger, 
  loadLogs, 
  loadStats, 
  clearLogs as clearServerLogs,
  exportLogs as exportServerLogs,
  type LogEntry, 
  type LogLevel, 
  type LogCategory 
} from '../../../core/services/logger'
import TraceNode from './TraceNode.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

// ==================== 状态 ====================
const logsContainer = ref<HTMLElement>()
const autoScroll = ref(true)
const expandedLogs = ref(new Set<string>())
const isLoading = ref(false)
const refreshTimer = ref<number | null>(null)

const filter = ref({
  keyword: '',
  categories: [] as LogCategory[],
  level: '' as LogLevel | '',
  component: ''
})

// ==================== 常量 ====================
const categories: LogCategory[] = ['lifecycle', 'chat', 'tool', 'api', 'error', 'performance']

const categoryLabels: Record<LogCategory | string, string> = {
  lifecycle: '生命周期',
  chat: '对话',
  tool: '工具',
  api: 'API',
  error: '错误',
  performance: '性能'
}

// ==================== 计算属性 ====================
const isRecording = computed(() => logger.isRecording.value)
const allLogs = computed(() => logger.logs.value)
const serverStats = computed(() => logger.stats.value)

const filteredLogs = computed(() => {
  return allLogs.value.filter(log => {
    if (filter.value.keyword && !log.message.toLowerCase().includes(filter.value.keyword.toLowerCase())) {
      return false
    }
    if (filter.value.categories.length > 0 && !filter.value.categories.includes(log.category)) {
      return false
    }
    if (filter.value.level && log.level !== filter.value.level) {
      return false
    }
    if (filter.value.component && log.component !== filter.value.component) {
      return false
    }
    return true
  }).slice(-500)
})

const uniqueComponents = computed(() => {
  return serverStats.value?.uniqueComponents || []
})

// 统计（从服务端获取）
const totalLogs = computed(() => serverStats.value?.totalLogs || 0)
const todayLogs = computed(() => serverStats.value?.todayLogs || 0)
const errorCount = computed(() => serverStats.value?.errorCount || 0)
const activeTraces = computed(() => 0) // 暂不实现
const avgResponseTime = computed(() => 0) // 暂不实现)

// ==================== 方法 ====================
function close() {
  emit('close')
}

function applyFilter() {
  // 筛选自动应用
}

function resetFilter() {
  filter.value = {
    keyword: '',
    categories: [],
    level: '',
    component: ''
  }
}

function toggleLog(id: string) {
  if (expandedLogs.value.has(id)) {
    expandedLogs.value.delete(id)
  } else {
    expandedLogs.value.add(id)
  }
}

async function clearAllLogs() {
  if (confirm('确定要清空所有日志吗？')) {
    await clearServerLogs()
    expandedLogs.value.clear()
    await refreshData()
  }
}

function exportLogs() {
  exportServerLogs()
}

async function refreshData() {
  isLoading.value = true
  await Promise.all([
    loadLogs({ limit: 1000 }),
    loadStats()
  ])
  isLoading.value = false
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  })
}

function handleScroll() {
  if (logsContainer.value) {
    const { scrollTop, scrollHeight, clientHeight } = logsContainer.value
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50
    autoScroll.value = isAtBottom
  }
}

// 自动刷新
let refreshInterval: number | null = null

onMounted(() => {
  refreshData()
  // 每 5 秒刷新一次
  refreshInterval = window.setInterval(refreshData, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// 自动滚动
watch(filteredLogs, () => {
  if (autoScroll.value && logsContainer.value) {
    nextTick(() => {
      logsContainer.value!.scrollTop = logsContainer.value!.scrollHeight
    })
  }
}, { deep: true })
</script>

<style scoped>
.log-dashboard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.log-dashboard-panel {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 1400px;
  height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

/* 头部 */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 24px;
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.recording-badge {
  font-size: 12px;
  color: #ef4444;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn, .close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-bg-soft);
}

.close-btn:hover {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger);
}

/* 统计栏 */
.stats-bar {
  display: flex;
  gap: 16px;
  padding: 16px 24px;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: var(--vp-c-bg);
  border-radius: 12px;
  border: 1px solid var(--vp-c-divider);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-brand);
}

.stat-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-top: 4px;
}

/* 主体 */
.dashboard-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 筛选侧边栏 */
.filter-sidebar {
  width: 200px;
  padding: 16px;
  border-right: 1px solid var(--vp-c-divider);
  overflow-y: auto;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-section h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  background: var(--vp-c-bg);
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  cursor: pointer;
}

.filter-select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  background: var(--vp-c-bg);
}

.btn-reset {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: var(--vp-c-bg-soft);
}

/* 日志面板 */
.logs-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--vp-c-divider);
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-size: 13px;
  font-weight: 500;
}

.logs-actions {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  font-size: 12px;
  cursor: pointer;
}

.toggle-btn.active {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.logs-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.log-item {
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-left: 3px solid transparent;
}

.log-item:hover {
  background: var(--vp-c-bg-soft);
}

.log-item.expanded {
  background: var(--vp-c-bg-soft);
}

.log-item.debug { border-left-color: #6b7280; }
.log-item.info { border-left-color: #3b82f6; }
.log-item.warn { border-left-color: #f59e0b; }
.log-item.error { border-left-color: #ef4444; }

.log-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.log-time {
  color: var(--vp-c-text-3);
  font-family: monospace;
  font-size: 11px;
}

.log-level {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
}

.log-level.debug { background: #f3f4f6; color: #6b7280; }
.log-level.info { background: #dbeafe; color: #1e40af; }
.log-level.warn { background: #fef3c7; color: #92400e; }
.log-level.error { background: #fee2e2; color: #991b1b; }

.log-category {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
}

.log-component {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  background: #e0e7ff;
  color: #3730a3;
}

.log-message {
  flex: 1;
  color: var(--vp-c-text-1);
}

.log-detail {
  margin-top: 8px;
  padding: 10px;
  background: #1e293b;
  border-radius: 6px;
  overflow-x: auto;
}

.log-detail pre {
  margin: 0;
  color: #e2e8f0;
  font-size: 11px;
  line-height: 1.5;
}

.empty-logs {
  text-align: center;
  padding: 60px 20px;
  color: var(--vp-c-text-3);
}

/* 链路面板 */
.traces-panel {
  width: 350px;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
}

.traces-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.trace-item {
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  background: var(--vp-c-bg-soft);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.trace-item:hover {
  border-color: var(--vp-c-brand);
}

.trace-item.running { border-left: 3px solid #3b82f6; }
.trace-item.completed { border-left: 3px solid #10b981; }
.trace-item.error { border-left: 3px solid #ef4444; }

.trace-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
}

.trace-status {
  font-size: 14px;
}

.trace-time {
  color: var(--vp-c-text-3);
}

.trace-duration {
  margin-left: auto;
  color: var(--vp-c-brand);
  font-weight: 500;
}

.node-flow {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.node-arrow {
  color: var(--vp-c-text-3);
}

.trace-detail {
  flex: 1;
  padding: 16px;
  border-top: 1px solid var(--vp-c-divider);
  overflow-y: auto;
}

.trace-detail h5 {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .log-dashboard-panel,
.modal-leave-to .log-dashboard-panel {
  transform: scale(0.95);
}
</style>
