<script setup lang="ts">
/**
 * HistoryViewer-AGI
 * 增强历史查看器 - 融合人工编辑历史和 Agent 操作历史
 * 
 * 新增：
 * - 区分人工 Commit (蓝色) 和 Agent Commit (紫色)
 * - Agent 任务时间轴展示
 * - 思考链回放
 * - 决策点标记
 */
import { ref, computed, onMounted } from 'vue'
import * as Diff from 'diff'
import { AgentRuntime } from '../../../agent/core/AgentRuntime'
import type { GitCommitInfo, TaskHistory, TaskStep } from '../../../agent/core/types'

// 标签页类型
type TabType = 'file' | 'folder' | 'agent'

// 状态
const activeTab = ref<TabType>('file')
const gitHistory = ref<GitCommitInfo[]>([])
const agentHistory = ref<TaskHistory[]>([])
const selectedCommit = ref<GitCommitInfo | null>(null)
const selectedTask = ref<TaskHistory | null>(null)
const selectedStep = ref<TaskStep | null>(null)
const diffHtml = ref('')
const isLoading = ref(false)

// Agent Runtime
const agent = AgentRuntime.getInstance({ mode: 'MANUAL' })

// 过滤后的人工历史
const humanHistory = computed(() => 
  gitHistory.value.filter(c => c.author === 'human')
)

// 过滤后的 Agent 历史
const agentCommits = computed(() => 
  gitHistory.value.filter(c => c.author === 'agent')
)

onMounted(async () => {
  await loadHistory()
})

// 加载历史
async function loadHistory() {
  isLoading.value = true
  try {
    // 加载 Git 历史
    const res = await fetch('/api/git/log')
    if (res.ok) {
      const logs = await res.json()
      gitHistory.value = logs.map((log: any) => parseCommit(log))
    }

    // 加载 Agent 任务历史
    const taskHistories = await agent.getMemory().listTaskHistories(50)
    agentHistory.value = taskHistories
  } catch (e) {
    console.error('Failed to load history:', e)
  } finally {
    isLoading.value = false
  }
}

// 解析 Git 提交信息
function parseCommit(log: any): GitCommitInfo {
  const isAgent = log.message.includes('agent(')
  
  // 解析 Agent 提交的元数据
  const metadata: any = {}
  if (isAgent) {
    const match = log.message.match(/agent\(([^)]+)\)/)
    if (match) metadata.taskId = match[1]
    
    // 解析更多元数据（从提交消息体）
    const lines = log.message.split('\n')
    for (const line of lines) {
      if (line.includes('Model:')) metadata.model = line.split(':')[1]?.trim()
      if (line.includes('Tokens:')) metadata.tokens = parseInt(line.split(':')[1])
      if (line.includes('Cost:')) metadata.cost = parseFloat(line.split(':')[1]?.replace('$', ''))
      if (line.includes('Skill:')) metadata.skill = line.split(':')[1]?.trim()
    }
  }

  return {
    hash: log.hash,
    message: log.message.split('\n')[0],
    author: isAgent ? 'agent' : 'human',
    model: metadata.model,
    timestamp: log.date,
    skill: metadata.skill,
    tokens: metadata.tokens,
    cost: metadata.cost,
    taskId: metadata.taskId
  }
}

// 查看提交详情
function viewCommit(commit: GitCommitInfo) {
  selectedCommit.value = commit
  selectedTask.value = null
  selectedStep.value = null

  // 模拟 Diff（实际应该调用 API 获取真实 Diff）
  generateMockDiff(commit)
}

// 查看任务详情
function viewTask(task: TaskHistory) {
  selectedTask.value = task
  selectedCommit.value = null
  selectedStep.value = null
}

// 查看步骤详情
function viewStep(step: TaskStep) {
  selectedStep.value = step
}

// 生成模拟 Diff
function generateMockDiff(commit: GitCommitInfo) {
  const oldText = commit.author === 'agent' 
    ? '// Agent generated content'
    : '// Original content'
  const newText = commit.message
  
  const diff = Diff.diffWords(oldText, newText)
  
  diffHtml.value = diff.map(part => {
    const color = part.added ? '#52c41a' : part.removed ? '#ff4d4f' : '#8c8c8c'
    const bg = part.added ? 'rgba(82, 196, 26, 0.1)' : part.removed ? 'rgba(255, 77, 79, 0.1)' : 'transparent'
    return `<span style="color: ${color}; background: ${bg}; padding: 1px 2px; border-radius: 2px;">${part.value}</span>`
  }).join('')
}

// 格式化时间
function formatTime(timestamp: string | number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 格式化耗时
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60000).toFixed(1)}m`
}

// 获取提交图标
function getCommitIcon(commit: GitCommitInfo): string {
  if (commit.author === 'agent') {
    return '🤖'
  }
  return '👤'
}

// 获取提交颜色类
function getCommitClass(commit: GitCommitInfo): string {
  return commit.author === 'agent' ? 'agent-commit' : 'human-commit'
}

// 获取任务状态图标
function getTaskStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    success: '✅',
    failure: '❌',
    cancelled: '⛔'
  }
  return icons[status] || '❓'
}
</script>

<template>
  <div class="history-viewer-agi">
    <!-- 标签页 -->
    <div class="history-tabs">
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'file' }"
        @click="activeTab = 'file'"
      >
        📄 文件历史
      </button>
      <button 
        class="tab-btn"
        :class="{ active: activeTab === 'agent' }"
        @click="activeTab = 'agent'"
      >
        🤖 Agent 任务
        <span v-if="agentHistory.length > 0" class="badge">
          {{ agentHistory.length }}
        </span>
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading">
      <span class="spinner"></span>
      加载中...
    </div>

    <div v-else class="history-content">
      <!-- 左侧列表 -->
      <div class="history-list">
        <!-- 文件历史标签 -->
        <template v-if="activeTab === 'file'">
          <div class="list-section">
            <h4 class="section-title">人工编辑</h4>
            <ul class="commit-list">
              <li 
                v-for="commit in humanHistory.slice(0, 10)" 
                :key="commit.hash"
                class="commit-item human"
                :class="{ active: selectedCommit?.hash === commit.hash }"
                @click="viewCommit(commit)"
              >
                <span class="commit-icon">👤</span>
                <div class="commit-info">
                  <span class="commit-msg">{{ commit.message }}</span>
                  <span class="commit-meta">{{ formatTime(commit.timestamp) }}</span>
                </div>
                <span class="commit-hash">{{ commit.hash.substring(0, 7) }}</span>
              </li>
            </ul>
          </div>

          <div class="list-section">
            <h4 class="section-title">Agent 编辑</h4>
            <ul class="commit-list">
              <li 
                v-for="commit in agentCommits.slice(0, 10)" 
                :key="commit.hash"
                class="commit-item agent"
                :class="{ active: selectedCommit?.hash === commit.hash }"
                @click="viewCommit(commit)"
              >
                <span class="commit-icon">🤖</span>
                <div class="commit-info">
                  <span class="commit-msg">{{ commit.message }}</span>
                  <span class="commit-meta">
                    {{ formatTime(commit.timestamp) }}
                    <span v-if="commit.cost" class="cost">${{ commit.cost.toFixed(3) }}</span>
                  </span>
                </div>
                <span class="commit-hash">{{ commit.hash.substring(0, 7) }}</span>
              </li>
            </ul>
          </div>
        </template>

        <!-- Agent 任务标签 -->
        <template v-if="activeTab === 'agent'">
          <ul class="task-list">
            <li 
              v-for="task in agentHistory" 
              :key="task.id"
              class="task-item"
              :class="{ active: selectedTask?.id === task.id }"
              @click="viewTask(task)"
            >
              <span class="task-status">{{ getTaskStatusIcon(task.result) }}</span>
              <div class="task-info">
                <span class="task-desc">{{ task.description }}</span>
                <span class="task-meta">
                  {{ formatTime(task.startedAt) }} · 
                  {{ task.steps.length }} 步骤
                  <span v-if="task.cost" class="cost">${{ task.cost.toFixed(3) }}</span>
                </span>
              </div>
            </li>
          </ul>
        </template>
      </div>

      <!-- 右侧详情 -->
      <div class="history-detail">
        <!-- 提交详情 -->
        <div v-if="selectedCommit" class="detail-panel">
          <h3>
            <span :class="getCommitClass(selectedCommit)">
              {{ getCommitIcon(selectedCommit) }}
              {{ selectedCommit.author === 'agent' ? 'Agent' : '人工' }}提交
            </span>
          </h3>
          
          <div class="detail-meta">
            <p><strong>Hash:</strong> {{ selectedCommit.hash }}</p>
            <p><strong>时间:</strong> {{ formatTime(selectedCommit.timestamp) }}</p>
            <p v-if="selectedCommit.model"><strong>模型:</strong> {{ selectedCommit.model }}</p>
            <p v-if="selectedCommit.skill"><strong>技能:</strong> {{ selectedCommit.skill }}</p>
            <p v-if="selectedCommit.tokens"><strong>Tokens:</strong> {{ selectedCommit.tokens }}</p>
            <p v-if="selectedCommit.cost"><strong>成本:</strong> ${{ selectedCommit.cost.toFixed(4) }}</p>
          </div>

          <div class="detail-message">
            <strong>提交信息:</strong>
            <pre>{{ selectedCommit.message }}</pre>
          </div>

          <div class="detail-diff">
            <strong>变更:</strong>
            <div class="diff-content" v-html="diffHtml"></div>
          </div>
        </div>

        <!-- 任务详情 -->
        <div v-else-if="selectedTask" class="detail-panel">
          <h3>
            <span class="task-status-large">
              {{ getTaskStatusIcon(selectedTask.result) }}
              Agent 任务
            </span>
          </h3>

          <div class="detail-meta">
            <p><strong>任务 ID:</strong> {{ selectedTask.id }}</p>
            <p><strong>描述:</strong> {{ selectedTask.description }}</p>
            <p><strong>开始:</strong> {{ formatTime(selectedTask.startedAt) }}</p>
            <p><strong>结束:</strong> {{ formatTime(selectedTask.completedAt) }}</p>
            <p><strong>耗时:</strong> {{ formatDuration(selectedTask.completedAt - selectedTask.startedAt) }}</p>
            <p><strong>Tokens:</strong> {{ selectedTask.tokensUsed }}</p>
            <p><strong>成本:</strong> ${{ selectedTask.cost.toFixed(4) }}</p>
          </div>

          <!-- 步骤时间轴 -->
          <div class="task-timeline">
            <strong>执行步骤:</strong>
            <div class="timeline">
              <div 
                v-for="step in selectedTask.steps" 
                :key="step.index"
                class="timeline-item"
                :class="{ active: selectedStep?.index === step.index }"
                @click="viewStep(step)"
              >
                <div class="timeline-marker">{{ step.index }}</div>
                <div class="timeline-content">
                  <span class="skill-name">{{ step.skill }}</span>
                  <span class="step-meta">
                    {{ formatDuration(step.completedAt - step.startedAt) }} · 
                    {{ step.tokens }} tokens
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 步骤详情 -->
          <div v-if="selectedStep" class="step-detail">
            <strong>步骤 {{ selectedStep.index }} 详情:</strong>
            <div class="step-io">
              <div class="io-section">
                <h5>输入:</h5>
                <pre>{{ JSON.stringify(selectedStep.input, null, 2) }}</pre>
              </div>
              <div class="io-section">
                <h5>输出:</h5>
                <pre>{{ JSON.stringify(selectedStep.output, null, 2) }}</pre>
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else class="empty-state">
          <p>选择一个提交或任务查看详情</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-viewer-agi {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

/* Tabs */
.history-tabs {
  display: flex;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-alt);
}

.tab-btn {
  flex: 1;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.tab-btn:hover {
  color: var(--vp-c-text);
  background: var(--vp-c-bg);
}

.tab-btn.active {
  color: var(--vp-c-brand);
  background: var(--vp-c-bg);
  box-shadow: inset 0 -2px 0 var(--vp-c-brand);
}

.badge {
  padding: 2px 6px;
  background: var(--vp-c-brand);
  color: white;
  font-size: 10px;
  border-radius: 10px;
}

/* Loading */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: var(--vp-c-text-2);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Content */
.history-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* List */
.history-list {
  width: 280px;
  border-right: 1px solid var(--vp-c-divider);
  overflow-y: auto;
  background: var(--vp-c-bg-alt);
}

.list-section {
  margin-bottom: 16px;
}

.section-title {
  padding: 8px 12px;
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.commit-list,
.task-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.commit-item,
.task-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
  border-left: 3px solid transparent;
}

.commit-item:hover,
.task-item:hover {
  background: var(--vp-c-bg);
}

.commit-item.active,
.task-item.active {
  background: var(--vp-c-bg);
  border-left-color: var(--vp-c-brand);
}

.commit-item.human.active {
  border-left-color: #1890ff;
}

.commit-item.agent.active {
  border-left-color: #722ed1;
}

.commit-icon,
.task-status {
  flex-shrink: 0;
  font-size: 16px;
}

.commit-info,
.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.commit-msg,
.task-desc {
  font-size: 12px;
  color: var(--vp-c-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.commit-meta,
.task-meta {
  font-size: 10px;
  color: var(--vp-c-text-2);
}

.commit-hash {
  font-family: var(--vp-font-family-mono);
  font-size: 10px;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.cost {
  color: #52c41a;
  font-weight: 500;
}

/* Detail */
.history-detail {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.detail-panel h3 {
  margin: 0 0 16px;
  font-size: 16px;
}

.human-commit {
  color: #1890ff;
}

.agent-commit {
  color: #722ed1;
}

.task-status-large {
  color: var(--vp-c-text);
}

.detail-meta {
  margin-bottom: 16px;
}

.detail-meta p {
  margin: 4px 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.detail-meta strong {
  color: var(--vp-c-text);
}

.detail-message pre,
.detail-diff .diff-content,
.step-io pre {
  padding: 12px;
  background: var(--vp-c-bg-alt);
  border-radius: 6px;
  font-size: 11px;
  overflow-x: auto;
  margin-top: 8px;
}

/* Timeline */
.task-timeline {
  margin: 16px 0;
}

.timeline {
  margin-top: 12px;
  padding-left: 20px;
  border-left: 2px solid var(--vp-c-divider);
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  cursor: pointer;
  position: relative;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -26px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--vp-c-divider);
  border: 2px solid var(--vp-c-bg);
}

.timeline-item.active::before {
  background: var(--vp-c-brand);
}

.timeline-marker {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--vp-c-bg-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--vp-c-text-2);
  flex-shrink: 0;
}

.timeline-item.active .timeline-marker {
  background: var(--vp-c-brand);
  color: white;
}

.timeline-content {
  display: flex;
  flex-direction: column;
}

.skill-name {
  font-size: 12px;
  color: var(--vp-c-text);
}

.step-meta {
  font-size: 10px;
  color: var(--vp-c-text-2);
}

/* Step Detail */
.step-detail {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--vp-c-divider);
}

.step-io {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
}

.io-section h5 {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
}

/* Empty State */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--vp-c-text-2);
  font-size: 13px;
}
</style>
