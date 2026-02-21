<template>
  <div class="article-manager">
    <!-- Header -->
    <div class="manager-header">
      <div class="header-title">
        <span class="title-dot"></span>
        <h3>文章管理</h3>
        <span class="article-count" v-if="articles.length">{{ articles.length }}</span>
      </div>
    </div>

    <!-- Search & Filter -->
    <div class="manager-toolbar">
      <div class="search-box" :class="{ focused: isSearchFocused }">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          :placeholder="searchPlaceholder"
          class="search-input"
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
        />
        <button v-if="searchQuery" class="btn-clear-search" @click="searchQuery = ''">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="search-glow"></div>
      </div>

      <div class="filter-section">
        <div class="filter-chips">
          <button
            v-for="tab in filterTabs"
            :key="tab.value"
            class="filter-chip"
            :class="{ active: currentFilter === tab.value }"
            @click="currentFilter = tab.value"
          >
            <span class="chip-bg"></span>
            <span class="chip-text">{{ tab.label }}</span>
          </button>
        </div>
        <button 
          v-if="hasActiveFilters" 
          class="btn-clear-filters" 
          @click="clearFilters"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          清除筛选
        </button>
      </div>
    </div>

    <!-- Article List -->
    <div class="article-list" v-if="filteredArticles.length > 0">
      <div
        v-for="article in filteredArticles"
        :key="article.path"
        class="article-card"
        :class="{ selected: selectedArticle?.path === article.path }"
        @click="selectArticle(article)"
      >
        <div class="card-indicator"></div>
        <div class="card-icon" :class="getIconClass(article)">
          {{ getArticleIcon(article) }}
        </div>
        <div class="card-content">
          <div class="card-title">{{ article.title }}</div>
          <div class="card-meta">
            <span class="meta-item date">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {{ formatDate(article.date) }}
            </span>
            <span class="meta-item words" v-if="article.wordCount">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              {{ formatNumber(article.wordCount) }} 字
            </span>
          </div>
          <div class="card-tags" v-if="article.tags?.length">
            <span 
              v-for="tag in article.tags.slice(0, 3)" 
              :key="tag" 
              class="tag"
              :class="getTagClass(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </div>
        <div class="card-actions">
          <button 
            class="btn-action edit" 
            @click.stop="editArticle(article)"
            title="编辑"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button 
            class="btn-action delete" 
            @click.stop="confirmDelete(article)"
            title="删除"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div class="empty-state" v-else>
      <div class="empty-illustration">
        <div class="illustration-paper">
          <div class="paper-line"></div>
          <div class="paper-line short"></div>
          <div class="paper-line"></div>
        </div>
        <div class="illustration-shadow"></div>
      </div>
      <h4 class="empty-title">还没有文章</h4>
      <p class="empty-desc">开始创作你的第一篇文章吧</p>
      <button class="btn-create-empty" @click="showCreateModal = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        创建第一篇文章
      </button>
    </div>

    <!-- Create Article Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateModal" class="modal-overlay" @click="showCreateModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <div class="modal-title">
                <div class="modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
                <h4>新建文章</h4>
              </div>
              <button class="btn-close" @click="showCreateModal = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>文章标题 <span class="required">*</span></label>
                <div class="input-wrapper">
                  <input
                    v-model="newArticle.title"
                    type="text"
                    placeholder="输入文章标题"
                    class="form-input"
                  />
                  <div class="input-glow"></div>
                </div>
              </div>
              <div class="form-group">
                <label>存放位置</label>
                <div class="input-wrapper">
                  <div class="path-selector" @click="showPathSelector = true">
                    <span class="path-text">{{ selectedPathLabel }}</span>
                    <svg class="path-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </div>
                  <div class="input-glow"></div>
                </div>
                <div class="path-hint">
                  点击选择存放目录，支持在现有文章下创建子文档
                </div>
              </div>
              <div class="form-group">
                <label>标签</label>
                <div class="input-wrapper">
                  <input
                    v-model="newArticle.tags"
                    type="text"
                    placeholder="用逗号分隔，如：AI, 技术, 教程"
                    class="form-input"
                  />
                  <div class="input-glow"></div>
                </div>
              </div>
              <div class="form-group">
                <label>初始内容</label>
                <div class="input-wrapper textarea">
                  <textarea
                    v-model="newArticle.content"
                    rows="5"
                    placeholder="输入文章初始内容（可选）"
                    class="form-textarea"
                  ></textarea>
                  <div class="input-glow"></div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showCreateModal = false">取消</button>
              <button 
                class="btn-primary" 
                @click="createArticle"
                :disabled="!newArticle.title.trim() || isCreating"
              >
                <span v-if="isCreating" class="loading-spinner"></span>
                <span>{{ isCreating ? '创建中...' : '创建' }}</span>
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
            <div class="modal-header danger">
              <div class="modal-title">
                <div class="modal-icon danger">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <h4>确认删除</h4>
              </div>
            </div>
            <div class="modal-body center">
              <p class="confirm-text">
                确定要删除文章 <strong>"{{ articleToDelete?.title }}"</strong> 吗？
              </p>
              <p class="warning-text">删除后无法恢复</p>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showDeleteModal = false">取消</button>
              <button 
                class="btn-danger" 
                @click="deleteArticle"
                :disabled="isDeleting"
              >
                <span v-if="isDeleting" class="loading-spinner"></span>
                <span>{{ isDeleting ? '删除中...' : '确认删除' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Path Selector Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showPathSelector" class="modal-overlay" @click="showPathSelector = false">
          <div class="modal-content path-selector-modal" @click.stop>
            <div class="modal-header">
              <div class="modal-title">
                <div class="modal-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
                  </svg>
                </div>
                <h4>选择存放位置</h4>
              </div>
              <button class="btn-close" @click="showPathSelector = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            
            <!-- 路径输入 + 联想 -->
            <div class="path-input-section">
              <div class="path-input-wrapper">
                <span class="path-prefix">sections/</span>
                <input
                  ref="pathInputRef"
                  v-model="pathInput"
                  type="text"
                  class="path-input"
                  placeholder="输入路径，如：posts/技术文章"
                  @input="onPathInput"
                  @focus="showSuggestions = true"
                  @keydown.enter="confirmPathInput"
                />
              </div>
              
              <!-- 联想建议列表 -->
              <div v-if="showSuggestions && filteredPaths.length > 0" class="suggestions-dropdown">
                <div
                  v-for="suggestion in filteredPaths"
                  :key="suggestion.path"
                  class="suggestion-item"
                  :class="{ 'is-directory': suggestion.type === 'directory' }"
                  @click="selectSuggestion(suggestion)"
                >
                  <svg v-if="suggestion.type === 'directory'" class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  <svg v-else class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <span class="suggestion-path">{{ suggestion.displayPath }}</span>
                </div>
              </div>
            </div>
            
            <!-- Section Tabs -->
            <div class="section-tabs">
              <button
                v-for="section in availableSections"
                :key="section"
                class="section-tab"
                :class="{ active: currentSection === section }"
                @click="switchSection(section)"
              >
                {{ sectionNames[section] || section }}
              </button>
            </div>
            
            <div class="child-doc-hint" v-if="isChildDoc && parentArticle">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <span>将在 "{{ parentArticle.title }}" 下创建子文档</span>
            </div>
            
            <div class="path-tree">
              <!-- 加载状态 -->
              <div v-if="isLoadingTree" class="path-tree-loading">
                <div class="loading-spinner-small"></div>
                <span>加载目录...</span>
              </div>
              
              <!-- 空状态 -->
              <div v-else-if="currentSectionTree.length === 0" class="path-tree-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z"/>
                </svg>
                <span>该目录暂无内容</span>
              </div>
              
              <!-- 递归渲染树节点 -->
              <TreeNode 
                v-else
                v-for="item in currentSectionTree" 
                :key="item.path"
                :node="item"
                :selected-path="selectedPath"
                :is-child-doc="isChildDoc"
                @select="selectPath"
                @select-as-parent="selectAsParent"
              />
            </div>
            
            <div class="modal-footer">
              <button class="btn-secondary" @click="showPathSelector = false; isChildDoc = false; parentArticle = null">取消</button>
              <button class="btn-primary" @click="confirmPathSelection" :disabled="!pathInput.trim()">
                确认选择
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
          <div class="toast-icon">
            <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <svg v-else-if="toast.type === 'error'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, defineComponent, h } from 'vue'
import { useData } from 'vitepress'
import { logger, logFileOperation } from '../../composables/useLogger'
import { notifyFileSystemChange } from '../../composables/useDynamicSidebar'
import { eventBus } from '../../../agent/core/EventBus'

// 递归树节点组件
const TreeNode = defineComponent({
  name: 'TreeNode',
  props: {
    node: { type: Object, required: true },
    selectedPath: { type: String, default: '' },
    isChildDoc: { type: Boolean, default: false },
    level: { type: Number, default: 0 }
  },
  emits: ['select', 'selectAsParent'],
  setup(props, { emit }) {
    const isSelected = computed(() => {
      return props.selectedPath === props.node.path && !props.isChildDoc
    })
    
    const indentStyle = computed(() => ({
      paddingLeft: `${16 + props.level * 16}px`
    }))
    
    return () => {
      const node = props.node
      
      // 目录节点
      if (node.type === 'directory') {
        return h('div', {}, [
          h('div', {
            class: ['path-tree-item', { selected: isSelected.value }],
            style: indentStyle.value,
            onClick: () => emit('select', node.path)
          }, [
            h('svg', { 
              class: 'tree-icon',
              width: '16',
              height: '16',
              viewBox: '0 0 24 24', 
              fill: 'none', 
              stroke: 'currentColor', 
              'stroke-width': '2'
            }, [
              h('path', { d: 'M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z' })
            ]),
            h('span', { class: 'tree-label' }, node.displayName || node.name)
          ]),
          // 递归渲染子节点
          node.children?.length > 0 
            ? h('div', { class: 'path-tree-children' },
                node.children.map((child: any) => 
                  h(TreeNode, {
                    key: child.path,
                    node: child,
                    selectedPath: props.selectedPath,
                    isChildDoc: props.isChildDoc,
                    level: props.level + 1,
                    onSelect: (path: string) => emit('select', path),
                    onSelectAsParent: (item: any) => emit('selectAsParent', item)
                  })
                )
              )
            : null
        ])
      }
      
      // 文章节点
      return h('div', {
        class: ['path-tree-item', 'is-article', { selected: isSelected.value }],
        style: indentStyle.value
      }, [
        h('svg', { 
          class: 'tree-icon',
          width: '16',
          height: '16',
          viewBox: '0 0 24 24', 
          fill: 'none', 
          stroke: 'currentColor', 
          'stroke-width': '2'
        }, [
          h('path', { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' }),
          h('polyline', { points: '14 2 14 8 20 8' })
        ]),
        h('span', { class: 'tree-label' }, node.displayName || node.title || node.name),
        h('span', { 
          class: 'tree-action',
          onClick: (e: Event) => {
            e.stopPropagation()
            emit('selectAsParent', node)
          }
        }, '创建子文档')
      ])
    }
  }
})

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
}

// ==================== State ====================
const vpData = useData()
const articles = ref<Article[]>([])
const searchQuery = ref('')
const currentFilter = ref('all')
const selectedArticle = ref<Article | null>(null)
const isLoading = ref(false)
const isSearchFocused = ref(false)
const searchPlaceholder = ref('搜索文章...')

// Modal states
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const showPathSelector = ref(false)
const isCreating = ref(false)
const isDeleting = ref(false)
const articleToDelete = ref<Article | null>(null)

// Directory tree for path selection
const directoryTree = ref<any[]>([])
const isLoadingTree = ref(false)
// 注意：selectedPath 存储的是相对于 sections/ 的路径（如 'posts' 或 'knowledge/rl-math-principle'）
const selectedPath = ref<string>('posts')
const isChildDoc = ref(false)  // 是否作为子文档创建
const parentArticle = ref<Article | null>(null)  // 父文档

// 路径输入联想
const pathInput = ref('')
const showSuggestions = ref(false)
const pathInputRef = ref<HTMLInputElement>()
const allPaths = ref<Array<{path: string, displayPath: string, type: 'directory' | 'file'}>>([])

// Section 管理
const currentSection = ref('posts')
const availableSections = ['posts', 'knowledge', 'resources', 'about']
const sectionNames: Record<string, string> = {
  posts: '文章',
  knowledge: '知识库', 
  resources: '资源',
  about: '关于'
}

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
  message: ''
})

// ==================== Constants ====================
const filterTabs = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'draft' }
]

// ==================== Computed ====================
const hasActiveFilters = computed(() => {
  return searchQuery.value || currentFilter.value !== 'all'
})

// 当前 section 的目录树
const currentSectionTree = computed(() => {
  return directoryTree.value.find(s => s.name === currentSection.value)?.children || []
})

// 路径联想建议
const filteredPaths = computed(() => {
  const input = pathInput.value.toLowerCase().trim()
  if (!input) {
    // 显示当前 section 下的热门路径
    return allPaths.value
      .filter(p => p.path.startsWith(currentSection.value + '/') || p.path === currentSection.value)
      .slice(0, 10)
  }
  
  return allPaths.value
    .filter(p => 
      p.displayPath.toLowerCase().includes(input) ||
      p.path.toLowerCase().includes(input)
    )
    .slice(0, 10)
})

// 显示用的路径标签（修复重复路径问题）
const selectedPathLabel = computed(() => {
  if (isChildDoc.value && parentArticle.value) {
    // 清理路径显示：去掉开头的 / 和 .html 后缀
    const cleanPath = parentArticle.value.path
      .replace(/^\//, '')
      .replace(/\.html$/, '')
      .replace(/^sections\//, '')
    return `${cleanPath}/ (作为子文档)`
  }
  // 确保不重复添加 sections/ 前缀
  const cleanPath = selectedPath.value.replace(/^sections\//, '')
  return `sections/${cleanPath}/`
})

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

function getIconClass(article: Article): string {
  if (article.path.includes('knowledge')) return 'knowledge'
  if (article.path.includes('posts')) return 'posts'
  return 'default'
}

function getTagClass(tag: string): string {
  const tagClasses: Record<string, string> = {
    'AI': 'blue',
    '技术': 'cyan',
    '教程': 'green',
    '笔记': 'purple',
    'React': 'blue',
    'Vue': 'green',
    'JavaScript': 'yellow',
    'TypeScript': 'blue',
    'CSS': 'pink',
    'Node.js': 'green'
  }
  return tagClasses[tag] || 'gray'
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '无日期'
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays < 7) return `${diffDays} 天前`
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  })
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k'
  }
  return num.toString()
}

function selectArticle(article: Article) {
  selectedArticle.value = article
}

function clearFilters() {
  searchQuery.value = ''
  currentFilter.value = 'all'
}

function showToast(type: Toast['type'], message: string) {
  toast.value = {
    visible: true,
    type,
    message
  }
  setTimeout(() => {
    toast.value.visible = false
  }, 3000)
}

// ==================== Article CRUD ====================
async function loadArticles() {
  isLoading.value = true
  try {
    // 从后端 API 获取文章列表（添加时间戳避免缓存）
    const response = await fetch(`/api/articles/list?t=${Date.now()}`)
    if (!response.ok) throw new Error('Failed to fetch articles')
    
    const result = await response.json()
    if (result.success && result.data) {
      articles.value = result.data.map((item: any) => ({
        path: `/sections/${item.path}`,
        title: item.title || '未命名文章',
        isLeaf: item.isLeaf !== false
      }))
    } else {
      articles.value = []
    }
  } catch (error) {
    showToast('error', '加载文章失败')
    console.error('Failed to load articles:', error)
    articles.value = []
  } finally {
    isLoading.value = false
  }
}

async function createArticle() {
  if (!newArticle.value.title.trim()) return

  isCreating.value = true
  try {
    const requestBody: any = {
      title: newArticle.value.title,
      section: newArticle.value.section,
      tags: newArticle.value.tags.split(',').map(t => t.trim()).filter(Boolean),
      content: newArticle.value.content || `# ${newArticle.value.title}\n\n开始写作...`
    }
    
    // 如果是创建子文档，添加父文档信息
    if (isChildDoc.value && parentArticle.value) {
      requestBody.parentPath = parentArticle.value.path
      requestBody.isChildDoc = true
    }
    
    const response = await fetch('/api/articles/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) throw new Error('Create failed')

    const result = await response.json()
    if (result.success) {
      showToast('success', isChildDoc.value ? '子文档创建成功！' : '文章创建成功！')
      showCreateModal.value = false
      // 记录日志
      logFileOperation('create', result.path || newArticle.value.title, { 
        title: newArticle.value.title,
        section: newArticle.value.section,
        isChildDoc: isChildDoc.value,
        parentPath: parentArticle.value?.path
      })
      // Reset form
      newArticle.value = { title: '', section: 'posts', tags: '', content: '' }
      isChildDoc.value = false
      parentArticle.value = null
      selectedPath.value = 'posts'
      // Reload list and directory tree
      await loadArticles()
      await buildDirectoryTree()
      // 通知 sidebar 刷新
      notifyFileSystemChange('posts')
    } else {
      throw new Error(result.error || 'Create failed')
    }
  } catch (error) {
    showToast('error', '创建文章失败: ' + (error as Error).message)
    logger.error('article.create', '创建文章失败: ' + (error as Error).message)
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
    // 记录日志
    logFileOperation('delete', articleToDelete.value?.path || '', { 
      title: articleToDelete.value?.title 
    })
    showDeleteModal.value = false
    articleToDelete.value = null
    await loadArticles()
    // 通知 sidebar 刷新
    notifyFileSystemChange('posts')
  } catch (error) {
    showToast('error', '删除失败: ' + (error as Error).message)
  } finally {
    isDeleting.value = false
  }
}

// ==================== Directory Tree ====================
async function buildDirectoryTree() {
  // 从后端 API 获取所有 sections 的目录树
  isLoadingTree.value = true
  try {
    console.log('[ArticleManager] Loading directory tree for all sections...')
    
    // 并行加载所有 sections
    const promises = availableSections.map(async (section) => {
      try {
        const response = await fetch(`/api/directory-tree?section=${section}&t=${Date.now()}`)
        if (!response.ok) return null
        const result = await response.json()
        if (result.success && result.data && result.data.length > 0) {
          return {
            name: section,
            displayName: sectionNames[section] || section,
            type: 'directory',
            path: section,
            children: result.data
          }
        }
        return null
      } catch (e) {
        console.warn(`[ArticleManager] Failed to load section ${section}:`, e)
        return null
      }
    })
    
    const results = await Promise.all(promises)
    directoryTree.value = results.filter(Boolean)
    
    // 构建扁平化的路径列表用于联想
    buildAllPathsList()
    
    console.log('[ArticleManager] Directory tree loaded:', directoryTree.value.length, 'sections')
  } catch (e) {
    console.error('[ArticleManager] Failed to build directory tree:', e)
    directoryTree.value = []
    allPaths.value = []
  } finally {
    isLoadingTree.value = false
  }
}

// 构建所有路径的扁平列表用于联想
function buildAllPathsList() {
  const paths: Array<{path: string, displayPath: string, type: 'directory' | 'file'}> = []
  
  function traverse(node: any, parentPath: string = '') {
    const currentPath = parentPath ? `${parentPath}/${node.name}` : node.name
    const displayName = node.displayName || node.title || node.name
    
    paths.push({
      path: currentPath,
      displayPath: currentPath,
      type: node.type || 'directory'
    })
    
    if (node.children && node.children.length > 0) {
      node.children.forEach((child: any) => traverse(child, currentPath))
    }
  }
  
  directoryTree.value.forEach((section: any) => {
    paths.push({
      path: section.name,
      displayPath: section.displayName || section.name,
      type: 'directory'
    })
    if (section.children) {
      section.children.forEach((child: any) => traverse(child, section.name))
    }
  })
  
  allPaths.value = paths
}

// 当打开路径选择器时，重新加载目录树
watch(showPathSelector, (isOpen) => {
  if (isOpen) {
    // 初始化 pathInput 为当前选中的路径（去掉 sections/ 前缀）
    pathInput.value = selectedPath.value.replace(/^sections\//, '')
    showSuggestions.value = false
    buildDirectoryTree()
  }
})

// 格式化目录名称（如 node-L1 → Node L1 Hub，leaf-1-1 → Leaf 1-1）
function formatDirName(name: string): string {
  // node-L1 → Node L1 Hub
  if (name.startsWith('node-')) {
    const num = name.replace('node-', '')
    return `Node ${num} Hub`
  }
  // leaf-1-1 → Leaf 1-1
  if (name.startsWith('leaf-')) {
    const parts = name.replace('leaf-', '').split('-')
    return `Leaf ${parts.join('-')}`
  }
  // 默认：首字母大写
  return name.charAt(0).toUpperCase() + name.slice(1)
}

function selectPath(path: string) {
  selectedPath.value = path
  isChildDoc.value = false
  parentArticle.value = null
}

function selectAsParent(article: Article) {
  // 提取文章的相对路径（去掉 sections/ 前缀，保留文件名用于后端识别父文档）
  const cleanPath = article.path.startsWith('/') ? article.path.slice(1) : article.path
  const pathParts = cleanPath.split('/')
  
  // 去掉 'sections/' 前缀，但保留文件名
  if (pathParts[0] === 'sections') {
    pathParts.shift()
  }
  
  // 保存完整路径（如 posts/ai-paper-reading-2024.html）供后端识别父文档
  const articlePathWithExt = pathParts.join('/')
  // 去掉 .html 后缀，因为后端会添加 .md
  selectedPath.value = articlePathWithExt.replace('.html', '')
  isChildDoc.value = true
  parentArticle.value = article
  // 同步更新输入框
  pathInput.value = selectedPath.value
}

// ==================== Path Input Methods ====================

// 路径输入处理
function onPathInput() {
  showSuggestions.value = true
  // 自动提取 section
  const parts = pathInput.value.split('/')
  if (parts[0] && availableSections.includes(parts[0])) {
    currentSection.value = parts[0]
  }
}

// 选择联想建议
function selectSuggestion(suggestion: {path: string, displayPath: string, type: string}) {
  pathInput.value = suggestion.path
  selectedPath.value = suggestion.path
  showSuggestions.value = false
  
  // 如果是目录，切换到对应 section
  const parts = suggestion.path.split('/')
  if (parts[0] && availableSections.includes(parts[0])) {
    currentSection.value = parts[0]
  }
}

// 切换 section
function switchSection(section: string) {
  currentSection.value = section
  // 如果当前输入是其他 section 开头，清空输入
  const parts = pathInput.value.split('/')
  if (parts[0] && parts[0] !== section && availableSections.includes(parts[0])) {
    pathInput.value = section + '/'
  } else if (!pathInput.value || !availableSections.includes(parts[0])) {
    pathInput.value = section + '/'
  }
  selectedPath.value = pathInput.value.replace(/\/$/, '') || section
}

// 确认路径输入
function confirmPathInput() {
  if (filteredPaths.value.length > 0) {
    selectSuggestion(filteredPaths.value[0])
  } else if (pathInput.value.trim()) {
    selectedPath.value = pathInput.value.trim().replace(/\/$/, '')
    showSuggestions.value = false
  }
}

function confirmPathSelection() {
  // 优先使用 pathInput 的值
  const finalPath = pathInput.value.trim().replace(/^\//, '').replace(/\/$/, '')
  
  if (!finalPath) {
    showToast('error', '请选择或输入存放位置')
    return
  }
  
  selectedPath.value = finalPath
  
  // 如果不是创建子文档，从路径中提取 section
  // 如果是创建子文档，section 已经从父文档路径中提取
  if (isChildDoc.value && parentArticle.value) {
    // 从父文档路径提取 section（如 posts/ai-paper-reading-2024 -> posts）
    const pathParts = finalPath.split('/')
    newArticle.value.section = pathParts[0] || 'posts'
  } else {
    // 从路径提取 section（如 posts/tech/article -> posts）
    const pathParts = finalPath.split('/')
    newArticle.value.section = pathParts[0] || 'posts'
  }
  
  showPathSelector.value = false
}

// ==================== Lifecycle ====================
let unsubscribeAgentComplete: (() => void) | null = null

onMounted(() => {
  loadArticles()
  buildDirectoryTree()
  
  // Listen for create article event from parent
  const handleCreateArticle = () => {
    showCreateModal.value = true
  }
  window.addEventListener('article-manager:create', handleCreateArticle)
  
  // 监听 Agent 任务完成事件，刷新文章列表
  unsubscribeAgentComplete = eventBus.on('agent:taskCompleted', (data) => {
    // 检查当前是否显示的是 Agent 创建的文章所属栏目
    const currentSection = vpData.page.value?.filePath?.match(/sections\/([^\/]+)/)?.[1]
    const articleSection = data.section
    
    // 如果当前栏目匹配，则刷新列表
    if (!currentSection || currentSection === articleSection) {
      console.log('[ArticleManager] Agent completed task, refreshing article list:', data.path)
      loadArticles()
      buildDirectoryTree()
      showToast('success', `新文章已添加: ${data.title}`)
    }
  })
  
  // Placeholder animation
  const placeholders = ['搜索文章...', '输入标题、标签...', '查找内容...']
  let index = 0
  const placeholderTimer = setInterval(() => {
    if (!isSearchFocused.value && !searchQuery.value) {
      index = (index + 1) % placeholders.length
      searchPlaceholder.value = placeholders[index]
    }
  }, 4000)
  
  // Cleanup
  return () => {
    window.removeEventListener('article-manager:create', handleCreateArticle)
    clearInterval(placeholderTimer)
  }
})

onUnmounted(() => {
  unsubscribeAgentComplete?.()
})
</script>

<style scoped>
/* ==================== Design Tokens ==================== */
:root {
  --ease-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  
  --color-primary: #3b82f6;
  --color-primary-light: #60a5fa;
  --color-primary-dark: #2563eb;
  
  --color-success: #10b981;
  --color-error: #ef4444;
  --color-warning: #f59e0b;
  
  --color-text: #1f2937;
  --color-text-secondary: #6b7280;
  --color-text-muted: #9ca3af;
  
  --color-bg: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-bg-tertiary: #f3f4f6;
  
  --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

/* ==================== Layout ==================== */
.article-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #fafafa 0%, #ffffff 100%);
  border-radius: 16px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* ==================== Header ==================== */
.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-dot {
  width: 8px;
  height: 8px;
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: 50%;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.header-title h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
  letter-spacing: -0.025em;
}

.article-count {
  padding: 2px 8px;
  background: #f3f4f6;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
}

/* Capsule Button */
.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border: none;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 14px 0 rgba(59, 130, 246, 0.39);
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px 0 rgba(59, 130, 246, 0.5);
}

.btn-create:active {
  transform: translateY(0);
}

.btn-create .icon {
  width: 16px;
  height: 16px;
}

/* ==================== Toolbar ==================== */
.manager-toolbar {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Search Box */
.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: #9ca3af;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 2;
}

.search-input {
  width: 100%;
  padding: 12px 40px 12px 42px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.search-input::placeholder {
  color: #9ca3af;
  transition: opacity 0.3s ease;
}

.search-glow {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #3b82f6, transparent);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0.5;
}

.search-box.focused .search-input {
  background: white;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.1);
}

.search-box.focused .search-icon {
  color: #3b82f6;
}

.search-box.focused .search-glow {
  width: 80%;
}

.btn-clear-search {
  position: absolute;
  right: 12px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-clear-search svg {
  width: 12px;
  height: 12px;
  color: #6b7280;
}

.search-box:hover .btn-clear-search,
.search-box.focused .btn-clear-search {
  opacity: 1;
  transform: scale(1);
}

.btn-clear-search:hover {
  background: #e5e7eb;
}

/* Filter Section */
.filter-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* Filter Chips with Fill Animation */
.filter-chip {
  position: relative;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  overflow: hidden;
  transition: color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.chip-bg {
  position: absolute;
  inset: 0;
  background: #3b82f6;
  border-radius: 50px;
  transform: translateX(-100%);
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
}

.chip-text {
  position: relative;
  z-index: 1;
}

.filter-chip:hover {
  color: #374151;
}

.filter-chip.active {
  color: white;
}

.filter-chip.active .chip-bg {
  transform: translateX(0);
}

/* Clear Filters Button */
.btn-clear-filters {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #ef4444;
  cursor: pointer;
  opacity: 0;
  animation: fadeIn 0.3s ease forwards;
  transition: all 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

.btn-clear-filters svg {
  width: 14px;
  height: 14px;
}

.btn-clear-filters:hover {
  background: rgba(239, 68, 68, 0.15);
}

/* ==================== Article List ==================== */
.article-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Article Card */
.article-card {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  min-height: 90px;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.02);
}

.card-indicator {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%);
  transform: scaleY(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 0 3px 3px 0;
}

.article-card.selected .card-indicator {
  transform: scaleY(1);
}

.card-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 12px;
  font-size: 20px;
  flex-shrink: 0;
  transition: all 0.3s ease;
  margin-top: 2px;
}

.article-card:hover .card-icon {
  transform: scale(1.05);
}

.card-icon.knowledge {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.card-icon.posts {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.card-icon.default {
  background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
  line-height: 1.5;
  min-height: 22px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #6b7280;
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  transition: transform 0.2s ease;
}

.tag:hover {
  transform: scale(1.05);
}

.tag.blue { background: #dbeafe; color: #1d4ed8; }
.tag.cyan { background: #cffafe; color: #0e7490; }
.tag.green { background: #d1fae5; color: #047857; }
.tag.yellow { background: #fef9c3; color: #a16207; }
.tag.pink { background: #fce7f3; color: #be185d; }
.tag.purple { background: #f3e8ff; color: #7c3aed; }
.tag.gray { background: #f3f4f6; color: #4b5563; }

/* Card Actions */
.card-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transform: translateX(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.article-card:hover .card-actions {
  opacity: 1;
  transform: translateX(0);
}

.btn-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-action svg {
  width: 16px;
  height: 16px;
  color: #6b7280;
  transition: color 0.2s ease;
}

.btn-action:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: scale(1.05);
}

.btn-action.edit:hover svg {
  color: #3b82f6;
}

.btn-action.delete:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

.btn-action.delete:hover svg {
  color: #ef4444;
}

/* ==================== Empty State ==================== */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
}

.empty-illustration {
  position: relative;
  margin-bottom: 24px;
}

.illustration-paper {
  width: 80px;
  height: 100px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
  transform: rotate(-5deg);
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: rotate(-5deg) translateY(0); }
  50% { transform: rotate(-5deg) translateY(-8px); }
}

.paper-line {
  height: 4px;
  background: linear-gradient(90deg, #e5e7eb 0%, #f3f4f6 100%);
  border-radius: 2px;
}

.paper-line.short {
  width: 60%;
}

.illustration-shadow {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 8px;
  background: radial-gradient(ellipse, rgba(0,0,0,0.1) 0%, transparent 70%);
  border-radius: 50%;
  animation: shadow 3s ease-in-out infinite;
}

@keyframes shadow {
  0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
  50% { transform: translateX(-50%) scale(0.8); opacity: 0.6; }
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 24px;
}

.btn-create-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-create-empty svg {
  width: 18px;
  height: 18px;
}

.btn-create-empty:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.05);
  transform: translateY(-1px);
}

/* ==================== Modal ==================== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 24px;
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-small {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0;
}

.modal-header.danger {
  padding-bottom: 16px;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.modal-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-radius: 12px;
}

.modal-icon.danger {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
}

.modal-icon svg {
  width: 20px;
  height: 20px;
  color: #3b82f6;
}

.modal-icon.danger svg {
  color: #ef4444;
}

.modal-header h4 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close svg {
  width: 18px;
  height: 18px;
  color: #6b7280;
}

.btn-close:hover {
  background: #e5e7eb;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: 50vh;
}

.modal-body.center {
  text-align: center;
}

.confirm-text {
  font-size: 15px;
  color: #374151;
  margin: 0 0 8px;
  line-height: 1.6;
}

.confirm-text strong {
  color: #1f2937;
}

.warning-text {
  font-size: 13px;
  color: #ef4444;
  margin: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px;
  background: #f9fafb;
}

/* Form Elements */
.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.required {
  color: #ef4444;
}

.input-wrapper {
  position: relative;
}

.input-wrapper.textarea {
  min-height: 120px;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  font-size: 14px;
  color: #1f2937;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #9ca3af;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.6;
}

.input-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
  z-index: -1;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: #3b82f6;
}

.form-input:focus ~ .input-glow,
.form-select:focus ~ .input-glow,
.form-textarea:focus ~ .input-glow {
  opacity: 0.3;
}

/* Buttons */
.btn-primary,
.btn-secondary,
.btn-danger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #374151;
  border: 1px solid #e5e7eb;
}

.btn-secondary:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Loading Spinner */
.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ==================== Toast ==================== */
.toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: white;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 10000;
}

.toast-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toast-icon svg {
  width: 20px;
  height: 20px;
}

.toast.success {
  color: #047857;
}

.toast.success .toast-icon {
  color: #10b981;
}

.toast.error {
  color: #dc2626;
}

.toast.error .toast-icon {
  color: #ef4444;
}

.toast.info {
  color: #0369a1;
}

.toast.info .toast-icon {
  color: #0ea5e9;
}

/* ==================== Transitions ==================== */
.modal-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content {
  transform: translateY(100px);
  opacity: 0;
}

.modal-leave-to .modal-content {
  transform: translateY(20px);
  opacity: 0;
}

.modal-enter-active .modal-content {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-leave-active .modal-content {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.toast-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px) scale(0.9);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

/* ==================== Scrollbar ==================== */
.article-list::-webkit-scrollbar {
  width: 6px;
}

.article-list::-webkit-scrollbar-track {
  background: transparent;
}

.article-list::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}

.article-list::-webkit-scrollbar-thumb:hover {
  background: #d1d5db;
}

.modal-body::-webkit-scrollbar {
  width: 6px;
}

.modal-body::-webkit-scrollbar-track {
  background: transparent;
}

.modal-body::-webkit-scrollbar-thumb {
  background: #e5e7eb;
  border-radius: 3px;
}

/* ==================== Path Selector ==================== */
.path-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.path-selector:hover {
  border-color: #3b82f6;
  background: #f8fafc;
}

.path-text {
  font-size: 14px;
  color: #1f2937;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.path-arrow {
  width: 16px;
  height: 16px;
  color: #9ca3af;
  transition: transform 0.3s ease;
}

.path-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 6px;
}

/* Path Selector Modal */
.path-selector-modal {
  max-width: 600px;
}

.path-tree {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px 0;
}

.path-tree-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 8px;
  margin: 0 8px;
}

.path-tree-item:hover {
  background: #f3f4f6;
}

.path-tree-item.selected {
  background: #dbeafe;
  color: #1d4ed8;
}

.path-tree-item.is-article {
  padding-left: 32px;
}

.path-tree-item.is-article .tree-icon {
  color: #3b82f6;
}

.tree-icon {
  width: 20px;
  height: 20px;
  color: #6b7280;
  flex-shrink: 0;
}

.tree-label {
  font-size: 14px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-action {
  font-size: 12px;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.path-tree-item:hover .tree-action {
  opacity: 1;
}

.path-tree-children {
  margin-left: 16px;
  border-left: 1px dashed #e5e7eb;
}

.path-tree-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 8px;
}

.path-tree-header .tree-icon {
  color: #3b82f6;
}

.path-tree-header .tree-label {
  font-weight: 500;
  color: #374151;
}

.child-doc-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef3c7;
  border-radius: 8px;
  margin: 0 16px 16px;
  font-size: 13px;
  color: #92400e;
}

.child-doc-hint svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Loading & Empty States */
.path-tree-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 40px 20px;
  color: #6b7280;
  font-size: 14px;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.path-tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;
  color: #9ca3af;
  font-size: 14px;
}

.path-tree-empty svg {
  width: 48px;
  height: 48px;
  opacity: 0.5;
}

/* ==================== Responsive ==================== */
@media (max-width: 640px) {
  .manager-header {
    padding: 16px 20px;
  }
  
  .manager-toolbar {
    padding: 12px 20px;
  }
  
  .article-list {
    padding: 12px 16px;
  }
  
  .article-card {
    padding: 14px 16px;
  }
  
  .card-actions {
    opacity: 1;
    transform: none;
  }
  
  .modal-content {
    border-radius: 20px 20px 0 0;
    max-height: 90vh;
  }
  
  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }
  
  .path-tree {
    max-height: 50vh;
  }
}
</style>
