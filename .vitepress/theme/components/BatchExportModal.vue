<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import TreeNodeSelect from './TreeNodeSelect.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const treeData = ref<any[]>([])
const selectedPaths = ref<Set<string>>(new Set())
const expandedPaths = ref<Set<string>>(new Set())
const isLoading = ref(false)
const exportFormat = ref<'md' | 'pdf' | 'docx'>('md')
const includeTitle = ref(false)

const loadDirectoryTree = async () => {
  isLoading.value = true
  try {
    // Load all sections
    const sections = ['posts', 'knowledge', 'resources', 'about']
    const allData: any[] = []
    
    for (const section of sections) {
      try {
        const response = await fetch(`/api/directory-tree?section=${section}&t=${Date.now()}`)
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            allData.push(...result.data)
          }
        }
      } catch (e) {
        console.error(`Failed to load ${section}:`, e)
      }
    }
    
    treeData.value = allData
  } catch (error) {
    console.error('Failed to load directory tree:', error)
  } finally {
    isLoading.value = false
  }
}

const toggleSelection = (path: string, isFile: boolean) => {
  if (isFile) {
    if (selectedPaths.value.has(path)) {
      selectedPaths.value.delete(path)
    } else {
      selectedPaths.value.add(path)
    }
  }
}

const toggleExpand = (path: string) => {
  if (expandedPaths.value.has(path)) {
    expandedPaths.value.delete(path)
  } else {
    expandedPaths.value.add(path)
  }
}

const getAllFiles = (nodes: any[]): any[] => {
  const files: any[] = []
  for (const node of nodes) {
    if (node.type === 'article') {
      files.push(node)
    } else if (node.children) {
      files.push(...getAllFiles(node.children))
    }
  }
  return files
}

const selectAll = () => {
  const allFiles = getAllFiles(treeData.value)
  if (selectedPaths.value.size === allFiles.length) {
    selectedPaths.value.clear()
  } else {
    selectedPaths.value = new Set(allFiles.map(f => f.path))
  }
}

const selectedCount = computed(() => selectedPaths.value.size)

const executeExport = async () => {
  if (selectedCount.value === 0) {
    alert('Please select at least one file')
    return
  }
  
  try {
    const response = await fetch('/api/articles/batch-export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paths: Array.from(selectedPaths.value),
        format: exportFormat.value,
        includeTitle: includeTitle.value
      })
    })
    
    if (!response.ok) throw new Error('Export failed')
    
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `articles-export-${Date.now()}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    emit('update:visible', false)
    selectedPaths.value.clear()
  } catch (error) {
    console.error('Batch export failed:', error)
    alert('Export failed: ' + (error as Error).message)
  }
}

const close = () => {
  emit('update:visible', false)
}

onMounted(() => {
  if (props.visible) {
    loadDirectoryTree()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title">
              <span class="title-icon">📦</span>
              Batch Export
            </h3>
            <button class="close-btn" @click="close">x</button>
          </div>
          
          <div class="modal-body">
            <div class="format-section">
              <label class="section-label">Export Format</label>
              <div class="format-options">
                <label 
                  v-for="fmt in [
                    {value: 'md', label: 'Markdown', icon: '📝'}, 
                    {value: 'pdf', label: 'PDF', icon: '📄'}, 
                    {value: 'docx', label: 'Word', icon: '📘'}
                  ]" 
                  :key="fmt.value"
                  class="format-option"
                  :class="{ active: exportFormat === fmt.value }"
                >
                  <input type="radio" v-model="exportFormat" :value="fmt.value" />
                  <span class="format-icon">{{ fmt.icon }}</span>
                  <span class="format-label">{{ fmt.label }}</span>
                </label>
              </div>
            </div>
            
            <div class="option-section">
              <label class="checkbox-label">
                <input type="checkbox" v-model="includeTitle" />
                <span class="check-icon">{{ includeTitle ? '☑' : '☐' }}</span>
                <span class="label-text">Include title at top of content</span>
              </label>
              <div class="option-hint">
                When checked, adds "# Title" at the beginning of exported content
              </div>
            </div>
            
            <div class="files-section">
              <div class="section-header">
                <label class="section-label">Select Files</label>
                <button class="select-all-btn" @click="selectAll">
                  {{ selectedCount === getAllFiles(treeData).length ? 'Deselect All' : 'Select All' }}
                </button>
              </div>
              
              <div class="tree-container">
                <div v-if="isLoading" class="loading-state">
                  <span class="loading-spinner"></span>
                  Loading...
                </div>
                <TreeNodeSelect
                  v-else
                  :nodes="treeData"
                  :selected-paths="selectedPaths"
                  :expanded-paths="expandedPaths"
                  @toggle-selection="toggleSelection"
                  @toggle-expand="toggleExpand"
                />
              </div>
              
              <div class="selection-info">
                Selected <strong>{{ selectedCount }}</strong> files
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn-secondary" @click="close">Cancel</button>
            <button class="btn-primary" :disabled="selectedCount === 0" @click="executeExport">
              Export ({{ selectedCount }})
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 20px;
  color: #6b7280;
  cursor: pointer;
}

.close-btn:hover {
  background: #f3f4f6;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.format-section, .option-section {
  margin-bottom: 20px;
}

.section-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
}

.format-options {
  display: flex;
  gap: 12px;
}

.format-option {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.format-option.active {
  border-color: #1677ff;
  background: #f0f7ff;
}

.format-option input {
  display: none;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 12px;
  background: #fafafa;
  border-radius: 8px;
}

.checkbox-label input {
  display: none;
}

.check-icon {
  color: #1677ff;
}

.option-hint {
  margin-top: 4px;
  margin-left: 28px;
  font-size: 12px;
  color: #9ca3af;
}

.files-section {
  border-top: 1px solid #e5e7eb;
  padding-top: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.select-all-btn {
  padding: 4px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  font-size: 13px;
  cursor: pointer;
}

.tree-container {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px;
  color: #6b7280;
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #e5e7eb;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.selection-info {
  margin-top: 12px;
  font-size: 14px;
  color: #6b7280;
}

.selection-info strong {
  color: #1677ff;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
}

.btn-secondary, .btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
}

.btn-primary {
  background: #1677ff;
  color: white;
}

.btn-primary:disabled {
  background: #d1d5db;
  cursor: not-allowed;
}

.modal-enter-active, .modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from, .modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95);
}
</style>
