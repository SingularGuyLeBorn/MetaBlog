<!--
  SettingsPanel - 设置面板(3D 液态玻璃风格)
-->
<template>
  <aside class="settings-panel" :class="{ collapsed }">
    <!-- 背景光效 -->
    
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
      <!-- 模型选择 - 3D 卡片式 -->
      <div class="setting-section">
        <label class="section-label">
          <span class="label-icon">🤖</span>
          模型
        </label>
        <div class="model-selector">
          <button
            v-for="(model, index) in availableModels"
            :key="model.id"
            class="model-option"
            :class="{ 
              active: config.model === model.id,
              recommended: model.recommended 
            }"
            :style="{ animationDelay: `${index * 0.1}s` }"
            @click="selectModel(model.id)"
          >
            <div class="model-glow" :class="{ active: config.model === model.id }"></div>
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
        <!-- 多模态能力提示 -->
        <div class="multimodal-hint">
          <template v-if="currentModelConfig?.isMultimodal">
            <span class="hint-icon">✅</span>
            <span class="hint-text">支持图片输入</span>
          </template>
          <template v-else>
            <span class="hint-icon">⚠️</span>
            <span class="hint-text">当前模型不支持直接识图,上传的图片将通过 OCR 提取文字后发送</span>
          </template>
        </div>
      </div>

      <!-- 思考模式 -->
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
            : '显示 AI 的推理过程,适合复杂问题' 
          }}
        </p>
        <!-- DeepSeek 推理强度选择 -->
        <div v-if="currentModelConfig?.supportsReasoningEffort && (currentModelConfig?.reasoningRequired || config.enableReasoning)" class="reasoning-effort-row">
          <label class="effort-label">推理强度</label>
          <div class="effort-options">
            <button
              class="effort-btn"
              :class="{ active: config.reasoningEffort === 'high' || !config.reasoningEffort }"
              @click="setReasoningEffort('high')"
            >
              标准
            </button>
            <button
              class="effort-btn"
              :class="{ active: config.reasoningEffort === 'max' }"
              @click="setReasoningEffort('max')"
            >
              深度
            </button>
          </div>
        </div>
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
        <p class="section-desc">较低值使回答更精确,较高值使回答更有创意</p>
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

      <!-- 系统提示词 - 模态框形式 -->
      <div class="setting-section">
        <div class="section-header-with-badge">
          <label class="section-label">
            <span class="label-icon">📝</span>
            系统提示词
          </label>
          <span 
            class="customized-badge" 
            :class="{ customized: isSystemPromptCustomized }"
          >
            {{ isSystemPromptCustomized ? '已自定义' : '跟随 Agent' }}
          </span>
        </div>
        
        <!-- 提示词预览卡片 -->
        <div 
          class="prompt-preview-card"
          :class="{ customized: isSystemPromptCustomized }"
          @click="openPromptModal"
        >
          <div class="preview-header">
            <span class="preview-label">System instructions</span>
            <button class="edit-btn" @click.stop="openPromptModal">
              <Icon name="edit" :size="14" />
              编辑
            </button>
          </div>
          <div class="preview-content">
            {{ config.systemPrompt || '点击编辑系统提示词...' }}
          </div>
        </div>
        
        <div class="prompt-info">
          <p class="section-desc">
            {{ isSystemPromptCustomized 
              ? '当前会话已自定义系统提示词,不再跟随 Agent 配置' 
              : '使用 Agent 默认的系统提示词,修改后将仅影响当前会话' 
            }}
          </p>
        </div>
      </div>
      
      <!-- 系统提示词编辑模态框 -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showPromptModal" class="prompt-modal-overlay" @click.self="closePromptModal">
            <Transition name="modal-scale">
              <div v-if="showPromptModal" class="prompt-modal">
                <div class="modal-header">
                  <h3>编辑系统提示词</h3>
                  <button class="modal-close" @click="closePromptModal">
                    <Icon name="close" :size="20" />
                  </button>
                </div>
                <div class="modal-body">
                  <textarea
                    v-model="editingPrompt"
                    class="modal-textarea"
                    rows="12"
                    placeholder="定义 AI 助手的身份、性格和专长领域..."
                  ></textarea>
                  <div class="modal-footer">
                    <span class="char-count">{{ editingPrompt?.length || 0 }} 字符</span>
                    <div class="modal-actions">
                      <button 
                        v-if="isSystemPromptCustomized" 
                        class="btn-reset"
                        @click="resetInModal"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 14px; height: 14px; margin-right: 4px;">
                          <path d="M23 4v6h-6M1 20v-6h6"/>
                          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                        </svg>
                        重置为 Agent 默认
                      </button>
                      <button class="btn-cancel" @click="closePromptModal">取消</button>
                      <button class="btn-save" @click="savePrompt">保存</button>
                    </div>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
        </Transition>
      </Teleport>

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
import { Icon } from '@/theme/components/common'
import { MODELS } from '@/theme/api/providers/models'
import type { ModelType, SessionConfig } from '@/theme/types'
import { computed, ref, Teleport, watch } from 'vue'

interface ModelConfig {
  id: string
  name: string
  description: string
  recommended?: boolean
  supportsReasoning: boolean
  reasoningRequired?: boolean
  /** 是否支持 reasoningEffort 调节(仅 DeepSeek V4) */
  supportsReasoningEffort?: boolean
  /** 是否原生多模态 */
  isMultimodal: boolean
  defaultTemperature: number
  defaultMaxTokens: number
}

// 从统一模型配置中心映射，确保全局共用一份数据
const modelConfigs: ModelConfig[] = MODELS.map(m => ({
  id: m.id,
  name: m.name,
  description: m.description,
  recommended: m.recommended,
  supportsReasoning: m.capabilities.reasoning,
  reasoningRequired: m.id === 'deepseek-v4-pro',
  supportsReasoningEffort: m.id.startsWith('deepseek-v4'),
  isMultimodal: m.capabilities.vision,
  defaultTemperature: m.defaultTemperature,
  defaultMaxTokens: m.maxOutputTokens
}))

interface Props {
  config: SessionConfig
  collapsed: boolean
  agentSystemPrompt?: string
  isSystemPromptCustomized?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  agentSystemPrompt: '',
  isSystemPromptCustomized: false
})

const emit = defineEmits<{
  'update:config': [config: Partial<SessionConfig>]
  'toggle-collapse': []
  'open-agent-center': []
  'reset-system-prompt': []
}>()

const availableModels = modelConfigs

const currentModelConfig = computed(() => {
  return modelConfigs.find(m => m.id === props.config.model)
})

function selectModel(modelId: string) {
  const model = modelConfigs.find(m => m.id === modelId)
  if (!model) return

  const updates: Partial<SessionConfig> = { model: modelId as ModelType }
  
  if (model.supportsReasoning) {
    updates.enableReasoning = model.reasoningRequired || props.config.enableReasoning
  } else {
    updates.enableReasoning = false
  }

  // DeepSeek 模型默认 reasoningEffort 为 high
  if (model.supportsReasoningEffort) {
    updates.reasoningEffort = props.config.reasoningEffort || 'high'
  } else {
    updates.reasoningEffort = undefined
  }

  emit('update:config', updates)
}

function toggleReasoning() {
  if (currentModelConfig.value?.reasoningRequired) return
  emit('update:config', { enableReasoning: !props.config.enableReasoning })
}

function setReasoningEffort(level: 'high' | 'max') {
  emit('update:config', { reasoningEffort: level })
}

function resetSettings() {
  const model = currentModelConfig.value
  if (!model) return

  emit('update:config', {
    temperature: model.defaultTemperature,
    maxTokens: model.defaultMaxTokens,
    systemPrompt: '',
    enableReasoning: model.reasoningRequired || false,
    reasoningEffort: model.supportsReasoningEffort ? 'high' : undefined
  })
}

// System Prompt 相关方法
// 模态框状态
const showPromptModal = ref(false)
const editingPrompt = ref('')

// 监听配置变化,同步编辑内容
watch(() => props.config.systemPrompt, (newVal) => {
  if (!showPromptModal.value) {
    editingPrompt.value = newVal || ''
  }
}, { immediate: true })

function openPromptModal() {
  editingPrompt.value = props.config.systemPrompt || ''
  showPromptModal.value = true
}

function closePromptModal() {
  showPromptModal.value = false
}

function savePrompt() {
  emit('update:config', { systemPrompt: editingPrompt.value })
  closePromptModal()
}

function resetInModal() {
  editingPrompt.value = props.agentSystemPrompt
}

function onSystemPromptInput() {
  // 当用户手动输入时,标记为已自定义
  // 通过比较当前值与 Agent 默认值来判断是否自定义
  if (!props.isSystemPromptCustomized && props.config.systemPrompt !== props.agentSystemPrompt) {
    emit('update:config', { systemPrompt: props.config.systemPrompt })
  }
}

function clearSystemPrompt() {
  emit('update:config', { systemPrompt: '' })
}

function resetToAgentPrompt() {
  emit('reset-system-prompt')
}
</script>

<style>
.settings-panel {
  position: relative;
  width: 340px;
  display: flex;
  flex-direction: column;
  background: #f8f6f3;
  border-left: 1px solid #e2ddd6;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 100;
  overflow: hidden;
}

.settings-panel.collapsed {
  width: 0;
  opacity: 0;
  overflow: hidden;
}

/* 3D 头部 */
.panel-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: transparent;
  border-bottom: 1px solid rgba(226, 232, 240, 0.8);
  z-index: 1;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(184, 160, 144, 0.1);
  border-radius: 12px;
  color: #b8a090;
  border: 1px solid rgba(184, 160, 144, 0.2);
  transition: all 0.3s ease;
}

.header-icon:hover {
  background: rgba(184, 160, 144, 0.15);
}

.header-icon svg {
  width: 22px;
  height: 22px;
}

.header-title h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.6);
  border-radius: 10px;
  color: #9a9588;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(226, 232, 240, 0.8);
  color: #1e293b;
  transform: translateY(-1px);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* 内容区 */
.panel-content {
  position: relative;
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  z-index: 1;
}

.setting-section {
  margin-bottom: 28px;
  animation: fade-in-up 0.4s ease-out;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 14px;
}

.label-icon {
  font-size: 16px;
}

.value-badge {
  margin-left: auto;
  padding: 4px 12px;
  background: rgba(184, 160, 144, 0.1);
  color: #b8a090;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid rgba(184, 160, 144, 0.2);
}

.section-desc {
  font-size: 13px;
  color: #b8b3a8;
  margin: 10px 0 0;
  line-height: 1.5;
}

/* 3D 模型选择器 */
.model-selector {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.model-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  overflow: hidden;
  animation: slide-in-left 0.4s ease-out backwards;
}

@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.model-option:hover {
  background: #fff;
  border-color: #d4ccc4;
  box-shadow: 0 8px 20px rgba(184, 160, 144, 0.1), inset 0 0 16px rgba(184, 160, 144, 0.05);
}

.model-option.active {
  background: linear-gradient(145deg, #f5f0eb, #e8dfd4);
  border-color: rgba(184, 160, 144, 0.3);
  box-shadow: 0 4px 16px rgba(184, 160, 144, 0.15), inset 0 0 16px rgba(184, 160, 144, 0.05);
}

.model-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse, rgba(184, 160, 144, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.model-glow.active {
  opacity: 1;
}

.model-info {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.model-name {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 4px;
}

.model-desc {
  font-size: 12px;
  color: #9a9588;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-badge {
  padding: 4px 10px;
  background: rgba(184, 160, 144, 0.1);
  color: #b8a090;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  border: 1px solid rgba(184, 160, 144, 0.2);
}

.check-icon {
  width: 24px;
  height: 24px;
  color: #b8a090;
  filter: drop-shadow(0 2px 4px rgba(184, 160, 144, 0.2));
}

.check-icon svg {
  width: 100%;
  height: 100%;
}

/* 3D 切换头部 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toggle-btn {
  width: 52px;
  height: 28px;
  padding: 2px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.toggle-btn.active {
  background: rgba(184, 160, 144, 0.2);
  border-color: #b8a090;
  box-shadow: inset 0 0 12px rgba(184, 160, 144, 0.1);
}

.toggle-btn.disabled {
  background: rgba(241, 245, 249, 0.5);
  cursor: not-allowed;
}

.toggle-slider {
  display: block;
  width: 22px;
  height: 22px;
  background: #FFFFFF;
  border-radius: 50%;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
}

.toggle-btn.active .toggle-slider {
  transform: translateX(24px);
}

.toggle-status {
  font-size: 12px;
  font-weight: 600;
  color: #9a9588;
}

/* 3D 滑块 */
.slider-wrapper {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
}

.slider-label {
  font-size: 11px;
  color: #b8b3a8;
  font-weight: 700;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.slider {
  flex: 1;
  height: 8px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(226, 232, 240, 0.8);
  border-radius: 4px;
  outline: none;
  cursor: pointer;
  border: 1px solid rgba(203, 213, 225, 0.5);
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 22px;
  height: 22px;
  background: #b8a090;
  border-radius: 50%;
  border: 3px solid #ffffff;
  box-shadow: 0 0 12px rgba(184, 160, 144, 0.3);
  transition: all 0.2s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: 0 0 20px rgba(184, 160, 144, 0.4);
}

/* 3D 系统提示词输入 */
.prompt-input-wrapper {
  background: linear-gradient(145deg, #ffffff, #f8f6f3);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.prompt-input-wrapper:focus-within {
  border-color: rgba(184, 160, 144, 0.5);
  box-shadow: 
    0 0 0 4px rgba(184, 160, 144, 0.1),
    0 8px 20px rgba(184, 160, 144, 0.1);
  transform: translateY(-2px);
}

.prompt-input {
  width: 100%;
  padding: 18px;
  background: transparent;
  border: none;
  font-size: 14px;
  line-height: 1.7;
  color: #2d2a26;
  resize: vertical;
  min-height: 100px;
  outline: none;
  font-family: inherit;
}

.prompt-input::placeholder {
  color: #b8b3a8;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: linear-gradient(145deg, #f8f6f3, #f1ede8);
  border-top: 1px solid rgba(226, 232, 240, 0.6);
}

.char-count {
  font-size: 12px;
  color: #b8b3a8;
  font-weight: 500;
}

.prompt-actions {
  display: flex;
  gap: 8px;
}

/* System Prompt 自定义状态 */
.section-header-with-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.customized-badge {
  padding: 4px 10px;
  background: rgba(148, 163, 184, 0.15);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  color: #9a9588;
  transition: all 0.3s ease;
}

.customized-badge.customized {
  background: linear-gradient(135deg, rgba(184, 160, 144, 0.15), rgba(212, 196, 176, 0.1));
  border-color: rgba(184, 160, 144, 0.3);
  color: #b8a090;
}

.prompt-input.customized {
  border-color: rgba(184, 160, 144, 0.4);
  background: linear-gradient(145deg, #f8f0e0, #ffffff);
}

.reset-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: linear-gradient(145deg, #e8dfd4, #d4c4b0);
  border: 1px solid rgba(184, 160, 144, 0.3);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #b8a090;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: linear-gradient(145deg, #b8a090, #9a9588);
  color: white;
  transform: translateY(-1px);
}

.prompt-info {
  margin-top: 12px;
}

.agent-prompt-preview {
  margin-top: 10px;
  padding: 12px;
  background: linear-gradient(145deg, #f1ede8, #e2ddd6);
  border-radius: 10px;
  border-left: 3px solid #b8a090;
}

.preview-label {
  font-size: 11px;
  font-weight: 600;
  color: #9a9588;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.preview-text {
  font-size: 13px;
  color: #6a6560;
  line-height: 1.5;
}

.clear-btn {
  padding: 6px 14px;
  background: linear-gradient(145deg, #ffffff, #f1ede8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #d4b8b8;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.clear-btn:hover {
  background: linear-gradient(145deg, #f0e0e0, #e8d0d0);
  border-color: rgba(212, 184, 184, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(212, 184, 184, 0.15);
}

/* 3D Agent 控制中心按钮 */
.agent-center-btn {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px;
  background: linear-gradient(135deg, rgba(184, 160, 144, 0.08), rgba(212, 196, 176, 0.08));
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
}

.agent-center-btn:hover {
  background: linear-gradient(135deg, rgba(184, 160, 144, 0.12), rgba(212, 196, 176, 0.12));
  border-color: rgba(184, 160, 144, 0.3);
  transform: translateY(-2px);
  box-shadow: 
    0 8px 20px rgba(184, 160, 144, 0.15),
    0 0 0 1px rgba(184, 160, 144, 0.05);
}

.btn-icon {
  font-size: 28px;
}

.btn-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.btn-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.btn-desc {
  font-size: 12px;
  color: #9a9588;
}

.btn-arrow {
  width: 20px;
  height: 20px;
  color: #b8b3a8;
  transition: all 0.3s ease;
}

.agent-center-btn:hover .btn-arrow {
  color: #b8a090;
  transform: translateX(6px);
}

/* 3D 重置按钮 */
.reset-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px;
  background: linear-gradient(145deg, #ffffff, #f8f6f3);
  border: 1px dashed rgba(148, 163, 184, 0.5);
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: #9a9588;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.reset-btn:hover {
  background: linear-gradient(145deg, #f1ede8, #e2ddd6);
  border-color: rgba(100, 116, 139, 0.5);
  color: #6a6560;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.reset-btn svg {
  width: 16px;
  height: 16px;
}

/* 3D 滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #d4ccc4, #b8b3a8);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, #b8b3a8, #9a9588);
}

/* ===== 提示词预览卡片 ===== */
.prompt-preview-card {
  background: linear-gradient(145deg, #f8f6f3, #f1ede8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.prompt-preview-card:hover {
  background: linear-gradient(145deg, #ffffff, #f8f6f3);
  border-color: #b8a090;
  box-shadow: 0 4px 12px rgba(184, 160, 144, 0.1);
}

.prompt-preview-card.customized {
  background: linear-gradient(145deg, #f8f0e0, #f0e8c8);
  border-color: rgba(184, 160, 144, 0.3);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.preview-header .preview-label {
  font-size: 12px;
  font-weight: 600;
  color: #9a9588;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(184, 160, 144, 0.1);
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #b8a090;
  cursor: pointer;
  transition: all 0.2s;
}

.edit-btn:hover {
  background: rgba(184, 160, 144, 0.2);
}

.preview-content {
  font-size: 13px;
  color: #6a6560;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  min-height: 60px;
}

/* ===== 模态框 ===== */
.prompt-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 20px;
}

.prompt-modal {
  width: 100%;
  max-width: 600px;
  background: linear-gradient(145deg, #ffffff, #f8f6f3);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  border-radius: 10px;
  color: #9a9588;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: rgba(212, 184, 184, 0.1);
  color: #d4b8b8;
}

.modal-body {
  padding: 24px;
}

.modal-textarea {
  width: 100%;
  padding: 16px;
  background: #ffffff;
  border: 2px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #1e293b;
  resize: vertical;
  min-height: 200px;
  outline: none;
  transition: all 0.3s;
}

.modal-textarea:focus {
  border-color: #b8a090;
  box-shadow: 0 0 0 3px rgba(184, 160, 144, 0.1);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.modal-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  padding: 10px 20px;
  background: #f1ede8;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #6a6560;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #e2ddd6;
}

.btn-save {
  padding: 10px 24px;
  background: linear-gradient(135deg, #d4c4b0, #c4b0a0);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(212, 196, 176, 0.3);
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(212, 196, 176, 0.4);
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(184, 160, 144, 0.1);
  border: 1px solid rgba(184, 160, 144, 0.2);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #b8a090;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: rgba(184, 160, 144, 0.2);
}

/* 模态框过渡动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-scale-leave-active {
  transition: all 0.2s ease;
}

.modal-scale-enter-from {
  opacity: 0;
  transform: scale(0.95) translateY(20px);
}

.modal-scale-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 多模态能力提示 */
.multimodal-hint {
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(184, 160, 144, 0.06);
  border: 1px solid rgba(184, 160, 144, 0.15);
  color: #b8a090;
}

.multimodal-hint .hint-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.multimodal-hint .hint-text {
  font-weight: 500;
}

/* 推理强度选择 */
.reasoning-effort-row {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.effort-label {
  font-size: 13px;
  font-weight: 600;
  color: #6a6560;
  white-space: nowrap;
}

.effort-options {
  display: flex;
  gap: 6px;
  flex: 1;
}

.effort-btn {
  flex: 1;
  padding: 6px 12px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  background: rgba(241, 245, 249, 0.6);
  font-size: 12px;
  font-weight: 600;
  color: #9a9588;
  cursor: pointer;
  transition: all 0.2s ease;
}

.effort-btn:hover {
  background: rgba(226, 232, 240, 0.8);
  color: #6a6560;
}

.effort-btn.active {
  background: linear-gradient(135deg, #d4c4b0, #c4b0a0);
  border-color: transparent;
  color: white;
  box-shadow: 0 2px 8px rgba(212, 196, 176, 0.3);
}

/* 响应式 */
@media (max-width: 1024px) {
  .settings-panel {
    position: absolute;
    right: 0;
    height: 100%;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.1);
  }
  
  .prompt-modal {
    max-width: 100%;
    margin: 16px;
  }
}
</style>
