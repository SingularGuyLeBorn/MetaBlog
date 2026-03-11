<template>
  <div class="orchestrator-panel">
    <!-- 系统状态栏 -->
    <div class="system-header">
      <div class="system-title">
        <span>🎯</span>
        <h2>Agent 控制中心</h2>
        <span class="system-badge" :class="systemState.status">
          {{ systemStatusText }}
        </span>
      </div>
      <div class="system-metrics">
        <div class="metric">
          <span class="metric-value">{{ systemState.activeTasks }}</span>
          <span class="metric-label">运行中</span>
        </div>
        <div class="metric">
          <span class="metric-value">{{ systemState.pendingTasks }}</span>
          <span class="metric-label">队列</span>
        </div>
        <div class="metric">
          <span class="metric-value">{{ agents.length }}</span>
          <span class="metric-label">Agent</span>
        </div>
        <div class="metric">
          <span class="metric-value">{{ loadPercent }}%</span>
          <span class="metric-label">负载</span>
        </div>
      </div>
    </div>

    <!-- 主内容 -->
    <div class="panel-content">
      <!-- Agent 列表 -->
      <div class="agents-section">
        <div class="section-header">
          <h3>Agent 列表</h3>
          <div class="filter-tabs">
            <button 
              v-for="tab in tierTabs" 
              :key="tab.value"
              :class="['tab-btn', { active: currentTab === tab.value }]"
              @click="currentTab = tab.value"
            >
              {{ tab.label }} ({{ getAgentCountByTier(tab.value) }})
            </button>
          </div>
        </div>

        <div class="agents-list">
          <div 
            v-for="agent in filteredAgents" 
            :key="agent.id"
            :class="['agent-card', { active: selectedAgent?.id === agent.id }]"
            @click="selectAgent(agent)"
          >
            <div class="agent-header">
              <div class="agent-identity">
                <span class="agent-avatar">{{ agent.avatar }}</span>
                <div class="agent-info">
                  <span class="agent-name">{{ agent.name }}</span>
                  <span class="agent-tier" :class="agent.tier">{{ getTierLabel(agent.tier) }}</span>
                </div>
              </div>
              <span class="agent-status" :class="agent.runtimeStatus">
                {{ getStatusLabel(agent.runtimeStatus) }}
              </span>
            </div>

            <!-- 当前任务 -->
            <div v-if="agent.currentTask" class="agent-task">
              <div class="task-header">
                <span>{{ agent.currentTask.name }}</span>
                <span>{{ agent.currentTask.progress }}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: agent.currentTask.progress + '%' }"></div>
              </div>
              <div v-if="agent.currentTask.currentTool" class="task-tool">
                🔧 {{ agent.currentTask.currentTool }}
              </div>
            </div>

            <!-- 统计 -->
            <div class="agent-stats">
              <span>✓ {{ agent.stats.successfulTasks }}</span>
              <span>✗ {{ agent.stats.failedTasks }}</span>
              <span>⏱ {{ formatDuration(agent.stats.averageExecutionTime) }}</span>
            </div>

            <div v-if="agent.isResident" class="resident-badge">常驻</div>
          </div>
        </div>
      </div>

      <!-- 详情面板 -->
      <div class="detail-section" v-if="selectedAgent">
        <div class="detail-header">
          <h3>{{ selectedAgent.name }}</h3>
          <div class="detail-actions">
            <button 
              v-if="selectedAgent.runtimeStatus === 'paused'"
              class="btn btn-primary"
              @click="resumeAgent(selectedAgent.id)"
            >
              恢复
            </button>
            <button 
              v-else-if="selectedAgent.runtimeStatus !== 'running'"
              class="btn"
              @click="pauseAgent(selectedAgent.id)"
            >
              暂停
            </button>
            <button class="btn btn-danger" @click="deleteAgent(selectedAgent.id)">
              删除
            </button>
          </div>
        </div>

        <div class="detail-content">
          <!-- 基本信息 -->
          <div class="detail-card">
            <h4>基本信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">ID</span>
                <span class="info-value">{{ selectedAgent.id.slice(0, 8) }}...</span>
              </div>
              <div class="info-item">
                <span class="info-label">等级</span>
                <span class="info-value tier" :class="selectedAgent.tier">{{ getTierLabel(selectedAgent.tier) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">模式</span>
                <span class="info-value">{{ getModeLabel(selectedAgent.mode) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">状态</span>
                <span class="info-value" :class="selectedAgent.runtimeStatus">{{ getStatusLabel(selectedAgent.runtimeStatus) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">创建者</span>
                <span class="info-value">{{ selectedAgent.createdBy === 'user' ? '用户' : 'Manager' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">任务数</span>
                <span class="info-value">{{ selectedAgent.stats.totalTasks }}</span>
              </div>
            </div>
          </div>

          <!-- 当前任务 -->
          <div v-if="selectedAgent.currentTask" class="detail-card">
            <h4>当前任务</h4>
            <div class="task-detail">
              <div class="task-row">
                <span>任务:</span>
                <span>{{ selectedAgent.currentTask.name }}</span>
              </div>
              <div class="task-row">
                <span>进度:</span>
                <span>{{ selectedAgent.currentTask.progress }}% - {{ selectedAgent.currentTask.currentStep }}</span>
              </div>
              <div v-if="selectedAgent.currentTask.currentTool" class="task-row">
                <span>工具:</span>
                <span class="tool-name">{{ selectedAgent.currentTask.currentTool }}</span>
              </div>
              
              <!-- 工具链 -->
              <div v-if="selectedAgent.currentTask.toolCallChain.length > 0" class="tool-chain">
                <div class="chain-title">工具调用:</div>
                <div class="chain-list">
                  <span 
                    v-for="(tool, index) in selectedAgent.currentTask.toolCallChain" 
                    :key="index"
                    :class="['chain-item', tool.status]"
                  >
                    {{ tool.toolName }}
                  </span>
                </div>
              </div>

              <!-- 日志 -->
              <div class="task-logs">
                <div class="logs-title">日志:</div>
                <div class="logs-list">
                  <div 
                    v-for="(log, index) in selectedAgent.currentTask.logs.slice(-5)" 
                    :key="index"
                    :class="['log-item', log.level]"
                  >
                    <span class="log-time">{{ formatTime(log.timestamp, true) }}</span>
                    <span class="log-message">{{ log.message }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 任务历史 -->
          <div class="detail-card">
            <h4>最近任务</h4>
            <div class="task-history">
              <div 
                v-for="task in selectedAgent.taskHistory.slice(0, 5)" 
                :key="task.id"
                :class="['history-item', task.status]"
              >
                <span class="history-name">{{ task.name }}</span>
                <span class="history-status">{{ getTaskStatusLabel(task.status) }}</span>
                <span class="history-time">{{ formatTime(task.startedAt) }}</span>
              </div>
            </div>
          </div>

          <!-- 能力评分 -->
          <div class="detail-card">
            <h4>能力评分</h4>
            <div class="capability-list">
              <div class="cap-item">
                <span>综合</span>
                <div class="cap-bar"><div :style="{ width: selectedAgent.capabilityScore.overall + '%' }"></div></div>
                <span>{{ selectedAgent.capabilityScore.overall }}</span>
              </div>
              <div class="cap-item">
                <span>可靠性</span>
                <div class="cap-bar"><div :style="{ width: selectedAgent.capabilityScore.reliability + '%' }"></div></div>
                <span>{{ selectedAgent.capabilityScore.reliability }}</span>
              </div>
              <div class="cap-item">
                <span>效率</span>
                <div class="cap-bar"><div :style="{ width: selectedAgent.capabilityScore.efficiency + '%' }"></div></div>
                <span>{{ selectedAgent.capabilityScore.efficiency }}</span>
              </div>
            </div>
          </div>

          <!-- Manager决策日志（仅Manager显示） -->
          <div v-if="selectedAgent.tier === 'manager'" class="detail-card">
            <h4>决策日志</h4>
            <div class="decision-logs">
              <div v-if="managerDecisions.length === 0" class="empty-text">暂无决策记录</div>
              <div 
                v-for="(decision, index) in managerDecisions" 
                :key="index"
                class="decision-item"
              >
                <div class="decision-header">
                  <span class="decision-action">{{ decision.decision }}</span>
                  <span class="decision-time">{{ formatTime(Date.now() - (index * 60000), true) }}</span>
                </div>
                <div class="decision-reason">{{ decision.reason }}</div>
                <div class="decision-confidence">置信度: {{ Math.round(decision.confidence * 100) }}%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="detail-empty">
        <p>← 选择 Agent 查看详情</p>
      </div>
    </div>

    <!-- 系统事件 -->
    <div class="events-section">
      <div class="section-header">
        <h3>系统事件</h3>
        <button class="btn-text" @click="clearEvents">清空</button>
      </div>
      <div class="events-list">
        <div 
          v-for="event in recentEvents.slice(0, 10)" 
          :key="event.id"
          :class="['event-item', event.severity]"
        >
          <span class="event-time">{{ formatTime(event.timestamp, true) }}</span>
          <span class="event-type">{{ event.type }}</span>
          <span class="event-message">{{ event.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { agentOrchestrator } from '../../core/orchestrator/orchestrator'
import { managerEngineRegistry } from '../../core/orchestrator/manager-agent'
import type { EnhancedAgent, AgentTier, AgentRuntimeStatus, SystemEvent, DecisionResult } from '../../core/orchestrator/types'

const agents = ref<EnhancedAgent[]>([])
const systemState = ref(agentOrchestrator.getSystemState())
const selectedAgent = ref<EnhancedAgent | null>(null)
const currentTab = ref<AgentTier | 'all'>('all')
const recentEvents = ref<SystemEvent[]>([])
const managerDecisions = ref<DecisionResult[]>([])

let updateTimer: number | null = null

const tierTabs = [
  { label: '全部', value: 'all' as const },
  { label: '系统', value: 'system' as const },
  { label: '管理', value: 'manager' as const },
  { label: '工作', value: 'worker' as const }
]

const filteredAgents = computed(() => {
  if (currentTab.value === 'all') return agents.value
  return agents.value.filter(a => a.tier === currentTab.value)
})

const systemStatusText = computed(() => {
  const map: Record<string, string> = {
    healthy: '正常', degraded: '降级', error: '异常', maintenance: '维护'
  }
  return map[systemState.value.status] || systemState.value.status
})

const loadPercent = computed(() => Math.round(systemState.value.load.cpu))

function getAgentCountByTier(tier: AgentTier | 'all'): number {
  if (tier === 'all') return agents.value.length
  return agents.value.filter(a => a.tier === tier).length
}

function selectAgent(agent: EnhancedAgent) {
  selectedAgent.value = agent
  // 如果是Manager，加载决策历史
  if (agent.tier === 'manager') {
    const engine = managerEngineRegistry.getEngine(agent.id)
    if (engine) {
      managerDecisions.value = engine.getDecisionHistory().slice(-10)
    }
  }
}

function getTierLabel(tier: AgentTier): string {
  return { system: '系统', manager: '管理', worker: '工作' }[tier]
}

function getStatusLabel(status: AgentRuntimeStatus): string {
  const labels: Record<string, string> = {
    idle: '空闲', listening: '监听', scheduled: '定时', running: '运行',
    paused: '暂停', error: '错误', maintenance: '维护', evolving: '进化'
  }
  return labels[status] || status
}

function getModeLabel(mode: string): string {
  return { passive: '被动', scheduled: '定时', hybrid: '混合', always_on: '常驻' }[mode] || mode
}

function getTaskStatusLabel(status: string): string {
  return { pending: '等待', running: '运行', completed: '完成', failed: '失败', cancelled: '取消' }[status] || status
}

function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '-'
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  return `${Math.round(ms / 60000)}m`
}

function formatTime(timestamp: number, short = false): string {
  const date = new Date(timestamp)
  if (short) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  }
  return date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function pauseAgent(agentId: string) {
  agentOrchestrator.pauseAgent(agentId, 'user')
}

function resumeAgent(agentId: string) {
  agentOrchestrator.resumeAgent(agentId, 'user')
}

function deleteAgent(agentId: string) {
  if (confirm('确定删除?')) {
    agentOrchestrator.deleteAgent(agentId, 'user')
    if (selectedAgent.value?.id === agentId) selectedAgent.value = null
  }
}

function clearEvents() {
  recentEvents.value = []
}

function updateData() {
  agents.value = agentOrchestrator.getAllAgents()
  systemState.value = agentOrchestrator.getSystemState()
  recentEvents.value = systemState.value.recentEvents
  
  // 更新选中Agent的数据
  if (selectedAgent.value) {
    const updated = agents.value.find(a => a.id === selectedAgent.value?.id)
    if (updated) {
      selectedAgent.value = updated
      if (updated.tier === 'manager') {
        const engine = managerEngineRegistry.getEngine(updated.id)
        if (engine) {
          managerDecisions.value = engine.getDecisionHistory().slice(-10)
        }
      }
    }
  }
}

onMounted(() => {
  updateData()
  updateTimer = window.setInterval(updateData, 2000)
})

onUnmounted(() => {
  if (updateTimer) clearInterval(updateTimer)
})
</script>

<style scoped>
.orchestrator-panel {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}

.system-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.system-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.system-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.system-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.system-badge.healthy { background: #4caf50; color: white; }
.system-badge.degraded { background: #ff9800; color: white; }
.system-badge.error { background: #f44336; color: white; }

.system-metrics {
  display: flex;
  gap: 20px;
}

.metric {
  text-align: center;
}

.metric-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
}

.metric-label {
  font-size: 12px;
  color: #666;
}

.panel-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.agents-section {
  width: 350px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e0e0e0;
  background: #fff;
}

.section-header {
  padding: 12px;
  border-bottom: 1px solid #e0e0e0;
}

.section-header h3 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 500;
}

.filter-tabs {
  display: flex;
  gap: 6px;
}

.tab-btn {
  padding: 4px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
  font-size: 12px;
  cursor: pointer;
}

.tab-btn.active {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

.agents-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.agent-card {
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  background: #fff;
}

.agent-card:hover {
  border-color: #2196f3;
}

.agent-card.active {
  border-color: #2196f3;
  background: #e3f2fd;
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.agent-identity {
  display: flex;
  align-items: center;
  gap: 8px;
}

.agent-avatar {
  font-size: 24px;
}

.agent-info {
  display: flex;
  flex-direction: column;
}

.agent-name {
  font-weight: 500;
  font-size: 14px;
}

.agent-tier {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  width: fit-content;
  margin-top: 2px;
}

.agent-tier.system { background: #9c27b0; color: white; }
.agent-tier.manager { background: #2196f3; color: white; }
.agent-tier.worker { background: #4caf50; color: white; }

.agent-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f5f5f5;
}

.agent-status.running { background: #4caf50; color: white; }
.agent-status.error { background: #f44336; color: white; }
.agent-status.paused { background: #ff9800; color: white; }

.agent-task {
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  margin-bottom: 8px;
}

.task-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 4px;
}

.progress-bar {
  height: 4px;
  background: #ddd;
  border-radius: 2px;
}

.progress-fill {
  height: 100%;
  background: #2196f3;
  transition: width 0.3s;
}

.task-tool {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.agent-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.resident-badge {
  font-size: 11px;
  color: #2196f3;
  margin-top: 6px;
}

.detail-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.detail-header h3 {
  margin: 0;
  font-size: 16px;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary {
  background: #2196f3;
  color: white;
  border-color: #2196f3;
}

.btn-danger {
  background: #f44336;
  color: white;
  border-color: #f44336;
}

.btn-text {
  border: none;
  background: transparent;
  color: #666;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.detail-card {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #e0e0e0;
}

.detail-card h4 {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #666;
  font-weight: 500;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: 12px;
  color: #999;
}

.info-value {
  font-size: 13px;
}

.info-value.tier.system { color: #9c27b0; }
.info-value.tier.manager { color: #2196f3; }
.info-value.tier.worker { color: #4caf50; }

.task-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.task-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.tool-name {
  color: #2196f3;
}

.tool-chain {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e0e0e0;
}

.chain-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.chain-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chain-item {
  padding: 2px 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}

.chain-item.running { background: #fff3e0; }
.chain-item.completed { background: #e8f5e9; }
.chain-item.error { background: #ffebee; }

.task-logs {
  margin-top: 8px;
}

.logs-title {
  font-size: 12px;
  color: #666;
  margin-bottom: 6px;
}

.logs-list {
  background: #263238;
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 11px;
}

.log-item {
  display: flex;
  gap: 8px;
  padding: 2px 0;
  color: #ccc;
}

.log-item.error { color: #ef5350; }
.log-item.warn { color: #ffb74d; }

.log-time {
  color: #78909c;
  min-width: 50px;
}

.task-history {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}

.history-item.completed { border-left: 3px solid #4caf50; }
.history-item.failed { border-left: 3px solid #f44336; }

.history-name {
  flex: 1;
}

.history-status {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 11px;
  background: #fff;
}

.history-time {
  color: #999;
  margin-left: 8px;
}

.capability-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cap-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.cap-item span:first-child {
  width: 50px;
  color: #666;
}

.cap-bar {
  flex: 1;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.cap-bar div {
  height: 100%;
  background: #2196f3;
}

.decision-logs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-text {
  color: #999;
  font-size: 13px;
  text-align: center;
  padding: 20px;
}

.decision-item {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
}

.decision-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.decision-action {
  font-weight: 500;
  color: #2196f3;
}

.decision-time {
  color: #999;
}

.decision-reason {
  color: #666;
  margin-bottom: 4px;
}

.decision-confidence {
  font-size: 11px;
  color: #999;
}

.detail-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.events-section {
  height: 160px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.events-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-item {
  display: flex;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 12px;
  background: #f5f5f5;
}

.event-item.error { border-left: 3px solid #f44336; }
.event-item.warning { border-left: 3px solid #ff9800; }

.event-time {
  color: #999;
  font-family: monospace;
  min-width: 60px;
}

.event-type {
  color: #666;
  min-width: 100px;
}

.event-message {
  flex: 1;
  color: #333;
}
</style>
