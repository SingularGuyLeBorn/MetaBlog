<!--
  TaskManager - 任务管理
  关联 Agent 的任务分配 + 定时任务
-->
<template>
  <div class="task-manager">
    <div class="page-header">
      <div class="header-info">
        <h2 class="page-title">
          <Icon name="check-square" :size="20" />
          Tasks
        </h2>
        <span class="page-count">{{ tasks.length }} 个任务</span>
      </div>
      <button class="new-task-btn" @click="showCreate = true">
        <Icon name="plus" :size="14" />
        New Task
      </button>
    </div>

    <!-- 状态筛选 -->
    <div class="filter-bar">
      <div class="filter-group">
        <button
          v-for="f in statusFilters"
          :key="f.value"
          class="filter-chip"
          :class="{ active: statusFilter === f.value }"
          @click="statusFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="task-list">
      <LiquidGlass
        v-for="task in filteredTasks"
        :key="task.id"
        class="task-item-glass"
        glow-color="var(--sr-accent-star, #b8a090)"
        :intensity="0.15"
      >
        <div class="task-item">
          <div class="task-main">
            <div class="task-header">
              <h3 class="task-name">{{ task.name }}</h3>
              <span class="task-status" :class="task.status">{{ statusLabel(task.status) }}</span>
            </div>
            <p class="task-desc">{{ task.description }}</p>
            <div class="task-meta">
              <span class="meta-item">
                <Icon name="bot" :size="12" />
                分配给：{{ getAgentName(task.agentId) }}
              </span>
              <span class="meta-item">
                <Icon name="clock" :size="12" />
                {{ taskTypeLabel(task.type) }}
              </span>
              <span v-if="task.schedule" class="meta-item">
                <Icon name="calendar" :size="12" />
                {{ task.schedule }}
              </span>
            </div>
          </div>
          <div class="task-actions">
            <button class="action-btn" @click="editTask(task)">
              <Icon name="edit-2" :size="12" />
            </button>
            <button
              v-if="task.status === 'running'"
              class="action-btn warning"
              @click="pauseTask(task.id)"
            >
              <Icon name="pause" :size="12" />
            </button>
            <button
              v-else-if="task.status === 'paused'"
              class="action-btn success"
              @click="resumeTask(task.id)"
            >
              <Icon name="play" :size="12" />
            </button>
            <button class="action-btn danger" @click="deleteTask(task.id)">
              <Icon name="trash-2" :size="12" />
            </button>
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 新建/编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
          <div class="modal-card">
            <h3 class="modal-title">{{ editingTask ? '编辑任务' : '新建任务' }}</h3>
            <div class="modal-body">
              <div class="form-group">
                <label>任务名称</label>
                <input v-model="taskForm.name" type="text" class="lg-input" placeholder="输入任务名称" />
              </div>
              <div class="form-group">
                <label>描述</label>
                <textarea v-model="taskForm.description" class="lg-input" rows="2" placeholder="任务描述..." />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label>类型</label>
                  <DropdownSelect
                    v-model="taskForm.type"
                    :options="[
                      { value: 'once', label: '单次任务' },
                      { value: 'scheduled', label: '定时任务' },
                      { value: 'event', label: '事件驱动' }
                    ]"
                    placeholder="选择类型"
                  />
                </div>
                <div class="form-group">
                  <label>优先级</label>
                  <DropdownSelect
                    v-model="taskForm.priority"
                    :options="[
                      { value: 'low', label: '低' },
                      { value: 'medium', label: '中' },
                      { value: 'high', label: '高' },
                      { value: 'urgent', label: '紧急' }
                    ]"
                    placeholder="选择优先级"
                  />
                </div>
              </div>
              <div class="form-group">
                <label>分配给 Agent</label>
                <DropdownSelect
                  v-model="taskForm.agentId"
                  :options="[{ value: '', label: '未分配' }, ...agents.map(a => ({ value: a.id, label: a.name }))]"
                  placeholder="选择 Agent"
                />
              </div>
              <div v-if="taskForm.type === 'scheduled'" class="form-group">
                <label>Cron 表达式</label>
                <input v-model="taskForm.schedule" type="text" class="lg-input" placeholder="0 9 * * *" />
                <span class="form-hint">例如: 0 9 * * 1 (每周一早9点)</span>
              </div>
              <div class="form-group">
                <label>任务内容</label>
                <textarea v-model="taskForm.content" class="lg-input" rows="4" placeholder="任务执行内容或指令..." />
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn-secondary" @click="showCreate = false">
                <Icon name="x" :size="14" />
                取消
              </button>
              <button class="btn-primary" @click="saveTask">
                <Icon name="save" :size="14" />
                保存
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { DropdownSelect, Icon, LiquidGlass } from '@/theme/components/common'
import { useAgentConfig } from '@/theme/stores'
import { computed, ref } from 'vue'

const { agents } = useAgentConfig()

interface Task {
  id: string
  name: string
  description: string
  agentId: string
  type: 'once' | 'scheduled' | 'event'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  schedule?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  content: string
  createdAt: string
  updatedAt: string
}

const tasks = ref<Task[]>([])
const statusFilter = ref('all')
const showCreate = ref(false)
const editingTask = ref<Task | null>(null)

interface TaskForm {
  name: string
  description: string
  agentId: string
  type: 'once' | 'scheduled' | 'event'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  schedule: string
  content: string
}

const taskForm = ref<TaskForm>({
  name: '',
  description: '',
  agentId: '',
  type: 'once',
  priority: 'medium',
  schedule: '',
  content: ''
})

function resetTaskForm() {
  taskForm.value = {
    name: '',
    description: '',
    agentId: '',
    type: 'once',
    priority: 'medium',
    schedule: '',
    content: ''
  }
}

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '进行中', value: 'running' },
  { label: '已暂停', value: 'paused' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
  { label: '定时', value: 'scheduled' }
]

const filteredTasks = computed(() => {
  let result = tasks.value
  if (statusFilter.value !== 'all') {
    if (statusFilter.value === 'scheduled') {
      result = result.filter(t => t.type === 'scheduled')
    } else {
      result = result.filter(t => t.status === statusFilter.value)
    }
  }
  return result
})

function getAgentName(agentId: string): string {
  return agents.value.find(a => a.id === agentId)?.name || '未分配'
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: '等待中',
    running: '进行中',
    paused: '已暂停',
    completed: '已完成',
    failed: '失败'
  }
  return map[status] || status
}

function taskTypeLabel(type: string): string {
  const map: Record<string, string> = {
    once: '单次任务',
    scheduled: '定时任务',
    event: '事件驱动'
  }
  return map[type] || type
}

function editTask(task: Task) {
  editingTask.value = task
  taskForm.value = {
    name: task.name,
    description: task.description || '',
    agentId: task.agentId || '',
    type: task.type,
    priority: task.priority,
    schedule: task.schedule || '',
    content: task.content || ''
  }
  showCreate.value = true
}

async function saveTask() {
  const body = { ...taskForm.value }
  try {
    if (editingTask.value) {
      const res = await fetch('/api/tasks/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingTask.value.id, ...body })
      })
      const json = await res.json()
      if (json.success) {
        const idx = tasks.value.findIndex(t => t.id === editingTask.value!.id)
        if (idx > -1) tasks.value[idx] = json.data
      }
    } else {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const json = await res.json()
      if (json.success) {
        tasks.value.push(json.data)
      }
    }
  } catch (e) {
    console.error('[TaskManager] 保存任务失败:', e)
  }
  showCreate.value = false
  editingTask.value = null
  resetTaskForm()
}

async function pauseTask(id: string) {
  try {
    const res = await fetch(`/api/tasks/${id}/pause`, { method: 'POST' })
    const json = await res.json()
    if (json.success) {
      const idx = tasks.value.findIndex(t => t.id === id)
      if (idx > -1) tasks.value[idx] = json.data
    }
  } catch (e) {
    console.error('[TaskManager] 暂停任务失败:', e)
  }
}

async function resumeTask(id: string) {
  try {
    const res = await fetch(`/api/tasks/${id}/resume`, { method: 'POST' })
    const json = await res.json()
    if (json.success) {
      const idx = tasks.value.findIndex(t => t.id === id)
      if (idx > -1) tasks.value[idx] = json.data
    }
  } catch (e) {
    console.error('[TaskManager] 恢复任务失败:', e)
  }
}

async function deleteTask(id: string) {
  if (!confirm('确定删除这个任务吗？')) return
  try {
    const res = await fetch('/api/tasks/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const json = await res.json()
    if (json.success) {
      tasks.value = tasks.value.filter(t => t.id !== id)
    }
  } catch (e) {
    console.error('[TaskManager] 删除任务失败:', e)
  }
}

// 加载任务
async function loadTasks() {
  try {
    const res = await fetch('/api/tasks')
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      tasks.value = json.data
    }
  } catch (e) {
    console.error('[TaskManager] 加载任务失败:', e)
  }
}

loadTasks()
</script>

<style scoped>
.task-manager {
  padding: 8px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.page-count {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.new-task-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(184, 160, 144, 0.25);
}

.filter-bar {
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(200, 195, 188, 0.25);
  border-radius: 20px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip.active {
  background: rgba(184, 160, 144, 0.15);
  border-color: rgba(184, 160, 144, 0.3);
  color: var(--sr-morandi-purple, #b3a8b8);
  font-weight: 600;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.task-item-glass {
  border-radius: 16px;
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
}

.task-main {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.task-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.task-status {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.task-status.running {
  background: rgba(168, 179, 168, 0.2);
  color: #6a8a6a;
}

.task-status.paused {
  background: rgba(212, 196, 176, 0.2);
  color: #a89070;
}

.task-status.completed {
  background: rgba(157, 170, 184, 0.2);
  color: #5a7a9a;
}

.task-status.failed {
  background: rgba(212, 184, 184, 0.2);
  color: #a87070;
}

.task-status.pending {
  background: rgba(200, 195, 188, 0.2);
  color: #94a3b8;
}

.task-desc {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  line-height: 1.5;
}

.task-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.task-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 8px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(184, 160, 144, 0.12);
  color: var(--sr-morandi-purple, #b3a8b8);
}

.action-btn.danger:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  z-index: 200;
  padding: 24px;
}

.modal-card {
  width: 100%;
  max-width: 520px;
  background: var(--sr-bg-primary, #f8f6f3);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.12);
}

.modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 60vh;
  overflow-y: auto;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-hint {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.modal-title {
  margin: 0 0 16px;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.modal-placeholder {
  padding: 40px;
  text-align: center;
  color: var(--sr-text-muted, #94a3b8);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
