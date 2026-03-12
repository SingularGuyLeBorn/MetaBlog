<!--
  GlassSelect - 液态玻璃 3D 下拉框组件
-->
<template>
  <div class="glass-select-wrapper" ref="wrapperRef">
    <!-- 触发按钮 -->
    <button
      class="glass-select-trigger"
      :class="{ 'is-open': isOpen, 'has-value': modelValue }"
      @click="toggleOpen"
    >
      <div class="trigger-glass"></div>
      <div class="trigger-content">
        <span class="selected-label">{{ selectedLabel }}</span>
        <span class="selected-sub" v-if="selectedSubLabel">{{ selectedSubLabel }}</span>
      </div>
      <div class="trigger-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>
    </button>

    <!-- 下拉菜单 -->
    <Transition name="glass-dropdown">
      <div v-if="isOpen" class="glass-dropdown" :style="dropdownStyle">
        <!-- 玻璃光效 -->
        <div class="dropdown-glow"></div>
        <div class="dropdown-shine"></div>
        
        <!-- 选项列表 -->
        <div class="options-list">
          <button
            v-for="option in options"
            :key="option.value"
            class="glass-option"
            :class="{ 'is-selected': modelValue === option.value }"
            @click="selectOption(option)"
          >
            <div class="option-glass"></div>
            <div class="option-content">
              <span class="option-label">{{ option.label }}</span>
              <span class="option-sub" v-if="option.subLabel">{{ option.subLabel }}</span>
            </div>
            <div class="option-check" v-if="modelValue === option.value">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface Option {
  value: string
  label: string
  subLabel?: string
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
const dropdownStyle = ref({})

// 计算选中的标签
const selectedLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option?.label || props.placeholder || '请选择'
})

const selectedSubLabel = computed(() => {
  const option = props.options.find(o => o.value === props.modelValue)
  return option?.subLabel || ''
})

// 切换下拉框
function toggleOpen() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    nextTick(() => {
      calculatePosition()
    })
  }
}

// 选择选项
function selectOption(option: Option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

// 计算下拉框位置
function calculatePosition() {
  if (!wrapperRef.value) return
  
  const rect = wrapperRef.value.getBoundingClientRect()
  const dropdownHeight = 280 // 预估最大高度
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  
  // 如果下方空间不够，向上展开
  if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
    dropdownStyle.value = {
      bottom: 'calc(100% + 8px)',
      top: 'auto',
      transformOrigin: 'bottom center'
    }
  } else {
    dropdownStyle.value = {
      top: 'calc(100% + 8px)',
      bottom: 'auto',
      transformOrigin: 'top center'
    }
  }
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

// 监听滚动调整位置
function handleScroll() {
  if (isOpen.value) {
    calculatePosition()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('scroll', handleScroll, true)
  window.addEventListener('resize', handleScroll)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', handleScroll, true)
  window.removeEventListener('resize', handleScroll)
})

// 监听选项变化，确保有效值
watch(() => props.options, (newOptions) => {
  if (newOptions.length > 0 && !newOptions.find(o => o.value === props.modelValue)) {
    emit('update:modelValue', newOptions[0].value)
  }
}, { immediate: true })
</script>

<style scoped>
.glass-select-wrapper {
  position: relative;
  width: 100%;
}

/* ===== 触发按钮 - 液态玻璃 ===== */
.glass-select-trigger {
  position: relative;
  width: 100%;
  padding: 14px 18px;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(248, 250, 252, 0.85) 50%,
    rgba(241, 245, 249, 0.8) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.02),
    inset 0 1px 1px rgba(255, 255, 255, 0.8);
  overflow: hidden;
}

.trigger-glass {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.4) 0%,
    transparent 50%,
    rgba(255, 255, 255, 0.2) 100%
  );
  pointer-events: none;
}

.glass-select-trigger:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 8px 24px rgba(0, 0, 0, 0.08),
    0 2px 6px rgba(0, 0, 0, 0.03),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.glass-select-trigger.is-open {
  border-color: rgba(184, 160, 144, 0.3);
  box-shadow: 
    0 4px 16px rgba(184, 160, 144, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.trigger-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.selected-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-sub {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glass-select-trigger:not(.has-value) .selected-label {
  color: #94a3b8;
  font-weight: 500;
}

.trigger-arrow {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sr-text-muted, #94a3b8);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.trigger-arrow svg {
  width: 18px;
  height: 18px;
}

.glass-select-trigger.is-open .trigger-arrow {
  transform: rotate(180deg);
  color: var(--sr-morandi-purple, #b3a8b8);
}

/* ===== 下拉菜单 - 3D 玻璃 ===== */
.glass-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  background: linear-gradient(
    145deg,
    rgba(255, 255, 255, 0.95) 0%,
    rgba(248, 250, 252, 0.92) 50%,
    rgba(241, 245, 249, 0.9) 100%
  );
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 20px;
  padding: 8px;
  box-shadow: 
    0 24px 48px rgba(0, 0, 0, 0.15),
    0 8px 16px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  backdrop-filter: blur(20px);
  z-index: 1000;
  overflow: hidden;
  transform-style: preserve-3d;
  perspective: 1000px;
}

.dropdown-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle at 30% 30%,
    rgba(184, 160, 144, 0.08) 0%,
    transparent 50%
  );
  pointer-events: none;
}

.dropdown-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.3),
    transparent
  );
  animation: shine 2s infinite;
}

@keyframes shine {
  0% { left: -100%; }
  50% { left: 100%; }
  100% { left: 100%; }
}

.options-list {
  position: relative;
  z-index: 1;
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 自定义滚动条 */
.options-list::-webkit-scrollbar {
  width: 6px;
}

.options-list::-webkit-scrollbar-track {
  background: transparent;
}

.options-list::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.3);
  border-radius: 3px;
}

.options-list::-webkit-scrollbar-thumb:hover {
  background: rgba(148, 163, 184, 0.5);
}

/* ===== 选项 - 玻璃卡片 ===== */
.glass-option {
  position: relative;
  width: 100%;
  padding: 12px 14px;
  background: transparent;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  overflow: hidden;
}

.option-glass {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.3) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.glass-option:hover {
  background: rgba(184, 160, 144, 0.08);
  transform: translateX(4px);
}

.glass-option:hover .option-glass {
  opacity: 1;
}

.glass-option.is-selected {
  background: linear-gradient(
    135deg,
    rgba(184, 160, 144, 0.12) 0%,
    rgba(184, 160, 144, 0.08) 100%
  );
  border: 1px solid rgba(184, 160, 144, 0.2);
}

.glass-option.is-selected:hover {
  background: linear-gradient(
    135deg,
    rgba(184, 160, 144, 0.18) 0%,
    rgba(184, 160, 144, 0.12) 100%
  );
}

.option-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.option-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-sub {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.glass-option.is-selected .option-label {
  color: var(--sr-morandi-purple, #b3a8b8);
}

.option-check {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--sr-morandi-purple, #b3a8b8), var(--sr-accent-star, #b8a090));
  border-radius: 50%;
  color: white;
  flex-shrink: 0;
  animation: check-appear 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.option-check svg {
  width: 14px;
  height: 14px;
}

@keyframes check-appear {
  from {
    transform: scale(0) rotate(-45deg);
    opacity: 0;
  }
  to {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

/* ===== 过渡动画 ===== */
.glass-dropdown-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.glass-dropdown-leave-active {
  transition: all 0.2s ease;
}

.glass-dropdown-enter-from,
.glass-dropdown-leave-to {
  opacity: 0;
  transform: translateY(-12px) scale(0.95);
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
  .glass-select-trigger {
    padding: 12px 14px;
    border-radius: 14px;
  }
  
  .selected-sub {
    display: none;
  }
  
  .glass-dropdown {
    border-radius: 16px;
    padding: 6px;
  }
  
  .options-list {
    max-height: 240px;
  }
}
</style>
