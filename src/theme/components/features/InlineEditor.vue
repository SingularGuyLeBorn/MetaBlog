<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useData } from 'vitepress'
import VditorEditor from '../editor/VditorEditor.vue'

const { page } = useData()

const content = ref('')
const isSaving = ref(false)
const isLoading = ref(true)

// Load content on mount
onMounted(async () => {
  await loadContent()
})

// Reload when route changes
watch(() => page.value.relativePath, async () => {
  await loadContent()
})

async function loadContent() {
  isLoading.value = true
  const filePath = page.value.relativePath
  if (!filePath) {
    isLoading.value = false
    return
  }
  
  try {
    const res = await fetch(`/api/files/read?path=${filePath}`)
    if (res.ok) {
      content.value = await res.text()
    } else {
      console.warn('File not found', filePath)
      content.value = ''
    }
  } catch (e) {
    console.error('Failed to load content', e)
    content.value = ''
  } finally {
    isLoading.value = false
  }
}

async function saveContent(val?: string) {
  const valueToSave = val !== undefined ? val : content.value
  if (!valueToSave) return
  
  isSaving.value = true
  const filePath = page.value.relativePath

  try {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        path: filePath,
        content: valueToSave
      })
    })
    
    if (!res.ok) throw new Error('Save failed')
    console.log('Saved successfully')
  } catch (e) {
    console.error('Failed to save', e)
    alert('Failed to save changes')
  } finally {
    isSaving.value = false
  }
}

function onUpdateValue(val: string) {
  content.value = val
}

// Auto save with debounce
let saveTimeout: ReturnType<typeof setTimeout> | null = null

// Handle auto-save from editor input
function onAutoSave(val: string) {
  content.value = val
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    saveContent(val)
  }, 2000)
}
</script>

<template>
  <div class="inline-editor">
    <div class="editor-status-bar">
      <div class="status-left">
        <span class="file-info">{{ page.relativePath || 'Loading...' }}</span>
        <span v-if="isLoading" class="status-msg">Loading...</span>
        <span v-else-if="isSaving" class="status-msg saving">Saving...</span>
        <span v-else class="status-msg saved">Saved</span>
      </div>
      <div class="status-actions">
        <button type="button" class="status-btn primary" @click="() => saveContent()" :disabled="isSaving || isLoading">
          Save Now
        </button>
      </div>
    </div>
    <div class="editor-content-area" :class="{ 'is-loading': isLoading }">
      <div v-if="isLoading" class="loading-overlay">
        <div class="loading-spinner"></div>
        <span>Loading content...</span>
      </div>
      <VditorEditor 
        v-show="!isLoading"
        :initial-value="content" 
        :path="page.relativePath" 
        @update:value="onUpdateValue"
        @save="saveContent"
        @auto-save="onAutoSave"
      />
    </div>
  </div>
</template>

<style scoped>
.inline-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - var(--vp-nav-height, 64px));
  background: var(--vp-c-bg);
}

.editor-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
  position: sticky;
  top: 0;
  z-index: 50;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-info {
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.status-msg {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.status-msg.saving {
  color: var(--vp-c-brand);
  animation: pulse 1s infinite alternate;
}

.status-msg.saved {
  color: var(--vp-c-text-3);
}

.status-actions {
  display: flex;
  gap: 8px;
}

.status-btn {
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: all 0.2s;
}

.status-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-mute);
}

.status-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-btn.primary {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.status-btn.primary:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.editor-content-area {
  flex: 1;
  position: relative;
  min-height: 0;
}

.editor-content-area :deep(.editor-wrapper) {
  height: 100%;
  min-height: calc(100vh - var(--vp-nav-height, 64px) - 41px);
}

.editor-content-area :deep(.vditor-container) {
  height: 100%;
  min-height: calc(100vh - var(--vp-nav-height, 64px) - 41px - 49px);
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--vp-c-bg);
  z-index: 10;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
