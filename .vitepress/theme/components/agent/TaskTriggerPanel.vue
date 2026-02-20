<template>
  <div class="task-trigger-panel">
    <header class="panel-header">
      <h3 class="panel-title">
        <span class="title-icon">🤖</span>
        Agent 后台任务
      </h3>
      <span class="task-count" v-if="taskStats.total > 0">
        {{ taskStats.running }} 运行 / {{ taskStats.pending }} 等待
      </span>
    </header>

    <!-- 任务模板列表 -->
    <div class="templates-section">
      <h4 class="section-title">快速触发</h4>
      <div class="template-grid">
        <button
          v-for="template in templates"
          :key="template.type"
          class="template-card"
          :class="{ disabled: isTriggering }"
          @click="triggerTask(template)"
          :disabled="isTriggering"
        >
          <span class="template-icon">{{ template.icon }}</span>
          <div class="template-info">
            <span class="template-name">{{ template.name }}</span>
            <span class="template-desc">{{ template.description }}</span>
          </div>
          <span class="trigger-icon">▶</span>
        </button>
      </div>
    </div>

    <!-- 运行中的任务 -->
    <div class="running-section" v-if="runningTasks.length > 0">
      <h4 class="section-title">运行中</h4>
      <div class="task-list">
        <div
          v-for="task in runningTasks"
          :key="task.id"
          class="task-item running"
        >
          <div class="task-progress-ring">
            <svg viewBox="0 0 36 36">
              <path
                class="progress-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                class="progress-fill"
                :stroke-dasharray="`${task.progress}, 100`"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span class="progress-text">{{ task.progress }}%</span>
          </div>
          <div class="task-info">
            <span class="task-name">{{ task.name }}</span>
            <span class="task-step">{{ task.currentStep || '执行中...' }}</span>
          </div>
          <button class="cancel-btn" @click="cancelTask(task.id)">✕</button>
        </div>
      </div>
    </div>

    <!-- 最近完成的任务 -->
    <div class="recent-section" v-if="recentTasks.length > 0">
      <h4 class="section-title">最近完成</h4>
      <div class="task-list">
        <div
          v-for="task in recentTasks"
          :key="task.id"
          class="task-item"
          :class="task.status"
        >
          <span class="status-icon">
            {{ task.status === 'completed' ? '✓' : task.status === 'failed' ? '✕' : '⏸' }}
          </span>
          <div class="task-info">
            <span class="task-name">{{ task.name }}</span>
            <span class="task-time">{{ formatTime(task.completedAt) }}</span>
          </div>
          <div class="task-actions">
            <button
              v-if="task.status === 'failed'"
              class="retry-btn"
              @click="retryTask(task.id)"
            >
              重试
            </button>
            <button class="delete-btn" @click="deleteTask(task.id)">🗑</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务统计 -->
    <div class="stats-section">
      <div class="stat-item">
        <span class="stat-value">{{ taskStats.total }}</span>
        <span class="stat-label">总任务</span>
      </div>
      <div class="stat-item">
        <span class="stat-value success">{{ taskStats.completed }}</span>
        <span class="stat-label">成功</span>
      </div>
      <div class="stat-item">
        <span class="stat-value error">{{ taskStats.failed }}</span>
        <span class="stat-label">失败</span>
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface TaskTemplate {
  type: string
  name: string
  description: string
  icon: string
}

interface BackgroundTask {
  id: string
  type: string
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStep?: string
  completedAt?: number
}

const templates = ref<TaskTemplate[]>([])
const tasks = ref<BackgroundTask[]>([])
const isTriggering = ref(false)
const error = ref('')
const refreshInterval = ref<number | null>(null)

const runningTasks = computed(() => 
  tasks.value.filter(t => t.status === 'running' || t.status === 'pending')
    .sort((a, b) => b.progress - a.progress)
)

const recentTasks = computed(() =>
  tasks.value.filter(t => t.status === 'completed' || t.status === 'failed' || t.status === 'cancelled')
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5)
)

const taskStats = computed(() => {
  const stats = { total: 0, pending: 0, running: 0, completed: 0, failed: 0 }
  tasks.value.forEach(t => {
    stats.total++
    stats[t.status]++
  })
  return stats
})

// 加载任务模板
async function loadTemplates() {
  try {
    const response = await fetch('/api/agent/tasks/templates')
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        templates.value = data.data
      }
    }
  } catch (e) {
    console.error('Failed to load templates:', e)
  }
}

// 加载任务列表
async function loadTasks() {
  try {
    const response = await fetch('/api/agent/tasks')
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        tasks.value = data.data
      }
    }
  } catch (e) {
    console.error('Failed to load tasks:', e)
  }
}

// 触发任务
async function triggerTask(template: TaskTemplate) {
  if (isTriggering.value) return
  
  isTriggering.value = true
  error.value = ''
  
  try {
    const response = await fetch('/api/agent/tasks/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: template.type,
        name: template.name
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      await loadTasks()
    } else {
      error.value = data.error || '触发任务失败'
    }
  } catch (e) {
    error.value = '网络错误'
  } finally {
    isTriggering.value = false
  }
}

// 取消任务
async function cancelTask(taskId: string) {
  try {
    const response = await fetch('/api/agent/tasks/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    })
    
    if (response.ok) {
      await loadTasks()
    }
  } catch (e) {
    console.error('Failed to cancel task:', e)
  }
}

// 重试任务
async function retryTask(taskId: string) {
  try {
    const response = await fetch('/api/agent/tasks/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    })
    
    if (response.ok) {
      await loadTasks()
    }
  } catch (e) {
    console.error('Failed to retry task:', e)
  }
}

// 删除任务
async function deleteTask(taskId: string) {
  try {
    const response = await fetch('/api/agent/tasks/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId })
    })
    
    if (response.ok) {
      await loadTasks()
    }
  } catch (e) {
    console.error('Failed to delete task:', e)
  }
}

// 格式化时间
function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  await Promise.all([loadTemplates(), loadTasks()])
  
  // 每 2 秒刷新一次任务状态
  refreshInterval.value = window.setInterval(loadTasks, 2000)
})

onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<style scoped>
.task-trigger-panel {
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.title-icon {
  font-size: 20px;
}

.task-count {
  font-size: 12px;
  color: var(--vp-c-text-2);
  padding: 4px 8px;
  background: var(--vp-c-bg);
  border-radius: 12px;
}

.section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 16px 0 8px;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}

.template-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.template-card:hover:not(.disabled) {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 2px var(--vp-c-brand-dimm);
}

.template-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.template-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.template-desc {
  display: block;
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.trigger-icon {
  font-size: 10px;
  color: var(--vp-c-brand);
  opacity: 0;
  transition: opacity 0.2s;
}

.template-card:hover .trigger-icon {
  opacity: 1;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
}

.task-item.running {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-dimm);
}

.task-item.completed {
  border-left: 3px solid var(--vp-c-green);
}

.task-item.failed {
  border-left: 3px solid var(--vp-c-red);
}

.task-progress-ring {
  position: relative;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.task-progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.progress-bg {
  fill: none;
  stroke: var(--vp-c-divider);
  stroke-width: 3;
}

.progress-fill {
  fill: none;
  stroke: var(--vp-c-brand);
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.3s;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 9px;
  font-weight: 600;
  color: var(--vp-c-brand);
}

.status-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  flex-shrink: 0;
}

.task-item.completed .status-icon {
  background: var(--vp-c-green-dimm);
  color: var(--vp-c-green);
}

.task-item.failed .status-icon {
  background: var(--vp-c-red-dimm);
  color: var(--vp-c-red);
}

.task-info {
  flex: 1;
  min-width: 0;
}

.task-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.task-step,
.task-time {
  display: block;
  font-size: 11px;
  color: var(--vp-c-text-2);
  margin-top: 2px;
}

.cancel-btn,
.delete-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.cancel-btn:hover {
  background: var(--vp-c-red-dimm);
  color: var(--vp-c-red);
}

.retry-btn {
  padding: 4px 8px;
  font-size: 11px;
  border: 1px solid var(--vp-c-brand);
  background: transparent;
  color: var(--vp-c-brand);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.retry-btn:hover {
  background: var(--vp-c-brand);
  color: white;
}

.delete-btn:hover {
  background: var(--vp-c-red-dimm);
  color: var(--vp-c-red);
}

.task-actions {
  display: flex;
  gap: 4px;
}

.stats-section {
  display: flex;
  gap: 16px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.stat-value.success {
  color: var(--vp-c-green);
}

.stat-value.error {
  color: var(--vp-c-red);
}

.stat-label {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

.error-message {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--vp-c-red-dimm);
  color: var(--vp-c-red);
  border-radius: 6px;
  font-size: 12px;
}
</style>
