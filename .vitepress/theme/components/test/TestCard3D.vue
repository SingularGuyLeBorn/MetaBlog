<template>
  <div 
    class="test-card-3d"
    :class="[test.status, { 'flipped': showResult }]"
    @click="flipCard"
  >
    <!-- 正面 -->
    <div class="card-front">
      <div class="card-glow"></div>
      <div class="card-content">
        <div class="card-header">
          <div class="status-indicator" :class="test.status">
            <div class="status-pulse"></div>
            <span class="status-icon">{{ statusIcon }}</span>
          </div>
          <h3 class="test-name">{{ test.name }}</h3>
        </div>
        
        <p class="test-description">{{ test.description }}</p>
        
        <div class="card-actions">
          <button 
            class="btn-run"
            :class="{ 'running': test.status === 'running' }"
            @click.stop="$emit('run')"
            :disabled="test.status === 'running'"
          >
            <span class="btn-icon">
              <svg v-if="test.status === 'running'" class="spinner" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" 
                        stroke-dasharray="60" stroke-dashoffset="20" stroke-linecap="round"/>
              </svg>
              <span v-else>▶</span>
            </span>
            <span class="btn-text">{{ runButtonText }}</span>
          </button>
          
          <button 
            v-if="test.result"
            class="btn-view"
            @click.stop="showResult = !showResult"
          >
            {{ showResult ? '收起' : '查看' }}
          </button>
        </div>
      </div>
      
      <!-- 装饰元素 -->
      <div class="card-decoration">
        <div class="deco-line"></div>
        <div class="deco-dot"></div>
      </div>
    </div>
    
    <!-- 背面 - 结果展示 -->
    <div class="card-back" v-if="test.result">
      <div class="result-header">
        <span class="result-badge" :class="test.status">{{ resultBadge }}</span>
        <div class="result-actions">
          <button 
            v-if="test.rawResult"
            class="btn-toggle-raw"
            @click.stop="showRaw = !showRaw"
          >
            {{ showRaw ? '📝 格式化' : '⚙️ 原始数据' }}
          </button>
          <button class="btn-close" @click.stop="showResult = false">✕</button>
        </div>
      </div>
      <div class="result-content">
        <pre class="result-text" :class="{ error: test.error, 'raw-mode': showRaw }">{{ displayResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

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
}>()

const showResult = ref(false)
const showRaw = ref(false)

const displayResult = computed(() => {
  return showRaw.value && props.test.rawResult ? props.test.rawResult : props.test.result
})

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
    pending: '开始测试',
    running: '运行中...',
    success: '再次测试',
    error: '重试'
  }
  return texts[props.test.status] || '测试'
})

const resultBadge = computed(() => {
  return props.test.status === 'success' ? '测试通过' : '测试失败'
})

function flipCard() {
  if (props.test.result) {
    showResult.value = !showResult.value
  }
}
</script>

<style scoped>
.test-card-3d {
  position: relative;
  min-height: 180px;
  perspective: 1000px;
  cursor: pointer;
}

.card-front,
.card-back {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 1.5rem;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
  backface-visibility: hidden;
  overflow: hidden;
}

.card-front {
  z-index: 2;
}

.card-back {
  transform: rotateY(180deg);
  background: rgba(10, 10, 15, 0.95);
  display: flex;
  flex-direction: column;
}

.test-card-3d.flipped .card-front {
  transform: rotateY(-180deg);
}

.test-card-3d.flipped .card-back {
  transform: rotateY(0);
}

/* 发光效果 */
.card-glow {
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, transparent, rgba(139, 92, 246, 0.1), transparent);
  border-radius: 20px;
  opacity: 0;
  transition: opacity 0.3s;
}

.test-card-3d:hover .card-glow {
  opacity: 1;
}

.test-card-3d.success {
  --accent-color: #10b981;
}

.test-card-3d.error {
  --accent-color: #ef4444;
}

.test-card-3d.running {
  --accent-color: #8b5cf6;
}

.test-card-3d.success .card-front {
  border-color: rgba(16, 185, 129, 0.3);
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.1);
}

.test-card-3d.error .card-front {
  border-color: rgba(239, 68, 68, 0.3);
  box-shadow: 0 0 30px rgba(239, 68, 68, 0.1);
}

.test-card-3d.running .card-front {
  border-color: rgba(139, 92, 246, 0.3);
  box-shadow: 0 0 30px rgba(139, 92, 246, 0.1);
}

/* 内容区 */
.card-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.status-indicator {
  position: relative;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.3s;
}

.status-indicator.success {
  background: rgba(16, 185, 129, 0.2);
}

.status-indicator.error {
  background: rgba(239, 68, 68, 0.2);
}

.status-indicator.running {
  background: rgba(139, 92, 246, 0.2);
}

.status-pulse {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  animation: none;
}

.status-indicator.running .status-pulse {
  animation: pulse-ring 1.5s ease-out infinite;
  background: rgba(139, 92, 246, 0.3);
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.status-icon {
  font-size: 1.2rem;
  z-index: 1;
}

.test-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  flex: 1;
}

.test-description {
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.5;
  flex: 1;
}

/* 按钮 */
.card-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
}

.btn-run,
.btn-view {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-run {
  background: linear-gradient(135deg, #8b5cf6, #06b6d4);
  color: white;
}

.btn-run:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
}

.btn-run.running {
  background: rgba(139, 92, 246, 0.2);
  cursor: not-allowed;
}

.btn-view {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.btn-view:hover {
  background: rgba(255, 255, 255, 0.2);
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 装饰元素 */
.card-decoration {
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  opacity: 0.3;
}

.deco-line {
  width: 30px;
  height: 2px;
  background: linear-gradient(90deg, var(--accent-color, #8b5cf6), transparent);
  border-radius: 1px;
}

.deco-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent-color, #8b5cf6);
}

/* 背面样式 */
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.result-badge {
  padding: 0.3rem 0.8rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.result-badge.success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.result-badge.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-toggle-raw {
  padding: 0.25rem 0.75rem;
  border: none;
  border-radius: 6px;
  background: rgba(139, 92, 246, 0.2);
  color: #a78bfa;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-toggle-raw:hover {
  background: rgba(139, 92, 246, 0.3);
}

.btn-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: rgba(255, 255, 255, 0.2);
}

.result-content {
  flex: 1;
  overflow: auto;
}

.result-text {
  margin: 0;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  font-size: 0.85rem;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  color: rgba(255, 255, 255, 0.9);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.6;
}

.result-text.error {
  color: #fca5a5;
}

.result-text.raw-mode {
  font-size: 0.75rem;
  background: rgba(10, 10, 15, 0.8);
  border: 1px solid rgba(139, 92, 246, 0.2);
}

/* 滚动条 */
.result-text::-webkit-scrollbar {
  width: 6px;
}

.result-text::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
}

.result-text::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
</style>
