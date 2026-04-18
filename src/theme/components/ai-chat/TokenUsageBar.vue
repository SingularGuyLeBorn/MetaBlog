<template>
  <div 
    class="token-usage-bar"
    @mouseenter="showTooltip = true"
    @mouseleave="showTooltip = false"
  >
    <!-- 进度条 -->
    <div class="usage-track">
      <div 
        class="usage-fill"
        :style="{ 
          width: `${percent}%`,
          backgroundColor: status.color
        }"
        :class="{ 'pulse-danger': status.isDanger }"
      />
    </div>
    
    <!-- 文字信息 -->
    <div class="usage-text">
      <span class="usage-amount">{{ formatTokenCount(used) }}</span>
      <span class="usage-separator"> / </span>
      <span class="usage-total">{{ formatTokenCount(total) }}</span>
      <span class="usage-percent" :style="{ color: status.color }">({{ percent }}%)</span>
      <span v-if="status.isDanger" class="usage-warning">⚠️</span>
    </div>
    
    <!-- Hover 详情浮层 -->
    <Transition name="fade">
      <div v-if="showTooltip" class="usage-tooltip">
        <div class="tooltip-title">Token 用量详情</div>
        <div class="tooltip-row">
          <span class="tooltip-label">输入消息:</span>
          <span class="tooltip-value">{{ formatTokenCount(usage.estimatedInput) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">AI 回复:</span>
          <span class="tooltip-value">{{ formatTokenCount(usage.estimatedOutput) }}</span>
        </div>
        <div class="tooltip-divider" />
        <div class="tooltip-row total">
          <span class="tooltip-label">总计(估算):</span>
          <span class="tooltip-value">{{ formatTokenCount(used) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">模型上下文:</span>
          <span class="tooltip-value">{{ formatTokenCount(total) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="tooltip-label">状态:</span>
          <span class="tooltip-value" :style="{ color: status.color }">{{ status.label }}</span>
        </div>
        <div v-if="usage.apiReportedTotal > 0" class="tooltip-note">
          API 实际: {{ formatTokenCount(usage.apiReportedTotal) }} tokens
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatTokenCount, calculateUsagePercent, getUsageStatus } from '@/theme/utils/tokenEstimator'

interface Props {
  usage: {
    estimatedInput: number
    estimatedOutput: number
    apiReportedPrompt: number
    apiReportedCompletion: number
    apiReportedTotal: number
    lastUpdated: number
  }
  contextWindow: number  // 模型上下文窗口大小
}

const props = defineProps<Props>()
const showTooltip = ref(false)

const used = computed(() => props.usage.estimatedInput + props.usage.estimatedOutput)
const total = computed(() => props.contextWindow)
const percent = computed(() => calculateUsagePercent(used.value, total.value))
const status = computed(() => getUsageStatus(percent.value))
</script>

<style scoped>
.token-usage-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  font-size: 12px;
  user-select: none;
}

.usage-track {
  width: 80px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  overflow: hidden;
  flex-shrink: 0;
}

.usage-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.pulse-danger {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.usage-text {
  display: flex;
  align-items: center;
  gap: 2px;
  color: #6b7280;
  white-space: nowrap;
}

.usage-amount {
  font-weight: 600;
  color: #374151;
}

.usage-total {
  color: #6b7280;
}

.usage-percent {
  font-weight: 500;
  margin-left: 2px;
}

.usage-warning {
  margin-left: 2px;
}

/* Tooltip */
.usage-tooltip {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 100;
  min-width: 220px;
  padding: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  font-size: 12px;
  line-height: 1.5;
}

.tooltip-title {
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}

.tooltip-row.total {
  font-weight: 600;
  color: #111827;
}

.tooltip-label {
  color: #6b7280;
}

.tooltip-value {
  color: #374151;
  font-family: monospace;
}

.tooltip-divider {
  height: 1px;
  background: #f3f4f6;
  margin: 6px 0;
}

.tooltip-note {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f3f4f6;
  color: #9ca3af;
  font-size: 11px;
}

/* Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .usage-track {
    background: #374151;
  }
  
  .usage-text {
    color: #9ca3af;
  }
  
  .usage-amount {
    color: #e5e7eb;
  }
  
  .usage-tooltip {
    background: #1f2937;
    border-color: #374151;
  }
  
  .tooltip-title {
    color: #f9fafb;
    border-color: #374151;
  }
  
  .tooltip-value {
    color: #e5e7eb;
  }
}
</style>
