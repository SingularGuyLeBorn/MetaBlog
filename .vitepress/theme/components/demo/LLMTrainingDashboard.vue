<template>
  <div class="llm-dashboard">
    <!-- 动态背景 -->
    <div class="dashboard-bg">
      <div class="grid-lines"></div>
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
    </div>

    <!-- 头部信息 -->
    <header class="dashboard-header">
      <div class="header-left">
        <div class="system-status" :class="systemHealth">
          <div class="status-pulse"></div>
          <span>{{ systemHealthText }}</span>
        </div>
        <h1 class="dashboard-title">
          <span class="title-icon">🧠</span>
          <div class="title-text">
            <span class="title-main">LLM Training Hub</span>
            <span class="title-sub">大模型训练协作平台</span>
          </div>
        </h1>
      </div>
      <div class="header-stats">
        <div class="stat-item">
          <div class="stat-icon-bg">🤖</div>
          <div class="stat-info">
            <div class="stat-value">{{ activeAgents }}</div>
            <div class="stat-label">训练智能体</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon-bg">⚡</div>
          <div class="stat-info">
            <div class="stat-value">{{ runningTasks }}</div>
            <div class="stat-label">训练任务</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon-bg">📊</div>
          <div class="stat-info">
            <div class="stat-value">{{ formatNumber(totalTokens) }}T</div>
            <div class="stat-label">已处理Token</div>
          </div>
        </div>
        <div class="stat-item">
          <div class="stat-icon-bg">🎯</div>
          <div class="stat-info">
            <div class="stat-value">{{ avgEfficiency }}%</div>
            <div class="stat-label">训练效率</div>
          </div>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="dashboard-main">
      <!-- 左侧：训练架构图 -->
      <section class="architecture-section">
        <div class="section-header">
          <h3>训练流水线架构</h3>
          <div class="live-indicator">
            <span class="live-dot"></span>
            实时监控
          </div>
        </div>
        <div class="pipeline-visualization" ref="pipelineRef">
          <!-- 流水线步骤 -->
          <div class="pipeline-steps">
            <div 
              v-for="(step, idx) in pipelineSteps" 
              :key="step.id"
              class="pipeline-step"
              :class="{ active: step.active, completed: step.completed }"
              :style="{ '--step-index': idx }"
            >
              <div class="step-node">
                <div class="step-icon">{{ step.icon }}</div>
                <div class="step-ring"></div>
                <div class="step-progress" v-if="step.active"></div>
              </div>
              <div class="step-info">
                <div class="step-name">{{ step.name }}</div>
                <div class="step-desc">{{ step.description }}</div>
                <div class="step-stats" v-if="step.active">
                  <span>{{ step.progress }}%</span>
                  <span>{{ step.speed }}</span>
                </div>
              </div>
              <!-- 连接线 -->
              <div class="step-connector" v-if="idx < pipelineSteps.length - 1">
                <div class="connector-line"></div>
                <div class="connector-arrow"></div>
              </div>
            </div>
          </div>
          
          <!-- GPU 利用率图表 -->
          <div class="gpu-metrics">
            <h4>GPU 集群利用率</h4>
            <div class="gpu-bars">
              <div v-for="n in 8" :key="n" class="gpu-bar-item">
                <span class="gpu-label">GPU {{ n }}</span>
                <div class="gpu-bar-bg">
                  <div 
                    class="gpu-bar-fill" 
                    :style="{ height: gpuUtils[n-1] + '%' }"
                    :class="{ high: gpuUtils[n-1] > 90 }"
                  ></div>
                </div>
                <span class="gpu-value">{{ gpuUtils[n-1] }}%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 中间：智能体卡片 -->
      <section class="agents-section">
        <div class="section-header">
          <h3>训练智能体</h3>
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
              <div class="agent-metrics">
                <div class="metric">
                  <span class="metric-value">{{ agent.load }}%</span>
                  <span class="metric-label">负载</span>
                </div>
              </div>
            </div>
            
            <div class="card-body">
              <div class="current-task" v-if="agent.currentTask">
                <div class="task-header-row">
                  <span class="task-label">当前任务</span>
                  <span class="task-badge" :class="agent.taskType">{{ agent.taskTypeText }}</span>
                </div>
                <div class="task-name">{{ agent.currentTask }}</div>
                <div class="task-meta">
                  <span v-if="agent.tokensPerSec">⚡ {{ agent.tokensPerSec }} tokens/s</span>
                  <span v-if="agent.eta">⏱️ ETA {{ agent.eta }}</span>
                </div>
                <div class="task-progress">
                  <div class="progress-track">
                    <div class="progress-fill" :style="{ width: agent.taskProgress + '%' }"></div>
                  </div>
                  <span class="progress-text">{{ agent.taskProgress }}%</span>
                </div>
              </div>
              <div class="task-empty" v-else>
                <span>🟢 待机中，等待任务分配...</span>
              </div>
            </div>

            <div class="card-footer">
              <div class="stat">
                <span class="stat-icon">📦</span>
                <span>{{ formatNumber(agent.tasksCompleted) }}</span>
              </div>
              <div class="stat">
                <span class="stat-icon">⏱️</span>
                <span>{{ agent.avgTime }}h</span>
              </div>
              <div class="stat">
                <span class="stat-icon">🎯</span>
                <span>{{ agent.successRate }}%</span>
              </div>
            </div>

            <!-- Expanded content -->
            <div class="card-expanded" v-if="expandedAgent === agent.id">
              <div class="recent-tasks">
                <h5>最近完成的任务</h5>
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
                  <span class="task-detail" v-if="task.tokens">{{ task.tokens }}T tokens</span>
                  <span class="task-time">{{ task.time }}</span>
                </div>
              </div>
              <div class="capabilities">
                <h5>核心能力</h5>
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

      <!-- 右侧：任务队列 -->
      <section class="tasks-section">
        <div class="section-header">
          <h3>训练任务队列</h3>
          <div class="task-stats">
            <span class="task-stat pending">待启动: {{ pendingCount }}</span>
            <span class="task-stat running">训练中: {{ runningCount }}</span>
            <span class="task-stat completed">已完成: {{ completedCount }}</span>
          </div>
        </div>
        <div class="tasks-queue" ref="tasksContainer">
          <TransitionGroup name="task">
            <div
              v-for="task in visibleTasks"
              :key="task.id"
              class="queue-item"
              :class="task.status"
            >
              <div class="queue-main">
                <div class="queue-header">
                  <span class="task-priority" :class="task.priority">{{ task.priorityText }}</span>
                  <span class="task-type-badge" :class="task.taskType">{{ task.taskTypeText }}</span>
                </div>
                <div class="queue-title">{{ task.name }}</div>
                <div class="queue-meta">
                  <span class="meta-item">
                    <span class="meta-icon">🤖</span>
                    {{ getAgentName(task.assignee) }}
                  </span>
                  <span class="meta-item" v-if="task.modelSize">
                    <span class="meta-icon">📊</span>
                    {{ task.modelSize }}
                  </span>
                  <span class="meta-item" v-if="task.dataset">
                    <span class="meta-icon">📁</span>
                    {{ task.dataset }}
                  </span>
                </div>
                <div class="queue-progress" v-if="task.status === 'running'">
                  <div class="mini-progress">
                    <div class="mini-fill" :style="{ width: task.progress + '%' }"></div>
                  </div>
                  <span class="mini-text">{{ task.progress }}%</span>
                </div>
              </div>
              <div class="queue-status" :class="task.status">
                <div class="status-icon">
                  {{ task.status === 'completed' ? '✓' : task.status === 'failed' ? '!' : '⟳' }}
                </div>
                <span class="status-text">{{ task.statusText }}</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </section>
    </main>

    <!-- 底部：训练日志 -->
    <footer class="dashboard-footer">
      <div class="log-section">
        <div class="log-header">
          <h4>📝 训练日志</h4>
          <div class="log-actions">
            <button class="log-btn" @click="exportLogs">导出</button>
            <button class="log-btn clear" @click="clearLogs">清空</button>
          </div>
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
              <span class="log-badge" :class="log.level">{{ log.levelText }}</span>
              <span class="log-agent">[{{ log.agent }}]</span>
              <span class="log-message">{{ log.message }}</span>
              <span class="log-metric" v-if="log.metric">{{ log.metric }}</span>
            </div>
          </TransitionGroup>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'

type AgentStatus = 'idle' | 'busy' | 'offline'
type AgentType = 'data' | 'training' | 'infra' | 'eval' | 'deploy'
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed'
type LogLevel = 'info' | 'success' | 'warning' | 'error'
type TaskType = 'pretrain' | 'sft' | 'rlhf' | 'data_clean' | 'eval' | 'infra'

interface Agent {
  id: string
  name: string
  icon: string
  role: string
  type: AgentType
  typeText: string
  status: AgentStatus
  load: number
  currentTask: string
  taskType: TaskType
  taskTypeText: string
  taskProgress: number
  tokensPerSec?: string
  eta?: string
  tasksCompleted: number
  avgTime: number
  successRate: number
  capabilities: string[]
  recentTasks: { name: string; status: TaskStatus; time: string; tokens?: string }[]
}

interface Task {
  id: string
  name: string
  status: TaskStatus
  statusText: string
  priority: 'high' | 'medium' | 'low'
  priorityText: string
  taskType: TaskType
  taskTypeText: string
  assignee: string
  progress: number
  modelSize?: string
  dataset?: string
}

interface Log {
  id: string
  time: string
  level: LogLevel
  levelText: string
  agent: string
  message: string
  metric?: string
}

interface PipelineStep {
  id: string
  name: string
  icon: string
  description: string
  active: boolean
  completed: boolean
  progress: number
  speed: string
}

// 状态
const currentFilter = ref<'all' | 'busy' | 'idle'>('all')
const expandedAgent = ref<string | null>(null)
const totalTokens = ref(1475000000000) // 1.475T

// GPU 利用率
const gpuUtils = ref([92, 88, 95, 87, 91, 89, 93, 90])

// 训练流水线
const pipelineSteps = ref<PipelineStep[]>([
  { id: 'data', name: '数据预处理', icon: '📊', description: '数据清洗、去重、格式化', active: false, completed: true, progress: 100, speed: '1.2M docs/s' },
  { id: 'token', name: 'Tokenization', icon: '🔤', description: '文本分词、编码转换', active: false, completed: true, progress: 100, speed: '500K tokens/s' },
  { id: 'pretrain', name: '预训练', icon: '🏋️', description: '大规模无监督训练', active: true, completed: false, progress: 67, speed: '3.2K tokens/s/GPU' },
  { id: 'sft', name: 'SFT微调', icon: '🎯', description: '有监督指令微调', active: false, completed: false, progress: 0, speed: '-' },
  { id: 'rlhf', name: 'RLHF对齐', icon: '🧠', description: '人类反馈强化学习', active: false, completed: false, progress: 0, speed: '-' },
  { id: 'eval', name: '模型评测', icon: '📈', description: '多维度能力评估', active: false, completed: false, progress: 0, speed: '-' }
])

// 智能体数据 - 大模型训练相关
const agents = ref<Agent[]>([
  {
    id: 'agent-001',
    name: 'DataCleaner',
    icon: '🧹',
    role: '数据清洗工程师',
    type: 'data',
    typeText: '数据型',
    status: 'busy',
    load: 85,
    currentTask: '清洗Common Crawl原始数据',
    taskType: 'data_clean',
    taskTypeText: '数据处理',
    taskProgress: 73,
    tokensPerSec: '1.2M',
    eta: '2.5h',
    tasksCompleted: 156,
    avgTime: 4.2,
    successRate: 98.5,
    capabilities: ['数据去重', '质量过滤', '隐私脱敏', '格式标准化', '多语言处理'],
    recentTasks: [
      { name: 'Wikipedia数据清洗', status: 'completed', time: '3h前', tokens: '12' },
      { name: '书籍语料去重', status: 'completed', time: '8h前', tokens: '45' },
      { name: '代码数据过滤', status: 'completed', time: '1d前', tokens: '89' }
    ]
  },
  {
    id: 'agent-002',
    name: 'TokenMaster',
    icon: '🔤',
    role: 'Tokenizer工程师',
    type: 'data',
    typeText: '数据型',
    status: 'idle',
    load: 15,
    currentTask: '',
    taskType: 'data_clean',
    taskTypeText: '数据处理',
    taskProgress: 0,
    tasksCompleted: 42,
    avgTime: 2.1,
    successRate: 99.8,
    capabilities: ['BPE训练', '词表优化', '多语言支持', '特殊Token设计', '编码优化'],
    recentTasks: [
      { name: '32K词表训练', status: 'completed', time: '1d前' },
      { name: '中日韩字集扩展', status: 'completed', time: '2d前' },
      { name: '代码Token优化', status: 'completed', time: '3d前' }
    ]
  },
  {
    id: 'agent-003',
    name: 'PretrainEngineer',
    icon: '🏋️',
    role: '预训练工程师',
    type: 'training',
    typeText: '训练型',
    status: 'busy',
    load: 96,
    currentTask: '7B模型Continual Pretraining',
    taskType: 'pretrain',
    taskTypeText: '预训练',
    taskProgress: 67,
    tokensPerSec: '25.6K',
    eta: '18h',
    tasksCompleted: 23,
    avgTime: 48,
    successRate: 94.2,
    capabilities: ['分布式训练', '混合精度', '梯度累积', '数据并行', '模型并行', 'ZeRO优化'],
    recentTasks: [
      { name: '1.4B模型预训练', status: 'completed', time: '2d前', tokens: '300' },
      { name: 'Domain Adaptive PT', status: 'completed', time: '5d前', tokens: '120' },
      { name: '长上下文扩展', status: 'running', time: '进行中' }
    ]
  },
  {
    id: 'agent-004',
    name: 'SFTTrainer',
    icon: '🎯',
    role: '指令微调工程师',
    type: 'training',
    typeText: '训练型',
    status: 'busy',
    load: 78,
    currentTask: '多轮对话SFT训练',
    taskType: 'sft',
    taskTypeText: 'SFT微调',
    taskProgress: 45,
    tokensPerSec: '8.2K',
    eta: '6h',
    tasksCompleted: 67,
    avgTime: 8.5,
    successRate: 96.8,
    capabilities: ['LoRA微调', '全参数微调', '指令数据构建', '多轮对话', '系统提示优化'],
    recentTasks: [
      { name: 'Alpaca数据SFT', status: 'completed', time: '6h前', tokens: '15' },
      { name: 'ShareGPT清洗训练', status: 'completed', time: '1d前', tokens: '45' },
      { name: 'Tool Use训练', status: 'running', time: '进行中' }
    ]
  },
  {
    id: 'agent-005',
    name: 'RLHFOptimizer',
    icon: '🧠',
    role: 'RLHF工程师',
    type: 'training',
    typeText: '训练型',
    status: 'idle',
    load: 25,
    currentTask: '',
    taskType: 'rlhf',
    taskTypeText: 'RLHF对齐',
    taskProgress: 0,
    tasksCompleted: 18,
    avgTime: 24,
    successRate: 91.5,
    capabilities: ['PPO训练', 'DPO优化', 'Reward模型训练', '人类偏好学习', '拒绝采样'],
    recentTasks: [
      { name: 'Reward模型训练', status: 'completed', time: '2d前' },
      { name: 'DPO对齐实验', status: 'completed', time: '4d前' },
      { name: 'PPO迭代优化', status: 'failed', time: '5d前' }
    ]
  },
  {
    id: 'agent-006',
    name: 'EvalMaster',
    icon: '📊',
    role: '评测工程师',
    type: 'eval',
    typeText: '评测型',
    status: 'busy',
    load: 65,
    currentTask: 'MMLU/CMMLU综合评测',
    taskType: 'eval',
    taskTypeText: '模型评测',
    taskProgress: 82,
    tasksCompleted: 234,
    avgTime: 3.2,
    successRate: 99.1,
    capabilities: ['标准评测集', '自定义评测', '人工评估', 'A/B测试', '模型对比', '能力维度分析'],
    recentTasks: [
      { name: 'C-Eval评测', status: 'completed', time: '4h前' },
      { name: 'GSM8K数学题测试', status: 'completed', time: '8h前' },
      { name: 'HumanEval代码评测', status: 'running', time: '进行中' }
    ]
  },
  {
    id: 'agent-007',
    name: 'InfraArchitect',
    icon: '⚙️',
    role: '基础设施工程师',
    type: 'infra',
    typeText: '架构型',
    status: 'busy',
    load: 72,
    currentTask: 'DeepSpeed ZeRO-3配置优化',
    taskType: 'infra',
    taskTypeText: '基础设施',
    taskProgress: 56,
    tasksCompleted: 89,
    avgTime: 6.8,
    successRate: 95.6,
    capabilities: ['训练框架', '分布式配置', '显存优化', '通信优化', 'Checkpoints', '故障恢复'],
    recentTasks: [
      { name: 'Megatron-LM迁移', status: 'completed', time: '1d前' },
      { name: 'FlashAttention集成', status: 'completed', time: '2d前' },
      { name: 'NVLink拓扑优化', status: 'running', time: '进行中' }
    ]
  },
  {
    id: 'agent-008',
    name: 'DataPipeline',
    icon: '🔧',
    role: '数据流水线工程师',
    type: 'infra',
    typeText: '架构型',
    status: 'busy',
    load: 68,
    currentTask: 'WebDataset格式转换',
    taskType: 'data_clean',
    taskTypeText: '数据处理',
    taskProgress: 89,
    tokensPerSec: '2.5M',
    eta: '45min',
    tasksCompleted: 156,
    avgTime: 2.5,
    successRate: 98.3,
    capabilities: ['数据流编排', '格式转换', '缓存策略', '并行加载', '数据校验', '增量更新'],
    recentTasks: [
      { name: '构建Streaming Dataset', status: 'completed', time: '5h前' },
      { name: 'S3数据同步', status: 'completed', time: '12h前' },
      { name: '数据版本管理', status: 'running', time: '进行中' }
    ]
  },
  {
    id: 'agent-009',
    name: 'ErrorHandler',
    icon: '🛡️',
    role: '容错处理工程师',
    type: 'infra',
    typeText: '架构型',
    status: 'idle',
    load: 20,
    currentTask: '',
    taskType: 'infra',
    taskTypeText: '基础设施',
    taskProgress: 0,
    tasksCompleted: 78,
    avgTime: 1.2,
    successRate: 97.9,
    capabilities: ['故障检测', '自动重启', 'Checkpoint恢复', '异常报警', '日志分析', '热点诊断'],
    recentTasks: [
      { name: 'NCCL超时问题修复', status: 'completed', time: '8h前' },
      { name: 'OOM自动降级', status: 'completed', time: '1d前' },
      { name: '节点故障迁移', status: 'completed', time: '2d前' }
    ]
  },
  {
    id: 'agent-010',
    name: 'DeployBot',
    icon: '🚀',
    role: '模型部署工程师',
    type: 'deploy',
    typeText: '部署型',
    status: 'idle',
    load: 12,
    currentTask: '',
    taskType: 'infra',
    taskTypeText: '部署',
    taskProgress: 0,
    tasksCompleted: 45,
    avgTime: 2.8,
    successRate: 98.7,
    capabilities: ['模型量化', '推理优化', 'vLLM部署', 'TGI服务', 'API网关', '监控告警'],
    recentTasks: [
      { name: 'GPTQ 4bit量化', status: 'completed', time: '1d前' },
      { name: 'AWQ量化部署', status: 'completed', time: '3d前' },
      { name: 'Batch推理优化', status: 'completed', time: '4d前' }
    ]
  }
])

// 任务数据 - 大模型训练相关
const tasks = ref<Task[]>([
  { id: 'task-001', name: 'Common Crawl 2024清洗', status: 'completed', statusText: '已完成', priority: 'high', priorityText: '高优', taskType: 'data_clean', taskTypeText: '数据处理', assignee: 'agent-001', progress: 100, modelSize: '8TB', dataset: 'CC-2024' },
  { id: 'task-002', name: '7B基座模型预训练', status: 'running', statusText: '训练中', priority: 'high', priorityText: '高优', taskType: 'pretrain', taskTypeText: '预训练', assignee: 'agent-003', progress: 67, modelSize: '7B', dataset: '1.5T tokens' },
  { id: 'task-003', name: '指令微调数据构建', status: 'running', statusText: '进行中', priority: 'high', priorityText: '高优', taskType: 'sft', taskTypeText: 'SFT微调', assignee: 'agent-004', progress: 45, dataset: '500K条' },
  { id: 'task-004', name: 'DeepSpeed ZeRO优化', status: 'running', statusText: '配置中', priority: 'medium', priorityText: '中优', taskType: 'infra', taskTypeText: '基础设施', assignee: 'agent-007', progress: 56 },
  { id: 'task-005', name: 'Reward模型训练', status: 'pending', statusText: '待启动', priority: 'medium', priorityText: '中优', taskType: 'rlhf', taskTypeText: 'RLHF对齐', assignee: 'agent-005', progress: 0 },
  { id: 'task-006', name: 'MMLU/CMMLU评测', status: 'running', statusText: '评测中', priority: 'medium', priorityText: '中优', taskType: 'eval', taskTypeText: '模型评测', assignee: 'agent-006', progress: 82 },
  { id: 'task-007', name: '多轮对话SFT', status: 'pending', statusText: '排队中', priority: 'medium', priorityText: '中优', taskType: 'sft', taskTypeText: 'SFT微调', assignee: 'agent-004', progress: 0, dataset: '200K条' },
  { id: 'task-008', name: 'WebDataset格式转换', status: 'running', statusText: '转换中', priority: 'medium', priorityText: '中优', taskType: 'data_clean', taskTypeText: '数据处理', assignee: 'agent-008', progress: 89, dataset: '500GB' },
  { id: 'task-009', name: 'DPO偏好对齐', status: 'pending', statusText: '待启动', priority: 'low', priorityText: '低优', taskType: 'rlhf', taskTypeText: 'RLHF对齐', assignee: 'agent-005', progress: 0 },
  { id: 'task-010', name: 'vLLM推理部署', status: 'pending', statusText: '待部署', priority: 'low', priorityText: '低优', taskType: 'infra', taskTypeText: '部署', assignee: 'agent-010', progress: 0, modelSize: '7B' },
  { id: 'task-011', name: 'GPTQ 4bit量化', status: 'pending', statusText: '排队中', priority: 'low', priorityText: '低优', taskType: 'infra', taskTypeText: '部署', assignee: 'agent-010', progress: 0 },
  { id: 'task-012', name: 'HumanEval代码评测', status: 'running', statusText: '评测中', priority: 'medium', priorityText: '中优', taskType: 'eval', taskTypeText: '模型评测', assignee: 'agent-006', progress: 35 },
])

// 日志数据
const logs = ref<Log[]>([
  { id: 'log-001', time: '10:05:32', level: 'success', levelText: '完成', agent: 'PretrainEngineer', message: 'Step 45000/67000, loss: 1.842', metric: 'ppl: 6.32' },
  { id: 'log-002', time: '10:05:15', level: 'info', levelText: '信息', agent: 'DataCleaner', message: '清洗进度 73%, 已处理 2.3B docs', metric: '速度: 1.2M/s' },
  { id: 'log-003', time: '10:04:58', level: 'warning', levelText: '警告', agent: 'InfraArchitect', message: 'GPU 3显存使用超过90%', metric: '93.2%' },
  { id: 'log-004', time: '10:04:45', level: 'success', levelText: '完成', agent: 'EvalMaster', message: 'MMLU评测完成', metric: 'acc: 62.3%' },
  { id: 'log-005', time: '10:04:32', level: 'info', levelText: '信息', agent: 'SFTTrainer', message: 'Epoch 2/3, lr: 2e-5', metric: 'loss: 0.892' },
  { id: 'log-006', time: '10:04:15', level: 'success', levelText: '完成', agent: 'DataPipeline', message: 'Shard 34/50 转换完成', metric: '速度: 2.5M/s' },
  { id: 'log-007', time: '10:03:58', level: 'error', levelText: '错误', agent: 'PretrainEngineer', message: 'NCCL通信超时，自动重试中', metric: 'retry: 2/3' },
  { id: 'log-008', time: '10:03:45', level: 'info', levelText: '信息', agent: 'ErrorHandler', message: '检测到GPU故障，启动迁移', metric: 'Node-5 → Node-12' },
])

// 计算属性
const systemHealth = computed(() => {
  const busyCount = agents.value.filter(a => a.status === 'busy').length
  if (busyCount >= 7) return 'heavy'
  if (busyCount >= 4) return 'normal'
  return 'light'
})

const systemHealthText = computed(() => {
  const map = { light: '集群负载正常', normal: '集群运行良好', heavy: '集群高负载运行' }
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

// 方法
const getAgentName = (id: string) => agents.value.find(a => a.id === id)?.name || 'Unknown'

const toggleExpand = (id: string) => {
  expandedAgent.value = expandedAgent.value === id ? null : id
}

const clearLogs = () => {
  logs.value = []
}

const exportLogs = () => {
  const data = JSON.stringify(logs.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `training-logs-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

const formatNumber = (num: number) => {
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T'
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return num.toString()
}

// 模拟实时更新
let updateInterval: number
let gpuInterval: number

onMounted(() => {
  // 模拟任务进度更新
  updateInterval = window.setInterval(() => {
    agents.value.forEach(agent => {
      if (agent.status === 'busy' && agent.taskProgress < 100) {
        agent.taskProgress = Math.min(100, agent.taskProgress + Math.random() * 2)
        agent.load = Math.min(100, Math.max(30, agent.load + (Math.random() - 0.5) * 10))
      }
    })
    
    // 更新总token数
    totalTokens.value += Math.floor(Math.random() * 100000000)
  }, 3000)

  // 模拟GPU利用率波动
  gpuInterval = window.setInterval(() => {
    gpuUtils.value = gpuUtils.value.map(util => {
      const change = Math.floor((Math.random() - 0.5) * 10)
      return Math.max(50, Math.min(99, util + change))
    })
  }, 2000)
})

onUnmounted(() => {
  clearInterval(updateInterval)
  clearInterval(gpuInterval)
})
</script>

<style scoped>
.llm-dashboard {
  min-height: 100vh;
  background: linear-gradient(135deg, #fafafa 0%, #f0f4f8 50%, #e8eef5 100%);
  color: #1e293b;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
    linear-gradient(rgba(59, 130, 246, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.4;
}

.orb-1 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%);
  top: -200px;
  right: -100px;
}

.orb-2 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%);
  bottom: -150px;
  left: -100px;
}

.orb-3 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #34d399 0%, #10b981 100%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  opacity: 0.2;
}

/* 头部 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
  position: relative;
  z-index: 10;
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
  letter-spacing: 0.5px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.system-status.light {
  color: #059669;
  border: 1px solid #a7f3d0;
}

.system-status.normal {
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.system-status.heavy {
  color: #dc2626;
  border: 1px solid #fecaca;
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
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 32px;
}

.title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.title-main {
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.title-sub {
  font-size: 13px;
  color: #64748b;
  letter-spacing: 1px;
}

.header-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.stat-icon-bg {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 10px;
  font-size: 20px;
}

.stat-info {
  text-align: left;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

/* 主内容区 */
.dashboard-main {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1.3fr 1fr;
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
  font-size: 15px;
  font-weight: 600;
  color: #374151;
  letter-spacing: 0.5px;
}

/* 训练流水线 */
.architecture-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #059669;
  font-weight: 600;
  background: rgba(16, 185, 129, 0.1);
  padding: 4px 10px;
  border-radius: 20px;
}

.live-dot {
  width: 6px;
  height: 6px;
  background: #10b981;
  border-radius: 50%;
  animation: livePulse 1.5s ease-in-out infinite;
}

@keyframes livePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.pipeline-visualization {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pipeline-steps {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.pipeline-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  border: 2px solid transparent;
  position: relative;
  transition: all 0.3s ease;
}

.pipeline-step.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.pipeline-step.completed {
  border-color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, white 100%);
}

.step-node {
  position: relative;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.step-icon {
  font-size: 20px;
  z-index: 2;
}

.step-ring {
  position: absolute;
  inset: 0;
  border: 2px solid #e5e7eb;
  border-radius: 50%;
}

.pipeline-step.active .step-ring {
  border-color: #3b82f6;
}

.pipeline-step.completed .step-ring {
  border-color: #10b981;
}

.step-progress {
  position: absolute;
  inset: -3px;
  border: 3px solid #3b82f6;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.step-info {
  flex: 1;
  min-width: 0;
}

.step-name {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 2px;
}

.step-desc {
  font-size: 11px;
  color: #6b7280;
}

.step-stats {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 11px;
  color: #3b82f6;
  font-weight: 500;
}

.step-connector {
  position: absolute;
  left: 32px;
  bottom: -12px;
  width: 2px;
  height: 12px;
}

.connector-line {
  width: 2px;
  height: 100%;
  background: #e5e7eb;
}

.pipeline-step.completed .connector-line {
  background: #10b981;
}

/* GPU 利用率 */
.gpu-metrics {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-top: auto;
}

.gpu-metrics h4 {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.gpu-bars {
  display: flex;
  gap: 8px;
  height: 80px;
}

.gpu-bar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.gpu-label {
  font-size: 9px;
  color: #9ca3af;
}

.gpu-bar-bg {
  flex: 1;
  width: 100%;
  background: #f3f4f6;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.gpu-bar-fill {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 4px;
  transition: height 0.5s ease;
}

.gpu-bar-fill.high {
  background: linear-gradient(180deg, #ef4444 0%, #dc2626 100%);
}

.gpu-value {
  font-size: 9px;
  color: #6b7280;
  font-weight: 600;
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
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.filter-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.filter-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
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

.agents-grid::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 2px;
}

.agent-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 14px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.agent-card:hover {
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.agent-card.expanded {
  grid-column: span 2;
}

.agent-card.busy {
  border-left: 3px solid #3b82f6;
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
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.agent-avatar.data {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.agent-avatar.training {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.agent-avatar.infra {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
}

.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 2px solid white;
}

.status-indicator.idle {
  background: #10b981;
}

.status-indicator.busy {
  background: #3b82f6;
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
  color: #1f2937;
  margin: 0 0 2px;
}

.agent-role {
  font-size: 11px;
  color: #6b7280;
}

.agent-metrics {
  text-align: right;
}

.metric-value {
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
}

.metric-label {
  font-size: 10px;
  color: #9ca3af;
}

.card-body {
  margin-bottom: 12px;
}

.task-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.task-label {
  font-size: 10px;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.task-badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

.task-badge.pretrain {
  background: #dbeafe;
  color: #1d4ed8;
}

.task-badge.sft {
  background: #fce7f3;
  color: #be185d;
}

.task-badge.rlhf {
  background: #f3e8ff;
  color: #7c3aed;
}

.task-badge.data_clean {
  background: #fef3c7;
  color: #b45309;
}

.task-name {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.task-meta {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #6b7280;
  margin-bottom: 8px;
}

.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.progress-track {
  flex: 1;
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 3px;
  transition: width 0.5s ease;
}

.progress-text {
  font-size: 11px;
  color: #6b7280;
  min-width: 32px;
  text-align: right;
  font-weight: 600;
}

.task-empty {
  font-size: 12px;
  color: #9ca3af;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid #f3f4f6;
}

.stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #6b7280;
}

.stat-icon {
  font-size: 12px;
}

.card-expanded {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.recent-tasks h5,
.capabilities h5 {
  font-size: 11px;
  color: #6b7280;
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
  border-bottom: 1px solid #f9fafb;
}

.task-status-icon {
  width: 16px;
  text-align: center;
}

.recent-task-item.completed .task-status-icon {
  color: #10b981;
}

.recent-task-item.failed .task-status-icon {
  color: #ef4444;
}

.recent-task-item.running .task-status-icon {
  color: #3b82f6;
}

.task-desc {
  flex: 1;
  color: #4b5563;
}

.task-detail {
  color: #6b7280;
  font-size: 10px;
}

.task-time {
  color: #9ca3af;
  font-size: 10px;
}

.capability-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cap-tag {
  padding: 3px 10px;
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  font-size: 10px;
  color: #2563eb;
}

/* 任务队列 */
.tasks-section {
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-stats {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.task-stat {
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.task-stat.pending {
  background: #fef3c7;
  color: #b45309;
}

.task-stat.running {
  background: #dbeafe;
  color: #1d4ed8;
}

.task-stat.completed {
  background: #d1fae5;
  color: #047857;
}

.tasks-queue {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.queue-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.queue-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.08);
}

.queue-main {
  flex: 1;
  min-width: 0;
}

.queue-header {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.task-priority {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.task-priority.high {
  background: #fee2e2;
  color: #dc2626;
}

.task-priority.medium {
  background: #fef3c7;
  color: #d97706;
}

.task-priority.low {
  background: #d1fae5;
  color: #059669;
}

.task-type-badge {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #f3f4f6;
  color: #6b7280;
}

.queue-title {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  font-size: 11px;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 4px;
}

.meta-icon {
  font-size: 10px;
}

.queue-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.mini-progress {
  flex: 1;
  height: 4px;
  background: #f3f4f6;
  border-radius: 2px;
  overflow: hidden;
}

.mini-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.5s ease;
}

.mini-text {
  font-size: 10px;
  color: #6b7280;
  font-weight: 600;
}

.queue-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 50px;
}

.status-icon {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  font-weight: 600;
}

.queue-status.completed .status-icon {
  background: #d1fae5;
  color: #059669;
}

.queue-status.running .status-icon {
  background: #dbeafe;
  color: #2563eb;
  animation: spin 1s linear infinite;
}

.queue-status.pending .status-icon {
  background: #fef3c7;
  color: #d97706;
}

.status-text {
  font-size: 10px;
  color: #6b7280;
  font-weight: 500;
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
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.log-header h4 {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.log-actions {
  display: flex;
  gap: 8px;
}

.log-btn {
  padding: 6px 14px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #6b7280;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.log-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.log-btn.clear:hover {
  background: #fee2e2;
  border-color: #fecaca;
  color: #dc2626;
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
  font-size: 12px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  border-bottom: 1px solid #f9fafb;
  align-items: center;
}

.log-time {
  color: #9ca3af;
  min-width: 60px;
  font-size: 11px;
}

.log-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  min-width: 40px;
  text-align: center;
}

.log-badge.success {
  background: #d1fae5;
  color: #059669;
}

.log-badge.info {
  background: #dbeafe;
  color: #2563eb;
}

.log-badge.warning {
  background: #fef3c7;
  color: #d97706;
}

.log-badge.error {
  background: #fee2e2;
  color: #dc2626;
}

.log-agent {
  color: #4f46e5;
  min-width: 110px;
  font-weight: 500;
}

.log-message {
  color: #4b5563;
  flex: 1;
}

.log-metric {
  color: #059669;
  font-size: 11px;
  font-weight: 500;
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
  
  .architecture-section {
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
