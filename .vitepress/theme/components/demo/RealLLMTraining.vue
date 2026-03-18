<template>
  <div class="training-terminal">
    <!-- 顶部状态栏 -->
    <header class="terminal-header">
      <div class="header-left">
        <span class="terminal-icon">🖥️</span>
        <h1>LLM Training Cluster</h1>
        <span class="cluster-status" :class="clusterState">
          {{ clusterState === 'running' ? '● RUNNING' : clusterState === 'completed' ? '✓ COMPLETED' : '⏸ PAUSED' }}
        </span>
      </div>
      <div class="header-right">
        <div class="stat">
          <span class="stat-label">GPU util</span>
          <span class="stat-value">{{ avgGpuUtil }}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">VRAM</span>
          <span class="stat-value">{{ vramUsed }} / 80 GB</span>
        </div>
        <div class="stat">
          <span class="stat-label">Throughput</span>
          <span class="stat-value">{{ throughput }} t/s</span>
        </div>
      </div>
    </header>

    <!-- 主界面 -->
    <main class="terminal-main">
      <!-- 左侧：集群状态 -->
      <aside class="cluster-panel">
        <div class="panel-title">GPU Cluster Status</div>
        <div class="gpu-grid">
          <div v-for="(gpu, i) in gpus" :key="i" class="gpu-card" :class="{ active: gpu.util > 50 }">
            <div class="gpu-header">
              <span class="gpu-name">A100-{{ i + 1 }}</span>
              <span class="gpu-temp">{{ gpu.temp }}°C</span>
            </div>
            <div class="gpu-util-bar">
              <div class="util-fill" :style="{ width: gpu.util + '%' }" :class="{ high: gpu.util > 90 }"></div>
            </div>
            <div class="gpu-info">
              <span>{{ gpu.util }}%</span>
              <span>{{ gpu.memory }}GB</span>
            </div>
          </div>
        </div>

        <div class="training-metrics">
          <div class="metric-row">
            <span>Global Step</span>
            <span class="metric-value">{{ globalStep }} / {{ totalSteps }}</span>
          </div>
          <div class="metric-row">
            <span>Epoch</span>
            <span class="metric-value">{{ currentEpoch }} / {{ totalEpochs }}</span>
          </div>
          <div class="metric-row">
            <span>Learning Rate</span>
            <span class="metric-value">{{ currentLR }}</span>
          </div>
          <div class="metric-row">
            <span>Batch Size</span>
            <span class="metric-value">{{ batchSize }} × {{ gradAccum }} steps</span>
          </div>
        </div>
      </aside>

      <!-- 中间：主要可视化 -->
      <section class="visualization-panel">
        <!-- 阶段指示器 -->
        <div class="stage-tabs">
          <div 
            v-for="(stage, i) in stages" 
            :key="stage.id"
            class="stage-tab"
            :class="{ 
              active: currentStageIndex === i,
              completed: i < currentStageIndex 
            }"
          >
            <span class="tab-num">{{ i + 1 }}</span>
            <span class="tab-name">{{ stage.shortName }}</span>
          </div>
        </div>

        <!-- 可视化区域 -->
        <div class="viz-canvas">
          <!-- 阶段1: 数据预处理 -->
          <div v-if="currentStageIndex === 0" class="stage-viz data-stage">
            <div class="data-flow">
              <div class="data-source">
                <div class="source-header">Raw Data Sources</div>
                <div class="source-list">
                  <div class="source-item" v-for="src in dataSources" :key="src.name">
                    <span class="source-icon">{{ src.icon }}</span>
                    <span class="source-name">{{ src.name }}</span>
                    <span class="source-size">{{ src.size }}</span>
                  </div>
                </div>
              </div>
              <div class="processing-pipeline">
                <div class="pipeline-title">Processing Pipeline</div>
                <div class="pipeline-steps">
                  <div 
                    v-for="(step, i) in pipelineSteps" 
                    :key="step.name"
                    class="pipe-step"
                    :class="{ 
                      active: dataProgress > (i / pipelineSteps.length * 100),
                      current: Math.floor(dataProgress / (100 / pipelineSteps.length)) === i
                    }"
                  >
                    <div class="step-icon">{{ step.icon }}</div>
                    <div class="step-name">{{ step.name }}</div>
                    <div class="step-status" v-if="dataProgress > (i / pipelineSteps.length * 100)">✓</div>
                  </div>
                </div>
              </div>
              <div class="data-output">
                <div class="output-header">Clean Dataset</div>
                <div class="output-stats">
                  <div class="stat-box">
                    <div class="stat-num">{{ cleanDocs }}</div>
                    <div class="stat-label">Documents</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-num">{{ cleanTokens }}B</div>
                    <div class="stat-label">Tokens</div>
                  </div>
                  <div class="stat-box">
                    <div class="stat-num">{{ cleanSize }}TB</div>
                    <div class="stat-label">Size</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 阶段2: Tokenizer -->
          <div v-if="currentStageIndex === 1" class="stage-viz tokenizer-stage">
            <div class="tokenizer-viz">
              <div class="vocab-stats">
                <div class="vocab-size">
                  <span class="size-label">Vocabulary Size</span>
                  <span class="size-value">{{ vocabSize.toLocaleString() }}</span>
                </div>
                <div class="bpe-progress">
                  <div class="bpe-label">BPE Merges: {{ bpeMerges }} / 32,000</div>
                  <div class="bpe-bar">
                    <div class="bpe-fill" :style="{ width: (bpeMerges / 32000 * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
              <div class="token-examples">
                <div class="example-title">Tokenization Examples</div>
                <div class="example-list">
                  <div class="token-example" v-for="(ex, i) in tokenExamples" :key="i">
                    <div class="example-text">"{{ ex.text }}"</div>
                    <div class="example-tokens">
                      <span v-for="(token, j) in ex.tokens" :key="j" class="token-tag">{{ token }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 阶段3: 预训练 -->
          <div v-if="currentStageIndex === 2" class="stage-viz pretrain-stage">
            <div class="training-viz">
              <div class="model-arch">
                <div class="arch-title">Llama-2 7B Architecture</div>
                <div class="arch-specs">
                  <div class="spec">32 Layers</div>
                  <div class="spec">32 Heads</div>
                  <div class="spec">4096 Dim</div>
                  <div class="spec">6.9B Params</div>
                </div>
                <div class="layer-stack">
                  <div 
                    v-for="n in 32" 
                    :key="n"
                    class="layer-bar"
                    :class="{ trained: currentStep > (n * totalSteps / 32) }"
                    :style="{ '--layer': n }"
                  >
                    L{{ n }}
                  </div>
                </div>
              </div>
              <div class="loss-monitor">
                <div class="monitor-title">Training Loss</div>
                <div class="loss-chart-container">
                  <canvas ref="lossCanvas" width="400" height="200"></canvas>
                </div>
                <div class="loss-stats">
                  <div class="loss-stat">
                    <span class="label">Loss</span>
                    <span class="value">{{ currentLoss.toFixed(4) }}</span>
                  </div>
                  <div class="loss-stat">
                    <span class="label">PPL</span>
                    <span class="value">{{ currentPPL.toFixed(2) }}</span>
                  </div>
                  <div class="loss-stat">
                    <span class="label">Grad Norm</span>
                    <span class="value">{{ gradNorm.toFixed(2) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 阶段4: SFT -->
          <div v-if="currentStageIndex === 3" class="stage-viz sft-stage">
            <div class="sft-viz">
              <div class="instruction-examples">
                <div class="sft-title">Supervised Fine-Tuning</div>
                <div class="chat-examples">
                  <div class="chat-sample" v-for="(sample, i) in chatSamples" :key="i" :class="{ active: sftProgress > i * 25 }">
                    <div class="sample-header">Sample {{ i + 1 }}</div>
                    <div class="message user">
                      <span class="role">User:</span>
                      <span class="content">{{ sample.user }}</span>
                    </div>
                    <div class="message assistant">
                      <span class="role">Assistant:</span>
                      <span class="content" :class="{ typing: sftProgress > i * 25 + 10 }">{{ sample.assistant }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="sft-metrics">
                <div class="sft-metric">
                  <span class="label">SFT Loss</span>
                  <span class="value">{{ sftLoss.toFixed(4) }}</span>
                </div>
                <div class="sft-metric">
                  <span class="label">Learning Rate</span>
                  <span class="value">2e-5</span>
                </div>
                <div class="sft-metric">
                  <span class="label">Samples</span>
                  <span class="value">{{ Math.floor(100000 * sftProgress / 100).toLocaleString() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 阶段5: RLHF -->
          <div v-if="currentStageIndex === 4" class="stage-viz rlhf-stage">
            <div class="rlhf-viz">
              <div class="ppo-flow">
                <div class="ppo-title">PPO Training Loop</div>
                <div class="ppo-steps">
                  <div class="ppo-step" :class="{ active: rlhfProgress > 0 }">
                    <div class="step-num">1</div>
                    <div class="step-content">
                      <div class="step-title">Generate Response</div>
                      <div class="step-detail">π_θ generates answer</div>
                    </div>
                  </div>
                  <div class="ppo-arrow">→</div>
                  <div class="ppo-step" :class="{ active: rlhfProgress > 25 }">
                    <div class="step-num">2</div>
                    <div class="step-content">
                      <div class="step-title">Reward Scoring</div>
                      <div class="step-detail">RM predicts reward</div>
                    </div>
                  </div>
                  <div class="ppo-arrow">→</div>
                  <div class="ppo-step" :class="{ active: rlhfProgress > 50 }">
                    <div class="step-num">3</div>
                    <div class="step-content">
                      <div class="step-title">Compute Advantage</div>
                      <div class="step-detail">GAE estimation</div>
                    </div>
                  </div>
                  <div class="ppo-arrow">→</div>
                  <div class="ppo-step" :class="{ active: rlhfProgress > 75 }">
                    <div class="step-num">4</div>
                    <div class="step-content">
                      <div class="step-title">Policy Update</div>
                      <div class="step-detail">Clipped objective</div>
                    </div>
                  </div>
                </div>
                <div class="rlhf-metrics">
                  <div class="rlhf-metric">
                    <span class="label">Reward</span>
                    <span class="value">{{ (2.5 + rlhfProgress / 20).toFixed(2) }}</span>
                  </div>
                  <div class="rlhf-metric">
                    <span class="label">KL Div</span>
                    <span class="value">{{ (0.02 - rlhfProgress / 5000).toFixed(4) }}</span>
                  </div>
                  <div class="rlhf-metric">
                    <span class="label">Policy Loss</span>
                    <span class="value">{{ (0.15 - rlhfProgress / 1000).toFixed(4) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 阶段6: 评测 -->
          <div v-if="currentStageIndex === 5" class="stage-viz eval-stage">
            <div class="eval-viz">
              <div class="benchmark-grid">
                <div 
                  v-for="bench in benchmarks" 
                  :key="bench.name"
                  class="benchmark-card"
                  :class="{ 
                    testing: evalProgress >= bench.start && evalProgress < bench.end,
                    done: evalProgress >= bench.end 
                  }"
                >
                  <div class="bench-name">{{ bench.name }}</div>
                  <div class="bench-score" v-if="evalProgress >= bench.end">
                    {{ bench.score }}%
                  </div>
                  <div class="bench-testing" v-else-if="evalProgress >= bench.start">
                    <span class="testing-spinner">◐</span>
                    Testing...
                  </div>
                  <div class="bench-pending" v-else>Pending</div>
                  <div class="bench-bar" v-if="evalProgress >= bench.start">
                    <div class="bench-fill" :style="{ width: Math.min(100, (evalProgress - bench.start) / (bench.end - bench.start) * 100) + '%' }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 阶段7: 部署 -->
          <div v-if="currentStageIndex === 6" class="stage-viz deploy-stage">
            <div class="deploy-viz">
              <div class="deploy-flow">
                <div 
                  v-for="(step, i) in deploySteps" 
                  :key="step.name"
                  class="deploy-node"
                  :class="{ active: deployProgress > i * (100 / deploySteps.length) }"
                >
                  <div class="node-icon">{{ step.icon }}</div>
                  <div class="node-name">{{ step.name }}</div>
                  <div class="node-status">
                    {{ deployProgress > (i + 1) * (100 / deploySteps.length) ? '✓' : deployProgress > i * (100 / deploySteps.length) ? '...' : '○' }}
                  </div>
                </div>
              </div>
              <div class="deploy-details" v-if="deployProgress > 0">
                <div class="detail-line" v-for="(line, i) in deployLogs" :key="i" v-show="deployProgress > i * 15">
                  {{ line }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 控制栏 -->
        <div class="control-bar">
          <button class="ctrl-btn" @click="togglePlay">
            {{ isPlaying ? '⏸ PAUSE' : '▶ RESUME' }}
          </button>
          <button class="ctrl-btn secondary" @click="reset">↺ RESTART</button>
          <div class="speed-selector">
            <span>SPEED:</span>
            <button 
              v-for="s in [1, 5, 10]" 
              :key="s"
              :class="['speed-btn', { active: speed === s }]"
              @click="speed = s"
            >{{ s }}x</button>
          </div>
          <div class="progress-display">
            <span>OVERALL: {{ Math.floor(overallProgress) }}%</span>
          </div>
        </div>
      </section>

      <!-- 右侧：终端日志 -->
      <aside class="terminal-logs">
        <div class="logs-header">
          <span class="header-title">📋 Training Logs</span>
          <button class="clear-btn" @click="clearLogs">Clear</button>
        </div>
        <div class="logs-content" ref="logsContainer">
          <div 
            v-for="(log, i) in logs" 
            :key="i"
            class="log-line"
            :class="log.type"
          >
            <span class="timestamp">[{{ log.time }}]</span>
            <span class="level" :class="log.level">{{ log.level }}</span>
            <span class="message">{{ log.message }}</span>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

// ============ 配置 ============
const stages = [
  { id: 'data', shortName: 'Data', name: 'Data Preprocessing' },
  { id: 'tokenizer', shortName: 'Tokenizer', name: 'Tokenizer Training' },
  { id: 'pretrain', shortName: 'Pretrain', name: 'Pre-training' },
  { id: 'sft', shortName: 'SFT', name: 'Supervised Fine-tuning' },
  { id: 'rlhf', shortName: 'RLHF', name: 'RLHF Alignment' },
  { id: 'eval', shortName: 'Eval', name: 'Evaluation' },
  { id: 'deploy', shortName: 'Deploy', name: 'Deployment' },
]

const totalSteps = 10000
const totalEpochs = 3

// ============ 状态 ============
const currentStageIndex = ref(0)
const stageProgress = ref(0)
const isPlaying = ref(false)
const speed = ref(1)
const logs = ref([])

// GPU状态
const gpus = ref(Array(8).fill(null).map((_, i) => ({
  util: 0,
  temp: 35 + i * 2,
  memory: 0
})))

// 训练指标
const globalStep = ref(0)
const currentEpoch = ref(1)
const currentLR = ref('1.0e-4')
const batchSize = ref(4)
const gradAccum = ref(8)
const currentLoss = ref(4.0)
const currentPPL = ref(54.6)
const gradNorm = ref(1.0)
const throughput = ref(0)

// 各阶段具体状态
const dataProgress = computed(() => currentStageIndex.value === 0 ? stageProgress.value : (currentStageIndex.value > 0 ? 100 : 0))
const dataSources = ref([
  { name: 'Common Crawl', icon: '🌐', size: '5.2 TB' },
  { name: 'GitHub Code', icon: '💻', size: '1.8 TB' },
  { name: 'Wikipedia', icon: '📚', size: '0.1 TB' },
  { name: 'Books', icon: '📖', size: '1.4 TB' },
])
const pipelineSteps = [
  { name: 'Deduplication', icon: '🔄' },
  { name: 'Quality Filter', icon: '⚡' },
  { name: 'Content Filter', icon: '🛡️' },
  { name: 'Tokenization', icon: '🔤' },
  { name: 'Shuffling', icon: '🔀' },
]
const cleanDocs = computed(() => Math.floor(850000000 * (dataProgress.value / 100)).toLocaleString())
const cleanTokens = computed(() => Math.floor(1500 * (dataProgress.value / 100)))
const cleanSize = computed(() => (4.2 * (dataProgress.value / 100)).toFixed(1))

// Tokenizer
const vocabSize = computed(() => Math.floor(32000 * (currentStageIndex.value === 1 ? stageProgress.value / 100 : (currentStageIndex.value > 1 ? 100 : 0))))
const bpeMerges = computed(() => Math.floor(32000 * (currentStageIndex.value === 1 ? stageProgress.value / 100 : (currentStageIndex.value > 1 ? 100 : 0))))
const tokenExamples = ref([
  { text: 'Artificial Intelligence', tokens: ['Art', 'ificial', ' Intelligence'] },
  { text: 'Machine Learning', tokens: ['Machine', ' Learning'] },
  { text: 'Deep Neural Networks', tokens: ['Deep', ' Neural', ' Networks'] },
])

// SFT
const sftProgress = computed(() => currentStageIndex.value === 3 ? stageProgress.value : 0)
const sftLoss = ref(1.5)
const chatSamples = ref([
  { user: 'What is machine learning?', assistant: 'Machine learning is a subset of AI...' },
  { user: 'Write a Python function to sort a list', assistant: 'Here\'s a Python function using quicksort...' },
  { user: 'Explain quantum computing', assistant: 'Quantum computing uses quantum mechanics...' },
  { user: 'Translate "Hello" to Chinese', assistant: '"Hello" in Chinese is "你好" (nǐ hǎo)...' },
])

// RLHF
const rlhfProgress = computed(() => currentStageIndex.value === 4 ? stageProgress.value : 0)

// Eval
const evalProgress = computed(() => currentStageIndex.value === 5 ? stageProgress.value : 0)
const benchmarks = ref([
  { name: 'MMLU', score: 63.2, start: 0, end: 20 },
  { name: 'GSM8K', score: 47.5, start: 15, end: 35 },
  { name: 'HumanEval', score: 31.8, start: 30, end: 50 },
  { name: 'C-Eval', score: 59.4, start: 45, end: 65 },
  { name: 'CMMLU', score: 61.7, start: 60, end: 80 },
  { name: 'BBH', score: 45.3, start: 75, end: 100 },
])

// Deploy
const deployProgress = computed(() => currentStageIndex.value === 6 ? stageProgress.value : 0)
const deploySteps = [
  { name: 'Export', icon: '📦' },
  { name: 'Quantize', icon: '🗜️' },
  { name: 'Optimize', icon: '⚡' },
  { name: 'Deploy', icon: '🚀' },
  { name: 'Verify', icon: '✓' },
]
const deployLogs = ref([
  'Loading checkpoint from step 10000...',
  'Merging LoRA weights...',
  'Converting to HuggingFace format...',
  'Applying GPTQ 4-bit quantization...',
  'Building TensorRT engine...',
  'Starting vLLM server on port 8000...',
  'Health check passed. Model ready!',
])

// ============ 计算属性 ============
const clusterState = computed(() => {
  if (currentStageIndex.value >= stages.length - 1 && stageProgress.value >= 100) return 'completed'
  return isPlaying.value ? 'running' : 'paused'
})

const overallProgress = computed(() => {
  return (currentStageIndex.value / stages.length * 100) + (stageProgress.value / stages.length)
})

const avgGpuUtil = computed(() => {
  return Math.floor(gpus.value.reduce((a, b) => a + b.util, 0) / 8)
})

const vramUsed = computed(() => {
  return (gpus.value.reduce((a, b) => a + b.memory, 0) / 8).toFixed(1)
})

const currentStep = computed(() => {
  return Math.floor(globalStep.value)
})

// ============ 方法 ============
let playInterval = null
let lossCanvas = null
let lossCtx = null
const lossData = []

const initLossChart = () => {
  lossCanvas = document.querySelector('canvas')
  if (lossCanvas) {
    lossCtx = lossCanvas.getContext('2d')
    // 设置高DPI
    const dpr = window.devicePixelRatio || 1
    lossCanvas.width = 400 * dpr
    lossCanvas.height = 200 * dpr
    lossCtx.scale(dpr, dpr)
  }
}

const drawLossChart = () => {
  if (!lossCtx || currentStageIndex.value !== 2) return
  
  const w = 400
  const h = 200
  const padding = 30
  
  lossCtx.clearRect(0, 0, w, h)
  
  // 网格
  lossCtx.strokeStyle = '#e5e7eb'
  lossCtx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding + (h - 2 * padding) * i / 4
    lossCtx.beginPath()
    lossCtx.moveTo(padding, y)
    lossCtx.lineTo(w - padding, y)
    lossCtx.stroke()
  }
  
  // 绘制loss曲线
  if (lossData.length > 1) {
    lossCtx.strokeStyle = '#3b82f6'
    lossCtx.lineWidth = 2
    lossCtx.beginPath()
    
    lossData.forEach((point, i) => {
      const x = padding + (w - 2 * padding) * i / (totalSteps / 100)
      const y = padding + (h - 2 * padding) * (point / 5)
      if (i === 0) lossCtx.moveTo(x, y)
      else lossCtx.lineTo(x, y)
    })
    lossCtx.stroke()
  }
}

const addLog = (message, level = 'INFO', type = '') => {
  const now = new Date()
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  logs.value.push({ time, level, message, type })
  if (logs.value.length > 100) logs.value.shift()
  
  nextTick(() => {
    const container = document.querySelector('.logs-content')
    if (container) container.scrollTop = container.scrollHeight
  })
}

const updateStage = () => {
  if (!isPlaying.value) return
  
  const stageDuration = 100 // 每个阶段100个tick
  stageProgress.value += 0.5 * speed.value
  
  if (stageProgress.value >= 100) {
    stageProgress.value = 0
    currentStageIndex.value++
    if (currentStageIndex.value >= stages.length) {
      currentStageIndex.value = 0
      isPlaying.value = false
      addLog('Training pipeline completed!', 'SUCCESS', 'success')
      return
    }
    addLog(`Entering stage: ${stages[currentStageIndex.value].name}`, 'INFO', 'info')
  }
  
  // 更新GPU
  gpus.value.forEach((gpu, i) => {
    if (currentStageIndex.value === 2 || currentStageIndex.value === 3 || currentStageIndex.value === 4) {
      gpu.util = Math.min(99, 80 + Math.sin(Date.now() / 1000 + i) * 15 + Math.random() * 5)
      gpu.memory = (70 + Math.random() * 8).toFixed(1)
      gpu.temp = Math.floor(65 + Math.random() * 15)
    } else {
      gpu.util = Math.max(0, gpu.util - 2)
      gpu.memory = Math.max(0, gpu.memory - 1)
      gpu.temp = Math.max(40, gpu.temp - 1)
    }
  })
  
  // 更新训练指标
  if (currentStageIndex.value === 2) {
    globalStep.value = Math.floor(totalSteps * (stageProgress.value / 100))
    currentEpoch.value = Math.floor(globalStep.value / (totalSteps / totalEpochs)) + 1
    currentLoss.value = 4.0 * Math.exp(-globalStep.value / totalSteps * 1.5) + 0.5 + Math.random() * 0.1
    currentPPL.value = Math.exp(currentLoss.value)
    gradNorm.value = 1.0 + Math.sin(globalStep.value / 100) * 0.3
    throughput.value = Math.floor(25000 + Math.sin(globalStep.value / 500) * 3000)
    lossData.push(currentLoss.value)
    drawLossChart()
    
    if (globalStep.value % 100 === 0) {
      addLog(`Step ${globalStep.value}: loss=${currentLoss.value.toFixed(4)}, lr=${currentLR.value}`, 'INFO')
    }
  }
  
  if (currentStageIndex.value === 3) {
    sftLoss.value = 1.5 * Math.exp(-stageProgress.value / 100 * 2) + 0.3
    if (Math.random() > 0.9) {
      addLog(`SFT batch processed, loss=${sftLoss.value.toFixed(4)}`, 'INFO')
    }
  }
  
  if (currentStageIndex.value === 5) {
    const currentBench = benchmarks.value.find(b => stageProgress.value >= b.start && stageProgress.value < b.end)
    if (currentBench && Math.random() > 0.95) {
      addLog(`Evaluating on ${currentBench.name}...`, 'INFO')
    }
  }
}

const togglePlay = () => {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    addLog('Resuming training pipeline...', 'INFO', 'info')
  } else {
    addLog('Training paused', 'WARNING', 'warning')
  }
}

const reset = () => {
  isPlaying.value = false
  currentStageIndex.value = 0
  stageProgress.value = 0
  globalStep.value = 0
  currentEpoch.value = 1
  currentLoss.value = 4.0
  lossData.length = 0
  logs.value = []
  gpus.value.forEach(g => { g.util = 0; g.memory = 0; g.temp = 40 })
  addLog('Training pipeline reset', 'INFO', 'info')
  addLog('Waiting to start...', 'INFO', 'info')
}

const clearLogs = () => {
  logs.value = []
}

// ============ 生命周期 ============
onMounted(() => {
  addLog('LLM Training Cluster initialized', 'INFO', 'info')
  addLog('8x NVIDIA A100 80GB detected', 'SUCCESS', 'success')
  addLog('Waiting to start...', 'INFO', 'info')
  
  setTimeout(() => {
    initLossChart()
  }, 100)
  
  playInterval = setInterval(updateStage, 100)
  
  // 自动开始
  setTimeout(() => {
    isPlaying.value = true
    addLog('Starting training pipeline...', 'SUCCESS', 'success')
  }, 1500)
})

onUnmounted(() => {
  if (playInterval) clearInterval(playInterval)
})
</script>

<style scoped>
.training-terminal {
  min-height: 100vh;
  background: #0f172a;
  color: #e2e8f0;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  display: flex;
  flex-direction: column;
  overflow-x: auto;
}

/* 头部 */
.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #1e293b;
  border-bottom: 1px solid #334155;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.terminal-icon {
  font-size: 24px;
}

.terminal-header h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #f8fafc;
}

.cluster-status {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.cluster-status.running {
  background: #dcfce7;
  color: #166534;
}

.cluster-status.paused {
  background: #fef3c7;
  color: #92400e;
}

.cluster-status.completed {
  background: #dbeafe;
  color: #1e40af;
}

.header-right {
  display: flex;
  gap: 24px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  text-transform: uppercase;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #38bdf8;
}

/* 主界面 */
.terminal-main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 350px;
  gap: 1px;
  background: #334155;
}

/* 面板通用样式 */
.cluster-panel,
.visualization-panel,
.terminal-logs {
  background: #0f172a;
  padding: 20px;
}

.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* GPU网格 */
.gpu-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 24px;
}

.gpu-card {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 12px;
  transition: all 0.3s ease;
}

.gpu-card.active {
  border-color: #3b82f6;
  box-shadow: 0 0 0 1px #3b82f6;
}

.gpu-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.gpu-name {
  font-size: 12px;
  font-weight: 700;
  color: #f8fafc;
}

.gpu-temp {
  font-size: 11px;
  color: #fbbf24;
}

.gpu-util-bar {
  height: 6px;
  background: #334155;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}

.util-fill {
  height: 100%;
  background: #22c55e;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.util-fill.high {
  background: #ef4444;
}

.gpu-info {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #64748b;
}

/* 训练指标 */
.training-metrics {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #334155;
  font-size: 13px;
}

.metric-row:last-child {
  border-bottom: none;
}

.metric-value {
  font-weight: 700;
  color: #38bdf8;
}

/* 可视化面板 */
.stage-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: #1e293b;
  padding: 4px;
  border-radius: 8px;
}

.stage-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 4px;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.stage-tab.active {
  background: #3b82f6;
  opacity: 1;
}

.stage-tab.completed {
  opacity: 1;
  background: #15803d;
}

.tab-num {
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 2px;
}

.tab-name {
  font-size: 10px;
}

/* 可视化画布 */
.viz-canvas {
  background: #1e293b;
  border-radius: 12px;
  padding: 24px;
  min-height: 400px;
  margin-bottom: 20px;
}

.stage-viz {
  height: 100%;
}

/* 数据阶段 */
.data-flow {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 20px;
  height: 100%;
}

.data-source,
.processing-pipeline,
.data-output {
  background: #0f172a;
  border-radius: 8px;
  padding: 16px;
}

.source-header,
.pipeline-title,
.output-header {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.source-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: #1e293b;
  border-radius: 6px;
  font-size: 13px;
}

.source-icon {
  font-size: 16px;
}

.source-name {
  flex: 1;
}

.source-size {
  color: #64748b;
  font-size: 11px;
}

.pipeline-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pipe-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #1e293b;
  border-radius: 6px;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.pipe-step.active {
  opacity: 1;
  background: #14532d;
}

.pipe-step.current {
  opacity: 1;
  background: #1e3a8a;
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }
}

.step-icon {
  font-size: 18px;
}

.step-name {
  flex: 1;
  font-size: 13px;
}

.step-status {
  color: #22c55e;
  font-weight: 700;
}

.output-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-box {
  background: #1e293b;
  border-radius: 6px;
  padding: 16px;
  text-align: center;
}

.stat-num {
  font-size: 24px;
  font-weight: 800;
  color: #38bdf8;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
  margin-top: 4px;
}

/* Tokenizer阶段 */
.tokenizer-viz {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.vocab-stats {
  display: flex;
  gap: 24px;
  align-items: center;
}

.vocab-size {
  background: #0f172a;
  padding: 20px 40px;
  border-radius: 8px;
  text-align: center;
}

.size-label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.size-value {
  display: block;
  font-size: 32px;
  font-weight: 800;
  color: #38bdf8;
}

.bpe-progress {
  flex: 1;
}

.bpe-label {
  font-size: 13px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.bpe-bar {
  height: 12px;
  background: #334155;
  border-radius: 6px;
  overflow: hidden;
}

.bpe-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.token-examples {
  background: #0f172a;
  border-radius: 8px;
  padding: 20px;
}

.example-title {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 16px;
}

.example-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.token-example {
  background: #1e293b;
  padding: 16px;
  border-radius: 6px;
}

.example-text {
  font-size: 14px;
  color: #e2e8f0;
  margin-bottom: 8px;
}

.example-tokens {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.token-tag {
  padding: 4px 10px;
  background: #3b82f6;
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

/* 预训练阶段 */
.training-viz {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 24px;
}

.model-arch {
  background: #0f172a;
  border-radius: 8px;
  padding: 16px;
}

.arch-title {
  font-size: 14px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 8px;
}

.arch-specs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.spec {
  padding: 4px 10px;
  background: #1e293b;
  border-radius: 4px;
  font-size: 11px;
  color: #38bdf8;
}

.layer-stack {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.layer-bar {
  padding: 3px 8px;
  background: #334155;
  border-radius: 3px;
  font-size: 9px;
  color: #64748b;
  text-align: center;
  transition: all 0.3s ease;
}

.layer-bar.trained {
  background: #15803d;
  color: white;
}

.loss-monitor {
  background: #0f172a;
  border-radius: 8px;
  padding: 16px;
}

.monitor-title {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 12px;
}

.loss-chart-container {
  background: #1e293b;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.loss-chart-container canvas {
  width: 100%;
  height: 150px;
}

.loss-stats {
  display: flex;
  gap: 16px;
}

.loss-stat {
  flex: 1;
  text-align: center;
  padding: 12px;
  background: #1e293b;
  border-radius: 6px;
}

.loss-stat .label {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.loss-stat .value {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: #38bdf8;
}

/* SFT阶段 */
.sft-viz {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.instruction-examples {
  background: #0f172a;
  border-radius: 8px;
  padding: 20px;
}

.sft-title {
  font-size: 16px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 16px;
}

.chat-examples {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-sample {
  background: #1e293b;
  border-radius: 6px;
  padding: 12px;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.chat-sample.active {
  opacity: 1;
}

.sample-header {
  font-size: 11px;
  color: #64748b;
  margin-bottom: 8px;
}

.message {
  margin-bottom: 8px;
  font-size: 13px;
}

.message .role {
  font-weight: 700;
  color: #38bdf8;
  margin-right: 8px;
}

.message.assistant .role {
  color: #22c55e;
}

.message .content {
  color: #e2e8f0;
}

.message .content.typing {
  border-right: 2px solid #22c55e;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% { border-color: transparent; }
}

.sft-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sft-metric {
  background: #1e293b;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.sft-metric .label {
  display: block;
  font-size: 12px;
  color: #64748b;
  margin-bottom: 8px;
}

.sft-metric .value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: #38bdf8;
}

/* RLHF阶段 */
.rlhf-viz {
  height: 100%;
}

.ppo-flow {
  background: #0f172a;
  border-radius: 8px;
  padding: 24px;
}

.ppo-title {
  font-size: 16px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 20px;
}

.ppo-steps {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.ppo-step {
  flex: 1;
  background: #1e293b;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.ppo-step.active {
  opacity: 1;
  background: #1e3a8a;
}

.step-num {
  width: 28px;
  height: 28px;
  background: #334155;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin: 0 auto 8px;
}

.ppo-step.active .step-num {
  background: #3b82f6;
}

.step-title {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 4px;
}

.step-detail {
  font-size: 11px;
  color: #64748b;
}

.ppo-arrow {
  color: #64748b;
  font-size: 20px;
}

.rlhf-metrics {
  display: flex;
  gap: 16px;
  justify-content: center;
}

.rlhf-metric {
  background: #1e293b;
  border-radius: 8px;
  padding: 16px 32px;
  text-align: center;
}

.rlhf-metric .label {
  display: block;
  font-size: 11px;
  color: #64748b;
  margin-bottom: 4px;
}

.rlhf-metric .value {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: #38bdf8;
}

/* Eval阶段 */
.benchmark-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.benchmark-card {
  background: #0f172a;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  opacity: 0.5;
  transition: all 0.3s ease;
}

.benchmark-card.testing {
  opacity: 1;
  background: #1e3a8a;
  animation: pulse 2s ease-in-out infinite;
}

.benchmark-card.done {
  opacity: 1;
  background: #14532d;
}

.bench-name {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
  margin-bottom: 12px;
}

.bench-score {
  font-size: 32px;
  font-weight: 800;
  color: #22c55e;
}

.bench-testing {
  font-size: 14px;
  color: #38bdf8;
}

.testing-spinner {
  animation: spin 2s linear infinite;
  display: inline-block;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.bench-pending {
  font-size: 14px;
  color: #64748b;
}

.bench-bar {
  height: 4px;
  background: #334155;
  border-radius: 2px;
  overflow: hidden;
  margin-top: 12px;
}

.bench-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.3s ease;
}

/* Deploy阶段 */
.deploy-viz {
  height: 100%;
}

.deploy-flow {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-bottom: 32px;
}

.deploy-node {
  text-align: center;
  opacity: 0.3;
  transition: all 0.3s ease;
}

.deploy-node.active {
  opacity: 1;
}

.node-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.node-name {
  font-size: 13px;
  font-weight: 700;
  color: #f8fafc;
  margin-bottom: 8px;
}

.node-status {
  font-size: 20px;
  font-weight: 700;
}

.deploy-details {
  background: #0f172a;
  border-radius: 8px;
  padding: 16px;
  font-size: 13px;
}

.detail-line {
  padding: 8px 0;
  border-bottom: 1px solid #1e293b;
  color: #94a3b8;
}

.detail-line:last-child {
  border-bottom: none;
  color: #22c55e;
  font-weight: 700;
}

/* 控制栏 */
.control-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #1e293b;
  border-radius: 8px;
}

.ctrl-btn {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.ctrl-btn:hover {
  background: #2563eb;
}

.ctrl-btn.secondary {
  background: #334155;
}

.ctrl-btn.secondary:hover {
  background: #475569;
}

.speed-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.speed-selector span {
  font-size: 12px;
  color: #64748b;
}

.speed-btn {
  padding: 6px 12px;
  background: #0f172a;
  border: 1px solid #334155;
  color: #64748b;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.speed-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.progress-display {
  font-size: 14px;
  font-weight: 700;
  color: #38bdf8;
}

/* 终端日志 */
.terminal-logs {
  display: flex;
  flex-direction: column;
}

.logs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-title {
  font-size: 14px;
  font-weight: 700;
  color: #94a3b8;
}

.clear-btn {
  padding: 6px 12px;
  background: transparent;
  border: 1px solid #334155;
  color: #64748b;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
}

.clear-btn:hover {
  border-color: #ef4444;
  color: #ef4444;
}

.logs-content {
  flex: 1;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.6;
}

.log-line {
  padding: 6px 0;
  border-bottom: 1px solid #1e293b;
}

.timestamp {
  color: #64748b;
  margin-right: 8px;
}

.level {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
  font-weight: 700;
  margin-right: 8px;
}

.level.INFO {
  background: #1e3a8a;
  color: #60a5fa;
}

.level.SUCCESS {
  background: #14532d;
  color: #4ade80;
}

.level.WARNING {
  background: #713f12;
  color: #facc15;
}

.level.ERROR {
  background: #7f1d1d;
  color: #f87171;
}

.message {
  color: #e2e8f0;
}

/* 响应式 */
@media (max-width: 1400px) {
  .terminal-main {
    grid-template-columns: 1fr;
  }
  
  .cluster-panel,
  .terminal-logs {
    display: none;
  }
}
</style>
