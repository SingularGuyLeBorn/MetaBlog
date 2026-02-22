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
                    <!-- 如果有原始响应，显示折叠的原始响应 -->
                    <div v-if="log.data.rawResponse" class="raw-response-section">
                      <div class="raw-response-header" @click.stop="toggleRawResponse(log.id)">
                        <span>📄 AI 原始响应</span>
                        <Icon :name="expandedRawResponses.has(log.id) ? 'chevron-down' : 'chevron-right'" :size="10" />
                      </div>
                      <div v-if="expandedRawResponses.has(log.id)" class="raw-response-content">
                        <pre>{{ JSON.stringify(log.data.rawResponse, null, 2) }}</pre>
                      </div>
                    </div>
                    
                    <!-- 其他数据 -->
                    <div class="log-data-content">
                      <pre>{{ JSON.stringify(filteredLogData(log.data), null, 2) }}</pre>
                    </div>
                  </div>
                </div>
                
                <div v-if="filteredLogs.length === 0" class="empty-logs">
                  <div class="empty-logs-icon">📝</div>
                  <p>暂无日志</p>
                </div>
              </div>
            </div>
            
            <!-- 右侧：日志详情 -->
            <div class="detail-panel">
              <div class="panel-header">
                <h4>📋 日志详情</h4>
              </div>
              
              <div class="panel-content">
                <div class="detail-placeholder">
                  <div class="placeholder-icon">📊</div>
                  <p class="placeholder-text">点击左侧日志查看详情</p>
                </div>
                
                <div class="detail-summary">
                  <h5>统计概览</h5>
                  <div class="summary-grid">
                    <div class="summary-card">
                      <span class="summary-label">总日志数</span>
                      <span class="summary-value">{{ totalLogs }}</span>
                    </div>
                    <div class="summary-card">
                      <span class="summary-label">今日日志</span>
                      <span class="summary-value">{{ todayLogs }}</span>
                    </div>
                    <div class="summary-card" :class="{ error: errorCount > 0 }">
                      <span class="summary-label">错误数</span>
                      <span class="summary-value">{{ errorCount }}</span>
                    </div>
                  </div>
                </div>
                
                <div v-if="uniqueComponents.length > 0" class="components-section">
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
import { Icon } from '../../../ui'
import TraceNode from './TraceNode.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  'update:visible': [value: boolean]
}>()

// ==================== 状态 ====================
const logsContainer = ref<HTMLElement>()
const autoScroll = ref(true)
const expandedLogs = ref(new Set<string>())
const expandedRawResponses = ref(new Set<string>())
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

// 统计（从内存日志计算）
const totalLogs = computed(() => allLogs.value.length)
const todayLogs = computed(() => {
  const today = new Date().toDateString()
  return allLogs.value.filter(log => new Date(log.timestamp).toDateString() === today).length
})
const errorCount = computed(() => allLogs.value.filter(log => log.level === 'error').length)
const activeTraces = computed(() => 0) // 暂不实现
const avgResponseTime = computed(() => 0) // 暂不实现

const uniqueComponents = computed(() => {
  const components = new Set(allLogs.value.map(log => log.component).filter((c): c is string => typeof c === 'string'))
  return Array.from(components)
})

// ==================== 方法 ====================
function close() {
  emit('close')
  emit('update:visible', false)
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

function toggleRawResponse(id: string) {
  if (expandedRawResponses.value.has(id)) {
    expandedRawResponses.value.delete(id)
  } else {
    expandedRawResponses.value.add(id)
  }
}

// 过滤日志数据，排除 rawResponse（已单独显示）
function filteredLogData(data: any): any {
  if (!data) return data
  const { rawResponse, ...rest } = data
  return rest
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

// 当面板可见时立即刷新数据
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    refreshData()
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
/* ==================== 玻璃拟态风格日志面板 ==================== */

.log-dashboard-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 24px;
}

.log-dashboard-panel {
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  width: 100%;
  max-width: 1200px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06),
    0 20px 25px -5px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

/* 头部 - 玻璃拟态 */
.dashboard-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(145deg, rgba(248, 250, 252, 0.9), rgba(241, 245, 249, 0.9));
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  backdrop-filter: blur(10px);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 22px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #e0e7ff, #c7d2fe);
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(99, 102, 241, 0.1);
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.recording-badge {
  font-size: 12px;
  color: #10b981;
  background: linear-gradient(145deg, #d1fae5, #a7f3d0);
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
  animation: pulse 2s infinite;
  box-shadow: 0 1px 2px rgba(16, 185, 129, 0.1);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(0.98); }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn, .close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  border-radius: 10px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 1px 3px rgba(0, 0, 0, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.action-btn:hover {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
}

.close-btn:hover {
  background: linear-gradient(145deg, #fee2e2, #fecaca);
  color: #dc2626;
  transform: translateY(-1px);
}

/* 统计栏 - 卡片式 */
.stats-bar {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  background: linear-gradient(145deg, rgba(248, 250, 252, 0.6), rgba(241, 245, 249, 0.6));
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.stat-card {
  flex: 1;
  text-align: center;
  padding: 14px 12px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 
    0 2px 4px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transition: all 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.06);
}

.stat-value {
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-card:nth-child(3) .stat-value {
  background: linear-gradient(135deg, #ef4444, #f97316);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stat-label {
  font-size: 12px;
  color: #64748b;
  margin-top: 6px;
  font-weight: 500;
}

/* 主体 */
.dashboard-body {
  flex: 1;
  display: flex;
  overflow: hidden;
  background: linear-gradient(180deg, #f8fafc 0%, #ffffff 100%);
}

/* 筛选侧边栏 - 玻璃拟态 */
.filter-sidebar {
  width: 220px;
  padding: 20px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.8));
  border-right: 1px solid rgba(226, 232, 240, 0.6);
  overflow-y: auto;
}

.filter-section {
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 14px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.filter-section h4 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 10px;
  font-size: 13px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  color: #334155;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
}

.search-input:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.2);
}

.search-input::placeholder {
  color: #94a3b8;
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  font-size: 13px;
  cursor: pointer;
  color: #475569;
  transition: all 0.15s ease;
  border-radius: 6px;
  padding-left: 6px;
  margin-left: -6px;
}

.filter-checkbox:hover {
  background: rgba(99, 102, 241, 0.05);
  color: #4f46e5;
}

.filter-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 2px solid #cbd5e1;
  cursor: pointer;
  accent-color: #6366f1;
}

.filter-select {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 10px;
  font-size: 13px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  color: #334155;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-select:focus {
  outline: none;
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(147, 197, 253, 0.2);
}

.btn-reset {
  width: 100%;
  padding: 12px;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 10px;
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  font-size: 13px;
  font-weight: 500;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.btn-reset:hover {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.08);
}

/* 日志面板 */
.logs-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}

.logs-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: linear-gradient(145deg, rgba(248, 250, 252, 0.9), rgba(241, 245, 249, 0.9));
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  backdrop-filter: blur(10px);
}

.logs-header span {
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.logs-actions {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  padding: 8px 14px;
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 10px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.toggle-btn:hover {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  transform: translateY(-1px);
}

.toggle-btn.active {
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  color: #1e40af;
  border-color: #93c5fd;
}

.logs-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.log-item {
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(226, 232, 240, 0.6);
}

.log-item:hover {
  background: linear-gradient(145deg, #f1f5f9, #e8ecf1);
  transform: translateX(2px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.04);
}

.log-item.expanded {
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  border-color: #93c5fd;
}

.log-item.debug { border-left-color: #94a3b8; }
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
  color: #94a3b8;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  font-weight: 500;
  background: rgba(241, 245, 249, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
}

.log-level {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-level.debug { 
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0); 
  color: #64748b; 
}
.log-level.info { 
  background: linear-gradient(145deg, #dbeafe, #bfdbfe); 
  color: #1e40af; 
}
.log-level.warn { 
  background: linear-gradient(145deg, #fef3c7, #fde68a); 
  color: #92400e; 
}
.log-level.error { 
  background: linear-gradient(145deg, #fee2e2, #fecaca); 
  color: #991b1b; 
}

.log-category {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  color: #64748b;
}

.log-component {
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
  background: linear-gradient(145deg, #e0e7ff, #c7d2fe);
  color: #4338ca;
}

.log-message {
  flex: 1;
  color: #334155;
  font-weight: 500;
}

.log-detail {
  margin-top: 12px;
  background: linear-gradient(145deg, #1e293b, #0f172a);
  border-radius: 10px;
  overflow-x: auto;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
}

.raw-response-section {
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.raw-response-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);
}

.raw-response-header:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
}

.raw-response-content {
  padding: 14px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.raw-response-content pre {
  margin: 0;
  color: #a5f3fc;
  font-size: 11px;
  line-height: 1.6;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.log-data-content {
  padding: 14px;
}

.log-detail pre {
  margin: 0;
  color: #e2e8f0;
  font-size: 11px;
  line-height: 1.6;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.empty-logs {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
}

.empty-logs-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

/* 详情面板 */
.detail-panel {
  width: 300px;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.8), rgba(241, 245, 249, 0.8));
  border-left: 1px solid rgba(226, 232, 240, 0.6);
}

.panel-header {
  padding: 14px 20px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  background: linear-gradient(145deg, rgba(248, 250, 252, 0.9), rgba(241, 245, 249, 0.9));
  backdrop-filter: blur(10px);
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #475569;
}

.panel-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.detail-value {
  font-size: 13px;
  color: #334155;
  font-weight: 500;
}

/* 详情面板内容 */
.detail-placeholder {
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.placeholder-text {
  font-size: 14px;
  margin: 0;
}

.detail-summary {
  margin-bottom: 24px;
}

.detail-summary h5,
.components-section h5 {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
}

.summary-grid {
  display: grid;
  gap: 8px;
}

.summary-card {
  padding: 12px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 10px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-card.error {
  background: linear-gradient(145deg, #fee2e2, #fecaca);
  border-color: #fca5a5;
}

.summary-card.error .summary-value {
  color: #dc2626;
}

.summary-card .summary-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.summary-card .summary-value {
  font-size: 16px;
  font-weight: 700;
  color: #334155;
}

.components-section {
  margin-top: 20px;
}

.component-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.component-tag {
  padding: 6px 12px;
  background: linear-gradient(145deg, #e0e7ff, #c7d2fe);
  color: #4338ca;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.component-tag:hover {
  background: linear-gradient(145deg, #c7d2fe, #a5b4fc);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(99, 102, 241, 0.15);
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .log-dashboard-panel,
.modal-leave-to .log-dashboard-panel {
  transform: scale(0.95) translateY(10px);
}
</style>
