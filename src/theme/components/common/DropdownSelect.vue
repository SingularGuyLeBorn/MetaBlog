<template>
  <div class="dropdown-select" ref="dropdownRef">
    <div
      class="dropdown-trigger"
      :class="{ open: isOpen }"
      @click="toggle"
    >
      <span class="dropdown-value" :class="{ placeholder: !modelValue }">
        {{ displayLabel }}
      </span>
      <Icon name="chevron-down" :size="14" class="dropdown-arrow" :class="{ open: isOpen }" />
    </div>
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-show="isOpen"
          ref="menuRef"
          class="dropdown-menu"
          :style="menuStyle"
        >
          <div
            v-for="opt in options"
            :key="opt.value"
            class="dropdown-option"
            :class="{ active: modelValue === opt.value }"
            @click="select(opt.value)"
          >
            <span v-if="opt.icon" class="option-icon">{{ opt.icon }}</span>
            <span class="option-label">{{ opt.label }}</span>
            <Icon v-if="modelValue === opt.value" name="check" :size="12" class="option-check" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { Icon } from './index'
import { computed, onBeforeUnmount, onMounted, ref, nextTick, watch } from 'vue'

interface Option {
  value: string
  label: string
  icon?: string
}

const props = defineProps<{
  modelValue: string
  options: Option[]
  placeholder?: string
  size?: 'small' | 'medium'
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}>()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

const displayLabel = computed(() => {
  const found = props.options.find(o => o.value === props.modelValue)
  return found ? found.label : (props.placeholder || '')
})

const triggerPadding = computed(() => props.size === 'small' ? '8px 12px' : '10px 14px')
const triggerFontSize = computed(() => props.size === 'small' ? '13px' : '14px')

function toggle() {
  isOpen.value = !isOpen.value
}

watch(isOpen, (open) => {
  if (open) {
    nextTick(() => {
      adjustPosition()
    })
  }
})

function select(value: string) {
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
}

function adjustPosition() {
  const trigger = dropdownRef.value
  const menu = menuRef.value
  if (!trigger || !menu) return

  const rect = trigger.getBoundingClientRect()
  const menuHeight = Math.min(menu.scrollHeight || 240, 280)
  const spaceBelow = window.innerHeight - rect.bottom - 12
  const spaceAbove = rect.top - 12

  // 决定向上还是向下展开
  const shouldOpenUp = spaceBelow < menuHeight && spaceAbove > spaceBelow

  const top = shouldOpenUp
    ? `${rect.top - menuHeight - 6}px`
    : `${rect.bottom + 6}px`

  menuStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    top,
    width: `${rect.width}px`,
    maxHeight: `${Math.max(shouldOpenUp ? spaceAbove : spaceBelow, 120)}px`,
  }
}

function handleClickOutside(event: MouseEvent) {
  const target = event.target as Node
  if (
    dropdownRef.value && !dropdownRef.value.contains(target) &&
    menuRef.value && !menuRef.value.contains(target)
  ) {
    isOpen.value = false
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

function handleResize() {
  if (isOpen.value) {
    adjustPosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside, true)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('resize', handleResize)
  window.addEventListener('scroll', handleResize, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleResize, true)
})
</script>

<style scoped>
.dropdown-select {
  position: relative;
  width: 100%;
  user-select: none;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: v-bind(triggerPadding);
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 12px;
  font-size: v-bind(triggerFontSize);
  color: var(--sr-text-primary, #1a1a2e);
  cursor: pointer;
  transition: all 0.2s;
}

.dropdown-trigger:hover {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(184, 160, 144, 0.4);
}

.dropdown-trigger.open {
  border-color: var(--sr-accent-star, #b8a090);
  box-shadow: 0 0 0 3px rgba(184, 160, 144, 0.12);
}

.dropdown-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-value.placeholder {
  color: var(--sr-text-muted, #94a3b8);
}

.dropdown-arrow {
  flex-shrink: 0;
  color: var(--sr-text-muted, #94a3b8);
  transition: transform 0.2s;
  margin-left: 4px;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  z-index: 9999;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(200, 195, 188, 0.3);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  padding: 6px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

/* 自定义滚动条 */
.dropdown-menu::-webkit-scrollbar {
  width: 5px;
}

.dropdown-menu::-webkit-scrollbar-track {
  background: transparent;
  margin: 6px 0;
}

.dropdown-menu::-webkit-scrollbar-thumb {
  background: rgba(184, 160, 144, 0.25);
  border-radius: 10px;
}

.dropdown-menu::-webkit-scrollbar-thumb:hover {
  background: rgba(184, 160, 144, 0.4);
}

.dropdown-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.dropdown-option:hover {
  background: rgba(184, 160, 144, 0.1);
}

.dropdown-option.active {
  background: rgba(184, 160, 144, 0.15);
  color: var(--sr-accent-star, #b8a090);
  font-weight: 600;
}

.option-icon {
  flex-shrink: 0;
  font-size: 16px;
  line-height: 1;
}

.option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-check {
  flex-shrink: 0;
  color: var(--sr-accent-star, #b8a090);
}

/* 过渡动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.97);
}
</style>
