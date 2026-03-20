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
    
    <!-- Copy Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCopyModal" class="modal-overlay" @click="showCopyModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h4>复制文档</h4>
              <button class="btn-close" @click="showCopyModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>目标目录 <span class="required">*</span></label>
                <select v-model="copyTargetDir" class="form-select">
                  <option value="">选择目录...</option>
                  <option value="posts">posts/</option>
                  <option value="sections/posts">sections/posts/</option>
                  <option value="sections/knowledge">sections/knowledge/</option>
                  <option value="sections/resources">sections/resources/</option>
                </select>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showCopyModal = false">取消</button>
              <button class="btn-primary" @click="doCopy" :disabled="!copyTargetDir">
                复制
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
                  <option value="sections/resources">sections/resources/</option>
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
import { logger, logFileOperation } from '../../composables/useLogger'

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
const showCopyModal = ref(false)
const showMoveModal = ref(false)
const showDeleteModal = ref(false)
const newDocTitle = ref('')
const newName = ref('')
const targetDir = ref('')
const copyTargetDir = ref('')
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
  mounted(el: HTMLElement & { _clickOutside?: (event: Event) => void }, binding: any) {
    el._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside as EventListener, true)
  },
  unmounted(el: HTMLElement & { _clickOutside?: (event: Event) => void }) {
    if (el._clickOutside) {
      document.removeEventListener('click', el._clickOutside as EventListener, true)
    }
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

// Create Child - 创建子文档
const showCreateChildModal = () => {
  newDocTitle.value = ''
  showCreateModal.value = true
  closeMenu()
}

const createChild = async () => {
  if (!newDocTitle.value.trim()) return
  
  try {
    // 使用 /api/articles/create 端点，它会自动处理叶子文档转换
    const baseName = newDocTitle.value.trim()
    
    // 从 parent link 提取 section
    const parentLink = props.item.link || ''
    const pathParts = parentLink.split('/').filter(Boolean)
    const section = pathParts[1] || 'posts' // sections/posts/xxx -> posts
    
    const res = await fetch('/api/articles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: baseName,
        content: `# ${baseName}\n\n`,
        section: section,
        isChildDoc: true,
        parentPath: parentLink
      })
    })
    
    const result = await res.json()
    
    if (result.success) {
      showToast('success', '子文档创建成功')
      showCreateModal.value = false
      // 记录日志
      logFileOperation('create', result.data.path, { title: baseName })
      // 展开当前目录
      if (itemId.value && !isExpanded.value) {
        emit('toggle', itemId.value)
      }
      emit('refresh')
    } else {
      throw new Error(result.error || '创建失败')
    }
  } catch (e) {
    showToast('error', '创建失败: ' + (e as Error).message)
    logger.error('file.create', `创建文件失败: ${e}`)
  }
}

// Helper: Convert link to MD path
const linkToMdPath = (link: string): string => {
  // Remove trailing slash and add .md
  return link.replace(/\/$/, '') + '.md'
}

// Helper: Convert link to relative path (for API)
const linkToRelativePath = (link: string): string => {
  return linkToMdPath(link).replace(/^\//, '')
}

// Rename
const renameItem = () => {
  newName.value = props.item.text
  showRenameModal.value = true
  closeMenu()
}

// 重命名核心逻辑：修改实际文件名 + 前后端校验
const doRename = async () => {
  if (!newName.value.trim()) return
  
  const originalName = props.item.text
  const desiredName = newName.value.trim()
  
  try {
    // Step 1: 调用后端重命名 API（修改实际文件名）
    const relativePath = linkToRelativePath(props.item.link)
    
    const renameRes = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        path: relativePath, 
        newName: desiredName,
        updateFrontmatter: true
      })
    })
    
    if (!renameRes.ok) {
      const error = await renameRes.json().catch(() => ({ error: '重命名失败' }))
      throw new Error(error.error || `重命名失败 (${renameRes.status})`)
    }
    
    const result = await renameRes.json()
    
    if (!result.success) {
      throw new Error(result.error || '重命名失败')
    }
    
    // Step 2: 前后端校验 - 确认后端返回的文件名与期望一致
    const backendName = result.data.displayName
    const backendNewPath = result.data.newPath
    
    // 校验逻辑：如果后端返回的名字与前端期望的不一样，使用后端的（作为标准）
    const finalName = (backendName && backendName !== desiredName) ? backendName : desiredName
    const finalPath = backendNewPath || relativePath
    
    // 校验警告（仅调试用，实际使用时会静默处理后端的规范化结果）
    if (backendName && backendName !== desiredName) {
      console.log(`[Rename] 名称已规范化: "${desiredName}" -> "${backendName}"`)
    }
    
    // Step 3: 记录日志
    logFileOperation('rename', finalPath, { oldPath: relativePath, newName: finalName })
    
    // Step 4: 通知父组件更新 - 传递新的路径和名字
    showToast('success', `已重命名为 "${finalName}"`)
    showRenameModal.value = false
    
    // 触发刷新，让父组件重新加载侧边栏数据
    emit('refresh', {
      oldPath: props.item.link,
      newPath: '/' + finalPath.replace(/\.md$/, ''),
      newName: finalName,
      oldName: originalName
    })
    
    // Step 5: 如果当前页面是被重命名的页面，自动导航到新路径
    const currentPath = window.location.pathname.replace(/\/$/, '')
    const oldPath = props.item.link.replace(/\/$/, '')
    
    if (currentPath === oldPath) {
      const newLink = '/' + finalPath.replace(/\.md$/, '') + '/'
      setTimeout(() => {
        window.location.href = newLink
      }, 500)
    }
    
  } catch (e) {
    console.error('[Rename Error]', e)
    showToast('error', '重命名失败: ' + (e as Error).message)
    logger.error('file.rename', `重命名失败: ${e}`)
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

// Copy - 复制文档到指定目录
const openCopyModal = () => {
  copyTargetDir.value = ''
  showCopyModal.value = true
  closeMenu()
}

const doCopy = async () => {
  if (!copyTargetDir.value) return
  
  try {
    const sourcePath = linkToRelativePath(props.item.link)
    const fileName = sourcePath.split('/').pop()
    const targetPath = `${copyTargetDir.value}/${fileName}`
    
    // 读取源文件内容
    const readRes = await fetch(`/api/files/read?path=${encodeURIComponent(sourcePath)}`)
    if (!readRes.ok) throw new Error('读取源文件失败')
    
    const content = await readRes.text()
    
    // 保存到目标路径
    const saveRes = await fetch('/api/files/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath, content })
    })
    
    if (saveRes.ok) {
      showToast('success', '复制成功')
      showCopyModal.value = false
      emit('refresh')
    } else {
      throw new Error('复制失败')
    }
  } catch (e) {
    showToast('error', '复制失败: ' + (e as Error).message)
  }
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
  padding: 6px 10px;
  margin: 2px 0;
  border-radius: var(--sr-radius-sm);
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
  user-select: none;
  position: relative;
}

.node-row:focus {
  outline: none;
  background: var(--sr-glass-bg);
}

.node-row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 2px;
  height: 0;
  background: var(--sr-morandi-purple);
  border-radius: 0 2px 2px 0;
  transition: height 0.2s var(--sr-spring-bounce);
}

.node-row:hover {
  background: var(--sr-glass-bg);
}

.node-row.is-active {
  background: var(--sr-glass-bg-hover);
}

.node-row.is-active::before {
  height: 60%;
}

/* Show actions on hover */
.node-row:hover .node-actions {
  opacity: 1;
  visibility: visible;
}

.toggle-btn {
  width: 16px;
  height: 16px;
  margin-right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sr-text-muted);
  transition: transform 0.2s var(--sr-spring-bounce);
  cursor: pointer;
  border-radius: 4px;
}

.toggle-btn:hover {
  background: var(--sr-glass-bg-hover);
  color: var(--sr-text-secondary);
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
  margin-right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: var(--sr-text-muted);
}

.node-icon svg {
  width: 14px;
  height: 14px;
}

.node-icon.is-folder {
  color: var(--sr-morandi-beige);
}

.node-row.is-active .node-icon.is-leaf {
  color: var(--sr-morandi-purple);
}

.node-title {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  line-height: 20px;
  color: var(--sr-text-muted);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.node-title.no-link {
  cursor: default;
}

.node-title:hover {
  color: var(--sr-text-secondary);
}

.node-row.is-active .node-title {
  color: var(--sr-text-primary);
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
  background: var(--sr-bg-tertiary);
  border-radius: var(--sr-radius-md);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--sr-glass-border);
  z-index: 1000;
  padding: 6px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: var(--sr-radius-sm);
  cursor: pointer;
  font-size: 13px;
  color: var(--sr-text-secondary);
  transition: background 0.15s ease;
}

.menu-item:hover {
  background: var(--sr-glass-bg);
}

.menu-item.danger {
  color: #c97b7b;
}

.menu-item.danger:hover {
  background: rgba(201, 123, 123, 0.1);
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
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: var(--sr-bg-tertiary);
  border: 1px solid var(--sr-glass-border);
  border-radius: var(--sr-radius-lg);
  width: 90%;
  max-width: 400px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
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
