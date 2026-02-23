<!--
  SkillDetailModal - Skill 详情弹窗（支持内联编辑）
  
  功能：
  - 展示 Skill 完整信息
  - 点击编辑切换到编辑模式
  - 直接调用后端 API 保存修改
-->
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="skill-detail-overlay" @click.self="close">
        <div class="skill-detail-modal">
          <!-- 头部 -->
          <div class="modal-header" :class="displaySkill?.category">
            <div class="header-bg-icon">{{ displaySkill?.icon }}</div>
            <div class="header-content">
              <div class="skill-badge">{{ categoryLabel }}</div>
              <h2 class="skill-name">{{ displaySkill?.name }}</h2>
              <p class="skill-desc">{{ displaySkill?.description }}</p>
            </div>
            <button class="close-btn" @click.stop="close" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
          
          <!-- 内容区 -->
          <div class="modal-body">
            <!-- 查看模式 -->
            <template v-if="!isEditing">
              <!-- 系统提示词 -->
              <div class="detail-section">
                <div class="section-header">
                  <span class="section-icon">📝</span>
                  <h4>系统提示词</h4>
                </div>
                <div class="prompt-box">
                  <pre>{{ displaySkill?.systemPrompt }}</pre>
                </div>
              </div>
              
              <!-- 关联工具 -->
              <div class="detail-section">
                <div class="section-header">
                  <span class="section-icon">🔧</span>
                  <h4>关联工具</h4>
                  <span class="tool-count">{{ displaySkill?.tools?.length || 0 }} 个</span>
                </div>
                <div class="tools-grid">
                  <div 
                    v-for="tool in toolDetails" 
                    :key="tool.name"
                    class="tool-card"
                  >
                    <span class="tool-icon">{{ tool.icon }}</span>
                    <div class="tool-info">
                      <span class="tool-name">{{ tool.name }}</span>
                      <span class="tool-desc">{{ tool.description }}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 元信息 -->
              <div class="detail-section meta-section">
                <div class="meta-grid">
                  <div class="meta-item">
                    <span class="meta-label">版本</span>
                    <span class="meta-value">{{ displaySkill?.version }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">类型</span>
                    <span class="meta-value">{{ displaySkill?.isBuiltIn ? '内置' : '自定义' }}</span>
                  </div>
                  <div class="meta-item">
                    <span class="meta-label">创建时间</span>
                    <span class="meta-value">{{ formatDate(displaySkill?.createdAt) }}</span>
                  </div>
                  <div v-if="displaySkill?.tags?.length" class="meta-item full-width">
                    <span class="meta-label">标签</span>
                    <div class="tags-list">
                      <span v-for="tag in displaySkill?.tags" :key="tag" class="tag">
                        {{ tag }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            
            <!-- 编辑模式 -->
            <template v-else>
              <div class="edit-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>名称 *</label>
                    <input v-model="editForm.name" type="text" placeholder="技能名称" />
                  </div>
                  <div class="form-group">
                    <label>图标</label>
                    <div class="emoji-picker">
                      <button
                        v-for="emoji in emojiOptions"
                        :key="emoji"
                        class="emoji-btn"
                        :class="{ active: editForm.icon === emoji }"
                        @click="editForm.icon = emoji"
                      >
                        {{ emoji }}
                      </button>
                    </div>
                  </div>
                </div>

                <div class="form-group">
                  <label>分类</label>
                  <select v-model="editForm.category">
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
                  <textarea v-model="editForm.description" rows="2" placeholder="一句话描述这个技能的能力..." />
                </div>

                <div class="form-group">
                  <label>系统提示词 *</label>
                  <textarea 
                    v-model="editForm.systemPrompt" 
                    rows="6" 
                    placeholder="定义 AI 在这个技能下的角色、能力和行为方式..."
                    class="code-input"
                  />
                </div>

                <div class="form-group">
                  <label>关联工具 ({{ editForm.tools.length }} 个)</label>
                  <div class="tools-selector">
                    <label
                      v-for="tool in allTools"
                      :key="tool.name"
                      class="tool-checkbox"
                      :class="{ checked: editForm.tools.includes(tool.name) }"
                    >
                      <input
                        type="checkbox"
                        :value="tool.name"
                        v-model="editForm.tools"
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
            </template>
          </div>
          
          <!-- 底部操作 -->
          <div class="modal-footer">
            <template v-if="!isEditing">
              <button class="btn-secondary" @click="close">关闭</button>
              <button 
                class="btn-primary"
                @click="startEdit"
              >
                ✏️ 编辑
              </button>
            </template>
            <template v-else>
              <button class="btn-secondary" @click="cancelEdit">取消</button>
              <button 
                class="btn-primary"
                @click="saveEdit"
                :disabled="!isFormValid || isSaving"
              >
                {{ isSaving ? '保存中...' : '保存修改' }}
              </button>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Skill, Tool } from '../../../core/types/agent'
import { updateSkill } from '../../../core/services/agentStorage'

const props = defineProps<{
  visible: boolean
  skill: Skill | null
  allTools: Tool[]
}>()

const emit = defineEmits<{
  close: []
  saved: [skill: Skill]
}>()

// 本地状态
const isEditing = ref(false)
const isSaving = ref(false)
const displaySkill = ref<Skill | null>(props.skill)

// 编辑表单
const editForm = ref({
  name: '',
  icon: '🤖',
  category: 'custom' as Skill['category'],
  description: '',
  systemPrompt: '',
  tools: [] as string[]
})

const emojiOptions = ['💻', '✍️', '📊', '🌐', '🔬', '📁', '🎨', '📋', '🌤️', '🚀', '🤖', '⚙️', '🔧', '💡', '🎯', '📦', '🔮', '⚡', '🧩', '🔗']

// 监听 skill 变化
watch(() => props.skill, (newSkill) => {
  displaySkill.value = newSkill
  isEditing.value = false
}, { immediate: true })

// 分类标签
const categoryLabel = computed(() => {
  const labels: Record<string, string> = {
    general: '通用',
    writing: '写作',
    coding: '编程',
    analysis: '分析',
    creative: '创意',
    custom: '自定义'
  }
  return labels[displaySkill.value?.category || ''] || displaySkill.value?.category
})

// 工具详情
const toolDetails = computed(() => {
  if (!displaySkill.value) return []
  return displaySkill.value.tools
    .map(name => props.allTools.find(t => t.name === name))
    .filter(Boolean) as Tool[]
})

// 表单验证
const isFormValid = computed(() => {
  return editForm.value.name.trim() && 
         editForm.value.description.trim() && 
         editForm.value.systemPrompt.trim()
})

function close() {
  isEditing.value = false
  emit('close')
}

function startEdit() {
  if (!displaySkill.value) return
  
  editForm.value = {
    name: displaySkill.value.name,
    icon: displaySkill.value.icon,
    category: displaySkill.value.category,
    description: displaySkill.value.description,
    systemPrompt: displaySkill.value.systemPrompt,
    tools: [...displaySkill.value.tools]
  }
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
}

async function saveEdit() {
  if (!isFormValid.value || !displaySkill.value) return
  
  isSaving.value = true
  
  try {
    const updated = await updateSkill(displaySkill.value.id, {
      name: editForm.value.name.trim(),
      icon: editForm.value.icon,
      category: editForm.value.category,
      description: editForm.value.description.trim(),
      systemPrompt: editForm.value.systemPrompt.trim(),
      tools: editForm.value.tools
    })
    
    if (updated) {
      displaySkill.value = updated
      emit('saved', updated)
      isEditing.value = false
    }
  } catch (e) {
    console.error('Failed to save skill:', e)
    alert('保存失败，请重试')
  } finally {
    isSaving.value = false
  }
}

function formatDate(timestamp: number | undefined): string {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}
</script>

<style scoped>
.skill-detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: 20px;
}

.skill-detail-modal {
  width: 100%;
  max-width: 640px;
  max-height: 85vh;
  background: var(--vp-c-bg);
  border-radius: 20px;
  box-shadow: 
    0 32px 64px -16px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.modal-header {
  position: relative;
  padding: 32px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  overflow: hidden;
}

.modal-header.general { background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); }
.modal-header.writing { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); }
.modal-header.coding { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); }
.modal-header.analysis { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); }
.modal-header.creative { background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%); }
.modal-header.custom { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); }

.header-bg-icon {
  position: absolute;
  right: -20px;
  top: -20px;
  font-size: 180px;
  opacity: 0.08;
  transform: rotate(-15deg);
  pointer-events: none;
}

.header-content {
  position: relative;
  z-index: 1;
}

.skill-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  margin-bottom: 12px;
  backdrop-filter: blur(8px);
}

.skill-name {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.skill-desc {
  margin: 0;
  font-size: 15px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(8px);
  z-index: 10;
}

.close-btn:hover {
  background: white;
  color: var(--vp-c-text-1);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* 内容区 */
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.section-icon {
  font-size: 18px;
}

.section-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  flex: 1;
}

.tool-count {
  padding: 2px 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  border-radius: 100px;
  font-size: 12px;
  font-weight: 500;
}

/* 提示词盒子 */
.prompt-box {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 16px;
  max-height: 200px;
  overflow-y: auto;
}

.prompt-box pre {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
}

/* 工具网格 */
.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 10px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  transition: all 0.2s;
}

.tool-card:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.tool-icon {
  font-size: 20px;
}

.tool-info {
  flex: 1;
  min-width: 0;
}

.tool-name {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.tool-desc {
  display: block;
  font-size: 11px;
  color: var(--vp-c-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 元信息 */
.meta-section {
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.meta-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-item.full-width {
  grid-column: 1 / -1;
}

.meta-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.meta-value {
  font-size: 14px;
  font-weight: 500;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 3px 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 100px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* 编辑表单 */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-2);
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 14px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  color: var(--vp-c-text-1);
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
  font-family: inherit;
}

.form-group textarea.code-input {
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

/* Emoji 选择器 */
.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  max-height: 100px;
  overflow-y: auto;
}

.emoji-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.emoji-btn:hover {
  background: var(--vp-c-bg);
}

.emoji-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

/* 工具选择器 */
.tools-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  padding: 4px;
}

.tool-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-checkbox:hover {
  border-color: var(--vp-c-brand);
}

.tool-checkbox.checked {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

.tool-checkbox input {
  width: 18px;
  height: 18px;
  accent-color: var(--vp-c-brand);
}

.tool-checkbox .tool-icon {
  font-size: 20px;
}

.tool-checkbox .tool-info {
  flex: 1;
}

.tool-checkbox .tool-name {
  font-size: 14px;
  font-weight: 500;
}

.tool-checkbox .tool-desc {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 底部 */
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: var(--vp-c-bg-soft);
  border-top: 1px solid var(--vp-c-divider);
}

.btn-secondary {
  padding: 10px 20px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--vp-c-bg-mute);
}

.btn-primary {
  padding: 10px 20px;
  background: var(--vp-c-brand);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .skill-detail-modal,
.modal-leave-to .skill-detail-modal {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}
</style>
