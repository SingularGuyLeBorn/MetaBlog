<!--
  SystemPromptEditor - 系统提示词编辑器
  从 SettingsPanel 拆分，负责系统提示词的展示和编辑.
-->
<template>
  <div class="setting-section">
    <div class="section-header-with-badge">
      <label class="section-label">
        <span class="label-icon">📝</span>
        系统提示词
      </label>
      <span class="customized-badge" :class="{ customized: isSystemPromptCustomized }">
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
        {{ systemPrompt || '点击编辑系统提示词...' }}
      </div>
    </div>

    <div class="prompt-info">
      <p class="section-desc">
        {{ isSystemPromptCustomized
          ? '当前会话已自定义系统提示词，不再跟随 Agent 配置'
          : '使用 Agent 默认的系统提示词，修改后将仅影响当前会话'
        }}
      </p>
    </div>
  </div>

  <!-- 编辑模态框 -->
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
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import { ref, watch } from 'vue'

interface Props {
  systemPrompt: string
  agentSystemPrompt: string
  isSystemPromptCustomized: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:systemPrompt': [prompt: string]
  'reset-system-prompt': []
}>()

const showPromptModal = ref(false)
const editingPrompt = ref('')

watch(() => props.systemPrompt, (newVal) => {
  if (!showPromptModal.value) {
    editingPrompt.value = newVal || ''
  }
}, { immediate: true })

function openPromptModal() {
  editingPrompt.value = props.systemPrompt || ''
  showPromptModal.value = true
}

function closePromptModal() {
  showPromptModal.value = false
}

function savePrompt() {
  emit('update:systemPrompt', editingPrompt.value)
  closePromptModal()
}

function resetInModal() {
  editingPrompt.value = props.agentSystemPrompt
  emit('reset-system-prompt')
}
</script>

<style scoped>
.setting-section {
  margin-bottom: 24px;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #2d2a26);
  margin-bottom: 12px;
}

.label-icon {
  font-size: 16px;
}

.section-desc {
  font-size: 13px;
  color: var(--sr-text-secondary, #6a6560);
  margin: 10px 0 0;
  line-height: 1.5;
}

/* Badge */
.section-header-with-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.customized-badge {
  padding: 3px 10px;
  background: rgba(200, 195, 188, 0.15);
  border: 1px solid rgba(200, 195, 188, 0.3);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 500;
  color: var(--sr-text-muted, #9a9588);
  transition: all 0.2s ease;
}

.customized-badge.customized {
  background: rgba(212, 184, 168, 0.15);
  border-color: rgba(212, 184, 168, 0.35);
  color: #c4a080;
}

/* Preview Card */
.prompt-preview-card {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.prompt-preview-card:hover {
  background: rgba(255, 255, 255, 0.85);
  border-color: rgba(200, 195, 188, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
}

.prompt-preview-card.customized {
  border-color: rgba(212, 184, 168, 0.5);
  background: rgba(255, 252, 248, 0.6);
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(200, 195, 188, 0.2);
}

.preview-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--sr-text-muted, #9a9588);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 8px;
  font-size: 12px;
  color: var(--sr-text-secondary, #6a6560);
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(200, 195, 188, 0.55);
}

.preview-content {
  padding: 14px 16px;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--sr-text-secondary, #6a6560);
  max-height: 120px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-info {
  margin-top: 10px;
}

/* Modal */
.prompt-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.prompt-modal {
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(200, 195, 188, 0.45);
  border-radius: 20px;
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(200, 195, 188, 0.3);
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-primary, #2d2a26);
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 243, 240, 0.8);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 8px;
  color: var(--sr-text-secondary, #6a6560);
  cursor: pointer;
  transition: all 0.2s ease;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(200, 195, 188, 0.55);
}

.modal-body {
  padding: 20px 24px;
  flex: 1;
  overflow-y: auto;
}

.modal-textarea {
  width: 100%;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--sr-text-primary, #2d2a26);
  resize: vertical;
  min-height: 200px;
  outline: none;
  font-family: inherit;
}

.modal-textarea:focus {
  border-color: rgba(200, 195, 188, 0.7);
  box-shadow: 0 0 0 3px rgba(200, 195, 188, 0.1);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
}

.char-count {
  font-size: 12px;
  color: var(--sr-text-muted, #9a9588);
}

.modal-actions {
  display: flex;
  gap: 10px;
}

.btn-reset {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  background: rgba(245, 243, 240, 0.8);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--sr-text-secondary, #6a6560);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-reset:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(200, 195, 188, 0.55);
}

.btn-cancel {
  padding: 8px 18px;
  background: rgba(245, 243, 240, 0.8);
  border: 1px solid rgba(200, 195, 188, 0.35);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-secondary, #6a6560);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.95);
  border-color: rgba(200, 195, 188, 0.55);
}

.btn-save {
  padding: 8px 18px;
  background: rgba(168, 179, 168, 0.15);
  border: 1px solid rgba(168, 179, 168, 0.4);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #889888;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-save:hover {
  background: rgba(168, 179, 168, 0.25);
  border-color: rgba(168, 179, 168, 0.6);
}

/* Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-scale-enter-active,
.modal-scale-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.modal-scale-enter-from,
.modal-scale-leave-to {
  transform: scale(0.96);
  opacity: 0;
}
</style>
