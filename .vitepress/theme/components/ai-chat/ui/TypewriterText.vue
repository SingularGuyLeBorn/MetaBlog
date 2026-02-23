<!--
  TypewriterText - 打字机文本效果组件
  用于在思考模式下模拟流式输出的视觉效果
-->
<template>
  <span class="typewriter-text">
    {{ displayText }}<span v-if="isTyping" class="cursor">|</span>
  </span>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

interface Props {
  /** 完整文本内容 */
  text: string
  /** 打字速度（毫秒/字符） */
  speed?: number
  /** 是否启用打字效果 */
  enabled?: boolean
  /** 最小文本长度才启用打字效果（避免短文本也打字） */
  minLength?: number
}

const props = withDefaults(defineProps<Props>(), {
  speed: 25,
  enabled: true,
  minLength: 15
})

const emit = defineEmits<{
  complete: []
}>()

const displayText = ref('')
const isTyping = ref(false)
let currentIndex = 0
let timeoutId: ReturnType<typeof setTimeout> | null = null
let isCancelled = false

// 获取字符延迟
function getDelay(char: string): number {
  // 标点符号增加延迟
  if (/[。！？.!?]/.test(char)) return props.speed * 4
  if (/[，,；;：:]/.test(char)) return props.speed * 2
  // 换行增加延迟
  if (char === '\n') return props.speed * 3
  return props.speed
}

// 开始打字
function startTyping() {
  // 清理之前的状态
  stopTyping()
  
  if (!props.text) {
    displayText.value = ''
    return
  }
  
  // 不启用或文本太短，直接显示
  if (!props.enabled || props.text.length < props.minLength) {
    displayText.value = props.text
    emit('complete')
    return
  }
  
  displayText.value = ''
  currentIndex = 0
  isTyping.value = true
  isCancelled = false
  
  typeNextChar()
}

// 打下一个字符
function typeNextChar() {
  if (isCancelled || currentIndex >= props.text.length) {
    isTyping.value = false
    if (!isCancelled) {
      emit('complete')
    }
    return
  }
  
  const char = props.text[currentIndex]
  displayText.value += char
  currentIndex++
  
  const delay = getDelay(char)
  timeoutId = setTimeout(() => {
    typeNextChar()
  }, delay)
}

// 停止打字
function stopTyping() {
  isCancelled = true
  isTyping.value = false
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

// 立即完成
function complete() {
  stopTyping()
  displayText.value = props.text
  emit('complete')
}

// 监听文本变化
watch(() => props.text, (newText, oldText) => {
  if (newText !== oldText) {
    // 如果文本是追加的，从当前位置继续
    if (oldText && newText.startsWith(oldText) && displayText.value === oldText) {
      currentIndex = oldText.length
      isTyping.value = true
      isCancelled = false
      typeNextChar()
    } else {
      // 全新文本，重新开始
      startTyping()
    }
  }
}, { immediate: true })

// 组件卸载时清理
onUnmounted(() => {
  stopTyping()
})

// 暴露方法给父组件
defineExpose({
  complete,
  stop: stopTyping
})
</script>

<style scoped>
.typewriter-text {
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background: currentColor;
  margin-left: 2px;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
</style>
