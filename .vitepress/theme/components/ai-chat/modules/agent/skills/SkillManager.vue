<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="skill-manager-overlay" @click.self="close">
        <div class="skill-manager-modal">
          <!-- 头部 -->
          <div class="modal-header">
            <div class="header-title">
              <span class="title-icon">⚡</span>
              <h3>技能管理</h3>
            </div>
            <button class="close-btn" @click="close">✕</button>
          </div>
          
          <!-- 主体 -->
          <div class="modal-body">
            <!-- 工具栏 -->
            <div class="toolbar">
              <div class="search-box">
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索技能..."
                  class="search-input"
                />
              </div>
              <div class="toolbar-actions">
                <button class="btn-import" @click="showImport = true">
                  <span>📥</span>
                  <span>导入</span>
                </button>
                <button class="btn-create" @click="openCreate">
                  <span>+</span>
                  <span>新建</span>
                </button>
              </div>
            </div>
            
            <!-- 分类标签 -->
            <div class="category-tabs">
              <button
                v-for="cat in ['all', ...categories]"
                :key="cat"
                class="category-tab"
                :class="{ active: currentCategory === cat }"
                @click="currentCategory = cat"
              >
                {{ categoryNames[cat] || cat }}
              </button>
            </div>
            
            <!-- 技能列表 -->
            <div class="skills-list">
              <div v-if="isLoading" class="loading-state">
                <span class="loading-spinner"></span>
                <span>加载中...</span>
              </div>
              
              <template v-else>
                <!-- 内置技能 -->
                <div v-if="filteredBuiltinSkills.length > 0" class="skill-section">
                  <div class="section-label">内置技能</div>
                  <div
                    v-for="skill in filteredBuiltinSkills"
                    :key="skill.id"
                    class="skill-card builtin"
                  >
                    <div class="skill-icon">{{ skill.icon }}</div>
                    <div class="skill-info">
                      <div class="skill-name">{{ skill.name }}</div>
                      <div class="skill-desc">{{ skill.description }}</div>
                      <div class="skill-meta">
                        <span class="skill-tag">{{ skill.category }}</span>
                      </div>
                    </div>
                    <div class="skill-actions">
                      <button class="action-btn" @click="previewSkill(skill)" title="预览">
                        👁️
                      </button>
                      <button class="action-btn" @click="useSkill(skill)" title="使用">
                        ✓
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- 自定义技能 -->
                <div v-if="filteredCustomSkills.length > 0" class="skill-section">
                  <div class="section-label">自定义技能</div>
                  <div
                    v-for="skill in filteredCustomSkills"
                    :key="skill.id"
                    class="skill-card"
                    :class="{ 'is-editing': editingSkill?.id === skill.id }"
                  >
                    <div class="skill-icon">{{ skill.icon }}</div>
                    <div class="skill-info">
                      <div class="skill-name">{{ skill.name }}</div>
                      <div class="skill-desc">{{ skill.description }}</div>
                      <div class="skill-meta">
                        <span class="skill-tag">{{ skill.category }}</span>
                        <span v-if="skill.version" class="skill-version">v{{ skill.version }}</span>
                      </div>
                    </div>
                    <div class="skill-actions">
                      <button class="action-btn" @click="editSkill(skill)" title="编辑">
                        ✏️
                      </button>
                      <button class="action-btn" @click="exportSkillFile(skill)" title="导出">
                        📤
                      </button>
                      <button class="action-btn delete" @click="confirmDelete(skill)" title="删除">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
                
                <!-- 空状态 -->
                <div v-if="filteredSkills.length === 0" class="empty-state">
                  <span class="empty-icon">🔍</span>
                  <p>未找到匹配的技能</p>
                </div>
              </template>
            </div>
          </div>
        </div>
        
        <!-- 创建/编辑弹窗 -->
        <SkillEditor
          v-if="showEditor"
          :skill="editingSkill"
          @save="handleSave"
          @cancel="closeEditor"
        />
        
        <!-- 导入弹窗 -->
        <SkillImport
          v-if="showImport"
          @import="handleImport"
          @cancel="showImport = false"
        />
        
        <!-- 预览弹窗 -->
        <SkillPreview
          v-if="previewingSkill"
          :skill="previewingSkill"
          @close="previewingSkill = null"
          @use="useSkill($event)"
        />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSkills } from '../../../core/composables/useSkills'
import type { Skill, SkillCreateParams } from '../../../core/types/agent'
import SkillEditor from './SkillEditor.vue'
import SkillImport from './SkillImport.vue'
import SkillPreview from './SkillPreview.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  close: []
  use: [skill: Skill]
  selectSkill: [skill: Skill]
}>()

const {
  skills,
  categories,
  isLoading,
  builtinSkills,
  customSkills,
  initSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  importSkillFile,
  exportSkill
} = useSkills()

// 状态
const searchQuery = ref('')
const currentCategory = ref('all')
const showEditor = ref(false)
const showImport = ref(false)
const editingSkill = ref<Skill | null>(null)
const previewingSkill = ref<Skill | null>(null)

// 分类名称映射
const categoryNames: Record<string, string> = {
  all: '全部',
  content: '内容创作',
  analysis: '分析总结',
  language: '语言翻译',
  editing: '编辑润色',
  development: '开发编程',
  education: '教育解释',
  creativity: '创意思维',
  custom: '自定义'
}

// 过滤后的技能
const filteredBuiltinSkills = computed(() => {
  return builtinSkills.value.filter(skill => {
    const matchesSearch = !searchQuery.value || 
      skill.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesCategory = currentCategory.value === 'all' || 
      skill.category === currentCategory.value
    
    return matchesSearch && matchesCategory
  })
})

const filteredCustomSkills = computed(() => {
  return customSkills.value.filter(skill => {
    const matchesSearch = !searchQuery.value || 
      skill.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      skill.description.toLowerCase().includes(searchQuery.value.toLowerCase())
    
    const matchesCategory = currentCategory.value === 'all' || 
      skill.category === currentCategory.value
    
    return matchesSearch && matchesCategory
  })
})

const filteredSkills = computed(() => [
  ...filteredBuiltinSkills.value,
  ...filteredCustomSkills.value
])

// 方法
function close() {
  emit('update:visible', false)
  emit('close')
}

function openCreate() {
  editingSkill.value = null
  showEditor.value = true
}

function editSkill(skill: Skill) {
  editingSkill.value = skill
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
  editingSkill.value = null
}

async function handleSave(params: SkillCreateParams) {
  if (editingSkill.value) {
    await updateSkill(editingSkill.value.id, params as Partial<Skill>)
  } else {
    await createSkill(params)
  }
  closeEditor()
}

async function handleImport(file: File) {
  const skill = await importSkillFile(file)
  if (skill) {
    showImport.value = false
  }
}

function previewSkill(skill: Skill) {
  previewingSkill.value = skill
}

function useSkill(skill: Skill) {
  emit('use', skill)
  emit('selectSkill', skill)
  close()
}

function exportSkillFile(skill: Skill) {
  const content = exportSkill(skill)
  const blob = new Blob([content], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${skill.id}.md`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function confirmDelete(skill: Skill) {
  if (confirm(`确定要删除技能 "${skill.name}" 吗？`)) {
    await deleteSkill(skill.id)
  }
}

onMounted(() => {
  initSkills()
})
</script>

<style scoped>
.skill-manager-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.skill-manager-modal {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  font-size: 24px;
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 18px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 20px 24px;
}

/* 工具栏 */
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search-box {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 10px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  background: var(--vp-c-bg-soft);
  outline: none;
}

.search-input:focus {
  border-color: var(--vp-c-brand);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.btn-create,
.btn-import {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create {
  background: var(--vp-c-brand);
  color: white;
}

.btn-create:hover {
  background: var(--vp-c-brand-dark);
}

.btn-import {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-import:hover {
  background: var(--vp-c-bg-mute);
}

/* 分类标签 */
.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.category-tab {
  padding: 6px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  background: transparent;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.category-tab:hover {
  background: var(--vp-c-bg-soft);
}

.category-tab.active {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

/* 技能列表 */
.skills-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.skill-section {
  margin-bottom: 20px;
}

.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
  padding-left: 4px;
}

.skill-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  margin-bottom: 10px;
  transition: all 0.2s;
}

.skill-card:hover {
  border-color: var(--vp-c-brand);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.skill-card.builtin {
  background: var(--vp-c-bg-soft);
}

.skill-icon {
  font-size: 28px;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-mute);
  border-radius: 12px;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 4px;
}

.skill-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-meta {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.skill-tag {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 4px;
}

.skill-version {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.skill-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-bg-soft);
}

.action-btn.delete:hover {
  background: var(--vp-c-danger-soft);
}

/* 状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px;
  color: var(--vp-c-text-2);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--vp-c-text-2);
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .skill-manager-modal,
.modal-leave-to .skill-manager-modal {
  transform: scale(0.95);
}
</style>
