<template>
  <div class="glass-select-wrapper" ref="wrapperRef">
    <button
      class="glass-select-trigger"
      :class="{ 'is-open': isOpen }"
      @click="toggleOpen"
    >
      <span class="selected-label">{{ selectedLabel }}</span>
      <span class="trigger-arrow">▼</span>
    </button>
    <div v-if="isOpen" class="glass-dropdown">
      <div
        v-for="option in options"
        :key="option.value"
        class="glass-option"
        :class="{ 'is-selected': option.value === modelValue }"
        @click="selectOption(option)"
      >
        {{ option.label }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Option {
  value: string
  label: string
}

const props = defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const isOpen = ref(false)
const wrapperRef = ref<HTMLElement>()

const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option?.label || props.placeholder || '请选择'
})

function toggleOpen() {
  isOpen.value = !isOpen.value
}

function selectOption(option: Option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}
</script>

<style scoped>
.glass-select-wrapper {
  position: relative;
}

.glass-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  cursor: pointer;
  font-size: 14px;
}

.glass-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 8px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
}

.glass-option {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 14px;
}

.glass-option:hover,
.glass-option.is-selected {
  background: rgba(0, 0, 0, 0.05);
}
</style>
