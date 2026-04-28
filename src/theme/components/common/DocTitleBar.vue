<script setup lang="ts">
import BatchExportModal from '@/theme/components/editor/BatchExportModal.vue'
import { useData, useRoute } from 'vitepress'
import { computed, ref } from 'vue'

const { frontmatter, page } = useData()
const route = useRoute()

const isEditing = ref(false)
const editTitle = ref('')
const titleInput = ref<HTMLInputElement>()
const showExportMenu = ref(false)
const showBatchExport = ref(false)
const exportWithTitle = ref(false)

const displayTitle = computed(() => {
  if (frontmatter.value.title) {
    return frontmatter.value.title
  }
  const path = route.path
  const fileName = path.split('/').pop() || 'untitled'
  return fileName.replace(/\.html$/, '').replace(/-/g, ' ')
})

const filePath = computed(() => {
  return route.path.replace(/\.html$/, '.md')
})

const startEdit = () => {
  editTitle.value = displayTitle.value
  isEditing.value = true
  setTimeout(() => titleInput.value?.focus(), 0)
}

const saveTitle = async () => {
  if (!editTitle.value.trim() || editTitle.value === displayTitle.value) {
    isEditing.value = false
    return
  }
  
  try {
    const response = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: filePath.value,
        newName: editTitle.value,
        updateFrontmatter: true
      })
    })
    
    if (!response.ok) throw new Error('Rename failed')
    
    isEditing.value = false
    window.location.reload()
  } catch (error) {
    console.error('Failed to rename:', error)
    alert('Failed to rename: ' + (error as Error).message)
  }
}

const cancelEdit = () => {
  isEditing.value = false
}

const closeExportMenu = () => {
  showExportMenu.value = false
}

// Click outside directive
declare global {
  interface HTMLElement {
    _clickOutside?: (event: Event) => void
  }
}

const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside, true)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', el._clickOutside!, true)
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const markdownToHtml = (md: string): string => {
  return md
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/```[\s\S]*?```/gim, (match) => `<pre><code>${match.slice(3, -3)}</code></pre>`)
    .replace(/`([^`]+)`/gim, '<code>$1</code>')
    .replace(/\n/gim, '<br>')
}

const addTitleToContent = (content: string, title: string): string => {
  let cleanContent = content
  if (content.startsWith('---')) {
    const endIndex = content.indexOf('---', 3)
    if (endIndex !== -1) {
      cleanContent = content.substring(endIndex + 3).trim()
    }
  }
  return `# ${title}\n\n${cleanContent}`
}

// 辅助函数：处理并导出内容
const processAndExportContent = async (content: string, format: 'md' | 'pdf' | 'docx') => {
  // 添加标题(如果需要)
  let processedContent = content
  if (exportWithTitle.value) {
    processedContent = addTitleToContent(content, displayTitle.value)
  }
  
  if (format === 'md') {
    const blob = new Blob([processedContent], { type: 'text/markdown' })
    downloadBlob(blob, `${displayTitle.value}.md`)
  } else if (format === 'pdf') {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${displayTitle.value}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
          h1 { color: #333; border-bottom: 2px solid #b8a090; padding-bottom: 10px; }
          h2 { color: #444; margin-top: 30px; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          pre { background: #f4f4f4; padding: 16px; border-radius: 8px; overflow-x: auto; }
        </style>
      </head>
      <body>
        ${markdownToHtml(processedContent)}
      </body>
      </html>
    `
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    }
  } else if (format === 'docx') {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>${displayTitle.value}</title></head>
      <body>${markdownToHtml(processedContent)}</body>
      </html>
    `
    const blob = new Blob([htmlContent], { type: 'application/msword' })
    downloadBlob(blob, `${displayTitle.value}.doc`)
  }
}

const exportDoc = async (format: 'md' | 'pdf' | 'docx') => {
  try {
    // FIX: 处理 folder-note 模式的路径
    let targetPath = filePath.value
    
    // 移除开头的 /
    if (targetPath.startsWith('/')) {
      targetPath = targetPath.slice(1)
    }
    
    // 如果以 / 结尾(folder-note 目录)，尝试两种可能的文件路径
    if (targetPath.endsWith('/')) {
      const folderName = targetPath.slice(0, -1).split('/').pop() || 'index'
      // 尝试 folder-name/folder-name.md 模式
      const possiblePaths = [
        `${targetPath}${folderName}.md`,
        `${targetPath}index.md`
      ]
      
      let content = null
      let lastError = null
      for (const path of possiblePaths) {
        try {
          // FIX: 使用 encodeURI 而不是 encodeURIComponent，保留路径结构
          const encodedPath = encodeURI(path)
          const response = await fetch(`/api/files/read?path=${encodedPath}`)
          if (response.ok) {
            content = await response.text()
            break
          }
        } catch (e) {
          lastError = e
          // 继续尝试下一个路径
        }
      }
      
      if (!content) {
        throw new Error('无法找到文件内容，尝试路径: ' + possiblePaths.join(', '))
      }
      
      // 处理内容并导出
      await processAndExportContent(content, format)
    } else {
      // 普通文件路径
      // FIX: 使用 encodeURI 而不是 encodeURIComponent，保留路径结构
      const encodedPath = encodeURI(targetPath)
      const response = await fetch(`/api/files/read?path=${encodedPath}`)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to fetch content: ${response.status} ${errorText}`)
      }
      
      const content = await response.text()
      await processAndExportContent(content, format)
    }
  } catch (error) {
    console.error('Export failed:', error)
    alert('导出失败: ' + (error as Error).message)
  }
  showExportMenu.value = false
}
</script>

<template>
  <div class="doc-title-bar">
    <div class="title-section">
      <template v-if="isEditing">
        <input
          ref="titleInput"
          v-model="editTitle"
          class="title-input"
          @keyup.enter="saveTitle"
          @keyup.esc="cancelEdit"
          @blur="saveTitle"
        />
      </template>
      <template v-else>
        <h1 class="doc-title" @click="startEdit">
          <span class="title-icon">[DOC]</span>
          <span class="title-text">{{ displayTitle }}</span>
          <span class="edit-hint">[EDIT]</span>
        </h1>
      </template>
    </div>
    
    <div class="export-section">
      <!-- 批量导出按钮 -->
      <button class="export-btn icon-btn" @click="showBatchExport = true" title="批量导出">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
          <line x1="8" y1="3" x2="16" y2="3"/>
        </svg>
      </button>
      
      <!-- 单个导出下拉菜单 -->
      <div class="export-dropdown" v-click-outside="closeExportMenu">
        <button class="export-btn icon-btn" @click="showExportMenu = !showExportMenu" title="导出当前文章">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
        </button>
        
        <Transition name="menu">
          <div v-if="showExportMenu" class="export-menu">
            <div class="export-option-row">
              <label class="checkbox-label">
                <input type="checkbox" v-model="exportWithTitle" />
                <span class="check-icon">{{ exportWithTitle ? '☑' : '☐' }}</span>
                <span class="label-text">包含标题</span>
              </label>
            </div>
            
            <div class="menu-divider"></div>
            
            <div class="menu-item" @click="exportDoc('md')">
              <span class="menu-icon">📝</span>
              <div class="menu-content">
                <span class="menu-label">Markdown</span>
                <span class="menu-desc">导出为 .md 文件</span>
              </div>
            </div>
            <div class="menu-item" @click="exportDoc('pdf')">
              <span class="menu-icon">📄</span>
              <div class="menu-content">
                <span class="menu-label">PDF 文档</span>
                <span class="menu-desc">打印为 PDF 格式</span>
              </div>
            </div>
            <div class="menu-item" @click="exportDoc('docx')">
              <span class="menu-icon">📘</span>
              <div class="menu-content">
                <span class="menu-label">Word 文档</span>
                <span class="menu-desc">导出为 Word 格式</span>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
  
  <BatchExportModal v-model:visible="showBatchExport" />
</template>

<style scoped>
/* ═══════════════════════════════════════════════════════════════
   DocTitleBar — Star River Style
   ═══════════════════════════════════════════════════════════════ */

.doc-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.6));
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  gap: 16px;
  min-height: 64px;
}

.title-section {
  flex: 1;
  min-width: 0;
}

.doc-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  font-family: var(--sr-font-primary, 'Inter', sans-serif);
  font-size: 20px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  cursor: pointer;
  transition: all 0.25s ease;
  line-height: 1.4;
  padding: 4px 0;
  letter-spacing: -0.02em;
}

.doc-title:hover {
  color: var(--sr-accent-star, #b8a090);
}

.title-icon {
  font-size: 14px;
  font-weight: 500;
  color: var(--sr-text-muted, #94a3b8);
  letter-spacing: 0.02em;
}

.title-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-hint {
  font-size: 11px;
  color: var(--sr-text-muted, #94a3b8);
  opacity: 0;
  transition: opacity 0.2s;
  font-weight: 400;
}

.doc-title:hover .edit-hint {
  opacity: 0.6;
}

.title-input {
  width: 100%;
  padding: 8px 16px;
  font-size: 20px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  background: var(--sr-bg-primary, #faf8f5);
  border: 2px solid var(--sr-accent-star, #b8a090);
  border-radius: var(--sr-radius-md, 10px);
  outline: none;
  font-family: var(--sr-font-primary, 'Inter', sans-serif);
}

.export-section {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

/* Icon buttons — neumorphic style */
.export-btn.icon-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-bg-elevated, #f5f0eb);
  border: none;
  border-radius: var(--sr-radius-sm, 8px);
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  box-shadow:
    3px 3px 6px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.06)),
    -3px -3px 6px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.8));
}

.export-btn.icon-btn:hover {
  color: var(--sr-accent-star, #b8a090);
  transform: scale(1.06);
}

.export-btn.icon-btn:active {
  box-shadow:
    inset 2px 2px 4px var(--sr-neu-shadow-dark, rgba(0, 0, 0, 0.08)),
    inset -2px -2px 4px var(--sr-neu-shadow-light, rgba(255, 255, 255, 0.6));
  transform: scale(0.96);
}

.export-btn.icon-btn svg {
  width: 16px;
  height: 16px;
}

/* Dropdown menu — glass card style */
.export-dropdown {
  position: relative;
}

.export-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: var(--sr-radius-lg, 16px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  padding: 12px;
  z-index: 1000;
}

.export-option-row {
  padding: 10px 12px;
  margin-bottom: 8px;
  background: var(--sr-bg-secondary, rgba(0, 0, 0, 0.02));
  border-radius: var(--sr-radius-sm, 8px);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input { display: none; }

.check-icon {
  color: var(--sr-accent-star, #b8a090);
}

.label-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-secondary, #64748b);
}

.menu-divider {
  height: 1px;
  background: var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  margin: 8px 0;
}

.menu-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--sr-radius-sm, 8px);
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: var(--sr-bg-secondary, rgba(0, 0, 0, 0.03));
}

.menu-icon { font-size: 16px; }

.menu-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-primary, #1a1a2e);
}

.menu-desc {
  font-size: 11px;
  color: var(--sr-text-muted, #94a3b8);
}

.menu-enter-active, .menu-leave-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.menu-enter-from, .menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 768px) {
  .doc-title-bar {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px;
  }
  
  .doc-title { font-size: 18px; }
  .title-input { font-size: 18px; }
  
  .export-section {
    width: 100%;
    justify-content: flex-end;
  }
  
  .export-menu {
    right: 0;
    left: auto;
  }
}
</style>
