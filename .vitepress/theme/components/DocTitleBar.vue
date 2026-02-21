<script setup lang="ts">
import { ref, computed } from 'vue'
import { useData, useRoute } from 'vitepress'
import BatchExportModal from './BatchExportModal.vue'

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
  // 添加标题（如果需要）
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
          h1 { color: #333; border-bottom: 2px solid #1677ff; padding-bottom: 10px; }
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
    
    // 如果以 / 结尾（folder-note 目录），尝试两种可能的文件路径
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
          const encodedPath = encodeURIComponent(path)
          const response = await fetch(`/api/files/content?path=${encodedPath}`)
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
      const encodedPath = encodeURIComponent(targetPath)
      const response = await fetch(`/api/files/content?path=${encodedPath}`)
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
          <span class="edit-hint" title="Click to edit">[EDIT]</span>
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
.doc-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e2e8f0;
  gap: 16px;
  min-height: 80px;
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
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.4;
  padding: 8px 0;
}

.doc-title:hover {
  color: #1677ff;
}

.title-icon {
  font-size: 20px;
}

.title-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.edit-hint {
  font-size: 12px;
  opacity: 0;
  transition: opacity 0.2s;
}

.doc-title:hover .edit-hint {
  opacity: 0.5;
}

.title-input {
  width: 100%;
  padding: 8px 16px;
  font-size: 24px;
  font-weight: 600;
  color: #1e293b;
  background: white;
  border: 2px solid #1677ff;
  border-radius: 8px;
  outline: none;
}

.export-section {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  background: #f9fafb;
}

.export-btn.primary {
  background: #1677ff;
  color: white;
  border-color: #1677ff;
}

.export-btn.primary:hover {
  background: #0958d9;
}

/* Icon button style for top buttons */
.export-btn.icon-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  justify-content: center;
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.export-btn.icon-btn:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
  color: #374151;
}

.export-btn.icon-btn svg {
  width: 18px;
  height: 18px;
}

.arrow {
  transition: transform 0.2s;
}

.arrow.open {
  transform: rotate(180deg);
}

.batch-btn {
  background: #f3f4f6;
  border-color: #e5e7eb;
}

.export-dropdown {
  position: relative;
}

.export-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 260px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  padding: 12px;
  z-index: 1000;
}

.export-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.info-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 8px;
}

.info-content {
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}

.info-content p {
  margin: 4px 0;
}

.export-option-row {
  padding: 12px;
  margin-bottom: 8px;
  background: #fafafa;
  border-radius: 8px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox-label input {
  display: none;
}

.check-icon {
  color: #1677ff;
}

.label-text {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.option-hint {
  margin-top: 4px;
  margin-left: 26px;
  font-size: 11px;
  color: #9ca3af;
}

.menu-divider {
  height: 1px;
  background: #e5e7eb;
  margin: 8px 0;
}

.menu-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.menu-item:hover {
  background: #f3f4f6;
}

.menu-icon {
  font-size: 16px;
}

.menu-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.menu-label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.menu-desc {
  font-size: 12px;
  color: #6b7280;
}

.menu-enter-active, .menu-leave-active {
  transition: all 0.2s ease;
}

.menu-enter-from, .menu-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 768px) {
  .doc-title-bar {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px;
  }
  
  .doc-title {
    font-size: 20px;
  }
  
  .title-input {
    font-size: 20px;
  }
  
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
