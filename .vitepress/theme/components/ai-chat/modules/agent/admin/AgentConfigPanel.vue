<!--
  AgentConfigPanel - Agent 配置面板（改进版）
  
  改进：
  - 混合模式下工具去重
  - Skill点击显示详情
  - 更紧凑的布局
-->
<template>
  <div class="agent-config-panel">
    <!-- 顶部模式选择栏（固定） -->
    <div class="mode-selector-bar">
      <div class="mode-tabs">
        <button
          v-for="mode in CONFIG_MODES"
          :key="mode.id"
          class="mode-tab"
          :class="{ 
            active: config.mode === mode.id,
            'is-recommended': mode.id === 'hybrid'
          }"
          @click="selectMode(mode.id)"
        >
          <span class="mode-icon">{{ mode.icon }}</span>
          <div class="mode-info">
            <span class="mode-name">{{ mode.name }}</span>
            <span class="mode-short">{{ mode.shortDesc }}</span>
          </div>
          <span v-if="mode.id === 'hybrid'" class="recommended-badge">推荐</span>
        </button>
      </div>
    </div>

    <div class="config-body">
      <!-- 左侧：能力选择区 -->
      <div class="capability-selection">
        <!-- Skill 选择器 -->
        <div v-if="modeInfo.showSkillSelector" class="selection-section">
          <div class="section-header">
            <h4>
              <span class="section-icon">🎯</span>
              技能包
            </h4>
            <span class="selected-count">{{ config.skillIds.length }} 个已选</span>
          </div>
          <div class="skill-grid">
            <div
              v-for="skill in skills"
              :key="skill.id"
              class="skill-card"
              :class="{ 
                selected: config.skillIds.includes(skill.id),
                builtin: skill.isBuiltIn 
              }"
            >
              <label class="skill-checkbox">
                <input
                  type="checkbox"
                  :value="skill.id"
                  :checked="config.skillIds.includes(skill.id)"
                  @change="toggleSkill(skill.id)"
                />
                <div class="skill-content">
                  <span class="skill-icon">{{ skill.icon }}</span>
                  <div class="skill-info">
                    <span class="skill-name">{{ skill.name }}</span>
                    <span class="skill-desc">{{ skill.description }}</span>
                  </div>
                  <span class="skill-tools-count">{{ skill.tools.length }} 工具</span>
                </div>
              </label>
              <button class="detail-btn" @click.stop="showSkillDetail(skill)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Tool 选择器 -->
        <div v-if="modeInfo.showToolSelector" class="selection-section">
          <div class="section-header">
            <h4>
              <span class="section-icon">🔧</span>
              {{ config.mode === 'hybrid' ? '额外工具' : '工具' }}
            </h4>
            <span class="selected-count">{{ config.toolIds.length }} 个已选</span>
          </div>
          
          <!-- 混合模式提示 -->
          <div v-if="config.mode === 'hybrid' && config.skillIds.length > 0" class="hybrid-hint">
            <span>💡</span>
            <p>已自动包含选中技能内的工具，这里只显示额外的工具</p>
          </div>
          
          <div class="tool-grid">
            <label
              v-for="tool in availableToolsForSelect"
              :key="tool.name"
              class="tool-chip"
              :class="{ selected: config.toolIds.includes(tool.name) }"
            >
              <input
                type="checkbox"
                :value="tool.name"
                :checked="config.toolIds.includes(tool.name)"
                @change="toggleTool(tool.name)"
              />
              <span class="tool-icon">{{ tool.icon }}</span>
              <span class="tool-name">{{ tool.name }}</span>
            </label>
          </div>
          
          <!-- 空状态 -->
          <div v-if="availableToolsForSelect.length === 0" class="empty-tools">
            <span>🎉</span>
            <p>所有可用工具已包含在选中的技能中</p>
          </div>
        </div>

        <!-- 系统提示词编辑器 -->
        <div v-if="modeInfo.showSystemPrompt" class="selection-section">
          <div class="section-header">
            <h4>
              <span class="section-icon">📝</span>
              系统提示词
            </h4>
          </div>
          <div class="prompt-editor">
            <div class="prompt-templates">
              <button
                v-for="tpl in promptTemplates"
                :key="tpl.id"
                class="template-chip"
                @click="applyTemplate(tpl)"
              >
                {{ tpl.name }}
              </button>
            </div>
            <textarea
              v-model="config.customSystemPrompt"
              rows="6"
              placeholder="定义 AI 的角色、行为和回答风格..."
            />
          </div>
        </div>

        <!-- 模式说明 -->
        <div class="mode-description">
          <h5>{{ modeInfo.name }}</h5>
          <p>{{ modeInfo.description }}</p>
          <div class="features">
            <div class="feature-section">
              <span class="feature-title">特性：</span>
              <ul>
                <li v-for="feature in modeInfo.features" :key="feature">{{ feature }}</li>
              </ul>
            </div>
            <div class="feature-section">
              <span class="feature-title">适用场景：</span>
              <div class="use-cases">
                <span v-for="useCase in modeInfo.useCases" :key="useCase" class="use-case">
                  {{ useCase }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：实时预览 + 能力图谱 -->
      <div class="preview-panel">
        <!-- 系统提示词预览 -->
        <div class="preview-section system-prompt-preview">
          <div class="preview-header">
            <h4>
              <span class="preview-icon">👁️</span>
              实时预览
            </h4>
            <button class="copy-btn" @click="copyPrompt">
              <span>{{ copied ? '✓' : '📋' }}</span>
              {{ copied ? '已复制' : '复制' }}
            </button>
          </div>
          <div class="prompt-preview-content">
            <pre>{{ previewSystemPrompt }}</pre>
          </div>
        </div>

        <!-- 能力图谱（神经网络可视化） -->
        <div class="preview-section capability-graph-section">
          <div class="preview-header">
            <h4>
              <span class="preview-icon">🕸️</span>
              能力图谱
            </h4>
          </div>
          <div class="graph-container">
            <CapabilityGraph :graph="capabilityGraph" />
          </div>
        </div>

        <!-- 已配置能力清单 -->
        <div class="preview-section configured-capabilities">
          <div class="preview-header">
            <h4>
              <span class="preview-icon">📋</span>
              已配置能力
            </h4>
          </div>
          <div class="capabilities-list">
            <!-- Skills -->
            <div v-if="selectedSkills.length > 0" class="capability-group">
              <span class="group-label">技能包</span>
              <div class="group-items">
                <span 
                  v-for="skill in selectedSkills" 
                  :key="skill.id" 
                  class="capability-tag skill-tag"
                  @click="showSkillDetail(skill)"
                >
                  {{ skill.icon }} {{ skill.name }}
                </span>
              </div>
            </div>
            <!-- Tools -->
            <div v-if="effectiveTools.length > 0" class="capability-group">
              <span class="group-label">可用工具</span>
              <div class="group-items">
                <span 
                  v-for="tool in effectiveTools" 
                  :key="tool.name" 
                  class="capability-tag tool-tag"
                  :class="{ 'is-extra': isExtraTool(tool) }"
                >
                  {{ tool.icon }} {{ tool.name }}
                  <span v-if="isExtraTool(tool)" class="extra-indicator">额外</span>
                </span>
              </div>
            </div>
            <!-- 空状态 -->
            <div v-if="selectedSkills.length === 0 && effectiveTools.length === 0" class="empty-capabilities">
              当前模式下未配置任何能力
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="config-footer">
      <button class="btn-secondary" @click="$emit('cancel')">取消</button>
      <button class="btn-primary" @click="save">
        <span>💾</span>
        保存配置
      </button>
    </div>

    <!-- Skill 详情弹窗 -->
    <SkillDetailModal
      :visible="!!viewingSkill"
      :skill="viewingSkill"
      :all-tools="allTools"
      @close="viewingSkill = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAgentConfig } from '../../../core/composables/useAgentConfig'
import { CONFIG_MODES } from '../../../core/types/agent'
import type { Agent, AgentConfigMode, Skill, Tool } from '../../../core/types/agent'
import CapabilityGraph from './CapabilityGraph.vue'
import SkillDetailModal from '../skills/SkillDetailModal.vue'

const props = defineProps<{
  agent: Agent
}>()

const emit = defineEmits<{
  save: [config: Agent['capabilities']]
  cancel: []
}>()

const { 
  skills, 
  allTools, 
  getEffectiveTools, 
  getAvailableExtraTools,
  buildSystemPrompt, 
  generateCapabilityGraph,
  updateAgent
} = useAgentConfig()

// 本地配置状态
const config = ref({
  mode: props.agent.capabilities?.mode || 'raw',
  skillIds: [...(props.agent.capabilities?.skillIds || [])],
  toolIds: [...(props.agent.capabilities?.toolIds || [])],
  customSystemPrompt: props.agent.capabilities?.customSystemPrompt || ''
})

// 复制状态
const copied = ref(false)

// 正在查看的Skill
const viewingSkill = ref<Skill | null>(null)

// 当前模式信息
const modeInfo = computed(() => CONFIG_MODES.find(m => m.id === config.value.mode)!)

// 已选技能
const selectedSkills = computed(() => 
  skills.value.filter(s => config.value.skillIds.includes(s.id))
)

// 混合模式下可用的工具（排除技能中已有的）
const availableToolsForSelect = computed((): Tool[] => {
  if (config.value.mode === 'hybrid') {
    return getAvailableExtraTools(config.value.skillIds)
  }
  return allTools.value
})

// 有效工具
const effectiveTools = computed((): Tool[] => {
  const mockAgent: Agent = {
    ...props.agent,
    capabilities: config.value
  }
  return getEffectiveTools(mockAgent)
})

// 额外工具（不在 skill 中的）
const extraTools = computed(() => {
  const skillToolNames = new Set(selectedSkills.value.flatMap(s => s.tools))
  return effectiveTools.value.filter(t => !skillToolNames.has(t.name))
})

function isExtraTool(tool: Tool): boolean {
  return extraTools.value.some(t => t.name === tool.name)
}

// 能力图谱
const capabilityGraph = computed(() => {
  const mockAgent: Agent = {
    ...props.agent,
    capabilities: config.value
  }
  return generateCapabilityGraph(mockAgent)
})

// 系统提示词预览
const previewSystemPrompt = computed(() => {
  const mockAgent: Agent = {
    ...props.agent,
    capabilities: config.value
  }
  return buildSystemPrompt(mockAgent)
})

// 提示词模板
const promptTemplates = [
  { id: 'default', name: '默认助手', prompt: '你是一个 helpful 的 AI 助手。' },
  { id: 'expert', name: '领域专家', prompt: '你是该领域的资深专家，拥有丰富的实践经验。请提供专业、深入的回答。' },
  { id: 'teacher', name: '耐心导师', prompt: '你是一位耐心的导师，善于用简单易懂的方式解释复杂概念。' },
  { id: 'creative', name: '创意伙伴', prompt: '你是一个富有创意的伙伴，善于头脑风暴和提出新颖的想法。' }
]

// 方法
async function persistConfig() {
  // 确保有有效的 agent id
  if (!props.agent?.id) {
    console.error('[AgentConfigPanel] No agent id available')
    return
  }
  
  // 立即保存到后端
  const result = await updateAgent(props.agent.id, {
    capabilities: { ...config.value }
  })
  
  if (result) {
    console.log('[AgentConfigPanel] Config saved:', result.id)
  } else {
    console.error('[AgentConfigPanel] Failed to save config')
  }
}

async function selectMode(mode: AgentConfigMode) {
  config.value.mode = mode
  
  // 切换模式时清理不相关的内容
  if (mode === 'raw') {
    config.value.skillIds = []
    config.value.toolIds = []
  } else if (mode === 'skills-only') {
    config.value.toolIds = []
    config.value.customSystemPrompt = ''
  } else if (mode === 'tools-only') {
    config.value.skillIds = []
  }
  
  // 混合模式下，清理已选技能中已有的工具
  if (mode === 'hybrid') {
    const skillToolNames = new Set(
      config.value.skillIds
        .map(id => skills.value.find(s => s.id === id)?.tools || [])
        .flat()
    )
    config.value.toolIds = config.value.toolIds.filter(id => !skillToolNames.has(id))
  }
  
  // 立即持久化
  await persistConfig()
}

async function toggleSkill(skillId: string) {
  const index = config.value.skillIds.indexOf(skillId)
  if (index > -1) {
    config.value.skillIds.splice(index, 1)
  } else {
    config.value.skillIds.push(skillId)
  }
  
  // 混合模式下，自动移除技能中已有的工具
  if (config.value.mode === 'hybrid') {
    const skill = skills.value.find(s => s.id === skillId)
    if (skill && index === -1) {
      // 新增技能，移除重复工具
      skill.tools.forEach(toolName => {
        const toolIndex = config.value.toolIds.indexOf(toolName)
        if (toolIndex > -1) {
          config.value.toolIds.splice(toolIndex, 1)
        }
      })
    }
  }
  
  // 立即持久化
  await persistConfig()
}

async function toggleTool(toolName: string) {
  const index = config.value.toolIds.indexOf(toolName)
  if (index > -1) {
    config.value.toolIds.splice(index, 1)
  } else {
    config.value.toolIds.push(toolName)
  }
  
  // 立即持久化
  await persistConfig()
}



function applyTemplate(tpl: typeof promptTemplates[0]) {
  config.value.customSystemPrompt = tpl.prompt
}

async function copyPrompt() {
  try {
    await navigator.clipboard.writeText(previewSystemPrompt.value)
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch (e) {
    console.error('Failed to copy:', e)
  }
}

function showSkillDetail(skill: Skill) {
  viewingSkill.value = skill
}



function save() {
  emit('save', config.value)
}

// 监听 agent 变化
watch(() => props.agent, (newAgent) => {
  config.value = {
    mode: newAgent.capabilities.mode,
    skillIds: [...newAgent.capabilities.skillIds],
    toolIds: [...newAgent.capabilities.toolIds],
    customSystemPrompt: newAgent.capabilities.customSystemPrompt || ''
  }
}, { deep: true })
</script>

<style scoped>
.agent-config-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vp-c-bg);
}

/* ===== 顶部模式选择栏 ===== */
.mode-selector-bar {
  flex-shrink: 0;
  padding: 16px 24px;
  background: linear-gradient(135deg, var(--vp-c-bg-soft) 0%, var(--vp-c-bg) 100%);
  border-bottom: 1px solid var(--vp-c-divider);
}

.mode-tabs {
  display: flex;
  gap: 12px;
}

.mode-tab {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--vp-c-bg);
  border: 2px solid var(--vp-c-divider);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.mode-tab:hover {
  border-color: var(--vp-c-brand-soft);
  transform: translateY(-1px);
}

.mode-tab.active {
  border-color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.mode-tab.is-recommended {
  border-color: #f59e0b;
}

.mode-tab.active.is-recommended {
  background: linear-gradient(135deg, var(--vp-c-brand-soft) 0%, rgba(245, 158, 11, 0.1) 100%);
}

.mode-icon {
  font-size: 24px;
}

.mode-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.mode-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.mode-short {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.recommended-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: 10px;
  font-weight: 600;
  border-radius: 10px;
}

/* ===== 主体内容区 ===== */
.config-body {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 0;
  overflow: hidden;
}

/* ===== 左侧能力选择区 ===== */
.capability-selection {
  padding: 20px 24px;
  overflow-y: auto;
  border-right: 1px solid var(--vp-c-divider);
}

.selection-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.section-icon {
  font-size: 18px;
}

.selected-count {
  padding: 4px 10px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
  font-size: 12px;
  font-weight: 500;
  border-radius: 100px;
}

/* Skill 卡片网格 */
.skill-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.skill-card {
  position: relative;
  display: flex;
  align-items: stretch;
  background: var(--vp-c-bg-soft);
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
}

.skill-card:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
}

.skill-card.selected {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

.skill-card.builtin {
  background: linear-gradient(145deg, var(--vp-c-bg-soft), rgba(59, 130, 246, 0.05));
}

.skill-checkbox {
  flex: 1;
  display: flex;
  padding: 14px;
  cursor: pointer;
}

.skill-checkbox input {
  position: absolute;
  opacity: 0;
}

.skill-content {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.skill-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg);
  border-radius: 10px;
  font-size: 18px;
  flex-shrink: 0;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  margin-bottom: 2px;
}

.skill-desc {
  display: block;
  font-size: 12px;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.4;
}

.skill-tools-count {
  padding: 2px 6px;
  background: var(--vp-c-bg);
  border-radius: 4px;
  font-size: 10px;
  color: var(--vp-c-text-3);
}

.detail-btn {
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-left: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-3);
  cursor: pointer;
  transition: all 0.2s;
}

.detail-btn:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-brand);
}

.detail-btn svg {
  width: 16px;
  height: 16px;
}

/* 混合模式提示 */
.hybrid-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-radius: 8px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #92400e;
}

.hybrid-hint span {
  font-size: 16px;
}

.hybrid-hint p {
  margin: 0;
}

/* Tool 芯片网格 */
.tool-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tool-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid transparent;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-chip:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
}

.tool-chip.selected {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

.tool-chip input {
  position: absolute;
  opacity: 0;
}

.tool-icon {
  font-size: 14px;
}

.tool-name {
  font-size: 13px;
  font-weight: 500;
}

.empty-tools {
  text-align: center;
  padding: 32px;
  color: var(--vp-c-text-3);
}

.empty-tools span {
  font-size: 32px;
  margin-bottom: 8px;
}

.empty-tools p {
  margin: 0;
  font-size: 13px;
}

/* 提示词编辑器 */
.prompt-editor {
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 16px;
}

.prompt-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.template-chip {
  padding: 4px 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 100px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.template-chip:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

.prompt-editor textarea {
  width: 100%;
  padding: 12px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  min-height: 120px;
}

.prompt-editor textarea:focus {
  outline: none;
  border-color: var(--vp-c-brand);
}

/* 模式说明 */
.mode-description {
  padding: 16px;
  background: linear-gradient(145deg, var(--vp-c-bg-soft), transparent);
  border-radius: 12px;
  border-left: 3px solid var(--vp-c-brand);
}

.mode-description h5 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.mode-description > p {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.feature-section {
  font-size: 12px;
}

.feature-title {
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.feature-section ul {
  margin: 4px 0 0 0;
  padding-left: 16px;
  color: var(--vp-c-text-2);
}

.feature-section li {
  margin-bottom: 2px;
}

.use-cases {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.use-case {
  padding: 2px 8px;
  background: var(--vp-c-bg);
  border-radius: 4px;
  font-size: 11px;
  color: var(--vp-c-brand);
}

/* ===== 右侧预览面板 ===== */
.preview-panel {
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg-soft);
  overflow-y: auto;
}

.preview-section {
  padding: 16px 20px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.preview-section:last-child {
  border-bottom: none;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.preview-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.preview-icon {
  font-size: 16px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
}

/* 系统提示词预览 */
.prompt-preview-content {
  max-height: 200px;
  overflow-y: auto;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 12px;
}

.prompt-preview-content pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--vp-c-text-2);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 能力图谱容器 */
.graph-container {
  height: 260px;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}

/* 已配置能力清单 */
.capabilities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.capability-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.group-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.capability-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.capability-tag:hover {
  transform: translateY(-1px);
}

.capability-tag.skill-tag {
  background: linear-gradient(135deg, #dbeafe, #bfdbfe);
  color: #1e40af;
}

.capability-tag.skill-tag:hover {
  background: linear-gradient(135deg, #bfdbfe, #93c5fd);
}

.capability-tag.tool-tag {
  background: linear-gradient(135deg, #dcfce7, #bbf7d0);
  color: #166534;
}

.capability-tag.tool-tag.is-extra {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  color: #92400e;
}

.extra-indicator {
  font-size: 9px;
  padding: 1px 4px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 3px;
}

.empty-capabilities {
  padding: 20px;
  text-align: center;
  color: var(--vp-c-text-3);
  font-size: 13px;
}

/* ===== 底部操作栏 ===== */
.config-footer {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: var(--vp-c-bg);
  border-top: 1px solid var(--vp-c-divider);
}

.btn-secondary {
  padding: 10px 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  color: var(--vp-c-text-1);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--vp-c-bg-mute);
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 24px;
  background: linear-gradient(135deg, var(--vp-c-brand), #8b5cf6);
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .config-body {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  
  .preview-panel {
    border-left: none;
    border-top: 1px solid var(--vp-c-divider);
    max-height: 400px;
  }
  
  .mode-tabs {
    flex-wrap: wrap;
  }
  
  .mode-tab {
    flex: 1 1 calc(50% - 6px);
  }
}
</style>
