<template>
  <div class="article-manager">
    <!-- Header -->
    <div class="manager-header">
      <h3 class="manager-title">
        <span class="title-icon">📝</span>
        文章管理
      </h3>
      <button class="btn-create" @click="showCreateModal = true">
        <span>+</span>
        新建文章
      </button>
    </div>

    <!-- Search & Filter -->
    <div class="manager-toolbar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索文章..."
          class="search-input"
        />
        <span class="search-icon">🔍</span>
      </div>
      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentFilter === tab.value }"
          @click="currentFilter = tab.value"
        >
          {{ tab.label }}
        </button>
      </div>
    </div>

    <!-- Article List -->
    <div class="article-list" v-if="filteredArticles.length > 0">
      <div
        v-for="article in filteredArticles"
        :key="article.path"
        class="article-item"
        :class="{ selected: selectedArticle?.path === article.path }"
        @click="selectArticle(article)"
      >
        <div class="article-icon">
          {{ getArticleIcon(article) }}
        </div>
        <div class="article-info">
          <div class="article-title">{{ article.title }}</div>
          <div class="article-meta">
            <span class="article-date">{{ formatDate(article.date) }}</span>
            <span class="article-category" v-if="article.category">{{ article.category }}</span>
            <span class="article-wordcount">{{ article.wordCount || 0 }} 字</span>
          </div>
        </div>
        <div class="article-actions">
          <button 
            class="btn-action edit" 
            @click.stop="editArticle(article)"
            title="编辑"
          >
            ✏️
          </button>
          <button 
            class="btn-action delete" 
            @click.stop="confirmDelete(article)"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" v-else>
      <div class="empty-icon">📭</div>
      <div class="empty-text">暂无文章</div>
      <button class="btn-create-empty" @click="showCreateModal = true">
        创建第一篇文章
      </button>
    </div>

    <!-- Create Article Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h4>新建文章</h4>
              <button class="btn-close" @click="showCreateModal = false">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>文章标题 <span class="required">*</span></label>
                <input
                  v-model="newArticle.title"
                  type="text"
                  placeholder="输入文章标题"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>存放目录</label>
                <select v-model="newArticle.section" class="form-select">
                  <option value="posts">posts/ (默认)</option>
                  <option value="sections/posts">sections/posts/</option>
                  <option value="sections/knowledge">sections/knowledge/</option>
                </select>
              </div>
              <div class="form-group">
                <label>标签</label>
                <input
                  v-model="newArticle.tags"
                  type="text"
                  placeholder="用逗号分隔，如：AI, 技术, 教程"
                  class="form-input"
                />
              </div>
              <div class="form-group">
                <label>初始内容</label>
                <textarea
                  v-model="newArticle.content"
                  rows="6"
                  placeholder="输入文章初始内容（可选）"
                  class="form-textarea"
                ></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showCreateModal = false">取消</button>
              <button 
                class="btn-primary" 
                @click="createArticle"
                :disabled="!newArticle.title.trim() || isCreating"
              >
                {{ isCreating ? '创建中...' : '创建' }}
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
              <p>确定要删除文章 <strong>"{{ articleToDelete?.title }}"</strong> 吗？</p>
              <p class="warning-text">此操作不可恢复！</p>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showDeleteModal = false">取消</button>
              <button 
                class="btn-danger" 
                @click="deleteArticle"
                :disabled="isDeleting"
              >
                {{ isDeleting ? '删除中...' : '确认删除' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast Notification -->
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
import { ref, computed, onMounted } from 'vue'
import { useData } from 'vitepress'

// ==================== Types ====================
interface Article {
  path: string
  title: string
  description?: string
  tags?: string[]
  category?: string
  date?: string
  wordCount?: number
  isPublished?: boolean
}

interface Toast {
  visible: boolean
  type: 'success' | 'error' | 'info'
  message: string
  icon: string
}

// ==================== State ====================
const vpData = useData()
const articles = ref<Article[]>([])
const searchQuery = ref('')
const currentFilter = ref('all')
const selectedArticle = ref<Article | null>(null)
const isLoading = ref(false)

// Modal states
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const isCreating = ref(false)
const isDeleting = ref(false)
const articleToDelete = ref<Article | null>(null)

// New article form
const newArticle = ref({
  title: '',
  section: 'posts',
  tags: '',
  content: ''
})

// Toast
const toast = ref<Toast>({
  visible: false,
  type: 'info',
  message: '',
  icon: ''
})

// ==================== Constants ====================
const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' }
]

// ==================== Computed ====================
const filteredArticles = computed(() => {
  let result = articles.value

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a => 
      a.title.toLowerCase().includes(query) ||
      a.description?.toLowerCase().includes(query) ||
      a.tags?.some(t => t.toLowerCase().includes(query))
    )
  }

  // Category filter
  if (currentFilter.value === 'published') {
    result = result.filter(a => a.isPublished !== false)
  } else if (currentFilter.value === 'draft') {
    result = result.filter(a => a.isPublished === false)
  }

  // Sort by date (newest first)
  return result.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })
})

// ==================== Methods ====================
function getArticleIcon(article: Article): string {
  if (article.path.includes('knowledge')) return '📚'
  if (article.path.includes('posts')) return '📝'
  return '📄'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '无日期'
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function selectArticle(article: Article) {
  selectedArticle.value = article
}

function showToast(type: Toast['type'], message: string) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' }
  toast.value = {
    visible: true,
    type,
    message,
    icon: icons[type]
  }
  setTimeout(() => {
    toast.value.visible = false
  }, 3000)
}

// ==================== Article CRUD ====================
async function loadArticles() {
  isLoading.value = true
  try {
    // Get articles from sidebar config
    const sidebar = vpData.theme.value.sidebar || {}
    const allArticles: Article[] = []

    function processSidebarItems(items: any[], basePath = '') {
      items.forEach((item: any) => {
        if (item.link && !item.link.match(/^https?:\/\//)) {
          allArticles.push({
            path: item.link,
            title: item.text || item.title || '未命名文章',
            date: item.frontmatter?.date || item.date,
            category: item.frontmatter?.category,
            tags: item.frontmatter?.tags,
            wordCount: item.frontmatter?.wordCount,
            isPublished: item.frontmatter?.published !== false
          })
        }
        if (item.items && Array.isArray(item.items)) {
          processSidebarItems(item.items, basePath)
        }
      })
    }

    Object.values(sidebar).forEach((section: any) => {
      if (Array.isArray(section)) {
        processSidebarItems(section)
      } else if (section?.items) {
        processSidebarItems(section.items)
      }
    })

    articles.value = allArticles
  } catch (error) {
    showToast('error', '加载文章失败')
    console.error('Failed to load articles:', error)
  } finally {
    isLoading.value = false
  }
}

async function createArticle() {
  if (!newArticle.value.title.trim()) return

  isCreating.value = true
  try {
    const response = await fetch('/api/articles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newArticle.value.title,
        section: newArticle.value.section,
        tags: newArticle.value.tags.split(',').map(t => t.trim()).filter(Boolean),
        content: newArticle.value.content || `# ${newArticle.value.title}\n\n开始写作...`
      })
    })

    if (!response.ok) throw new Error('Create failed')

    const result = await response.json()
    if (result.success) {
      showToast('success', '文章创建成功！')
      showCreateModal.value = false
      // Reset form
      newArticle.value = { title: '', section: 'posts', tags: '', content: '' }
      // Reload list
      await loadArticles()
    } else {
      throw new Error(result.error || 'Create failed')
    }
  } catch (error) {
    showToast('error', '创建文章失败: ' + (error as Error).message)
  } finally {
    isCreating.value = false
  }
}

function editArticle(article: Article) {
  // Navigate to edit page or open editor
  window.open(article.path.replace('.html', '.md'), '_blank')
  showToast('info', '请在编辑器中修改文章')
}

function confirmDelete(article: Article) {
  articleToDelete.value = article
  showDeleteModal.value = true
}

async function deleteArticle() {
  if (!articleToDelete.value) return

  isDeleting.value = true
  try {
    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: articleToDelete.value.path.replace('.html', '.md')
      })
    })

    if (!response.ok) throw new Error('Delete failed')

    showToast('success', '文章已删除')
    showDeleteModal.value = false
    articleToDelete.value = null
    await loadArticles()
  } catch (error) {
    showToast('error', '删除失败: ' + (error as Error).message)
  } finally {
    isDeleting.value = false
  }
}

// ==================== Lifecycle ====================
onMounted(() => {
  loadArticles()
})
</script>

<style scoped>
.article-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #fafaf9;
  border-radius: 12px;
  overflow: hidden;
}

/* Header */
.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e7e5e4;
  background: white;
}

.manager-title {
  font-size: 16px;
  font-weight: 600;
  color: #292524;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  font-size: 18px;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #475569;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create:hover {
  background: #334155;
}

/* Toolbar */
.manager-toolbar {
  padding: 12px 20px;
  background: white;
  border-bottom: 1px solid #f5f5f4;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.search-box {
  position: relative;
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 36px;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  font-size: 14px;
  background: #fafaf9;
  transition: all 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #94a3b8;
  background: white;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

.filter-tabs {
  display: flex;
  gap: 4px;
}

.filter-tab {
  padding: 6px 12px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 13px;
  color: #78716c;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tab:hover {
  background: #f5f5f4;
  color: #57534e;
}

.filter-tab.active {
  background: #e7e5e4;
  color: #292524;
  font-weight: 500;
}

/* Article List */
.article-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.article-item:hover {
  background: #f5f5f4;
}

.article-item.selected {
  background: #e7e5e4;
}

.article-icon {
  font-size: 20px;
  flex-shrink: 0;
}

.article-info {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 14px;
  font-weight: 500;
  color: #292524;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.article-meta {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  font-size: 12px;
  color: #a8a29e;
}

.article-category {
  padding: 1px 6px;
  background: #f1f5f9;
  border-radius: 4px;
  color: #64748b;
}

.article-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.article-item:hover .article-actions {
  opacity: 1;
}

.btn-action {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #e7e5e4;
}

.btn-action.delete:hover {
  background: #fee2e2;
}

/* Empty State */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #a8a29e;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 14px;
  margin-bottom: 16px;
}

.btn-create-empty {
  padding: 8px 16px;
  background: #475569;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
}

/* Modal */
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
  border-radius: 16px;
  width: 90%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-small {
  max-width: 360px;
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
  overflow-y: auto;
  max-height: 60vh;
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
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e7e5e4;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
  background: #fafaf9;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #94a3b8;
  background: white;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

/* Buttons */
.btn-primary,
.btn-secondary,
.btn-danger {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
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

.btn-secondary {
  background: #f5f5f4;
  color: #57534e;
}

.btn-secondary:hover {
  background: #e7e5e4;
}

.btn-danger {
  background: #dc2626;
  color: white;
}

.btn-danger:hover:not(:disabled) {
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
