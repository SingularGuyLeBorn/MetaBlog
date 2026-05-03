<!--
  MentionInput - 智能输入框(支持 @ 引用文章和 / 选择技能)
-->
<template>
  <div class="mention-input" ref="containerRef">
    <!-- 技能选择下拉框 -->
    <Transition name="dropdown">
      <div v-if="showSkillDropdown" class="dropdown-menu skill-dropdown" :style="dropdownPosition">
        <div class="dropdown-header">
          <span class="dropdown-title">选择技能</span>
          <span class="dropdown-hint">{{ skillIndex + 1 }} / {{ filteredSkills.length }}</span>
        </div>
        <div class="dropdown-list skill-list">
          <div 
            v-for="(skill, index) in filteredSkills" 
            :key="skill.id"
            class="dropdown-item"
            :class="{ active: index === skillIndex }"
            @click="selectSkill(skill)"
            @mouseenter="skillIndex = index"
          >
            <span class="item-icon">{{ skill.icon }}</span>
            <div class="item-content">
              <div class="item-title">{{ skill.name }}</div>
              <div class="item-desc">{{ skill.description }}</div>
            </div>
          </div>
          <div v-if="filteredSkills.length === 0" class="dropdown-empty">
            没有找到匹配的技能
          </div>
        </div>
      </div>
    </Transition>

    <!-- 文章引用下拉框 -->
    <Transition name="dropdown">
      <div v-if="showMentionDropdown" class="dropdown-menu mention-dropdown" :style="dropdownPosition">
        <div class="dropdown-header">
          <span class="dropdown-title">引用文章</span>
          <span class="dropdown-hint">{{ mentionIndex + 1 }} / {{ filteredArticles.length }}</span>
        </div>
        <div class="dropdown-search" v-if="articles.length > 10">
          <input 
            v-model="articleSearchQuery" 
            type="text" 
            placeholder="搜索标题或路径..."
            class="search-input"
            @keydown.stop
          />
        </div>
        <div class="dropdown-list mention-list">
          <template v-for="(group, gIndex) in groupedArticles" :key="group.section">
            <div class="section-header">{{ group.label }} ({{ group.items.length }})</div>
            <div
              v-for="(article, index) in group.items"
              :key="article.path"
              class="dropdown-item mention-item"
              :class="{ active: getGlobalMentionIndex(gIndex, index) === mentionIndex }"
              @click="selectMention(article)"
              @mouseenter="mentionIndex = getGlobalMentionIndex(gIndex, index)"
            >
              <span class="item-icon mention-icon">📄</span>
              <div class="item-content mention-content">
                <div class="item-title">{{ article.title }}</div>
                <div class="item-meta">
                  <span v-if="article.section" class="section-tag">{{ article.section }}</span>
                  <span class="item-path">{{ article.path }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
        <div v-if="filteredArticles.length === 0" class="dropdown-empty">
          没有找到匹配的文章（可搜索标题或路径）
        </div>
      </div>
    </Transition>

    <!-- 输入区域 -->
    <div class="input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="text"
        class="input-textarea"
        :placeholder="placeholder"
        :rows="rows"
        @keydown="handleKeydown"
        @input="handleInput"
        @focus="isFocused = true"

      />
      
      <!-- 已选择的技能标签 -->
      <div v-if="selectedSkill" class="selected-skill">
        <span class="skill-tag">
          {{ selectedSkill.icon }} {{ selectedSkill.name }}
          <button class="skill-remove" @click="clearSkill">×</button>
        </span>
      </div>
      
      <!-- 已引用的文章标签 -->
      <div v-if="mentions.length > 0" class="selected-mentions">
        <span v-for="mention in mentions" :key="mention.path" class="mention-tag">
          @{{ mention.title }}
          <button class="mention-remove" @click="removeMention(mention)">×</button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Skill } from '@/theme/types/agent'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

export interface Mention {
  title: string
  path: string
}

interface Article {
  title: string
  path: string
  section?: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  rows?: number
  selectedSkill?: Skill
  skills?: Skill[]
  /** AI 是否正在流式输出中. 为 true 时禁止通过键盘发送消息 */
  isStreaming?: boolean
}>(), {
  placeholder: '输入消息,/ 选择技能,@ 引用文章,按 Enter 发送...',
  rows: 3,
  skills: () => [],
  isStreaming: false
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'send': []
  'skillChange': [skill: Skill | null]
  'mentionsChange': [mentions: Mention[]]
}>()

// Refs
const containerRef = ref<HTMLElement>()
const textareaRef = ref<HTMLTextAreaElement>()
const text = ref(props.modelValue)
const isFocused = ref(false)

// 技能选择状态
const showSkillDropdown = ref(false)
const skillIndex = ref(0)
const skillQuery = ref('')

// 文章引用状态
const showMentionDropdown = ref(false)
const mentionIndex = ref(0)
const mentionQuery = ref('')
const articleSearchQuery = ref('')
const mentions = ref<Mention[]>([])

// 文章列表
const articles = ref<Article[]>([])

// 下拉框位置
const dropdownPosition = computed(() => ({
  bottom: '100%',
  left: '0',
  marginBottom: '8px'
}))

// 过滤后的技能
const filteredSkills = computed(() => {
  if (!skillQuery.value) return props.skills
  const query = skillQuery.value.toLowerCase()
  return props.skills.filter(s => 
    s.name.toLowerCase().includes(query) ||
    s.description.toLowerCase().includes(query)
  )
})

// 过滤后的文章
const filteredArticles = computed(() => {
  let list = articles.value

  // 先按 mentionQuery 过滤(@ 后面的内容)
  if (mentionQuery.value) {
    const query = mentionQuery.value.toLowerCase()
    list = list.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.path.toLowerCase().includes(query)
    )
  }

  // 再按搜索框过滤
  if (articleSearchQuery.value) {
    const query = articleSearchQuery.value.toLowerCase()
    list = list.filter(a =>
      a.title.toLowerCase().includes(query) ||
      a.path.toLowerCase().includes(query)
    )
  }

  // 排除已引用的
  const mentionedPaths = new Set(mentions.value.map(m => m.path))
  list = list.filter(a => !mentionedPaths.has(a.path))

  return list
})

// 按 section 分组的文章列表
const groupedArticles = computed(() => {
  const groups: Record<string, Article[]> = {}
  for (const article of filteredArticles.value) {
    const section = article.section || 'other'
    if (!groups[section]) groups[section] = []
    groups[section].push(article)
  }
  // 固定 section 顺序: posts, knowledge, resources, other
  const order = ['posts', 'knowledge', 'resources']
  const sorted: { section: string; label: string; items: Article[] }[] = []
  for (const sec of order) {
    if (groups[sec]) {
      sorted.push({ section: sec, label: sec.toUpperCase(), items: groups[sec] })
      delete groups[sec]
    }
  }
  // 其他 section 按字母排序
  for (const sec of Object.keys(groups).sort()) {
    sorted.push({ section: sec, label: sec.toUpperCase(), items: groups[sec] })
  }
  return sorted
})

// 监听外部值变化
watch(() => props.modelValue, (val) => {
  if (val !== text.value) text.value = val
})

watch(text, (val) => {
  emit('update:modelValue', val)
})

// 过滤结果变化时重置选中索引
watch(filteredArticles, () => {
  mentionIndex.value = 0
})

// 监听技能变化
watch(() => props.selectedSkill, (skill) => {
  if (!skill) clearSkill()
})

// 加载文章列表
async function loadArticles() {
  try {
    const response = await fetch('/api/articles/list-all')
    if (response.ok) {
      const result = await response.json()
      const list = result.data || []
      articles.value = list.map((a: any) => ({
        title: a.title || a.path.split('/').pop()?.replace(/\.md$/, '') || a.path,
        path: a.path,
        section: a.section
      }))
      console.log('[MentionInput] Loaded articles:', articles.value.length, 'Sections:', [...new Set(articles.value.map(a => a.section))])
    }
  } catch (e) {
    console.error('[MentionInput] Failed to load articles:', e)
  }
}

// 计算全局 mention 索引(跨分组)
function getGlobalMentionIndex(groupIndex: number, itemIndex: number): number {
  let count = 0
  for (let i = 0; i < groupIndex; i++) {
    count += groupedArticles.value[i]?.items.length || 0
  }
  return count + itemIndex
}

onMounted(() => {
  loadArticles()
  document.addEventListener('mousedown', handleDocumentMousedown)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocumentMousedown)
})

// 键盘处理
function handleKeydown(e: KeyboardEvent) {
  // 技能下拉框
  if (showSkillDropdown.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      skillIndex.value = (skillIndex.value + 1) % filteredSkills.value.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      skillIndex.value = (skillIndex.value - 1 + filteredSkills.value.length) % filteredSkills.value.length
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const skill = filteredSkills.value[skillIndex.value]
      if (skill) selectSkill(skill)
    } else if (e.key === 'Escape') {
      showSkillDropdown.value = false
    }
    return
  }

  // 文章引用下拉框
  if (showMentionDropdown.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value + 1) % filteredArticles.value.length
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionIndex.value = (mentionIndex.value - 1 + filteredArticles.value.length) % filteredArticles.value.length
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const article = filteredArticles.value[mentionIndex.value]
      if (article) selectMention(article)
    } else if (e.key === 'Escape') {
      showMentionDropdown.value = false
    }
    return
  }

  // 发送：Ctrl+Enter 发送，Enter 换行，Shift+Enter 换行
  if (e.key === 'Enter' && e.ctrlKey && !e.shiftKey) {
    e.preventDefault()
    emit('send')
  }
}

// 输入处理
function handleInput(e: Event) {
  const value = (e.target as HTMLTextAreaElement).value
  const cursorPos = (e.target as HTMLTextAreaElement).selectionStart
  
  // 获取光标前的文本
  const beforeCursor = value.slice(0, cursorPos)
  
  // 检查是否触发了技能选择 (/)
  const skillMatch = beforeCursor.match(/\/(\w*)$/)
  if (skillMatch) {
    skillQuery.value = skillMatch[1]
    showSkillDropdown.value = true
    showMentionDropdown.value = false
    skillIndex.value = 0
    return
  }
  
  // 检查是否触发了文章引用 (@)
  const mentionMatch = beforeCursor.match(/@([^\s]*)$/)
  if (mentionMatch) {
    mentionQuery.value = mentionMatch[1]
    showMentionDropdown.value = true
    showSkillDropdown.value = false
    mentionIndex.value = 0
    return
  }
  
  // 关闭下拉框
  showSkillDropdown.value = false
  showMentionDropdown.value = false
}

// 选择技能
function selectSkill(skill: Skill) {
  emit('skillChange', skill)
  
  // 移除输入中的 /
  const value = text.value
  const cursorPos = textareaRef.value?.selectionStart || 0
  const beforeCursor = value.slice(0, cursorPos)
  const afterCursor = value.slice(cursorPos)
  
  const newBefore = beforeCursor.replace(/\/(\w*)$/, '')
  text.value = newBefore + afterCursor
  
  showSkillDropdown.value = false
  nextTick(() => textareaRef.value?.focus())
}

// 清除技能
function clearSkill() {
  emit('skillChange', null)
}

// 选择文章引用
function selectMention(article: Article) {
  mentions.value.push({
    title: article.title,
    path: article.path
  })
  emit('mentionsChange', mentions.value)
  
  // 移除输入中的 @
  const value = text.value
  const cursorPos = textareaRef.value?.selectionStart || 0
  const beforeCursor = value.slice(0, cursorPos)
  const afterCursor = value.slice(cursorPos)
  
  const newBefore = beforeCursor.replace(/@([^\s]*)$/, '')
  text.value = newBefore + afterCursor
  
  showMentionDropdown.value = false
  articleSearchQuery.value = ''
  nextTick(() => textareaRef.value?.focus())
}

// 移除引用
function removeMention(mention: Mention) {
  mentions.value = mentions.value.filter(m => m.path !== mention.path)
  emit('mentionsChange', mentions.value)
}

// 点击外部关闭下拉框
function handleDocumentMousedown(e: MouseEvent) {
  const target = e.target as Node
  if (containerRef.value && !containerRef.value.contains(target)) {
    showSkillDropdown.value = false
    showMentionDropdown.value = false
  }
}

// 暴露方法
defineExpose({
  focus() {
    textareaRef.value?.focus()
  },
  clearAll() {
    mentions.value = []
    emit('mentionsChange', [])
    emit('skillChange', null)
  },
  setSelectedSkill(skill: Skill) {
    emit('skillChange', skill)
  }
})
</script>

<style scoped>
.mention-input {
  position: relative;
  width: 100%;
}

.input-wrapper {
  position: relative;
}

.input-textarea {
  width: 100%;
  min-height: 60px;
  max-height: 200px;
  padding: 12px;
  border: none;
  background: transparent;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  outline: none;
}

.input-textarea::placeholder {
  color: #94a3b8;
}

/* 下拉框 */
.dropdown-menu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  width: 100%;
  max-height: 320px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.15);
  z-index: 1000;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f1f5f9;
  background: #f8fafc;
}

.dropdown-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.dropdown-hint {
  font-size: 11px;
  color: #94a3b8;
}

.dropdown-search {
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}

.search-input:focus {
  border-color: #3b82f6;
}

.dropdown-list {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.skill-list {
  max-height: 260px;
}

.mention-list {
  max-height: 260px;
}

.mention-list {
  max-height: 320px;
}

.section-header {
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.mention-item {
  padding: 10px 14px;
  border-bottom: 1px solid #f8fafc;
}

.mention-item:last-child {
  border-bottom: none;
}

.mention-icon {
  margin-top: 2px;
}

.mention-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.section-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  background: #eef2ff;
  color: #6366f1;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.dropdown-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.dropdown-item:hover,
.dropdown-item.active {
  background: #f1f5f9;
}

.item-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-desc {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-path {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
  font-family: monospace;
}

.dropdown-empty {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
}

/* 已选择的技能 */
.selected-skill {
  padding: 4px 12px;
}

.skill-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #dbeafe, #e0e7ff);
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
  color: #3b82f6;
}

.skill-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(255,255,255,0.5);
  border-radius: 50%;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: #64748b;
  transition: all 0.2s;
}

.skill-remove:hover {
  background: #ef4444;
  color: white;
}

/* 已引用的文章 */
.selected-mentions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 4px 12px 8px;
}

.mention-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  font-size: 11px;
  color: #16a34a;
}

.mention-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: none;
  background: transparent;
  border-radius: 50%;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  color: #86efac;
  transition: all 0.2s;
}

.mention-remove:hover {
  background: #16a34a;
  color: white;
}

/* 动画 */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
