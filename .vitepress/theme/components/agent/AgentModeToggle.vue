<script setup lang="ts">
/**
 * AgentModeToggle - 模式切换器
 * MANUAL / COLLAB / AGENT 三模式切换
 */
import { computed } from 'vue'
import type { EditorMode } from '../../../agent/core/types'

interface Props {
  mode: EditorMode
}

const props = defineProps<Props>()
const emit = defineEmits(['change'])

const modes: { key: EditorMode; label: string; icon: string; description: string }[] = [
  { 
    key: 'MANUAL', 
    label: '人工', 
    icon: '👤',
    description: '完全手动编辑'
  },
  { 
    key: 'COLLAB', 
    label: '协作', 
    icon: '🤝',
    description: 'AI 实时建议'
  },
  { 
    key: 'AGENT', 
    label: '托管', 
    icon: '🤖',
    description: 'Agent 自动执行'
  }
]

const currentMode = computed(() => modes.find(m => m.key === props.mode))

function switchMode(mode: EditorMode) {
  if (mode !== props.mode) {
    emit('change', mode)
  }
}
</script>

<template>
  <div class="agent-mode-toggle">
    <div class="mode-segmented">
      <button
        v-for="mode in modes"
        :key="mode.key"
        class="mode-btn"
        :class="{ 
          active: props.mode === mode.key,
          [mode.key.toLowerCase()]: true 
        }"
        :title="mode.description"
        @click="switchMode(mode.key)"
      >
        <span class="mode-icon">{{ mode.icon }}</span>
        <span class="mode-label">{{ mode.label }}</span>
      </button>
    </div>
    <div class="mode-indicator" :class="props.mode.toLowerCase()"></div>
  </div>
</template>

<style scoped>
.agent-mode-toggle {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.mode-segmented {
  display: flex;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.mode-btn:hover {
  color: var(--vp-c-text);
  background: var(--vp-c-bg-alt);
}

.mode-btn.active {
  color: white;
  font-weight: 500;
}

.mode-btn.active.manual {
  background: #6b7280;
}

.mode-btn.active.collab {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.mode-btn.active.agent {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.mode-icon {
  font-size: 14px;
}

.mode-label {
  font-size: 12px;
}

/* 底部状态指示条 */
.mode-indicator {
  width: 100%;
  height: 2px;
  border-radius: 1px;
  transition: all 0.3s;
}

.mode-indicator.manual {
  background: #6b7280;
}

.mode-indicator.collab {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  animation: glow 2s ease-in-out infinite;
}

.mode-indicator.agent {
  background: linear-gradient(90deg, #11998e 0%, #38ef7d 100%);
  animation: glow 2s ease-in-out infinite;
}

@keyframes glow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* 切换动画 */
.mode-btn {
  position: relative;
  overflow: hidden;
}

.mode-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.3s;
}

.mode-btn:active::before {
  opacity: 1;
}
</style>
