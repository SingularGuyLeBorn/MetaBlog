<template>
  <div class="demo-page">
    <h1>🎯 Agent Orchestrator 演示</h1>
    
    <div class="demo-section">
      <h2>系统状态</h2>
      <div class="status-bar">
        <span>系统: {{ systemStatus }}</span>
        <span>Agent: {{ agentCount }}</span>
        <span>运行中: {{ runningTasks }}</span>
        <span>决策次数: {{ decisionCount }}</span>
      </div>
    </div>

    <div class="demo-section">
      <h2>初始化</h2>
      <button @click="initSystem" :disabled="initialized">
        {{ initialized ? '已初始化' : '初始化Agent系统' }}
      </button>
    </div>

    <div class="demo-section">
      <h2>创建 Worker Agents</h2>
      <div class="button-group">
        <button @click="createPassiveWorker">创建被动Worker</button>
        <button @click="createScheduledWorker">创建定时Worker</button>
        <button @click="createResearchWorker">创建研究Worker</button>
        <button @click="create5Workers">批量创建5个Worker</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>模拟场景</h2>
      <div class="button-group">
        <button @click="simulateHighLoad">模拟高负载（触发扩容）</button>
        <button @click="simulateTaskFailure">模拟任务失败（触发故障恢复）</button>
        <button @click="simulateIdleWorkers">模拟Worker空闲（触发缩容）</button>
      </div>
    </div>

    <div class="demo-section">
      <h2>Manager 决策日志</h2>
      <div class="decision-log">
        <div v-if="decisions.length === 0" class="empty">暂无决策记录...</div>
        <div 
          v-for="(decision, index) in decisions" 
          :key="index"
          class="decision-entry"
        >
          <span class="time">{{ decision.time }}</span>
          <span class="action" :class="decision.action">{{ decision.action }}</span>
          <span class="target">{{ decision.target }}</span>
          <span class="reason">{{ decision.reason }}</span>
        </div>
      </div>
    </div>

    <div class="demo-section">
      <h2>Agent 列表</h2>
      <div class="agent-list">
        <div v-for="agent in agents" :key="agent.id" class="agent-entry">
          <span class="tier" :class="agent.tier">{{ agent.tier[0].toUpperCase() }}</span>
          <span class="name">{{ agent.name }}</span>
          <span class="status" :class="agent.runtimeStatus">{{ agent.runtimeStatus }}</span>
          <span class="tasks">任务: {{ agent.stats.totalTasks }}</span>
        </div>
      </div>
    </div>

    <div class="demo-section full-width">
      <h2>控制中心面板</h2>
      <ControlPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  agentOrchestrator, 
  initializeDefaultAgents,
  createPassiveWorker as createPassive,
  createScheduledCollector,
  createResearchWorker as createResearch 
} from '../../core/orchestrator'
import { managerEngineRegistry } from '../../core/orchestrator/manager-agent'
import ControlPanel from './ControlPanel.vue'
import type { EnhancedAgent } from '../../core/orchestrator/types'

const initialized = ref(false)
const agents = ref<EnhancedAgent[]>([])
const systemStatus = ref('-')
const agentCount = ref(0)
const runningTasks = ref(0)
const decisionCount = ref(0)
const decisions = ref<Array<{
  time: string
  action: string
  target: string
  reason: string
}>>([])

let updateTimer: number | null = null

function initSystem() {
  initializeDefaultAgents()
  initialized.value = true
  updateData()
  
  // 订阅决策事件
  agentOrchestrator.onEvent('agent:created', (event) => {
    const payload = event.payload as any
    if (payload?.createdBy?.startsWith('manager-')) {
      addDecisionLog('create_agent', payload.agentId, 'Manager自主创建Worker')
    }
  })
}

function createPassiveWorker() {
  const manager = agents.value.find(a => a.tier === 'manager')
  const worker = createPassive(manager?.id)
  console.log('创建被动Worker:', worker.id)
  updateData()
}

function createScheduledWorker() {
  const manager = agents.value.find(a => a.tier === 'manager')
  const worker = createScheduledCollector(manager?.id)
  console.log('创建定时Worker:', worker.id)
  updateData()
}

function createResearchWorker() {
  const manager = agents.value.find(a => a.tier === 'manager')
  const worker = createResearch(manager?.id)
  console.log('创建研究Worker:', worker.id)
  updateData()
}

function create5Workers() {
  const manager = agents.value.find(a => a.tier === 'manager')
  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      createPassive(manager?.id)
      updateData()
    }, i * 100)
  }
}

// 模拟场景
function simulateHighLoad() {
  // 模拟高负载：给所有worker添加待处理任务
  const workers = agents.value.filter(a => a.tier === 'worker')
  for (const worker of workers) {
    // 修改内部状态模拟负载（实际应该在orchestrator中实现）
    worker.runtimeStatus = 'running'
  }
  addDecisionLog('system_event', 'all', '模拟高负载，Manager应该自动扩容')
  updateData()
}

function simulateTaskFailure() {
  const workers = agents.value.filter(a => a.tier === 'worker')
  if (workers.length > 0) {
    const target = workers[0]
    target.stats.totalTasks = 10
    target.stats.failedTasks = 5 // 50%失败率
    addDecisionLog('system_event', target.id, '模拟高失败率，Manager应该暂停该Worker')
  }
  updateData()
}

function simulateIdleWorkers() {
  const workers = agents.value.filter(a => a.tier === 'worker')
  for (const worker of workers) {
    worker.runtimeStatus = 'listening'
    worker.stats.lastTaskAt = Date.now() - 25 * 60 * 60 * 1000 // 25小时前
  }
  addDecisionLog('system_event', 'multiple', '模拟Worker空闲，Manager应该缩容')
  updateData()
}

function addDecisionLog(action: string, target: string, reason: string) {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  
  decisions.value.unshift({ time, action, target: target.slice(0, 8) + '...', reason })
  if (decisions.value.length > 20) {
    decisions.value = decisions.value.slice(0, 20)
  }
  decisionCount.value++
}

function updateData() {
  agents.value = agentOrchestrator.getAllAgents()
  const state = agentOrchestrator.getSystemState()
  systemStatus.value = state.status
  agentCount.value = agents.value.length
  runningTasks.value = state.activeTasks
  
  // 收集所有Manager的决策
  const managers = agents.value.filter(a => a.tier === 'manager')
  for (const manager of managers) {
    const engine = managerEngineRegistry.getEngine(manager.id)
    if (engine) {
      const history = engine.getDecisionHistory()
      for (const decision of history) {
        // 避免重复添加
        const exists = decisions.value.some(d => 
          d.action === decision.decision && 
          d.reason === decision.reason &&
          d.time === new Date().toLocaleTimeString()
        )
        if (!exists && decision.decision !== 'no_action') {
          addDecisionLog(
            decision.decision,
            decision.targetAgentId || 'none',
            decision.reason
          )
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
.demo-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

h1 {
  margin-bottom: 20px;
}

.demo-section {
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.demo-section h2 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 500;
}

.status-bar {
  display: flex;
  gap: 24px;
  font-size: 14px;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
}

button:hover:not(:disabled) {
  background: #f5f5f5;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.decision-log {
  max-height: 200px;
  overflow-y: auto;
  background: #263238;
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 12px;
}

.empty {
  color: #78909c;
  text-align: center;
  padding: 20px;
}

.decision-entry {
  display: flex;
  gap: 12px;
  padding: 4px 0;
  color: #ccc;
}

.decision-entry .time {
  color: #78909c;
  min-width: 60px;
}

.decision-entry .action {
  min-width: 100px;
  color: #64b5f6;
}

.decision-entry .action.create_agent { color: #81c784; }
.decision-entry .action.pause_agent { color: #ffb74d; }
.decision-entry .action.delete_agent { color: #e57373; }

.decision-entry .target {
  min-width: 80px;
  color: #90a4ae;
}

.decision-entry .reason {
  flex: 1;
  color: #b0bec5;
}

.agent-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.agent-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 13px;
}

.agent-entry .tier {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-weight: bold;
  font-size: 11px;
}

.agent-entry .tier.system { background: #9c27b0; color: white; }
.agent-entry .tier.manager { background: #2196f3; color: white; }
.agent-entry .tier.worker { background: #4caf50; color: white; }

.agent-entry .name {
  flex: 1;
  font-weight: 500;
}

.agent-entry .status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  background: #e0e0e0;
}

.agent-entry .status.running { background: #4caf50; color: white; }
.agent-entry .status.error { background: #f44336; color: white; }

.agent-entry .tasks {
  color: #666;
  font-size: 12px;
}

.full-width {
  height: 600px;
  overflow: hidden;
}
</style>
