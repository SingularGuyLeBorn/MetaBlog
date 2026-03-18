<template>
  <div class="agent-dashboard">
    <!-- 动态背景 -->
    <div class="dashboard-bg">
      <div class="grid-lines"></div>
      <div class="particles-container">
        <div v-for="n in 30" :key="n" class="particle" :style="{ '--i': n }"></div>
      </div>
      <div class="glow-orb orb-1"></div>
      <div class="glow-orb orb-2"></div>
      <div class="glow-orb orb-3"></div>
    </div>

    <!-- 头部信息 -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="system-status" :class="systemHealth">
          <div class="status-pulse"></div>
          <span>{{ systemHealthText }}</span>
        </div>
        <h1 class="dashboard-title">
          <span class="title-main">MetaMind</span>
          <span class="title-sub">多智能体协作中枢</span>
        </h1>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <div class="stat-value">{{ activeAgents }}</div>
          <div class="stat-label">活跃智能体</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ runningTasks }}</div>
          <div class="stat-label">执行任务</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ completedTasks }}</div>
          <div class="stat-label">已完成</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ avgEfficiency }}%</div>
          <div class="stat-label">平均效率</div>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="dashboard-main">
      <!-- 左侧：智能体网络图 -->
      <section class="network-section">
        <div class="section-header">
          <h3>智能体协作网络</h3>
          <div class="live-indicator">
            <span class="live-dot"></span>
            LIVE
          </div>
        </div>
        <div class="network-visualization" ref="networkRef">
          <svg class="connection-lines" :viewBox="`0 0 ${networkWidth} ${networkHeight}`">
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style="stop-color:#94a3b8;stop-opacity:0.2" />
                <stop offset="50%" style="stop-color:#38bdf8;stop-opacity:0.6" />
                <stop offset="100%" style="stop-color:#94a3b8;stop-opacity:0.2" />
              </linearGradient>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#38bdf8" opacity="0.5" />
              </marker>
            </defs>
            <path
              v-for="(conn, idx) in connections"
              :key="idx"
              :d="conn.path"
              fill="none"
              stroke="url(#lineGradient)"
              stroke-width="2"
              marker-end="url(#arrowhead)"
              :opacity="conn.active ? 1 : 0.3"
              class="connection-line"
            />
          </svg>
          <div class="network-nodes">
            <div
              v-for="agent in agents"
              :key="agent.id"
              class="network-node"
              :class="[agent.status, agent.type]"
              :style="{ left: agent.x + '%', top: agent.y + '%' }"
              @mouseenter="hoveredAgent = agent.id"
              @mouseleave="hoveredAgent = null"
            >
              <div class="node-core">
                <div class="node-icon">{{ agent.icon }}</div>
                <div class="node-ring"></div>
                <div class="node-pulse" v-if="agent.status === 'busy'"></div>
              </div>
              <div class="node-label">{{ agent.name }}</div>
              
              <!-- Hover tooltip -->
              <div class="node-tooltip" v-if="hoveredAgent === agent.id">
                <div class="tooltip-header">{{ agent.name }}</div>
                <div class="tooltip-type">{{ agent.typeText }}</div>
                <div class="tooltip-task" v-if="agent.currentTask">
                  执行: {{ agent.currentTask }}
                </div>
                <div class="tooltip-stats">
                  <span>负载: {{ agent.load }}%</span>
                  <span>成功率: {{ agent.successRate }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 中间：智能体详情卡片 -->
      <section class="agents-section">
        <div class="section-header">
          <h3>智能体状态</h3>
          <div class="filter-tabs">
            <button 
              v-for="filter in filters" 
              :key="filter.key"
              :class="['filter-btn', { active: currentFilter === filter.key }]"
              @click="currentFilter = filter.key"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>
        <div class="agents-grid">
          <div
            v-for="agent in filteredAgents"
            :key="agent.id"
            class="agent-card"
            :class="[agent.status, { expanded: expandedAgent === agent.id }]"
            @click="toggleExpand(agent.id)"
          >
            <div class="card-glow"></div>
            <div class="card-header">
              <div class="agent-avatar" :class="agent.type">
                <span>{{ agent.icon }}</span>
                <div class="status-indicator" :class="agent.status"></div>
              </div>
              <div class="agent-info">
                <h4 class="agent-name">{{ agent.name }}</h4>
                <span class="agent-role">{{ agent.role }}</span>
              </div>
              <div class="agent-load">
                <svg class="load-ring" viewBox="0 0 36 36">
                  <path
                    class="load-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    class="load-progress"
                    :stroke-dasharray="`${agent.load}, 100`"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    :class="{ high: agent.load > 80, medium: agent.load > 50 && agent.load <= 80 }"
                  />
                </svg>
                <span class="load-text">{{ agent.load }}%</span>
              </div>
            </div>
            
            <div class="card-body">
              <div class="current-task" v-if="agent.currentTask">
                <div class="task-label">当前任务</div>
                <div class="task-name">{{ agent.currentTask }}</div>
                <div class="task-progress">
                  <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: agent.taskProgress + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ agent.taskProgress }}%</span>
                </div>
              </div>
              <div class="task-empty" v-else>
                <span>待机中...</span>
              </div>
            </div>

            <div class="card-footer">
              <div class="stat">
                <span class="stat-icon">⚡</span>
                <span>{{ agent.tasksCompleted }}</span>
              </div>
              <div class="stat">
                <span class="stat-icon">⏱️</span>
                <span>{{ agent.avgTime }}s</span>
              </div>
              <div class="stat">
                <span class="stat-icon">🎯</span>
                <span>{{ agent.successRate }}%</span>
              </div>
            </div>

            <!-- Expanded content -->
            <div class="card-expanded" v-if="expandedAgent === agent.id">
              <div class="recent-tasks">
                <h5>最近任务</h5>
                <div 
                  v-for="(task, idx) in agent.recentTasks" 
                  :key="idx"
                  class="recent-task-item"
                  :class="task.status"
                >
                  <span class="task-status-icon">
                    {{ task.status === 'completed' ? '✓' : task.status === 'failed' ? '✗' : '⟳' }}
                  </span>
                  <span class="task-desc">{{ task.name }}</span>
                  <span class="task-time">{{ task.time }}</span>
                </div>
              </div>
              <div class="capabilities">
                <h5>能力标签</h5>
                <div class="capability-tags">
                  <span v-for="cap in agent.capabilities" :key="cap" class="cap-tag">
                    {{ cap }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧：任务流 -->
      <section class="tasks-section">
        <div class="section-header">
          <h3>实时任务流</h3>
          <div class="task-stats">
            <span class="task-stat pending">待处理: {{ pendingCount }}</span>
            <span class="task-stat running">进行中: {{ runningCount }}</span>
            <span class="task-stat completed">已完成: {{ completedCount }}</span>
          </div>
        </div>
        <div class="tasks-timeline" ref="tasksContainer">
          <div class="timeline-line"></div>
          <TransitionGroup name="task">
            <div
              v-for="task in visibleTasks"
              :key="task.id"
              class="task-item"
              :class="task.status"
            >
              <div class="task-time">{{ task.timestamp }}</div>
              <div class="task-marker" :class="task.status">
                <div class="marker-inner"></div>
              </div>
              <div class="task-content">
                <div class="task-header">
                  <span class="task-priority" :class="task.priority">{{ task.priorityText }}</span>
                  <span class="task-id">#{{ task.id.slice(-4) }}</span>
                </div>
                <div class="task-title">{{ task.name }}</div>
                <div class="task-assignee">
                  <span class="assignee-avatar">{{ getAgentIcon(task.assignee) }}</span>
                  <span class="assignee-name">{{ getAgentName(task.assignee) }}</span>
                </div>
              </div>
              <div class="task-status-badge" :class="task.status">
                {{ task.statusText }}
              </div>
            </div>
          </TransitionGroup>
        </div>
      </section>
    </main>

    <!-- 底部：系统日志 -->
    <footer class="dashboard-footer">
      <div class="log-section">
        <div class="log-header">
          <h4>系统日志</h4>
          <button class="clear-btn" @click="clearLogs">清空</button>
        </div>
        <div class="log-container" ref="logContainer">
          <TransitionGroup name="log">
            <div
              v-for="log in logs"
              :key="log.id"
              class="log-item"
              :class="log.level"
            >
              <span class="log-time">{{ log.time }}</span>
              <span class="log-level">{{ log.levelText }}</span>
              <span class="log-agent">[{{ log.agent }}]</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

// 类型定义
type AgentStatus = 'idle' | 'busy' | 'offline'
type AgentType = 'coordinator' | 'analyzer' | 'executor' | 'creative' | 'monitor'
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'
type LogLevel = 'info' | 'success' | 'warning' | 'error'

interface Agent {
  id: string
  name: string
  icon: string
  role: string
  type: AgentType
  typeText: string
  status: AgentStatus
  load: number
  x: number
  y: number
  currentTask: string
  taskProgress: number
  tasksCompleted: number
  avgTime: number
  successRate: number
  capabilities: string[]
  recentTasks: { name: string; status: TaskStatus; time: string }[]
}

interface Task {
  id: string
  name: string
  status: TaskStatus
  statusText: string
  priority: 'high' | 'medium' | 'low'
  priorityText: string
  assignee: string
  timestamp: string
  progress: number
}

interface Log {
  id: string
  time: string
  level: LogLevel
  levelText: string
  agent: string
  message: string
}

// 响应式状态
const networkWidth = ref(800)
const networkHeight = ref(400)
const networkRef = ref<HTMLElement>()
const tasksContainer = ref<HTMLElement>()
const logContainer = ref<HTMLElement>()
const hoveredAgent = ref<string | null>(null)
const expandedAgent = ref<string | null>(null)
const currentFilter = ref<'all' | 'busy' | 'idle'>('all')

// 智能体数据
const agents = ref<Agent[]>([
  {
    id: 'agent-001',
    name: 'Orchestrator',
    icon: '🎯',
    role: '任务协调器',
    type: 'coordinator',
    typeText: '协调型',
    status: 'busy',
    load: 85,
    x: 50,
    y: 15,
    currentTask: '分解用户请求并分配子任务',
    taskProgress: 67,
    tasksCompleted: 1247,
    avgTime: 2.3,
    successRate: 98.5,
    capabilities: ['任务分解', '优先级排序', '冲突解决', '资源调度'],
    recentTasks: [
      { name: '代码重构规划', status: 'completed', time: '2m前' },
      { name: 'API设计评审', status: 'completed', time: '15m前' },
      { name: '多智能体协作优化', status: 'running', time: '进行中' }
    ]
  },
  {
    id: 'agent-002',
    name: 'CodeGen',
    icon: '💻',
    role: '代码生成器',
    type: 'executor',
    typeText: '执行型',
    status: 'busy',
    load: 92,
    x: 25,
    y: 35,
    currentTask: '生成Vue组件代码',
    taskProgress: 45,
    tasksCompleted: 3892,
    avgTime: 4.1,
    successRate: 94.2,
    capabilities: ['Vue/React', 'TypeScript', '单元测试', '性能优化'],
    recentTasks: [
      { name: 'Dashboard组件开发', status: 'running', time: '进行中' },
      { name: 'API接口封装', status: 'completed', time: '5m前' },
      { name: '样式系统重构', status: 'completed', time: '32m前' }
    ]
  },
  {
    id: 'agent-003',
    name: 'DataMiner',
    icon: '🔍',
    role: '数据挖掘师',
    type: 'analyzer',
    typeText: '分析型',
    status: 'busy',
    load: 78,
    x: 75,
    y: 35,
    currentTask: '分析用户行为数据',
    taskProgress: 82,
    tasksCompleted: 2156,
    avgTime: 6.7,
    successRate: 96.8,
    capabilities: ['数据清洗', '模式识别', '趋势预测', '异常检测'],
    recentTasks: [
      { name: '用户画像分析', status: 'running', time: '进行中' },
      { name: '性能瓶颈定位', status: 'completed', time: '8m前' },
      { name: '日志聚类分析', status: 'completed', time: '1h前' }
    ]
  },
  {
    id: 'agent-004',
    name: 'DocWriter',
    icon: '📝',
    role: '文档撰写员',
    type: 'creative',
    typeText: '创造型',
    status: 'idle',
    load: 15,
    x: 15,
    y: 60,
    currentTask: '',
    taskProgress: 0,
    tasksCompleted: 1567,
    avgTime: 5.2,
    successRate: 99.1,
    capabilities: ['技术文档', 'API文档', '教程编写', '注释生成'],
    recentTasks: [
      { name: 'README更新', status: 'completed', time: '1h前' },
      { name: '组件库文档', status: 'completed', time: '3h前' },
      { name: '变更日志整理', status: 'completed', time: '5h前' }
    ]
  },
  {
    id: 'agent-005',
    name: 'TestBot',
    icon: '🧪',
    role: '测试工程师',
    type: 'executor',
    typeText: '执行型',
    status: 'busy',
    load: 68,
    x: 40,
    y: 70,
    currentTask: '运行E2E测试套件',
    taskProgress: 34,
    tasksCompleted: 5621,
    avgTime: 8.3,
    successRate: 91.5,
    capabilities: ['单元测试', '集成测试', 'E2E测试', '性能测试'],
    recentTasks: [
      { name: '回归测试执行', status: 'running', time: '进行中' },
      { name: '覆盖率报告生成', status: 'completed', time: '12m前' },
      { name: 'Bug复现验证', status: 'failed', time: '28m前' }
    ]
  },
  {
    id: 'agent-006',
    name: 'SecureGuard',
    icon: '🔒',
    role: '安全审计员',
    type: 'monitor',
    typeText: '监控型',
    status: 'busy',
    load: 45,
    x: 60,
    y: 70,
    currentTask: '扫描依赖漏洞',
    taskProgress: 56,
    tasksCompleted: 1892,
    avgTime: 12.5,
    successRate: 97.3,
    capabilities: ['漏洞扫描', '依赖检查', '代码审计', '合规检测'],
    recentTasks: [
      { name: 'npm audit扫描', status: 'running', time: '进行中' },
      { name: '密钥泄露检查', status: 'completed', time: '20m前' },
      { name: '权限配置审核', status: 'completed', time: '1h前' }
    ]
  },
  {
    id: 'agent-007',
    name: 'UIXpert',
    icon: '🎨',
    role: 'UI设计师',
    type: 'creative',
    typeText: '创造型',
    status: 'busy',
    load: 73,
    x: 85,
    y: 60,
    currentTask: '生成配色方案',
    taskProgress: 89,
    tasksCompleted: 987,
    avgTime: 7.8,
    successRate: 95.6,
    capabilities: ['配色设计', '布局优化', '动效设计', '图标生成'],
    recentTasks: [
      { name: 'Dashboard视觉优化', status: 'running', time: '进行中' },
      { name: '暗色模式适配', status: 'completed', time: '45m前' },
      { name: '响应式布局调整', status: 'completed', time: '2h前' }
    ]
  },
  {
    id: 'agent-008',
    name: 'OptiMax',
    icon: '⚡',
    role: '性能优化师',
    type: 'analyzer',
    typeText: '分析型',
    status: 'idle',
    load: 25,
    x: 50,
    y: 85,
    currentTask: '',
    taskProgress: 0,
    tasksCompleted: 1456,
    avgTime: 15.2,
    successRate: 93.8,
    capabilities: ['Bundle分析', '懒加载优化', '缓存策略', '内存管理'],
    recentTasks: [
      { name: '首屏加载优化', status: 'completed', time: '2h前' },
      { name: 'Tree Shaking分析', status: 'completed', time: '4h前' },
      { name: '图片压缩处理', status: 'completed', time: '6h前' }
    ]
  },
  {
    id: 'agent-009',
    name: 'ReviewPro',
    icon: '👁️',
    role: '代码审查员',
    type: 'analyzer',
    typeText: '分析型',
    status: 'busy',
    load: 61,
    x: 10,
    y: 85,
    currentTask: '审查PR #342',
    taskProgress: 72,
    tasksCompleted: 2234,
    avgTime: 9.4,
    successRate: 88.9,
    capabilities: ['代码审查', '规范检查', '反模式检测', '建议生成'],
    recentTasks: [
      { name: 'PR #342 审查', status: 'running', time: '进行中' },
      { name: 'PR #338 审查', status: 'completed', time: '30m前' },
      { name: '代码规范检查', status: 'completed', time: '1.5h前' }
    ]
  },
  {
    id: 'agent-010',
    name: 'DeployBot',
    icon: '🚀',
    role: '部署工程师',
    type: 'executor',
    typeText: '执行型',
    status: 'idle',
    load: 10,
    x: 90,
    y: 85,
    currentTask: '',
    taskProgress: 0,
    tasksCompleted: 678,
    avgTime: 3.5,
    successRate: 99.4,
    capabilities: ['CI/CD', '容器化', '回滚策略', '健康检查'],
    recentTasks: [
      { name: '生产环境部署', status: 'completed', time: '3h前' },
      { name: 'Staging更新', status: 'completed', time: '5h前' },
      { name: '备份验证', status: 'completed', time: '8h前' }
    ]
  }
])

// 任务数据
const tasks = ref<Task[]>([
  { id: 'task-001', name: '初始化多智能体系统', status: 'completed', statusText: '已完成', priority: 'high', priorityText: '高优', assignee: 'agent-001', timestamp: '10:00:23', progress: 100 },
  { id: 'task-002', name: '分析项目架构', status: 'completed', statusText: '已完成', priority: 'high', priorityText: '高优', assignee: 'agent-003', timestamp: '10:01:45', progress: 100 },
  { id: 'task-003', name: '生成组件代码', status: 'running', statusText: '进行中', priority: 'high', priorityText: '高优', assignee: 'agent-002', timestamp: '10:02:12', progress: 45 },
  { id: 'task-004', name: '设计UI界面', status: 'running', statusText: '进行中', priority: 'medium', priorityText: '中优', assignee: 'agent-007', timestamp: '10:02:30', progress: 67 },
  { id: 'task-005', name: '编写单元测试', status: 'pending', statusText: '待处理', priority: 'medium', priorityText: '中优', assignee: 'agent-005', timestamp: '10:03:00', progress: 0 },
  { id: 'task-006', name: '安全漏洞扫描', status: 'running', statusText: '进行中', priority: 'high', priorityText: '高优', assignee: 'agent-006', timestamp: '10:03:15', progress: 23 },
  { id: 'task-007', name: '性能基准测试', status: 'pending', statusText: '待处理', priority: 'low', priorityText: '低优', assignee: 'agent-008', timestamp: '10:03:45', progress: 0 },
  { id: 'task-008', name: '代码审查', status: 'running', statusText: '进行中', priority: 'medium', priorityText: '中优', assignee: 'agent-009', timestamp: '10:04:00', progress: 78 },
  { id: 'task-009', name: '生成API文档', status: 'completed', statusText: '已完成', priority: 'low', priorityText: '低优', assignee: 'agent-004', timestamp: '10:04:30', progress: 100 },
  { id: 'task-010', name: '依赖更新检查', status: 'completed', statusText: '已完成', priority: 'medium', priorityText: '中优', assignee: 'agent-006', timestamp: '10:05:00', progress: 100 },
])

// 日志数据
const logs = ref<Log[]>([
  { id: 'log-001', time: '10:05:32', level: 'success', levelText: '成功', agent: 'Orchestrator', message: '任务分配完成，已调度5个智能体' },
  { id: 'log-002', time: '10:05:28', level: 'info', levelText: '信息', agent: 'CodeGen', message: '开始生成Dashboard.vue组件' },
  { id: 'log-003', time: '10:05:15', level: 'info', levelText: '信息', agent: 'UIXpert', message: '配色方案已生成：星河蓝主题' },
  { id: 'log-004', time: '10:04:58', level: 'warning', levelText: '警告', agent: 'TestBot', message: '发现3个测试用例需要更新' },
  { id: 'log-005', time: '10:04:45', level: 'success', levelText: '成功', agent: 'DocWriter', message: 'API文档已生成，共42个接口' },
  { id: 'log-006', time: '10:04:32', level: 'info', levelText: '信息', agent: 'SecureGuard', message: '开始扫描项目依赖...' },
  { id: 'log-007', time: '10:04:15', level: 'error', levelText: '错误', agent: 'ReviewPro', message: 'PR #342 发现潜在内存泄漏' },
  { id: 'log-008', time: '10:03:58', level: 'success', levelText: '成功', agent: 'DataMiner', message: '数据分析完成，生成报告' },
])

// 计算属性
const systemHealth = computed(() => {
  const busyCount = agents.value.filter(a => a.status === 'busy').length
  if (busyCount >= 7) return 'heavy'
  if (busyCount >= 4) return 'normal'
  return 'light'
})

const systemHealthText = computed(() => {
  const map = { light: '系统负载正常', normal: '系统运行良好', heavy: '系统高负载运行' }
  return map[systemHealth.value]
})

const activeAgents = computed(() => agents.value.filter(a => a.status !== 'offline').length)
const runningTasks = computed(() => tasks.value.filter(t => t.status === 'running').length)
const completedTasks = computed(() => tasks.value.filter(t => t.status === 'completed').length)
const avgEfficiency = computed(() => Math.round(agents.value.reduce((acc, a) => acc + a.successRate, 0) / agents.value.length))

const filters = [
  { key: 'all', label: '全部' },
  { key: 'busy', label: '忙碌' },
  { key: 'idle', label: '空闲' }
] as const

const filteredAgents = computed(() => {
  if (currentFilter.value === 'all') return agents.value
  return agents.value.filter(a => a.status === currentFilter.value)
})

const visibleTasks = computed(() => tasks.value.slice(0, 8))

const pendingCount = computed(() => tasks.value.filter(t => t.status === 'pending').length)
const runningCount = computed(() => tasks.value.filter(t => t.status === 'running').length)
const completedCount = computed(() => tasks.value.filter(t => t.status === 'completed').length)

// 网络连接
const connections = computed(() => {
  const conns: { path: string; active: boolean }[] = []
  const coordinator = agents.value[0]
  
  agents.value.slice(1).forEach((agent, idx) => {
    const startX = (coordinator.x / 100) * networkWidth.value
    const startY = (coordinator.y / 100) * networkHeight.value
    const endX = (agent.x / 100) * networkWidth.value
    const endY = (agent.y / 100) * networkHeight.value
    
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2 - 30
    
    conns.push({
      path: `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`,
      active: agent.status === 'busy'
    })
  })
  
  return conns
})

// 方法
const getAgentIcon = (id: string) => agents.value.find(a => a.id === id)?.icon || '🤖'
const getAgentName = (id: string) => agents.value.find(a => a.id === id)?.name || 'Unknown'

const toggleExpand = (id: string) => {
  expandedAgent.value = expandedAgent.value === id ? null : id
}

const clearLogs = () => {
  logs.value = []
}

// 模拟实时更新
let updateInterval: number
let taskUpdateInterval: number

onMounted(() => {
  if (networkRef.value) {
    networkWidth.value = networkRef.value.clientWidth
    networkHeight.value = networkRef.value.clientHeight
  }

  // 模拟任务进度更新
  updateInterval = window.setInterval(() => {
    agents.value.forEach(agent => {
      if (agent.status === 'busy' && agent.taskProgress < 100) {
        agent.taskProgress = Math.min(100, agent.taskProgress + Math.random() * 3)
        agent.load = Math.min(100, agent.load + (Math.random() - 0.5) * 5)
      }
    })
  }, 2000)

  // 模拟新任务
  taskUpdateInterval = window.setInterval(() => {
    if (Math.random() > 0.7) {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        name: ['代码生成', '数据分析', '文档编写', '测试执行', '安全检查'][Math.floor(Math.random() * 5)],
        status: 'pending',
        statusText: '待处理',
        priority: Math.random() > 0.5 ? 'high' : 'medium',
        priorityText: Math.random() > 0.5 ? '高优' : '中优',
        assignee: agents.value[Math.floor(Math.random() * agents.value.length)].id,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        progress: 0
      }
      tasks.value.unshift(newTask)
      if (tasks.value.length > 20) tasks.value.pop()

      // 添加日志
      logs.value.unshift({
        id: `log-${Date.now()}`,
        time: newTask.timestamp,
        level: 'info',
        levelText: '信息',
        agent: 'Orchestrator',
        message: `创建新任务: ${newTask.name}`
      })
      if (logs.value.length > 50) logs.value.pop()

      // 滚动到底部
      nextTick(() => {
        if (logContainer.value) {
          logContainer.value.scrollTop = 0
        }
      })
    }
  }, 5000)
})

onUnmounted(() => {
  clearInterval(updateInterval)
  clearInterval(taskUpdateInterval)
})
</script>

<style scoped>
.agent-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
  color: #e2e8f0;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 背景特效 */
.dashboard-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.grid-lines {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

.particles-container {
  position: absolute;
  inset: 0;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(56, 189, 248, 0.4);
  border-radius: 50%;
  left: calc(var(--i) * 3.33%);
  top: calc(var(--i) * 5%);
  animation: float 8s ease-in-out infinite;
  animation-delay: calc(var(--i) * 0.2s);
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.4; }
  50% { transform: translateY(-30px) scale(1.2); opacity: 0.8; }
}

.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: rgba(56, 189, 248, 0.4);
  top: -100px;
  left: -100px;
  animation: orbMove 20s ease-in-out infinite;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: rgba(139, 92, 246, 0.3);
  bottom: -50px;
  right: -50px;
  animation: orbMove 25s ease-in-out infinite reverse;
}

.orb-3 {
  width: 200px;
  height: 200px;
  background: rgba(236, 72, 153, 0.2);
  top: 50%;
  left: 50%;
  animation: orbMove 15s ease-in-out infinite;
}

@keyframes orbMove {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(30px, -30px); }
  50% { transform: translate(-20px, 20px); }
  75% { transform: translate(20px, 30px); }
}

/* 头部 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  position: relative;
  z-index: 10;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.system-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.system-status.light {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.system-status.normal {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.system-status.heavy {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.status-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.2); }
}

.dashboard-title {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.title-main {
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #38bdf8 0%, #818cf8 50%, #c084fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-sub {
  font-size: 12px;
  color: #64748b;
  letter-spacing: 2px;
}

.header-stats {
  display: flex;
  gap: 30px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #f8fafc;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-top: 4px;
}

/* 主内容区 */
.dashboard-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  gap: 20px;
  padding: 20px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 14px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* 网络可视化 */
.network-section {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #22c55e;
  font-weight: 600;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
  animation: livePulse 1.5s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.network-visualization {
  position: relative;
  height: calc(100% - 50px);
  min-height: 400px;
}

.connection-lines {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.connection-line {
  transition: opacity 0.5s ease;
}

.network-nodes {
  position: absolute;
  inset: 0;
}

.network-node {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.network-node:hover {
  transform: translate(-50%, -50%) scale(1.1);
  z-index: 10;
}

.node-core {
  position: relative;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-icon {
  font-size: 24px;
  z-index: 2;
}

.node-ring {
  position: absolute;
  inset: 0;
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 50%;
  transition: all 0.3s ease;
}

.network-node.busy .node-ring {
  border-color: #38bdf8;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.3);
}

.network-node.idle .node-ring {
  border-color: rgba(148, 163, 184, 0.3);
}

.node-pulse {
  position: absolute;
  inset: -5px;
  border: 2px solid #38bdf8;
  border-radius: 50%;
  animation: nodePulse 2s ease-out infinite;
}

@keyframes nodePulse {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.node-label {
  font-size: 10px;
  color: #94a3b8;
  white-space: nowrap;
  background: rgba(15, 23, 42, 0.8);
  padding: 2px 8px;
  border-radius: 10px;
}

.node-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(56, 189, 248, 0.3);
  border-radius: 8px;
  padding: 12px;
  min-width: 180px;
  margin-bottom: 10px;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.tooltip-header {
  font-weight: 600;
  color: #f8fafc;
  margin-bottom: 4px;
}

.tooltip-type {
  font-size: 11px;
  color: #38bdf8;
  margin-bottom: 8px;
}

.tooltip-task {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 8px;
  padding: 4px 0;
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.tooltip-stats {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #64748b;
}

/* 智能体网格 */
.agents-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 14px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 20px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  border-color: rgba(56, 189, 248, 0.5);
  color: #38bdf8;
}

.filter-btn.active {
  background: rgba(56, 189, 248, 0.15);
  border-color: #38bdf8;
  color: #38bdf8;
}

.agents-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  overflow-y: auto;
  padding-right: 8px;
}

.agents-grid::-webkit-scrollbar {
  width: 4px;
}

.agents-grid::-webkit-scrollbar-track {
  background: transparent;
}

.agents-grid::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 2px;
}

.agent-card {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  padding: 14px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.agent-card:hover {
  border-color: rgba(56, 189, 248, 0.3);
  transform: translateY(-2px);
}

.agent-card.expanded {
  grid-column: span 2;
}

.agent-card.busy {
  border-left: 3px solid #38bdf8;
}

.card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 0%, rgba(56, 189, 248, 0.1) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.agent-card:hover .card-glow {
  opacity: 1;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.agent-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.agent-avatar.coordinator {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(249, 115, 22, 0.2) 100%);
}

.agent-avatar.creative {
  background: linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(168, 85, 247, 0.2) 100%);
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid #1e293b;
}

.status-indicator.idle {
  background: #22c55e;
}

.status-indicator.busy {
  background: #38bdf8;
  animation: statusPulse 2s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-size: 14px;
  font-weight: 600;
  color: #f8fafc;
  margin: 0 0 2px;
}

.agent-role {
  font-size: 11px;
  color: #64748b;
}

.agent-load {
  position: relative;
  width: 36px;
  height: 36px;
}

.load-ring {
  transform: rotate(-90deg);
  width: 100%;
  height: 100%;
}

.load-bg {
  fill: none;
  stroke: rgba(148, 163, 184, 0.2);
  stroke-width: 3;
}

.load-progress {
  fill: none;
  stroke: #22c55e;
  stroke-width: 3;
  stroke-linecap: round;
  transition: stroke-dasharray 0.5s ease;
}

.load-progress.medium {
  stroke: #f59e0b;
}

.load-progress.high {
  stroke: #ef4444;
}

.load-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 9px;
  font-weight: 600;
  color: #94a3b8;
}

.card-body {
  margin-bottom: 12px;
}

.task-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.task-name {
  font-size: 12px;
  color: #e2e8f0;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(148, 163, 184, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #38bdf8 0%, #818cf8 100%);
  border-radius: 2px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 10px;
  color: #64748b;
  min-width: 24px;
  text-align: right;
}

.task-empty {
  font-size: 12px;
  color: #64748b;
  padding: 8px 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.stat-icon {
  font-size: 10px;
}

.card-expanded {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
  animation: expandIn 0.3s ease;
}

@keyframes expandIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.recent-tasks h5,
.capabilities h5 {
  font-size: 11px;
  color: #64748b;
  margin: 0 0 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.recent-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 11px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
}

.task-status-icon {
  width: 16px;
  text-align: center;
}

.recent-task-item.completed .task-status-icon {
  color: #22c55e;
}

.recent-task-item.failed .task-status-icon {
  color: #ef4444;
}

.recent-task-item.running .task-status-icon {
  color: #38bdf8;
}

.task-desc {
  flex: 1;
  color: #94a3b8;
}

.task-time {
  color: #64748b;
  font-size: 10px;
}

.capabilities {
  margin-top: 16px;
}

.capability-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cap-tag {
  padding: 3px 10px;
  background: rgba(56, 189, 248, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.2);
  border-radius: 12px;
  font-size: 10px;
  color: #38bdf8;
}

/* 任务流 */
.tasks-section {
  background: rgba(30, 41, 59, 0.4);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-stats {
  display: flex;
  gap: 12px;
  font-size: 11px;
}

.task-stat {
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.task-stat.pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.task-stat.running {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.task-stat.completed {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.tasks-timeline {
  flex: 1;
  overflow-y: auto;
  position: relative;
  padding-left: 20px;
}

.timeline-line {
  position: absolute;
  left: 28px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.3) 0%, rgba(56, 189, 248, 0.1) 100%);
}

.task-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 0;
  position: relative;
  transition: all 0.3s ease;
}

.task-item:hover {
  background: rgba(56, 189, 248, 0.05);
  border-radius: 8px;
  margin: 0 -8px;
  padding-left: 8px;
  padding-right: 8px;
}

.task-time {
  font-size: 10px;
  color: #64748b;
  min-width: 50px;
  text-align: right;
}

.task-marker {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(30, 41, 59, 0.8);
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
}

.task-marker.pending {
  border-color: #f59e0b;
}

.task-marker.running {
  border-color: #38bdf8;
}

.task-marker.completed {
  border-color: #22c55e;
}

.marker-inner {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.task-marker.running .marker-inner {
  background: #38bdf8;
  animation: markerPulse 1.5s ease-in-out infinite;
}

@keyframes markerPulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(0.5); opacity: 0.5; }
}

.task-content {
  flex: 1;
  min-width: 0;
}

.task-header {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.task-priority {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}

.task-priority.high {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.task-priority.medium {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.task-priority.low {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.task-id {
  font-size: 9px;
  color: #64748b;
  font-family: monospace;
}

.task-title {
  font-size: 12px;
  color: #e2e8f0;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-assignee {
  display: flex;
  align-items: center;
  gap: 6px;
}

.assignee-avatar {
  font-size: 12px;
}

.assignee-name {
  font-size: 10px;
  color: #64748b;
}

.task-status-badge {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.task-status-badge.pending {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.task-status-badge.running {
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8;
}

.task-status-badge.completed {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

/* 任务动画 */
.task-enter-active,
.task-leave-active {
  transition: all 0.5s ease;
}

.task-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.task-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 底部日志 */
.dashboard-footer {
  padding: 0 20px 20px;
}

.log-section {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 12px;
  overflow: hidden;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.log-header h4 {
  font-size: 12px;
  color: #94a3b8;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.clear-btn {
  padding: 4px 12px;
  background: transparent;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 4px;
  color: #64748b;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.log-container {
  max-height: 120px;
  overflow-y: auto;
  padding: 8px 16px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  border-bottom: 1px solid rgba(148, 163, 184, 0.05);
}

.log-time {
  color: #64748b;
  min-width: 60px;
}

.log-level {
  min-width: 40px;
  font-weight: 600;
}

.log-item.success .log-level {
  color: #22c55e;
}

.log-item.info .log-level {
  color: #38bdf8;
}

.log-item.warning .log-level {
  color: #f59e0b;
}

.log-item.error .log-level {
  color: #ef4444;
}

.log-agent {
  color: #818cf8;
  min-width: 100px;
}

.log-message {
  color: #94a3b8;
  flex: 1;
}

/* 日志动画 */
.log-enter-active,
.log-leave-active {
  transition: all 0.3s ease;
}

.log-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.log-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

/* 响应式 */
@media (max-width: 1400px) {
  .dashboard-main {
    grid-template-columns: 1fr 1fr;
  }
  
  .network-section {
    display: none;
  }
}

@media (max-width: 900px) {
  .dashboard-main {
    grid-template-columns: 1fr;
  }
  
  .header-stats {
    display: none;
  }
  
  .agents-grid {
    grid-template-columns: 1fr;
  }
}
</style>
