<!--
  AgentForm - Agent 创建/编辑表单
-->
<template>
  <Teleport to="body">
    <Transition name="form-fade">
      <div v-if="visible" class="form-overlay" @click.self="close">
        <div class="form-panel">
          <div class="form-header">
            <h3>{{ isEditing ? '编辑 Agent' : '新建 Agent' }}</h3>
            <button class="close-btn" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="form-body">
            <!-- 基本信息 -->
            <div class="form-section">
              <h4 class="section-title">基本信息</h4>
              
              <div class="form-row">
                <div class="form-group avatar-group">
                  <label>头像</label>
                  <div class="avatar-selector">
                    <button 
                      v-for="emoji in avatarOptions" 
                      :key="emoji"
                      class="avatar-option"
                      :class="{ active: form.avatar === emoji }"
                      @click="form.avatar = emoji"
                    >
                      {{ emoji }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>名称 <span class="required">*</span></label>
                  <input 
                    v-model="form.name" 
                    type="text" 
                    placeholder="输入 Agent 名称"
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>等级 <span class="required">*</span></label>
                  <div class="level-options">
                    <button
                      v-for="(config, level) in LEVEL_CONFIG"
                      :key="level"
                      class="level-option"
                      :class="{ active: form.level === level, disabled: level === 'meta' || level === 'core' }"
                      :style="form.level === level ? { background: config.color, color: 'white' } : {}"
                      @click="selectLevel(level)"
                    >
                      <span>{{ config.icon }}</span>
                      <span>{{ config.label }}</span>
                    </button>
                  </div>
                  <p class="form-hint">普通用户只能创建自定义等级的 Agent</p>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>座次</label>
                  <div class="seat-input-group">
                    <input 
                      v-model.number="form.seat" 
                      type="number" 
                      min="1"
                      :max="maxSeat"
                      class="form-input seat-input"
                    />
                    <span class="seat-hint">{{ levelConfig.label }} 最大座次: {{ maxSeat }}</span>
                  </div>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>描述 <span class="required">*</span></label>
                  <textarea 
                    v-model="form.description" 
                    rows="3"
                    placeholder="描述这个 Agent 的用途和特点"
                    class="form-textarea"
                  ></textarea>
                </div>
              </div>
            </div>

            <!-- 技能配置 -->
            <div class="form-section">
              <h4 class="section-title">技能配置</h4>
              <div class="skills-selector">
                <label 
                  v-for="skill in availableSkills" 
                  :key="skill.id"
                  class="skill-checkbox"
                  :class="{ checked: form.capabilities.skillIds.includes(skill.id) }"
                >
                  <input 
                    type="checkbox" 
                    :value="skill.id"
                    v-model="form.capabilities.skillIds"
                  />
                  <span class="check-icon">{{ skill.icon }}</span>
                  <div class="check-info">
                    <span class="check-name">{{ skill.name }}</span>
                    <span class="check-desc">{{ skill.description }}</span>
                  </div>
                </label>
              </div>
            </div>

            <!-- 系统提示词 -->
            <div class="form-section">
              <h4 class="section-title">系统提示词</h4>
              <div class="prompt-templates">
                <button
                  v-for="tpl in promptTemplates"
                  :key="tpl.id"
                  type="button"
                  class="template-btn"
                  @click="applyTemplate(tpl)"
                >
                  {{ tpl.name }}
                </button>
              </div>
              <textarea 
                v-model="form.capabilities.customSystemPrompt" 
                rows="6"
                placeholder="定义这个 Agent 的角色和行为方式..."
                class="form-textarea"
              ></textarea>
            </div>

            <!-- 权限配置 -->
            <div class="form-section">
              <h4 class="section-title">权限配置</h4>
              <div class="permissions-list">
                <label 
                  v-for="perm in form.permissions" 
                  :key="perm.id"
                  class="permission-checkbox"
                >
                  <input 
                    type="checkbox" 
                    v-model="perm.granted"
                  />
                  <span class="perm-check"></span>
                  <div class="perm-info">
                    <span class="perm-name">{{ perm.name }}</span>
                    <span class="perm-desc">{{ perm.description }}</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div class="form-footer">
            <button class="btn-secondary" @click="close">取消</button>
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
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { LEVEL_CONFIG, PERMISSION_TEMPLATES, type Agent, type AgentLevel } from '../../../core/composables/useAgents'

const props = defineProps<{
  agent?: Agent | null
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<Agent>]
}>()

const isEditing = computed(() => !!props.agent)

// 头像选项
const avatarOptions = ['🤖', '🦾', '🧠', '👨‍💻', '👩‍💻', '🎓', '🔬', '🎨', '📝', '💡', '🔧', '🚀']

// 可用技能
const availableSkills = [
  { id: 'write', name: '写作助手', description: '基于提示词生成文章', icon: '✍️' },
  { id: 'code', name: '代码生成', description: '生成代码示例和解释', icon: '💻' },
  { id: 'summarize', name: '文章总结', description: '总结文章内容，提取要点', icon: '📋' },
  { id: 'translate', name: '中英翻译', description: '将内容翻译为英文或中文', icon: '🌐' },
  { id: 'polish', name: '润色优化', description: '优化文章表达，提升可读性', icon: '✨' },
  { id: 'review', name: '代码审查', description: '审查代码，发现潜在问题', icon: '🔍' },
  { id: 'explain', name: '概念解释', description: '解释复杂概念，通俗易懂', icon: '💡' },
  { id: 'brainstorm', name: '头脑风暴', description: '生成创意点子和解决方案', icon: '🧠' }
]

// 提示词模板
const promptTemplates = [
  { id: 'default', name: '默认助手', prompt: '你是一个 helpful 的 AI 助手。' },
  { id: 'expert', name: '领域专家', prompt: '你是该领域的资深专家，拥有丰富的实践经验。请提供专业、深入的回答。' },
  { id: 'teacher', name: '耐心导师', prompt: '你是一位耐心的导师，善于用简单易懂的方式解释复杂概念。' },
  { id: 'creative', name: '创意伙伴', prompt: '你是一个富有创意的伙伴，善于头脑风暴和提出新颖的想法。' }
]

// 表单数据
const form = ref({
  name: '',
  avatar: '🤖',
  level: 'custom' as AgentLevel,
  seat: 1,
  description: '',
  capabilities: {
    mode: 'raw' as const,
    skillIds: [] as string[],
    toolIds: [] as string[],
    customSystemPrompt: ''
  },
  permissions: PERMISSION_TEMPLATES.map(p => ({ ...p, granted: false }))
})

// 初始化表单
watch(() => props.agent, (agent) => {
  if (agent) {
    form.value = {
      name: agent.name,
      avatar: agent.avatar,
      level: agent.level,
      seat: agent.seat,
      description: agent.description,
      capabilities: {
        mode: agent.capabilities?.mode || 'raw',
        skillIds: [...(agent.capabilities?.skillIds || [])],
        toolIds: [...(agent.capabilities?.toolIds || [])],
        customSystemPrompt: agent.capabilities?.customSystemPrompt || ''
      },
      permissions: agent.permissions.map(p => ({ ...p }))
    }
  } else {
    form.value = {
      name: '',
      avatar: '🤖',
      level: 'custom',
      seat: 1,
      description: '',
      capabilities: {
        mode: 'raw',
        skillIds: [],
        toolIds: [],
        customSystemPrompt: ''
      },
      permissions: PERMISSION_TEMPLATES.map(p => ({ ...p, granted: p.id === 'chat' }))
    }
  }
}, { immediate: true })

// 等级配置
const levelConfig = computed(() => LEVEL_CONFIG[form.value.level])

// 最大座次
const maxSeat = computed(() => levelConfig.value.maxSeat)

// 验证
const isValid = computed(() => {
  return form.value.name.trim() && 
         form.value.description.trim() &&
         form.value.level
})

function selectLevel(level: string) {
  if (level === 'meta' || level === 'core') return // 禁止选择
  form.value.level = level as AgentLevel
  // 重置座次为1
  form.value.seat = 1
}

function applyTemplate(tpl: typeof promptTemplates[0]) {
  form.value.capabilities.customSystemPrompt = tpl.prompt
}

function close() {
  emit('close')
}

function save() {
  if (!isValid.value) return
  
  emit('save', {
    name: form.value.name.trim(),
    avatar: form.value.avatar,
    level: form.value.level,
    seat: form.value.seat,
    description: form.value.description.trim(),
    capabilities: {
      mode: form.value.capabilities.mode,
      skillIds: form.value.capabilities.skillIds,
      toolIds: form.value.capabilities.toolIds,
      customSystemPrompt: form.value.capabilities.customSystemPrompt.trim()
    },
    permissions: form.value.permissions
  })
}
</script>

<style scoped>
.form-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: 20px;
}

.form-panel {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.form-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.form-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
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
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

.form-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-title {
  margin: 0 0 16px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.form-row {
  margin-bottom: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.required {
  color: var(--sr-morandi-pink, #d4b8b8);
}

.form-input,
.form-textarea {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  font-size: 14px;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--sr-morandi-blue, #9daab8);
  box-shadow: 0 0 0 3px rgba(179, 168, 184, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.6;
}

.form-hint {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: var(--vp-c-text-3);
}

/* 头像选择 */
.avatar-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-option {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-option:hover {
  background: white;
  border-color: rgba(179, 168, 184, 0.3);
  transform: scale(1.1);
}

.avatar-option.active {
  background: var(--sr-morandi-blue, #9daab8);
  border-color: var(--sr-morandi-blue, #9daab8);
}

/* 等级选项 */
.level-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.level-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.level-option:hover:not(.disabled) {
  background: white;
  border-color: rgba(179, 168, 184, 0.3);
}

.level-option.active {
  border-color: transparent;
}

.level-option.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 座次输入 */
.seat-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.seat-input {
  width: 80px;
  text-align: center;
}

.seat-hint {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* 技能选择 */
.skills-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.skill-checkbox:hover {
  background: white;
  border-color: rgba(0, 0, 0, 0.1);
}

.skill-checkbox.checked {
  background: rgba(179, 168, 184, 0.08);
  border-color: rgba(179, 168, 184, 0.3);
}

.skill-checkbox input {
  display: none;
}

.check-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 10px;
}

.check-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.check-name {
  font-size: 14px;
  font-weight: 500;
}

.check-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* 提示词模板 */
.prompt-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.template-btn {
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.template-btn:hover {
  background: rgba(179, 168, 184, 0.1);
  border-color: rgba(179, 168, 184, 0.3);
  color: var(--sr-morandi-blue, #9daab8);
}

/* 权限列表 */
.permissions-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-checkbox {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  cursor: pointer;
}

.permission-checkbox input {
  display: none;
}

.perm-check {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  transition: all 0.2s;
}

.permission-checkbox input:checked + .perm-check {
  background: var(--sr-morandi-blue, #9daab8);
  border-color: var(--sr-morandi-blue, #9daab8);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E");
  background-size: 14px;
  background-position: center;
  background-repeat: no-repeat;
}

.perm-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.perm-name {
  font-size: 13px;
  font-weight: 500;
}

.perm-desc {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* 底部 */
.form-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.btn-secondary {
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--vp-c-text-1);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
.form-fade-enter-active,
.form-fade-leave-active {
  transition: all 0.3s ease;
}

.form-fade-enter-from,
.form-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* 深色模式 */
.dark .form-panel {
  background: rgba(30, 30, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .form-input,
.dark .form-textarea,
.dark .avatar-option,
.dark .level-option,
.dark .skill-checkbox,
.dark .permission-checkbox,
.dark .template-btn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .form-footer {
  background: rgba(255, 255, 255, 0.05);
}
</style>
