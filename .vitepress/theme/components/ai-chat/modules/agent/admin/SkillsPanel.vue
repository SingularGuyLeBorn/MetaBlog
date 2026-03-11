<template>
  <div class="skills-panel-3d">
    <!-- 头部 -->
    <div class="panel-header-3d">
      <div class="header-title-3d">
        <span class="header-icon-3d">🎯</span>
        <div>
          <h2 class="title-text-3d">Skills 管理</h2>
          <p class="title-desc-3d">管理所有可用的 Skills</p>
        </div>
      </div>
      <button 
        class="create-btn-3d"
        @mouseenter="hoveredCreate = true"
        @mouseleave="hoveredCreate = false"
        :style="createBtnStyle"
        @click="showCreate = true"
      >
        <span class="btn-icon">+</span>
        <span>新建 Skill</span>
      </button>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar-3d">
      <div class="search-input-wrapper-3d">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索 Skills..."
          class="search-input-3d"
        />
      </div>
      <div class="filter-chips-3d">
        <button
          v-for="cat in categories"
          :key="cat.id"
          class="filter-chip-3d"
          :class="{ active: selectedCategory === cat.id }"
          @click="selectedCategory = cat.id"
        >
          {{ cat.name }}
        </button>
      </div>
    </div>

    <!-- Skills 列表 -->
    <div class="skills-grid-3d">
      <div
        v-for="(skill, idx) in filteredSkills"
        :key="skill.id"
        class="skill-card-3d"
        :style="getCardStyle(idx, skill.id)"
        @mouseenter="hoveredSkill = skill.id"
        @mouseleave="hoveredSkill = null"
      >
        <!-- 卡片头部 -->
        <div class="skill-card-header-3d">
          <div class="skill-icon-wrap-3d" :style="{ background: getIconBg(idx) }">
            <span class="skill-icon-3d">{{ skill.icon }}</span>
          </div>
          <div class="skill-actions-3d">
            <button 
              class="action-btn-3d"
              @click.stop="editSkill(skill)"
              title="编辑"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button 
              class="action-btn-3d danger"
              @click.stop="deleteSkill(skill)"
              title="删除"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- 卡片内容 -->
        <div class="skill-card-body-3d">
          <h3 class="skill-name-3d">{{ skill.name }}</h3>
          <p class="skill-desc-3d">{{ skill.description }}</p>
          
          <div class="skill-meta-3d">
            <span class="meta-badge-3d">
              <span class="meta-icon">🔧</span>
              {{ skill.tools?.length || 0 }} 工具
            </span>
            <span class="meta-badge-3d category">
              {{ skill.category || '通用' }}
            </span>
          </div>
        </div>

        <!-- 卡片底部 -->
        <div class="skill-card-footer-3d">
          <button class="view-btn-3d" @click="viewSkill(skill)">
            查看详情
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredSkills.length === 0" class="empty-state-3d">
        <div class="empty-icon-3d">🔍</div>
        <p>没有找到匹配的 Skills</p>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal-3d">
        <div v-if="showCreate || editingSkill" class="modal-overlay-3d" @click.self="closeModal">
          <div 
            class="skill-modal-3d"
            :style="modalStyle"
            @mousemove="handleMouseMove"
            @mouseleave="handleMouseLeave"
          >
            <div class="modal-header-3d">
              <h3>{{ editingSkill ? '编辑 Skill' : '新建 Skill' }}</h3>
              <button class="close-btn-3d" @click="closeModal">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="modal-body-3d">
              <div class="form-group-3d">
                <label>名称</label>
                <input v-model="form.name" type="text" class="form-input-3d" placeholder="Skill 名称" />
              </div>

              <div class="form-row-3d">
                <div class="form-group-3d">
                  <label>图标</label>
                  <input v-model="form.icon" type="text" class="form-input-3d" placeholder="🎯" />
                </div>
                <div class="form-group-3d">
                  <label>分类</label>
                  <select v-model="form.category" class="form-select-3d">
                    <option value="general">通用</option>
                    <option value="writing">写作</option>
                    <option value="coding">编程</option>
                    <option value="analysis">分析</option>
                    <option value="creative">创意</option>
                    <option value="custom">自定义</option>
                  </select>
                </div>
              </div>

              <div class="form-group-3d">
                <label>描述</label>
                <textarea v-model="form.description" class="form-textarea-3d" rows="2" placeholder="简短描述这个 Skill 的功能" />
              </div>

              <div class="form-group-3d">
                <label>内容 (SKILL.md)</label>
                <textarea v-model="form.content" class="form-textarea-3d code" rows="8" placeholder="# Skill 名称\n\n## 描述\n..." />
              </div>

              <div class="form-group-3d">
                <label>工具 (逗号分隔)</label>
                <input v-model="toolsInput" type="text" class="form-input-3d" placeholder="tool1, tool2, tool3" />
              </div>
            </div>

            <div class="modal-footer-3d">
              <button class="btn-3d btn-cancel" @click="closeModal">取消</button>
              <button class="btn-3d btn-save" @click="saveSkill">
                {{ editingSkill ? '保存' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 详情弹窗 -->
    <SkillDetailModal v-if="viewingSkill" :skill="viewingSkill" @close="viewingSkill = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentConfig } from '../../../core/composables'
import type { Skill, SkillCategory } from '../../../core/types'
import SkillDetailModal from './SkillDetailModal.vue'

const { skills, createSkill, updateSkill: updateSkillApi, deleteSkill: deleteSkillApi } = useAgentConfig()

const searchQuery = ref('')
const selectedCategory = ref('all')
const hoveredSkill = ref<string | null>(null)
const hoveredCreate = ref(false)
const showCreate = ref(false)
const editingSkill = ref<Skill | null>(null)
const viewingSkill = ref<Skill | null>(null)

const categories = [
  { id: 'all', name: '全部' },
  { id: 'general', name: '通用' },
  { id: 'writing', name: '写作' },
  { id: 'coding', name: '编程' },
  { id: 'analysis', name: '分析' },
  { id: 'creative', name: '创意' },
  { id: 'custom', name: '自定义' }
]

const filteredSkills = computed(() => {
  let result = skills.value
  if (selectedCategory.value !== 'all') {
    result = result.filter(s => s.category === selectedCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(s => 
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q)
    )
  }
  return result
})

const form = ref({
  name: '',
  icon: '🎯',
  category: 'general' as SkillCategory,
  description: '',
  content: '',
  tools: [] as string[]
})
const toolsInput = ref('')

const iconBgs = [
  'linear-gradient(135deg, #ede9fe, #ddd6fe)',
  'linear-gradient(135deg, #dbeafe, #bfdbfe)',
  'linear-gradient(135deg, #dcfce7, #bbf7d0)',
  'linear-gradient(135deg, #fef3c7, #fde68a)',
  'linear-gradient(135deg, #ffe4e6, #fecdd3)',
  'linear-gradient(135deg, #e0e7ff, #c7d2fe)'
]

function getIconBg(idx: number) {
  return iconBgs[idx % iconBgs.length]
}

function getCardStyle(idx: number, skillId: string) {
  const isHovered = hoveredSkill.value === skillId
  const delay = idx * 0.06
  
  return {
    transform: isHovered ? 'translateZ(40px) translateY(-8px) scale(1.02)' : 'translateZ(0)',
    transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
    animationDelay: `${delay}s`
  }
}

const createBtnStyle = computed(() => ({
  transform: hoveredCreate.value ? 'translateZ(25px) scale(1.05)' : 'translateZ(0)',
  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
}))

// Modal 3D
const mouseX = ref(0)
const mouseY = ref(0)
const isHovering = ref(false)

const modalStyle = computed(() => ({
  transform: isHovering.value
    ? `perspective(1500px) rotateX(${-mouseY.value * 3}deg) rotateY(${mouseX.value * 3}deg) translateZ(30px)`
    : 'perspective(1500px) rotateX(0) rotateY(0) translateZ(0)',
  transition: 'transform 0.3s ease-out'
}))

function handleMouseMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  mouseX.value = ((e.clientX - rect.left) / rect.width - 0.5) * 2
  mouseY.value = ((e.clientY - rect.top) / rect.height - 0.5) * 2
  isHovering.value = true
}

function handleMouseLeave() {
  isHovering.value = false
  mouseX.value = 0
  mouseY.value = 0
}

function closeModal() {
  showCreate.value = false
  editingSkill.value = null
  resetForm()
}

function resetForm() {
  form.value = { name: '', icon: '🎯', category: 'general' as SkillCategory, description: '', content: '', tools: [] }
  toolsInput.value = ''
}

function editSkill(skill: Skill) {
  editingSkill.value = skill
  form.value = {
    name: skill.name,
    icon: skill.icon,
    category: skill.category || 'general',
    description: skill.description,
    content: skill.content || '',
    tools: [...(skill.tools || [])]
  }
  toolsInput.value = skill.tools?.join(', ') || ''
}

function viewSkill(skill: Skill) {
  viewingSkill.value = skill
}

async function saveSkill() {
  const data = {
    ...form.value,
    tools: toolsInput.value.split(',').map(t => t.trim()).filter(Boolean),
    description: form.value.description || '',
    content: form.value.content || ''
  }

  if (editingSkill.value) {
    await updateSkillApi(editingSkill.value.id, data)
  } else {
    await createSkill(data as Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>)
  }
  closeModal()
}

async function deleteSkill(skill: Skill) {
  if (confirm(`确定要删除 "${skill.name}" 吗？`)) {
    await deleteSkillApi(skill.id)
  }
}
</script>

<style scoped>
.skills-panel-3d {
  padding: 24px;
  perspective: 2000px;
  transform-style: preserve-3d;
}

/* Header */
.panel-header-3d {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  transform-style: preserve-3d;
}

.header-title-3d {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon-3d {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  border-radius: 16px;
  box-shadow: 
    0 8px 20px rgba(139,92,246,0.2),
    inset 0 2px 4px rgba(255,255,255,0.5);
  transform: translateZ(20px);
}

.title-text-3d {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
}

.title-desc-3d {
  margin: 4px 0 0;
  font-size: 14px;
  color: #64748b;
}

.create-btn-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transform-style: preserve-3d;
  box-shadow: 0 8px 20px rgba(139,92,246,0.3);
}

.create-btn-3d:hover {
  box-shadow: 0 15px 35px rgba(139,92,246,0.4);
}

.create-btn-3d:active {
  transform: translateZ(5px) scale(0.95) !important;
}

.btn-icon {
  font-size: 20px;
  font-weight: 300;
}

/* Search */
.search-bar-3d {
  margin-bottom: 24px;
}

.search-input-wrapper-3d {
  position: relative;
  margin-bottom: 16px;
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 18px;
}

.search-input-3d {
  width: 100%;
  padding: 14px 16px 14px 48px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  font-size: 15px;
  color: #1e293b;
  transition: all 0.2s ease;
}

.search-input-3d:hover {
  border-color: #cbd5e1;
}

.search-input-3d:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px #ede9fe;
}

.filter-chips-3d {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-chip-3d {
  padding: 8px 16px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: all 0.2s ease;
}

.filter-chip-3d:hover {
  border-color: #8b5cf6;
  color: #7c3aed;
  transform: translateZ(10px);
}

.filter-chip-3d.active {
  background: #8b5cf6;
  border-color: #8b5cf6;
  color: white;
  transform: translateZ(15px);
  box-shadow: 0 8px 20px rgba(139,92,246,0.3);
}

/* Grid */
.skills-grid-3d {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.skill-card-3d {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  overflow: hidden;
  transform-style: preserve-3d;
  box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  animation: cardEnter 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes cardEnter {
  from {
    opacity: 0;
    transform: translateY(30px) translateZ(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0) translateZ(0);
  }
}

.skill-card-3d:hover {
  border-color: #8b5cf6;
  box-shadow: 0 20px 40px rgba(139,92,246,0.15);
}

.skill-card-header-3d {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px;
}

.skill-icon-wrap-3d {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  transform: translateZ(20px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.1);
}

.skill-icon-3d {
  font-size: 26px;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
}

.skill-actions-3d {
  display: flex;
  gap: 8px;
}

.action-btn-3d {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: all 0.2s ease;
}

.action-btn-3d:hover {
  background: #ede9fe;
  border-color: #8b5cf6;
  color: #7c3aed;
  transform: translateZ(15px);
}

.action-btn-3d.danger:hover {
  background: #fee2e2;
  border-color: #ef4444;
  color: #dc2626;
}

.action-btn-3d svg {
  width: 16px;
  height: 16px;
}

.skill-card-body-3d {
  padding: 0 20px 16px;
}

.skill-name-3d {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.skill-desc-3d {
  margin: 0 0 16px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-meta-3d {
  display: flex;
  gap: 8px;
}

.meta-badge-3d {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: #f1f5f9;
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
}

.meta-badge-3d.category {
  background: #ede9fe;
  color: #7c3aed;
}

.meta-icon {
  font-size: 12px;
}

.skill-card-footer-3d {
  padding: 12px 20px 20px;
}

.view-btn-3d {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: all 0.2s ease;
}

.view-btn-3d:hover {
  background: #ede9fe;
  border-color: #8b5cf6;
  color: #7c3aed;
  transform: translateZ(15px);
}

.view-btn-3d svg {
  width: 16px;
  height: 16px;
}

/* Empty */
.empty-state-3d {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px;
  color: #94a3b8;
}

.empty-icon-3d {
  font-size: 64px;
  margin-bottom: 16px;
  filter: drop-shadow(0 8px 16px rgba(0,0,0,0.1));
}

/* Modal */
.modal-overlay-3d {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  z-index: 1000;
  perspective: 2000px;
}

.skill-modal-3d {
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  background: #ffffff;
  border-radius: 24px;
  box-shadow: 0 25px 80px rgba(0,0,0,0.3);
  overflow: hidden;
  transform-style: preserve-3d;
}

.modal-header-3d {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: linear-gradient(135deg, #faf8ff, #ffffff);
  border-bottom: 1px solid #e2e8f0;
}

.modal-header-3d h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.close-btn-3d {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border: none;
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transform: translateZ(20px);
  transition: all 0.2s ease;
}

.close-btn-3d:hover {
  background: #e2e8f0;
  color: #1e293b;
  transform: translateZ(30px) rotate(90deg);
}

.close-btn-3d svg {
  width: 20px;
  height: 20px;
}

.modal-body-3d {
  padding: 24px;
  overflow: auto;
  max-height: calc(85vh - 140px);
}

.form-group-3d {
  margin-bottom: 20px;
}

.form-group-3d label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.form-row-3d {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-input-3d,
.form-select-3d,
.form-textarea-3d {
  width: 100%;
  padding: 12px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b;
  transition: all 0.2s ease;
}

.form-input-3d:hover,
.form-select-3d:hover,
.form-textarea-3d:hover {
  border-color: #cbd5e1;
}

.form-input-3d:focus,
.form-select-3d:focus,
.form-textarea-3d:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px #ede9fe;
  transform: translateZ(10px);
}

.form-textarea-3d {
  resize: vertical;
}

.form-textarea-3d.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.modal-footer-3d {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
}

.btn-3d {
  padding: 12px 24px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.btn-3d:hover {
  transform: translateZ(15px) scale(1.05);
}

.btn-3d:active {
  transform: translateZ(5px) scale(0.95);
}

.btn-cancel {
  background: #f1f5f9;
  color: #64748b;
}

.btn-cancel:hover {
  background: #e2e8f0;
}

.btn-save {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  box-shadow: 0 4px 15px rgba(139,92,246,0.3);
}

.btn-save:hover {
  box-shadow: 0 15px 35px rgba(139,92,246,0.4);
}

</style>
