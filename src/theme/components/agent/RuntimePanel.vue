<!--
  RuntimePanel - Agent 运行监控面板
  接入真实后端数据
-->
<template>
  <div class="runtime-panel">
    <div class="page-header">
      <h2 class="page-title">
        <Icon name="activity" :size="20" />
        Runtime 监控
      </h2>
      <span class="page-subtitle">{{ runtimeAgents.length }} 个 Agent 在线</span>
    </div>

    <!-- 概览统计 -->
    <div class="stats-grid">
      <LiquidGlass
        v-for="stat in overviewStats"
        :key="stat.id"
        class="stat-card-glass"
        :glow-color="stat.glowColor"
        :intensity="0.3"
      >
        <div class="stat-card">
          <Icon :name="stat.icon" :size="20" />
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- Agent 监控卡片 -->
    <div class="agent-monitors">
      <LiquidGlass
        v-for="agent in runtimeAgents"
        :key="agent.id"
        class="monitor-glass"
        :glow-color="getStatusGlow(agent.status)"
        :intensity="0.15"
      >
        <div class="monitor-card">
          <div class="monitor-header">
            <div class="agent-info">
              <span class="agent-avatar">{{ agent.avatar }}</span>
              <div>
                <h3 class="agent-name">{{ agent.name }}</h3>
                <span class="agent-status" :class="agent.status">
                  {{ statusText(agent.status) }}
                </span>
              </div>
            </div>
            <div class="agent-tasks">
              <span
                v-for="task in agent.currentTasks"
                :key="task"
                class="task-badge"
              >
                {{ task }}
              </span>
            </div>
          </div>

          <div class="monitor-body">
            <!-- 当前状态 -->
            <div class="state-row">
              <span class="state-label">当前状态</span>
              <span class="state-value" :class="agent.runState">
                {{ runStateText(agent.runState) }}
              </span>
            </div>

            <!-- 运行指标（优先显示真实数据，缺失时隐藏） -->
            <div class="metric-row" v-if="agent.contextUsed > 0">
              <div class="metric-header">
                <span class="metric-label">上下文占用</span>
                <span class="metric-value">{{ agent.contextUsed }} / {{ agent.contextMax }} tokens ({{ contextPercent(agent) }}%)</span>
              </div>
              <div class="metric-bar">
                <div
                  class="metric-fill"
                  :class="{ warning: contextPercent(agent) > 80 }"
                  :style="{ width: contextPercent(agent) + '%' }"
                />
              </div>
            </div>

            <div class="token-stats">
              <div class="token-item">
                <span class="token-label">运行时间</span>
                <span class="token-value">{{ agent.uptime > 0 ? formatDuration(agent.uptime) : '-' }}</span>
              </div>
              <div class="token-item">
                <span class="token-label">错误数</span>
                <span class="token-value" :class="{ 'text-danger': agent.errorCount > 0 }">{{ agent.errorCount || '-' }}</span>
              </div>
              <div class="token-item" v-if="agent.tokensToday > 0">
                <span class="token-label">今日 Token</span>
                <span class="token-value">{{ formatNumber(agent.tokensToday) }}</span>
              </div>
            </div>

            <!-- 警告 -->
            <div v-if="agent.warnings.length > 0" class="warnings">
              <div
                v-for="w in agent.warnings"
                :key="w"
                class="warning-item"
              >
                <Icon name="alert-triangle" :size="12" />
                {{ w }}
              </div>
            </div>
          </div>

          <div class="monitor-footer">
            <button class="footer-btn" @click="viewLogs(agent.id)">
              <Icon name="file-text" :size="12" />
              查看日志
            </button>
            <button
              v-if="agent.runState === 'tool_calling'"
              class="footer-btn danger"
              @click="interruptAgent(agent.id)"
            >
              <Icon name="square" :size="12" />
              中断任务
            </button>
          </div>
        </div>
      </LiquidGlass>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, LiquidGlass } from '@/theme/components/common'
import { computed, ref } from 'vue'

interface RuntimeAgent {
  id: string
  name: string
  avatar: string
  status: 'online' | 'offline' | 'busy' | 'idle'
  runState: string
  currentTasks: string[]
  contextUsed: number
  contextMax: number
  compressCount: number
  tokensToday: number
  tokensTotal: number
  warnings: string[]
  uptime: number
  errorCount: number
}

const runtimeAgents = ref<RuntimeAgent[]>([])
const loading = ref(false)

// 加载真实数据：Agent 运行时 + Agent 配置
async function loadData() {
  loading.value = true
  try {
    // 1. 获取 Agent 配置（用于 name/avatar）
    const agentsRes = await fetch('/api/agents')
    const agentsJson = await agentsRes.json()
    const agents = agentsJson.success ? agentsJson.data : []
    const agentMap = new Map(agents.map((a: any) => [a.id, a]))

    // 2. 获取运行时数据
    const runtimeRes = await fetch('/api/agent-runtime')
    const runtimeJson = await runtimeRes.json()
    const runtimes = runtimeJson.success ? runtimeJson.data : []

    // 3. 合并为显示结构
    if (runtimes.length > 0) {
      runtimeAgents.value = runtimes.map((rt: any) => {
        const agent = agentMap.get(rt.agentId) as any
        const status = mapRuntimeStatus(rt.status)
        const warnings: string[] = []
        if (rt.stats?.errorCount > 0) warnings.push(`累计错误 ${rt.stats.errorCount} 次`)
        if ((rt.queuedTasks?.length || 0) > 5) warnings.push(`任务队列堆积 (${rt.queuedTasks.length} 个)`)

        return {
          id: rt.agentId,
          name: agent?.name || rt.agentId,
          avatar: agent?.avatar || '🤖',
          status,
          runState: rt.status,
          currentTasks: (rt.activeTasks || []).map((t: any) => t.name || String(t)),
          contextUsed: 0,
          contextMax: 32000,
          compressCount: 0,
          tokensToday: 0,
          tokensTotal: 0,
          warnings,
          uptime: rt.stats?.totalUptime || 0,
          errorCount: rt.stats?.errorCount || 0
        }
      })
    } else {
      // 没有运行时数据时，显示 Agent 列表的基础状态
      runtimeAgents.value = agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        avatar: a.avatar || '🤖',
        status: a.status || 'online',
        runState: 'idle',
        currentTasks: [],
        contextUsed: 0,
        contextMax: 32000,
        compressCount: 0,
        tokensToday: 0,
        tokensTotal: 0,
        warnings: [],
        uptime: 0,
        errorCount: 0
      }))
    }
  } catch (e) {
    console.error('[RuntimePanel] 加载数据失败:', e)
  } finally {
    loading.value = false
  }
}

function mapRuntimeStatus(status: string): RuntimeAgent['status'] {
  const map: Record<string, RuntimeAgent['status']> = {
    running: 'busy',
    paused: 'idle',
    created: 'idle',
    stopped: 'offline',
    error: 'offline'
  }
  return map[status] || 'idle'
}

const overviewStats = computed(() => {
  const total = runtimeAgents.value.length
  const online = runtimeAgents.value.filter(a => a.status !== 'offline').length
  const busy = runtimeAgents.value.filter(a => a.status === 'busy').length
  const withErrors = runtimeAgents.value.filter(a => a.errorCount > 0).length

  return [
    { id: 'total', label: 'Agent 总数', value: String(total), icon: 'users', glowColor: 'var(--sr-accent-star, #b8a090)' },
    { id: 'online', label: '在线', value: String(online), icon: 'wifi', glowColor: 'var(--sr-morandi-green, #a8b3a8)' },
    { id: 'busy', label: '忙碌中', value: String(busy), icon: 'zap', glowColor: 'var(--sr-morandi-pink, #d4b8b8)' },
    { id: 'errors', label: '异常', value: String(withErrors), icon: 'alert-circle', glowColor: 'var(--sr-morandi-red, #d4a8a8)' }
  ]
})

function getStatusGlow(status: string): string {
  const map: Record<string, string> = {
    online: 'var(--sr-morandi-green, #a8b3a8)',
    busy: 'var(--sr-morandi-pink, #d4b8b8)',
    idle: 'var(--sr-morandi-blue, #9daab8)',
    offline: 'var(--sr-text-muted, #94a3b8)'
  }
  return map[status] || map.offline
}

function statusText(status: string): string {
  const map: Record<string, string> = {
    online: '在线',
    busy: '忙碌',
    idle: '空闲',
    offline: '离线'
  }
  return map[status] || status
}

function runStateText(state: string): string {
  const map: Record<string, string> = {
    idle: '空闲',
    running: '运行中',
    paused: '已暂停',
    created: '已创建',
    stopped: '已停止',
    error: '异常'
  }
  return map[state] || state
}

function contextPercent(agent: RuntimeAgent): number {
  if (!agent.contextMax) return 0
  return Math.round((agent.contextUsed / agent.contextMax) * 100)
}

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function formatDuration(ms: number): string {
  if (ms < 60000) return Math.round(ms / 1000) + 's'
  if (ms < 3600000) return Math.round(ms / 60000) + 'm'
  return Math.round(ms / 3600000) + 'h'
}

function viewLogs(_id: string) {
  // TODO: 打开日志面板
}

function interruptAgent(_id: string) {
  // TODO: 中断 Agent 任务
}

loadData()
</script>

<style scoped>
.runtime-panel {
  padding: 8px;
}

.page-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 20px;
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

.page-subtitle {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 概览统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card-glass {
  border-radius: 16px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  color: var(--sr-text-muted, #94a3b8);
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.stat-label {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

/* Agent 监控卡片 */
.agent-monitors {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.monitor-glass {
  border-radius: 20px;
}

.monitor-card {
  padding: 24px;
}

.monitor-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.agent-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.agent-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(184, 160, 144, 0.12);
  border-radius: 12px;
}

.agent-name {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.agent-status {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.agent-status.online {
  background: rgba(168, 179, 168, 0.2);
  color: #6a8a6a;
}

.agent-status.busy {
  background: rgba(212, 184, 184, 0.2);
  color: #a87070;
}

.agent-status.idle {
  background: rgba(157, 170, 184, 0.2);
  color: #5a7a9a;
}

.agent-tasks {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.task-badge {
  padding: 3px 10px;
  background: rgba(184, 160, 144, 0.12);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sr-morandi-purple, #b3a8b8);
}

/* 监控内容 */
.monitor-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.state-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.state-label {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  min-width: 80px;
}

.state-value {
  padding: 3px 10px;
  background: rgba(157, 170, 184, 0.15);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--sr-morandi-blue, #9daab8);
}

.state-value.tool_calling {
  background: rgba(212, 184, 184, 0.2);
  color: #a87070;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.metric-label {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.metric-value {
  font-size: 12px;
  font-weight: 500;
  color: var(--sr-text-secondary, #6a6560);
}

.metric-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sr-morandi-green, #a8b3a8), var(--sr-morandi-blue, #9daab8));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.metric-fill.warning {
  background: linear-gradient(90deg, var(--sr-morandi-pink, #d4b8b8), #dc2626);
}

/* Token 统计 */
.token-stats {
  display: flex;
  gap: 24px;
}

.token-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.token-label {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.token-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

/* 警告 */
.warnings {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.1);
  border-radius: 8px;
  font-size: 12px;
  color: #b04040;
}

/* 底部操作 */
.monitor-footer {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.footer-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 8px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.footer-btn:hover {
  background: rgba(184, 160, 144, 0.12);
  color: var(--sr-morandi-purple, #b3a8b8);
}

.footer-btn.danger:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
