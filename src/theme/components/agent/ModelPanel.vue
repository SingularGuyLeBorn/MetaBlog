<template>
  <div class="model-panel">
    <LiquidGlass class="card-glass" glow-color="var(--sr-morandi-blue, #9aa8b8)" :intensity="0.3">
      <div class="card-inner">
        <label class="field-label">
          <Icon name="cpu" class="label-icon" />
          模型选择
        </label>
        <DropdownSelect
          v-model="form.model"
          :options="MODELS.map(m => ({ value: m.id, label: m.name }))"
          placeholder="选择模型"
          @change="emitChange"
        />
      </div>
    </LiquidGlass>

    <div class="layout-row">
      <LiquidGlass class="card-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.3">
        <div class="card-inner">
          <label class="field-label">
            <Icon name="thermometer" class="label-icon" />
            温度 (Temperature)
          </label>
          <div class="slider-row">
            <input
              v-model.number="form.temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              class="sr-slider"
              @change="emitChange"
            />
            <span class="slider-value">{{ form.temperature }}</span>
          </div>
          <p class="field-hint">越低越确定，越高越有创意</p>
        </div>
      </LiquidGlass>

      <LiquidGlass class="card-glass" glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.3">
        <div class="card-inner">
          <label class="field-label">
            <Icon name="maximize" class="label-icon" />
            最大 Token
          </label>
          <input
            v-model.number="form.maxTokens"
            type="number"
            class="lg-input"
            min="256"
            max="16000"
            step="256"
            @blur="emitChange"
          />
          <p class="field-hint">单次回复的最大长度限制</p>
        </div>
      </LiquidGlass>
    </div>

    <LiquidGlass class="card-glass" glow-color="var(--sr-morandi-purple, #b3a8b8)" :intensity="0.2">
      <div class="card-inner">
        <label class="field-label">
          <Icon name="message-square" class="label-icon" />
          上下文窗口
        </label>
        <div class="context-info">
          <span class="context-value">{{ contextWindow }}</span>
          <span class="context-unit">tokens</span>
        </div>
      </div>
    </LiquidGlass>
  </div>
</template>

<script setup lang="ts">
import { DropdownSelect, Icon, LiquidGlass } from '@/theme/components/common'
import { MODELS } from '@/theme/api/providers/models'
import { ref, watch } from 'vue'

interface Agent {
  id: string
  name: string
  config?: {
    model?: string
    temperature?: number
    maxTokens?: number
  }
}

const props = defineProps<{
  agent: Agent
}>()

const emit = defineEmits<{
  change: [config: { model: string; temperature: number; maxTokens: number }]
}>()

const form = ref({
  model: props.agent?.config?.model || 'deepseek-v4-flash',
  temperature: props.agent?.config?.temperature ?? 0.7,
  maxTokens: props.agent?.config?.maxTokens ?? 4096
})

const contextWindow = 128000

watch(() => props.agent, (agent) => {
  if (agent?.config) {
    form.value.model = agent.config.model || 'deepseek-v4-flash'
    form.value.temperature = agent.config.temperature ?? 0.7
    form.value.maxTokens = agent.config.maxTokens ?? 4096
  }
}, { immediate: true })

function emitChange() {
  emit('change', { ...form.value })
}
</script>

<style scoped>
.model-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card-glass {
  border-radius: 24px;
}

.card-inner {
  padding: 24px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.label-icon {
  width: 20px;
  height: 20px;
  color: var(--sr-accent-star, #b8a090);
}

.layout-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.slider-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sr-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  outline: none;
}

.sr-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(184, 160, 144, 0.3);
}

.slider-value {
  min-width: 40px;
  text-align: center;
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-accent-star, #b8a090);
}

.field-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.context-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.context-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.context-unit {
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

@media (max-width: 768px) {
  .layout-row {
    grid-template-columns: 1fr;
  }
}
</style>
