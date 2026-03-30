<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="show" class="confirm-overlay" @click="onCancel">
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-header">
            <span class="warning-icon">⚠️</span>
            <h3>{{ title }}</h3>
          </div>
          
          <div class="confirm-content">
            <p class="confirm-message">{{ message }}</p>
            <div v-if="details.length > 0" class="confirm-details">
              <div v-for="(detail, index) in details" :key="index" class="detail-item">
                <span class="detail-label">{{ detail.label }}:</span>
                <span class="detail-value">{{ detail.value }}</span>
              </div>
            </div>
          </div>
          
          <div class="confirm-actions">
            <button class="btn-cancel" @click="onCancel">
              {{ cancelText }}
            </button>
            <button class="btn-confirm" @click="onConfirm">
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface DetailItem {
  label: string
  value: string
}

interface Props {
  show: boolean
  title?: string
  message: string
  details?: DetailItem[]
  confirmText?: string
  cancelText?: string
}

withDefaults(defineProps<Props>(), {
  title: '确认操作',
  details: () => [],
  confirmText: '确认',
  cancelText: '取消'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.confirm-dialog {
  background: var(--vp-c-bg);
  border-radius: 12px;
  padding: 24px;
  max-width: 480px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.confirm-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.warning-icon {
  font-size: 28px;
}

.confirm-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--vp-c-text-1);
}

.confirm-message {
  margin: 0 0 16px 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
}

.confirm-details {
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  padding: 6px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  color: var(--vp-c-text-2);
  min-width: 80px;
  font-size: 13px;
}

.detail-value {
  color: var(--vp-c-text-1);
  font-weight: 500;
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
}

.confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn-cancel, .btn-confirm {
  padding: 10px 20px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-cancel:hover {
  background: var(--vp-c-bg-mute);
}

.btn-confirm {
  background: #d32f2f;
  color: white;
}

.btn-confirm:hover {
  background: #b71c1c;
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
