<template>
  <div class="mention-input" ref="containerRef">
    <!-- 技能标签（在输入框上方） -->
    <div v-if="selectedSkill" class="skill-capsule">
      <span class="skill-icon">{{ selectedSkill.icon }}</span>
      <span class="skill-name">{{ selectedSkill.name }}</span>
      <button class="skill-remove" @click="clearSkill" title="移除技能">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    
    <!-- 引用标签（在输入框上方） - 简洁样式 -->
    <div v-if="selectedMentions.length > 0" class="mentions-bar">
      <div
        v-for="mention in selectedMentions"
        :key="mention.path"
        class="mention-capsule-mini"
      >
        <span>📄</span>
        <span>{{ mention.title }}</span>
      </div>
    </div>
    
    <!-- 输入框容器 -->
    <div class="input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="inputValue"
        class="input-field"
        :placeholder="placeholder"
        rows="1"
        @keydown="handleKeydown"
        @input="handleInput"
      ></textarea>
    </div>
    
    <!-- 提及面板 (@) - 使用 popper 或点击外部关闭 -->
    <Teleport to="body">
      <div
        v-if="showMentionPanel"
        ref="mentionPanelRef"
        class="mention-panel"
        :style="panelStyle"
        @mousedown.prevent
      >
        <div class="panel-header">
          <span class="panel-icon">📎</span>
          <span>引用文章</span>
          <button class="panel-close" @click="closeMentionPanel">✕</button>
        </div>
        <div class="panel-search">
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            placeholder="搜索标题或内容..."
            @keydown.stop="handleSearchKeydown"
          />
          <span v-if="isSearching" class="search-loading">
            <span class="loading-spinner-small"></span>
          </span>
        </div>
        
        <!-- 搜索结果分类 -->
        <div class="panel-list" ref="listRef">
          <!-- 标题匹配结果 -->
          <div v-if="titleMatches.length > 0" class="result-section">
            <div class="result-label">标题匹配</div>
            <div
              v-for="(item, index) in titleMatches"
              :key="item.path"
              class="panel-item"
              :class="{ 
                active: currentFocusIndex === index, 
                selected: isSelected(item) 
              }"
              @click="selectMention(item)"
              @mouseenter="currentFocusIndex = index; loadPreview(item)"
              @mouseleave="clearPreview"
            >
              <span class="item-icon">📄</span>
              <div class="item-info">
                <div class="item-title" v-html="highlightText(item.title, searchQuery)"></div>
                <div class="item-path">{{ item.path }}</div>
              </div>
              <span v-if="isSelected(item)" class="item-check">✓</span>
            </div>
          </div>
          
          <!-- 内容匹配结果 -->
          <div v-if="contentMatches.length > 0" class="result-section">
            <div class="result-label">内容匹配</div>
            <div
              v-for="(item, index) in contentMatches"
              :key="item.path"
              class="panel-item"
              :class="{ 
                active: currentFocusIndex === titleMatches.length + index, 
                selected: isSelected(item) 
              }"
              @click="selectMention(item)"
              @mouseenter="currentFocusIndex = titleMatches.length + index; loadPreview(item)"
              @mouseleave="clearPreview"
            >
              <span class="item-icon">🔍</span>
              <div class="item-info">
                <div class="item-title">{{ item.title }}</div>
                <div class="item-snippet" v-html="highlightText(item.snippet || '', searchQuery)"></div>
                <div class="item-path">{{ item.path }}</div>
              </div>
              <span v-if="isSelected(item)" class="item-check">✓</span>
            </div>
          </div>
          
          <div v-if="!isSearching && titleMatches.length === 0 && contentMatches.length === 0" class="panel-empty">
            <div v-if="searchQuery">
              未找到 "{{ searchQuery }}" 相关文章
            </div>
            <div v-else>
              输入关键词搜索文章
            </div>
          </div>
        </div>
        
        <div class="panel-footer">
          <span>↑↓ 选择 · Enter 添加 · ESC 关闭</span>
        </div>
        
        <!-- 文章预览浮层 -->
        <div v-if="previewArticle" class="article-preview">
          <div class="preview-header">
            <span class="preview-title">{{ previewArticle.title }}</span>
          </div>
          <div class="preview-content">
            {{ previewContent || '加载中...' }}
          </div>
        </div>
      </div>
    </Teleport>
    
    <!-- 技能面板 (/) -->
    <Teleport to="body">
      <div
        v-if="showSkillPanel"
        ref="skillPanelRef"
        class="mention-panel skill-panel"
        :style="panelStyle"
        @mousedown.prevent
      >
        <div class="panel-header">
          <span class="panel-icon">⚡</span>
          <span>选择技能</span>
          <button class="panel-close" @click="closeSkillPanel">✕</button>
        </div>
        <div class="panel-list" ref="skillListRef">
          <div
            v-for="(skill, index) in skillList"
            :key="skill.id"
            class="panel-item skill-item"
            :class="{ active: index === selectedSkillIndex }"
            @click="selectSkill(skill)"
            @mouseenter="selectedSkillIndex = index"
          >
            <span class="item-icon">{{ skill.icon }}</span>
            <div class="item-info">
              <div class="item-title">{{ skill.name }}</div>
              <div class="item-desc">{{ skill.description }}</div>
            </div>
            <span class="item-shortcut">/{{ skill.id }}</span>
          </div>
        </div>
        <div class="panel-footer">
          <span>↑↓ 选择 · Enter 确认 · ESC 关闭</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useSkills, type Skill } from '../core/composables/useSkills'

// ==================== 类型定义 ====================
interface Article {
  path: string
  title: string
  section: string
  content?: string
  snippet?: string
}

// Skill 类型从 useSkills 导入

export interface Mention {
  path: string
  title: string
}

// ==================== Props & Emits ====================
const props = defineProps<{
  modelValue: string
  placeholder?: string
  selectedSkill?: Skill
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'skill-change': [skill: Skill | null]
  'mentions-change': [mentions: Mention[]]
  'send': [content: string, mentions: Mention[], skill?: Skill]
}>()

// ==================== Skills 配置 ====================
const { skills, initSkills } = useSkills()
const skillList = computed(() => skills.value)

// ==================== Refs ====================
const containerRef = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const searchInputRef = ref<HTMLInputElement>()
const mentionPanelRef = ref<HTMLElement>()
const skillPanelRef = ref<HTMLElement>()

const inputValue = ref(props.modelValue)
const showMentionPanel = ref(false)
const showSkillPanel = ref(false)

// 监听外部传入的 selectedSkill
watch(() => props.selectedSkill, (skill) => {
  if (skill) {
    selectedSkill.value = skill
  }
}, { immediate: true })
const searchQuery = ref('')
const selectedSkillIndex = ref(0)
const mentionTriggerPos = ref(0)
const articles = ref<Article[]>([])
const isLoading = ref(false)
const isSearching = ref(false)
const selectedSkill = ref<Skill | null>(null)
const selectedMentions = ref<Mention[]>([])

// 统一焦点索引（用于键盘导航）
const currentFocusIndex = ref(0)

// 搜索结果
const titleMatches = ref<Article[]>([])
const contentMatches = ref<Article[]>([])

// 预览相关
const previewArticle = ref<Article | null>(null)
const previewContent = ref('')
const previewTimeout = ref<number | null>(null)

// ==================== 面板位置 ====================
const panelStyle = computed(() => {
  if (!textareaRef.value) return {}
  const rect = textareaRef.value.getBoundingClientRect()
  return {
    position: 'fixed' as const,
    left: `${rect.left}px`,
    bottom: `${window.innerHeight - rect.top + 8}px`,
    width: `${Math.min(rect.width, 450)}px`,
    maxHeight: '500px'
  }
})

// ==================== 加载文章列表（带内容）====================
async function loadArticles() {
  if (isLoading.value) return
  isLoading.value = true
  
  try {
    const response = await fetch('/api/articles/list-all')
    if (response.ok) {
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        // 同时加载内容用于搜索
        const articlesWithContent: Article[] = []
        
        for (const article of result.data.slice(0, 50)) { // 限制初始加载数量
          try {
            const contentRes = await fetch(`/api/files/read?path=${encodeURI('sections/' + article.path)}`)
            if (contentRes.ok) {
              const content = await contentRes.text()
              // 清理内容用于搜索
              const cleanContent = content
                .replace(/^---[\s\S]*?---/, '') // 移除 frontmatter
                .replace(/[#*_`\[\](){}|]/g, ' ') // 移除 markdown 标记
                .replace(/\s+/g, ' ') // 合并空白
                .trim()
              
              articlesWithContent.push({
                ...article,
                content: cleanContent
              })
            } else {
              articlesWithContent.push(article)
            }
          } catch {
            articlesWithContent.push(article)
          }
        }
        
        articles.value = articlesWithContent
      }
    }
  } catch (error) {
    console.error('[MentionInput] Failed to load articles:', error)
  } finally {
    isLoading.value = false
  }
}

// ==================== 搜索功能 ====================
async function performSearch(query: string) {
  if (!query.trim()) {
    titleMatches.value = articles.value.slice(0, 10)
    contentMatches.value = []
    return
  }
  
  isSearching.value = true
  const lowerQuery = query.toLowerCase()
  
  // 标题匹配
  const titles: Article[] = []
  // 内容匹配
  const contents: Article[] = []
  
  for (const article of articles.value) {
    // 标题匹配（优先级高）
    if (article.title.toLowerCase().includes(lowerQuery)) {
      titles.push(article)
      continue
    }
    
    // 内容匹配
    if (article.content && article.content.toLowerCase().includes(lowerQuery)) {
      // 提取匹配片段
      const index = article.content.toLowerCase().indexOf(lowerQuery)
      const start = Math.max(0, index - 50)
      const end = Math.min(article.content.length, index + query.length + 50)
      const snippet = '...' + article.content.slice(start, end) + '...'
      
      contents.push({
        ...article,
        snippet
      })
    }
  }
  
  titleMatches.value = titles.slice(0, 5)
  contentMatches.value = contents.slice(0, 5)
  isSearching.value = false
  
  // 重置焦点索引
  currentFocusIndex.value = 0
}

// ==================== 高亮文本 ====================
function highlightText(text: string, query: string): string {
  if (!query) return text
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// ==================== 预览功能 ====================
async function loadPreview(article: Article) {
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }
  
  previewTimeout.value = window.setTimeout(async () => {
    previewArticle.value = article
    previewContent.value = ''
    
    try {
      const response = await fetch(`/api/files/read?path=${encodeURI('sections/' + article.path)}`)
      if (response.ok) {
        const content = await response.text()
        const textOnly = content
          .replace(/^---[\s\S]*?---/, '')
          .replace(/[#*_`\[\]]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        previewContent.value = textOnly.slice(0, 300) + (textOnly.length > 300 ? '...' : '')
      }
    } catch (e) {
      previewContent.value = '无法加载预览'
    }
  }, 200)
}

function clearPreview() {
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
    previewTimeout.value = null
  }
  previewArticle.value = null
  previewContent.value = ''
}

// ==================== 监听输入 ====================
watch(() => props.modelValue, (val) => {
  if (val !== inputValue.value) {
    inputValue.value = val
  }
})

watch(inputValue, (val) => {
  emit('update:modelValue', val)
})

// 搜索防抖
let searchTimeout: number | null = null
watch(searchQuery, (val) => {
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  searchTimeout = window.setTimeout(() => {
    performSearch(val)
  }, 200)
})

// ==================== 输入处理 ====================
function handleInput() {
  const textarea = textareaRef.value
  if (!textarea) return
  
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = inputValue.value.slice(0, cursorPos)
  
  // 检查是否触发 @
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  if (lastAtIndex !== -1) {
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
    if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n') && textAfterAt.length < 20) {
      openMentionPanel(lastAtIndex)
      return
    }
  }
  
  // 检查是否触发 /
  const lastSlashIndex = textBeforeCursor.lastIndexOf('/')
  if (lastSlashIndex !== -1) {
    const textAfterSlash = textBeforeCursor.slice(lastSlashIndex + 1)
    if ((lastSlashIndex === 0 || /\s/.test(textBeforeCursor[lastSlashIndex - 1])) &&
        !textAfterSlash.includes(' ') && !textAfterSlash.includes('\n') && textAfterSlash.length < 10) {
      openSkillPanel()
      return
    }
  }
  
  // 关闭面板
  closeMentionPanel()
  closeSkillPanel()
}

function openMentionPanel(triggerPos: number) {
  showMentionPanel.value = true
  showSkillPanel.value = false
  mentionTriggerPos.value = triggerPos
  searchQuery.value = ''
  currentFocusIndex.value = 0
  
  // 加载文章
  if (articles.value.length === 0) {
    loadArticles().then(() => {
      titleMatches.value = articles.value.slice(0, 10)
    })
  } else {
    titleMatches.value = articles.value.slice(0, 10)
  }
  
  nextTick(() => searchInputRef.value?.focus())
}

function openSkillPanel() {
  showSkillPanel.value = true
  showMentionPanel.value = false
  selectedSkillIndex.value = 0
}

function closeMentionPanel() {
  showMentionPanel.value = false
  clearPreview()
}

function closeSkillPanel() {
  showSkillPanel.value = false
}

// ==================== 键盘处理 ====================
function handleKeydown(e: KeyboardEvent) {
  // Mention 面板打开时
  if (showMentionPanel.value) {
    handleMentionPanelKeydown(e)
    return
  }
  
  // Skill 面板打开时
  if (showSkillPanel.value) {
    handleSkillPanelKeydown(e)
    return
  }
  
  // 默认行为
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleMentionPanelKeydown(e: KeyboardEvent) {
  const totalItems = titleMatches.value.length + contentMatches.value.length
  
  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      closeMentionPanel()
      textareaRef.value?.focus()
      break
    case 'ArrowDown':
      e.preventDefault()
      if (totalItems > 0) {
        currentFocusIndex.value = (currentFocusIndex.value + 1) % totalItems
        scrollToSelected()
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      if (totalItems > 0) {
        currentFocusIndex.value = (currentFocusIndex.value - 1 + totalItems) % totalItems
        scrollToSelected()
      }
      break
    case 'Enter':
      e.preventDefault()
      const allItems = [...titleMatches.value, ...contentMatches.value]
      if (allItems[currentFocusIndex.value]) {
        selectMention(allItems[currentFocusIndex.value])
      }
      break
  }
}

function handleSkillPanelKeydown(e: KeyboardEvent) {
  e.stopPropagation()
  
  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      closeSkillPanel()
      textareaRef.value?.focus()
      break
    case 'ArrowDown':
      e.preventDefault()
      selectedSkillIndex.value = (selectedSkillIndex.value + 1) % skillList.value.length
      scrollToSelectedSkill()
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedSkillIndex.value = (selectedSkillIndex.value - 1 + skillList.value.length) % skillList.value.length
      scrollToSelectedSkill()
      break
    case 'Enter':
      e.preventDefault()
      selectSkill(skillList.value[selectedSkillIndex.value])
      break
  }
}

function handleSearchKeydown(e: KeyboardEvent) {
  // 搜索框的键盘事件由 handleMentionPanelKeydown 处理
}

function scrollToSelected() {
  nextTick(() => {
    const list = mentionPanelRef.value?.querySelector('.panel-list')
    const activeItem = list?.querySelector('.panel-item.active')
    if (list && activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' })
    }
  })
}

function scrollToSelectedSkill() {
  nextTick(() => {
    const list = skillPanelRef.value?.querySelector('.panel-list')
    const activeItem = list?.querySelector('.panel-item.active')
    if (list && activeItem) {
      activeItem.scrollIntoView({ block: 'nearest' })
    }
  })
}

// ==================== 选择处理 ====================
function selectMention(article: Article) {
  const textarea = textareaRef.value
  if (!textarea) return
  
  // 获取当前光标位置
  const cursorPos = textarea.selectionStart
  const textBeforeCursor = inputValue.value.slice(0, cursorPos)
  
  // 找到最后一个 @ 的位置
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')
  
  // 构造要插入的文本
  const beforeAt = inputValue.value.slice(0, lastAtIndex)
  const afterCursor = inputValue.value.slice(cursorPos)
  
  // 插入 @文章标题（带空格便于继续输入）
  inputValue.value = `${beforeAt}@${article.title} ${afterCursor}`
  
  // 保存引用信息（用于发送时读取内容）
  if (!selectedMentions.value.find(m => m.path === article.path)) {
    selectedMentions.value.push({
      path: article.path,
      title: article.title
    })
    emit('mentions-change', selectedMentions.value)
  }
  
  closeMentionPanel()
  
  nextTick(() => {
    // 恢复光标位置到插入的标题后面
    const newCursorPos = lastAtIndex + article.title.length + 2 // +2 是 @ 和空格
    textarea.setSelectionRange(newCursorPos, newCursorPos)
    textarea.focus()
  })
}

function removeMention(mention: Mention) {
  // 从输入框中移除 @文章标题
  const escapedTitle = mention.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`@${escapedTitle}\\s?`, 'g')
  inputValue.value = inputValue.value.replace(regex, '').trim()
  
  // 从引用列表中移除
  selectedMentions.value = selectedMentions.value.filter(m => m.path !== mention.path)
  emit('mentions-change', selectedMentions.value)
}

function isSelected(article: Article): boolean {
  // 检查是否已选中该文章
  return selectedMentions.value.some(m => m.path === article.path)
}

function selectSkill(skill: Skill) {
  selectedSkill.value = skill
  emit('skill-change', skill)
  
  // 移除 /xxx
  const cursorPos = textareaRef.value?.selectionStart || 0
  const lastSlashIndex = inputValue.value.lastIndexOf('/', cursorPos)
  if (lastSlashIndex !== -1) {
    const beforeSlash = inputValue.value.slice(0, lastSlashIndex)
    const afterCursor = inputValue.value.slice(cursorPos)
    inputValue.value = beforeSlash + afterCursor
  }
  
  closeSkillPanel()
  
  nextTick(() => {
    textareaRef.value?.focus()
  })
}

function clearSkill() {
  selectedSkill.value = null
  emit('skill-change', null)
}

/**
 * 加载文章内容
 */
async function loadArticleContent(path: string): Promise<string> {
  try {
    const response = await fetch(`/api/files/read?path=${encodeURIComponent('sections/' + path)}`)
    if (!response.ok) return `[无法加载文章: ${path}]`
    const content = await response.text()
    // 清理 frontmatter
    return content.replace(/^---[\s\S]*?---/, '').trim()
  } catch (error) {
    return `[加载错误: ${path}]`
  }
}

/**
 * 构建带引用的完整消息
 */
async function buildMessageWithReferences(): Promise<string> {
  let fullMessage = inputValue.value.trim()
  
  // 如果有引用文章，加载内容并附加
  if (selectedMentions.value.length > 0) {
    fullMessage += '\n\n---\n\n**引用资料:**\n\n'
    
    for (const mention of selectedMentions.value) {
      const content = await loadArticleContent(mention.path)
      fullMessage += `<reference title="${mention.title}" path="${mention.path}">\n${content}\n</reference>\n\n`
    }
  }
  
  return fullMessage
}

async function handleSend() {
  if (!inputValue.value.trim()) return
  
  // 构建包含引用内容的完整消息
  const fullMessage = await buildMessageWithReferences()
  
  emit('send', fullMessage, selectedMentions.value, selectedSkill.value || undefined)
  
  // 重置输入
  inputValue.value = ''
  selectedMentions.value = []
  emit('mentions-change', [])
}

// 清空所有
function clearAll() {
  inputValue.value = ''
  selectedMentions.value = []
  selectedSkill.value = null
  emit('mentions-change', [])
  emit('skill-change', null)
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 预加载文章列表
  loadArticles()
  // 初始化技能列表
  initSkills()
})

onUnmounted(() => {
  if (previewTimeout.value) {
    clearTimeout(previewTimeout.value)
  }
})

// ==================== 暴露方法 ====================
defineExpose({
  focus() {
    textareaRef.value?.focus()
  },
  clearSkill,
  clearAll,
  setSelectedSkill(skill: Skill) {
    selectedSkill.value = skill
  },
  getSkill() {
    return selectedSkill.value
  },
  getMentions() {
    return selectedMentions.value
  }
})
</script>

<style scoped>
.mention-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 技能胶囊 */
.skill-capsule {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: white;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  width: fit-content;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.skill-icon {
  font-size: 14px;
}

.skill-name {
  font-size: 12px;
}

.skill-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.skill-capsule:hover .skill-remove {
  opacity: 1;
}

.skill-remove:hover {
  background: rgba(255, 255, 255, 0.3);
}

.skill-remove svg {
  width: 10px;
  height: 10px;
}

/* 引用标签栏 */
.mentions-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}

.mention-capsule-mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  border-radius: 4px;
  font-size: 11px;
}

/* 输入框 */
.input-wrapper {
  flex: 1;
}

.input-field {
  width: 100%;
  background: transparent;
  border: none;
  padding: 8px 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ai-text-primary);
  resize: none;
  min-height: 24px;
  max-height: 200px;
  outline: none;
}

.input-field::placeholder {
  color: var(--ai-text-muted);
}

/* 提及面板 */
.mention-panel {
  position: relative;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 10000;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-weight: 500;
  font-size: 14px;
}

.panel-icon {
  font-size: 16px;
}

.panel-close {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: var(--vp-c-text-2);
  font-size: 14px;
  transition: all 0.2s;
}

.panel-close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.panel-hint {
  margin-left: auto;
  font-size: 11px;
  color: var(--vp-c-text-2);
  font-weight: normal;
}

/* 搜索框 */
.panel-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--vp-c-divider);
  position: relative;
}

.panel-search input {
  width: 100%;
  padding: 8px 32px 8px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  outline: none;
  background: var(--vp-c-bg-soft);
}

.panel-search input:focus {
  border-color: var(--vp-c-brand);
}

.search-loading {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* 列表 */
.panel-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
  position: relative;
}

/* 结果分类 */
.result-section {
  margin-bottom: 8px;
}

.result-label {
  padding: 4px 12px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.panel-item:hover,
.panel-item.active {
  background: var(--vp-c-bg-soft);
}

.panel-item.selected {
  background: var(--vp-c-green-soft);
}

.panel-item.selected .item-title {
  color: var(--vp-c-green-1);
}

.item-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-title :deep(mark) {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 2px;
  padding: 0 2px;
}

.item-path {
  font-size: 11px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-snippet {
  font-size: 11px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-snippet :deep(mark) {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 2px;
  padding: 0 2px;
}

.item-desc {
  font-size: 11px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.item-check {
  color: var(--vp-c-green-1);
  font-weight: bold;
  font-size: 14px;
}

.item-shortcut {
  font-size: 11px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  padding: 2px 6px;
  border-radius: 4px;
}

/* 空状态 */
.panel-empty {
  padding: 24px;
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 13px;
}

/* 底部提示 */
.panel-footer {
  padding: 8px 12px;
  border-top: 1px solid var(--vp-c-divider);
  font-size: 11px;
  color: var(--vp-c-text-2);
  text-align: center;
}

/* 文章预览浮层 */
.article-preview {
  position: absolute;
  left: 100%;
  top: 0;
  margin-left: 8px;
  width: 320px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.preview-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.preview-title {
  font-weight: 500;
  font-size: 13px;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-content {
  padding: 12px 16px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 技能项 */
.skill-item.active {
  background: var(--vp-c-brand-soft);
}

.skill-item.active .item-title {
  color: var(--vp-c-brand);
}
</style>
