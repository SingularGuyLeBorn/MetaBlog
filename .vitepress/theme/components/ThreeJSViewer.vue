<template>
  <div class="threejs-viewer">
    <div ref="containerRef" class="canvas-container"></div>
    <div class="viewer-controls">
      <button class="control-btn" @click="toggleFullscreen" title="全屏">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>
      <button class="control-btn" @click="resetView" title="重置视角">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
      </button>
    </div>
    <div v-if="loading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p>加载 3D 场景中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  scriptUrl: string
}

const props = defineProps<Props>()

const containerRef = ref<HTMLElement>()
const loading = ref(true)
let cleanup: (() => void) | null = null

onMounted(async () => {
  if (!containerRef.value) return
  
  // Load Three.js from CDN if not already loaded
  if (!(window as any).THREE) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js')
  }
  
  // Load OrbitControls
  if (!(window as any).THREE.OrbitControls) {
    await loadScript('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js')
  }
  
  // Load the effect script
  try {
    const module = await import(/* @vite-ignore */ props.scriptUrl)
    if (module.init && containerRef.value) {
      cleanup = module.init(containerRef.value)
    }
    loading.value = false
  } catch (error) {
    console.error('Failed to load 3D effect:', error)
    loading.value = false
  }
})

onUnmounted(() => {
  if (cleanup) {
    cleanup()
  }
})

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = reject
    document.head.appendChild(script)
  })
}

function toggleFullscreen() {
  if (!containerRef.value) return
  
  if (!document.fullscreenElement) {
    containerRef.value.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function resetView() {
  // Dispatch custom event for the effect to handle
  window.dispatchEvent(new CustomEvent('threejs-reset-view'))
}
</script>

<style scoped>
.threejs-viewer {
  position: relative;
  width: 100%;
  height: 600px;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(145deg, #0f172a, #1e293b);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}

.canvas-container {
  width: 100%;
  height: 100%;
}

.canvas-container :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  display: block;
}

.viewer-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.control-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
}

.control-btn svg {
  width: 20px;
  height: 20px;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #0f172a, #1e293b);
  color: white;
  gap: 16px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .threejs-viewer {
    height: 400px;
  }
}
</style>
