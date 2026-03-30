<script setup lang="ts">
import { ref, watch } from 'vue'
import { useData } from 'vitepress'
import { useAppStore } from '../../stores/app'
import VditorEditor from '../editor/VditorEditor.vue'

const store = useAppStore()
const { page } = useData()

const content = ref('')
const isSaving = ref(false)

// Load content when editor opens
watch(() => store.isEditorOpen, async (isOpen) => {
  if (isOpen) {
    const filePath = page.value.relativePath
    try {
      const res = await fetch(`/api/files/read?path=${filePath}`)
      if (res.ok) {
        content.value = await res.text()
      } else {
        console.warn('File not found', filePath)
      }
    } catch (e) {
      console.error('Failed to load content', e)
    }
  }
}, { immediate: true })

async function saveContent(val?: string) {
  const valueToSave = val !== undefined ? val : content.value
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

function closeEditor() {
  store.toggleEditor()
}
</script>

<template>
  <div v-if="store.isEditorOpen" class="in-page-editor">
    <div class="editor-status-bar">
      <div class="status-left">
        <span class="file-info">{{ page.relativePath }}</span>
        <span v-if="isSaving" class="saving-msg">Saving...</span>
      </div>
      <div class="status-actions">
        <button class="status-btn primary" @click="() => saveContent()">Save</button>
        <button class="status-btn" @click="closeEditor">Done</button>
      </div>
    </div>
    <div class="editor-content-area">
      <VditorEditor 
        :initial-value="content" 
        :path="page.relativePath" 
        @update:value="onUpdateValue"
        @save="saveContent"
      />
    </div>
  </div>
</template>

<style scoped>
.in-page-editor {
  margin-top: 2rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background: var(--vp-c-bg);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
}

.editor-status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--vp-c-bg-alt);
  border-bottom: 1px solid var(--vp-c-divider);
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

.saving-msg {
  font-size: 11px;
  color: var(--vp-c-brand);
  animation: pulse 1s infinite alternate;
}

.status-actions {
  display: flex;
  gap: 8px;
}

.status-btn {
  padding: 2px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  transition: all 0.2s;
}

.status-btn:hover {
  background: var(--vp-c-bg-mute);
}

.status-btn.primary {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.editor-content-area {
  height: 600px; /* Fixed height for in-page editor */
}

@keyframes pulse {
  from { opacity: 0.5; }
  to { opacity: 1; }
}
</style>
