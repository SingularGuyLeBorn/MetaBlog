<template>
  <Teleport to="body">
    <Transition name="fullscreen">
      <div v-if="visible" class="fullscreen-panel">
        <!-- Header -->
        <div class="panel-header">
          <div class="header-left">
            <button class="btn-back" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              <span>返回</span>
            </button>
            <div class="header-title">
              <slot name="title">{{ title }}</slot>
            </div>
          </div>
          <div class="header-actions">
            <slot name="actions"></slot>
          </div>
        </div>
        
        <!-- Content -->
        <div class="panel-content">
          <slot></slot>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
  title?: string
}>()

const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<style scoped>
.fullscreen-panel {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--vp-c-bg, #ffffff);
  display: flex;
  flex-direction: column;
}

.panel-header {
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--vp-c-divider, #e8e8e8);
  background: var(--vp-c-bg-soft, #f5f5f5);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-back {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--vp-c-divider, #e8e8e8);
  border-radius: 8px;
  background: var(--vp-c-bg, #ffffff);
  color: var(--vp-c-text-1, #262626);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-back:hover {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
  border-color: var(--vp-c-brand, #1677ff);
}

.btn-back svg {
  width: 18px;
  height: 18px;
}

.header-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1, #262626);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
}

/* Transitions */
.fullscreen-enter-active,
.fullscreen-leave-active {
  transition: all 0.3s ease;
}

.fullscreen-enter-from,
.fullscreen-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
  .panel-header {
    padding: 0 16px;
    height: 56px;
  }
  
  .btn-back span {
    display: none;
  }
  
  .header-title {
    font-size: 16px;
  }
  
  .panel-content {
    padding: 16px;
  }
}
</style>
