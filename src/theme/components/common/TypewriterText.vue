<template>
  <span class="typewriter-text">{{ displayText }}</span>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = defineProps<{
  text?: string
  content?: string
  speed?: number
  delay?: number
}>()

const displayText = ref('')
const isTyping = ref(false)

const typeText = async () => {
  if (isTyping.value) return
  
  const sourceText = props.text ?? props.content ?? ''
  if (!sourceText) return
  
  isTyping.value = true
  displayText.value = ''
  
  if (props.delay) {
    await new Promise(resolve => setTimeout(resolve, props.delay))
  }
  
  const chars = sourceText.split('')
  for (let i = 0; i < chars.length; i++) {
    displayText.value += chars[i]
    await new Promise(resolve => setTimeout(resolve, props.speed || 30))
  }
  
  isTyping.value = false
}

watch(() => props.text ?? props.content, () => {
  typeText()
}, { immediate: true })

onMounted(() => {
  typeText()
})
</script>

<style scoped>
.typewriter-text {
  display: inline;
}

.typewriter-text::after {
  content: '|';
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>
