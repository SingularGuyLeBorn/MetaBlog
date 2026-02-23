<!--
  SkillsManager - 技能管理面板（3D 玻璃风格）
  
  设计参考 AgentCard：
  - 3D 透视倾斜
  - 鼠标跟随光影
  - 悬浮深度感
  - 全息边框
-->
<template>
  <div class="skills-manager">
    <!-- 头部工具栏 -->
    <div class="toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input v-model="searchQuery" type="text" placeholder="搜索技能名称..." />
      </div>
      <div class="filter-group">
        <select v-model="filterCategory">
          <option value="">全部分类</option>
          <option value="general">通用</option>
          <option value="writing">写作</option>
          <option value="coding">编程</option>
          <option value="analysis">分析</option>
          <option value="creative">创意</option>
          <option value="custom">自定义</option>
        </select>
        <button class="btn-primary" @click="openCreateDialog">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          新建技能
        </button>
      </div>
    </div>

    <!-- 技能列表 - 3D 卡片网格 -->
    <div class="skills-grid">
      <div
        v-for="skill in filteredSkills"
        :key="skill.id"
        class="skill-card-3d"
        :class="{ builtin: skill.isBuiltIn }"
        @click="viewSkill(skill)"
        @mousemove="handleMouseMove($event, skill.id)"
        @mouseleave="handleMouseLeave(skill.id)"
      >
        <div 
          class="card-inner"
          :style="getCardStyle(skill.id)"
        >
          <!-- 全息边框 -->
          <div class="holo-border"></div>
          
          <!-- 动态光斑 -->
          <div class="light-spot" :style="getLightStyle(skill.id)"></div>
          
          <!-- 状态条 -->
          <div class="status-bar" :class="skill.category"></div>
          
          <!-- 头部 -->
          <div class="card-header">
            <div class="avatar-wrap">
              <div class="avatar-ring" :style="getRingStyle(skill.category)"></div>
              <span class="avatar">{{ skill.icon }}</span>
            </div>
            
            <div class="header-info">
              <h4 class="skill-name">{{ skill.name }}</h4>
              <span class="category-tag" :class="skill.category">
                {{ categoryLabel(skill.category) }}
              </span>
            </div>
            
            <div class="skill-badges">
              <span v-if="skill.isBuiltIn" class="badge builtin">内置</span>
              <span v-else class="badge custom">自定义</span>
            </div>
          </div>
          
          <!-- 描述 -->
          <p class="skill-desc">{{ skill.description }}</p>
          
          <!-- 工具预览 -->
          <div class="tools-wrap">
            <div class="tools-header">
              <span class="tools-label">包含工具</span>
              <span class="tools-count">{{ skill.tools.length }} 个</span>
            </div>
            <div class="tools-list">
              <span 
                v-for="tool in getToolDetails(skill.tools).slice(0, 3)" 
                :key="tool.name"
                class="tool-pill"
              >
                {{ tool.icon || '🔧' }} {{ tool.name }}
              </span>
              <span v-if="skill.tools.length > 3" class="tool-more">
                +{{ skill.tools.length - 3 }}
              </span>
            </div>
          </div>
          
          <!-- 操作提示 -->
          <div class="action-bar">
            <span class="click-hint">点击查看详情</span>
            
            <div class="btn-group" v-if="!skill.isBuiltIn">
              <button class="btn-delete" @click.stop="confirmDelete(skill)" title="删除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
            
            <div class="btn-group" v-else>
              <span class="builtin-hint">内置技能</span>
            </div>
          </div>
        </div>
        
        <!-- 3D 阴影层 -->
        <div class="shadow-layer" :style="getShadowStyle(skill.id)"></div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredSkills.length === 0" class="empty-state">
        <div class="empty-icon">🎯</div>
        <h4>没有找到技能</h4>
        <p>尝试调整搜索条件或创建新技能</p>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <Teleport to="body">
      <div v-if="showEditor" class="modal-overlay" @click.self="closeEditor">
        <div class="editor-modal">
          <div class="modal-header">
            <h3>{{ isEditing ? '编辑技能' : '新建技能' }}</h3>
            <button class="btn-close" @click="closeEditor">✕</button>
          </div>
          <div class="modal-body">
            <div class="form-row">
              <div class="form-group">
                <label>名称 *</label>
                <input v-model="editorForm.name" type="text" placeholder="如：代码工匠" />
              </div>
              <div class="form-group">
                <label>图标</label>
                <div class="emoji-picker">
                  <button
                    v-for="emoji in emojiOptions"
                    :key="emoji"
                    class="emoji-btn"
                    :class="{ active: editorForm.icon === emoji }"
                    @click="editorForm.icon = emoji"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label>分类</label>
              <select v-model="editorForm.category">
                <option value="general">通用</option>
                <option value="writing">写作</option>
                <option value="coding">编程</option>
                <option value="analysis">分析</option>
                <option value="creative">创意</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            <div class="form-group">
              <label>描述 *</label>
              <textarea v-model="editorForm.description" rows="2" placeholder="一句话描述这个技能的能力..." />
            </div>

            <div class="form-group">
              <label>系统提示词 *</label>
              <textarea 
                v-model="editorForm.systemPrompt" 
                rows="8" 
                placeholder="定义 AI 在这个技能下的角色、能力和行为方式..."
                class="code-input"
              />
            </div>

            <div class="form-group">
              <label>关联工具</label>
              <div class="tools-selector">
                <label
                  v-for="tool in allTools"
                  :key="tool.name"
                  class="tool-checkbox"
                  :class="{ checked: editorForm.tools.includes(tool.name) }"
                >
                  <input
                    type="checkbox"
                    :value="tool.name"
                    v-model="editorForm.tools"
                  />
                  <span class="tool-icon">{{ tool.icon || '🔧' }}</span>
                  <div class="tool-info">
                    <span class="tool-name">{{ tool.name }}</span>
                    <span class="tool-desc">{{ tool.description }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" @click="closeEditor">取消</button>
            <button class="btn-primary" @click="saveSkill" :disabled="!isFormValid">
              {{ isEditing ? '保存修改' : '创建技能' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 删除确认 -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
        <div class="confirm-modal">
          <div class="confirm-icon">⚠️</div>
          <h4>确认删除技能</h4>
          <p class="confirm-target">{{ skillToDelete?.name }}</p>
          <p class="confirm-hint">此操作不可撤销，已配置该技能的 Agent 将不再可用此能力</p>
          <div class="confirm-actions">
            <button class="btn-secondary" @click="showDeleteConfirm = false">取消</button>
            <button class="btn-danger" @click="executeDelete">确认删除</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 详情弹窗（内联编辑） -->
    <SkillDetailModal
      :visible="!!viewingSkill"
      :skill="viewingSkill"
      :all-tools="allTools"
      @close="viewingSkill = null"
      @saved="handleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useAgentConfig } from '../../../core/composables/useAgentConfig'
import type { Skill, Tool } from '../../../core/types/agent'
import SkillDetailModal from './SkillDetailModal.vue'

const { 
  skills, 
  builtInSkills,
  customSkills,
  allTools, 
  init, 
  createSkill, 
  updateSkill, 
  deleteSkill
} = useAgentConfig()

// 搜索和筛选
const searchQuery = ref('')
const filterCategory = ref('')

// 弹窗状态
const showEditor = ref(false)
const showDeleteConfirm = ref(false)
const isEditing = ref(false)
const editingSkillId = ref<string | null>(null)
const skillToDelete = ref<Skill | null>(null)
const viewingSkill = ref<Skill | null>(null)

// 编辑器表单
const editorForm = ref({
  name: '',
  icon: '🤖',
  category: 'custom' as Skill['category'],
  description: '',
  systemPrompt: '',
  tools: [] as string[]
})

const emojiOptions = ['🤖', '⚙️', '🔧', '💡', '🎯', '📦', '🔮', '⚡', '🧩', '🔗', '🧬', '🧠']

// 3D 卡片状态
const cardStates = reactive<Record<string, {
  rotateX: number
  rotateY: number
  lightX: number
  lightY: number
}>>({})

// 分类颜色配置
const categoryColors: Record<string, string> = {
  general: '#64748b',
  writing: '#d97706',
  coding: '#2563eb',
  analysis: '#059669',
  creative: '#db2777',
  custom: '#6b7280'
}

// 过滤后的技能
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
  
  // 排序：内置在前，然后按名称
  return result.sort((a, b) => {
    if (a.isBuiltIn !== b.isBuiltIn) return a.isBuiltIn ? -1 : 1
    return a.name.localeCompare(b.name)
  })
})

// 表单验证
const isFormValid = computed(() => {
  return editorForm.value.name.trim() && 
         editorForm.value.description.trim() &&
         editorForm.value.systemPrompt.trim()
})

// 获取工具详情
function getToolDetails(toolNames: string[]): Tool[] {
  return toolNames
    .map(name => allTools.value.find(t => t.name === name))
    .filter(Boolean) as Tool[]
}

// 分类标签
function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    general: '通用',
    writing: '写作',
    coding: '编程',
    analysis: '分析',
    creative: '创意',
    custom: '自定义'
  }
  return labels[category] || category
}

// 3D 卡片交互
function handleMouseMove(e: MouseEvent, skillId: string) {
  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  
  cardStates[skillId] = {
    rotateY: ((x - centerX) / centerX) * 8,
    rotateX: -((y - centerY) / centerY) * 8,
    lightX: (x / rect.width) * 100,
    lightY: (y / rect.height) * 100
  }
}

function handleMouseLeave(skillId: string) {
  cardStates[skillId] = {
    rotateX: 0,
    rotateY: 0,
    lightX: 50,
    lightY: 50
  }
}

function getCardStyle(skillId: string) {
  const state = cardStates[skillId]
  if (!state) return {}
  return {
    transform: `perspective(1000px) rotateX(${state.rotateX}deg) rotateY(${state.rotateY}deg) scale3d(1, 1, 1)`,
    transition: state.rotateX === 0 ? 'transform 0.5s ease' : 'transform 0.1s ease-out'
  }
}

function getLightStyle(skillId: string) {
  const state = cardStates[skillId]
  if (!state) return {}
  return {
    background: `radial-gradient(circle at ${state.lightX}% ${state.lightY}%, rgba(255,255,255,0.4) 0%, transparent 50%)`
  }
}

function getShadowStyle(skillId: string) {
  const state = cardStates[skillId]
  if (!state) return {}
  return {
    transform: `translate(${state.rotateY * 0.5}px, ${-state.rotateX * 0.5}px)`,
    opacity: Math.abs(state.rotateX) + Math.abs(state.rotateY) > 0 ? 0.6 : 0.4
  }
}

function getRingStyle(category: string) {
  const color = categoryColors[category] || '#64748b'
  return {
    boxShadow: `0 0 20px ${color}60, inset 0 0 10px ${color}30`
  }
}

// 方法
function openCreateDialog() {
  isEditing.value = false
  editingSkillId.value = null
  editorForm.value = {
    name: '',
    icon: '🔧',
    category: 'custom',
    description: '',
    systemPrompt: '',
    tools: []
  }
  showEditor.value = true
}

async function handleSaved() {
  // 重新加载技能列表
  await init()
  viewingSkill.value = null
}

function closeEditor() {
  showEditor.value = false
}

function saveSkill() {
  if (!isFormValid.value) return
  
  const skillData = {
    name: editorForm.value.name.trim(),
    icon: editorForm.value.icon,
    category: editorForm.value.category,
    description: editorForm.value.description.trim(),
    systemPrompt: editorForm.value.systemPrompt.trim(),
    tools: editorForm.value.tools,
    enabled: true,
    tags: [],
    version: '1.0.0'
  }
  
  if (isEditing.value && editingSkillId.value) {
    updateSkill(editingSkillId.value, skillData)
  } else {
    createSkill(skillData)
  }
  
  closeEditor()
}

function viewSkill(skill: Skill) {
  viewingSkill.value = skill
}

function editSkill(skill: Skill) {
  isEditing.value = true
  editingSkillId.value = skill.id
  editorForm.value = {
    name: skill.name,
    icon: skill.icon,
    category: skill.category,
    description: skill.description,
    systemPrompt: skill.systemPrompt,
    tools: [...skill.tools]
  }
  showEditor.value = true
}

function confirmDelete(skill: Skill) {
  skillToDelete.value = skill
  showDeleteConfirm.value = true
}

function executeDelete() {
  if (skillToDelete.value) {
    deleteSkill(skillToDelete.value.id)
    showDeleteConfirm.value = false
    skillToDelete.value = null
  }
}
</script>

<style scoped>
.skills-manager {
  padding: 24px;
  height: 100%;
  overflow-y: auto;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 360px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--vp-c-text-3);
}

.search-box input {
  width: 100%;
  padding: 12px 16px 12px 42px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
}

.search-box input:focus {
  outline: none;
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.filter-group select {
  padding: 12px 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--vp-c-brand);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--vp-c-brand-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

/* 技能网格 - 3D 卡片 */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

.skill-card-3d {
  position: relative;
  perspective: 1000px;
  transform-style: preserve-3d;
  cursor: pointer;
}

.card-inner {
  position: relative;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%);
  border-radius: 20px;
  padding: 24px;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 1px 2px rgba(0, 0, 0, 0.02),
    0 4px 8px rgba(0, 0, 0, 0.02),
    0 8px 16px rgba(0, 0, 0, 0.02),
    0 16px 32px rgba(0, 0, 0, 0.03);
}

/* 全息边框 */
.holo-border {
  position: absolute;
  inset: -1px;
  border-radius: 21px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.4) 0%,
    rgba(139, 92, 246, 0.3) 25%,
    rgba(236, 72, 153, 0.2) 50%,
    rgba(139, 92, 246, 0.3) 75%,
    rgba(59, 130, 246, 0.4) 100%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: -1;
}

.skill-card-3d:hover .holo-border {
  opacity: 1;
  animation: holo-rotate 3s linear infinite;
}

@keyframes holo-rotate {
  0% { filter: hue-rotate(0deg); }
  100% { filter: hue-rotate(360deg); }
}

/* 动态光斑 */
.light-spot {
  position: absolute;
  inset: 0;
  border-radius: 20px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.skill-card-3d:hover .light-spot {
  opacity: 1;
}

/* 3D 阴影层 */
.shadow-layer {
  position: absolute;
  inset: 10px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 20px;
  filter: blur(30px);
  opacity: 0.3;
  transform: translateZ(-50px);
  transition: all 0.3s ease;
  z-index: -1;
}

/* 状态条 */
.status-bar {
  position: absolute;
  top: 0;
  left: 20px;
  right: 20px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  transform: translateZ(10px);
}

.status-bar.general { background: linear-gradient(90deg, #64748b, #94a3b8); }
.status-bar.writing { background: linear-gradient(90deg, #d97706, #fbbf24); }
.status-bar.coding { background: linear-gradient(90deg, #2563eb, #60a5fa); }
.status-bar.analysis { background: linear-gradient(90deg, #059669, #34d399); }
.status-bar.creative { background: linear-gradient(90deg, #db2777, #f472b6); }
.status-bar.custom { background: linear-gradient(90deg, #6b7280, #9ca3af); }

/* 头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
  transform: translateZ(20px);
}

/* 头像 */
.avatar-wrap {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
}

.avatar-ring {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  background: linear-gradient(145deg, #f0f9ff, #e0f2fe);
  transform: translateZ(-5px);
  transition: transform 0.3s ease;
}

.skill-card-3d:hover .avatar-ring {
  transform: translateZ(-8px) scale(1.05);
}

.avatar {
  font-size: 28px;
  transform: translateZ(10px);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

/* 标题信息 */
.header-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  margin: 0 0 4px 0;
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transform: translateZ(15px);
}

.category-tag {
  display: inline-block;
  padding: 3px 10px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 20px;
  border: 1px solid;
  transform: translateZ(12px);
}

.category-tag.general { background: #f1f5f9; color: #64748b; border-color: #cbd5e1; }
.category-tag.writing { background: #fef3c7; color: #d97706; border-color: #fcd34d; }
.category-tag.coding { background: #dbeafe; color: #2563eb; border-color: #93c5fd; }
.category-tag.analysis { background: #d1fae5; color: #059669; border-color: #6ee7b7; }
.category-tag.creative { background: #fce7f3; color: #db2777; border-color: #f9a8d4; }
.category-tag.custom { background: #f3f4f6; color: #6b7280; border-color: #d1d5db; }

/* 徽章 */
.skill-badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
  transform: translateZ(15px);
}

.badge.builtin {
  background: #dbeafe;
  color: #2563eb;
}

.badge.custom {
  background: #dcfce7;
  color: #16a34a;
}

/* 描述 */
.skill-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transform: translateZ(10px);
}

/* 工具 */
.tools-wrap {
  margin-bottom: 16px;
  padding: 14px;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  transform: translateZ(15px);
}

.tools-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.tools-label {
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tools-count {
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  background: #dbeafe;
  padding: 2px 8px;
  border-radius: 10px;
}

.tools-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-pill {
  padding: 6px 12px;
  font-size: 12px;
  color: #475569;
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  border-radius: 20px;
  border: 1px solid #cbd5e1;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.tool-more {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #3b82f6;
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  border-radius: 20px;
  border: 1px solid #93c5fd;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  transform: translateZ(25px);
}

.click-hint {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

.btn-view {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-view:hover {
  transform: translateZ(5px);
  color: #3b82f6;
  border-color: #93c5fd;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.btn-view svg {
  width: 16px;
  height: 16px;
}

.btn-group {
  display: flex;
  gap: 8px;
}

.btn-edit, .btn-delete {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-edit {
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  color: #2563eb;
}

.btn-edit:hover {
  transform: translateZ(5px) scale(1.1);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.btn-delete {
  background: linear-gradient(145deg, #fee2e2, #fecaca);
  color: #dc2626;
}

.btn-delete:hover {
  transform: translateZ(5px) scale(1.1);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
}

.btn-edit svg, .btn-delete svg {
  width: 18px;
  height: 18px;
}

.builtin-hint {
  font-size: 12px;
  color: #94a3b8;
  font-style: italic;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 56px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: var(--vp-c-text-1);
}

.empty-state p {
  margin: 0;
  color: var(--vp-c-text-3);
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
}

.editor-modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background: var(--vp-c-bg);
  border-radius: 16px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  border: none;
  border-radius: 10px;
  font-size: 20px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 200px;
  gap: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.code-input {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px !important;
  line-height: 1.6;
}

.emoji-picker {
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
  background: var(--vp-c-bg-soft);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-btn:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
}

.emoji-btn.active {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.tools-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  border-radius: 8px;
}

.tool-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--vp-c-bg);
  border: 1px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-checkbox:hover {
  border-color: var(--vp-c-divider);
}

.tool-checkbox.checked {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

.tool-checkbox input {
  width: 16px;
  height: 16px;
}

.tool-icon {
  font-size: 14px;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
}

.tool-desc {
  display: block;
  font-size: 11px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

.btn-secondary {
  padding: 10px 20px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--vp-c-bg-soft);
}

.btn-danger {
  padding: 10px 20px;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-danger:hover {
  background: #dc2626;
}

/* 确认弹窗 */
.confirm-modal {
  width: 100%;
  max-width: 400px;
  background: var(--vp-c-bg);
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 32px 64px -16px rgba(0, 0, 0, 0.3);
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.confirm-modal h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.confirm-target {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #dc2626;
}

.confirm-hint {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--vp-c-text-3);
}

.confirm-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
