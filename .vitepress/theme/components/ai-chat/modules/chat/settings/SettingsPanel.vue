<!--
  SettingsPanel - 设置面板（美化版）
  
  特性：
  - 模型特定配置（思考模式根据模型显示/禁用）
  - 美化的下拉选择框
  - 清晰的输入框边界
-->
<template>
  <aside class="settings-panel" :class="{ collapsed }">
    <div class="panel-header">
      <div class="header-title">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </div>
        <h3>设置</h3>
      </div>
      <button class="close-btn" @click="$emit('toggle-collapse')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>

    <div class="panel-content">
      <!-- 模型选择 - 美化卡片式 -->
      <div class="setting-section">
        <label class="section-label">
          <span class="label-icon">🤖</span>
          模型
        </label>
        <div class="model-selector">
          <button
            v-for="model in availableModels"
            :key="model.id"
            class="model-option"
            :class="{ 
              active: config.model === model.id,
              recommended: model.recommended 
            }"
            @click="selectModel(model.id)"
          >
            <div class="model-info">
              <div class="model-name">{{ model.name }}</div>
              <div class="model-desc">{{ model.description }}</div>
            </div>
            <div v-if="model.recommended" class="model-badge">推荐</div>
            <div v-if="config.model === model.id" class="check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
          </button>
        </div>
      </div>

      <!-- 思考模式 - 根据模型动态显示 -->
      <div v-if="currentModelConfig?.supportsReasoning" class="setting-section">
        <div class="section-header">
          <label class="section-label">
            <span class="label-icon">💭</span>
            思考模式
          </label>
          <div class="toggle-wrapper">
            <button
              class="toggle-btn"
              :class="{ 
                active: config.enableReasoning,
                disabled: currentModelConfig?.reasoningRequired 
              }"
              :disabled="currentModelConfig?.reasoningRequired"
              @click="toggleReasoning"
            >
              <span class="toggle-slider"></span>
            </button>
            <span class="toggle-status">
              {{ currentModelConfig?.reasoningRequired ? '始终开启' : (config.enableReasoning ? '开启' : '关闭') }}
            </span>
          </div>
        </div>
        <p class="section-desc">
          {{ currentModelConfig?.reasoningRequired 
            ? '该模型始终显示推理过程' 
            : '显示 AI 的推理过程，适合复杂问题' 
          }}
        </p>
      </div>

      <!-- 温度 -->
      <div class="setting-section">
        <label class="section-label">
          <span class="label-icon">🌡️</span>
          温度
          <span class="value-badge">{{ config.temperature }}</span>
        </label>
        <div class="slider-wrapper">
          <span class="slider-label">精确</span>
          <input
            v-model.number="config.temperature"
            type="range"
            min="0"
            max="2"
            step="0.1"
            class="slider"
          >
          <span class="slider-label">创意</span>
        </div>
        <p class="section-desc">较低值使回答更精确，较高值使回答更有创意</p>
      </div>

      <!-- 最大 Token -->
      <div class="setting-section">
        <label class="section-label">
          <span class="label-icon">📏</span>
          最大 Token
          <span class="value-badge">{{ config.maxTokens }}</span>
        </label>
        <div class="slider-wrapper">
          <span class="slider-label">短</span>
          <input
            v-model.number="config.maxTokens"
            type="range"
            min="256"
            max="8192"
            step="256"
            class="slider"
          >
          <span class="slider-label">长</span>
        </div>
        <p class="section-desc">控制回答的最大长度</p>
      </div>

      <!-- 系统提示词 - 带边框的输入框 -->
      <div class="setting-section">
        <label class="section-label">
          <span class="label-icon">📝</span>
          系统提示词
        </label>
        <div class="prompt-input-wrapper">
          <textarea
            v-model="config.systemPrompt"
            class="prompt-input"
            rows="5"
            placeholder="设置 AI 的角色和行为方式，例如：你是一位专业的编程助手，擅长解释复杂的代码..."
          ></textarea>
          <div class="input-footer">
            <span class="char-count">{{ config.systemPrompt.length }} 字符</span>
            <button 
              v-if="config.systemPrompt" 
              class="clear-btn"
              @click="config.systemPrompt = ''"
            >
              清空
            </button>
          </div>
        </div>
        <p class="section-desc">定义 AI 助手的身份、性格和专长领域</p>
      </div>

      <!-- 重置按钮 -->
      <div class="setting-section">
        <button class="reset-btn" @click="resetSettings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
          恢复默认设置
        </button>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { SessionConfig, ModelType } from '../../../core/types'

// 模型配置
interface ModelConfig {
  id: ModelType
  name: string
  description: string
  recommended?: boolean
  supportsReasoning: boolean
  reasoningRequired?: boolean
  defaultTemperature: number
  defaultMaxTokens: number
}

const modelConfigs: ModelConfig[] = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    description: '通用对话，适合日常交流',
    recommended: true,
    supportsReasoning: false,
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    description: '深度思考，自动展示推理过程',
    supportsReasoning: true,
    reasoningRequired: true,
    defaultTemperature: 0.7,
    defaultMaxTokens: 4096
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    description: '代码专用，可开启思考模式',
    supportsReasoning: true,
    defaultTemperature: 0.3,
    defaultMaxTokens: 8192
  }
]

interface Props {
  config: SessionConfig
  collapsed: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:config': [config: Partial<SessionConfig>]
  'toggle-collapse': []
}>()

const availableModels = modelConfigs

const currentModelConfig = computed(() => {
  return modelConfigs.find(m => m.id === props.config.model)
})

function selectModel(modelId: ModelType) {
  const model = modelConfigs.find(m => m.id === modelId)
  if (!model) return

  const updates: Partial<SessionConfig> = { model: modelId }
  
  // 根据模型自动设置思考模式
  if (model.supportsReasoning) {
    updates.enableReasoning = model.reasoningRequired || props.config.enableReasoning
  } else {
    updates.enableReasoning = false
  }

  emit('update:config', updates)
}

function toggleReasoning() {
  if (currentModelConfig.value?.reasoningRequired) return
  emit('update:config', { 
    enableReasoning: !props.config.enableReasoning 
  })
}

function resetSettings() {
  const model = currentModelConfig.value
  if (!model) return

  emit('update:config', {
    temperature: model.defaultTemperature,
    maxTokens: model.defaultMaxTokens,
    systemPrompt: '',
    enableReasoning: model.reasoningRequired || false
  })
}
</script>

<style scoped>
.settings-panel {
  width: 340px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
}

.settings-panel.collapsed {
  width: 0;
  opacity: 0;
  overflow: hidden;
}

/* 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  background: linear-gradient(to right, #f9fafb, #ffffff);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 10px;
  color: white;
}

.header-icon svg {
  width: 20px;
  height: 20px;
}

.header-title h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: #9ca3af;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #4b5563;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* 内容区 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.setting-section {
  margin-bottom: 28px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.label-icon {
  font-size: 16px;
}

.value-badge {
  margin-left: auto;
  padding: 2px 10px;
  background: #eff6ff;
  color: #2563eb;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.section-desc {
  font-size: 13px;
  color: #9ca3af;
  margin: 8px 0 0;
  line-height: 1.5;
}

/* 模型选择器 */
.model-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.model-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.model-option:hover {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.model-option.active {
  background: #eff6ff;
  border-color: #3b82f6;
}

.model-info {
  flex: 1;
}

.model-name {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 2px;
}

.model-desc {
  font-size: 12px;
  color: #6b7280;
}

.model-badge {
  padding: 2px 8px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 600;
}

.check-icon {
  width: 20px;
  height: 20px;
  color: #3b82f6;
}

.check-icon svg {
  width: 100%;
  height: 100%;
}

/* 头部带切换 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-btn {
  width: 48px;
  height: 26px;
  padding: 2px;
  background: #e5e7eb;
  border: none;
  border-radius: 13px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.toggle-btn.active {
  background: #3b82f6;
}

.toggle-btn.disabled {
  background: #93c5fd;
  cursor: not-allowed;
}

.toggle-slider {
  display: block;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-btn.active .toggle-slider {
  transform: translateX(22px);
}

.toggle-status {
  font-size: 12px;
  color: #6b7280;
  font-weight: 500;
}

/* 滑块 */
.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
  white-space: nowrap;
}

.slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: #e5e7eb;
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3);
  transition: transform 0.2s;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}

/* 系统提示词输入 */
.prompt-input-wrapper {
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.prompt-input-wrapper:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.prompt-input {
  width: 100%;
  padding: 16px;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1.6;
  color: #374151;
  resize: vertical;
  min-height: 100px;
  outline: none;
}

.prompt-input::placeholder {
  color: #9ca3af;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: #f3f4f6;
  border-top: 1px solid #e5e7eb;
}

.char-count {
  font-size: 12px;
  color: #9ca3af;
}

.clear-btn {
  padding: 4px 12px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  color: #ef4444;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: #fee2e2;
}

/* 重置按钮 */
.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 10px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.reset-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
  color: #374151;
}

.reset-btn svg {
  width: 16px;
  height: 16px;
}

/* 滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}
</style>
