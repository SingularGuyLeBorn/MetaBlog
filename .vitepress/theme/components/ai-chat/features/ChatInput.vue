<!--
  ChatInput - 输入框组件
-->
<template>
  <div class="chat-input">
    <div class="input-container">
      <button class="attach-btn" @click="$emit('attach')">
        <Icon name="paperclip" :size="20" />
      </button>
      
      <textarea
        ref="textareaRef"
        v-model="inputValue"
        class="input-field"
        :placeholder="isStreaming ? 'AI 思考中...' : '输入消息，按 Enter 发送...'"
        :disabled="isStreaming"
        rows="1"
        @keydown="handleKeydown"
        @input="autoResize"
      ></textarea>
      
      <button
        v-if="isStreaming"
        class="send-btn stop"
        @click="$emit('stop')"
      >
        <Icon name="stop" :size="20" />
      </button>
      <button
        v-else
        class="send-btn"
        :disabled="!inputValue.trim()"
        @click="handleSend"
      >
        <Icon name="send" :size="20" />
      </button>
    </div>
    <div class="input-hint">
      <span>Enter 发送 · Shift+Enter 换行</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Icon } from '../ui'

interface Props {
  modelValue: string
  isStreaming: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: []
  stop: []
  attach: []
}>()

const textareaRef = ref<HTMLTextAreaElement>()
const inputValue = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  if (val !== inputValue.value) {
    inputValue.value = val
  }
})

watch(inputValue, (val) => {
  emit('update:modelValue', val)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function autoResize() {
  const textarea = textareaRef.value
  if (!textarea) return
  
  textarea.style.height = 'auto'
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
}

function handleSend() {
  if (!inputValue.value.trim() || props.isStreaming) return
  emit('send')
  inputValue.value = ''
  
  nextTick(() => {
    const textarea = textareaRef.value
    if (textarea) {
      textarea.style.height = 'auto'
    }
  })
}

defineExpose({
  focus() {
    textareaRef.value?.focus()
  }
})
</script>

<style scoped>

.chat-input {
  padding: var(--ai-space-4) var(--ai-space-6);
  background: var(--ai-bg-sidebar);
  border-top: 1px solid var(--ai-border-light);
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: var(--ai-space-3);
  padding: var(--ai-space-3);
  background: var(--ai-gray-100);
  border: 1px solid var(--ai-border-light);
  border-radius: var(--ai-radius-xl);
  transition: all var(--ai-transition-fast);
}

.input-container:focus-within {
  border-color: var(--ai-border-focus);
  box-shadow: var(--ai-shadow-glow);
}

.attach-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: var(--ai-radius-md);
  color: var(--ai-text-tertiary);
  cursor: pointer;
  transition: all var(--ai-transition-fast);
  flex-shrink: 0;
}

.attach-btn:hover {
  background: var(--ai-gray-200);
  color: var(--ai-text-primary);
}

.input-field {
  flex: 1;
  background: transparent;
  border: none;
  padding: 8px 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ai-text-primary);
  resize: none;
  min-height: 24px;
  max-height: 200px;
  outline: none;
}

.input-field::placeholder {
  color: var(--ai-text-muted);
}

.send-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ai-primary-600);
  border: none;
  border-radius: var(--ai-radius-md);
  color: white;
  cursor: pointer;
  transition: all var(--ai-transition-fast);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: var(--ai-primary-700);
  transform: scale(1.05);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-btn.stop {
  background: #ef4444;
  animation: pulse 1.5s ease-in-out infinite;
}

.send-btn.stop:hover {
  background: #dc2626;
}

.input-hint {
  text-align: center;
  margin-top: var(--ai-space-2);
  font-size: 12px;
  color: var(--ai-text-muted);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
