<!--
  ModelSelector - 模型选择器组件 (液态玻璃风格)
  
  功能：
  - 选择 LLM 模型
  - 配置温度、最大 token 等参数
  - 液态玻璃视觉效果
-->
<template>
  <div class="model-selector-liquid">
    <!-- 模型选择卡片 -->
    <div class="model-grid">
      <label
        v-for="model in models"
        :key="model.id"
        class="model-card"
        :class="{ active: selectedModel === model.id }"
      >
        <input
          type="radio"
          :value="model.id"
          v-model="selectedModel"
          @change="onModelChange"
        />
        <div class="model-liquid-bg" />
        <div class="model-glow" :class="model.tier" />
        
        <div class="model-content">
          <div class="model-header">
            <span class="model-icon">{{ model.icon }}</span>
            <div class="model-badges">
              <span v-if="model.isNew" class="badge new">NEW</span>
              <span v-if="model.isRecommended" class="badge recommended">推荐</span>
            </div>
          </div>
          
          <h4 class="model-name">{{ model.name }}</h4>
          <p class="model-desc">{{ model.description }}</p>
          
          <div class="model-specs">
            <div class="spec-item">
              <span class="spec-icon">📊</span>
              <span class="spec-value">{{ model.contextWindow.toLocaleString() }}</span>
              <span class="spec-label">上下文</span>
            </div>
            <div class="spec-item">
              <span class="spec-icon">💰</span>
              <span class="spec-value">{{ model.pricing }}</span>
              <span class="spec-label">价格</span>
            </div>
          </div>
        </div>
        
        <div class="model-shine" />
        <div class="model-ripple" />
      </label>
    </div>

    <!-- 高级参数配置 -->
    <div class="advanced-params">
      <div class="params-header" @click="showAdvanced = !showAdvanced">
        <span class="header-icon">⚙️</span>
        <span class="header-text">高级参数</span>
        <span class="header-arrow" :class="{ open: showAdvanced }">›</span>
      </div>
      
      <Transition name="params-expand">
        <div v-show="showAdvanced" class="params-content">
          <div class="param-grid">
            <!-- Temperature -->
            <div class="param-item">
              <div class="param-label">
                <span>Temperature</span>
                <span class="param-value-display">{{ params.temperature }}</span>
              </div>
              <input
                v-model.number="params.temperature"
                type="range"
                min="0"
                max="2"
                step="0.1"
                class="liquid-slider"
                @input="onParamChange"
              />
              <div class="param-hints">
                <span>精确</span>
                <span>平衡</span>
                <span>创意</span>
              </div>
            </div>

            <!-- Max Tokens -->
            <div class="param-item">
              <div class="param-label">
                <span>Max Tokens</span>
                <span class="param-value-display">{{ params.maxTokens }}</span>
              </div>
              <input
                v-model.number="params.maxTokens"
                type="range"
                min="256"
                max="8192"
                step="256"
                class="liquid-slider tokens"
                @input="onParamChange"
              />
              <div class="param-hints">
                <span>短</span>
                <span>中</span>
                <span>长</span>
              </div>
            </div>

            <!-- Top P -->
            <div class="param-item">
              <div class="param-label">
                <span>Top P</span>
                <span class="param-value-display">{{ params.topP }}</span>
              </div>
              <input
                v-model.number="params.topP"
                type="range"
                min="0"
                max="1"
                step="0.05"
                class="liquid-slider"
                @input="onParamChange"
              />
            </div>

            <!-- Frequency Penalty -->
            <div class="param-item">
              <div class="param-label">
                <span>Frequency Penalty</span>
                <span class="param-value-display">{{ params.frequencyPenalty }}</span>
              </div>
              <input
                v-model.number="params.frequencyPenalty"
                type="range"
                min="-2"
                max="2"
                step="0.1"
                class="liquid-slider"
                @input="onParamChange"
              />
            </div>
          </div>

          <!-- 参数预设 -->
          <div class="preset-section">
            <span class="preset-label">快速预设：</span>
            <button
              v-for="preset in paramPresets"
              :key="preset.name"
              class="preset-chip"
              @click="applyPreset(preset)"
            >
              {{ preset.name }}
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 底部信息 -->
    <div class="model-footer">
      <div class="footer-info">
        <span class="info-icon">💡</span>
        <span class="info-text">{{ currentModelInfo }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'

interface ModelConfig {
  id: string
  name: string
  icon: string
  description: string
  contextWindow: number
  pricing: string
  tier: 'free' | 'standard' | 'premium'
  isNew?: boolean
  isRecommended?: boolean
}

interface ModelParams {
  temperature: number
  maxTokens: number
  topP: number
  frequencyPenalty: number
}

const props = defineProps<{
  modelId?: string
  initialParams?: Partial<ModelParams>
}>()

const emit = defineEmits<{
  change: [modelId: string, params: ModelParams]
}>()

// 可用模型列表
const models: ModelConfig[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    icon: '🐋',
    description: 'DeepSeek 通用对话模型，平衡性能与成本',
    contextWindow: 64000,
    pricing: '低',
    tier: 'standard',
    isRecommended: true
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    icon: '🧠',
    description: '深度推理模型，适合复杂问题求解',
    contextWindow: 64000,
    pricing: '中',
    tier: 'premium'
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    icon: '🎯',
    description: 'OpenAI 多模态旗舰模型',
    contextWindow: 128000,
    pricing: '高',
    tier: 'premium',
    isNew: true
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    icon: '⚡',
    description: 'OpenAI 轻量快速模型',
    contextWindow: 128000,
    pricing: '低',
    tier: 'standard'
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    icon: '🎭',
    description: 'Anthropic 高智能模型，擅长长文本',
    contextWindow: 200000,
    pricing: '中',
    tier: 'premium'
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    icon: '🍃',
    description: 'Anthropic 快速响应模型',
    contextWindow: 200000,
    pricing: '低',
    tier: 'standard'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    icon: '💎',
    description: 'Google 多模态专业模型',
    contextWindow: 1000000,
    pricing: '中',
    tier: 'standard'
  },
  {
    id: 'local-llm',
    name: '本地模型',
    icon: '🏠',
    description: '连接到本地部署的开源模型',
    contextWindow: 32768,
    pricing: '免费',
    tier: 'free'
  }
]

// 参数预设
const paramPresets = [
  {
    name: '精确回答',
    params: { temperature: 0.2, maxTokens: 1024, topP: 0.9, frequencyPenalty: 0 }
  },
  {
    name: '平衡模式',
    params: { temperature: 0.7, maxTokens: 2048, topP: 0.95, frequencyPenalty: 0 }
  },
  {
    name: '创意模式',
    params: { temperature: 1.2, maxTokens: 4096, topP: 0.99, frequencyPenalty: 0.5 }
  },
  {
    name: '代码生成',
    params: { temperature: 0.3, maxTokens: 4096, topP: 0.95, frequencyPenalty: 0.1 }
  },
  {
    name: '长文总结',
    params: { temperature: 0.5, maxTokens: 8192, topP: 0.9, frequencyPenalty: 0.2 }
  }
]

// 状态
const selectedModel = ref(props.modelId || 'deepseek-chat')
const showAdvanced = ref(false)

const params = reactive<ModelParams>({
  temperature: props.initialParams?.temperature ?? 0.7,
  maxTokens: props.initialParams?.maxTokens ?? 2048,
  topP: props.initialParams?.topP ?? 0.95,
  frequencyPenalty: props.initialParams?.frequencyPenalty ?? 0
})

// 计算属性
const currentModelInfo = computed(() => {
  const model = models.find(m => m.id === selectedModel.value)
  if (!model) return ''
  return `${model.name} · ${model.contextWindow.toLocaleString()} tokens 上下文`
})

// 方法
function onModelChange() {
  emit('change', selectedModel.value, { ...params })
}

function onParamChange() {
  emit('change', selectedModel.value, { ...params })
}

function applyPreset(preset: typeof paramPresets[0]) {
  Object.assign(params, preset.params)
  emit('change', selectedModel.value, { ...params })
}

// 监听初始值变化
watch(() => props.modelId, (newId) => {
  if (newId) selectedModel.value = newId
})

watch(() => props.initialParams, (newParams) => {
  if (newParams) {
    Object.assign(params, newParams)
  }
}, { deep: true })
</script>

<style scoped>
/* ===== 液态玻璃容器 ===== */
.model-selector-liquid {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ===== 模型卡片网格 ===== */
.model-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.model-card {
  position: relative;
  display: flex;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.model-card:hover {
  transform: translateY(-3px) scale(1.01);
  box-shadow: 
    0 16px 32px rgba(59, 130, 246, 0.12),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.model-card.active {
  background: linear-gradient(145deg, 
    rgba(59, 130, 246, 0.08) 0%, 
    rgba(139, 92, 246, 0.04) 100%
  );
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 
    0 0 30px rgba(59, 130, 246, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.model-liquid-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at 50% 120%,
    rgba(59, 130, 246, 0.08) 0%,
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.4s ease;
}

.model-card:hover .model-liquid-bg,
.model-card.active .model-liquid-bg {
  opacity: 1;
}

.model-glow {
  position: absolute;
  top: -50%;
  right: -50%;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.4s ease;
  filter: blur(30px);
  pointer-events: none;
}

.model-glow.free {
  background: radial-gradient(circle, rgba(34, 197, 94, 0.3), transparent 60%);
}

.model-glow.standard {
  background: radial-gradient(circle, rgba(59, 130, 246, 0.25), transparent 60%);
}

.model-glow.premium {
  background: radial-gradient(circle, rgba(139, 92, 246, 0.25), transparent 60%);
}

.model-card.active .model-glow {
  opacity: 1;
}

.model-content {
  position: relative;
  z-index: 1;
  width: 100%;
}

.model-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.model-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.8));
  border-radius: 12px;
  font-size: 20px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
  transition: all 0.3s ease;
}

.model-card.active .model-icon {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.model-badges {
  display: flex;
  gap: 4px;
}

.badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
}

.badge.new {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
}

.badge.recommended {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.model-name {
  margin: 0 0 4px 0;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.model-desc {
  margin: 0 0 12px 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.model-specs {
  display: flex;
  gap: 12px;
}

.spec-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
}

.spec-icon {
  font-size: 12px;
}

.spec-value {
  font-weight: 600;
  color: #475569;
}

.spec-label {
  color: #94a3b8;
}

.model-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.5) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.model-card:hover .model-shine {
  transform: translateX(100%);
}

.model-ripple {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle at var(--x, 50%) var(--y, 50%),
    rgba(59, 130, 246, 0.15) 0%,
    transparent 50%
  );
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.model-card:hover .model-ripple {
  opacity: 1;
}

.model-card input {
  position: absolute;
  opacity: 0;
}

/* ===== 高级参数区域 ===== */
.advanced-params {
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  overflow: hidden;
}

.params-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.params-header:hover {
  background: rgba(255, 255, 255, 0.5);
}

.header-icon {
  font-size: 18px;
}

.header-text {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.header-arrow {
  font-size: 20px;
  color: #94a3b8;
  transition: transform 0.3s ease;
}

.header-arrow.open {
  transform: rotate(90deg);
}

.params-content {
  padding: 0 18px 18px;
}

.params-expand-enter-active,
.params-expand-leave-active {
  transition: all 0.3s ease;
  max-height: 500px;
  opacity: 1;
}

.params-expand-enter-from,
.params-expand-leave-to {
  max-height: 0;
  opacity: 0;
  padding: 0 18px;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 16px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.param-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: #374151;
}

.param-value-display {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 6px;
  font-size: 11px;
  color: #3b82f6;
}

/* ===== 液态滑块 ===== */
.liquid-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  background: linear-gradient(90deg, 
    rgba(226, 232, 240, 0.8) 0%, 
    rgba(226, 232, 240, 0.8) 100%
  );
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.liquid-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 
    0 2px 8px rgba(59, 130, 246, 0.4),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

.liquid-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.5),
    inset 0 2px 4px rgba(255, 255, 255, 0.3);
}

.liquid-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.param-hints {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: #94a3b8;
}

/* ===== 预设芯片 ===== */
.preset-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.5);
}

.preset-label {
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

.preset-chip {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.preset-chip:hover {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-color: transparent;
  transform: translateY(-1px);
}

/* ===== 底部信息 ===== */
.model-footer {
  padding: 12px 16px;
  background: linear-gradient(145deg, 
    rgba(59, 130, 246, 0.05) 0%, 
    rgba(139, 92, 246, 0.03) 100%
  );
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-radius: 12px;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #3b82f6;
}

.info-icon {
  font-size: 14px;
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .model-grid {
    grid-template-columns: 1fr;
  }
  
  .param-grid {
    grid-template-columns: 1fr;
  }
}
</style>
