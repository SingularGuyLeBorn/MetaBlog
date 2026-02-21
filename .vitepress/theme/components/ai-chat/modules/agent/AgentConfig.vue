<!--
  AgentConfig - AI 智能体配置中心
  
  统一管理：
  - 技能（Skills）
  - 记忆（Memory）
  - 系统提示词（System Prompt）
  - 行为偏好
-->
<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="visible" class="agent-config-overlay" @click.self="close">
        <div class="agent-config-panel">
          <!-- 头部 -->
          <div class="config-header">
            <div class="header-title">
              <span class="header-icon">🤖</span>
              <h3>Agent 配置</h3>
            </div>
            <button class="close-btn" @click="close">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <!-- 标签导航 -->
          <div class="config-tabs">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              class="tab-btn"
              :class="{ active: currentTab === tab.id }"
              @click="currentTab = tab.id"
            >
              <span class="tab-icon">{{ tab.icon }}</span>
              <span class="tab-name">{{ tab.name }}</span>
              <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
            </button>
          </div>

          <!-- 内容区域 -->
          <div class="config-content">
            <!-- 技能管理 -->
            <div v-if="currentTab === 'skills'" class="tab-panel">
              <div class="panel-intro">
                <h4>🎯 技能管理</h4>
                <p>为 AI 配置专业技能，提升特定场景下的表现</p>
              </div>
              
              <div class="skill-section">
                <div class="section-header-row">
                  <span class="section-title">当前技能</span>
                  <button class="action-btn" @click="openSkillManager">
                    <span>⚡</span>
                    管理技能
                  </button>
                </div>
                
                <div v-if="currentSkill" class="current-skill-card">
                  <span class="skill-icon">{{ currentSkill.icon }}</span>
                  <div class="skill-info">
                    <span class="skill-name">{{ currentSkill.name }}</span>
                    <span class="skill-desc">{{ currentSkill.description }}</span>
                  </div>
                  <button class="remove-btn" @click="clearCurrentSkill" title="移除技能">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                
                <div v-else class="empty-skill" @click="openSkillManager">
                  <span class="empty-icon">🔧</span>
                  <span>未选择技能，点击选择或创建</span>
                </div>
              </div>

              <div class="skill-section">
                <div class="section-header-row">
                  <span class="section-title">快捷技能</span>
                </div>
                <div class="quick-skills">
                  <button
                    v-for="skill in quickSkills"
                    :key="skill.id"
                    class="quick-skill-btn"
                    :class="{ active: currentSkill?.id === skill.id }"
                    @click="selectSkill(skill)"
                  >
                    <span class="quick-icon">{{ skill.icon }}</span>
                    <span class="quick-name">{{ skill.name }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- 记忆管理 -->
            <div v-if="currentTab === 'memory'" class="tab-panel">
              <div class="panel-intro">
                <h4>🧠 记忆管理</h4>
                <p>管理 AI 的长期记忆，让对话更加个性化</p>
              </div>

              <div class="memory-section">
                <div class="section-header-row">
                  <span class="section-title">会话记忆</span>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="config.enableMemory" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p class="section-desc">记住对话历史，保持上下文连贯性</p>
              </div>

              <div class="memory-section">
                <div class="section-header-row">
                  <span class="section-title">长期记忆</span>
                  <button class="action-btn" @click="showMemoryEditor = true">
                    <span>📝</span>
                    编辑
                  </button>
                </div>
                <div class="memory-content-preview">
                  <p v-if="config.memoryContent">{{ config.memoryContent.slice(0, 100) }}...</p>
                  <p v-else class="empty-text">暂无长期记忆，点击编辑添加</p>
                </div>
              </div>

              <div class="memory-section">
                <div class="section-header-row">
                  <span class="section-title">关键信息提取</span>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="config.autoExtractMemory" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                <p class="section-desc">自动从对话中提取重要信息并保存到长期记忆</p>
              </div>
            </div>

            <!-- 系统提示词 -->
            <div v-if="currentTab === 'prompt'" class="tab-panel">
              <div class="panel-intro">
                <h4>⚙️ 系统提示词</h4>
                <p>定义 AI 的角色、行为和回答风格</p>
              </div>

              <div class="prompt-section">
                <div class="prompt-templates">
                  <span class="templates-label">快速模板：</span>
                  <div class="template-tags">
                    <button
                      v-for="tpl in promptTemplates"
                      :key="tpl.id"
                      class="template-tag"
                      @click="applyPromptTemplate(tpl)"
                    >
                      {{ tpl.name }}
                    </button>
                  </div>
                </div>
                
                <textarea
                  v-model="config.systemPrompt"
                  class="prompt-textarea"
                  rows="12"
                  placeholder="输入系统提示词，定义 AI 的角色和行为..."
                ></textarea>
                
                <div class="prompt-actions">
                  <button class="secondary-btn" @click="resetPrompt">恢复默认</button>
                  <button class="primary-btn" @click="savePrompt">保存</button>
                </div>
              </div>
            </div>

            <!-- 行为偏好 -->
            <div v-if="currentTab === 'behavior'" class="tab-panel">
              <div class="panel-intro">
                <h4>🎭 行为偏好</h4>
                <p>自定义 AI 的回答风格和交互方式</p>
              </div>

              <div class="behavior-section">
                <div class="behavior-item">
                  <div class="behavior-info">
                    <span class="behavior-name">回答详细程度</span>
                    <span class="behavior-value">{{ detailLevelLabels[config.detailLevel] }}</span>
                  </div>
                  <div class="behavior-control">
                    <input
                      type="range"
                      v-model="config.detailLevel"
                      min="1"
                      max="3"
                      step="1"
                    />
                    <div class="range-labels">
                      <span>简洁</span>
                      <span>适中</span>
                      <span>详细</span>
                    </div>
                  </div>
                </div>

                <div class="behavior-item">
                  <div class="behavior-info">
                    <span class="behavior-name">代码解释风格</span>
                    <span class="behavior-value">{{ codeStyleLabels[config.codeStyle] }}</span>
                  </div>
                  <div class="behavior-options">
                    <button
                      v-for="(label, key) in codeStyleLabels"
                      :key="key"
                      class="option-btn"
                      :class="{ active: config.codeStyle === key }"
                      @click="config.codeStyle = key"
                    >
                      {{ label }}
                    </button>
                  </div>
                </div>

                <div class="behavior-item">
                  <div class="behavior-info">
                    <span class="behavior-name">语言风格</span>
                    <span class="behavior-value">{{ toneLabels[config.tone] }}</span>
                  </div>
                  <div class="behavior-options">
                    <button
                      v-for="(label, key) in toneLabels"
                      :key="key"
                      class="option-btn"
                      :class="{ active: config.tone === key }"
                      @click="config.tone = key"
                    >
                      {{ label }}
                    </button>
                  </div>
                </div>

                <div class="behavior-item">
                  <div class="behavior-info">
                    <span class="behavior-name">主动提问</span>
                    <span class="behavior-desc">在回答后主动询问是否需要进一步帮助</span>
                  </div>
                  <label class="toggle-switch">
                    <input type="checkbox" v-model="config.proactiveQuestion" />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 技能管理器弹窗 -->
    <SkillManager
      v-model:visible="showSkillManager"
      @select-skill="onSkillSelected"
    />

    <!-- 记忆编辑器弹窗 -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showMemoryEditor" class="memory-editor-overlay" @click.self="showMemoryEditor = false">
          <div class="memory-editor">
            <div class="editor-header">
              <h4>📝 编辑长期记忆</h4>
              <button class="close-btn" @click="showMemoryEditor = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <textarea
              v-model="memoryEditorContent"
              class="memory-textarea"
              rows="15"
              placeholder="输入 AI 需要记住的长期信息，例如：&#10;- 用户的编程语言偏好&#10;- 用户的业务领域&#10;- 特定的术语定义..."
            ></textarea>
            <div class="editor-actions">
              <button class="secondary-btn" @click="showMemoryEditor = false">取消</button>
              <button class="primary-btn" @click="saveMemory">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import SkillManager from './skills/SkillManager.vue'
import type { Skill } from '../../core/composables/useSkills'

const props = defineProps<{
  visible: boolean
  modelValue?: AgentConfig
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:modelValue': [config: AgentConfig]
  'skill-change': [skill: Skill | null]
}>()

interface AgentConfig {
  // 技能
  currentSkill: Skill | null
  // 记忆
  enableMemory: boolean
  memoryContent: string
  autoExtractMemory: boolean
  // 系统提示词
  systemPrompt: string
  // 行为偏好
  detailLevel: number
  codeStyle: 'concise' | 'detailed' | 'tutorial'
  tone: 'professional' | 'friendly' | 'casual'
  proactiveQuestion: boolean
}

const defaultConfig: AgentConfig = {
  currentSkill: null,
  enableMemory: true,
  memoryContent: '',
  autoExtractMemory: false,
  systemPrompt: '',
  detailLevel: 2,
  codeStyle: 'detailed',
  tone: 'friendly',
  proactiveQuestion: false
}

const tabs: Array<{ id: string; name: string; icon: string; badge?: number }> = [
  { id: 'skills', name: '技能', icon: '🎯' },
  { id: 'memory', name: '记忆', icon: '🧠' },
  { id: 'prompt', name: '提示词', icon: '⚙️' },
  { id: 'behavior', name: '行为', icon: '🎭' }
]

const currentTab = ref('skills')
const showSkillManager = ref(false)
const showMemoryEditor = ref(false)
const memoryEditorContent = ref('')

const config = reactive<AgentConfig>({ ...defaultConfig, ...props.modelValue })

// 快捷技能（内置常用技能）
const quickSkills: Skill[] = [
  { id: 'write', name: '写作助手', description: '基于提示词生成文章', icon: '✍️', category: 'content', version: '1.0', author: 'system', systemPrompt: '你是一个专业的写作助手...' },
  { id: 'code', name: '代码生成', description: '生成代码示例和解释', icon: '💻', category: 'development', version: '1.0', author: 'system', systemPrompt: '你是一个编程专家...' },
  { id: 'summarize', name: '文章总结', description: '总结文章内容，提取要点', icon: '📋', category: 'analysis', version: '1.0', author: 'system', systemPrompt: '你是一个总结专家...' },
  { id: 'translate', name: '中英翻译', description: '将内容翻译为英文或中文', icon: '🌐', category: 'language', version: '1.0', author: 'system', systemPrompt: '你是一个专业翻译...' }
]

const currentSkill = ref<Skill | null>(null)

const detailLevelLabels: Record<number, string> = {
  1: '简洁',
  2: '适中',
  3: '详细'
}

const codeStyleLabels: Record<'concise' | 'detailed' | 'tutorial', string> = {
  concise: '简洁',
  detailed: '详细',
  tutorial: '教程式'
}

const toneLabels: Record<'professional' | 'friendly' | 'casual', string> = {
  professional: '专业',
  friendly: '友好',
  casual: '轻松'
}

const promptTemplates = [
  { id: 'default', name: '默认助手', prompt: '你是一个 helpful 的 AI 助手。' },
  { id: 'expert', name: '领域专家', prompt: '你是该领域的资深专家，拥有丰富的实践经验。请提供专业、深入的回答。' },
  { id: 'teacher', name: '耐心导师', prompt: '你是一位耐心的导师，善于用简单易懂的方式解释复杂概念。请循序渐进地引导用户理解。' },
  { id: 'creative', name: '创意伙伴', prompt: '你是一个富有创意的伙伴，善于头脑风暴和提出新颖的想法。' }
]

function close() {
  emit('update:visible', false)
}

function openSkillManager() {
  showSkillManager.value = true
}

function onSkillSelected(skill: Skill) {
  currentSkill.value = skill
  config.currentSkill = skill
  emit('skill-change', skill)
}

function selectSkill(skill: Skill) {
  currentSkill.value = skill
  config.currentSkill = skill
  emit('skill-change', skill)
}

function clearCurrentSkill() {
  currentSkill.value = null
  config.currentSkill = null
  emit('skill-change', null)
}

function applyPromptTemplate(tpl: typeof promptTemplates[0]) {
  config.systemPrompt = tpl.prompt
}

function resetPrompt() {
  config.systemPrompt = ''
}

function savePrompt() {
  emit('update:modelValue', { ...config })
}

function saveMemory() {
  config.memoryContent = memoryEditorContent.value
  showMemoryEditor.value = false
  emit('update:modelValue', { ...config })
}

// 监听 visible 变化，同步配置
watch(() => props.visible, (val) => {
  if (val && props.modelValue) {
    Object.assign(config, props.modelValue)
    currentSkill.value = config.currentSkill
    memoryEditorContent.value = config.memoryContent
  }
})

// 监听配置变化
watch(config, (val) => {
  emit('update:modelValue', { ...val })
}, { deep: true })
</script>

<style scoped>
.agent-config-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.agent-config-panel {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 700px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

/* 头部 */
.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-icon {
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
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.close-btn:hover {
  background: var(--vp-c-bg-soft);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* 标签导航 */
.config-tabs {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.tab-btn.active {
  background: var(--vp-c-brand);
  color: white;
}

.tab-icon {
  font-size: 16px;
}

.tab-badge {
  font-size: 11px;
  padding: 2px 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 100px;
}

/* 内容区域 */
.config-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.tab-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.panel-intro {
  margin-bottom: 20px;
}

.panel-intro h4 {
  margin: 0 0 6px 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-intro p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* 通用区块 */
.skill-section,
.memory-section,
.prompt-section,
.behavior-section {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.section-desc {
  font-size: 13px;
  color: var(--vp-c-text-2);
  margin: 0;
}

/* 按钮 */
.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vp-c-brand-dark);
}

.primary-btn {
  padding: 8px 16px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.primary-btn:hover {
  background: var(--vp-c-brand-dark);
}

.secondary-btn {
  padding: 8px 16px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.secondary-btn:hover {
  background: var(--vp-c-bg-soft);
}

/* 当前技能卡片 */
.current-skill-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
}

.skill-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-brand-soft);
  border-radius: 10px;
  font-size: 20px;
}

.skill-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.skill-name {
  font-size: 14px;
  font-weight: 600;
}

.skill-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.remove-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--vp-c-text-3);
  cursor: pointer;
}

.remove-btn:hover {
  background: var(--vp-c-danger-soft);
  color: var(--vp-c-danger);
}

.remove-btn svg {
  width: 16px;
  height: 16px;
}

/* 空状态 */
.empty-skill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  background: var(--vp-c-bg);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.empty-skill:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.empty-icon {
  font-size: 24px;
}

/* 快捷技能 */
.quick-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.quick-skill-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.quick-skill-btn:hover {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.quick-skill-btn.active {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

.quick-icon {
  font-size: 16px;
}

/* 开关 */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--vp-c-divider);
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 20px;
  height: 20px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .toggle-slider {
  background: var(--vp-c-brand);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* 记忆预览 */
.memory-content-preview {
  padding: 12px;
  background: var(--vp-c-bg);
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  min-height: 60px;
}

.memory-content-preview .empty-text {
  color: var(--vp-c-text-3);
  font-style: italic;
}

/* 提示词区域 */
.prompt-templates {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.templates-label {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.template-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.template-tag {
  padding: 4px 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 100px;
  font-size: 12px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.template-tag:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.prompt-textarea {
  width: 100%;
  padding: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  min-height: 200px;
  font-family: inherit;
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.prompt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
}

/* 行为偏好 */
.behavior-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.behavior-item:last-child {
  border-bottom: none;
}

.behavior-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.behavior-name {
  font-size: 14px;
  font-weight: 500;
}

.behavior-value {
  font-size: 13px;
  color: var(--vp-c-brand);
}

.behavior-desc {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.behavior-control {
  width: 180px;
}

.behavior-control input[type="range"] {
  width: 100%;
  height: 6px;
  background: var(--vp-c-divider);
  border-radius: 3px;
  outline: none;
  -webkit-appearance: none;
}

.behavior-control input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: var(--vp-c-brand);
  border-radius: 50%;
  cursor: pointer;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--vp-c-text-3);
  margin-top: 4px;
}

.behavior-options {
  display: flex;
  gap: 8px;
}

.option-btn {
  padding: 6px 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 13px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.option-btn:hover {
  border-color: var(--vp-c-brand);
}

.option-btn.active {
  background: var(--vp-c-brand);
  color: white;
  border-color: var(--vp-c-brand);
}

/* 记忆编辑器 */
.memory-editor-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
}

.memory-editor {
  background: var(--vp-c-bg);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.editor-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.memory-textarea {
  width: 100%;
  padding: 16px 20px;
  background: var(--vp-c-bg);
  border: none;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  min-height: 250px;
  font-family: inherit;
}

.memory-textarea:focus {
  outline: none;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 20px;
  border-top: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg-soft);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 640px) {
  .agent-config-overlay {
    padding: 0;
    align-items: flex-end;
  }
  
  .agent-config-panel {
    max-width: 100%;
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
  }
  
  .config-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
