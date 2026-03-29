<template>
  <div class="skills-manager">
    <!-- 头部 -->
    <div class="manager-header">
      <div class="header-title">
        <Icon name="zap" class="title-icon" />
        <div>
          <h2 class="title-text">Skills 管理</h2>
          <p class="title-desc">管理 Agent 可用的 Skills 库</p>
        </div>
      </div>
      <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.6">
        <button class="create-btn" @click="showCreate = true">
          <Icon name="plus" />
          新建 Skill
        </button>
      </LiquidGlass>
    </div>

    <!-- 搜索栏 -->
    <LiquidGlass class="search-glass" glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
      <div class="search-bar">
        <Icon name="search" class="search-icon" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索 Skills..."
          class="search-input"
        />
      </div>
      <div class="filter-chips">
        <LiquidGlass
          v-for="cat in categories"
          :key="cat.id"
          class="filter-chip-glass"
          :glow-color="selectedCategory === cat.id ? 'var(--sr-accent-star, #b8a090)' : '#e2e8f0'"
          :intensity="selectedCategory === cat.id ? 0.4 : 0.1"
        >
          <button
            class="filter-chip"
            :class="{ active: selectedCategory === cat.id }"
            @click="selectedCategory = cat.id"
          >
            {{ cat.name }}
          </button>
        </LiquidGlass>
      </div>
    </LiquidGlass>

    <!-- Skills 网格 -->
    <div class="skills-grid">
      <LiquidGlass
        v-for="(skill, idx) in filteredSkills"
        :key="skill.id"
        class="skill-card-glass"
        :glow-color="getSkillColor(idx)"
        :intensity="0.3"
        :style="{ animationDelay: `${idx * 50}ms` }"
      >
        <div class="skill-card">
          <div class="card-header">
            <div class="skill-icon-wrap" :style="{ background: getIconGradient(idx) }">
              <span class="skill-icon">{{ skill.icon }}</span>
            </div>
            <div class="skill-actions">
              <button class="action-btn" @click.stop="editSkill(skill)" title="编辑">
                <Icon name="edit" />
              </button>
              <button class="action-btn danger" @click.stop="deleteSkill(skill)" title="删除">
                <Icon name="trash-2" />
              </button>
            </div>
          </div>

          <div class="card-body">
            <h3 class="skill-name">{{ skill.name }}</h3>
            <p class="skill-desc">{{ skill.description }}</p>
            <div class="skill-meta">
              <span class="meta-badge">
                <Icon name="tool" />
                {{ skill.tools?.length || 0 }} 工具
              </span>
              <span class="meta-badge category">{{ skill.category || '通用' }}</span>
            </div>
          </div>

          <div class="card-footer">
            <button class="view-btn" @click="viewSkill(skill)">
              查看详情
              <Icon name="arrow-right" />
            </button>
          </div>
        </div>
      </LiquidGlass>

      <!-- 空状态 -->
      <div v-if="filteredSkills.length === 0" class="empty-state">
        <Icon name="search" class="empty-icon" />
        <p>没有找到匹配的 Skills</p>
      </div>
    </div>

    <!-- 创建/编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreate || editingSkill" class="modal-overlay" @click.self="closeModal">
          <LiquidGlass class="modal-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.4">
            <div class="skill-modal">
              <div class="modal-header">
                <h3>{{ editingSkill ? '编辑 Skill' : '新建 Skill' }}</h3>
                <button class="close-btn" @click="closeModal">
                  <Icon name="x" />
                </button>
              </div>

              <div class="modal-body">
                <div class="form-group">
                  <label>名称</label>
                  <input v-model="form.name" type="text" class="lg-input" placeholder="Skill 名称" />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>图标</label>
                    <input v-model="form.icon" type="text" class="lg-input" placeholder="馃幆" />
                  </div>
                  <div class="form-group">
                    <label>分类</label>
                    <select v-model="form.category" class="lg-input">
                      <option value="通用">通用</option>
                      <option value="写作">写作</option>
                      <option value="编程">编程</option>
                      <option value="分析">分析</option>
                      <option value="搜索">搜索</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label>描述</label>
                  <textarea v-model="form.description" class="lg-input" rows="2" placeholder="简要描述这个 Skill 的功能" />
                </div>

                <div class="form-group">
                  <label>内容 (SKILL.md)</label>
                  <textarea v-model="form.content" class="lg-input code" rows="8" placeholder="# Skill 名称

## 描述
..." />
                </div>

                <div class="form-group">
                  <label>工具 (逗号分隔)</label>
                  <input v-model="toolsInput" type="text" class="lg-input" placeholder="tool1, tool2, tool3" />
                </div>
              </div>

              <div class="modal-footer">
                <LiquidGlass glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
                  <button class="lg-btn" @click="closeModal">取消</button>
                </LiquidGlass>
                <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.5">
                  <button class="lg-btn lg-btn-primary" @click="saveSkill">
                    {{ editingSkill ? '保存' : '创建' }}
                  </button>
                </LiquidGlass>
              </div>
            </div>
          </LiquidGlass>
        </div>
      </Transition>
    </Teleport>

    <!-- 详情弹窗 -->
    <SkillDetailModal v-if="viewingSkill" :skill="viewingSkill" @close="viewingSkill = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgentConfig } from '../../stores/useAgentConfig'
import type { Skill, SkillCategory } from '../../types/agent'
import SkillDetailModal from './SkillDetailModal.vue'
import { Icon } from '../../../../shared/components'
import { LiquidGlass } from '../../../../shared/components'

const { skills, createSkill, updateSkill: updateSkillApi, deleteSkill: deleteSkillApi } = useAgentConfig()

const searchQuery = ref('')
const selectedCategory = ref('all')
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

// 显式声明 form 类型，避免使用 as 断言
interface SkillForm {
  name: string
  icon: string
  category: SkillCategory
  description: string
  content: string
  tools: string[]
}

const form = ref<SkillForm>({
  name: '',
  icon: '馃幆',
  category: 'general',
  description: '',
  content: '',
  tools: []
})
const toolsInput = ref('')

const gradients = [
  'linear-gradient(135deg, #ede9fe, #ddd6fe)',
  'linear-gradient(135deg, #dbeafe, #bfdbfe)',
  'linear-gradient(135deg, #dcfce7, #bbf7d0)',
  'linear-gradient(135deg, #fef3c7, #fde68a)',
  'linear-gradient(135deg, #ffe4e6, #fecdd3)',
  'linear-gradient(135deg, #e0e7ff, #c7d2fe)'
]

const glowColors = ['var(--sr-accent-star, #b8a090)', 'var(--sr-morandi-blue, #9daab8)', 'var(--sr-morandi-green, #a8b3a8)', '#f59e0b', '#ec4899', '#06b6d4']

function getIconGradient(idx: number) {
  return gradients[idx % gradients.length]
}

function getSkillColor(idx: number) {
  return glowColors[idx % glowColors.length]
}

function closeModal() {
  showCreate.value = false
  editingSkill.value = null
  resetForm()
}

function resetForm() {
  form.value = { name: '', icon: '馃幆', category: 'general', description: '', content: '', tools: [] }
  toolsInput.value = ''
}

function editSkill(skill: Skill) {
  editingSkill.value = skill
  // 使用类型安全的默认值
  const category: SkillCategory = skill.category ?? 'general'
  form.value = {
    name: skill.name,
    icon: skill.icon,
    category,
    description: skill.description,
    content: skill.content ?? '',
    tools: [...(skill.tools ?? [])]
  }
  toolsInput.value = skill.tools?.join(', ') || ''
}

function viewSkill(skill: Skill) {
  viewingSkill.value = skill
}

async function saveSkill() {
  const data = {
    ...form.value,
    tools: toolsInput.value.split(',').map(t => t.trim()).filter(Boolean)
  }

  if (editingSkill.value) {
    await updateSkillApi(editingSkill.value.id, data)
  } else {
    await createSkill(data as Omit<Skill, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>)
  }
  closeModal()
}

async function deleteSkill(skill: Skill) {
  if (confirm(`确定要删除"${skill.name}" 吗？`)) {
    await deleteSkillApi(skill.id)
  }
}
</script>

<style scoped>
/* 使用全局导入的 liquid-glass-theme.css */

.skills-manager {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px;
}

/* 头部 */
.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
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

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(184, 160, 144, 0.3);
}

.create-btn svg {
  width: 18px;
  height: 18px;
}

/* 搜索栏 */
.search-glass {
  margin-bottom: 24px;
  border-radius: 24px;
}

.search-bar {
  position: relative;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.search-icon {
  position: absolute;
  left: 40px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 14px 20px 14px 52px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 14px;
  font-size: 15px;
  color: var(--sr-text-primary, #1a1a2e);
  transition: all 0.2s ease;
}

.search-input:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(0, 0, 0, 0.1);
}

.search-input:focus {
  outline: none;
  border-color: rgba(184, 160, 144, 0.3);
  box-shadow: 0 0 0 4px rgba(184, 160, 144, 0.1);
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 24px;
}

.filter-chip-glass {
  display: inline-block;
  border-radius: 20px;
}

.filter-chip {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.filter-chip:hover {
  color: var(--sr-accent-star, #b8a090);
}

.filter-chip.active {
  color: white;
}

/* Skills 网格 */
.skills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.skill-card-glass {
  border-radius: 24px;
  animation: fadeInUp 0.5s ease forwards;
  opacity: 0;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.skill-card {
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.skill-icon-wrap {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.skill-icon {
  font-size: 26px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
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
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(184, 160, 144, 0.1);
  border-color: rgba(184, 160, 144, 0.2);
  color: var(--sr-accent-star, #b8a090);
  transform: translateY(-2px);
}

.action-btn.danger:hover {
  background: rgba(212, 184, 184, 0.1);
  border-color: rgba(212, 184, 184, 0.2);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

.card-body {
  margin-bottom: 16px;
}

.skill-name {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.skill-desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-meta {
  display: flex;
  gap: 8px;
}

.meta-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.meta-badge svg {
  width: 12px;
  height: 12px;
}

.meta-badge.category {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-morandi-purple, #b3a8b8);
}

.card-footer {
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 10px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: rgba(184, 160, 144, 0.1);
  border-color: rgba(184, 160, 144, 0.2);
  color: var(--sr-accent-star, #b8a090);
}

.view-btn svg {
  width: 16px;
  height: 16px;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px;
  color: #94a3b8;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #cbd5e1;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  z-index: 1100;
  padding: 24px;
}

.modal-glass {
  width: 90%;
  max-width: 560px;
  max-height: 85vh;
  border-radius: 28px;
  overflow: hidden;
}

.skill-modal {
  padding: 28px;
  overflow: auto;
  max-height: 85vh;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
  transform: rotate(90deg);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>

