<!--
  ChatInput - 智能输入框（支持 / 技能和 @ 引用）
  
  发送给 AI 的消息格式：
  用户看到："请总结 @Docker入门教程 的重点"
  实际发送："请总结以下文章的重点：\n\n<reference title="Docker入门教程" path="...">[文章内容]</reference>\n\n请总结这篇文章的重点。"
-->
<template>
  <div class="chat-input">
    <div class="input-container">
      <button class="attach-btn" @click="$emit('attach')">
        <Icon name="paperclip" :size="20" />
      </button>
      
      <div class="input-wrapper">
        <MentionInput
          ref="mentionInputRef"
          v-model="inputValue"
          :placeholder="isStreaming ? 'AI 思考中，可继续输入下一条...' : '输入消息，/ 选择技能，@ 引用文章，按 Enter 发送...'"
          :selected-skill="effectiveSkill"
          @skill-change="handleSkillChange"
          @mentions-change="handleMentionsChange"
          @send="handleSend"
        />
      </div>
      
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
        :disabled="!canSend"
        @click="handleSend"
      >
        <Icon name="send" :size="20" />
      </button>
    </div>
    <div class="input-hint">
      <span>Enter 发送 · Shift+Enter 换行 · / 技能 · @ 引用</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '../../../ui'
import MentionInput, { type Mention } from '../../../ui/MentionInput.vue'
import type { Skill } from '../../../core/composables/useSkills'

const props = defineProps<{
  modelValue: string
  isStreaming: boolean
  selectedSkill?: Skill
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  send: [content: string, skill?: Skill]
  stop: []
  attach: []
  selectSkill: [skill: Skill | undefined]
}>()

const mentionInputRef = ref<InstanceType<typeof MentionInput>>()
const inputValue = ref(props.modelValue)
const currentSkill = ref<Skill | undefined>()
const currentMentions = ref<Mention[]>([])

// 合并外部传入的技能和本地选择的技能
const effectiveSkill = computed(() => {
  return props.selectedSkill || currentSkill.value
})

const canSend = computed(() => {
  return inputValue.value.trim().length > 0 && !props.isStreaming
})

function handleSkillChange(skill: Skill | null) {
  currentSkill.value = skill || undefined
  emit('selectSkill', skill || undefined)
}

function handleMentionsChange(mentions: Mention[]) {
  currentMentions.value = mentions
}

async function handleSend() {
  if (!inputValue.value.trim() || props.isStreaming) return
  
  // 构建发送内容
  let finalContent = inputValue.value.trim()
  
  // 如果有引用，读取文章内容并格式化为结构化引用
  if (currentMentions.value.length > 0) {
    const references: string[] = []
    
    for (const mention of currentMentions.value) {
      try {
        const response = await fetch(`/api/files/read?path=${encodeURI('sections/' + mention.path)}`)
        if (response.ok) {
          const content = await response.text()
          // 结构化引用格式
          references.push(`<reference title="${mention.title}" path="${mention.path}">\n${content}\n</reference>`)
        }
      } catch (e) {
        console.error('[ChatInput] Failed to load mention:', mention.path)
      }
    }
    
    if (references.length > 0) {
      // 构建清晰的 prompt 结构
      finalContent = `${finalContent}\n\n---\n引用资料：\n\n${references.join('\n\n')}\n---`
    }
  }
  
  // 构建技能信息（用于UI显示）
  const skillInfo = effectiveSkill.value ? {
    id: effectiveSkill.value.id,
    name: effectiveSkill.value.name,
    icon: effectiveSkill.value.icon,
    systemPrompt: effectiveSkill.value.systemPrompt
  } as Skill : undefined
  
  emit('send', finalContent, skillInfo)
  
  // 重置输入
  inputValue.value = ''
  currentSkill.value = undefined
  currentMentions.value = []
  emit('selectSkill', undefined)
  mentionInputRef.value?.clearAll()
}

// 监听外部值变化
watch(() => props.modelValue, (val) => {
  if (val !== inputValue.value) {
    inputValue.value = val
  }
})
watch(inputValue, (val) => {
  emit('update:modelValue', val)
})

// 监听外部 selectedSkill 变化，同步到 mentionInput
watch(() => props.selectedSkill, (skill) => {
  if (skill && mentionInputRef.value) {
    mentionInputRef.value.setSelectedSkill(skill)
  }
})

defineExpose({
  focus() {
    mentionInputRef.value?.focus()
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

.input-wrapper {
  flex: 1;
  min-width: 0;
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
