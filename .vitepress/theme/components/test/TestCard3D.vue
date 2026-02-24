<template>
  <div 
    class="test-card"
    :class="[test.status]"
    @click="$emit('click')"
  >
    <div class="card-header">
      <div class="status-indicator" :class="test.status">
        <span class="status-icon">{{ statusIcon }}</span>
      </div>
      <h3 class="test-name">{{ test.name }}</h3>
    </div>
    
    <p class="test-description">{{ test.description }}</p>
    
    <div class="card-footer">
      <button 
        class="btn-run"
        :class="{ 'running': test.status === 'running' }"
        @click.stop="$emit('run')"
        :disabled="test.status === 'running'"
      >
        <span v-if="test.status === 'running'" class="spinner"></span>
        <span v-else>▶</span>
        <span>{{ runButtonText }}</span>
      </button>
      
      <span v-if="test.result" class="result-hint">
        点击查看详情
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TestCase {
  name: string
  description: string
  status: 'pending' | 'running' | 'success' | 'error'
  result?: string
  rawResult?: string
  error?: boolean
}

const props = defineProps<{
  test: TestCase
}>()

defineEmits<{
  run: []
  click: []
}>()

const statusIcon = computed(() => {
  const icons: Record<string, string> = {
    pending: '⏳',
    running: '🔄',
    success: '✅',
    error: '❌'
  }
  return icons[props.test.status] || '⏳'
})

const runButtonText = computed(() => {
  const texts: Record<string, string> = {
    pending: '测试',
    running: '执行中',
    success: '重测',
    error: '重试'
  }
  return texts[props.test.status] || '测试'
})
</script>

<style scoped>
.test-card {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.test-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #cbd5e1;
}

.test-card.success {
  border-left: 4px solid #10b981;
}

.test-card.error {
  border-left: 4px solid #ef4444;
}

.test-card.running {
  border-left: 4px solid #3b82f6;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.status-indicator {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  background: #f1f5f9;
}

.status-indicator.success {
  background: #d1fae5;
}

.status-indicator.error {
  background: #fee2e2;
}

.status-indicator.running {
  background: #dbeafe;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.test-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.test-description {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  color: #64748b;
  line-height: 1.5;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-run {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  background: #f1f5f9;
  color: #374151;
}

.btn-run:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-run.running {
  background: #dbeafe;
  color: #1e40af;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.result-hint {
  font-size: 0.75rem;
  color: #94a3b8;
  padding: 0.25rem 0.5rem;
  background: #f8fafc;
  border-radius: 4px;
}
</style>
