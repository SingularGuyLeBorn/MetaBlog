<template>
  <div class="agent-dashboard-scifi">
    <!-- 顶部状态栏 -->
    <header class="control-tower-header">
      <div class="header-left">
        <div class="tower-badge">
          <span class="tower-icon">◈</span>
          <span class="tower-text">CONTROL TOWER</span>
        </div>
        <h1 class="dashboard-title">
          <span class="title-highlight">Agent</span> 监控中心
        </h1>
      </div>
      <div class="header-right">
        <div class="status-indicator" :class="systemStatus">
          <span class="pulse-ring"></span>
          <span class="status-dot"></span>
          <span class="status-text">{{ statusText }}</span>
        </div>
        <div class="time-display">{{ currentTime }}</div>
      </div>
    </header>

    <!-- 主控制舱室 -->
    <main class="control-chambers">
      <!-- 左舱室：实时任务 + 液态核心 -->
      <section class="chamber left-chamber">
        <div class="chamber-header">
          <span class="chamber-icon">◉</span>
          <span class="chamber-title">任务核心</span>
          <span class="chamber-id">L-01</span>
        </div>
        
        <!-- 液态核心可视化 -->
        <div class="liquid-core-container">
          <div class="liquid-core">
            <div class="core-glow"></div>
            <div class="core-inner">
              <span class="core-value">{{ stats.activeTasks }}</span>
              <span class="core-label">活跃任务</span>
            </div>
          </div>
          <div class="core-rings">
            <div class="ring ring-1"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-3"></div>
          </div>
        </div>

        <!-- 实时任务列表 -->
        <div class="task-panel">
          <div class="panel-subtitle">实时任务队列</div>
          <TransitionGroup name="task" tag="div" class="task-list">
            <div 
              v-for="(task, index) in activeTasks" 
              :key="task.id" 
              class="task-item"
              :class="task.status"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="task-pulse" :class="task.status"></div>
              <div class="task-content">
                <div class="task-name">{{ task.skillName }}</div>
                <div class="task-meta">
                  <span class="task-status-badge" :class="task.status">
                    {{ formatStatus(task.status) }}
                  </span>
                  <span class="task-duration">{{ formatDuration(task.duration) }}</span>
                </div>
              </div>
              <div v-if="task.progress" class="task-progress-ring">
                <svg viewBox="0 0 36 36">
                  <path
                    class="progress-ring-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    class="progress-ring-fill"
                    :stroke-dasharray="`${task.progress}, 100`"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span class="progress-value">{{ task.progress }}%</span>
              </div>
            </div>
          </TransitionGroup>
          <div v-if="activeTasks.length === 0" class="empty-tasks-scifi">
            <div class="empty-core">◈</div>
            <div class="empty-text">系统待机中</div>
            <div class="empty-subtext">暂无活跃任务</div>
          </div>
        </div>
      </section>

      <!-- 中舱室：统计卡片 -->
      <section class="chamber center-chamber">
        <div class="chamber-header">
          <span class="chamber-icon">◈</span>
          <span class="chamber-title">数据核心</span>
          <span class="chamber-id">C-01</span>
        </div>

        <div class="stats-container">
          <div 
            v-for="(stat, index) in statCards" 
            :key="stat.key"
            class="stat-card-scifi"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="stat-glow" :class="stat.color"></div>
            <div class="stat-content">
              <div class="stat-icon-wrapper" :class="stat.color">
                <span class="stat-icon">{{ stat.icon }}</span>
              </div>
              <div class="stat-info">
                <div class="stat-value-wrapper">
                  <span class="stat-value" :class="{ 'number-changing': stat.isChanging }">
                    {{ stat.prefix }}{{ formatStatValue(stat.value) }}
                  </span>
                  <span v-if="stat.suffix" class="stat-suffix">{{ stat.suffix }}</span>
                </div>
                <div class="stat-label">{{ stat.label }}</div>
              </div>
            </div>
            <div class="stat-trend" :class="stat.trend">
              <span class="trend-arrow">{{ stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : '−' }}</span>
            </div>
          </div>
        </div>

        <!-- 快捷操作区 -->
        <div class="quick-ops-panel">
          <div class="panel-subtitle">快捷指令</div>
          <div class="ops-grid">
            <button 
              v-for="action in quickActions" 
              :key="action.type"
              class="op-btn"
              @click="triggerAction(action.type)"
            >
              <span class="op-icon">{{ action.icon }}</span>
              <span class="op-label">{{ action.label }}</span>
              <span class="op-key">{{ action.key }}</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 右舱室：系统健康状态 -->
      <section class="chamber right-chamber">
        <div class="chamber-header">
          <span class="chamber-icon">◉</span>
          <span class="chamber-title">健康监控</span>
          <span class="chamber-id">R-01</span>
        </div>

        <div class="health-grid-scifi">
          <div 
            v-for="(item, index) in healthItems" 
            :key="item.key"
            class="health-card"
            :class="{ healthy: item.status, unhealthy: !item.status }"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="health-pulse" :class="{ active: item.status }"></div>
            <div class="health-icon-wrapper" :class="{ healthy: item.status }">
              <span class="health-icon">{{ item.icon }}</span>
            </div>
            <div class="health-info">
              <div class="health-name">{{ item.name }}</div>
              <div class="health-status">{{ item.status ? '正常运行' : '服务异常' }}</div>
            </div>
            <div class="health-indicator">
              <span class="indicator-dot" :class="{ active: item.status }"></span>
            </div>
          </div>
        </div>

        <!-- 系统资源监控 -->
        <div class="resource-panel">
          <div class="panel-subtitle">资源监控</div>
          <div class="resource-bars">
            <div class="resource-item">
              <div class="resource-header">
                <span class="resource-name">内存使用</span>
                <span class="resource-value">{{ resourceUsage.memory }}%</span>
              </div>
              <div class="resource-bar">
                <div class="resource-fill" :style="{ width: `${resourceUsage.memory}%` }"></div>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-header">
                <span class="resource-name">CPU 负载</span>
                <span class="resource-value">{{ resourceUsage.cpu }}%</span>
              </div>
              <div class="resource-bar">
                <div class="resource-fill cpu" :style="{ width: `${resourceUsage.cpu}%` }"></div>
              </div>
            </div>
            <div class="resource-item">
              <div class="resource-header">
                <span class="resource-name">网络延迟</span>
                <span class="resource-value">{{ resourceUsage.latency }}ms</span>
              </div>
              <div class="resource-bar">
                <div class="resource-fill network" :style="{ width: `${Math.min(resourceUsage.latency, 100)}%` }"></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 底舱：最近活动时间轴 -->
    <footer class="bottom-chamber">
      <div class="timeline-header">
        <span class="timeline-icon">◊</span>
        <span class="timeline-title">活动日志流</span>
        <span class="timeline-id">B-01</span>
      </div>
      
      <div class="timeline-container">
        <div class="timeline-scroll">
          <TransitionGroup name="activity" tag="div" class="timeline">
            <div 
              v-for="(activity, index) in recentActivities" 
              :key="activity.id"
              class="timeline-item"
              :class="activity.type"
              :style="{ animationDelay: `${index * 0.1}s` }"
            >
              <div class="timeline-connector">
                <div class="connector-line"></div>
                <div class="timeline-node" :class="activity.type">
                  <span class="node-icon">{{ activity.icon }}</span>
                </div>
              </div>
              <div class="timeline-content">
                <div class="timeline-message">{{ activity.message }}</div>
                <div class="timeline-meta">
                  <span class="timeline-time">{{ formatTime(activity.timestamp) }}</span>
                  <span v-if="activity.cost" class="timeline-cost">${{ activity.cost.toFixed(4) }}</span>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
        <div class="timeline-glow"></div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useData } from 'vitepress'

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
  type: 'success' | 'error' | 'info' | 'warning'
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
const currentTime = ref('')

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

const resourceUsage = ref({
  memory: 42,
  cpu: 28,
  latency: 45
})

let refreshInterval: number | null = null
let timeInterval: number | null = null

// ==================== Computed ====================
const systemStatus = computed(() => {
  const allHealthy = Object.values(health.value).every(h => h)
  return allHealthy ? 'healthy' : 'warning'
})

const statusText = computed(() => {
  return systemStatus.value === 'healthy' ? '系统正常' : '部分服务异常'
})

const statCards = computed(() => [
  {
    key: 'articles',
    icon: '📊',
    label: '文章总数',
    value: stats.value.totalArticles,
    prefix: '',
    suffix: '',
    color: 'cyan',
    trend: 'up',
    isChanging: false
  },
  {
    key: 'tasks',
    icon: '🤖',
    label: '运行中任务',
    value: stats.value.activeTasks,
    prefix: '',
    suffix: '',
    color: 'purple',
    trend: 'neutral',
    isChanging: false
  },
  {
    key: 'cost',
    icon: '💰',
    label: '今日成本',
    value: stats.value.todayCost,
    prefix: '$',
    suffix: '',
    color: 'green',
    trend: 'down',
    isChanging: false
  },
  {
    key: 'tokens',
    icon: '🪙',
    label: '今日 Token',
    value: stats.value.todayTokens,
    prefix: '',
    suffix: '',
    color: 'orange',
    trend: 'up',
    isChanging: false
  }
])

const healthItems = computed(() => [
  { key: 'llm', name: 'LLM 服务', status: health.value.llm, icon: '🧠' },
  { key: 'memory', name: '记忆系统', status: health.value.memory, icon: '💾' },
  { key: 'files', name: '文件系统', status: health.value.files, icon: '📁' },
  { key: 'git', name: 'Git 服务', status: health.value.git, icon: '🔀' }
])

const quickActions = [
  { type: 'write', label: '写文章', icon: '📝', key: 'W' },
  { type: 'search', label: '搜索', icon: '🔍', key: 'S' },
  { type: 'summarize', label: '总结', icon: '📊', key: 'M' },
  { type: 'explain', label: '解释', icon: '💡', key: 'E' }
]

// ==================== Methods ====================
function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  })
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}

function formatStatValue(value: number): string {
  if (value < 1 && value > 0) return value.toFixed(4)
  return formatNumber(value)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function formatStatus(status: string): string {
  const map: Record<string, string> = {
    running: '运行中',
    paused: '已暂停',
    completed: '已完成',
    error: '出错'
  }
  return map[status] || status
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

function triggerAction(type: string) {
  const event = new CustomEvent('agent:quick-action', { detail: { type } })
  window.dispatchEvent(event)
}

function quickAction(type: string) {
  triggerAction(type)
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

async function loadActivities() {
  try {
    const response = await fetch('/api/logs/recent?limit=20')
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        recentActivities.value = data.data.map((log: any, index: number) => ({
          id: log.id || String(index),
          type: mapLogLevelToType(log.level),
          icon: getLogIcon(log.level),
          message: log.message,
          timestamp: new Date(log.timestamp).getTime(),
          cost: log.metadata?.cost
        }))
      }
    }
  } catch (e) {
    console.error('Failed to load activities:', e)
    recentActivities.value = []
  }
}

function mapLogLevelToType(level: string): 'success' | 'error' | 'info' | 'warning' {
  const map: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
    'error': 'error',
    'warn': 'warning',
    'warning': 'warning',
    'info': 'info',
    'debug': 'info',
    'success': 'success'
  }
  return map[level?.toLowerCase()] || 'info'
}

function getLogIcon(level: string): string {
  const map: Record<string, string> = {
    'error': '✕',
    'warn': '⚠',
    'warning': '⚠',
    'info': 'ℹ',
    'debug': '◆',
    'success': '✓'
  }
  return map[level?.toLowerCase()] || '•'
}

async function loadTasks() {
  try {
    const response = await fetch('/api/agent/tasks')
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        activeTasks.value = data.data.map((task: any) => ({
          id: task.id,
          skillName: task.skillName || task.skill || '未知任务',
          status: task.status,
          duration: task.duration || Date.now() - new Date(task.startTime).getTime(),
          progress: task.progress
        }))
        stats.value.activeTasks = activeTasks.value.length
      }
    }
  } catch (e) {
    console.error('Failed to load tasks:', e)
    activeTasks.value = []
    stats.value.activeTasks = 0
  }
}

async function checkHealth() {
  try {
    const response = await fetch('/api/health')
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        health.value = {
          llm: data.data.llm || false,
          memory: data.data.memory || false,
          files: data.data.files || false,
          git: data.data.git || false
        }
      }
    }
  } catch (e) {
    // All services unavailable
    health.value = { llm: false, memory: false, files: false, git: false }
  }
}

async function updateResourceUsage() {
  try {
    const response = await fetch('/api/system/resources')
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.data) {
        resourceUsage.value = {
          memory: Math.round(data.data.memory || 0),
          cpu: Math.round(data.data.cpu || 0),
          latency: Math.round(data.data.latency || 0)
        }
      }
    }
  } catch (e) {
    // Keep previous values on error
  }
}

// ==================== Lifecycle ====================
onMounted(async () => {
  updateTime()
  await Promise.all([
    loadStats(),
    loadActivities(),
    loadTasks(),
    checkHealth(),
    updateResourceUsage()
  ])
  
  // Update time every second
  timeInterval = window.setInterval(updateTime, 1000)
  
  // Auto refresh every 5 seconds
  refreshInterval = window.setInterval(() => {
    loadStats()
    checkHealth()
    updateResourceUsage()
    loadActivities()
    loadTasks()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
  if (timeInterval) {
    clearInterval(timeInterval)
  }
})

// Watch for stats changes to trigger number animation
watch(() => stats.value, () => {
  // Trigger animation logic if needed
}, { deep: true })
</script>

<style scoped>
/* ==================== 基础样式变量 ==================== */
.agent-dashboard-scifi {
  --color-cyan: #00D4FF;
  --color-purple: #E0C3FC;
  --color-green: #00E5A0;
  --color-orange: #FFB800;
  --color-red: #FF4757;
  --color-bg: #f8fafc;
  --color-card: rgba(255, 255, 255, 0.7);
  --color-border: rgba(255, 255, 255, 0.5);
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.08);
  --shadow-glow-cyan: 0 0 20px rgba(0, 212, 255, 0.3);
  --shadow-glow-purple: 0 0 20px rgba(224, 195, 252, 0.3);
  
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ==================== 顶部状态栏 ==================== */
.control-tower-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--color-card);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.tower-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: linear-gradient(135deg, var(--color-cyan), var(--color-purple));
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: white;
  letter-spacing: 0.5px;
}

.tower-icon {
  font-size: 14px;
}

.dashboard-title {
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  letter-spacing: -0.5px;
}

.title-highlight {
  background: linear-gradient(135deg, var(--color-cyan), var(--color-purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 24px;
  border: 1px solid var(--color-border);
  position: relative;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  border: 2px solid var(--color-green);
  opacity: 0;
  animation: pulse-ring 2s ease-out infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(1.3); opacity: 0; }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-green);
  box-shadow: 0 0 10px var(--color-green);
}

.status-indicator.warning .status-dot {
  background: var(--color-orange);
  box-shadow: 0 0 10px var(--color-orange);
}

.status-indicator.warning .pulse-ring {
  border-color: var(--color-orange);
}

.status-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
}

.time-display {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
  font-family: 'SF Mono', monospace;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

/* ==================== 主控制舱室 ==================== */
.control-chambers {
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 20px;
  padding: 20px;
  flex: 1;
  overflow: hidden;
}

.chamber {
  display: flex;
  flex-direction: column;
  background: var(--color-card);
  backdrop-filter: blur(16px);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: var(--shadow-card);
  overflow: hidden;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.chamber-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
  background: rgba(255, 255, 255, 0.4);
}

.chamber-icon {
  font-size: 14px;
  color: var(--color-cyan);
}

.chamber-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
}

.chamber-id {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  font-family: 'SF Mono', monospace;
}

/* ==================== 左舱室：液态核心 ==================== */
.left-chamber {
  animation-delay: 0s;
}

.liquid-core-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 30px 20px;
  min-height: 180px;
}

.liquid-core {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-cyan), var(--color-purple));
  display: flex;
  justify-content: center;
  align-items: center;
  animation: breathe 4s ease-in-out infinite;
  box-shadow: 
    0 0 40px rgba(0, 212, 255, 0.4),
    inset 0 0 40px rgba(255, 255, 255, 0.2);
}

@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.core-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.8), transparent 50%);
}

.core-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 1;
  color: white;
}

.core-value {
  font-size: 32px;
  font-weight: 700;
  line-height: 1;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.core-label {
  font-size: 11px;
  font-weight: 500;
  opacity: 0.9;
  margin-top: 4px;
  letter-spacing: 0.5px;
}

.core-rings {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.ring-1 {
  width: 160px;
  height: 160px;
  animation: rotate 10s linear infinite;
}

.ring-2 {
  width: 180px;
  height: 180px;
  border-style: dashed;
  animation: rotate 15s linear infinite reverse;
}

.ring-3 {
  width: 200px;
  height: 200px;
  border-color: rgba(224, 195, 252, 0.15);
  animation: rotate 20s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 任务面板 */
.task-panel {
  flex: 1;
  padding: 0 16px 16px;
  overflow-y: auto;
}

.panel-subtitle {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 12px;
  padding-left: 4px;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  transition: all 0.3s ease;
  animation: slideUp 0.5s ease-out backwards;
  position: relative;
  overflow: hidden;
}

.task-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-cyan);
  opacity: 0;
  transition: opacity 0.3s;
}

.task-item:hover {
  border-color: rgba(0, 212, 255, 0.3);
  box-shadow: 0 4px 20px rgba(0, 212, 255, 0.1);
  transform: translateX(4px);
}

.task-item:hover::before {
  opacity: 1;
}

.task-pulse {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-cyan);
  animation: task-pulse 1.5s ease-in-out infinite;
}

.task-pulse.paused {
  background: var(--color-orange);
  animation: none;
  opacity: 0.6;
}

.task-pulse.error {
  background: var(--color-red);
  animation: task-pulse 0.5s ease-in-out infinite;
}

@keyframes task-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.task-status-badge.running {
  background: rgba(0, 212, 255, 0.15);
  color: #0891b2;
}

.task-status-badge.paused {
  background: rgba(255, 184, 0, 0.15);
  color: #b45309;
}

.task-status-badge.error {
  background: rgba(255, 71, 87, 0.15);
  color: #dc2626;
}

.task-duration {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-family: 'SF Mono', monospace;
}

.task-progress-ring {
  position: relative;
  width: 40px;
  height: 40px;
}

.task-progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-ring-bg {
  fill: none;
  stroke: rgba(0, 0, 0, 0.05);
  stroke-width: 3;
}

.progress-ring-fill {
  fill: none;
  stroke: var(--color-cyan);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s ease;
}

.progress-value {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text);
}

.empty-tasks-scifi {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: var(--color-text-secondary);
}

.empty-core {
  font-size: 48px;
  opacity: 0.2;
  animation: breathe 3s ease-in-out infinite;
}

.empty-text {
  font-size: 14px;
  font-weight: 500;
  margin-top: 12px;
}

.empty-subtext {
  font-size: 12px;
  opacity: 0.6;
  margin-top: 4px;
}

/* Task transition animations */
.task-enter-active,
.task-leave-active {
  transition: all 0.4s ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.task-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ==================== 中舱室：统计卡片 ==================== */
.center-chamber {
  animation-delay: 0.1s;
}

.stats-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 20px;
}

.stat-card-scifi {
  position: relative;
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  animation: slideUp 0.5s ease-out backwards;
  transition: all 0.3s ease;
}

.stat-card-scifi:hover {
  border-color: rgba(0, 212, 255, 0.3);
  box-shadow: 0 8px 30px rgba(0, 212, 255, 0.1);
  transform: translateY(-2px);
}

.stat-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  opacity: 0;
  transition: opacity 0.3s;
}

.stat-card-scifi:hover .stat-glow {
  opacity: 1;
}

.stat-glow.cyan {
  background: linear-gradient(90deg, var(--color-cyan), transparent);
}

.stat-glow.purple {
  background: linear-gradient(90deg, var(--color-purple), transparent);
}

.stat-glow.green {
  background: linear-gradient(90deg, var(--color-green), transparent);
}

.stat-glow.orange {
  background: linear-gradient(90deg, var(--color-orange), transparent);
}

.stat-content {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.stat-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(0, 212, 255, 0.1);
  transition: all 0.3s;
}

.stat-icon-wrapper.cyan {
  background: rgba(0, 212, 255, 0.1);
}

.stat-icon-wrapper.purple {
  background: rgba(224, 195, 252, 0.3);
}

.stat-icon-wrapper.green {
  background: rgba(0, 229, 160, 0.1);
}

.stat-icon-wrapper.orange {
  background: rgba(255, 184, 0, 0.1);
}

.stat-card-scifi:hover .stat-icon-wrapper {
  transform: scale(1.1);
}

.stat-icon {
  font-size: 22px;
}

.stat-info {
  flex: 1;
}

.stat-value-wrapper {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
  font-family: 'SF Mono', monospace;
  transition: all 0.3s;
}

.stat-value.number-changing {
  animation: number-flash 0.3s ease;
}

@keyframes number-flash {
  0% { color: var(--color-cyan); transform: scale(1.1); }
  100% { color: var(--color-text); transform: scale(1); }
}

.stat-suffix {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.stat-label {
  font-size: 12px;
  color: var(--color-text-secondary);
  margin-top: 4px;
}

.stat-trend {
  position: absolute;
  top: 16px;
  right: 16px;
  font-size: 14px;
  font-weight: 700;
}

.stat-trend.up {
  color: var(--color-green);
}

.stat-trend.down {
  color: var(--color-red);
}

.stat-trend.neutral {
  color: var(--color-text-secondary);
}

/* 快捷操作面板 */
.quick-ops-panel {
  padding: 0 20px 20px;
}

.ops-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.op-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.op-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 0;
  background: linear-gradient(135deg, var(--color-cyan), var(--color-purple));
  transition: height 0.3s ease;
}

.op-btn:hover {
  border-color: rgba(0, 212, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 212, 255, 0.15);
}

.op-btn:hover::before {
  height: 3px;
}

.op-icon {
  font-size: 24px;
  transition: transform 0.3s;
}

.op-btn:hover .op-icon {
  transform: scale(1.2);
}

.op-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
}

.op-key {
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-family: 'SF Mono', monospace;
}

/* ==================== 右舱室：健康状态 ==================== */
.right-chamber {
  animation-delay: 0.2s;
}

.health-grid-scifi {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  padding: 16px;
}

.health-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  animation: slideUp 0.5s ease-out backwards;
  transition: all 0.3s ease;
  overflow: hidden;
}

.health-card:hover {
  border-color: rgba(0, 212, 255, 0.3);
  transform: translateX(4px);
}

.health-pulse {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-red);
  opacity: 0;
}

.health-pulse.active {
  opacity: 1;
  animation: health-pulse 2s ease-in-out infinite;
}

@keyframes health-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(0, 229, 160, 0.4);
  }
  50% { 
    box-shadow: 0 0 0 8px rgba(0, 229, 160, 0);
  }
}

.health-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: rgba(255, 71, 87, 0.1);
  transition: all 0.3s;
}

.health-icon-wrapper.healthy {
  background: rgba(0, 229, 160, 0.1);
}

.health-card:hover .health-icon-wrapper {
  transform: scale(1.1);
}

.health-icon {
  font-size: 20px;
}

.health-info {
  flex: 1;
}

.health-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
}

.health-status {
  font-size: 11px;
  color: var(--color-red);
  margin-top: 2px;
}

.health-card.healthy .health-status {
  color: var(--color-green);
}

.health-indicator {
  display: flex;
  align-items: center;
}

.indicator-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-red);
  transition: all 0.3s;
}

.indicator-dot.active {
  background: var(--color-green);
  box-shadow: 0 0 10px var(--color-green);
}

/* 资源监控面板 */
.resource-panel {
  flex: 1;
  padding: 0 16px 16px;
  overflow-y: auto;
}

.resource-bars {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resource-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resource-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.resource-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text);
}

.resource-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary);
  font-family: 'SF Mono', monospace;
}

.resource-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
  overflow: hidden;
}

.resource-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-cyan), var(--color-purple));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.resource-fill.cpu {
  background: linear-gradient(90deg, var(--color-green), var(--color-cyan));
}

.resource-fill.network {
  background: linear-gradient(90deg, var(--color-orange), var(--color-red));
}

/* ==================== 底舱：时间轴 ==================== */
.bottom-chamber {
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  background: var(--color-card);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.timeline-icon {
  font-size: 14px;
  color: var(--color-cyan);
}

.timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  flex: 1;
}

.timeline-id {
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-secondary);
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 4px;
  font-family: 'SF Mono', monospace;
}

.timeline-container {
  position: relative;
  overflow: hidden;
}

.timeline-scroll {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 8px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 212, 255, 0.3) transparent;
}

.timeline-scroll::-webkit-scrollbar {
  height: 4px;
}

.timeline-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.timeline-scroll::-webkit-scrollbar-thumb {
  background: rgba(0, 212, 255, 0.3);
  border-radius: 2px;
}

.timeline {
  display: flex;
  gap: 20px;
  padding: 8px 4px;
}

.timeline-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 180px;
  max-width: 220px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  animation: slideUp 0.5s ease-out backwards;
  transition: all 0.3s ease;
}

.timeline-item:hover {
  border-color: rgba(0, 212, 255, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 212, 255, 0.1);
}

.timeline-connector {
  position: relative;
  width: 100%;
  height: 20px;
  margin-bottom: 8px;
}

.connector-line {
  position: absolute;
  top: 50%;
  left: -20px;
  right: -20px;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.3), transparent);
}

.timeline-node {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 2px solid var(--color-border);
  transition: all 0.3s;
}

.timeline-item:hover .timeline-node {
  border-color: var(--color-cyan);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

.timeline-node.success {
  border-color: var(--color-green);
  color: var(--color-green);
}

.timeline-node.error {
  border-color: var(--color-red);
  color: var(--color-red);
}

.timeline-node.info {
  border-color: var(--color-cyan);
  color: var(--color-cyan);
}

.timeline-node.warning {
  border-color: var(--color-orange);
  color: var(--color-orange);
}

.node-icon {
  font-size: 12px;
  font-weight: 700;
}

.timeline-content {
  text-align: center;
}

.timeline-message {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text);
  line-height: 1.4;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.timeline-meta {
  display: flex;
  justify-content: center;
  gap: 12px;
  font-size: 11px;
}

.timeline-time {
  color: var(--color-text-secondary);
  font-family: 'SF Mono', monospace;
}

.timeline-cost {
  color: var(--color-green);
  font-weight: 600;
  font-family: 'SF Mono', monospace;
}

.timeline-glow {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 60px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8));
  pointer-events: none;
}

/* Activity transition animations */
.activity-enter-active,
.activity-leave-active {
  transition: all 0.4s ease;
}

.activity-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.activity-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ==================== 响应式设计 ==================== */
@media (max-width: 1280px) {
  .control-chambers {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
  }
  
  .left-chamber {
    grid-column: 1;
    grid-row: 1 / 3;
  }
  
  .center-chamber {
    grid-column: 2;
    grid-row: 1;
  }
  
  .right-chamber {
    grid-column: 2;
    grid-row: 2;
  }
}

@media (max-width: 900px) {
  .control-chambers {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
    overflow-y: auto;
  }
  
  .left-chamber,
  .center-chamber,
  .right-chamber {
    grid-column: 1;
    grid-row: auto;
  }
  
  .stats-container {
    grid-template-columns: 1fr 1fr;
  }
  
  .health-grid-scifi {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 640px) {
  .control-tower-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px 16px;
  }
  
  .header-left {
    flex-direction: column;
    gap: 8px;
  }
  
  .dashboard-title {
    font-size: 16px;
  }
  
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .stats-container {
    grid-template-columns: 1fr;
  }
  
  .health-grid-scifi {
    grid-template-columns: 1fr 1fr;
  }
  
  .ops-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .liquid-core {
    width: 100px;
    height: 100px;
  }
  
  .core-value {
    font-size: 24px;
  }
  
  .ring-1 { width: 130px; height: 130px; }
  .ring-2 { width: 145px; height: 145px; }
  .ring-3 { width: 160px; height: 160px; }
}

@media (max-width: 400px) {
  .ops-grid {
    grid-template-columns: 1fr;
  }
  
  .health-grid-scifi {
    grid-template-columns: 1fr;
  }
  
  .timeline-item {
    min-width: 160px;
  }
}
</style>
