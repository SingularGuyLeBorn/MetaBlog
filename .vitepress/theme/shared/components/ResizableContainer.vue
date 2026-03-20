<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface PanelConfig {
  minWidth: number
  maxWidth: number
  defaultWidth: number
  storageKey: string
}

const props = defineProps<{
  leftConfig: PanelConfig
  rightConfig: PanelConfig
}>()

const emit = defineEmits(['update:leftWidth', 'update:rightWidth'])

// Panel widths
const leftWidth = ref(props.leftConfig.defaultWidth)
const rightWidth = ref(props.rightConfig.defaultWidth)

// Resizing state
const isResizingLeft = ref(false)
const isResizingRight = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const startX = ref(0)
const startLeftWidth = ref(0)
const startRightWidth = ref(0)

// Load saved widths from localStorage
onMounted(() => {
  const savedLeft = localStorage.getItem(props.leftConfig.storageKey)
  const savedRight = localStorage.getItem(props.rightConfig.storageKey)
  
  if (savedLeft) {
    const width = parseInt(savedLeft, 10)
    if (width >= props.leftConfig.minWidth && width <= props.leftConfig.maxWidth) {
      leftWidth.value = width
    }
  }
  
  if (savedRight) {
    const width = parseInt(savedRight, 10)
    if (width >= props.rightConfig.minWidth && width <= props.rightConfig.maxWidth) {
      rightWidth.value = width
    }
  }
  
  emit('update:leftWidth', leftWidth.value)
  emit('update:rightWidth', rightWidth.value)
})

// Handle mouse events for resizing
const startResizeLeft = (e: MouseEvent) => {
  isResizingLeft.value = true
  startX.value = e.clientX
  startLeftWidth.value = leftWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const startResizeRight = (e: MouseEvent) => {
  isResizingRight.value = true
  startX.value = e.clientX
  startRightWidth.value = rightWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isResizingLeft.value && !isResizingRight.value) return
  
  const deltaX = e.clientX - startX.value
  
  if (isResizingLeft.value) {
    const newWidth = startLeftWidth.value + deltaX
    if (newWidth >= props.leftConfig.minWidth && newWidth <= props.leftConfig.maxWidth) {
      leftWidth.value = newWidth
      emit('update:leftWidth', newWidth)
    }
  }
  
  if (isResizingRight.value) {
    const newWidth = startRightWidth.value - deltaX
    if (newWidth >= props.rightConfig.minWidth && newWidth <= props.rightConfig.maxWidth) {
      rightWidth.value = newWidth
      emit('update:rightWidth', newWidth)
    }
  }
}

const stopResize = () => {
  if (isResizingLeft.value || isResizingRight.value) {
    isResizingLeft.value = false
    isResizingRight.value = false
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    
    // Save to localStorage
    localStorage.setItem(props.leftConfig.storageKey, leftWidth.value.toString())
    localStorage.setItem(props.rightConfig.storageKey, rightWidth.value.toString())
  }
}

// Add/remove global event listeners
onMounted(() => {
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', stopResize)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <div ref="containerRef" class="resizable-container">
    <!-- Left Panel -->
    <div 
      class="panel left-panel" 
      :style="{ width: leftWidth + 'px', minWidth: leftWidth + 'px' }"
    >
      <slot name="left" />
    </div>
    
    <!-- Left Resizer -->
    <div 
      class="resizer left-resizer" 
      :class="{ 'is-resizing': isResizingLeft }"
      @mousedown.prevent="startResizeLeft"
    >
      <div class="resizer-handle" />
    </div>
    
    <!-- Center Panel (Content) -->
    <div class="panel center-panel">
      <slot name="center" />
    </div>
    
    <!-- Right Resizer -->
    <div 
      class="resizer right-resizer" 
      :class="{ 'is-resizing': isResizingRight }"
      @mousedown.prevent="startResizeRight"
    >
      <div class="resizer-handle" />
    </div>
    
    <!-- Right Panel -->
    <div 
      class="panel right-panel" 
      :style="{ width: rightWidth + 'px', minWidth: rightWidth + 'px' }"
    >
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.resizable-container {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.panel {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.left-panel {
  background: var(--vp-c-bg);
  border-right: 1px solid var(--vp-c-divider);
}

.center-panel {
  flex: 1;
  min-width: 0; /* Allow content to shrink */
  overflow-y: auto;
}

.right-panel {
  background: var(--vp-c-bg);
  border-left: 1px solid var(--vp-c-divider);
}

.resizer {
  width: 4px;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  position: relative;
  z-index: 10;
  transition: background 0.2s;
}

.resizer:hover,
.resizer.is-resizing {
  background: var(--vp-c-brand);
}

.resizer-handle {
  width: 2px;
  height: 48px;
  background: var(--vp-c-divider);
  border-radius: 1px;
  transition: background 0.2s;
}

.resizer:hover .resizer-handle,
.resizer.is-resizing .resizer-handle {
  background: var(--vp-c-brand);
}

/* Responsive: Hide resizers on mobile */
@media (max-width: 1280px) {
  .resizer {
    display: none;
  }
}
</style>
