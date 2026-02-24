<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-overlay" @click.self="close">
        <div class="modal-container" :class="{ 'light-theme': true }">
          <div class="modal-header">
            <div class="modal-title">
              <span class="test-status-icon" :class="test?.status">{{ statusIcon }}</span>
              <div class="title-content">
                <h3>{{ test?.name }}</h3>
                <p class="test-desc">{{ test?.description }}</p>
              </div>
            </div>
            <button class="btn-close" @click="close">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- 切换按钮 -->
            <div class="view-toggle" v-if="test?.rawResult">
              <button 
                :class="{ active: !showRaw }" 
                @click="showRaw = false"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
                格式化视图
              </button>
              <button 
                :class="{ active: showRaw }" 
                @click="showRaw = true"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                原始响应
              </button>
            </div>
            
            <!-- 内容区域 -->
            <div class="content-area">
              <div v-if="test?.status === 'running'" class="loading-state">
                <div class="spinner"></div>
                <p>正在执行测试...</p>
              </div>
              
              <div v-else-if="test?.status === 'error'" class="error-state">
                <div class="error-icon">❌</div>
                <h4>测试失败</h4>
                <pre class="error-content">{{ test?.result }}</pre>
              </div>
              
              <div v-else-if="test?.result" class="success-state">
                <pre class="result-content" :class="{ 'raw-mode': showRaw }">{{ displayContent }}</pre>
              </div>
              
              <div v-else class="empty-state">
                <p>点击"开始测试"运行此测试</p>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <div class="test-meta" v-if="test">
              <span class="meta-item">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12,6 12,12 16,14"/>
                </svg>
                {{ test.status === 'success' ? '已完成' : test.status === 'error' ? '失败' : test.status === 'running' ? '执行中' : '待测试' }}
              </span>
              <span class="meta-item" v-if="test.category">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                </svg>
                {{ test.category }}
              </span>
            </div>
            <div class="footer-actions">
              <button 
                class="btn-secondary" 
                @click="close"
              >
                关闭
              </button>
              <button 
                class="btn-primary" 
                @click="$emit('rerun')"
                :disabled="test?.status === 'running'"
              >
                <span v-if="test?.status === 'running'" class="btn-spinner"></span>
                <span v-else>重新测试</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
  category: string
}

const props = defineProps<{
  show: boolean
  test: TestCase | null
}>()

const emit = defineEmits<{
  close: []
  rerun: []
}>()

const showRaw = ref(false)

const statusIcon = computed(() => {
  const icons: Record<string, string> = {
    pending: '⏳',
    running: '🔄',
    success: '✅',
    error: '❌'
  }
  return icons[props.test?.status || 'pending']
})

const displayContent = computed(() => {
  if (!props.test) return ''
  return showRaw.value && props.test.rawResult 
    ? props.test.rawResult 
    : props.test.result || ''
})

function close() {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 2rem;
}

.modal-container {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  width: 100%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  background: linear-gradient(to right, #f8fafc, #ffffff);
}

.modal-title {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.test-status-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: #f3f4f6;
}

.test-status-icon.success {
  background: #d1fae5;
}

.test-status-icon.error {
  background: #fee2e2;
}

.test-status-icon.running {
  background: #e0e7ff;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.title-content h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
}

.test-desc {
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
  color: #6b7280;
}

.btn-close {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #e5e7eb;
  color: #374151;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.view-toggle {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.25rem;
  background: #f3f4f6;
  border-radius: 8px;
  width: fit-content;
}

.view-toggle button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.view-toggle button.active {
  background: #ffffff;
  color: #111827;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.view-toggle button:hover:not(.active) {
  color: #374151;
}

.content-area {
  flex: 1;
  overflow: auto;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 1rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-state {
  padding: 2rem;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h4 {
  margin: 0 0 1rem;
  color: #dc2626;
}

.error-content {
  text-align: left;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-family: 'Fira Code', monospace;
  font-size: 0.875rem;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 300px;
  overflow: auto;
}

.success-state {
  height: 100%;
}

.result-content {
  margin: 0;
  padding: 1.5rem;
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  color: #1f2937;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 500px;
  overflow: auto;
}

.result-content.raw-mode {
  font-size: 0.8125rem;
  background: #1e293b;
  color: #e2e8f0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #9ca3af;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: #f9fafb;
}

.test-meta {
  display: flex;
  gap: 1rem;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
}

.btn-secondary {
  padding: 0.625rem 1.25rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  color: #ffffff;
  background: #3b82f6;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary:hover:not(:disabled) {
  background: #2563eb;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 过渡动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  opacity: 0;
  transform: scale(0.95) translateY(10px);
}

/* 滚动条样式 */
.result-content::-webkit-scrollbar,
.error-content::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.result-content::-webkit-scrollbar-track,
.error-content::-webkit-scrollbar-track {
  background: transparent;
}

.result-content::-webkit-scrollbar-thumb,
.error-content::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.result-content::-webkit-scrollbar-thumb:hover,
.error-content::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.result-content.raw-mode::-webkit-scrollbar-thumb {
  background: #475569;
}

.result-content.raw-mode::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

@media (max-width: 768px) {
  .modal-overlay {
    padding: 1rem;
  }
  
  .modal-container {
    max-height: 90vh;
  }
  
  .modal-footer {
    flex-direction: column;
    gap: 1rem;
  }
  
  .footer-actions {
    width: 100%;
    justify-content: stretch;
  }
  
  .footer-actions button {
    flex: 1;
  }
}
</style>
