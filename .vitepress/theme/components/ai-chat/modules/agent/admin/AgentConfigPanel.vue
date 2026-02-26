<!--
  AgentConfigPanel - Agent 配置面板（液态玻璃升级版）
  
  改进：
  - 混合模式下工具去重
  - Skill点击显示详情
  - 更紧凑的布局
  - 新增触发器配置选项卡
  - 新增模型选择选项卡
  - 液态玻璃视觉效果
-->
<template>
  <div class="agent-config-liquid">
    <!-- 顶部标签栏（液态玻璃） -->
    <div class="liquid-tabs-bar">
      <div class="liquid-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="liquid-tab"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <div class="tab-liquid-bg" />
          <div class="tab-glow" />
        </button>
      </div>
    </div>

    <!-- 配置内容区 -->
    <div class="config-content-liquid">
      <!-- 能力配置选项卡 -->
      <div v-show="currentTab === 'capabilities'" class="tab-panel">
        <div class="panel-grid">
          <!-- 左侧：能力选择 -->
          <div class="capability-panel">
            <!-- 模式选择 -->
            <div class="mode-section">
              <h4 class="section-title">
                <span class="title-icon">🎛️</span>
                配置模式
              </h4>
              <div class="mode-cards">
                <button
                  v-for="mode in CONFIG_MODES"
                  :key="mode.id"
                  class="mode-card"
                  :class="{ 
                    active: config.mode === mode.id,
                    recommended: mode.id === 'hybrid'
                  }"
                  @click="selectMode(mode.id)"
                >
                  <span class="mode-card-icon">{{ mode.icon }}</span>
                  <div class="mode-card-info">
                    <span class="mode-card-name">{{ mode.name }}</span>
                    <span class="mode-card-desc">{{ mode.shortDesc }}</span>
                  </div>
                  <div v-if="mode.id === 'hybrid'" class="recommend-badge">推荐</div>
                </button>
              </div>
            </div>

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
              
              <div v-if="availableToolsForSelect.length === 0" class="empty-tools">
                <span>🎉</span>
                <p>所有可用工具已包含在选中的技能中</p>
              </div>
            </div>

            <!-- 系统提示词编辑器（所有模式都显示） -->
            <div v-if="modeInfo.showSystemPrompt" class="selection-section">
              <div class="section-header">
                <h4>
                  <span class="section-icon">📝</span>
                  系统提示词
                  <span v-if="config.mode !== 'raw'" class="optional-badge">可选</span>
                  <span v-else class="required-badge">必填</span>
                </h4>
                <span class="header-hint">
                  {{ config.mode === 'raw' ? '定义 AI 的核心角色和能力' : '用于补充或覆盖技能包的提示词' }}
                </span>
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
          </div>

          <!-- 右侧：实时预览 -->
          <div class="preview-panel">
            <div class="preview-card">
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

            <div class="preview-card">
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

            <div class="preview-card">
              <div class="preview-header">
                <h4>
                  <span class="preview-icon">📋</span>
                  已配置能力
                </h4>
              </div>
              <div class="capabilities-list">
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
                <div v-if="selectedSkills.length === 0 && effectiveTools.length === 0" class="empty-capabilities">
                  当前模式下未配置任何能力
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 触发器配置选项卡 -->
      <div v-show="currentTab === 'triggers'" class="tab-panel">
        <TriggerConfig
          :agent-id="agent.id"
          :initial-config="triggerConfig"
          @save="onTriggerSave"
          @cancel="currentTab = 'capabilities'"
        />
      </div>

      <!-- 模型配置选项卡 -->
      <div v-show="currentTab === 'model'" class="tab-panel">
        <div class="model-panel-liquid">
          <ModelSelector
            :model-id="selectedModel"
            :initial-params="modelParams"
            @change="onModelChange"
          />
        </div>
      </div>

      <!-- 记忆配置选项卡 -->
      <div v-show="currentTab === 'memory'" class="tab-panel">
        <div class="memory-panel-liquid">
          <div class="memory-config">
            <div class="memory-toggle">
              <div class="toggle-info">
                <h4>🧠 长期记忆</h4>
                <p>Agent 将记住重要信息并在后续对话中使用</p>
              </div>
              <label class="liquid-toggle">
                <input type="checkbox" v-model="memoryConfig.enabled" />
                <span class="toggle-slider">
                  <span class="toggle-glow" />
                </span>
              </label>
            </div>
            
            <div v-if="memoryConfig.enabled" class="memory-content">
              <textarea
                v-model="memoryConfig.content"
                rows="10"
                placeholder="输入 Agent 需要记住的信息..."
                class="memory-textarea"
              />
              <div class="memory-actions">
                <button class="btn-liquid secondary" @click="clearMemory">
                  🗑️ 清空
                </button>
                <button class="btn-liquid primary" @click="saveMemory">
                  💾 保存记忆
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div class="config-footer-liquid">
      <button class="btn-liquid secondary" @click="$emit('cancel')">
        <span class="btn-ripple" />
        <span class="btn-text">取消</span>
      </button>
      <button class="btn-liquid primary" @click="save">
        <span class="btn-ripple" />
        <span class="btn-glow" />
        <span class="btn-text">💾 保存配置</span>
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
import TriggerConfig from './TriggerConfig.vue'
import ModelSelector from './ModelSelector.vue'

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

// 选项卡
const tabs = [
  { id: 'capabilities', label: '能力配置', icon: '⚡' },
  { id: 'triggers', label: '触发器', icon: '⏰' },
  { id: 'model', label: '模型', icon: '🤖' },
  { id: 'memory', label: '记忆', icon: '🧠' }
]

const currentTab = ref('capabilities')

// 能力配置
const config = ref({
  mode: props.agent.capabilities?.mode || 'raw',
  skillIds: [...(props.agent.capabilities?.skillIds || [])],
  toolIds: [...(props.agent.capabilities?.toolIds || [])],
  customSystemPrompt: props.agent.capabilities?.customSystemPrompt || ''
})

// 触发器配置
type TriggerType = 'manual' | 'scheduled' | 'event' | 'webhook'

interface TriggerConfigData {
  type: TriggerType
  manual: { requireConfirmation: boolean }
  scheduled: { cron: string; timezone: string }
  event: { eventName: string; eventFilter: { path: string } }
  webhook: { webhookSecret: string }
}

const triggerConfig = ref<TriggerConfigData>({
  type: 'manual',
  manual: { requireConfirmation: false },
  scheduled: { cron: '0 9 * * *', timezone: 'Asia/Shanghai' },
  event: { eventName: 'article.created', eventFilter: { path: '' } },
  webhook: { webhookSecret: '' }
})

// 模型配置
const selectedModel = ref('deepseek-chat')
const modelParams = ref({
  temperature: 0.7,
  maxTokens: 2048,
  topP: 0.95,
  frequencyPenalty: 0
})

// 记忆配置
const memoryConfig = ref({
  enabled: props.agent.memory?.enabled || false,
  content: props.agent.memory?.content || ''
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

// 混合模式下可用的工具
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

// 额外工具
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
  if (!props.agent?.id) {
    console.error('[AgentConfigPanel] No agent id available')
    return
  }
  
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
  
  if (mode === 'raw') {
    config.value.skillIds = []
    config.value.toolIds = []
  } else if (mode === 'skills-only') {
    config.value.toolIds = []
    config.value.customSystemPrompt = ''
  } else if (mode === 'tools-only') {
    config.value.skillIds = []
  }
  
  if (mode === 'hybrid') {
    const skillToolNames = new Set(
      config.value.skillIds
        .map(id => skills.value.find(s => s.id === id)?.tools || [])
        .flat()
    )
    config.value.toolIds = config.value.toolIds.filter(id => !skillToolNames.has(id))
  }
  
  await persistConfig()
}

async function toggleSkill(skillId: string) {
  const index = config.value.skillIds.indexOf(skillId)
  if (index > -1) {
    config.value.skillIds.splice(index, 1)
  } else {
    config.value.skillIds.push(skillId)
  }
  
  if (config.value.mode === 'hybrid') {
    const skill = skills.value.find(s => s.id === skillId)
    if (skill && index === -1) {
      skill.tools.forEach(toolName => {
        const toolIndex = config.value.toolIds.indexOf(toolName)
        if (toolIndex > -1) {
          config.value.toolIds.splice(toolIndex, 1)
        }
      })
    }
  }
  
  await persistConfig()
}

async function toggleTool(toolName: string) {
  const index = config.value.toolIds.indexOf(toolName)
  if (index > -1) {
    config.value.toolIds.splice(index, 1)
  } else {
    config.value.toolIds.push(toolName)
  }
  
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

function onTriggerSave(newConfig: TriggerConfigData) {
  triggerConfig.value = newConfig
  // 保存到后端
  updateAgent(props.agent.id, {
    triggers: [{
      id: `trigger-${Date.now()}`,
      type: newConfig.type,
      name: getTriggerName(newConfig.type),
      enabled: true,
      config: newConfig[newConfig.type] as Record<string, unknown>
    }]
  })
  currentTab.value = 'capabilities'
}

function getTriggerName(type: string): string {
  const names: Record<string, string> = {
    manual: '手动触发',
    scheduled: '定时触发',
    event: '事件触发',
    webhook: 'Webhook'
  }
  return names[type] || type
}

function onModelChange(modelId: string, params: typeof modelParams.value) {
  selectedModel.value = modelId
  modelParams.value = params
  // 保存到后端
  updateAgent(props.agent.id, {
    runtime: {
      model: modelId,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
      topP: params.topP,
      frequencyPenalty: params.frequencyPenalty,
      timeout: 60,
      retryCount: 3,
      retryDelay: 1
    }
  })
}

function clearMemory() {
  memoryConfig.value.content = ''
}

async function saveMemory() {
  await updateAgent(props.agent.id, {
    memory: {
      ...props.agent.memory,
      enabled: memoryConfig.value.enabled,
      content: memoryConfig.value.content
    }
  })
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
  memoryConfig.value = {
    enabled: newAgent.memory?.enabled || false,
    content: newAgent.memory?.content || ''
  }
}, { deep: true })
</script>

<style scoped>
/* ===== 液态玻璃配置面板 ===== */
.agent-config-liquid {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, 
    rgba(248, 250, 252, 0.8) 0%, 
    rgba(241, 245, 249, 0.6) 100%
  );
}

/* ===== 顶部液态标签栏 ===== */
.liquid-tabs-bar {
  flex-shrink: 0;
  padding: 16px 24px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.7) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
}

.liquid-tabs {
  display: flex;
  gap: 8px;
}

.liquid-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.liquid-tab:hover {
  color: #3b82f6;
}

.tab-liquid-bg {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.1) 0%, 
    rgba(139, 92, 246, 0.05) 100%
  );
  border-radius: 12px;
  opacity: 0;
  transform: scale(0.9);
  transition: all 0.3s ease;
}

.liquid-tab.active .tab-liquid-bg {
  opacity: 1;
  transform: scale(1);
}

.tab-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.liquid-tab.active .tab-glow {
  opacity: 0.3;
}

.liquid-tab.active {
  color: #3b82f6;
  font-weight: 600;
}

.tab-icon {
  position: relative;
  z-index: 1;
  font-size: 16px;
}

.tab-label {
  position: relative;
  z-index: 1;
}

/* ===== 配置内容区 ===== */
.config-content-liquid {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.tab-panel {
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px;
  animation: panel-fade-in 0.4s ease;
}

@keyframes panel-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.panel-grid {
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 20px;
  height: 100%;
}

/* ===== 能力面板 ===== */
.capability-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  overflow-y: auto;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 700;
  color: #374151;
}

.title-icon {
  font-size: 18px;
}

/* 模式选择卡片 */
.mode-section {
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
}

.mode-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.mode-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.mode-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.1);
}

.mode-card.active {
  background: linear-gradient(145deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05));
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
}

.mode-card-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.8));
  border-radius: 10px;
  font-size: 20px;
}

.mode-card.active .mode-card-icon {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

.mode-card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mode-card-name {
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
}

.mode-card-desc {
  font-size: 11px;
  color: #64748b;
}

.recommend-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  padding: 2px 8px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white;
  font-size: 9px;
  font-weight: 700;
  border-radius: 10px;
}

/* 选择区域 */
.selection-section {
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
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
  font-size: 14px;
  font-weight: 600;
}

.section-icon {
  font-size: 16px;
}

.selected-count {
  padding: 4px 10px;
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  font-size: 11px;
  font-weight: 600;
  border-radius: 100px;
}

.optional-badge,
.required-badge {
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.optional-badge {
  background: rgba(148, 163, 184, 0.15);
  color: #64748b;
  border: 1px solid rgba(148, 163, 184, 0.2);
}

.required-badge {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.header-hint {
  font-size: 12px;
  color: #64748b;
  font-weight: 400;
}

/* Skill 网格 */
.skill-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-card {
  position: relative;
  display: flex;
  align-items: stretch;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.skill-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.08);
}

.skill-card.selected {
  background: linear-gradient(145deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.04));
  border-color: rgba(59, 130, 246, 0.5);
}

.skill-checkbox {
  flex: 1;
  display: flex;
  padding: 12px;
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
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.9), rgba(241, 245, 249, 0.8));
  border-radius: 10px;
  font-size: 18px;
}

.skill-info {
  flex: 1;
  min-width: 0;
}

.skill-name {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 2px;
}

.skill-desc {
  display: block;
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.skill-tools-count {
  padding: 2px 6px;
  background: rgba(241, 245, 249, 0.8);
  border-radius: 4px;
  font-size: 10px;
  color: #94a3b8;
}

.detail-btn {
  width: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-left: 1px solid rgba(226, 232, 240, 0.8);
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.detail-btn:hover {
  color: #3b82f6;
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
  font-size: 12px;
  color: #92400e;
}

.hybrid-hint span {
  font-size: 14px;
}

.hybrid-hint p {
  margin: 0;
}

/* Tool 网格 */
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
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-chip:hover {
  border-color: rgba(59, 130, 246, 0.3);
}

.tool-chip.selected {
  background: linear-gradient(145deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.05));
  border-color: rgba(59, 130, 246, 0.5);
}

.tool-chip input {
  position: absolute;
  opacity: 0;
}

.tool-icon {
  font-size: 14px;
}

.tool-name {
  font-size: 12px;
  font-weight: 500;
}

.empty-tools {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
}

.empty-tools span {
  font-size: 28px;
}

.empty-tools p {
  margin: 8px 0 0 0;
  font-size: 12px;
}

/* 提示词编辑器 */
.prompt-editor {
  background: rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  padding: 14px;
}

.prompt-templates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.template-chip {
  padding: 4px 10px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 100px;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.template-chip:hover {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-color: transparent;
}

.prompt-editor textarea {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  min-height: 120px;
  outline: none;
  transition: all 0.2s;
}

.prompt-editor textarea:focus {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* ===== 预览面板 ===== */
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-card {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  overflow: hidden;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.preview-header h4 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}

.preview-icon {
  font-size: 15px;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 8px;
  font-size: 11px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border-color: transparent;
}

.prompt-preview-content {
  max-height: 200px;
  overflow-y: auto;
  padding: 12px 16px;
  background: rgba(248, 250, 252, 0.8);
}

.prompt-preview-content pre {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: #475569;
  white-space: pre-wrap;
  word-break: break-word;
}

.graph-container {
  height: 220px;
  padding: 12px;
}

.capabilities-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px 16px;
}

.capability-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-label {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
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
  font-size: 11px;
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
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 12px;
}

/* ===== 模型面板 ===== */
.model-panel-liquid {
  max-width: 800px;
}

/* ===== 记忆面板 ===== */
.memory-panel-liquid {
  max-width: 600px;
}

.memory-config {
  padding: 20px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
}

.memory-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.toggle-info h4 {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 700;
  color: #1e293b;
}

.toggle-info p {
  margin: 0;
  font-size: 13px;
  color: #64748b;
}

/* 液态开关 */
.liquid-toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
}

.liquid-toggle input {
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
  background: linear-gradient(145deg, #e2e8f0, #cbd5e1);
  transition: 0.3s;
  border-radius: 28px;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-glow {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.liquid-toggle input:checked + .toggle-slider {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
}

.liquid-toggle input:checked + .toggle-slider .toggle-glow {
  transform: translateX(24px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
}

.memory-content {
  margin-top: 16px;
}

.memory-textarea {
  width: 100%;
  padding: 14px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(226, 232, 240, 0.8);
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.6;
  resize: vertical;
  min-height: 150px;
  outline: none;
  transition: all 0.2s;
}

.memory-textarea:focus {
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.memory-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 14px;
}

/* ===== 底部操作栏 ===== */
.config-footer-liquid {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.7) 0%,
    rgba(255, 255, 255, 0.9) 100%
  );
  border-top: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
}

.btn-liquid {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-liquid.secondary {
  color: #64748b;
  background: rgba(241, 245, 249, 0.8);
}

.btn-liquid.secondary:hover {
  background: rgba(226, 232, 240, 0.8);
}

.btn-liquid.primary {
  color: white;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.35);
}

.btn-liquid.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.45);
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  border-radius: 12px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.btn-liquid:hover .btn-glow {
  opacity: 0.6;
}

.btn-text {
  position: relative;
  z-index: 1;
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }
  
  .preview-panel {
    order: -1;
  }
}

@media (max-width: 640px) {
  .mode-cards {
    grid-template-columns: 1fr;
  }
  
  .liquid-tabs {
    flex-wrap: wrap;
  }
  
  .liquid-tab {
    flex: 1 1 calc(50% - 4px);
    justify-content: center;
  }
}
</style>
