<template>
  <div class="training-theater">
    <!-- 标题区 -->
    <header class="theater-header">
      <h1 class="main-title">🧠 大模型训练全过程演示</h1>
      <p class="sub-title">观看10个AI智能体如何协作训练一个70亿参数的大语言模型</p>
    </header>

    <!-- 主舞台 -->
    <main class="stage">
      <!-- 左侧：智能体阵容 -->
      <aside class="agents-roster">
        <h2 class="section-title">训练团队</h2>
        <div class="agents-list">
          <div 
            v-for="agent in agents" 
            :key="agent.id"
            class="agent-portrait"
            :class="{ 
              active: currentPhase?.agentId === agent.id,
              completed: agent.completed,
              waiting: !agent.completed && currentPhase?.agentId !== agent.id
            }"
          >
            <div class="avatar">{{ agent.icon }}</div>
            <div class="info">
              <div class="name">{{ agent.name }}</div>
              <div class="role">{{ agent.role }}</div>
            </div>
            <div class="status-icon">
              {{ agent.completed ? '✅' : currentPhase?.agentId === agent.id ? '⚡' : '⏳' }}
            </div>
          </div>
        </div>
      </aside>

      <!-- 中间：动画展示区 -->
      <section class="animation-display">
        <!-- 进度条 -->
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: overallProgress + '%' }"></div>
          <span class="progress-text">{{ Math.floor(overallProgress) }}%</span>
        </div>

        <!-- 当前阶段标题 -->
        <div class="phase-header">
          <span class="phase-number">阶段 {{ currentPhaseIndex + 1 }}/{{ phases.length }}</span>
          <h2 class="phase-title">{{ currentPhase?.title }}</h2>
          <p class="phase-desc">{{ currentPhase?.description }}</p>
        </div>

        <!-- 动画画布 -->
        <div class="animation-canvas" ref="canvasRef">
          <!-- 数据流粒子 -->
          <div class="particles">
            <div 
              v-for="n in 20" 
              :key="n" 
              class="data-particle"
              :class="{ flowing: isAnimating }"
              :style="{ 
                '--delay': n * 0.1 + 's',
                '--x': Math.random() * 100 + '%',
                '--y': Math.random() * 100 + '%'
              }"
            >
              {{ ['📄', '🔤', '📊', '💾', '⚡'][n % 5] }}
            </div>
          </div>

          <!-- 阶段特定动画 -->
          <div class="phase-visual" :class="currentPhase?.id">
            <!-- 数据清洗可视化 -->
            <div v-if="currentPhase?.id === 'data-clean'" class="cleaning-visual">
              <div class="raw-data-box">
                <div class="box-title">原始数据</div>
                <div class="data-items">
                  <div v-for="n in 8" :key="n" class="data-item" :class="{ cleaning: animStep >= n }">
                    📄 Doc_{{ 1000 + n }}
                  </div>
                </div>
                <div class="stats">共 8.5TB 原始文本</div>
              </div>
              <div class="arrow">→</div>
              <div class="processing-core">
                <div class="core-icon">🧹</div>
                <div class="core-text">清洗中...</div>
                <div class="mini-progress">
                  <div class="bar" :style="{ width: phaseProgress + '%' }"></div>
                </div>
              </div>
              <div class="arrow">→</div>
              <div class="clean-data-box">
                <div class="box-title">清洗后</div>
                <div class="data-items">
                  <div v-for="n in 5" :key="n" class="data-item clean">
                    ✅ Doc_{{ 1000 + n }}
                  </div>
                </div>
                <div class="stats">剩余 4.2TB 高质量数据</div>
              </div>
            </div>

            <!-- Tokenizer训练可视化 -->
            <div v-if="currentPhase?.id === 'tokenizer'" class="tokenizer-visual">
              <div class="vocab-building">
                <div class="vocab-title">词表构建</div>
                <div class="vocab-grid">
                  <div 
                    v-for="n in 16" 
                    :key="n" 
                    class="token-cell"
                    :class="{ filled: animStep * 2 >= n }"
                  >
                    {{ ['你好', 'Hello', 'world', '世界', 'AI', '的', '是', '在', 'model', 'train', 'data', '学习', '🎉', '💡', '✨', '🔥'][n-1] }}
                  </div>
                </div>
                <div class="vocab-progress">
                  词表大小: {{ Math.floor(32000 * phaseProgress / 100) }} / 32000
                </div>
              </div>
            </div>

            <!-- 预训练可视化 -->
            <div v-if="currentPhase?.id === 'pretrain'" class="pretrain-visual">
              <div class="model-box">
                <div class="model-title">7B 参数模型</div>
                <div class="model-layers">
                  <div 
                    v-for="n in 32" 
                    :key="n" 
                    class="layer"
                    :class="{ trained: phaseProgress > (n / 32 * 100) }"
                    :style="{ '--layer-index': n }"
                  >
                    Layer {{ n }}
                  </div>
                </div>
              </div>
              <div class="training-info">
                <div class="epoch">Epoch {{ Math.floor(phaseProgress / 10) + 1 }}/10</div>
                <div class="loss-chart">
                  <div class="chart-title">Loss 下降趋势</div>
                  <svg viewBox="0 0 300 100" class="chart-svg">
                    <path 
                      class="chart-line"
                      :d="lossPath"
                      fill="none"
                      stroke="#3b82f6"
                      stroke-width="2"
                    />
                    <circle 
                      v-for="(point, i) in lossPoints" 
                      :key="i"
                      :cx="point.x" 
                      :cy="point.y" 
                      r="3"
                      fill="#3b82f6"
                      :class="{ show: phaseProgress > (i / lossPoints.length * 100) }"
                    />
                  </svg>
                </div>
                <div class="metrics">
                  <div class="metric">
                    <span class="metric-label">Loss</span>
                    <span class="metric-value">{{ currentLoss.toFixed(3) }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Perplexity</span>
                    <span class="metric-value">{{ currentPPL.toFixed(2) }}</span>
                  </div>
                  <div class="metric">
                    <span class="metric-label">Tokens/s</span>
                    <span class="metric-value">{{ tokensPerSec }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- SFT可视化 -->
            <div v-if="currentPhase?.id === 'sft'" class="sft-visual">
              <div class="instruction-flow">
                <div class="instruction-box" v-for="n in 3" :key="n" :class="{ active: animStep >= n }">
                  <div class="inst-header">指令样本 {{ n }}</div>
                  <div class="inst-content">
                    <div class="q">Q: {{ ['写一篇关于AI的文章', '解释什么是深度学习', '翻译这句话'][n-1] }}</div>
                    <div class="a" :class="{ typing: animStep >= n }">A: {{ ['AI是人工智能...', '深度学习是一种...', 'Translation:...'][n-1] }}</div>
                  </div>
                </div>
              </div>
              <div class="sft-progress">
                <div class="progress-ring">
                  <svg viewBox="0 0 100 100">
                    <circle class="ring-bg" cx="50" cy="50" r="45"/>
                    <circle 
                      class="ring-fill"
                      cx="50" cy="50" r="45"
                      :stroke-dasharray="`${phaseProgress * 2.83} 283`"
                    />
                  </svg>
                  <div class="ring-text">{{ Math.floor(phaseProgress) }}%</div>
                </div>
                <div class="sft-stats">
                  <div>已处理: {{ Math.floor(500000 * phaseProgress / 100) }}K 样本</div>
                  <div>学习率: 2e-5</div>
                </div>
              </div>
            </div>

            <!-- RLHF可视化 -->
            <div v-if="currentPhase?.id === 'rlhf'" class="rlhf-visual">
              <div class="rlhf-flow">
                <div class="model-a">
                  <div class="model-name">策略模型 π</div>
                  <div class="response">生成回答A...</div>
                </div>
                <div class="vs">VS</div>
                <div class="model-b">
                  <div class="model-name">旧策略 π_old</div>
                  <div class="response">生成回答B...</div>
                </div>
              </div>
              <div class="reward-model">
                <div class="rm-title">🎯 Reward Model 评分</div>
                <div class="rm-scores">
                  <div class="score-bar">
                    <span>回答A</span>
                    <div class="bar"><div class="fill" :style="{ width: phaseProgress + '%' }"></div></div>
                    <span>{{ Math.floor(8.5 * phaseProgress / 100) }}/10</span>
                  </div>
                  <div class="score-bar">
                    <span>回答B</span>
                    <div class="bar"><div class="fill old" :style="{ width: (100 - phaseProgress) * 0.6 + '%' }"></div></div>
                    <span>{{ Math.floor(6.0 * (100 - phaseProgress) / 100 + 4) }}/10</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 评测可视化 -->
            <div v-if="currentPhase?.id === 'eval'" class="eval-visual">
              <div class="benchmarks">
                <div 
                  v-for="bench in benchmarks" 
                  :key="bench.name"
                  class="benchmark-card"
                  :class="{ tested: phaseProgress >= bench.threshold }"
                >
                  <div class="bench-name">{{ bench.name }}</div>
                  <div class="bench-score" v-if="phaseProgress >= bench.threshold">
                    {{ bench.score }}
                  </div>
                  <div class="bench-status" v-else>测试中...</div>
                  <div class="progress-bar" v-if="phaseProgress >= bench.threshold && phaseProgress < bench.threshold + 20">
                    <div class="bar"><div class="fill" :style="{ width: (phaseProgress - bench.threshold) * 5 + '%' }"></div></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 部署可视化 -->
            <div v-if="currentPhase?.id === 'deploy'" class="deploy-visual">
              <div class="deployment-flow">
                <div class="deploy-stage" :class="{ active: phaseProgress > 0 }">
                  <div class="stage-icon">📦</div>
                  <div class="stage-name">模型打包</div>
                </div>
                <div class="deploy-arrow">→</div>
                <div class="deploy-stage" :class="{ active: phaseProgress > 30 }">
                  <div class="stage-icon">🗜️</div>
                  <div class="stage-name">量化压缩</div>
                </div>
                <div class="deploy-arrow">→</div>
                <div class="deploy-stage" :class="{ active: phaseProgress > 60 }">
                  <div class="stage-icon">🚀</div>
                  <div class="stage-name">服务部署</div>
                </div>
                <div class="deploy-arrow">→</div>
                <div class="deploy-stage" :class="{ active: phaseProgress > 90 }">
                  <div class="stage-icon">✅</div>
                  <div class="stage-name">上线运行</div>
                </div>
              </div>
              <div class="deploy-status" v-if="phaseProgress > 90">
                🎉 模型已成功部署，可通过 API 调用！
              </div>
            </div>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="controls">
          <button 
            class="control-btn" 
            @click="togglePlay"
            :class="{ playing: isPlaying }"
          >
            {{ isPlaying ? '⏸️ 暂停' : '▶️ 播放' }}
          </button>
          <button class="control-btn secondary" @click="reset">
            🔄 重新开始
          </button>
          <div class="speed-control">
            <span>速度:</span>
            <button 
              v-for="s in [1, 2, 5]" 
              :key="s"
              :class="['speed-btn', { active: speed === s }]"
              @click="speed = s"
            >
              {{ s }}x
            </button>
          </div>
        </div>
      </section>

      <!-- 右侧：训练日志 -->
      <aside class="training-logs">
        <h2 class="section-title">训练日志</h2>
        <div class="logs-container" ref="logsRef">
          <TransitionGroup name="log">
            <div 
              v-for="log in visibleLogs" 
              :key="log.id"
              class="log-entry"
              :class="log.type"
            >
              <div class="log-time">{{ log.time }}</div>
              <div class="log-content">
                <span class="log-agent">[{{ log.agent }}]</span>
                <span class="log-msg">{{ log.message }}</span>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

interface Agent {
  id: string
  icon: string
  name: string
  role: string
  completed: boolean
}

interface Phase {
  id: string
  agentId: string
  title: string
  description: string
  duration: number // ms
  logs: { time: string; message: string; type?: string }[]
}

// 智能体定义
const agents = ref<Agent[]>([
  { id: 'data', icon: '🧹', name: 'DataCleaner', role: '数据清洗工程师', completed: false },
  { id: 'tokenizer', icon: '🔤', name: 'TokenMaster', role: 'Tokenizer工程师', completed: false },
  { id: 'pretrain', icon: '🏋️', name: 'PretrainEngineer', role: '预训练工程师', completed: false },
  { id: 'sft', icon: '🎯', name: 'SFTTrainer', role: '指令微调工程师', completed: false },
  { id: 'rlhf', icon: '🧠', name: 'RLHFOptimizer', role: 'RLHF工程师', completed: false },
  { id: 'eval', icon: '📊', name: 'EvalMaster', role: '评测工程师', completed: false },
  { id: 'infra', icon: '⚙️', name: 'InfraArchitect', role: '基础设施工程师', completed: false },
  { id: 'deploy', icon: '🚀', name: 'DeployBot', role: '部署工程师', completed: false },
])

// 阶段定义
const phases: Phase[] = [
  {
    id: 'data-clean',
    agentId: 'data',
    title: '数据清洗',
    description: '清洗Common Crawl原始数据，去重、过滤、格式化',
    duration: 8000,
    logs: [
      { time: '00:00', message: '开始加载原始数据...', type: 'info' },
      { time: '00:02', message: '已加载 8.5TB 原始文本', type: 'success' },
      { time: '00:03', message: '启动质量过滤器...', type: 'info' },
      { time: '00:05', message: '移除重复文档 1.2M', type: 'warning' },
      { time: '00:06', message: '过滤低质量内容...', type: 'info' },
      { time: '00:08', message: '数据清洗完成，剩余 4.2TB', type: 'success' },
    ]
  },
  {
    id: 'tokenizer',
    agentId: 'tokenizer',
    title: 'Tokenizer训练',
    description: '训练BPE分词器，构建32000词表',
    duration: 6000,
    logs: [
      { time: '00:00', message: '开始训练BPE tokenizer...', type: 'info' },
      { time: '00:01', message: '统计词频中...', type: 'info' },
      { time: '00:03', message: '合并高频词对', type: 'info' },
      { time: '00:05', message: '词表构建完成: 32000 tokens', type: 'success' },
      { time: '00:06', message: '保存 tokenizer.json', type: 'success' },
    ]
  },
  {
    id: 'pretrain',
    agentId: 'pretrain',
    title: '预训练',
    description: '7B参数模型预训练，使用1.5T tokens',
    duration: 15000,
    logs: [
      { time: '00:00', message: '初始化 7B 模型...', type: 'info' },
      { time: '00:02', message: '模型参数量: 6.9B', type: 'success' },
      { time: '00:03', message: '启动 DeepSpeed ZeRO-3', type: 'info' },
      { time: '00:05', message: 'Epoch 1/10, Loss: 4.523', type: 'info' },
      { time: '00:08', message: 'Epoch 3/10, Loss: 2.891', type: 'info' },
      { time: '00:11', message: 'Epoch 6/10, Loss: 2.145', type: 'info' },
      { time: '00:14', message: 'Epoch 10/10, Loss: 1.823', type: 'success' },
      { time: '00:15', message: '预训练完成! PPL: 6.19', type: 'success' },
    ]
  },
  {
    id: 'sft',
    agentId: 'sft',
    title: '指令微调 (SFT)',
    description: '使用50万指令样本进行监督微调',
    duration: 10000,
    logs: [
      { time: '00:00', message: '加载指令数据集...', type: 'info' },
      { time: '00:01', message: '数据集大小: 500K 样本', type: 'success' },
      { time: '00:02', message: '开始 SFT 训练 (LoRA)', type: 'info' },
      { time: '00:04', message: 'Epoch 1/3, Loss: 1.234', type: 'info' },
      { time: '00:07', message: 'Epoch 2/3, Loss: 0.876', type: 'info' },
      { time: '00:09', message: 'Epoch 3/3, Loss: 0.654', type: 'info' },
      { time: '00:10', message: 'SFT 训练完成!', type: 'success' },
    ]
  },
  {
    id: 'rlhf',
    agentId: 'rlhf',
    title: 'RLHF对齐',
    description: '使用PPO算法进行人类反馈强化学习',
    duration: 8000,
    logs: [
      { time: '00:00', message: '加载 Reward Model...', type: 'info' },
      { time: '00:02', message: '初始化 PPO 训练器', type: 'info' },
      { time: '00:04', message: 'PPO Step 100/1000, Reward: 2.34', type: 'info' },
      { time: '00:06', message: 'PPO Step 500/1000, Reward: 4.56', type: 'info' },
      { time: '00:07', message: 'PPO Step 1000/1000, Reward: 5.23', type: 'info' },
      { time: '00:08', message: 'RLHF 对齐完成!', type: 'success' },
    ]
  },
  {
    id: 'eval',
    agentId: 'eval',
    title: '模型评测',
    description: '在多个基准测试上评估模型性能',
    duration: 6000,
    logs: [
      { time: '00:00', message: '开始模型评测...', type: 'info' },
      { time: '00:01', message: 'MMLU 评测中...', type: 'info' },
      { time: '00:02', message: 'MMLU 得分: 62.3%', type: 'success' },
      { time: '00:03', message: 'GSM8K 数学评测...', type: 'info' },
      { time: '00:04', message: 'GSM8K 得分: 45.7%', type: 'success' },
      { time: '00:05', message: 'HumanEval 代码评测...', type: 'info' },
      { time: '00:06', message: 'HumanEval 得分: 28.5%', type: 'success' },
    ]
  },
  {
    id: 'deploy',
    agentId: 'deploy',
    title: '模型部署',
    description: '量化压缩并部署为在线服务',
    duration: 5000,
    logs: [
      { time: '00:00', message: '开始模型打包...', type: 'info' },
      { time: '00:01', message: 'GPTQ 4bit 量化中...', type: 'info' },
      { time: '00:03', message: '模型大小: 7B → 4.2GB', type: 'success' },
      { time: '00:04', message: '部署 vLLM 推理服务', type: 'info' },
      { time: '00:05', message: '🎉 服务已上线! http://api.llm.local', type: 'success' },
    ]
  },
]

// 状态
const currentPhaseIndex = ref(0)
const phaseProgress = ref(0)
const isPlaying = ref(false)
const speed = ref(1)
const logs = ref<{ id: number; time: string; agent: string; message: string; type: string }[]>([])
const animStep = ref(0)

// 计算属性
const currentPhase = computed(() => phases[currentPhaseIndex.value])

const overallProgress = computed(() => {
  const phaseContribution = (currentPhaseIndex.value / phases.length) * 100
  const currentContribution = (phaseProgress.value / 100) * (100 / phases.length)
  return phaseContribution + currentContribution
})

const visibleLogs = computed(() => logs.value.slice(-8))

const isAnimating = computed(() => isPlaying.value && phaseProgress.value < 100)

// Loss曲线数据
const lossPoints = computed(() => {
  const points = []
  for (let i = 0; i <= 10; i++) {
    points.push({
      x: i * 30,
      y: 100 - i * 7 + Math.sin(i) * 5
    })
  }
  return points
})

const lossPath = computed(() => {
  return lossPoints.value.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
})

const currentLoss = computed(() => {
  return 4.5 - (phaseProgress.value / 100) * 2.7
})

const currentPPL = computed(() => {
  return Math.exp(currentLoss.value)
})

const tokensPerSec = computed(() => {
  return Math.floor(25000 + Math.sin(phaseProgress.value / 10) * 3000)
})

// 评测基准
const benchmarks = [
  { name: 'MMLU', score: '62.3%', threshold: 0 },
  { name: 'GSM8K', score: '45.7%', threshold: 20 },
  { name: 'HumanEval', score: '28.5%', threshold: 40 },
  { name: 'C-Eval', score: '58.2%', threshold: 60 },
]

// 播放控制
let playInterval: number | null = null

const startPlayback = () => {
  if (playInterval) return
  
  playInterval = window.setInterval(() => {
    if (phaseProgress.value < 100) {
      phaseProgress.value += 1
      
      // 根据进度添加日志
      const phaseLogs = currentPhase.value.logs
      const logIndex = Math.floor(phaseProgress.value / 100 * phaseLogs.length)
      if (logIndex < phaseLogs.length && logIndex >= logs.value.filter(l => l.agent === agents.value.find(a => a.id === currentPhase.value.agentId)?.name).length) {
        const log = phaseLogs[logIndex]
        const agent = agents.value.find(a => a.id === currentPhase.value.agentId)
        logs.value.push({
          id: Date.now(),
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          agent: agent?.name || '',
          message: log.message,
          type: log.type || 'info'
        })
      }
      
      // 动画步骤
      animStep.value = Math.floor(phaseProgress.value / 10)
    } else {
      // 阶段完成
      const agent = agents.value.find(a => a.id === currentPhase.value.agentId)
      if (agent) agent.completed = true
      
      if (currentPhaseIndex.value < phases.length - 1) {
        currentPhaseIndex.value++
        phaseProgress.value = 0
      } else {
        pausePlayback()
      }
    }
  }, 50 / speed.value)
}

const pausePlayback = () => {
  if (playInterval) {
    clearInterval(playInterval)
    playInterval = null
  }
}

const togglePlay = () => {
  if (isPlaying.value) {
    pausePlayback()
  } else {
    startPlayback()
  }
  isPlaying.value = !isPlaying.value
}

const reset = () => {
  pausePlayback()
  isPlaying.value = false
  currentPhaseIndex.value = 0
  phaseProgress.value = 0
  logs.value = []
  animStep.value = 0
  agents.value.forEach(a => a.completed = false)
}

onMounted(() => {
  // 自动开始
  setTimeout(() => {
    togglePlay()
  }, 1000)
})

onUnmounted(() => {
  pausePlayback()
})
</script>

<style scoped>
.training-theater {
  min-height: 100vh;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 30px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 标题 */
.theater-header {
  text-align: center;
  margin-bottom: 30px;
}

.main-title {
  font-size: 42px;
  font-weight: 800;
  background: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0 0 12px;
}

.sub-title {
  font-size: 18px;
  color: #64748b;
  margin: 0;
}

/* 主舞台 */
.stage {
  display: grid;
  grid-template-columns: 260px 1fr 300px;
  gap: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.section-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e2e8f0;
}

/* 智能体列表 */
.agents-roster {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  height: fit-content;
}

.agents-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.agent-portrait {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 12px;
  background: #f8fafc;
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

.agent-portrait.active {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.agent-portrait.completed {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #22c55e;
}

.agent-portrait.waiting {
  opacity: 0.6;
}

.avatar {
  font-size: 32px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.info {
  flex: 1;
}

.name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
}

.role {
  font-size: 13px;
  color: #64748b;
}

.status-icon {
  font-size: 20px;
}

/* 动画展示区 */
.animation-display {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.progress-track {
  height: 32px;
  background: #f1f5f9;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  margin-bottom: 24px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%);
  border-radius: 16px;
  transition: width 0.3s ease;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.phase-header {
  text-align: center;
  margin-bottom: 24px;
}

.phase-number {
  display: inline-block;
  padding: 6px 16px;
  background: #eff6ff;
  color: #3b82f6;
  font-size: 14px;
  font-weight: 700;
  border-radius: 20px;
  margin-bottom: 12px;
}

.phase-title {
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px;
}

.phase-desc {
  font-size: 16px;
  color: #64748b;
  margin: 0;
}

/* 动画画布 */
.animation-canvas {
  flex: 1;
  min-height: 350px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  margin-bottom: 24px;
}

.particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.data-particle {
  position: absolute;
  font-size: 20px;
  opacity: 0;
  transition: all 0.5s ease;
}

.data-particle.flowing {
  animation: flow 3s ease-in-out infinite;
  animation-delay: var(--delay);
  opacity: 0.6;
}

@keyframes flow {
  0% { transform: translate(0, 0); opacity: 0; }
  20% { opacity: 0.6; }
  80% { opacity: 0.6; }
  100% { transform: translate(100px, -50px); opacity: 0; }
}

.phase-visual {
  padding: 30px;
  height: 100%;
}

/* 数据清洗可视化 */
.cleaning-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 30px;
  height: 100%;
}

.raw-data-box, .clean-data-box {
  width: 200px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.box-title {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
  margin-bottom: 12px;
  text-align: center;
}

.data-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.data-item {
  padding: 8px 12px;
  background: #fef3c7;
  border-radius: 6px;
  font-size: 13px;
  font-family: monospace;
  color: #92400e;
  transition: all 0.3s ease;
}

.data-item.cleaning {
  animation: cleanFlash 0.5s ease;
}

@keyframes cleanFlash {
  0% { background: #fef3c7; }
  50% { background: #dcfce7; transform: scale(1.05); }
  100% { background: #dcfce7; }
}

.data-item.clean {
  background: #dcfce7;
  color: #166534;
}

.stats {
  font-size: 12px;
  color: #6b7280;
  text-align: center;
  margin-top: 12px;
}

.arrow {
  font-size: 32px;
  color: #3b82f6;
  font-weight: 700;
}

.processing-core {
  text-align: center;
}

.core-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.core-text {
  font-size: 14px;
  font-weight: 700;
  color: #3b82f6;
  margin-bottom: 12px;
}

.mini-progress {
  width: 120px;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.mini-progress .bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Tokenizer可视化 */
.tokenizer-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.vocab-building {
  text-align: center;
}

.vocab-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 20px;
}

.vocab-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.token-cell {
  padding: 12px 16px;
  background: #f3f4f6;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #9ca3af;
  transition: all 0.3s ease;
  min-width: 80px;
}

.token-cell.filled {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1e40af;
  transform: scale(1.05);
}

.vocab-progress {
  font-size: 16px;
  font-weight: 700;
  color: #3b82f6;
}

/* 预训练可视化 */
.pretrain-visual {
  display: flex;
  gap: 30px;
  height: 100%;
}

.model-box {
  width: 180px;
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.model-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
  text-align: center;
}

.model-layers {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 250px;
  overflow-y: auto;
}

.layer {
  padding: 4px 8px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 10px;
  color: #6b7280;
  text-align: center;
  transition: all 0.3s ease;
}

.layer.trained {
  background: linear-gradient(90deg, #dbeafe 0%, #3b82f6 100%);
  color: white;
  font-weight: 600;
}

.training-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.epoch {
  font-size: 18px;
  font-weight: 700;
  color: #3b82f6;
  text-align: center;
  padding: 12px;
  background: #eff6ff;
  border-radius: 8px;
}

.loss-chart {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.chart-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.chart-svg {
  width: 100%;
  height: 80px;
}

.chart-line {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: drawLine 2s ease forwards;
}

@keyframes drawLine {
  to { stroke-dashoffset: 0; }
}

.chart-svg circle {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chart-svg circle.show {
  opacity: 1;
}

.metrics {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.metric {
  text-align: center;
  padding: 12px 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.metric-label {
  display: block;
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
}

.metric-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #3b82f6;
}

/* SFT可视化 */
.sft-visual {
  display: flex;
  gap: 30px;
  height: 100%;
}

.instruction-flow {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.instruction-box {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  opacity: 0.5;
  transition: all 0.3s ease;
}

.instruction-box.active {
  opacity: 1;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.15);
}

.inst-header {
  font-size: 12px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 8px;
}

.inst-content {
  font-size: 14px;
}

.q {
  color: #374151;
  font-weight: 600;
  margin-bottom: 6px;
}

.a {
  color: #3b82f6;
  font-family: monospace;
  overflow: hidden;
  white-space: nowrap;
  width: 0;
}

.a.typing {
  animation: typing 2s steps(30) forwards;
}

@keyframes typing {
  to { width: 100%; }
}

.sft-progress {
  width: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.progress-ring {
  position: relative;
  width: 150px;
  height: 150px;
}

.progress-ring svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.ring-bg {
  fill: none;
  stroke: #e5e7eb;
  stroke-width: 8;
}

.ring-fill {
  fill: none;
  stroke: url(#gradient);
  stroke-width: 8;
  stroke-linecap: round;
  stroke-dasharray: 283;
  transition: stroke-dasharray 0.3s ease;
}

.ring-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 28px;
  font-weight: 800;
  color: #3b82f6;
}

.sft-stats {
  text-align: center;
  font-size: 13px;
  color: #6b7280;
  line-height: 1.8;
}

/* RLHF可视化 */
.rlhf-visual {
  display: flex;
  flex-direction: column;
  gap: 24px;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.rlhf-flow {
  display: flex;
  align-items: center;
  gap: 30px;
}

.model-a, .model-b {
  width: 200px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
}

.model-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 12px;
}

.response {
  font-size: 13px;
  color: #6b7280;
  font-family: monospace;
  padding: 12px;
  background: #f8fafc;
  border-radius: 6px;
}

.vs {
  font-size: 24px;
  font-weight: 800;
  color: #9ca3af;
}

.reward-model {
  width: 100%;
  max-width: 500px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.rm-title {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 16px;
  text-align: center;
}

.rm-scores {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.score-bar span:first-child {
  width: 60px;
  font-size: 13px;
  color: #6b7280;
}

.score-bar .bar {
  flex: 1;
  height: 20px;
  background: #f3f4f6;
  border-radius: 10px;
  overflow: hidden;
}

.score-bar .fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e, #16a34a);
  border-radius: 10px;
  transition: width 0.5s ease;
}

.score-bar .fill.old {
  background: linear-gradient(90deg, #9ca3af, #6b7280);
}

.score-bar span:last-child {
  width: 50px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  text-align: right;
}

/* 评测可视化 */
.eval-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.benchmarks {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  width: 100%;
  max-width: 500px;
}

.benchmark-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  text-align: center;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.benchmark-card.tested {
  opacity: 1;
  box-shadow: 0 4px 20px rgba(34, 197, 94, 0.2);
}

.bench-name {
  font-size: 14px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 12px;
}

.bench-score {
  font-size: 36px;
  font-weight: 800;
  color: #22c55e;
}

.bench-status {
  font-size: 14px;
  color: #9ca3af;
}

/* 部署可视化 */
.deploy-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
  height: 100%;
}

.deployment-flow {
  display: flex;
  align-items: center;
  gap: 20px;
}

.deploy-stage {
  text-align: center;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.deploy-stage.active {
  opacity: 1;
}

.stage-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.stage-name {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.deploy-arrow {
  font-size: 24px;
  color: #9ca3af;
}

.deploy-status {
  font-size: 18px;
  font-weight: 700;
  color: #22c55e;
  padding: 16px 32px;
  background: #f0fdf4;
  border-radius: 12px;
}

/* 控制按钮 */
.controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.control-btn {
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 700;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:not(.secondary) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.control-btn:not(.secondary):hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.control-btn.secondary {
  background: #f3f4f6;
  color: #374151;
}

.control-btn.secondary:hover {
  background: #e5e7eb;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 20px;
  padding-left: 20px;
  border-left: 2px solid #e5e7eb;
}

.speed-control span {
  font-size: 14px;
  color: #6b7280;
  font-weight: 600;
}

.speed-btn {
  padding: 8px 16px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s ease;
}

.speed-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

/* 日志区 */
.training-logs {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  height: fit-content;
}

.logs-container {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 500px;
  overflow-y: auto;
}

.log-entry {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
  border-left: 3px solid #e5e7eb;
  font-size: 13px;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.log-entry.success {
  border-left-color: #22c55e;
  background: #f0fdf4;
}

.log-entry.warning {
  border-left-color: #f59e0b;
  background: #fffbeb;
}

.log-entry.info {
  border-left-color: #3b82f6;
  background: #eff6ff;
}

.log-time {
  color: #9ca3af;
  font-size: 11px;
  font-family: monospace;
  min-width: 60px;
}

.log-content {
  flex: 1;
}

.log-agent {
  font-weight: 700;
  color: #3b82f6;
  margin-right: 6px;
}

.log-msg {
  color: #374151;
}

/* 响应式 */
@media (max-width: 1200px) {
  .stage {
    grid-template-columns: 1fr;
  }
  
  .agents-roster,
  .training-logs {
    display: none;
  }
}
</style>
