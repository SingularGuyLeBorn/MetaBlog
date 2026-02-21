<!--
  Button - 按钮组件
-->
<template>
  <button
    class="btn"
    :class="[variant, size, { loading, block }]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="btn-spinner">
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="60" stroke-dashoffset="20"/>
      </svg>
    </span>
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  block?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md'
})

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 500;
  border-radius: var(--ai-radius-md);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--ai-transition-fast);
  outline: none;
}

.btn:focus-visible {
  box-shadow: var(--ai-shadow-glow);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 尺寸 */
.btn.sm {
  padding: 6px 12px;
  font-size: 13px;
}

.btn.md {
  padding: 10px 16px;
  font-size: 14px;
}

.btn.lg {
  padding: 12px 24px;
  font-size: 15px;
}

/* 变体 */
.btn.primary {
  background: var(--ai-primary-600);
  color: white;
  border-color: var(--ai-primary-600);
}

.btn.primary:hover:not(:disabled) {
  background: var(--ai-primary-700);
  border-color: var(--ai-primary-700);
}

.btn.secondary {
  background: white;
  color: var(--ai-text-secondary);
  border-color: var(--ai-border-light);
}

.btn.secondary:hover:not(:disabled) {
  background: var(--ai-gray-50);
  border-color: var(--ai-border-default);
  color: var(--ai-text-primary);
}

.btn.ghost {
  background: transparent;
  color: var(--ai-text-secondary);
}

.btn.ghost:hover:not(:disabled) {
  background: var(--ai-gray-100);
  color: var(--ai-text-primary);
}

.btn.danger {
  background: #ef4444;
  color: white;
  border-color: #ef4444;
}

.btn.danger:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
}

/* 加载状态 */
.btn.loading {
  pointer-events: none;
}

.btn-spinner {
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
}

.btn-spinner svg {
  width: 100%;
  height: 100%;
}

/* 块级 */
.btn.block {
  width: 100%;
}
</style>
