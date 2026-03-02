<template>
  <div class="model-panel">
    <!-- 模型卡片网格 -->
    <div class="model-grid">
      <LiquidGlass
        v-for="(model, idx) in models"
        :key="model.id"
        class="model-card-glass"
        :glow-color="model.glowColor"
        :intensity="selectedModel === model.id ? 0.7 : 0.3"
        :class="{ active: selectedModel === model.id }"
        @click="selectModel(model.id)"
      >
        <div class="model-card">
          <div class="model-icon" :style="{ background: model.gradient }">
            <Icon :name="model.icon" />
          </div>
          <div class="model-name">{{ model.name }}</div>
          <div class="model-desc">{{ model.description }}</div>
          
          <div v-if="selectedModel === model.id" class="model-indicator">
            <Icon name="check" />
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 参数滑块 -->
    <LiquidGlass class="params-glass" glow-color="#8b5cf6" :intensity="0.3">
      <div class="params-card">
        <div class="param">
          <label class="param-label">
            <span>Temperature</span>
            <LiquidGlass class="value-glass" glow-color="#8b5cf6" :intensity="0.2">
              <span class="param-value">{{ params.temperature }}</span>
            </LiquidGlass>
          </label>
          <input
            v-model.number="params.temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="lg-slider"
            @input="onChange"
          />
          <div class="param-desc">控制输出的随机性，越高越创意</div>
        </div>

        <div class="param">
          <label class="param-label">
            <span>Max Tokens</span>
            <LiquidGlass class="value-glass" glow-color="#3b82f6" :intensity="0.2">
              <span class="param-value">{{ params.maxTokens }}</span>
            </LiquidGlass>
          </label>
          <input
            v-model.number="params.maxTokens"
            type="range"
            min="256"
            max="8192"
            step="256"
            class="lg-slider"
            @input="onChange"
          />
          <div class="param-desc">单次回复最大 token 数</div>
        </div>

        <div class="param">
          <label class="param-label">
            <span>Top P</span>
            <LiquidGlass class="value-glass" glow-color="#10b981" :intensity="0.2">
              <span class="param-value">{{ params.topP }}</span>
            </LiquidGlass>
          </label>
          <input
            v-model.number="params.topP"
            type="range"
            min="0"
            max="1"
            step="0.05"
            class="lg-slider"
            @input="onChange"
          />
          <div class="param-desc">核采样概率阈值</div>
        </div>

        <div class="param">
          <label class="param-label">
            <span>Frequency Penalty</span>
            <LiquidGlass class="value-glass" glow-color="#f59e0b" :intensity="0.2">
              <span class="param-value">{{ params.frequencyPenalty }}</span>
            </LiquidGlass>
          </label>
          <input
            v-model.number="params.frequencyPenalty"
            type="range"
            min="-2"
            max="2"
            step="0.1"
            class="lg-slider"
            @input="onChange"
          />
          <div class="param-desc">降低重复词的概率</div>
        </div>

        <!-- 推理模式开关 -->
        <div class="param toggle-param">
          <label class="lg-toggle">
            <input v-model="params.enableReasoning" type="checkbox" @change="onChange" />
            <span class="lg-toggle-slider" :class="{ on: params.enableReasoning }" />
            <span class="toggle-label">
              <Icon name="brain" />
              启用推理模式 (Reasoning)
            </span>
          </label>
        </div>
      </div>
    </LiquidGlass>

    <!-- 底部说明 -->
    <LiquidGlass class="info-glass" glow-color="#f59e0b" :intensity="0.2">
      <div class="info-card">
        <Icon name="lightbulb" class="info-icon" />
        <div class="info-text">
          <strong>提示：</strong>选择合适的模型和参数可以显著影响 Agent 的回复质量。对于需要精确回答的任务，建议使用较低的 Temperature 值。
        </div>
      </div>
    </LiquidGlass>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Agent } from '../../../core/types/agent'
import Icon from '../../../shared/Icon.vue'
import LiquidGlass from '../../../shared/LiquidGlass.vue'

const props = defineProps<{ agent: Agent }>()
const emit = defineEmits<{
  change: [modelId: string, params: any]
}>()

const models = [
  { id: 'kimi-k1.5', name: 'Kimi k1.5', description: '基础模型', icon: 'zap', gradient: 'linear-gradient(135deg, #10b981, #059669)', glowColor: '#10b981' },
  { id: 'kimi-k1.5-pro', name: 'Kimi k1.5 Pro', description: '高级推理', icon: 'rocket', gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', glowColor: '#8b5cf6' },
  { id: 'gpt-4o', name: 'GPT-4o', description: '多模态', icon: 'sparkles', gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', glowColor: '#06b6d4' },
  { id: 'claude-3.5', name: 'Claude 3.5', description: '代码能力', icon: 'code', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', glowColor: '#f59e0b' },
  { id: 'qwen-max', name: '通义千问 Max', description: '中文优化', icon: 'flame', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', glowColor: '#ef4444' }
]

const selectedModel = ref(props.agent.runtime?.model || 'kimi-k1.5')

const params = ref({
  temperature: props.agent.runtime?.temperature ?? 0.7,
  maxTokens: props.agent.runtime?.maxTokens ?? 2048,
  topP: props.agent.runtime?.topP ?? 1,
  frequencyPenalty: props.agent.runtime?.frequencyPenalty ?? 0,
  enableReasoning: props.agent.runtime?.enableReasoning ?? false
})

function selectModel(id: string) {
  selectedModel.value = id
  emit('change', id, params.value)
}

function onChange() {
  emit('change', selectedModel.value, params.value)
}

watch(() => props.agent, (a) => {
  selectedModel.value = a.runtime?.model || 'kimi-k1.5'
  params.value = {
    temperature: a.runtime?.temperature ?? 0.7,
    maxTokens: a.runtime?.maxTokens ?? 2048,
    topP: a.runtime?.topP ?? 1,
    frequencyPenalty: a.runtime?.frequencyPenalty ?? 0,
    enableReasoning: a.runtime?.enableReasoning ?? false
  }
}, { deep: true })
</script>

<style scoped>
@import '../../../styles/liquid-glass-theme.css';

.model-panel {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

/* 模型卡片网格 */
.model-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.model-card-glass {
  border-radius: 20px;
  cursor: pointer;
}

.model-card-glass.active {
  transform: translateY(-6px) scale(1.03);
}

.model-card {
  position: relative;
  padding: 28px 20px;
  text-align: center;
}

.model-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.model-icon svg {
  width: 28px;
  height: 28px;
}

.model-name {
  font-size: 16px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.model-desc {
  font-size: 13px;
  color: #64748b;
}

.model-indicator {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-indicator svg {
  width: 14px;
  height: 14px;
}

/* 参数区 */
.params-glass {
  border-radius: 28px;
  margin-bottom: 20px;
}

.params-card {
  padding: 32px;
}

.param {
  margin-bottom: 28px;
}

.param:last-child {
  margin-bottom: 0;
}

.param-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #374151;
}

.value-glass {
  display: inline-block;
  border-radius: 10px;
}

.param-value {
  display: block;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.param-desc {
  font-size: 13px;
  color: #64748b;
  margin-top: 6px;
}

.toggle-param {
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
  color: #374151;
}

.toggle-label svg {
  width: 20px;
  height: 20px;
  color: #8b5cf6;
}

/* 信息卡片 */
.info-glass {
  border-radius: 20px;
}

.info-card {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 24px;
}

.info-icon {
  width: 28px;
  height: 28px;
  color: #f59e0b;
  flex-shrink: 0;
}

.info-text {
  font-size: 15px;
  line-height: 1.6;
  color: #475569;
}

.info-text strong {
  color: #1e293b;
}

@media (max-width: 640px) {
  .model-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
