<template>
  <div class="agent-dashboard">
    <!-- Header -->
    <div class="dashboard-header">
      <h3 class="dashboard-title">
        <span class="title-icon">🤖</span>
        Agent 监控面板
      </h3>
      <div class="header-status" :class="systemStatus">
        <span class="status-dot"></span>
        {{ statusText }}
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalArticles }}</div>
          <div class="stat-label">文章总数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🤖</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.activeTasks }}</div>
          <div class="stat-label">运行中任务</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">💰</div>
        <div class="stat-content">
          <div class="stat-value">${{ stats.todayCost.toFixed(4) }}</div>
          <div class="stat-label">今日成本</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">🪙</div>
        <div class="stat-content">
          <div class="stat-value">{{ formatNumber(stats.todayTokens) }}</div>
          <div class="stat-label">今日 Token</div>
        </div>
      </div>
    </div>
    
    <!-- Balance Display -->
    <div class="section">
      <BalanceDisplay />
    </div>

    <!-- Active Tasks -->
    <div class="section">
      <h4 class="section-title">
        <span>🔄</span>
        实时任务
      </h4>
      <div class="task-list" v-if="activeTasks.length > 0">
        <div v-for="task in activeTasks" :key="task.id" class="task-item">
          <div class="task-info">
            <div class="task-name">{{ task.skillName }}</div>
            <div class="task-meta">
              <span class="task-status" :class="task.status">{{ task.status }}</span>
              <span class="task-time">{{ formatDuration(task.duration) }}</span>
            </div>
          </div>
          <div class="task-progress" v-if="task.progress">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: task.progress + '%' }"></div>
            </div>
            <span class="progress-text">{{ task.progress }}%</span>
          </div>
        </div>
      </div>
      <div v-else class="empty-tasks">
        <div class="empty-icon">☕</div>
        <div class="empty-text">暂无运行中的任务</div>
      </div>
    </div>

    <!-- Recent Activities -->
    <div class="section">
      <h4 class="section-title">
        <span>📜</span>
        最近活动
      </h4>
      <div class="activity-list">
        <div 
          v-for="activity in recentActivities" 
          :key="activity.id" 
          class="activity-item"
          :class="activity.type"
        >
          <span class="activity-icon">{{ activity.icon }}</span>
          <div class="activity-content">
            <div class="activity-text">{{ activity.message }}</div>
            <div class="activity-meta">
              <span class="activity-time">{{ formatTime(activity.timestamp) }}</span>
              <span v-if="activity.cost" class="activity-cost">${{ activity.cost.toFixed(4) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="section">
      <h4 class="section-title">
        <span>⚡</span>
        快捷操作
      </h4>
      <div class="quick-actions">
        <button class="action-btn" @click="quickAction('write')">
          <span>📝</span>
          写文章
        </button>
        <button class="action-btn" @click="quickAction('search')">
          <span>🔍</span>
          搜索
        </button>
        <button class="action-btn" @click="quickAction('summarize')">
          <span>📊</span>
          总结
        </button>
        <button class="action-btn" @click="quickAction('explain')">
          <span>💡</span>
          解释
        </button>
      </div>
    </div>

    <!-- System Health -->
    <div class="section">
      <h4 class="section-title">
        <span>❤️</span>
        系统健康
      </h4>
      <div class="health-grid">
        <div class="health-item" :class="{ healthy: health.llm }">
          <span class="health-icon">{{ health.llm ? '✅' : '❌' }}</span>
          <span class="health-label">LLM 服务</span>
        </div>
        <div class="health-item" :class="{ healthy: health.memory }">
          <span class="health-icon">{{ health.memory ? '✅' : '❌' }}</span>
          <span class="health-label">记忆系统</span>
        </div>
        <div class="health-item" :class="{ healthy: health.files }">
          <span class="health-icon">{{ health.files ? '✅' : '❌' }}</span>
          <span class="health-label">文件系统</span>
        </div>
        <div class="health-item" :class="{ healthy: health.git }">
          <span class="health-icon">{{ health.git ? '✅' : '❌' }}</span>
          <span class="health-label">Git 服务</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useData } from 'vitepress'
import BalanceDisplay from './BalanceDisplay.vue'

// ==================== Types ====================
interface Task {
  id: string
  skillName: string
  status: 'running' | 'paused' | 'completed' | 'error'
  duration: number
  progress?: number
}

interface Activity {
  id: string
  type: 'success' | 'error' | 'info'
  icon: string
  message: string
  timestamp: number
  cost?: number
}

interface Stats {
  totalArticles: number
  activeTasks: number
  todayCost: number
  todayTokens: number
}

// ==================== State ====================
const vpData = useData()
const stats = ref<Stats>({
  totalArticles: 0,
  activeTasks: 0,
  todayCost: 0,
  todayTokens: 0
})

const activeTasks = ref<Task[]>([])
const recentActivities = ref<Activity[]>([])
const health = ref({
  llm: true,
  memory: true,
  files: true,
  git: false
})

let refreshInterval: number | null = null

// ==================== Computed ====================
const systemStatus = computed(() => {
  const allHealthy = Object.values(health.value).every(h => h)
  return allHealthy ? 'healthy' : 'warning'
})

const statusText = computed(() => {
  return systemStatus.value === 'healthy' ? '系统正常' : '部分服务异常'
})

// ==================== Methods ====================
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function quickAction(type: string) {
  // Emit event to parent or use event bus
  const event = new CustomEvent('agent:quick-action', { detail: { type } })
  window.dispatchEvent(event)
}

async function loadStats() {
  // Load article count from sidebar
  const sidebar = vpData.theme.value.sidebar || {}
  let articleCount = 0
  
  function countArticles(items: any[]) {
    items.forEach(item => {
      if (item.link && !item.link.match(/^https?:\/\//)) {
        articleCount++
      }
      if (item.items) {
        countArticles(item.items)
      }
    })
  }
  
  Object.values(sidebar).forEach((section: any) => {
    if (Array.isArray(section)) {
      countArticles(section)
    } else if (section?.items) {
      countArticles(section.items)
    }
  })
  
  stats.value.totalArticles = articleCount
  
  // Load usage stats from localStorage
  try {
    const usage = localStorage.getItem('metablog_llm_usage')
    if (usage) {
      const data = JSON.parse(usage)
      const today = new Date().toDateString()
      if (data.date === today) {
        stats.value.todayCost = data.dailyUsage || 0
        stats.value.todayTokens = data.history?.reduce((sum: number, h: any) => sum + (h.tokens || 0), 0) || 0
      }
    }
  } catch {}
  
  // Simulate active tasks for demo
  stats.value.activeTasks = activeTasks.value.length
}

function loadActivities() {
  // Load from logs or create sample activities
  const sampleActivities: Activity[] = [
    { id: '1', type: 'success', icon: '✅', message: '创建文章: Transformer详解', timestamp: Date.now() - 300000, cost: 0.012 },
    { id: '2', type: 'success', icon: '✅', message: '更新知识图谱', timestamp: Date.now() - 600000, cost: 0.005 },
    { id: '3', type: 'info', icon: 'ℹ️', message: '系统启动完成', timestamp: Date.now() - 900000 },
    { id: '4', type: 'error', icon: '❌', message: '网络请求失败: api.deepseek.com', timestamp: Date.now() - 1200000 },
    { id: '5', type: 'success', icon: '✅', message: '生成文章摘要', timestamp: Date.now() - 1800000, cost: 0.003 }
  ]
  
  recentActivities.value = sampleActivities
}

function checkHealth() {
  // Check LLM health
  health.value.llm = true // Assume healthy if we can load
  health.value.memory = true
  health.value.files = true
  health.value.git = false // Not implemented yet
}

// ==================== Lifecycle ====================
onMounted(() => {
  loadStats()
  loadActivities()
  checkHealth()
  
  // Auto refresh every 5 seconds
  refreshInterval = window.setInterval(() => {
    loadStats()
    checkHealth()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.agent-dashboard {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafaf9;
  overflow-y: auto;
}

/* Header */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e7e5e4;
  background: white;
}

.dashboard-title {
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

.header-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.header-status.healthy {
  background: #dcfce7;
  color: #166534;
}

.header-status.warning {
  background: #fef3c7;
  color: #92400e;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #f5f5f4;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f5f5f4;
  border-radius: 10px;
}

.stat-icon {
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #292524;
}

.stat-label {
  font-size: 12px;
  color: #78716c;
  margin-top: 2px;
}

/* Section */
.section {
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f4;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #292524;
  margin: 0 0 12px 0;
}

/* Tasks */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  padding: 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e7e5e4;
}

.task-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-name {
  font-size: 13px;
  font-weight: 500;
  color: #292524;
}

.task-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}

.task-status {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}

.task-status.running {
  background: #dbeafe;
  color: #1e40af;
}

.task-status.paused {
  background: #fef3c7;
  color: #92400e;
}

.task-status.completed {
  background: #dcfce7;
  color: #166534;
}

.task-status.error {
  background: #fee2e2;
  color: #991b1b;
}

.task-time {
  font-size: 11px;
  color: #a8a29e;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: #e7e5e4;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #475569;
  border-radius: 2px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 11px;
  color: #78716c;
  min-width: 30px;
  text-align: right;
}

.empty-tasks {
  padding: 24px;
  text-align: center;
  color: #a8a29e;
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 13px;
}

/* Activities */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  background: white;
  border-radius: 8px;
  border-left: 3px solid transparent;
}

.activity-item.success {
  border-left-color: #22c55e;
}

.activity-item.error {
  border-left-color: #dc2626;
}

.activity-item.info {
  border-left-color: #3b82f6;
}

.activity-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.activity-content {
  flex: 1;
  min-width: 0;
}

.activity-text {
  font-size: 13px;
  color: #292524;
  margin-bottom: 4px;
}

.activity-meta {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #a8a29e;
}

.activity-cost {
  color: #475569;
  font-weight: 500;
}

/* Quick Actions */
.quick-actions {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border: 1px solid #e7e5e4;
  background: white;
  border-radius: 8px;
  font-size: 12px;
  color: #57534e;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f5f5f4;
  border-color: #d6d3d1;
}

.action-btn span {
  font-size: 20px;
}

/* Health */
.health-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.health-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fee2e2;
  border-radius: 6px;
  font-size: 13px;
}

.health-item.healthy {
  background: #dcfce7;
}

.health-icon {
  font-size: 14px;
}

.health-label {
  color: #57534e;
}
</style>
