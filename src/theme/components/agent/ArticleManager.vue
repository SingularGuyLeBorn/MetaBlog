<template>
  <div class="article-manager">
    <!-- 头部 -->
    <div class="am-header">
      <div class="header-title">
        <Icon name="file-text" class="title-icon" />
        <div>
          <h2 class="title-text">文章管理</h2>
          <p class="title-desc">管理博客文章、发布和归档</p>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <LiquidGlass
        v-for="stat in stats"
        :key="stat.id"
        class="stat-card-glass"
        :glow-color="stat.glowColor"
        :intensity="0.3"
      >
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: stat.gradient }">
            <Icon :name="stat.icon" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 工具栏 -->
    <LiquidGlass class="toolbar-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.2">
      <div class="toolbar">
        <div class="search-box">
          <Icon name="search" class="search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文章标题..."
            class="search-input"
            @keyup.enter="handleSearch"
          />
        </div>
        <DropdownSelect
          v-model="filterSection"
          :options="[
            { value: '', label: '全部板块' },
            { value: 'posts', label: '文章' },
            { value: 'knowledge', label: '知识库' },
            { value: 'resources', label: '资源' }
          ]"
          placeholder="选择板块"
          @change="handleSectionChange"
        />
        <LiquidGlass glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.3">
          <button class="create-btn" @click="showCreateModal = true">
            <Icon name="plus" />
            新建文章
          </button>
        </LiquidGlass>
      </div>
    </LiquidGlass>

    <!-- 文章列表 -->
    <LiquidGlass class="list-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.15">
      <div class="article-list-header">
        <h3>文章列表</h3>
        <span class="list-count">共 {{ filteredArticles.length }} 篇</span>
      </div>

      <div class="article-list">
        <LiquidGlass
          v-for="article in filteredArticles"
          :key="article.path"
          class="article-item-glass"
          :glow-color="article.isPublished ? 'var(--sr-morandi-green, #a8b3a8)' : 'var(--sr-morandi-pink, #d4b8b8)'"
          :intensity="0.15"
        >
          <div class="article-item">
            <div class="article-main">
              <div class="article-title-row">
                <span
                  class="status-badge"
                  :class="article.isPublished ? 'published' : 'draft'"
                >
                  {{ article.isPublished ? '已发布' : '草稿' }}
                </span>
                <h4 class="article-title" @click="editArticle(article)">{{ article.title }}</h4>
              </div>
              <div class="article-meta">
                <span class="meta-section">{{ article.section || extractSection(article.path) }}</span>
                <span v-if="article.date" class="meta-date">{{ article.date }}</span>
                <span v-if="article.wordCount" class="meta-words">{{ article.wordCount }} 字</span>
              </div>
              <div v-if="article.tags && article.tags.length" class="article-tags">
                <span v-for="tag in article.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
            </div>
            <div class="article-actions">
              <button class="action-btn" title="编辑" @click="editArticle(article)">
                <Icon name="edit" />
              </button>
              <button
                v-if="!article.isPublished"
                class="action-btn publish"
                title="发布"
                @click="publishArticle(article.path)"
              >
                <Icon name="send" />
              </button>
              <button class="action-btn danger" title="删除" @click="deleteArticle(article.path)">
                <Icon name="trash-2" />
              </button>
            </div>
          </div>
        </LiquidGlass>

        <div v-if="loading" class="empty-state">
          <Icon name="loader" class="empty-icon" />
          <p>加载中...</p>
        </div>
        <div v-else-if="filteredArticles.length === 0" class="empty-state">
          <Icon name="file-text" class="empty-icon" />
          <p>暂无文章</p>
          <span>点击"新建文章"创建第一篇内容</span>
        </div>
      </div>
    </LiquidGlass>

    <!-- 新建/编辑文章弹窗 -->
    <div v-if="showCreateModal || showEditModal" class="modal" @click.self="closeModal">
      <LiquidGlass class="modal-content article-modal" glow-color="var(--sr-morandi-blue, #9aa8b8)" :intensity="0.35">
        <h3>{{ showEditModal ? '编辑文章' : '新建文章' }}</h3>
        <div class="form-group">
          <label>标题</label>
          <input v-model="form.title" placeholder="文章标题" />
        </div>
        <div class="form-group">
          <label>板块</label>
          <DropdownSelect
            v-model="form.section"
            :options="[
              { value: 'posts', label: '文章' },
              { value: 'knowledge', label: '知识库' },
              { value: 'resources', label: '资源' }
            ]"
            placeholder="选择板块"
          />
        </div>
        <div class="form-group">
          <label>标签（用逗号分隔）</label>
          <input v-model="form.tags" placeholder="例如: Vue, 前端, 教程" />
        </div>
        <div class="form-group">
          <label>内容</label>
          <textarea v-model="form.content" class="content-textarea" placeholder="支持 Markdown 格式..." />
        </div>
        <div class="modal-actions">
          <button class="primary" @click="showEditModal ? doUpdate() : doCreate()">
            {{ showEditModal ? '保存' : '创建' }}
          </button>
          <button class="secondary" @click="closeModal">取消</button>
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
import { DropdownSelect, Icon, LiquidGlass } from '@/theme/components/common'
import { computed, onMounted, ref } from 'vue'

interface Article {
  path: string
  title: string
  description?: string
  tags?: string[]
  date?: string
  updatedAt?: string
  wordCount?: number
  isPublished?: boolean
  section?: string
  content?: string
}

const articles = ref<Article[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterSection = ref('')
const showCreateModal = ref(false)
const showEditModal = ref(false)

const form = ref({
  title: '',
  section: 'posts',
  tags: '',
  content: '',
  path: '',
})

const notification = ref<{ type: string; message: string } | null>(null)

const stats = computed(() => {
  const total = articles.value.length
  const published = articles.value.filter(a => a.isPublished).length
  const drafts = total - published
  const words = articles.value.reduce((sum, a) => sum + (a.wordCount || 0), 0)
  return [
    { id: 'total', label: '总文章数', value: String(total), icon: 'file-text', gradient: 'linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8))', glowColor: 'var(--sr-accent-star, #b8a090)' },
    { id: 'published', label: '已发布', value: String(published), icon: 'check-circle', gradient: 'linear-gradient(135deg, var(--sr-morandi-green, #a8b3a8), var(--sr-morandi-green, #a8b3a8))', glowColor: 'var(--sr-morandi-green, #a8b3a8)' },
    { id: 'drafts', label: '草稿', value: String(drafts), icon: 'edit', gradient: 'linear-gradient(135deg, var(--sr-morandi-pink, #d4b8b8), var(--sr-morandi-pink, #d4b8b8))', glowColor: 'var(--sr-morandi-pink, #d4b8b8)' },
    { id: 'words', label: '总字数', value: words > 10000 ? `${(words / 10000).toFixed(1)}万` : String(words), icon: 'type', gradient: 'linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-morandi-blue, #9daab8))', glowColor: 'var(--sr-morandi-blue, #9daab8)' }
  ]
})

const filteredArticles = computed(() => {
  let list = articles.value
  if (filterSection.value) {
    list = list.filter(a => (a.section || extractSection(a.path)) === filterSection.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(a =>
      (a.title || '').toLowerCase().includes(q) ||
      (a.description || '').toLowerCase().includes(q)
    )
  }
  return list
})

function extractSection(articlePath: string): string {
  const parts = articlePath.split('/')
  return parts[0] || ''
}

async function loadArticles() {
  loading.value = true
  try {
    const res = await fetch('/api/articles/list')
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      articles.value = json.data.map((a: Article) => ({
        ...a,
        section: a.section || extractSection(a.path),
      }))
    }
  } catch (e) {
    console.error('[ArticleManager] 加载文章失败:', e)
    showNotification('error', '加载文章失败')
  } finally {
    loading.value = false
  }
}

async function handleSearch() {
  if (!searchQuery.value.trim()) {
    loadArticles()
    return
  }
  loading.value = true
  try {
    const res = await fetch(`/api/articles/search?q=${encodeURIComponent(searchQuery.value)}`)
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      articles.value = json.data.map((a: Article) => ({
        ...a,
        section: a.section || extractSection(a.path),
      }))
    }
  } catch (e) {
    console.error('[ArticleManager] 搜索失败:', e)
    showNotification('error', '搜索失败')
  } finally {
    loading.value = false
  }
}

function handleSectionChange() {
  // 本地筛选即可，不需要重新请求
}

function closeModal() {
  showCreateModal.value = false
  showEditModal.value = false
  form.value = { title: '', section: 'posts', tags: '', content: '', path: '' }
}

async function doCreate() {
  if (!form.value.title.trim()) {
    showNotification('error', '请输入标题')
    return
  }
  try {
    const res = await fetch('/api/articles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.value.title,
        content: form.value.content,
        section: form.value.section,
        tags: form.value.tags.split(',').map(t => t.trim()).filter(Boolean),
      }),
    })
    const json = await res.json()
    if (json.success) {
      showNotification('success', '文章创建成功')
      closeModal()
      loadArticles()
    } else {
      showNotification('error', json.error || '创建失败')
    }
  } catch (e) {
    console.error('[ArticleManager] 创建文章失败:', e)
    showNotification('error', '创建失败')
  }
}

async function editArticle(article: Article) {
  try {
    const res = await fetch(`/api/articles/detail?path=${encodeURIComponent(article.path)}`)
    const json = await res.json()
    if (json.success && json.data) {
      const data = json.data
      form.value = {
        title: data.title || article.title,
        section: article.section || extractSection(article.path),
        tags: (data.tags || []).join(', '),
        content: data.content || '',
        path: article.path,
      }
      showEditModal.value = true
    } else {
      showNotification('error', '读取文章详情失败')
    }
  } catch (e) {
    console.error('[ArticleManager] 读取文章详情失败:', e)
    showNotification('error', '读取文章详情失败')
  }
}

async function doUpdate() {
  if (!form.value.path) return
  try {
    const res = await fetch('/api/articles/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: form.value.path,
        content: form.value.content,
      }),
    })
    const json = await res.json()
    if (json.success) {
      showNotification('success', '文章更新成功')
      closeModal()
      loadArticles()
    } else {
      showNotification('error', json.error || '更新失败')
    }
  } catch (e) {
    console.error('[ArticleManager] 更新文章失败:', e)
    showNotification('error', '更新失败')
  }
}

async function deleteArticle(articlePath: string) {
  if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return
  try {
    const res = await fetch('/api/articles/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath }),
    })
    const json = await res.json()
    if (json.success) {
      showNotification('success', '文章已删除')
      loadArticles()
    } else {
      showNotification('error', json.error || '删除失败')
    }
  } catch (e) {
    console.error('[ArticleManager] 删除文章失败:', e)
    showNotification('error', '删除失败')
  }
}

async function publishArticle(articlePath: string) {
  if (!confirm('确定要发布这篇文章吗？')) return
  try {
    const res = await fetch('/api/articles/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: articlePath }),
    })
    const json = await res.json()
    if (json.success) {
      showNotification('success', '文章发布成功')
      loadArticles()
    } else {
      showNotification('error', json.error || '发布失败')
    }
  } catch (e) {
    console.error('[ArticleManager] 发布文章失败:', e)
    showNotification('error', '发布失败')
  }
}

function showNotification(type: string, message: string) {
  notification.value = { type, message }
  setTimeout(() => {
    notification.value = null
  }, 3000)
}

onMounted(() => {
  loadArticles()
})
</script>

<style scoped>
.article-manager {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

.am-header {
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

/* 统计 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card-glass {
  border-radius: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
  margin-bottom: 2px;
}

.stat-label {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 工具栏 */
.toolbar-glass {
  border-radius: 20px;
  margin-bottom: 20px;
  padding: 16px 20px;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--sr-text-muted, #94a3b8);
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 40px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: 12px;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: rgba(184, 160, 144, 0.4);
}

.section-select {
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: 12px;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  outline: none;
  cursor: pointer;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  background: transparent;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-morandi-green, #a8b3a8);
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: rgba(168, 179, 168, 0.1);
}

.create-btn svg {
  width: 16px;
  height: 16px;
}

/* 列表 */
.list-glass {
  border-radius: 28px;
  padding: 24px;
}

.article-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
}

.article-list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.list-count {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.article-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-item-glass {
  border-radius: 16px;
}

.article-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
}

.article-main {
  flex: 1;
  min-width: 0;
}

.article-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.status-badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}

.status-badge.published {
  background: rgba(168, 179, 168, 0.15);
  color: var(--sr-morandi-green, #a8b3a8);
}

.status-badge.draft {
  background: rgba(212, 184, 184, 0.15);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.article-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
  cursor: pointer;
  transition: color 0.2s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-title:hover {
  color: var(--sr-accent-star, #b8a090);
}

.article-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.meta-section {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 4px;
  text-transform: capitalize;
}

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 2px 8px;
  background: rgba(184, 160, 144, 0.1);
  border-radius: 4px;
  font-size: 11px;
  color: var(--sr-accent-star, #b8a090);
}

.article-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.article-item:hover .article-actions {
  opacity: 1;
}

.action-btn {
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

.action-btn:hover {
  background: rgba(184, 160, 144, 0.15);
  color: var(--sr-accent-star, #b8a090);
}

.action-btn.publish:hover {
  background: rgba(168, 179, 168, 0.15);
  color: var(--sr-morandi-green, #a8b3a8);
}

.action-btn.danger:hover {
  background: rgba(212, 184, 184, 0.2);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  text-align: center;
  color: var(--sr-text-muted, #94a3b8);
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: var(--sr-glass-border, rgba(0, 0, 0, 0.1));
}

.empty-state p {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
}

.empty-state span {
  font-size: 14px;
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
  padding: 20px;
}

.modal-content {
  padding: 28px;
  border-radius: 24px;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  overflow-y: auto;
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

.form-group input,
.form-group select,
.form-group textarea {
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

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: rgba(184, 160, 144, 0.4);
}

.content-textarea {
  min-height: 240px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  line-height: 1.7;
  resize: vertical;
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
  background: var(--sr-morandi-blue, #9aa8b8);
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
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .toolbar {
    flex-wrap: wrap;
  }

  .search-box {
    width: 100%;
  }

  .article-item {
    flex-direction: column;
  }

  .article-actions {
    opacity: 1;
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
