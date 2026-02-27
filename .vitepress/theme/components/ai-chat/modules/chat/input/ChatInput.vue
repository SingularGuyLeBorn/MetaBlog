<!--
  ChatInput - 智能输入框（3D 液态玻璃风格）
-->
<template>
  <div class="chat-input-3d">
    <div class="input-container-3d" :class="{ focused: isFocused }">
      <button class="attach-btn-3d" @click="$emit('attach')">
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
          @focus="isFocused = true"
          @blur="isFocused = false"
        />
      </div>
      
      <button
        v-if="isStreaming"
        class="send-btn-3d stop"
        @click="$emit('stop')"
      >
        <Icon name="stop" :size="20" />
      </button>
      <button
        v-else
        class="send-btn-3d"
        :disabled="!canSend"
        @click="handleSend"
      >
        <Icon name="send" :size="20" />
      </button>
    </div>
    <div class="input-hint-3d">
      <span class="hint-key">Enter</span>
      <span>发送 ·</span>
      <span class="hint-key">Shift+Enter</span>
      <span>换行 ·</span>
      <span class="hint-key">/</span>
      <span>技能 ·</span>
      <span class="hint-key">@</span>
      <span>引用</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Icon } from '../../../ui'
import MentionInput, { type Mention } from '../../../ui/MentionInput.vue'
import type { Skill } from '../../../core/types/agent'

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
const isFocused = ref(false)

const effectiveSkill = computed(() => props.selectedSkill || currentSkill.value)

const canSend = computed(() => inputValue.value.trim().length > 0 && !props.isStreaming)

function handleSkillChange(skill: Skill | null) {
  currentSkill.value = skill || undefined
  emit('selectSkill', skill || undefined)
}

function handleMentionsChange(mentions: Mention[]) {
  currentMentions.value = mentions
}

async function handleSend() {
  if (!inputValue.value.trim() || props.isStreaming) return
  
  let finalContent = inputValue.value.trim()
  
  if (currentMentions.value.length > 0) {
    const references: string[] = []
    
    for (const mention of currentMentions.value) {
      try {
        const response = await fetch(`/api/files/read?path=${encodeURI('sections/' + mention.path)}`)
        if (response.ok) {
          const content = await response.text()
          references.push(`<reference title="${mention.title}" path="${mention.path}">\n${content}\n</reference>`)
        }
      } catch (e) {
        console.error('[ChatInput] Failed to load mention:', mention.path)
      }
    }
    
    if (references.length > 0) {
      finalContent = `${finalContent}\n\n---\n引用资料：\n\n${references.join('\n\n')}\n---`
    }
  }
  
  const skillInfo = effectiveSkill.value ? {
    id: effectiveSkill.value.id,
    name: effectiveSkill.value.name,
    icon: effectiveSkill.value.icon,
    content: effectiveSkill.value.content
  } as Skill : undefined
  
  emit('send', finalContent, skillInfo)
  
  inputValue.value = ''
  currentSkill.value = undefined
  currentMentions.value = []
  emit('selectSkill', undefined)
  mentionInputRef.value?.clearAll()
}

watch(() => props.modelValue, (val) => {
  if (val !== inputValue.value) {
    inputValue.value = val
  }
})
watch(inputValue, (val) => emit('update:modelValue', val))

watch(() => props.selectedSkill, (skill) => {
  if (skill && mentionInputRef.value) {
    mentionInputRef.value.setSelectedSkill(skill)
  }
})

defineExpose({ focus() { mentionInputRef.value?.focus() } })
</script>

<style scoped>
.chat-input-3d {
  position: relative;
  padding: 20px 28px 24px;
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, #f1f5f9 100%);
  border-top: 1px solid rgba(226, 232, 240, 0.8);
  backdrop-filter: blur(10px);
}

/* 3D 输入容器 - 液态玻璃效果 */
.input-container-3d {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  padding: 14px 16px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.04),
    0 8px 24px rgba(0, 0, 0, 0.02),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  transform-style: preserve-3d;
}

.input-container-3d:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 20px rgba(0, 0, 0, 0.06),
    0 16px 40px rgba(0, 0, 0, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.input-container-3d.focused {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 
    0 0 0 4px rgba(59, 130, 246, 0.1),
    0 12px 32px rgba(59, 130, 246, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  transform: translateY(-4px);
}

/* 3D 附件按钮 */
.attach-btn-3d {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.attach-btn-3d:hover {
  background: linear-gradient(145deg, #eff6ff, #dbeafe);
  color: #3b82f6;
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px) rotate(-5deg);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.attach-btn-3d:active {
  transform: translateY(0) rotate(0);
}

.input-wrapper {
  flex: 1;
  min-width: 0;
}

/* 3D 发送按钮 */
.send-btn-3d {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  border: none;
  border-radius: 14px;
  color: white;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.4),
    0 8px 24px rgba(59, 130, 246, 0.2);
  transform-style: preserve-3d;
}

.send-btn-3d:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 
    0 8px 20px rgba(59, 130, 246, 0.5),
    0 16px 40px rgba(59, 130, 246, 0.3);
}

.send-btn-3d:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.send-btn-3d.stop {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  box-shadow: 
    0 4px 12px rgba(239, 68, 68, 0.4),
    0 8px 24px rgba(239, 68, 68, 0.2);
  animation: pulse-stop 1.5s ease-in-out infinite;
}

.send-btn-3d.stop:hover {
  box-shadow: 
    0 8px 20px rgba(239, 68, 68, 0.5),
    0 16px 40px rgba(239, 68, 68, 0.3);
}

@keyframes pulse-stop {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.85;
    transform: scale(0.95);
  }
}

/* 3D 提示文字 */
.input-hint-3d {
  text-align: center;
  margin-top: 12px;
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}

.hint-key {
  display: inline-block;
  padding: 2px 8px;
  margin: 0 2px;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* 背景装饰光效 */
.chat-input-3d::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -10%;
  width: 40%;
  height: 200%;
  background: radial-gradient(ellipse, rgba(59, 130, 246, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.chat-input-3d::after {
  content: '';
  position: absolute;
  top: -50%;
  right: -10%;
  width: 40%;
  height: 200%;
  background: radial-gradient(ellipse, rgba(139, 92, 246, 0.05) 0%, transparent 70%);
  pointer-events: none;
}
</style>
