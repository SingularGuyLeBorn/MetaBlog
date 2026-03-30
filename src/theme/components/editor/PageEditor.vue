<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useData, useRoute } from 'vitepress'
import Vditor from 'vditor'
import 'vditor/dist/index.css'

const props = defineProps<{
  modelValue: boolean // 控制编辑器显示/隐藏
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { page } = useData()
const route = useRoute()

const vditor = ref<Vditor | null>(null)
const editorRef = ref<HTMLElement | null>(null)
const content = ref('')
const isSaving = ref(false)
const isLoading = ref(false)
const lastSaved = ref('')

// 加载文件内容
const loadContent = async () => {
  if (!page.value.relativePath) return
  
  isLoading.value = true
  try {
    const res = await fetch(`/api/files/read?path=${page.value.relativePath}`)
    if (res.ok) {
      const text = await res.text()
      content.value = text
      lastSaved.value = text
      if (vditor.value) {
        vditor.value.setValue(text)
      }
    }
  } catch (e) {
    console.error('Failed to load content:', e)
  } finally {
    isLoading.value = false
  }
}

// 保存文件
const saveContent = async () => {
  if (!vditor.value || !page.value.relativePath) return
  
  const value = vditor.value.getValue()
  if (value === lastSaved.value) {
    // 内容没有变化
    return
  }
  
  isSaving.value = true
  try {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: page.value.relativePath,
        content: value
      })
    })
    
    if (!res.ok) throw new Error('Save failed')
    
    lastSaved.value = value
    // 显示保存成功提示
    showToast('保存成功', 'success')
  } catch (e) {
    console.error('Failed to save:', e)
    showToast('保存失败', 'error')
  } finally {
    isSaving.value = false
  }
}

// Toast 提示
const toast = ref({ show: false, message: '', type: 'success' })
let toastTimer: ReturnType<typeof setTimeout>
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  toast.value = { show: true, message, type }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value.show = false
  }, 2000)
}

// 关闭编辑器
const closeEditor = () => {
  emit('update:modelValue', false)
}

// 初始化 Vditor
const initVditor = () => {
  if (!editorRef.value || vditor.value) return
  
  vditor.value = new Vditor(editorRef.value, {
    height: '100%',
    width: '100%',
    value: content.value,
    mode: 'ir', // 即时渲染模式，类似语雀
    toolbar: [
      'headings', 'bold', 'italic', 'strike', '|',
      'line', 'quote', 'list', 'ordered-list', 'check', '|',
      'code', 'inline-code', 'link', 'table', '|',
      'undo', 'redo'
    ],
    toolbarConfig: {
      pin: true
    },
    counter: {
      enable: true,
      type: 'markdown'
    },
    cache: {
      enable: false
    },
    preview: {
      delay: 300,
      math: { engine: 'KaTeX', inlineDigit: true },
      markdown: { toc: true, mark: true }
    },
    keydown: (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault()
        saveContent()
      }
      if (event.key === 'Escape') {
        closeEditor()
      }
    }
  })
}

// 监听编辑器打开
watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
    loadContent().then(() => {
      initVditor()
    })
  } else {
    document.body.style.overflow = ''
    if (vditor.value) {
      vditor.value.destroy()
      vditor.value = null
    }
  }
})

// 监听路由变化，关闭编辑器
watch(() => route.path, () => {
  closeEditor()
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  if (vditor.value) {
    vditor.value.destroy()
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="editor-fade">
      <div v-if="modelValue" class="page-editor-overlay">
        <!-- 顶部工具栏 -->
        <div class="editor-header">
          <div class="header-left">
            <button class="header-btn back-btn" @click="closeEditor">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span>退出编辑</span>
            </button>
            <div class="file-path">
              <span class="path-label">编辑中:</span>
              <span class="path-value">{{ page.relativePath }}</span>
            </div>
          </div>
          
          <div class="header-center">
            <span v-if="isSaving" class="status-text saving">
              <span class="spinner"></span>
              保存中...
            </span>
            <span v-else-if="isLoading" class="status-text loading">
              <span class="spinner"></span>
              加载中...
            </span>
            <span v-else class="status-text saved">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              已保存
            </span>
          </div>
          
          <div class="header-right">
            <button class="header-btn save-btn" :disabled="isSaving" @click="saveContent">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              <span>保存</span>
              <kbd class="shortcut">Ctrl+S</kbd>
            </button>
          </div>
        </div>
        
        <!-- 编辑器区域 -->
        <div class="editor-body">
          <div ref="editorRef" class="vditor-container"></div>
        </div>
        
        <!-- Toast 提示 -->
        <Transition name="toast">
          <div v-if="toast.show" class="toast" :class="toast.type">
            {{ toast.message }}
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.page-editor-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
}

/* Header */
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 16px;
  background: var(--vp-c-bg);
  border-bottom: 1px solid var(--vp-c-divider);
  flex-shrink: 0;
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.header-right {
  justify-content: flex-end;
}

.header-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.header-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.back-btn {
  border-color: var(--vp-c-divider);
}

.back-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.save-btn {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.save-btn:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
  border-color: var(--vp-c-brand-dark);
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.file-path {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.path-label {
  color: var(--vp-c-text-3);
}

.path-value {
  color: var(--vp-c-text-2);
  font-family: var(--vp-font-family-mono);
  background: var(--vp-c-bg-soft);
  padding: 2px 8px;
  border-radius: 4px;
}

.shortcut {
  padding: 2px 6px;
  background: rgba(255,255,255,0.2);
  border-radius: 4px;
  font-size: 11px;
  font-family: var(--vp-font-family-mono);
}

/* Status */
.status-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}

.status-text.saved {
  color: var(--vp-c-success, #10b981);
}

.status-text.saving,
.status-text.loading {
  color: var(--vp-c-brand);
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Editor Body */
.editor-body {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.vditor-container {
  height: 100%;
  width: 100%;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  color: white;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast.success {
  background: var(--vp-c-success, #10b981);
}

.toast.error {
  background: var(--vp-c-danger, #ef4444);
}

/* Transitions */
.editor-fade-enter-active,
.editor-fade-leave-active {
  transition: opacity 0.2s ease;
}

.editor-fade-enter-from,
.editor-fade-leave-to {
  opacity: 0;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Vditor Overrides */
:deep(.vditor) {
  border: none !important;
  background: var(--vp-c-bg) !important;
}

:deep(.vditor-toolbar) {
  background: var(--vp-c-bg-alt) !important;
  border-bottom: 1px solid var(--vp-c-divider) !important;
}

:deep(.vditor-toolbar__item) {
  color: var(--vp-c-text-2) !important;
}

:deep(.vditor-toolbar__item:hover) {
  color: var(--vp-c-brand) !important;
  background: var(--vp-c-bg-soft) !important;
}

:deep(.vditor-ir) {
  background: var(--vp-c-bg) !important;
  color: var(--vp-c-text-1) !important;
}

:deep(.vditor-counter) {
  color: var(--vp-c-text-3) !important;
}
</style>
