<template>
  <div class="tree-node-wrapper">
    <!-- Node Content -->
    <div 
      class="node-row"
      :class="{ 
        'is-active': isExactActive,
        'has-children': hasChildren,
        'is-expanded': isExpanded
      }"
      :style="{ paddingLeft: (level * 12 + 8) + 'px' }"
      tabindex="-1"
      @click="handleClick"
      @keydown.enter.prevent="handleClick"
    >
      <!-- Toggle Button -->
      <span 
        v-if="hasChildren" 
        class="toggle-btn"
        :class="{ 'is-expanded': isExpanded }"
        @click.stop="toggle"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </span>
      <span v-else class="toggle-placeholder"></span>
      
      <!-- Icon -->
      <span class="node-icon" :class="{ 'is-folder': hasChildren, 'is-leaf': !hasChildren }">
        <svg v-if="hasChildren" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </span>
      
      <!-- Title with tooltip for long text -->
      <a 
        v-if="item.link"
        :href="item.link" 
        class="node-title"
        :title="item.text"
        @click.prevent.stop="$emit('navigate', item.link)"
      >
        {{ item.text }}
      </a>
      <span v-else class="node-title no-link" :title="item.text">{{ item.text }}</span>
      
      <!-- Action Buttons (only show on hover for leaf nodes) -->
      <div v-if="!hasChildren && item.link" class="node-actions" @click.stop>
        <!-- Add Child Button -->
        <button 
          class="action-btn add-btn" 
          title="创建子文档"
          @click="showCreateChildModal"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        
        <!-- More Actions Button -->
        <div class="more-actions-wrapper">
          <button 
            class="action-btn more-btn" 
            title="更多操作"
            @click="toggleMenu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="5" r="1"/>
              <circle cx="12" cy="12" r="1"/>
              <circle cx="12" cy="19" r="1"/>
            </svg>
          </button>
          
          <!-- Dropdown Menu -->
          <Transition name="menu">
            <div v-if="showMenu" class="action-menu" v-click-outside="closeMenu">
              <div class="menu-item" @click="renameItem">
                <span class="menu-icon">✏️</span>
                <span class="menu-label">重命名</span>
              </div>
              <div class="menu-item" @click="editItem">
                <span class="menu-icon">📝</span>
                <span class="menu-label">编辑文档</span>
              </div>
              <div class="menu-item" @click="copyLink">
                <span class="menu-icon">🔗</span>
                <span class="menu-label">复制链接</span>
              </div>
              <div class="menu-item" @click="openInNewTab">
                <span class="menu-icon">↗️</span>
                <span class="menu-label">在新标签页打开</span>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item" @click="moveToRoot">
                <span class="menu-icon">📤</span>
                <span class="menu-label">移出目录</span>
              </div>
              <div class="menu-item" @click="openCopyModal">
                <span class="menu-icon">📋</span>
                <span class="menu-label">复制...</span>
              </div>
              <div class="menu-item" @click="openMoveModal">
                <span class="menu-icon">📁</span>
                <span class="menu-label">移动...</span>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item" @click="togglePinned">
                <span class="menu-icon">📌</span>
                <span class="menu-label">{{ isPinned ? '取消置顶' : '置顶文档' }}</span>
              </div>
              <div class="menu-divider"></div>
              <div class="menu-item danger" @click="confirmDelete">
                <span class="menu-icon">🗑️</span>
                <span class="menu-label">删除</span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Children -->
    <Transition name="expand">
      <div 
        v-if="hasChildren && isExpanded" 
        class="node-children"
      >
        <TreeNode
          v-for="(child, index) in item.items"
          :key="child.id || child.link || index"
          :item="child"
          :level="level + 1"
          :active-path="activePath"
          :expanded-ids="expandedIds"
          @navigate="$emit('navigate', $event)"
          @toggle="$emit('toggle', $event)"
          @refresh="$emit('refresh', $event)"
        />
      </div>
    </Transition>
    
    <!-- Create Child Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h4>创建子文档</h4>
              <button class="btn-close" @click="showCreateModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>文档标题 <span class="required">*</span></label>
                <input v-model="newDocTitle" type="text" placeholder="输入标题" class="form-input" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showCreateModal = false">取消</button>
              <button class="btn-primary" @click="createChild" :disabled="!newDocTitle.trim()">
                创建
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Rename Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showRenameModal" class="modal-overlay" @click="showRenameModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h4>重命名</h4>
              <button class="btn-close" @click="showRenameModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>新名称 <span class="required">*</span></label>
                <input v-model="newName" type="text" placeholder="输入新名称" class="form-input" />
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showRenameModal = false">取消</button>
              <button class="btn-primary" @click="doRename" :disabled="!newName.trim()">
                确认
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Move Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showMoveModal" class="modal-overlay" @click="showMoveModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h4>移动文档</h4>
              <button class="btn-close" @click="showMoveModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>目标目录 <span class="required">*</span></label>
                <select v-model="targetDir" class="form-select">
                  <option value="">选择目录...</option>
                  <option value="posts">posts/</option>
                  <option value="sections/posts">sections/posts/</option>
                  <option value="sections/knowledge">sections/knowledge/</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showMoveModal = false">取消</button>
              <button class="btn-primary" @click="doMove" :disabled="!targetDir">
                移动
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Delete Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
          <div class="modal-content modal-small" @click.stop>
            <div class="modal-header">
              <h4>⚠️ 确认删除</h4>
            </div>
            <div class="modal-body">
              <p>确定要删除 <strong>"{{ item.text }}"</strong> 吗？</p>
              <p class="warning-text">此操作不可恢复！</p>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showDeleteModal = false">取消</button>
              <button class="btn-danger" @click="doDelete">确认删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast.visible" class="toast" :class="toast.type">
          <span class="toast-icon">{{ toast.icon }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  item: any
  level: number
  activePath: string
  expandedIds: Set<string>
}>()

const emit = defineEmits(['navigate', 'toggle', 'refresh'])

// State
const showMenu = ref(false)
const showCreateModal = ref(false)
const showRenameModal = ref(false)
const showMoveModal = ref(false)
const showDeleteModal = ref(false)
const newDocTitle = ref('')
const newName = ref('')
const targetDir = ref('')
const isPinned = ref(props.item.pinned || false)

const toast = ref({
  visible: false,
  type: 'info' as 'success' | 'error' | 'info',
  message: '',
  icon: ''
})

const itemId = computed(() => props.item.id || props.item.link)
const hasChildren = computed(() => props.item.items && props.item.items.length > 0)
const isExpanded = computed(() => itemId.value ? props.expandedIds.has(itemId.value) : false)

const isExactActive = computed(() => {
  if (!props.item.link) return false
  const itemPath = props.item.link.replace(/\/$/, '')
  const currentPath = props.activePath.replace(/\/$/, '')
  return currentPath === itemPath
})

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
    document.removeEventListener('click', el._clickOutside, true)
  }
}

// Methods
const toggle = () => {
  if (itemId.value) {
    emit('toggle', itemId.value)
  }
}

const handleClick = () => {
  if (hasChildren.value) {
    toggle()
  } else if (props.item.link) {
    emit('navigate', props.item.link)
  }
}

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const showToast = (type: 'success' | 'error' | 'info', message: string) => {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  toast.value = { visible: true, type, message, icon: icons[type] }
  setTimeout(() => toast.value.visible = false, 3000)
}

// Create Child
const showCreateChildModal = () => {
  newDocTitle.value = ''
  showCreateModal.value = true
  closeMenu()
}

const createChild = async () => {
  if (!newDocTitle.value.trim()) return
  
  try {
    // Determine parent path
    const parentPath = props.item.link.replace('.html', '')
    const fileName = `${newDocTitle.value.toLowerCase().replace(/\s+/g, '-')}.md`
    const newPath = `${parentPath}/${fileName}`
    
    const content = `# ${newDocTitle.value}\n\n`
    
    const res = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: newPath, content })
    })
    
    if (res.ok) {
      showToast('success', '子文档创建成功')
      showCreateModal.value = false
      emit('refresh')
    } else {
      throw new Error('创建失败')
    }
  } catch (e) {
    showToast('error', '创建失败: ' + (e as Error).message)
  }
}

// Rename
const renameItem = () => {
  newName.value = props.item.text
  showRenameModal.value = true
  closeMenu()
}

// Helper: Convert link to MD path
const linkToMdPath = (link: string): string => {
  // Remove trailing slash and add .md
  return link.replace(/\/$/, '') + '.md'
}

const doRename = async () => {
  if (!newName.value.trim()) return
  
  try {
    // 读取现有文件
    const mdPath = linkToMdPath(props.item.link)
    const readRes = await fetch(`/api/files/read?path=${encodeURIComponent(mdPath)}`)
    if (!readRes.ok) throw new Error('读取文件失败')
    
    let content = await readRes.text()
    
    // 更新 frontmatter 中的 title，如果没有 frontmatter 则添加
    if (content.startsWith('---')) {
      // 更新现有的 title
      if (content.match(/title:\s*.+/)) {
        content = content.replace(/title:\s*.+/, `title: ${newName.value}`)
      } else {
        // 在 frontmatter 中添加 title
        content = content.replace(/---\n/, `---\ntitle: ${newName.value}\n`)
      }
    } else {
      // 没有 frontmatter，添加一个新的
      content = `---\ntitle: ${newName.value}\n---\n\n${content}`
    }
    
    // 保存
    const saveRes = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: mdPath, content })
    })
    
    if (saveRes.ok) {
      showToast('success', '重命名成功')
      showRenameModal.value = false
      emit('refresh')
    } else {
      throw new Error('保存失败')
    }
  } catch (e) {
    showToast('error', '重命名失败: ' + (e as Error).message)
  }
}

// Edit
const editItem = () => {
  window.open(linkToMdPath(props.item.link), '_blank')
  closeMenu()
}

// Copy Link
const copyLink = () => {
  const url = window.location.origin + props.item.link
  navigator.clipboard.writeText(url)
  showToast('success', '链接已复制')
  closeMenu()
}

// Open in New Tab
const openInNewTab = () => {
  window.open(props.item.link, '_blank')
  closeMenu()
}

// Move to Root
const moveToRoot = async () => {
  try {
    const fromPath = linkToMdPath(props.item.link)
    const fileName = fromPath.split('/').pop()
    const toPath = `posts/${fileName}`
    
    const res = await fetch('/api/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromPath, to: toPath })
    })
    
    if (res.ok) {
      showToast('success', '已移出目录')
      emit('refresh')
    } else {
      throw new Error('移动失败')
    }
  } catch (e) {
    showToast('error', '移动失败: ' + (e as Error).message)
  }
  closeMenu()
}

// Copy
const openCopyModal = () => {
  showToast('info', '复制功能开发中...')
  closeMenu()
}

// Move
const openMoveModal = () => {
  targetDir.value = ''
  showMoveModal.value = true
  closeMenu()
}

const doMove = async () => {
  if (!targetDir.value) return
  
  try {
    const fromPath = linkToMdPath(props.item.link)
    const fileName = fromPath.split('/').pop()
    const toPath = `${targetDir.value}/${fileName}`
    
    const res = await fetch('/api/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: fromPath, to: toPath })
    })
    
    if (res.ok) {
      showToast('success', '移动成功')
      showMoveModal.value = false
      emit('refresh')
    } else {
      throw new Error('移动失败')
    }
  } catch (e) {
    showToast('error', '移动失败: ' + (e as Error).message)
  }
}

// Toggle Pinned
const togglePinned = async () => {
  try {
    const mdPath = linkToMdPath(props.item.link)
    const readRes = await fetch(`/api/files/read?path=${encodeURIComponent(mdPath)}`)
    if (!readRes.ok) throw new Error('读取文件失败')
    
    let content = await readRes.text()
    const newPinned = !isPinned.value
    
    if (content.startsWith('---')) {
      if (content.includes('pinned:')) {
        content = content.replace(/pinned:\s*(true|false)/, `pinned: ${newPinned}`)
      } else {
        content = content.replace(/---\n/, `---\npinned: ${newPinned}\n`)
      }
    } else {
      content = `---\ntitle: ${props.item.text}\npinned: ${newPinned}\n---\n\n${content}`
    }
    
    const saveRes = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: mdPath, content })
    })
    
    if (saveRes.ok) {
      isPinned.value = newPinned
      showToast('success', newPinned ? '已置顶' : '已取消置顶')
    } else {
      throw new Error('保存失败')
    }
  } catch (e) {
    showToast('error', '操作失败: ' + (e as Error).message)
  }
  closeMenu()
}

// Delete
const confirmDelete = () => {
  showDeleteModal.value = true
  closeMenu()
}

const doDelete = async () => {
  try {
    const mdPath = linkToMdPath(props.item.link)
    const res = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: mdPath })
    })
    
    if (res.ok) {
      showToast('success', '已删除')
      showDeleteModal.value = false
      emit('refresh')
    } else {
      throw new Error('删除失败')
    }
  } catch (e) {
    showToast('error', '删除失败: ' + (e as Error).message)
  }
}
</script>

<style scoped>
.tree-node-wrapper {
  width: 100%;
}

.node-row {
  display: flex;
  align-items: center;
  padding: 5px 8px;
  margin: 1px 0;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 200ms ease, color 200ms ease;
  user-select: none;
  position: relative;
}

.node-row:focus {
  outline: 2px solid var(--vp-c-brand, #1677ff);
  outline-offset: -2px;
  background: var(--vp-c-bg-soft, #f5f5f5);
}

.node-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: transparent;
  border-radius: 0 2px 2px 0;
  transition: background 0.2s;
}

.node-row:hover {
  background: var(--vp-c-bg-soft, #f0f0f0);
}

.node-row.is-active {
  background: var(--vp-c-brand-soft, rgba(22, 119, 255, 0.1));
}

.node-row.is-active::before {
  background: var(--vp-c-brand, #1677ff);
}

/* Show actions on hover */
.node-row:hover .node-actions {
  opacity: 1;
  visibility: visible;
}

.toggle-btn {
  width: 16px;
  height: 16px;
  margin-right: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--vp-c-text-3, #8c8c8c);
  transition: transform 200ms ease;
  cursor: pointer;
  border-radius: 3px;
}

.toggle-btn:hover {
  background: var(--vp-c-divider, #e8e8e8);
}

.toggle-btn svg {
  width: 12px;
  height: 12px;
}

.toggle-btn.is-expanded {
  transform: rotate(90deg);
}

.toggle-placeholder {
  width: 16px;
  margin-right: 2px;
}

.node-icon {
  width: 16px;
  height: 16px;
  margin-right: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--vp-c-text-3, #bfbfbf);
}

.node-icon svg {
  width: 14px;
  height: 14px;
}

.node-icon.is-folder {
  color: var(--vp-c-warning, #faad14);
}

.node-row.is-active .node-icon.is-leaf {
  color: var(--vp-c-brand, #1677ff);
}

.node-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--vp-c-text-2, #595959);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-title.no-link {
  cursor: default;
}

.node-title:hover {
  color: var(--vp-c-text-1, #262626);
}

.node-row.is-active .node-title {
  color: var(--vp-c-brand, #1677ff);
  font-weight: 500;
}

/* Node Actions */
.node-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  opacity: 0;
  visibility: hidden;
  transition: opacity 200ms ease, visibility 200ms ease;
}

.action-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  color: var(--vp-c-text-3, #8c8c8c);
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-bg, #ffffff);
  color: var(--vp-c-text-1, #262626);
}

.action-btn svg {
  width: 14px;
  height: 14px;
}

.add-btn:hover {
  color: var(--vp-c-brand, #1677ff);
}

.more-actions-wrapper {
  position: relative;
}

/* Action Menu */
.action-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  min-width: 160px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e7e5e4;
  z-index: 1000;
  padding: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #292524;
  transition: background 0.15s;
}

.menu-item:hover {
  background: #f5f5f4;
}

.menu-item.danger {
  color: #dc2626;
}

.menu-item.danger:hover {
  background: #fee2e2;
}

.menu-icon {
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.menu-label {
  flex: 1;
}

.menu-divider {
  height: 1px;
  background: #e7e5e4;
  margin: 4px 0;
}

/* Node Children */
.node-children {
  position: relative;
}

/* Expand Animation */
.expand-enter-active,
.expand-leave-active {
  transition: opacity 200ms ease, max-height 200ms ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

.expand-enter-to,
.expand-leave-from {
  opacity: 1;
  max-height: 2000px;
}

/* Menu Animation */
.menu-enter-active,
.menu-leave-active {
  transition: opacity 150ms ease, transform 150ms ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-small {
  max-width: 320px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f4;
}

.modal-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #292524;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  font-size: 20px;
  color: #a8a29e;
  cursor: pointer;
  border-radius: 8px;
}

.btn-close:hover {
  background: #f5f5f4;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 20px;
  border-top: 1px solid #f5f5f4;
  background: #fafaf9;
}

/* Form */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #57534e;
  margin-bottom: 6px;
}

.required {
  color: #dc2626;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  font-size: 14px;
  background: #fafaf9;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: #94a3b8;
  background: white;
}

/* Buttons */
.btn-secondary,
.btn-primary,
.btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: #f5f5f4;
  color: #57534e;
}

.btn-secondary:hover {
  background: #e7e5e4;
}

.btn-primary {
  background: #475569;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #334155;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover {
  background: #b91c1c;
}

.warning-text {
  color: #dc2626;
  font-size: 13px;
  margin-top: 8px;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10000;
}

.toast.success {
  background: #dcfce7;
  color: #166534;
}

.toast.error {
  background: #fee2e2;
  color: #991b1b;
}

.toast.info {
  background: #e0f2fe;
  color: #0c4a6e;
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
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
</style>
