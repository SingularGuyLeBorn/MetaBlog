<template>
  <div class="task-manager">
    <!-- 头部 -->
    <div class="tm-header">
      <Icon name="list-checks" class="tm-icon" />
      <div>
        <h2 class="tm-title">任务管理</h2>
        <p class="tm-desc">查看和管理 Agent 任务队列</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <LiquidGlass
        v-for="s in statusStats"
        :key="s.status"
        class="stat-card-glass"
        :glow-color="s.color"
        :intensity="0.25"
        @click="statusFilter = s.status === statusFilter ? '' : s.status"
      >
        <div class="stat-card" :class="{ active: statusFilter === s.status }">
          <div class="stat-count">{{ s.count }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 操作栏 -->
    <div class="toolbar">
      <div class="filter-tabs">
        <button
          v-for="s in filterOptions"
          :key="s.value"
          class="filter-tab"
          :class="{ active: statusFilter === s.value }"
          @click="statusFilter = s.value"
        >
          {{ s.label }}
        </button>
      </div>
      <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.4">
        <button class="trigger-btn" @click="showTriggerModal = true">
          <Icon name="plus" />
          新建任务
        </button>
      </LiquidGlass>
    </div>

    <!-- 任务列表 -->
    <div v-if="loading" class="loading-state">
      <Icon name="loader-2" spin class="loading-icon" />
      加载中...
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="tasks.length === 0" class="empty-state">
      <Icon name="inbox" class="empty-icon" />
      暂无任务
    </div>
    <div v-else class="task-list">
      <LiquidGlass
        v-for="task in tasks"
        :key="task.id"
        class="task-card-glass"
        :glow-color="getStatusColor(task.status)"
        :intensity="0.2"
      >
        <div class="task-card">
          <div class="task-main">
            <div class="task-id">#{{ task.id.slice(-8) }}</div>
            <div class="task-name">{{ task.name || task.type || '未命名任务' }}</div>
            <div class="task-meta">
              <span class="task-type">{{ task.type }}</span>
              <span class="task-time">{{ formatTime(task.createdAt) }}</span>
            </div>
          </div>
          <div class="task-status">
            <span class="status-badge" :class="task.status">
              <span class="status-dot" />
              {{ getStatusLabel(task.status) }}
            </span>
          </div>
          <div class="task-actions">
            <button class="action-btn" title="查看详情" @click="viewDetail(task.id)">
              <Icon name="eye" />
            </button>
            <button
              v-if="task.status === 'running' || task.status === 'pending'"
              class="action-btn"
              title="取消"
              @click="cancelTask(task.id)"
            >
              <Icon name="square" />
            </button>
            <button
              v-if="task.status === 'failed' || task.status === 'cancelled'"
              class="action-btn retry"
              title="重试"
              @click="retryTask(task.id)"
            >
              <Icon name="refresh-cw" />
            </button>
            <button class="action-btn danger" title="删除" @click="deleteTask(task.id)">
              <Icon name="trash-2" />
            </button>
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 新建任务弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showTriggerModal" class="modal-overlay" @click.self="showTriggerModal = false">
          <LiquidGlass class="modal-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.4">
            <div class="trigger-modal">
              <div class="modal-header">
                <h3>新建任务</h3>
                <button class="close-btn" @click="showTriggerModal = false">
                  <Icon name="x" />
                </button>
              </div>

              <div class="modal-body">
                <div class="form-group">
                  <label>任务模板</label>
                  <select v-model="triggerForm.template" class="lg-input" @change="onTemplateChange">
                    <option value="">自定义</option>
                    <option v-for="t in templates" :key="t.type" :value="t.type">
                      {{ t.name || t.type }}
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>任务名称</label>
                  <input v-model="triggerForm.name" type="text" class="lg-input" placeholder="输入任务名称..." />
                </div>

                <div class="form-group">
                  <label>任务类型</label>
                  <input v-model="triggerForm.type" type="text" class="lg-input" placeholder="如: sync, crawl, analyze..." />
                </div>

                <div class="form-group">
                  <label>描述</label>
                  <textarea v-model="triggerForm.description" class="lg-input" rows="2" placeholder="任务描述..." />
                </div>

                <div class="form-group">
                  <label>参数 (JSON)</label>
                  <textarea v-model="triggerForm.params" class="lg-input json-input" rows="4" placeholder='{"key": "value"}' />
                </div>
              </div>

              <div class="modal-footer">
                <LiquidGlass glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
                  <button class="lg-btn" @click="showTriggerModal = false">取消</button>
                </LiquidGlass>
                <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.5">
                  <button class="lg-btn lg-btn-primary" :disabled="triggerLoading" @click="triggerTask">
                    <Icon v-if="triggerLoading" name="loader-2" spin />
                    <Icon v-else name="play-circle" />
                    {{ triggerLoading ? '创建中...' : '创建任务' }}
                  </button>
                </LiquidGlass>
              </div>
            </div>
          </LiquidGlass>
        </div>
      </Transition>
    </Teleport>

    <!-- 任务详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDetailModal" class="modal-overlay" @click.self="showDetailModal = false">
          <LiquidGlass class="modal-glass" glow-color="var(--sr-morandi-blue, #9aa8b8)" :intensity="0.35">
            <div class="detail-modal">
              <div class="modal-header">
                <h3>任务详情</h3>
                <button class="close-btn" @click="showDetailModal = false">
                  <Icon name="x" />
                </button>
              </div>

              <div v-if="detailLoading" class="modal-body loading">
                <Icon name="loader-2" spin class="loading-icon" />
                加载中...
              </div>
              <div v-else-if="detailError" class="modal-body error">{{ detailError }}</div>
              <div v-else-if="detailTask" class="modal-body">
                <div class="detail-row">
                  <span class="detail-label">ID</span>
                  <span class="detail-value">{{ detailTask.id }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">名称</span>
                  <span class="detail-value">{{ detailTask.name || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">类型</span>
                  <span class="detail-value">{{ detailTask.type || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">状态</span>
                  <span class="detail-value">
                    <span class="status-badge" :class="detailTask.status">
                      <span class="status-dot" />
                      {{ getStatusLabel(detailTask.status) }}
                    </span>
                  </span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">描述</span>
                  <span class="detail-value">{{ detailTask.description || '—' }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">创建时间</span>
                  <span class="detail-value">{{ formatTime(detailTask.createdAt) }}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">更新时间</span>
                  <span class="detail-value">{{ formatTime(detailTask.updatedAt) }}</span>
                </div>
                <div v-if="detailTask.params" class="detail-row">
                  <span class="detail-label">参数</span>
                  <pre class="detail-json">{{ JSON.stringify(detailTask.params, null, 2) }}</pre>
                </div>
                <div v-if="detailTask.result" class="detail-row">
                  <span class="detail-label">结果</span>
                  <pre class="detail-json">{{ JSON.stringify(detailTask.result, null, 2) }}</pre>
                </div>
                <div v-if="detailTask.error" class="detail-row">
                  <span class="detail-label">错误</span>
                  <pre class="detail-json error-json">{{ detailTask.error }}</pre>
                </div>
              </div>
            </div>
          </LiquidGlass>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Icon, LiquidGlass } from '@/theme/components/common'
import { ref, onMounted, computed, watch } from 'vue'

interface Task {
  id: string
  name?: string
  description?: string
  type?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  createdAt: number
  updatedAt?: number
  params?: any
  result?: any
  error?: string
  metadata?: any
}

interface TaskTemplate {
  type: string
  name?: string
  description?: string
  defaultParams?: any
}

interface TaskStats {
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

const tasks = ref<Task[]>([])
const templates = ref<TaskTemplate[]>([])
const stats = ref<TaskStats>({ pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 })
const loading = ref(false)
const error = ref('')
const statusFilter = ref('')

const showTriggerModal = ref(false)
const triggerLoading = ref(false)
const triggerForm = ref({
  template: '',
  name: '',
  type: '',
  description: '',
  params: ''
})

const showDetailModal = ref(false)
const detailTask = ref<Task | null>(null)
const detailLoading = ref(false)
const detailError = ref('')

const filterOptions = [
  { label: '全部', value: '' },
  { label: '待处理', value: 'pending' },
  { label: '运行中', value: 'running' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
  { label: '已取消', value: 'cancelled' },
]

const statusStats = computed(() => [
  { status: 'pending', label: '待处理', count: stats.value.pending, color: 'var(--sr-morandi-blue, #9aa8b8)' },
  { status: 'running', label: '运行中', count: stats.value.running, color: 'var(--sr-accent-star, #b8a090)' },
  { status: 'completed', label: '已完成', count: stats.value.completed, color: 'var(--sr-morandi-green, #a8b3a8)' },
  { status: 'failed', label: '失败', count: stats.value.failed, color: 'var(--sr-morandi-pink, #d4b8b8)' },
  { status: 'cancelled', label: '已取消', count: stats.value.cancelled, color: 'var(--sr-text-muted, #94a3b8)' },
])

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    pending: 'var(--sr-morandi-blue, #9aa8b8)',
    running: 'var(--sr-accent-star, #b8a090)',
    completed: 'var(--sr-morandi-green, #a8b3a8)',
    failed: 'var(--sr-morandi-pink, #d4b8b8)',
    cancelled: 'var(--sr-text-muted, #94a3b8)',
  }
  return map[status] || 'var(--sr-text-muted, #94a3b8)'
}

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待处理',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  }
  return map[status] || status
}

function formatTime(ts?: number) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN')
}

async function loadTasks() {
  loading.value = true
  error.value = ''
  try {
    const url = statusFilter.value
      ? `/api/agent/tasks?status=${statusFilter.value}`
      : '/api/agent/tasks'
    const res = await fetch(url)
    const json = await res.json()
    if (json.success) {
      tasks.value = json.data || []
      if (json.stats) {
        stats.value = json.stats
      }
    } else {
      error.value = json.message || '加载失败'
    }
  } catch (e) {
    error.value = '加载任务列表失败'
    console.error('[TaskManager] 加载失败:', e)
  } finally {
    loading.value = false
  }
}

async function loadTemplates() {
  try {
    const res = await fetch('/api/agent/tasks/templates')
    const json = await res.json()
    if (json.success) {
      templates.value = json.data || []
    }
  } catch (e) {
    console.error('[TaskManager] 加载模板失败:', e)
  }
}

function onTemplateChange() {
  const t = templates.value.find(x => x.type === triggerForm.value.template)
  if (t) {
    triggerForm.value.type = t.type
    if (t.defaultParams) {
      triggerForm.value.params = JSON.stringify(t.defaultParams, null, 2)
    }
  }
}

async function triggerTask() {
  triggerLoading.value = true
  try {
    let params: any = {}
    if (triggerForm.value.params.trim()) {
      try {
        params = JSON.parse(triggerForm.value.params)
      } catch {
        alert('参数 JSON 格式错误')
        triggerLoading.value = false
        return
      }
    }

    const res = await fetch('/api/agent/tasks/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: triggerForm.value.name || undefined,
        type: triggerForm.value.type || 'custom',
        description: triggerForm.value.description || undefined,
        params,
      })
    })
    const json = await res.json()
    if (json.success) {
      showTriggerModal.value = false
      triggerForm.value = { template: '', name: '', type: '', description: '', params: '' }
      await loadTasks()
    } else {
      alert('创建失败: ' + (json.message || '未知错误'))
    }
  } catch (e) {
    alert('创建失败: ' + String(e))
  } finally {
    triggerLoading.value = false
  }
}

async function cancelTask(id: string) {
  if (!confirm('确定要取消这个任务吗？')) return
  try {
    const res = await fetch('/api/agent/tasks/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: id })
    })
    const json = await res.json()
    if (json.success) {
      await loadTasks()
    } else {
      alert('取消失败: ' + (json.message || '未知错误'))
    }
  } catch (e) {
    alert('取消失败: ' + String(e))
  }
}

async function retryTask(id: string) {
  try {
    const res = await fetch('/api/agent/tasks/retry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: id })
    })
    const json = await res.json()
    if (json.success) {
      await loadTasks()
    } else {
      alert('重试失败: ' + (json.message || '未知错误'))
    }
  } catch (e) {
    alert('重试失败: ' + String(e))
  }
}

async function deleteTask(id: string) {
  if (!confirm('确定要删除这个任务吗？')) return
  try {
    const res = await fetch('/api/agent/tasks/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: id })
    })
    const json = await res.json()
    if (json.success) {
      await loadTasks()
    } else {
      alert('删除失败: ' + (json.message || '未知错误'))
    }
  } catch (e) {
    alert('删除失败: ' + String(e))
  }
}

async function viewDetail(id: string) {
  showDetailModal.value = true
  detailLoading.value = true
  detailError.value = ''
  detailTask.value = null
  try {
    const res = await fetch(`/api/agent/tasks/detail?id=${id}`)
    const json = await res.json()
    if (json.success) {
      detailTask.value = json.data
    } else {
      detailError.value = json.message || '加载失败'
    }
  } catch (e) {
    detailError.value = '加载详情失败'
    console.error('[TaskManager] 加载详情失败:', e)
  } finally {
    detailLoading.value = false
  }
}

watch(statusFilter, loadTasks)

onMounted(() => {
  loadTasks()
  loadTemplates()
})
</script>

<style scoped>
.task-manager {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

/* 头部 */
.tm-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.tm-icon {
  width: 48px;
  height: 48px;
  color: var(--sr-accent-star, #b8a090);
}

.tm-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.tm-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.stat-card-glass {
  border-radius: 16px;
  cursor: pointer;
}

.stat-card {
  padding: 20px;
  text-align: center;
  transition: all 0.2s;
}

.stat-card.active {
  background: rgba(184, 160, 144, 0.08);
}

.stat-count {
  font-size: 28px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.stat-label {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  margin-top: 4px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.6));
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  border-color: rgba(184, 160, 144, 0.3);
  color: var(--sr-accent-star, #b8a090);
}

.filter-tab.active {
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
  border-color: transparent;
}

.trigger-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.trigger-btn svg {
  width: 16px;
  height: 16px;
}

/* 列表状态 */
.loading-state,
.error-state,
.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 15px;
}

.error-state {
  color: var(--sr-morandi-pink, #d4b8b8);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.loading-icon {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}

/* 任务列表 */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-card-glass {
  border-radius: 16px;
}

.task-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-id {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
  font-family: monospace;
  margin-bottom: 2px;
}

.task-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.task-type {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-accent-star, #b8a090);
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: 500;
}

.task-status {
  flex-shrink: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-badge.pending {
  background: rgba(154, 168, 184, 0.12);
  color: var(--sr-morandi-blue, #9aa8b8);
}

.status-badge.running {
  background: rgba(184, 160, 144, 0.12);
  color: var(--sr-accent-star, #b8a090);
}

.status-badge.completed {
  background: rgba(168, 179, 168, 0.12);
  color: var(--sr-morandi-green, #a8b3a8);
}

.status-badge.failed {
  background: rgba(212, 184, 184, 0.12);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.status-badge.cancelled {
  background: rgba(148, 163, 184, 0.12);
  color: var(--sr-text-muted, #94a3b8);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.task-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.action-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(184, 160, 144, 0.1);
  border-color: rgba(184, 160, 144, 0.2);
  color: var(--sr-accent-star, #b8a090);
}

.action-btn.danger:hover {
  background: rgba(212, 184, 184, 0.1);
  border-color: rgba(212, 184, 184, 0.2);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.action-btn.retry:hover {
  background: rgba(168, 179, 168, 0.1);
  border-color: rgba(168, 179, 168, 0.2);
  color: var(--sr-morandi-green, #a8b3a8);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1100;
  padding: 24px;
}

.modal-glass {
  width: 90%;
  max-width: 520px;
  max-height: 85vh;
  overflow-y: auto;
  border-radius: 24px;
}

.trigger-modal,
.detail-modal {
  padding: 28px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
  transform: rotate(90deg);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.modal-body {
  max-height: 60vh;
  overflow-y: auto;
}

.modal-body.loading,
.modal-body.error {
  text-align: center;
  padding: 32px;
}

.modal-body.error {
  color: var(--sr-morandi-pink, #d4b8b8);
}

.form-group {
  margin-bottom: 18px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.lg-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.lg-input:focus {
  border-color: var(--sr-accent-star, #b8a090);
  box-shadow: 0 0 0 3px rgba(184, 160, 144, 0.1);
}

.json-input {
  font-family: monospace;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.lg-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--sr-text-primary, #1a1a2e);
  transition: all 0.2s;
}

.lg-btn-primary {
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 详情 */
.detail-row {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  align-items: flex-start;
}

.detail-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-text-muted, #94a3b8);
}

.detail-value {
  flex: 1;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  word-break: break-all;
}

.detail-json {
  flex: 1;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 8px;
  padding: 10px;
  font-size: 12px;
  font-family: monospace;
  color: #4a4a5a;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.error-json {
  color: var(--sr-morandi-pink, #d4b8b8);
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

@media (max-width: 640px) {
  .task-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
