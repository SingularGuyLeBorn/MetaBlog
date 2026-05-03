<!--
  StreamStatusIndicator - 流式状态指示器
  展示当前 AI 回复的实时阶段（推理中/调用工具中/生成回复中...）
-->
<template>
  <Transition name="status-fade">
    <span v-if="label" class="stream-status" :class="phase">
      <span class="status-dot"></span>
      {{ label }}
    </span>
  </Transition>
</template>

<script setup lang="ts">
import { useStreamStore } from '@/theme/stores'
import { computed } from 'vue'

interface Props {
  sessionId: string | null
}

const props = defineProps<Props>()

const streamStore = useStreamStore()

const phase = computed(() => {
  if (!props.sessionId) return 'idle'
  return streamStore.streamStates.value[props.sessionId]?.phase || 'idle'
})

const label = computed(() => {
  const map: Record<string, string> = {
    idle: '',
    connecting: '连接中',
    reasoning: '推理中',
    thinking: '思考中',
    responding: '生成回复中',
    tool_calling: '调用工具中',
    complete: '',
    error: '出错了',
    interrupted: '已中断'
  }
  return map[phase.value] || ''
})
</script>

<style scoped>
.stream-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--sr-text-muted, #9a9588);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.35);
  white-space: nowrap;
  user-select: none;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sr-morandi-warm, #d4c4b0);
  animation: status-blink 1.6s ease-in-out infinite;
}

.stream-status.connecting .status-dot,
.stream-status.reasoning .status-dot,
.stream-status.thinking .status-dot {
  background: #b8b0a0;
}

.stream-status.responding .status-dot {
  background: #a0b8a8;
}

.stream-status.tool_calling .status-dot {
  background: #b0a8b8;
}

.stream-status.error .status-dot {
  background: #c9a8a8;
  animation: none;
}

@keyframes status-blink {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* 过渡动画 */
.status-fade-enter-active,
.status-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
</style>
