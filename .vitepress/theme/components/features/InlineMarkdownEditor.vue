<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch, computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { useAppStore } from '../../stores/app'

const store = useAppStore()
const { page } = useData()
const route = useRoute()

// Check if current file is editable (not homepage components)
const isEditableFile = computed(() => {
  const currentPath = route.path
  // 首页组件不可编辑
  const nonEditablePaths = [
    '/',
    '/index.html',
    '/sections/posts/',
    '/sections/posts/index.html',
    '/sections/knowledge/',
    '/sections/knowledge/index.html',
    '/sections/resources/',
    '/sections/resources/index.html',
    '/sections/about/',
    '/sections/about/index.html'
  ]
  if (nonEditablePaths.includes(currentPath)) {
    return false
  }
  // All files with relativePath are editable
  // (py and ipynb files are converted to md by the backend)
  return !!page.value.relativePath
})

// State
const isEditing = ref(false)
const isLoading = ref(false)
const isSaving = ref(false)
const error = ref('')
const vditorInstance = ref<Vditor | null>(null)
const editorContainer = ref<HTMLElement | null>(null)
const originalContent = ref('')

// Find the main content container
function findContentContainer(): HTMLElement | null {
  const selectors = [
    '.vp-doc',
    '.VPDoc .content',
    '.VPDoc article',
    'main .vp-doc',
    '.main-content .vp-doc'
  ]
  
  for (const selector of selectors) {
    const el = document.querySelector(selector)
    if (el) return el as HTMLElement
  }
  
  const main = document.querySelector('.main-content') || document.querySelector('main')
  if (main) {
    const article = main.querySelector('article')
    if (article) return article as HTMLElement
    return main as HTMLElement
  }
  
  return null
}

// Load file content - FIX: 支持 folder-note 模式
async function loadContent(): Promise<string> {
  let filePath = page.value.relativePath
  if (!filePath) return ''
  
  try {
    // 尝试原始路径
    let res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`)
    
    // FIX: 如果是 folder-note 模式（如 article/index.md），尝试 article/article.md
    if (!res.ok && filePath.endsWith('/index.md')) {
      const folderPath = filePath.replace(/\/index\.md$/, '').replace(/\\/g, '/')
      const folderName = folderPath.split('/').pop() || ''
      const folderNotePath = `${folderPath}/${folderName}.md`
      res = await fetch(`/api/files/read?path=${encodeURIComponent(folderNotePath)}`)
    }
    
    if (res.ok) {
      return await res.text()
    }
    throw new Error(`Failed to load: ${res.status}`)
  } catch (e) {
    error.value = `加载失败: ${e instanceof Error ? e.message : 'Unknown error'}`
    return ''
  }
}

// Initialize Vditor
async function initEditor() {
  if (!editorContainer.value) return
  
  isLoading.value = true
  error.value = ''
  
  const content = await loadContent()
  originalContent.value = content
  
  if (!content && error.value) {
    isLoading.value = false
    return
  }
  
  try {
    // Clear container first
    editorContainer.value.innerHTML = ''
    
    vditorInstance.value = new Vditor(editorContainer.value, {
      height: '100%',
      minHeight: 600,
      width: '100%',
      mode: 'ir', // Instant Render - WYSIWYG
      toolbar: [
        'headings',
        'bold',
        'italic',
        'strike',
        '|',
        'line',
        'quote',
        'list',
        'ordered-list',
        'check',
        '|',
        'code',
        'inline-code',
        'link',
        'table',
        '|',
        'undo',
        'redo',
        '|',
        'fullscreen'
      ],
      toolbarConfig: {
        pin: false // Don't pin, let it scroll naturally
      } as any,
      cache: {
        enable: false // Disable cache to prevent stale content
      },
      outline: {
        enable: true,
        position: 'right'
      },
      preview: {
        delay: 300,
        math: {
          engine: 'KaTeX',
          inlineDigit: true
        },
        markdown: {
          toc: true,
          mark: true
        }
      },
      upload: {
        url: '/api/upload',
        accept: 'image/*',
        filename(name: string) {
          return name.replace(/[^\w\-\u4e00-\u9fa5]/g, '')
        }
      },
      value: content, // Set value in config instead of separately
      after: () => {
        // Ensure content is set correctly after init with a small delay
        setTimeout(() => {
          if (vditorInstance.value && content) {
            const currentValue = vditorInstance.value.getValue()
            // Only set if different to avoid unnecessary updates
            if (currentValue !== content) {
              vditorInstance.value.setValue(content)
            }
          }
          
          // Setup outline click handlers for navigation
          setupOutlineClickHandlers()
          
          isLoading.value = false
        }, 100)
      },
      input: () => {
        // Track changes
      }
    })
  } catch (e) {
    error.value = `编辑器初始化失败: ${e instanceof Error ? e.message : 'Unknown error'}`
    isLoading.value = false
  }
}

// Save content
async function saveContent() {
  if (!vditorInstance.value) return
  
  isSaving.value = true
  error.value = ''
  
  try {
    const content = vditorInstance.value.getValue()
    const filePath = page.value.relativePath
    
    if (!filePath) {
      throw new Error('No file path available')
    }
    
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content })
    })
    
    if (!res.ok) {
      throw new Error(`Save failed: ${res.status}`)
    }
    
    // Close editor and reload page
    exitEditMode()
    window.location.reload()
  } catch (e) {
    error.value = `保存失败: ${e instanceof Error ? e.message : 'Unknown error'}`
    isSaving.value = false
  }
}

// Enter edit mode
async function enterEditMode() {
  const container = findContentContainer()
  if (!container) return
  
  // Store original content
  originalContent.value = container.innerHTML
  
  // Clear container and add editor div
  container.innerHTML = ''
  const editorDiv = document.createElement('div')
  editorDiv.className = 'inline-editor-wrapper'
  container.appendChild(editorDiv)
  editorContainer.value = editorDiv
  
  isEditing.value = true
  store.setEditing(true)
  
  // Add editing class to body for styling
  document.body.classList.add('inline-editing')
  
  // Initialize editor
  await nextTick()
  await initEditor()
  
  // Scroll to top of content
  container.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Exit edit mode
function exitEditMode() {
  // First set editing state to false to hide toolbar
  isEditing.value = false
  store.setEditing(false)
  document.body.classList.remove('inline-editing')
  
  // Then destroy Vditor instance
  if (vditorInstance.value) {
    try {
      vditorInstance.value.destroy()
    } catch (e) {
      console.warn('Error destroying Vditor:', e)
    }
    vditorInstance.value = null
  }
  
  isLoading.value = false
  isSaving.value = false
  error.value = ''
  
  // Reload page to restore original VitePress rendered content
  window.location.reload()
}

// Setup outline click handlers
function setupOutlineClickHandlers() {
  // Wait for outline to be rendered
  setTimeout(() => {
    // Hide VitePress's default TOC/outline when editing
    const vitepressOutline = document.querySelector('.VPDocAsideOutline, .aside-outline, .vp-doc-aside-outline, [class*="outline"]')
    if (vitepressOutline) {
      (vitepressOutline as HTMLElement).style.display = 'none'
    }
    
    const outlineItems = document.querySelectorAll('.vditor-outline__item')
    outlineItems.forEach(item => {
      // Remove any existing click listeners to avoid duplicates
      const newItem = item.cloneNode(true) as HTMLElement
      item.parentNode?.replaceChild(newItem, item)
      
      newItem.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        // Get the target element id from the data-id attribute or href
        let targetId = newItem.getAttribute('data-id')
        
        // If no data-id, try to get from href
        if (!targetId) {
          const href = newItem.getAttribute('href')
          if (href && href.startsWith('#')) {
            targetId = href.substring(1)
          }
        }
        
        if (targetId) {
          // Try to find by ID in the editor content
          let targetElement = document.getElementById(targetId)
          
          // If not found by ID, try to find by data-id in headings
          if (!targetElement) {
            const headings = document.querySelectorAll('.vditor-ir h1, .vditor-ir h2, .vditor-ir h3, .vditor-ir h4, .vditor-ir h5, .vditor-ir h6')
            headings.forEach(heading => {
              const headingId = heading.getAttribute('id') || heading.getAttribute('data-id')
              if (headingId === targetId) {
                targetElement = heading as HTMLElement
              }
            })
          }
          
          if (targetElement) {
            // Scroll to element smoothly with offset for toolbar
            const offset = 100 // Account for fixed toolbar
            const elementPosition = targetElement.getBoundingClientRect().top + window.pageYOffset
            window.scrollTo({
              top: elementPosition - offset,
              behavior: 'smooth'
            })
            
            // Highlight the heading temporarily
            targetElement.style.backgroundColor = 'var(--vp-c-brand-soft)'
            targetElement.style.transition = 'background-color 0.3s'
            const elementToHighlight = targetElement
            setTimeout(() => {
              elementToHighlight.style.backgroundColor = ''
            }, 1500)
            
            // Update current state in outline
            outlineItems.forEach(i => i.classList.remove('vditor-outline__item--current'))
            newItem.classList.add('vditor-outline__item--current')
          }
        }
      })
    })
  }, 800)
}

// Handle keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  if (!isEditing.value) return
  
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault()
    saveContent()
    return
  }
  
  if (event.key === 'Escape') {
    event.preventDefault()
    exitEditMode()
    return
  }
}

// Handle double click
function handleDoubleClick(event: MouseEvent) {
  if (isEditing.value) return
  
  // Only allow editing for .md files
  if (!isEditableFile.value) return
  
  const container = findContentContainer()
  if (!container) return
  
  if (!container.contains(event.target as Node)) return
  
  const target = event.target as HTMLElement
  if (target.closest('a, button, input, select, .edit-fab')) return
  
  event.preventDefault()
  enterEditMode()
}

// Setup listeners
function setupListeners() {
  document.addEventListener('dblclick', handleDoubleClick)
  document.addEventListener('keydown', handleKeyDown)
}

function removeListeners() {
  document.removeEventListener('dblclick', handleDoubleClick)
  document.removeEventListener('keydown', handleKeyDown)
}

// Watch for route changes
watch(() => route.path, () => {
  if (isEditing.value) {
    exitEditMode()
  }
})

// Expose methods for external use
defineExpose({
  enterEditMode,
  exitEditMode,
  saveContent,
  isEditing: () => isEditing.value
})

onMounted(() => {
  setupListeners()
})

onBeforeUnmount(() => {
  removeListeners()
  if (isEditing.value) {
    exitEditMode()
  }
})
</script>

<template>
  <!-- Editor Toolbar - Inline with content (only shown when editing) -->
  <Transition name="toolbar">
    <div v-if="isEditing" class="inline-editor-toolbar">
      <div class="toolbar-content">
        <div class="toolbar-left">
          <span class="edit-badge">
            <span class="pulse-dot"></span>
            编辑模式
          </span>
          <span class="file-path">{{ page.relativePath }}</span>
          <span v-if="isLoading" class="status-text loading">加载中...</span>
          <span v-else-if="isSaving" class="status-text saving">保存中...</span>
          <span v-else-if="error" class="status-text error">{{ error }}</span>
        </div>
        
        <div class="toolbar-right">
          <button 
            class="btn-save" 
            :disabled="isLoading || isSaving"
            @click="saveContent"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <span>保存</span>
            <kbd>Ctrl+S</kbd>
          </button>
          
          <button class="btn-cancel" @click="exitEditMode">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
            <span>取消</span>
            <kbd>Esc</kbd>
          </button>
        </div>
      </div>
    </div>
  </Transition>
  
  <!-- Hint -->
  <Teleport to="body">
    <div v-if="!isEditing && isEditableFile" class="edit-hint">
      <span class="hint-text">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        双击内容编辑
      </span>
    </div>
  </Teleport>
</template>

<style scoped>
/* Toolbar - Glassmorphism Style (inline with content) */
.inline-editor-toolbar {
  position: sticky;
  top: 80px; /* Below the nav bar */
  z-index: 1002;
  background: rgba(var(--vp-c-bg-rgb, 255, 255, 255), 0.98);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  margin: 0 0 20px 0;
  padding: 14px 24px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.08),
    0 1px 2px rgba(0, 0, 0, 0.02);
}

/* Dark mode support */
:root.dark .inline-editor-toolbar,
[data-theme="dark"] .inline-editor-toolbar {
  background: rgba(30, 30, 30, 0.95);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.toolbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1400px;
  margin: 0 auto;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* Edit Badge - Modern Style */
.edit-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-brand);
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.15) 100%);
  padding: 8px 16px;
  border-radius: 24px;
  border: 1px solid rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.2);
  box-shadow: 0 2px 8px rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.15);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: var(--vp-c-brand);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 8px var(--vp-c-brand);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(0.85); }
}

/* File Path - Code Style */
.file-path {
  font-family: var(--vp-font-family-mono, 'Fira Code', monospace);
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
  letter-spacing: -0.3px;
}

/* Status Text */
.status-text {
  font-size: 12px;
  padding: 6px 12px;
  border-radius: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-text::before {
  content: '';
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.status-text.loading {
  background: rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.1);
  color: var(--vp-c-brand);
}

.status-text.loading::before {
  background: var(--vp-c-brand);
  animation: blink 1s infinite;
}

.status-text.saving {
  background: rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.15);
  color: var(--vp-c-brand);
}

.status-text.saving::before {
  background: var(--vp-c-brand);
  animation: spin 1s linear infinite;
  width: 10px;
  height: 10px;
  border: 2px solid var(--vp-c-brand);
  border-top-color: transparent;
  border-radius: 50%;
}

.status-text.error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.status-text.error::before {
  background: #ef4444;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Modern Buttons */
.btn-save,
.btn-cancel {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: none;
  position: relative;
  overflow: hidden;
}

.btn-save::before,
.btn-cancel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 100%);
  opacity: 0;
  transition: opacity 0.2s;
}

.btn-save:hover::before,
.btn-cancel:hover::before {
  opacity: 1;
}

/* Save Button - Gradient */
.btn-save {
  background: linear-gradient(135deg, var(--vp-c-brand) 0%, var(--vp-c-brand-dark, #0d5cb8) 100%);
  color: white;
  box-shadow: 
    0 4px 14px rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.4),
    0 1px 2px rgba(0, 0, 0, 0.1) inset;
}

.btn-save:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 
    0 6px 20px rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.5),
    0 1px 2px rgba(0, 0, 0, 0.1) inset;
}

.btn-save:active:not(:disabled) {
  transform: translateY(0);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

/* Cancel Button - Subtle */
.btn-cancel {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.btn-cancel:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  box-shadow: 0 4px 12px rgba(var(--vp-c-brand-rgb, 22, 119, 255), 0.15);
}

/* Keyboard Shortcuts */
kbd {
  padding: 3px 8px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 6px;
  font-size: 11px;
  font-family: var(--vp-font-family-mono, monospace);
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.3);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1) inset;
}

/* Transitions - Smooth Slide */
.toolbar-enter-active,
.toolbar-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.toolbar-enter-from,
.toolbar-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}

/* Edit Hint - Modern Style */
.edit-hint {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 100;
  pointer-events: none;
  opacity: 0;
  animation: hintFade 8s ease-in-out forwards;
}

.hint-text {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  background: rgba(var(--vp-c-bg-rgb, 255, 255, 255), 0.9);
  backdrop-filter: blur(8px);
  padding: 10px 18px;
  border-radius: 24px;
  border: 1px solid var(--vp-c-divider);
  box-shadow: 
    0 4px 16px rgba(0, 0, 0, 0.08),
    0 1px 0 rgba(255, 255, 255, 0.5) inset;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

@keyframes hintFade {
  0%, 95% { opacity: 0; }
  5%, 90% { opacity: 1; }
}

/* Responsive */
@media (max-width: 768px) {
  .inline-editor-toolbar {
    top: 56px;
    padding: 8px 12px;
  }
  
  .file-path {
    display: none;
  }
  
  .btn-save span,
  .btn-cancel span {
    display: none;
  }
  
  kbd {
    display: none;
  }
}
</style>

<style>
/* Global styles for inline editing */
body.inline-editing {
  /* Prevent any background changes on click */
  -webkit-tap-highlight-color: transparent !important;
}

body.inline-editing .VPNav {
  z-index: 1000;
}

/* Fix Vditor content area background */
body.inline-editing .vp-doc .vditor-content {
  background: transparent !important;
}

/* Ensure the editable area doesn't have weird backgrounds */
body.inline-editing .vp-doc .vditor-ir__wrapper {
  background: transparent !important;
  padding: 0 !important;
}

/* Remove focus outlines and backgrounds */
body.inline-editing .vp-doc .vditor-ir *:focus {
  outline: none !important;
  background: transparent !important;
  box-shadow: none !important;
}

/* Adjust main content area for editor */
body.inline-editing .main-content {
  padding-top: 80px; /* Space for toolbar */
  padding-right: 280px; /* Space for outline on the right */
}

/* On smaller screens, remove the padding */
@media (max-width: 1280px) {
  body.inline-editing .main-content {
    padding-right: 0;
  }
}

/* Ensure Vditor toolbar items match our style */
body.inline-editing .vp-doc .vditor-toolbar__item {
  color: var(--vp-c-text-2) !important;
  border-radius: 8px !important;
  margin: 0 2px !important;
  padding: 6px 10px !important;
  transition: all 0.2s ease !important;
}

body.inline-editing .vp-doc .vditor-toolbar__item:hover {
  color: var(--vp-c-brand) !important;
  background: var(--vp-c-brand-soft) !important;
}

body.inline-editing .vp-doc .vditor-toolbar__item--active {
  color: var(--vp-c-brand) !important;
  background: var(--vp-c-brand-soft) !important;
}

/* Vditor toolbar divider */
body.inline-editing .vp-doc .vditor-toolbar__divider {
  background: var(--vp-c-divider) !important;
  margin: 0 8px !important;
}

/* Vditor toolbar br (new line) */
body.inline-editing .vp-doc .vditor-toolbar__br {
  display: none !important;
}

/* Vditor in inline mode */
body.inline-editing .vp-doc .inline-editor-wrapper {
  min-height: calc(100vh - 300px);
  height: auto;
}

/* Ensure vditor takes full space */
body.inline-editing .vp-doc .vditor {
  display: flex;
  flex-direction: column;
}

body.inline-editing .vp-doc .vditor {
  border: none !important;
  background: var(--vp-c-bg) !important;
  height: 100% !important;
}

/* Vditor Toolbar - Clean style, no sticky since we have our own toolbar */
body.inline-editing .vp-doc .vditor-toolbar {
  background: transparent !important;
  border: none !important;
  border-bottom: 1px solid var(--vp-c-divider) !important;
  padding: 8px 0 !important;
  margin-bottom: 16px !important;
}

body.inline-editing .vp-doc .vditor-toolbar__item {
  color: var(--vp-c-text-2) !important;
}

body.inline-editing .vp-doc .vditor-toolbar__item:hover {
  color: var(--vp-c-brand) !important;
  background: var(--vp-c-bg-soft) !important;
}

body.inline-editing .vp-doc .vditor-content {
  background: var(--vp-c-bg) !important;
}

body.inline-editing .vp-doc .vditor-ir {
  background: var(--vp-c-bg) !important;
  color: var(--vp-c-text-1) !important;
}

/* IR mode specific styles */
body.inline-editing .vp-doc .vditor-ir {
  font-size: 16px !important;
  line-height: 1.8 !important;
}

body.inline-editing .vp-doc .vditor-ir__node {
  margin: 0 !important;
  padding: 0 !important;
}

body.inline-editing .vp-doc .vditor-ir__node[data-type="code-block"] {
  background: var(--vp-c-bg-soft) !important;
  border-radius: 8px !important;
  margin: 16px 0 !important;
}

body.inline-editing .vp-doc .vditor-ir__marker {
  color: var(--vp-c-text-3) !important;
  font-size: 0.85em !important;
  opacity: 0.6;
}

body.inline-editing .vp-doc .vditor-ir__node--expand .vditor-ir__marker {
  opacity: 0.4;
}

/* Ensure headings render correctly in IR mode */
body.inline-editing .vp-doc .vditor-ir h1,
body.inline-editing .vp-doc .vditor-ir h2,
body.inline-editing .vp-doc .vditor-ir h3,
body.inline-editing .vp-doc .vditor-ir h4,
body.inline-editing .vp-doc .vditor-ir h5,
body.inline-editing .vp-doc .vditor-ir h6 {
  color: var(--vp-c-text-1) !important;
  font-weight: 600 !important;
  margin: 24px 0 16px 0 !important;
}

/* Ensure paragraphs render correctly */
body.inline-editing .vp-doc .vditor-ir p {
  margin: 12px 0 !important;
  line-height: 1.8 !important;
}

/* Ensure lists render correctly */
body.inline-editing .vp-doc .vditor-ir ul,
body.inline-editing .vp-doc .vditor-ir ol {
  margin: 12px 0 !important;
  padding-left: 24px !important;
}

body.inline-editing .vp-doc .vditor-ir li {
  margin: 6px 0 !important;
}

/* Ensure links render correctly */
body.inline-editing .vp-doc .vditor-ir a {
  color: var(--vp-c-brand) !important;
  text-decoration: none !important;
}

/* Ensure code inline renders correctly */
body.inline-editing .vp-doc .vditor-ir code:not(.hljs) {
  background: var(--vp-c-bg-soft) !important;
  color: var(--vp-c-text-1) !important;
  padding: 2px 6px !important;
  border-radius: 4px !important;
  font-family: var(--vp-font-family-mono, monospace) !important;
  font-size: 0.9em !important;
}

/* Fix code block text color - CRITICAL */
body.inline-editing .vp-doc .vditor-ir pre code {
  color: var(--vp-c-text-1) !important;
  background: transparent !important;
}

/* ========== CLEAN CODE BLOCK - 简洁代码块样式 ========== */

/* Base code block container */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] {
  margin: 16px 0 !important;
  padding: 0 !important;
  background: transparent !important;
  border: none !important;
}

/* Code block preview - the actual rendered code */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] .vditor-ir__preview {
  background: #f6f8fa !important;
  border: 1px solid #d0d7de !important;
  border-radius: 6px !important;
  padding: 16px !important;
  margin: 0 !important;
}

/* Code block preview content */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] .vditor-ir__preview pre {
  background: transparent !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow-x: auto !important;
}

body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] .vditor-ir__preview pre code {
  color: #24292f !important;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  background: transparent !important;
}

/* Code block markers (```java) - make them subtle */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] > .vditor-ir__marker {
  display: inline-block !important;
  color: #8c959f !important;
  font-size: 12px !important;
  font-family: var(--vp-font-family-mono) !important;
  margin-bottom: 4px !important;
  opacity: 0.6 !important;
}

/* When code block is expanded (editing), show clean input area */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"].vditor-ir__node--expand {
  background: #f6f8fa !important;
  border: 1px solid #d0d7de !important;
  border-radius: 6px !important;
  padding: 12px 16px !important;
}

/* In edit mode, hide the preview and show textarea-like input */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"].vditor-ir__node--expand .vditor-ir__preview {
  display: none !important;
}

/* Code block input area (when editing) */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] textarea,
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] .vditor-ir__input {
  background: transparent !important;
  border: none !important;
  color: #24292f !important;
  font-family: 'SF Mono', Monaco, monospace !important;
  font-size: 14px !important;
  line-height: 1.6 !important;
  width: 100% !important;
  resize: vertical !important;
  min-height: 100px !important;
}

/* Hide closing ``` marker in preview */
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] > .vditor-ir__marker[data-type="code-block-close"],
body.inline-editing .vp-doc .vditor-ir .vditor-ir__node[data-type="code-block"] span.vditor-ir__marker:last-child {
  display: none !important;
}

/* Remove gray background on click/focus in IR mode */
body.inline-editing .vp-doc .vditor-ir__node--selected,
body.inline-editing .vp-doc .vditor-ir__node--selected .vditor-ir__node {
  background: transparent !important;
  outline: none !important;
  box-shadow: none !important;
}

body.inline-editing .vp-doc .vditor-ir__node {
  background: transparent !important;
}

/* Remove all gray/blue selection backgrounds */
body.inline-editing .vp-doc .vditor-ir__node[data-type="paragraph"]:focus,
body.inline-editing .vp-doc .vditor-ir__node[data-type="heading"]:focus,
body.inline-editing .vp-doc .vditor-ir__node[data-type="list-item"]:focus,
body.inline-editing .vp-doc .vditor-ir__node[data-type="blockquote"]:focus {
  background: transparent !important;
  outline: none !important;
}

/* ========== LAYOUT ADJUSTMENTS - 编辑模式布局调整 ========== */

/* Keep VitePress outline hidden, use Vditor's outline on LEFT */
body.inline-editing .VPDocAsideOutline,
body.inline-editing .VPDocAside,
body.inline-editing aside[class*="VPDocAside"] {
  display: none !important;
}

/* Widen main content - 主栏宽度增加 */
body.inline-editing .VPDoc {
  display: flex !important;
}

body.inline-editing .VPDoc .content {
  flex: 1 !important;
  max-width: none !important;
  width: 100% !important;
  padding: 0 24px !important;
}

body.inline-editing .vp-doc {
  width: 100% !important;
  max-width: 900px !important; /* 主内容最大宽度 */
  margin: 0 auto !important;
}

/* Remove min-width from sidebars - 侧边栏不要最小宽度 */
body.inline-editing .sidebar-left,
body.inline-editing .VPSidebar,
body.inline-editing .VPDocAside {
  min-width: unset !important;
}

/* Expand sidebar width to 120% - 侧边栏宽度放大 */
body.inline-editing .sidebar-left,
body.inline-editing .VPSidebar {
  width: calc(var(--vp-sidebar-width) * 1.2) !important;
  max-width: 320px !important;
}

/* ========== Vditor Outline on LEFT - 大纲放左侧 ========== */
body.inline-editing .vp-doc .vditor-outline {
  display: block !important;
  position: fixed !important;
  left: calc(var(--vp-sidebar-width) * 1.2 + 16px) !important; /* 左侧栏右侧 */
  top: 120px !important; /* 导航栏下方 */
  width: 200px !important; /* 大纲宽度 */
  max-height: calc(100vh - 160px) !important;
  overflow-y: auto !important;
  background: var(--vp-c-bg) !important;
  border: 1px solid var(--vp-c-divider) !important;
  border-radius: 8px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
  padding: 12px !important;
  z-index: 50 !important;
  margin: 0 !important;
  pointer-events: auto !important;
}

/* Adjust main content margin to make room for left outline */
body.inline-editing .VPContent {
  padding-left: 220px !important; /* Space for left outline */
}

/* Responsive - hide outline on smaller screens */
@media (max-width: 1280px) {
  body.inline-editing .vp-doc .vditor-outline {
    display: none !important; /* 小屏幕隐藏大纲 */
  }
  
  body.inline-editing .VPContent {
    padding-left: 0 !important;
  }
}

body.inline-editing .vp-doc .vditor-outline__title {
  font-size: 13px !important;
  font-weight: 600 !important;
  color: var(--vp-c-text-1) !important;
  padding-bottom: 10px !important;
  border-bottom: 1px solid var(--vp-c-divider) !important;
  margin-bottom: 10px !important;
  display: block !important;
}

body.inline-editing .vp-doc .vditor-outline__item {
  padding: 6px 10px !important;
  border-radius: 4px !important;
  cursor: pointer !important;
  transition: all 0.2s !important;
  font-size: 12px !important;
  color: var(--vp-c-text-2) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  pointer-events: auto !important;
  user-select: none !important;
  line-height: 1.5 !important;
}

body.inline-editing .vp-doc .vditor-outline__item:hover {
  background: var(--vp-c-brand-soft) !important;
  color: var(--vp-c-brand) !important;
}

body.inline-editing .vp-doc .vditor-outline__item--current {
  background: var(--vp-c-brand-soft) !important;
  color: var(--vp-c-brand) !important;
  font-weight: 500 !important;
}

/* Indentation for different levels */
body.inline-editing .vp-doc .vditor-outline__item[data-level="2"] {
  padding-left: 18px !important;
}

body.inline-editing .vp-doc .vditor-outline__item[data-level="3"] {
  padding-left: 28px !important;
}

/* Hide outline button in toolbar */
body.inline-editing .vp-doc .vditor-toolbar__item[title="大纲"],
body.inline-editing .vp-doc .vditor-toolbar__item[data-type="outline"] {
  display: none !important;
}

/* Simple syntax highlighting - for light gray background */
body.inline-editing .vp-doc .vditor-ir .hljs-keyword,
body.inline-editing .vp-doc .vditor-ir .hljs-selector-tag,
body.inline-editing .vp-doc .vditor-ir .hljs-doctag {
  color: #d73a49 !important; /* Red for keywords */
  font-weight: 600 !important;
}

body.inline-editing .vp-doc .vditor-ir .hljs-string,
body.inline-editing .vp-doc .vditor-ir .hljs-regexp,
body.inline-editing .vp-doc .vditor-ir .hljs-addition {
  color: #032f62 !important; /* Dark blue for strings */
}

body.inline-editing .vp-doc .vditor-ir .hljs-number,
body.inline-editing .vp-doc .vditor-ir .hljs-literal {
  color: #005cc5 !important; /* Blue for numbers */
}

body.inline-editing .vp-doc .vditor-ir .hljs-comment,
body.inline-editing .vp-doc .vditor-ir .hljs-meta {
  color: #6a737d !important; /* Gray for comments */
  font-style: italic !important;
}

body.inline-editing .vp-doc .vditor-ir .hljs-function,
body.inline-editing .vp-doc .vditor-ir .hljs-title,
body.inline-editing .vp-doc .vditor-ir .hljs-section {
  color: #6f42c1 !important; /* Purple for functions */
}

body.inline-editing .vp-doc .vditor-ir .hljs-variable,
body.inline-editing .vp-doc .vditor-ir .hljs-attr,
body.inline-editing .vp-doc .vditor-ir .hljs-params {
  color: #24292e !important; /* Dark for variables */
}

body.inline-editing .vp-doc .vditor-ir .hljs-built_in,
body.inline-editing .vp-doc .vditor-ir .hljs-class {
  color: #22863a !important; /* Green for classes/builtins */
}

body.inline-editing .vp-doc .vditor-ir .hljs-operator,
body.inline-editing .vp-doc .vditor-ir .hljs-punctuation {
  color: #444 !important;
}

/* Ensure sidebars are clickable */
body.inline-editing .sidebar-left,
body.inline-editing .sidebar-right {
  z-index: 1001;
}

/* Responsive Design */
@media (max-width: 768px) {
  .inline-editor-toolbar {
    top: 56px;
    padding: 10px 16px;
  }
  
  .toolbar-content {
    gap: 12px;
  }
  
  .toolbar-left {
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .file-path {
    display: none;
  }
  
  .edit-badge {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .edit-badge span:not(.pulse-dot) {
    display: none;
  }
  
  .btn-save span,
  .btn-cancel span {
    display: none;
  }
  
  .btn-save,
  .btn-cancel {
    padding: 10px 14px;
  }
  
  kbd {
    display: none;
  }
  
  body.inline-editing .main-content {
    padding-top: 70px;
  }
}

/* Hide outline on smaller screens */
@media (max-width: 1280px) {
  body.inline-editing .vp-doc .vditor-outline {
    display: none !important;
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .inline-editor-toolbar {
    padding: 8px 12px;
  }
  
  .status-text {
    display: none;
  }
  
  .toolbar-right {
    gap: 8px;
  }
}
</style>
