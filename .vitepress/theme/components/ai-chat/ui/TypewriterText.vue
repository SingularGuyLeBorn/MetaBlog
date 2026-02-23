<!--
  TypewriterText - 打字机效果组件（思考模式流式视觉）
  
  专为 deepseek-reasoner 设计：
  - 官方非流式API，但UI层模拟流式输出效果
  - 首次显示时有打字机效果
  - 再次查看时直接显示完整内容
-->
<template>
  <span class="typewriter-content" v-html="displayedContent"></span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

interface Props {
  /** 完整内容 */
  content: string
  /** 打字速度(ms/字符)，默认15 */
  speed?: number
  /** 是否启用打字机效果 */
  enabled?: boolean
  /** 内容是否为HTML */
  html?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  speed: 15,
  enabled: true,
  html: false
})

const emit = defineEmits<{
  complete: []
}>()

const displayedContent = ref('')
let timeoutId: number | null = null
let isTyping = false

/** 清理定时器 */
function clearTimer() {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
}

/** 开始打字效果 */
function startTyping() {
  if (!props.enabled || !props.content) {
    displayedContent.value = props.content
    emit('complete')
    return
  }

  // 已经在打字中，不重复开始
  if (isTyping) return
  
  isTyping = true
  const content = props.html ? props.content : escapeHtml(props.content)
  let index = 0
  displayedContent.value = ''

  const typeNext = () => {
    if (index < content.length) {
      // 处理HTML标签：如果是HTML模式，需要完整显示标签
      if (props.html && content[index] === '<') {
        const tagEnd = content.indexOf('>', index)
        if (tagEnd !== -1) {
          displayedContent.value += content.substring(index, tagEnd + 1)
          index = tagEnd + 1
        } else {
          displayedContent.value += content[index]
          index++
        }
      } else {
        displayedContent.value += content[index]
        index++
      }

      // 动态调整速度
      const char = content[index - 1]
      let delay = props.speed
      if ('。！？.!?'.includes(char)) delay *= 4
      else if ('，,；;'.includes(char)) delay *= 2
      else if (char === '\n') delay *= 2

      timeoutId = window.setTimeout(typeNext, delay)
    } else {
      isTyping = false
      emit('complete')
    }
  }

  typeNext()
}

/** 跳过打字，直接显示完整内容 */
function skip() {
  clearTimer()
  isTyping = false
  displayedContent.value = props.html ? props.content : escapeHtml(props.content)
  emit('complete')
}

/** 转义HTML特殊字符 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

// 监听内容变化
watch(() => props.content, (newContent, oldContent) => {
  if (newContent !== oldContent) {
    clearTimer()
    // 如果内容变长很多（超过100字符），可能是完整回复到了，直接显示
    if (newContent.length > (oldContent?.length || 0) + 100) {
      skip()
    } else {
      startTyping()
    }
  }
})

// 监听启用状态
watch(() => props.enabled, (enabled) => {
  if (enabled && !isTyping && displayedContent.value.length < props.content.length) {
    startTyping()
  }
})

onMounted(() => {
  startTyping()
})

// 暴露方法
defineExpose({
  skip,
  reset: () => {
    clearTimer()
    isTyping = false
    displayedContent.value = ''
    startTyping()
  }
})
</script>

<style scoped>
.typewriter-content {
  display: inline;
}
</style>
