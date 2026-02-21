<template>
  <div class="skill-editor-overlay" @click.self="cancel">
    <div class="skill-editor-modal">
      <div class="editor-header">
        <h4>{{ isEditing ? '编辑技能' : '新建技能' }}</h4>
        <button class="close-btn" @click="cancel">✕</button>
      </div>
      
      <div class="editor-body">
        <div class="form-group">
          <label>技能名称 <span class="required">*</span></label>
          <input
            v-model="form.name"
            type="text"
            placeholder="例如：文案优化助手"
            class="form-input"
          />
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>图标</label>
            <input
              v-model="form.icon"
              type="text"
              placeholder="例如：✨"
              class="form-input icon-input"
            />
          </div>
          
          <div class="form-group">
            <label>分类</label>
            <select v-model="form.category" class="form-select">
              <option value="custom">自定义</option>
              <option value="content">内容创作</option>
              <option value="analysis">分析总结</option>
              <option value="language">语言翻译</option>
              <option value="editing">编辑润色</option>
              <option value="development">开发编程</option>
              <option value="education">教育解释</option>
              <option value="creativity">创意思维</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>描述 <span class="required">*</span></label>
          <input
            v-model="form.description"
            type="text"
            placeholder="简短描述这个技能的作用"
            class="form-input"
          />
        </div>
        
        <div class="form-group">
          <label>系统提示词 <span class="required">*</span></label>
          <textarea
            v-model="form.systemPrompt"
            rows="10"
            placeholder="输入系统提示词，定义 AI 的角色和能力..."
            class="form-textarea"
          ></textarea>
          <div class="form-hint">
            系统提示词定义了 AI 的行为模式和能力范围。
          </div>
        </div>
        
        <div class="form-group">
          <label>标签（用逗号分隔）</label>
          <input
            v-model="tagsInput"
            type="text"
            placeholder="例如：写作, 创意, 优化"
            class="form-input"
          />
        </div>
      </div>
      
      <div class="editor-footer">
        <button class="btn-secondary" @click="cancel">取消</button>
        <button 
          class="btn-primary" 
          :disabled="!isValid"
          @click="save"
        >
          {{ isEditing ? '保存' : '创建' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Skill, SkillCreateParams } from '../../../core/composables/useSkills'

const props = defineProps<{
  skill?: Skill | null
}>()

const emit = defineEmits<{
  save: [params: SkillCreateParams]
  cancel: []
}>()

const isEditing = computed(() => !!props.skill)

const form = ref({
  name: '',
  icon: '🔧',
  category: 'custom',
  description: '',
  systemPrompt: '',
  tags: [] as string[]
})

const tagsInput = ref('')

// 初始化表单
watch(() => props.skill, (skill) => {
  if (skill) {
    form.value = {
      name: skill.name,
      icon: skill.icon,
      category: skill.category,
      description: skill.description,
      systemPrompt: skill.systemPrompt,
      tags: skill.tags || []
    }
    tagsInput.value = (skill.tags || []).join(', ')
  } else {
    form.value = {
      name: '',
      icon: '🔧',
      category: 'custom',
      description: '',
      systemPrompt: '',
      tags: []
    }
    tagsInput.value = ''
  }
}, { immediate: true })

const isValid = computed(() => {
  return form.value.name.trim() && 
         form.value.description.trim() && 
         form.value.systemPrompt.trim()
})

function cancel() {
  emit('cancel')
}

function save() {
  if (!isValid.value) return
  
  const tags = tagsInput.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(t => t)
  
  emit('save', {
    name: form.value.name.trim(),
    description: form.value.description.trim(),
    icon: form.value.icon || '🔧',
    category: form.value.category,
    systemPrompt: form.value.systemPrompt.trim(),
    tags
  })
}
</script>

<style scoped>
.skill-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.skill-editor-modal {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.editor-header h4 {
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
}

.close-btn:hover {
  background: var(--vp-c-bg-soft);
}

.editor-body {
  padding: 24px;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-row .form-group {
  flex: 1;
}

label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  margin-bottom: 8px;
}

.required {
  color: var(--vp-c-danger);
}

.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  background: var(--vp-c-bg-soft);
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.icon-input {
  font-size: 20px;
  text-align: center;
}

.form-textarea {
  resize: vertical;
  min-height: 120px;
  font-family: inherit;
  line-height: 1.6;
}

.form-hint {
  font-size: 12px;
  color: var(--vp-c-text-2);
  margin-top: 6px;
}

.editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--vp-c-divider);
}

.btn-secondary,
.btn-primary {
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
}

.btn-secondary:hover {
  background: var(--vp-c-bg-mute);
}

.btn-primary {
  background: var(--vp-c-brand);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--vp-c-brand-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
