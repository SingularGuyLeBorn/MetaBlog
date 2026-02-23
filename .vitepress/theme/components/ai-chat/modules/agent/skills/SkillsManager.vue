<!--
  SkillsManager - 技能管理页面
  
  功能：
  - 查看所有技能列表
  - 查看技能原文（系统提示词）
  - 创建/编辑/删除自定义技能
  - 区分内置技能和自定义技能
-->
<template>
  <div class="skills-manager">
    <!-- 头部 -->
    <header class="manager-header">
      <div class="header-title">
        <h1>🎯 Skills 管理</h1>
        <p class="subtitle">管理 AI 助手的角色技能和系统提示词</p>
      </div>
      <div class="header-actions">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索技能..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        <select v-model="filterCategory" class="filter-select">
          <option value="">全部分类</option>
          <option value="general">通用</option>
          <option value="writing">写作</option>
          <option value="coding">编程</option>
          <option value="analysis">分析</option>
          <option value="creative">创意</option>
          <option value="custom">自定义</option>
        </select>
        <button class="btn-create" @click="openCreateDialog">
          <span>+</span>
          <span>新建 Skill</span>
        </button>
      </div>
    </header>

    <!-- 统计卡片 -->
    <section class="stats-section">
      <div class="stat-card">
        <span class="stat-icon">🎯</span>
        <div class="stat-info">
          <span class="stat-value">{{ filteredSkills.length }}</span>
          <span class="stat-label">总技能</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📦</span>
        <div class="stat-info">
          <span class="stat-value">{{ builtInSkills.length }}</span>
          <span class="stat-label">内置</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">✨</span>
        <div class="stat-info">
          <span class="stat-value">{{ customSkills.length }}</span>
          <span class="stat-label">自定义</span>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🔧</span>
        <div class="stat-info">
          <span class="stat-value">{{ enabledSkills.length }}</span>
          <span class="stat-label">已启用</span>
        </div>
      </div>
    </section>

    <!-- 技能列表 -->
    <section class="skills-list">
      <div v-if="filteredSkills.length === 0" class="empty-state">
        <span class="empty-icon">🎯</span>
        <h3>还没有技能</h3>
        <p>点击右上角按钮创建您的第一个 Skill</p>
      </div>

      <template v-else>
        <div
          v-for="skill in filteredSkills"
          :key="skill.id"
          class="skill-card"
          :class="{ builtin: skill.isBuiltIn, active: skill.enabled }"
        >
          <div class="skill-header">
            <div class="skill-icon">{{ skill.icon }}</div>
            <div class="skill-info">
              <div class="skill-name-row">
                <span class="skill-name">{{ skill.name }}</span>
                <span v-if="skill.isBuiltIn" class="badge builtin">内置</span>
                <span v-else class="badge custom">自定义</span>
              </div>
              <span class="skill-category">{{ categoryName(skill.category) }}</span>
            </div>
            <div class="skill-actions">
              <button class="action-btn" @click="viewSkill(skill)" title="查看原文">
                👁️
              </button>
              <button 
                v-if="!skill.isBuiltIn" 
                class="action-btn" 
                @click="editSkill(skill)"
                title="编辑"
              >
                ✏️
              </button>
              <button 
                v-if="!skill.isBuiltIn" 
                class="action-btn danger" 
                @click="confirmDelete(skill)"
                title="删除"
              >
                🗑️
              </button>
            </div>
          </div>

          <p class="skill-description">{{ skill.description }}</p>

          <div class="skill-footer">
            <div class="skill-tools">
              <span class="tools-label">可用工具:</span>
              <span v-for="tool in (skill.tools || []).slice(0, 3)" :key="tool" class="tool-tag">
                {{ tool }}
              </span>
              <span v-if="(skill.tools || []).length > 3" class="tool-more">
                +{{ (skill.tools || []).length - 3 }}
              </span>
            </div>
            <label class="toggle-switch">
              <input 
                type="checkbox" 
                :checked="skill.enabled"
                @change="toggleEnabled(skill)"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </template>
    </section>

    <!-- 查看/编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
        <div class="dialog-content">
          <div class="dialog-header">
            <h3>{{ isEditing ? '编辑 Skill' : (isViewing ? '查看 Skill' : '新建 Skill') }}</h3>
            <button class="btn-close" @click="closeDialog">✕</button>
          </div>

          <div class="dialog-body">
            <div class="form-group">
              <label>名称 *</label>
              <input v-model="form.name" type="text" class="form-input" :disabled="isViewing" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>图标</label>
                <div class="emoji-grid">
                  <button
                    v-for="emoji in emojiOptions"
                    :key="emoji"
                    class="emoji-btn"
                    :class="{ active: form.icon === emoji }"
                    :disabled="isViewing"
                    @click="form.icon = emoji"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>

              <div class="form-group">
                <label>分类</label>
                <select v-model="form.category" class="form-select" :disabled="isViewing">
                  <option value="general">通用</option>
                  <option value="writing">写作</option>
                  <option value="coding">编程</option>
                  <option value="analysis">分析</option>
                  <option value="creative">创意</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>描述</label>
              <textarea v-model="form.description" rows="2" class="form-textarea" :disabled="isViewing" />
            </div>

            <div class="form-group">
              <label>系统提示词 (System Prompt) *</label>
              <textarea 
                v-model="form.systemPrompt" 
                rows="12" 
                class="form-textarea code"
                :disabled="isViewing"
                placeholder="定义 AI 的角色、能力和行为方式..."
              />
            </div>

            <div class="form-group">
              <label>关联工具</label>
              <div class="tools-selector">
                <label
                  v-for="tool in availableTools"
                  :key="tool.name"
                  class="tool-checkbox"
                  :class="{ checked: form.tools.includes(tool.name) }"
                >
                  <input
                    type="checkbox"
                    :value="tool.name"
                    v-model="form.tools"
                    :disabled="isViewing"
                  />
                  <span class="tool-name">{{ tool.name }}</span>
                  <span class="tool-desc">{{ tool.description }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn-secondary" @click="closeDialog">取消</button>
            <button v-if="!isViewing" class="btn-primary" @click="saveSkill" :disabled="!isFormValid">
              {{ isEditing ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="showDeleteConfirm = false">
        <div class="dialog-content confirm">
          <div class="confirm-icon">⚠️</div>
          <h3>确认删除</h3>
          <p>确定要删除 Skill "{{ skillToDelete?.name }}" 吗？</p>
          <div class="dialog-footer">
            <button class="btn-secondary" @click="showDeleteConfirm = false">取消</button>
            <button class="btn-danger" @click="deleteSkill">删除</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { Skill, SkillCategory } from '../../../core/skills'
import {
  getAllSkills,
  createSkill,
  updateSkill,
  deleteSkill as deleteSkillApi
} from '../../../core/skills'
import { getToolDefinitions } from '../../../core/tools'

const searchQuery = ref('')
const filterCategory = ref('')
const skills = ref<Skill[]>(getAllSkills())
const showDialog = ref(false)
const showDeleteConfirm = ref(false)
const isEditing = ref(false)
const isViewing = ref(false)
const skillToDelete = ref<Skill | null>(null)

const form = reactive({
  id: '',
  name: '',
  icon: '🤖',
  description: '',
  category: 'custom' as SkillCategory,
  systemPrompt: '',
  tools: [] as string[]
})

const emojiOptions = ['🤖', '👩‍💻', '👨‍💻', '🎨', '✍️', '🔬', '📊', '💼', '🎭', '🔮', '👑', '⚡']

const availableTools = computed(() => {
  const defs = getToolDefinitions()
  return defs.map(d => ({
    name: d.function.name,
    description: d.function.description
  }))
})

const filteredSkills = computed(() => {
  let result = skills.value
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.description.toLowerCase().includes(query)
    )
  }
  
  if (filterCategory.value) {
    result = result.filter(s => s.category === filterCategory.value)
  }
  
  return result.sort((a, b) => {
    if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1
    return b.createdAt - a.createdAt
  })
})

const builtInSkills = computed(() => skills.value.filter(s => s.isBuiltIn))
const customSkills = computed(() => skills.value.filter(s => !s.isBuiltIn))
const enabledSkills = computed(() => skills.value.filter(s => s.enabled))

const isFormValid = computed(() => {
  return form.name.trim() && form.systemPrompt.trim()
})

function categoryName(cat: SkillCategory): string {
  const names: Record<string, string> = {
    general: '通用',
    writing: '写作',
    coding: '编程',
    analysis: '分析',
    creative: '创意',
    custom: '自定义'
  }
  return names[cat] || cat
}

function openCreateDialog() {
  isEditing.value = false
  isViewing.value = false
  form.id = ''
  form.name = ''
  form.icon = '🤖'
  form.description = ''
  form.category = 'custom'
  form.systemPrompt = ''
  form.tools = []
  showDialog.value = true
}

function viewSkill(skill: Skill) {
  isEditing.value = false
  isViewing.value = true
  form.id = skill.id
  form.name = skill.name
  form.icon = skill.icon
  form.description = skill.description
  form.category = skill.category
  form.systemPrompt = skill.systemPrompt
  form.tools = [...(skill.tools || [])]
  showDialog.value = true
}

function editSkill(skill: Skill) {
  isEditing.value = true
  isViewing.value = false
  form.id = skill.id
  form.name = skill.name
  form.icon = skill.icon
  form.description = skill.description
  form.category = skill.category
  form.systemPrompt = skill.systemPrompt
  form.tools = [...(skill.tools || [])]
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  isEditing.value = false
  isViewing.value = false
}

function saveSkill() {
  if (!form.name.trim() || !form.systemPrompt.trim()) return
  
  if (isEditing.value) {
    updateSkill(form.id, {
      name: form.name.trim(),
      icon: form.icon,
      description: form.description.trim(),
      category: form.category,
      systemPrompt: form.systemPrompt.trim(),
      tools: form.tools
    })
  } else {
    createSkill({
      name: form.name.trim(),
      icon: form.icon,
      description: form.description.trim(),
      category: form.category,
      systemPrompt: form.systemPrompt.trim(),
      tools: form.tools,
      enabled: true,
      tags: []
    })
  }
  
  skills.value = getAllSkills()
  closeDialog()
}

function confirmDelete(skill: Skill) {
  skillToDelete.value = skill
  showDeleteConfirm.value = true
}

function deleteSkill() {
  if (skillToDelete.value) {
    deleteSkillApi(skillToDelete.value.id)
    skills.value = getAllSkills()
    showDeleteConfirm.value = false
    skillToDelete.value = null
  }
}

function toggleEnabled(skill: Skill) {
  updateSkill(skill.id, { enabled: !skill.enabled })
  skills.value = getAllSkills()
}
</script>

<style scoped>
.skills-manager {
  padding: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 头部 */
.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.header-title h1 {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
}

.subtitle {
  margin: 0;
  color: #64748b;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
}

.search-input {
  width: 240px;
  padding: 10px 16px 10px 40px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
}

.filter-select {
  padding: 10px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: white;
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* 统计 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
}

.stat-icon {
  font-size: 28px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
}

.stat-label {
  font-size: 13px;
  color: #64748b;
}

/* 技能列表 */
.skills-list {
  display: grid;
  gap: 16px;
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  color: #94a3b8;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.skill-card {
  padding: 20px;
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.skill-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.skill-card.builtin {
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
}

.skill-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 12px;
}

.skill-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  border-radius: 12px;
}

.skill-info {
  flex: 1;
}

.skill-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.skill-name {
  font-size: 16px;
  font-weight: 600;
}

.badge {
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  font-weight: 500;
}

.badge.builtin {
  background: #dbeafe;
  color: #3b82f6;
}

.badge.custom {
  background: #dcfce7;
  color: #22c55e;
}

.skill-category {
  font-size: 13px;
  color: #64748b;
}

.skill-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f1f5f9;
}

.action-btn.danger:hover {
  background: #fee2e2;
}

.skill-description {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #475569;
  line-height: 1.5;
}

.skill-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.skill-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tools-label {
  font-size: 12px;
  color: #64748b;
}

.tool-tag {
  padding: 3px 8px;
  background: #f1f5f9;
  border-radius: 4px;
  font-size: 11px;
  color: #475569;
}

.tool-more {
  font-size: 11px;
  color: #94a3b8;
}

/* 弹窗 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.dialog-content {
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-content.confirm {
  max-width: 400px;
  padding: 40px;
  text-align: center;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
}

.btn-close:hover {
  background: #f1f5f9;
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

/* 表单 */
.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.form-textarea.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  min-height: 200px;
}

.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 2px solid transparent;
  border-radius: 8px;
  background: #f8fafc;
  cursor: pointer;
}

.emoji-btn.active {
  border-color: #3b82f6;
  background: #dbeafe;
}

/* 工具选择器 */
.tools-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: #f8fafc;
  border-radius: 8px;
}

.tool-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-checkbox:hover {
  background: white;
}

.tool-checkbox.checked {
  background: #dbeafe;
}

.tool-checkbox input {
  width: 16px;
  height: 16px;
}

.tool-name {
  font-size: 13px;
  font-weight: 500;
}

.tool-desc {
  font-size: 11px;
  color: #64748b;
  margin-left: auto;
}

/* 按钮 */
.btn-secondary,
.btn-primary,
.btn-danger {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-secondary {
  background: #f1f5f9;
  color: #475569;
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #ef4444;
  color: white;
}

/* 确认对话框 */
.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #3b82f6;
}

input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* 响应式 */
@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .manager-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>
