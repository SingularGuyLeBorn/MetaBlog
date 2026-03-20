<template>
  <div class="agent-dashboard">
    <header class="dashboard-header">
      <h1>🤖 Agent 管理系统</h1>
      <div class="header-actions">
        <button 
          :class="['host-btn', { active: isHosting }]"
          @click="toggleHosting"
        >
          {{ isHosting ? '⏹ 停止托管' : '▶ 启动托管' }}
        </button>
      </div>
    </header>

    <!-- 状态概览 -->
    <section class="stats-grid">
      <div class="stat-card">
        <span class="stat-value">{{ status.workflows }}</span>
        <span class="stat-label">工作流</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ status.scheduled }}</span>
        <span class="stat-label">定时任务</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ status.contentQueue }}</span>
        <span class="stat-label">待处理</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ status.completedJobs }}</span>
        <span class="stat-label">已完成</span>
      </div>
    </section>

    <!-- URL 输入 -->
    <section class="url-input-section">
      <h2>📎 采集内容</h2>
      <div class="input-group">
        <input
          v-model="urlInput"
          type="text"
          placeholder="粘贴链接 (小红书、B站、知乎、网页...)"
          @keyup.enter="handleUrlSubmit"
        />
        <select v-model="targetSection">
          <option value="posts">文章</option>
          <option value="social">社交媒体</option>
          <option value="videos">视频</option>
          <option value="knowledge">知识库</option>
          <option value="resources">资源</option>
        </select>
        <button 
          :disabled="isProcessing || !urlInput"
          @click="handleUrlSubmit"
        >
          {{ isProcessing ? '⏳ 处理中...' : '📥 采集' }}
        </button>
      </div>
      <p class="hint">支持: 小红书、B站、知乎、微博、Twitter、YouTube、任意网页</p>
    </section>

    <!-- 工作流列表 -->
    <section class="workflows-section">
      <div class="section-header">
        <h2>📋 工作流</h2>
        <button class="add-btn" @click="showCreateWorkflow = true">
          + 新建
        </button>
      </div>
      
      <div v-if="workflows.length === 0" class="empty-state">
        暂无工作流，点击"+ 新建"创建
      </div>
      
      <div v-else class="workflow-list">
        <div 
          v-for="workflow in workflows" 
          :key="workflow.id"
          class="workflow-item"
        >
          <div class="workflow-info">
            <h3>{{ workflow.name }}</h3>
            <p class="workflow-source">
              源: {{ workflow.source.type }} 
              <span v-if="workflow.source.platforms">
                ({{ workflow.source.platforms.join(', ') }})
              </span>
            </p>
            <p v-if="workflow.schedule?.enabled" class="schedule-badge">
              ⏰ {{ workflow.schedule.cron }}
            </p>
          </div>
          <div class="workflow-actions">
            <button @click="executeWorkflow(workflow.id)">▶ 执行</button>
            <button @click="deleteWorkflow(workflow.id)">🗑</button>
          </div>
        </div>
      </div>
    </section>

    <!-- 最近活动 -->
    <section class="activity-section">
      <h2>🕐 最近活动</h2>
      <div class="activity-list">
        <div 
          v-for="(activity, index) in recentActivities" 
          :key="index"
          class="activity-item"
        >
          <span :class="['status-dot', activity.status]"></span>
          <span class="activity-text">{{ activity.message }}</span>
          <span class="activity-time">{{ activity.time }}</span>
        </div>
      </div>
    </section>

    <!-- 创建工作流弹窗 -->
    <div v-if="showCreateWorkflow" class="modal" @click.self="showCreateWorkflow = false">
      <div class="modal-content">
        <h3>新建工作流</h3>
        <div class="form-group">
          <label>名称</label>
          <input v-model="newWorkflow.name" placeholder="工作流名称" />
        </div>
        <div class="form-group">
          <label>来源类型</label>
          <select v-model="newWorkflow.source.type">
            <option value="url">URL 列表</option>
            <option value="search">搜索</option>
            <option value="rss">RSS</option>
          </select>
        </div>
        <div class="form-group">
          <label>目标栏目</label>
          <select v-model="newWorkflow.target.section">
            <option value="posts">文章</option>
            <option value="social">社交媒体</option>
            <option value="videos">视频</option>
            <option value="knowledge">知识库</option>
          </select>
        </div>
        <div class="form-group checkbox">
          <label>
            <input v-model="newWorkflow.schedule.enabled" type="checkbox" />
            启用定时调度
          </label>
        </div>
        <div v-if="newWorkflow.schedule.enabled" class="form-group">
          <label>Cron 表达式</label>
          <input v-model="newWorkflow.schedule.cron" placeholder="0 9 * * *" />
          <small>例如: 0 9 * * * (每天9点)</small>
        </div>
        <div class="modal-actions">
          <button @click="createWorkflow">创建</button>
          <button class="secondary" @click="showCreateWorkflow = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 结果提示 -->
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { createAgentSystem, AgentSystem } from '../index'

// 状态
const agentSystem = ref<AgentSystem | null>(null)
const isHosting = ref(false)
const isProcessing = ref(false)
const urlInput = ref('')
const targetSection = ref('posts')
const showCreateWorkflow = ref(false)
const workflows = ref<any[]>([])
const recentActivities = ref<any[]>([])
const notification = ref<{ type: string; message: string } | null>(null)
const newWorkflow = ref(getDefaultWorkflow())

const status = computed(() => {
  return agentSystem.value?.getStatus() || {
    workflows: 0,
    scheduled: 0,
    contentQueue: 0,
    completedJobs: 0,
  }
})

// 初始化
onMounted(() => {
  // 创建 Agent 系统实例
  agentSystem.value = createAgentSystem({
    basePath: '',
  })
  
  // 加载工作流
  loadWorkflows()
  
  // 定期刷新状态
  const interval = setInterval(() => {
    loadWorkflows()
  }, 5000)
  
  onUnmounted(() => {
    clearInterval(interval)
  })
})

// 处理 URL 提交
async function handleUrlSubmit() {
  if (!urlInput.value || !agentSystem.value) return
  
  isProcessing.value = true
  
  try {
    const result = await agentSystem.value.handleUrl(urlInput.value, {
      section: targetSection.value,
      autoPublish: false,
    })
    
    addActivity('success', `已采集: ${urlInput.value.slice(0, 50)}...`)
    showNotification('success', '内容采集成功！')
    urlInput.value = ''
  } catch (error) {
    addActivity('error', `采集失败: ${error}`)
    showNotification('error', `采集失败: ${error}`)
  } finally {
    isProcessing.value = false
  }
}

// 工作流操作
function createWorkflow() {
  if (!agentSystem.value) return
  
  const id = agentSystem.value.createWorkflow({
    name: newWorkflow.value.name,
    source: newWorkflow.value.source,
    target: newWorkflow.value.target,
    schedule: newWorkflow.value.schedule,
  })
  
  showCreateWorkflow.value = false
  loadWorkflows()
  showNotification('success', '工作流创建成功！')
  
  // 重置表单
  newWorkflow.value = getDefaultWorkflow()
}

async function executeWorkflow(id: string) {
  if (!agentSystem.value) return
  
  try {
    await agentSystem.value.executeWorkflow(id)
    addActivity('success', `工作流执行完成: ${id}`)
    showNotification('success', '工作流执行成功！')
  } catch (error) {
    showNotification('error', '工作流执行失败')
  }
}

function deleteWorkflow(id: string) {
  if (!agentSystem.value) return
  if (!confirm('确定要删除这个工作流吗？')) return
  
  agentSystem.value.metaAgent.deleteWorkflow(id)
  loadWorkflows()
  showNotification('success', '工作流已删除')
}

function loadWorkflows() {
  if (!agentSystem.value) return
  workflows.value = agentSystem.value.metaAgent.getAllWorkflows()
}

// 托管模式
function toggleHosting() {
  if (!agentSystem.value) return
  
  if (isHosting.value) {
    agentSystem.value.stopHosting()
    isHosting.value = false
    addActivity('info', '离线托管已停止')
  } else {
    agentSystem.value.startHosting()
    isHosting.value = true
    addActivity('info', '离线托管已启动')
  }
}

// 辅助
function getDefaultWorkflow() {
  return {
    name: '',
    source: {
      type: 'url',
      urls: [],
    },
    target: {
      section: 'posts',
      autoPublish: false,
    },
    schedule: {
      enabled: false,
      cron: '0 9 * * *',
    },
  }
}

function addActivity(status: string, message: string) {
  recentActivities.value.unshift({
    status,
    message,
    time: new Date().toLocaleTimeString(),
  })
  
  // 只保留最近 20 条
  if (recentActivities.value.length > 20) {
    recentActivities.value = recentActivities.value.slice(0, 20)
  }
}

function showNotification(type: string, message: string) {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 3000)
}
</script>

<style scoped>
.agent-dashboard {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.dashboard-header h1 {
  font-size: 28px;
  margin: 0;
}

.host-btn {
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  background: #10b981;
  color: white;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.host-btn.active {
  background: #ef4444;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  font-size: 14px;
  color: #64748b;
}

.url-input-section,
.workflows-section,
.activity-section {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  margin-bottom: 24px;
}

.url-input-section h2,
.workflows-section h2,
.activity-section h2 {
  margin: 0 0 16px 0;
  font-size: 18px;
}

.input-group {
  display: flex;
  gap: 12px;
}

.input-group input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.input-group select {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.input-group button {
  padding: 12px 24px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.input-group button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.hint {
  margin: 12px 0 0 0;
  font-size: 13px;
  color: #94a3b8;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  margin: 0;
}

.add-btn {
  padding: 8px 16px;
  background: #f1f5f9;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}

.workflow-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.workflow-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.workflow-info h3 {
  margin: 0 0 4px 0;
  font-size: 15px;
}

.workflow-source {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

.schedule-badge {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  background: #dbeafe;
  color: #2563eb;
  font-size: 12px;
  border-radius: 4px;
}

.workflow-actions {
  display: flex;
  gap: 8px;
}

.workflow-actions button {
  padding: 6px 12px;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #94a3b8;
}

.activity-list {
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.success { background: #10b981; }
.status-dot.error { background: #ef4444; }
.status-dot.info { background: #3b82f6; }

.activity-text {
  flex: 1;
  font-size: 14px;
}

.activity-time {
  font-size: 12px;
  color: #94a3b8;
}

.modal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
}

.modal-content h3 {
  margin: 0 0 20px 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 500;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
}

.form-group small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #94a3b8;
}

.form-group.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-group.checkbox input {
  width: auto;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.modal-actions button {
  flex: 1;
  padding: 12px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.modal-actions button.secondary {
  background: #f1f5f9;
  color: #64748b;
}

.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 24px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  animation: slideIn 0.3s ease;
}

.notification.success { background: #10b981; }
.notification.error { background: #ef4444; }

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .input-group {
    flex-direction: column;
  }
  
  .workflow-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
