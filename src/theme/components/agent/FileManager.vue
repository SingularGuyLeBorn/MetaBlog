<template>
  <div class="file-manager">
    <!-- 头部 -->
    <div class="fm-header">
      <div class="header-title">
        <Icon name="folder-open" class="title-icon" />
        <div>
          <h2 class="title-text">文件管理</h2>
          <p class="title-desc">浏览、创建和管理项目文件</p>
        </div>
      </div>
    </div>

    <div class="fm-body">
      <!-- 左侧文件树 -->
      <LiquidGlass class="file-tree-panel" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.2">
        <!-- 面包屑 -->
        <div class="breadcrumb">
          <span
            v-for="(crumb, idx) in breadcrumbs"
            :key="idx"
            class="breadcrumb-item"
            @click="navigateTo(crumb.path)"
          >
            <Icon v-if="idx === 0" name="home" class="breadcrumb-home" />
            <span v-else>{{ crumb.name }}</span>
            <Icon v-if="idx < breadcrumbs.length - 1" name="chevron-right" class="breadcrumb-sep" />
          </span>
        </div>

        <!-- 工具栏 -->
        <div class="tree-toolbar">
          <button class="toolbar-btn" @click="showMkdirModal = true">
            <Icon name="folder-plus" />
            新建目录
          </button>
          <button class="toolbar-btn refresh" @click="loadFiles(currentPath)">
            <Icon name="refresh-cw" />
            刷新
          </button>
        </div>

        <!-- 文件列表 -->
        <div class="file-list">
          <div
            v-for="item in fileList"
            :key="item.path"
            class="file-item"
            :class="{ active: selectedPath === item.path, directory: item.isDirectory }"
            @click="handleItemClick(item)"
          >
            <Icon
              :name="item.isDirectory ? (expandedDirs.has(item.path) ? 'folder-open' : 'folder') : 'file'"
              class="file-item-icon"
            />
            <span class="file-item-name">{{ item.name }}</span>
            <div class="file-item-actions">
              <button
                v-if="!item.isDirectory"
                class="action-btn"
                title="编辑"
                @click.stop="openFile(item.path)"
              >
                <Icon name="edit" />
              </button>
              <button
                class="action-btn danger"
                title="删除"
                @click.stop="deleteItem(item)"
              >
                <Icon name="trash-2" />
              </button>
            </div>
          </div>

          <div v-if="loading" class="empty-state">
            <Icon name="loader" class="empty-icon" />
            <p>加载中...</p>
          </div>
          <div v-else-if="fileList.length === 0" class="empty-state">
            <Icon name="folder-open" class="empty-icon" />
            <p>空目录</p>
          </div>
        </div>
      </LiquidGlass>

      <!-- 右侧编辑器 -->
      <LiquidGlass
        v-if="editorVisible"
        class="file-editor-panel"
        glow-color="var(--sr-morandi-green, #a8b3a8)"
        :intensity="0.2"
      >
        <div class="editor-header">
          <div class="editor-title">
            <Icon name="file-text" />
            <span>{{ editingFileName }}</span>
          </div>
          <div class="editor-actions">
            <button class="save-btn" @click="saveFile">
              <Icon name="save" />
              保存
            </button>
            <button class="close-btn" @click="closeEditor">
              <Icon name="x" />
            </button>
          </div>
        </div>
        <textarea
          v-model="fileContent"
          class="editor-textarea"
          spellcheck="false"
        />
      </LiquidGlass>

      <!-- 空状态提示 -->
      <LiquidGlass
        v-else
        class="file-editor-panel empty-editor"
        glow-color="var(--sr-morandi-blue, #9aa8b8)"
        :intensity="0.15"
      >
        <div class="editor-placeholder">
          <Icon name="file" class="placeholder-icon" />
          <p>选择文件以查看和编辑内容</p>
        </div>
      </LiquidGlass>
    </div>

    <!-- 新建目录弹窗 -->
    <div v-if="showMkdirModal" class="modal" @click.self="showMkdirModal = false">
      <LiquidGlass class="modal-content" glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.4">
        <h3>新建目录</h3>
        <div class="form-group">
          <label>目录名称</label>
          <input v-model="newDirName" placeholder="输入目录名" @keyup.enter="mkdir" />
        </div>
        <div class="modal-actions">
          <button class="primary" @click="mkdir">创建</button>
          <button class="secondary" @click="showMkdirModal = false">取消</button>
        </div>
      </LiquidGlass>
    </div>

    <!-- 通知 -->
    <div v-if="notification" :class="['notification', notification.type]">
      {{ notification.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, LiquidGlass } from '@/theme/components/common'
import { computed, onMounted, ref } from 'vue'

interface FileItem {
  name: string
  isDirectory: boolean
  isFile: boolean
  path: string
}

const currentPath = ref('.')
const fileList = ref<FileItem[]>([])
const loading = ref(false)
const selectedPath = ref('')
const expandedDirs = ref<Set<string>>(new Set())

const editorVisible = ref(false)
const editingFilePath = ref('')
const fileContent = ref('')
const saving = ref(false)

const showMkdirModal = ref(false)
const newDirName = ref('')

const notification = ref<{ type: string; message: string } | null>(null)

const breadcrumbs = computed(() => {
  const parts = currentPath.value.split('/').filter(Boolean)
  const crumbs = [{ name: '根目录', path: '.' }]
  let acc = ''
  for (const part of parts) {
    acc = acc ? `${acc}/${part}` : part
    crumbs.push({ name: part, path: acc })
  }
  return crumbs
})

const editingFileName = computed(() => {
  if (!editingFilePath.value) return ''
  const parts = editingFilePath.value.split('/')
  return parts[parts.length - 1]
})

async function loadFiles(path: string) {
  loading.value = true
  try {
    const res = await fetch(`/api/files/list?path=${encodeURIComponent(path)}`)
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      fileList.value = json.data.sort((a: FileItem, b: FileItem) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
        return a.isDirectory ? -1 : 1
      })
    } else {
      fileList.value = []
    }
  } catch (e) {
    console.error('[FileManager] 加载文件失败:', e)
    showNotification('error', '加载文件失败')
    fileList.value = []
  } finally {
    loading.value = false
  }
}

function navigateTo(path: string) {
  currentPath.value = path
  loadFiles(path)
}

function handleItemClick(item: FileItem) {
  selectedPath.value = item.path
  if (item.isDirectory) {
    if (expandedDirs.value.has(item.path)) {
      expandedDirs.value.delete(item.path)
    } else {
      expandedDirs.value.add(item.path)
    }
    currentPath.value = item.path
    loadFiles(item.path)
  } else {
    openFile(item.path)
  }
}

async function openFile(filePath: string) {
  try {
    const res = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`)
    if (!res.ok) {
      showNotification('error', '读取文件失败')
      return
    }
    const content = await res.text()
    editingFilePath.value = filePath
    fileContent.value = content
    editorVisible.value = true
  } catch (e) {
    console.error('[FileManager] 读取文件失败:', e)
    showNotification('error', '读取文件失败')
  }
}

async function saveFile() {
  if (!editingFilePath.value || saving.value) return
  saving.value = true
  try {
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: editingFilePath.value, content: fileContent.value }),
    })
    const json = await res.json()
    if (json.success) {
      showNotification('success', '文件保存成功')
    } else {
      showNotification('error', json.error || '保存失败')
    }
  } catch (e) {
    console.error('[FileManager] 保存文件失败:', e)
    showNotification('error', '保存失败')
  } finally {
    saving.value = false
  }
}

function closeEditor() {
  editorVisible.value = false
  editingFilePath.value = ''
  fileContent.value = ''
  selectedPath.value = ''
}

async function mkdir() {
  if (!newDirName.value.trim()) return
  const dirPath = currentPath.value === '.'
    ? newDirName.value.trim()
    : `${currentPath.value}/${newDirName.value.trim()}`
  try {
    const res = await fetch('/api/files/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    })
    const json = await res.json()
    if (json.success) {
      showNotification('success', '目录创建成功')
      showMkdirModal.value = false
      newDirName.value = ''
      loadFiles(currentPath.value)
    } else {
      showNotification('error', json.error || '创建失败')
    }
  } catch (e) {
    console.error('[FileManager] 创建目录失败:', e)
    showNotification('error', '创建目录失败')
  }
}

async function deleteItem(item: FileItem) {
  const type = item.isDirectory ? '目录' : '文件'
  if (!confirm(`确定要删除${type} "${item.name}" 吗？`)) return
  try {
    const res = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: item.path, permanent: true }),
    })
    const json = await res.json()
    if (json.success) {
      showNotification('success', '删除成功')
      if (editingFilePath.value === item.path) {
        closeEditor()
      }
      loadFiles(currentPath.value)
    } else {
      showNotification('error', json.error || '删除失败')
    }
  } catch (e) {
    console.error('[FileManager] 删除失败:', e)
    showNotification('error', '删除失败')
  }
}

function showNotification(type: string, message: string) {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 3000)
}

onMounted(() => {
  loadFiles('.')
})
</script>

<style scoped>
.file-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px;
}

.fm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  color: var(--sr-accent-star, #b8a090);
}

.title-text {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.title-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

.fm-body {
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 20px;
}

/* 文件树面板 */
.file-tree-panel {
  border-radius: 24px;
  padding: 20px;
  min-height: 500px;
  display: flex;
  flex-direction: column;
}

.breadcrumb {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  margin-bottom: 12px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: color 0.2s;
}

.breadcrumb-item:hover {
  color: var(--sr-accent-star, #b8a090);
}

.breadcrumb-home {
  width: 16px;
  height: 16px;
}

.breadcrumb-sep {
  width: 14px;
  height: 14px;
}

.tree-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(0, 0, 0, 0.04);
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: 10px;
  font-size: 13px;
  color: var(--sr-text-primary, #1a1a2e);
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: rgba(184, 160, 144, 0.1);
  border-color: rgba(184, 160, 144, 0.3);
}

.toolbar-btn svg {
  width: 16px;
  height: 16px;
}

.file-list {
  flex: 1;
  overflow-y: auto;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;
}

.file-item:hover {
  background: rgba(0, 0, 0, 0.04);
}

.file-item.active {
  background: rgba(184, 160, 144, 0.12);
}

.file-item-icon {
  width: 18px;
  height: 18px;
  color: var(--sr-text-muted, #94a3b8);
  flex-shrink: 0;
}

.file-item.directory .file-item-icon {
  color: var(--sr-accent-star, #b8a090);
}

.file-item-name {
  flex: 1;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-item:hover .file-item-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 6px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(184, 160, 144, 0.15);
  color: var(--sr-accent-star, #b8a090);
}

.action-btn.danger:hover {
  background: rgba(212, 184, 184, 0.2);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

/* 编辑器面板 */
.file-editor-panel {
  border-radius: 24px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  min-height: 500px;
}

.empty-editor {
  display: flex;
  align-items: center;
  justify-content: center;
}

.editor-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.placeholder-icon {
  width: 64px;
  height: 64px;
  color: var(--sr-glass-border, rgba(0, 0, 0, 0.08));
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  margin-bottom: 12px;
}

.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.editor-title svg {
  width: 18px;
  height: 18px;
  color: var(--sr-morandi-green, #a8b3a8);
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.save-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--sr-morandi-green, #a8b3a8);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.save-btn:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

.save-btn svg {
  width: 14px;
  height: 14px;
}

.close-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 8px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(212, 184, 184, 0.15);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.close-btn svg {
  width: 16px;
  height: 16px;
}

.editor-textarea {
  flex: 1;
  width: 100%;
  min-height: 400px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: 14px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: var(--sr-text-primary, #1a1a2e);
  resize: none;
  outline: none;
  transition: border-color 0.2s;
}

.editor-textarea:focus {
  border-color: rgba(184, 160, 144, 0.4);
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  text-align: center;
  color: var(--sr-text-muted, #94a3b8);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  color: var(--sr-glass-border, rgba(0, 0, 0, 0.1));
}

/* 弹窗 */
.modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  padding: 28px;
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: var(--sr-text-primary, #1a1a2e);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--sr-text-primary, #1a1a2e);
}

.form-group input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: 10px;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  outline: none;
  transition: border-color 0.2s;
}

.form-group input:focus {
  border-color: rgba(184, 160, 144, 0.4);
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.modal-actions button {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-actions .primary {
  background: var(--sr-morandi-green, #a8b3a8);
  color: white;
}

.modal-actions .primary:hover {
  opacity: 0.9;
}

.modal-actions .secondary {
  background: rgba(0, 0, 0, 0.05);
  color: var(--sr-text-muted, #94a3b8);
}

.modal-actions .secondary:hover {
  background: rgba(0, 0, 0, 0.08);
}

/* 通知 */
.notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 24px;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  animation: slideIn 0.3s ease;
  z-index: 200;
}

.notification.success {
  background: var(--sr-morandi-green, #a8b3a8);
}

.notification.error {
  background: var(--sr-morandi-pink, #d4b8b8);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .fm-body {
    grid-template-columns: 1fr;
  }

  .file-editor-panel {
    min-height: 300px;
  }
}
</style>
