<script setup lang="ts">
/**
 * OrbButton - AI 悬浮球按钮
 * 呼吸动画，状态指示
 */
import { computed } from 'vue'
import type { AgentState } from '../../../agent/core/types'

interface Props {
  unreadCount: number
  isOpen: boolean
  state: AgentState
}

const props = defineProps<Props>()
const emit = defineEmits(['click'])

// 根据状态获取样式
const orbClass = computed(() => ({
  'orb-open': props.isOpen,
  'orb-idle': props.state === 'IDLE',
  'orb-working': ['UNDERSTANDING', 'PLANNING', 'EXECUTING'].includes(props.state),
  'orb-paused': props.state === 'PAUSED' || props.state === 'WAITING_INPUT',
  'orb-error': props.state === 'ERROR'
}))

// 获取状态图标
const stateIcon = computed(() => {
  switch (props.state) {
    case 'UNDERSTANDING':
      return '🤔'
    case 'EXECUTING':
      return '⚡'
    case 'WAITING_INPUT':
      return '⏳'
    case 'ERROR':
      return '❌'
    default:
      return '🤖'
  }
})
</script>

<template>
  <button 
    class="ai-orb"
    :class="orbClass"
    @click="emit('click')"
  >
    <span class="orb-icon">{{ stateIcon }}</span>
    <span v-if="unreadCount > 0" class="orb-badge">
      {{ unreadCount > 9 ? '9+' : unreadCount }}
    </span>
    <span class="orb-glow"></span>
  </button>
</template>

<style scoped>
.ai-orb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
  z-index: 1001;
}

.ai-orb:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5);
}

.ai-orb:active {
  transform: scale(0.95);
}

/* 工作状态 - 呼吸动画 */
.orb-working {
  animation: breathe 2s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% {
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  }
  50% {
    box-shadow: 0 4px 30px rgba(102, 126, 234, 0.8), 0 0 60px rgba(102, 126, 234, 0.3);
  }
}

/* 暂停状态 */
.orb-paused {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  box-shadow: 0 4px 15px rgba(245, 87, 108, 0.4);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 错误状态 */
.orb-error {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
  box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
  animation: shake 0.5s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}

/* 打开状态 */
.orb-open {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  transform: rotate(360deg);
}

/* 光晕效果 */
.orb-glow {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: inherit;
  opacity: 0;
  filter: blur(10px);
  transition: opacity 0.3s;
  z-index: -1;
}

.ai-orb:hover .orb-glow {
  opacity: 0.5;
}

/* 未读消息徽章 */
.orb-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  background: #ff4757;
  color: white;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: badgePulse 2s infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 图标 */
.orb-icon {
  display: block;
  transition: transform 0.3s;
}

.ai-orb:hover .orb-icon {
  transform: scale(1.1);
}
</style>
