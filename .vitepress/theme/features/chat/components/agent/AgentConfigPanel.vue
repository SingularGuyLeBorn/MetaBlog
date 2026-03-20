<template>
  <div class="agent-config">
    <!-- 标签栏 - 液态玻璃 -->
    <LiquidGlass class="tabs-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.4">
      <div class="tabs">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          <Icon :name="tab.icon" class="tab-icon" />
          <span class="tab-text">{{ tab.label }}</span>
        </button>
      </div>
    </LiquidGlass>

    <!-- 内容区 -->
    <div class="content">
      <!-- 能力配置 -->
      <div v-show="currentTab === 'capabilities'" class="panel">
        <div class="layout">
          <!-- 左侧 -->
          <div class="main-col">
            <!-- 基础角色 -->
            <LiquidGlass class="card-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.3">
              <div class="card-inner">
                <label class="field-label">
                  <Icon name="user" class="label-icon" />
                  基础角色
                  <span class="badge">必需</span>
                </label>
                <div class="chips">
                  <LiquidGlass
                    v-for="tpl in baseRoleTemplates"
                    :key="tpl.id"
                    class="chip-glass"
                    glow-color="var(--sr-morandi-green, #a8b3a8)"
                    :intensity="0.2"
                  >
                    <button class="chip" @click="applyBaseRoleTemplate(tpl)">
                      {{ tpl.name }}
                    </button>
                  </LiquidGlass>
                </div>
                <textarea
                  v-model="config.baseRole"
                  class="lg-input"
                  rows="4"
                  placeholder="定义 Agent 的基础身份..."
                  @blur="persistConfig"
                />
              </div>
            </LiquidGlass>

            <!-- 角色补充 -->
            <LiquidGlass class="card-glass" glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
              <div class="card-inner">
                <label class="field-label">
                  <Icon name="file-text" class="label-icon" />
                  角色补充
                  <span class="badge optional">可选</span>
                </label>
                <textarea
                  v-model="config.roleSupplement"
                  class="lg-input"
                  rows="3"
                  placeholder="补充角色的特殊要求或背景..."
                  @blur="persistConfig"
                />
              </div>
            </LiquidGlass>

            <!-- Skills -->
            <LiquidGlass class="card-glass" glow-color="#f59e0b" :intensity="0.3">
              <div class="card-inner">
                <label class="field-label">
                  <Icon name="zap" class="label-icon" />
                  可用 Skills
                </label>
                <div class="skills-list">
                  <LiquidGlass
                    v-for="skill in skills"
                    :key="skill.id"
                    class="skill-item-glass"
                    :glow-color="isSkillEnabled(skill.id) ? 'var(--sr-accent-star, #b8a090)' : '#e2e8f0'"
                    :intensity="isSkillEnabled(skill.id) ? 0.4 : 0.15"
                  >
                    <div class="skill-item" @click="toggleSkill(skill.id)">
                      <div class="skill-check" :class="{ checked: isSkillEnabled(skill.id) }">
                        <Icon v-if="isSkillEnabled(skill.id)" name="check" class="check-icon" />
                      </div>
                      <span class="skill-icon">{{ skill.icon }}</span>
                      <div class="skill-info">
                        <div class="skill-name">{{ skill.name }}</div>
                        <div class="skill-desc">{{ skill.description }}</div>
                      </div>
                      <button class="skill-detail-btn" @click.stop="showSkillDetail(skill)">
                        <Icon name="info" />
                      </button>
                    </div>
                  </LiquidGlass>
                </div>
              </div>
            </LiquidGlass>
          </div>

          <!-- 右侧预览 -->
          <div class="side-col">
            <LiquidGlass class="preview-glass" glow-color="#06b6d4" :intensity="0.3">
              <div class="preview-header">
                <Icon name="code" class="preview-icon" />
                <span class="preview-title">系统提示词</span>
                <button class="preview-btn" @click="copyPrompt">
                  <Icon :name="copied ? 'check' : 'copy'" />
                  {{ copied ? '已复制' : '复制' }}
                </button>
              </div>
              <pre class="preview-content">{{ previewSystemPrompt }}</pre>
            </LiquidGlass>

            <LiquidGlass class="stats-glass" glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.2">
              <div class="stats-inner">
                <div class="stat-item">
                  <Icon name="zap" class="stat-icon" />
                  <span class="stat-label">已启用 Skills</span>
                  <span class="stat-value">{{ enabledSkills.length }}</span>
                </div>
                <div class="stat-item">
                  <Icon name="tool" class="stat-icon" />
                  <span class="stat-label">可用工具</span>
                  <span class="stat-value">{{ totalToolsCount }}</span>
                </div>
              </div>
            </LiquidGlass>
          </div>
        </div>
      </div>

      <!-- 触发器 -->
      <TriggerPanel
        v-show="currentTab === 'triggers'"
        :agent="agent"
        @save="onTriggerSave"
        @cancel="currentTab = 'capabilities'"
      />

      <!-- 模型 -->
      <ModelPanel
        v-show="currentTab === 'model'"
        :agent="agent"
        @change="onModelChange"
      />

      <!-- 记忆 -->
      <div v-show="currentTab === 'memory'" class="panel">
        <LiquidGlass class="memory-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.3">
          <div class="memory-inner">
            <label class="lg-toggle">
              <input v-model="memoryConfig.enabled" type="checkbox" @change="saveMemory" />
              <span class="lg-toggle-slider" :class="{ on: memoryConfig.enabled }" />
              <span class="toggle-label">
                <Icon name="database" />
                启用长期记忆
              </span>
            </label>
            <textarea
              v-if="memoryConfig.enabled"
              v-model="memoryConfig.content"
              class="lg-input memory-textarea"
              rows="12"
              placeholder="在此输入需要 Agent 记住的长期信息..."
              @blur="saveMemory"
            />
            <div v-else class="empty-state">
              <Icon name="moon" class="empty-icon" />
              <p>长期记忆已禁用</p>
              <span class="empty-desc">开启后 Agent 将记住跨对话的信息</span>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>

    <!-- 底部按钮 -->
    <LiquidGlass class="footer-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.3">
      <div class="footer">
        <LiquidGlass glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
          <button class="lg-btn" @click="emit('cancel')">
            <Icon name="x" />
            取消
          </button>
        </LiquidGlass>
        <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.5">
          <button class="lg-btn lg-btn-primary" @click="save">
            <Icon name="save" />
            保存配置
          </button>
        </LiquidGlass>
      </div>
    </LiquidGlass>

    <!-- Skill 详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="viewingSkill" class="modal-overlay" @click.self="viewingSkill = null">
          <SkillDetailModal :skill="viewingSkill" @close="viewingSkill = null" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { Agent, Skill } from '../../../core/types/agent'
import { useAgentConfig } from '../../../core/composables/useAgentConfig'
import SkillDetailModal from '../skills/SkillDetailModal.vue'
import TriggerPanel from './TriggerPanel.vue'
import ModelPanel from './ModelPanel.vue'
import Icon from '../../../shared/Icon.vue'
import LiquidGlass from '../../../shared/LiquidGlass.vue'

const props = defineProps<{ agent: Agent }>()
const emit = defineEmits<{
  save: [config: Agent['capabilities']]
  cancel: []
}>()

const { skills, updateAgent } = useAgentConfig()

const tabs = [
  { id: 'capabilities', label: '能力配置', icon: 'sliders' },
  { id: 'triggers', label: '触发器', icon: 'clock' },
  { id: 'model', label: '模型', icon: 'cpu' },
  { id: 'memory', label: '记忆', icon: 'database' }
]

const currentTab = ref('capabilities')

const config = ref({
  baseRole: '',
  roleSupplement: '',
  skillIds: [] as string[]
})

const memoryConfig = ref({
  enabled: props.agent.memory?.enabled || false,
  content: props.agent.memory?.content || ''
})

const copied = ref(false)
const viewingSkill = ref<Skill | null>(null)

function initConfig() {
  config.value = {
    baseRole: props.agent.capabilities?.customSystemPrompt || `你是 ${props.agent.name}`,
    roleSupplement: '',
    skillIds: [...(props.agent.capabilities?.skillIds || skills.value?.map(s => s.id) || [])]
  }
}

const enabledSkills = computed(() => skills.value.filter(s => config.value.skillIds.includes(s.id)))
const totalToolsCount = computed(() => enabledSkills.value.reduce((sum, s) => sum + (s.tools?.length || 0), 0))

const previewSystemPrompt = computed(() => {
  let prompt = `## 身份\n${config.value.baseRole}\n\n`
  if (config.value.roleSupplement) prompt += `## 补充\n${config.value.roleSupplement}\n\n`
  if (enabledSkills.value.length > 0) {
    prompt += `## 可用 Skills\n`
    for (const s of enabledSkills.value) prompt += `- ${s.icon} **${s.name}** (\`${s.id}\`): ${s.description}\n`
    prompt += `\n加载方式: \`[使用 Skill: <id>]\``
  }
  return prompt
})

const baseRoleTemplates = [
  { id: 'default', name: '通用助手', prompt: '你是 Kimi，一个有帮助的 AI 助手。' },
  { id: 'expert', name: '领域专家', prompt: '你是该领域的资深专家，注重细节。' },
  { id: 'teacher', name: '耐心导师', prompt: '你是一位耐心的导师，善于解释复杂概念。' },
  { id: 'creative', name: '创意伙伴', prompt: '你富有创意，善于头脑风暴。' },
  { id: 'analyst', name: '分析师', prompt: '你是数据分析师，逻辑清晰。' },
  { id: 'writer', name: '写作专家', prompt: '你是专业的写作专家，对语言敏感。' }
]

async function persistConfig() {
  if (!props.agent?.id) return
  await updateAgent(props.agent.id, {
    capabilities: { 
      customSystemPrompt: config.value.baseRole,
      skillIds: config.value.skillIds
    }
  })
}

function isSkillEnabled(id: string) { return config.value.skillIds.includes(id) }

async function toggleSkill(id: string) {
  const i = config.value.skillIds.indexOf(id)
  i > -1 ? config.value.skillIds.splice(i, 1) : config.value.skillIds.push(id)
  await persistConfig()
}

function applyBaseRoleTemplate(tpl: typeof baseRoleTemplates[0]) {
  config.value.baseRole = tpl.prompt
  persistConfig()
}

async function copyPrompt() {
  await navigator.clipboard.writeText(previewSystemPrompt.value)
  copied.value = true
  setTimeout(() => copied.value = false, 2000)
}

function showSkillDetail(s: Skill) { viewingSkill.value = s }

function onTriggerSave(data: { type: string; config: any }) {
  const names: Record<string, string> = { manual: '手动', scheduled: '定时', event: '事件', webhook: 'Webhook' }
  // triggers 不在 AgentUpdateParams 中，需要类型断言
  const updates: any = {
    triggers: [{ id: `trigger-${Date.now()}`, type: data.type as any, name: names[data.type], enabled: true, config: data.config }]
  }
  updateAgent(props.agent.id, updates)
  currentTab.value = 'capabilities'
}

function onModelChange(id: string, p: any) {
  // runtime 不在 AgentUpdateParams 中，需要类型断言
  const updates: any = {
    runtime: { model: id, temperature: p.temperature, maxTokens: p.maxTokens, topP: p.topP, frequencyPenalty: p.frequencyPenalty, enableReasoning: p.enableReasoning, timeout: 60, retryCount: 3, retryDelay: 1 }
  }
  updateAgent(props.agent.id, updates)
}

function save() { emit('save', { mode: 'raw' as const, customSystemPrompt: config.value.baseRole, skillIds: config.value.skillIds, toolIds: [] }) }
async function saveMemory() {
  await updateAgent(props.agent.id, { memory: { ...props.agent.memory, enabled: memoryConfig.value.enabled, content: memoryConfig.value.content } })
}

watch(() => props.agent, () => {
  initConfig()
  memoryConfig.value = { enabled: props.agent.memory?.enabled || false, content: props.agent.memory?.content || '' }
}, { deep: true })

onMounted(initConfig)
</script>

<style scoped>
@import '../../../../shared/styles/liquid-glass-theme.css';

.agent-config {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 标签栏 */
.tabs-glass {
  margin: 16px 24px;
  border-radius: 16px;
}

.tabs {
  display: flex;
  gap: 8px;
  padding: 8px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: transparent;
  border: none;
  border-radius: 12px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab:hover {
  color: var(--sr-text-primary, #1a1a2e);
  background: rgba(255, 255, 255, 0.4);
}

.tab.active {
  color: white;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  box-shadow: 0 4px 12px rgba(184, 160, 144, 0.25);
}

.tab-icon {
  width: 18px;
  height: 18px;
}

/* 内容区 */
.content {
  flex: 1;
  overflow: auto;
  padding: 0 24px 24px;
}

.panel {
  max-width: 1200px;
  margin: 0 auto;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 24px;
}

.main-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.side-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 卡片 */
.card-glass {
  border-radius: 24px;
}

.card-inner {
  padding: 28px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.label-icon {
  width: 20px;
  height: 20px;
  color: var(--sr-accent-star, #b8a090);
}

.badge {
  padding: 4px 10px;
  background: rgba(184, 160, 144, 0.15);
  border: 1px solid rgba(184, 160, 144, 0.2);
  border-radius: 20px;
  color: var(--sr-morandi-purple, #b3a8b8);
  font-size: 11px;
  font-weight: 700;
  margin-left: auto;
}

.badge.optional {
  background: rgba(100, 116, 139, 0.15);
  border-color: rgba(100, 116, 139, 0.2);
  color: var(--sr-text-muted, #94a3b8);
}

/* 模板芯片 */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.chip-glass {
  display: inline-block;
  border-radius: 20px;
}

.chip {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.chip:hover {
  color: var(--sr-morandi-green, #a8b3a8);
}

/* Skills 列表 */
.skills-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.skill-item-glass {
  border-radius: 16px;
}

.skill-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  cursor: pointer;
}

.skill-check {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: all 0.3s ease;
}

.skill-check.checked {
  background: rgba(184, 160, 144, 0.2);
  border-color: var(--sr-accent-star, #b8a090);
}

.check-icon {
  width: 14px;
  height: 14px;
  color: var(--sr-accent-star, #b8a090);
}

.skill-icon {
  font-size: 24px;
}

.skill-info {
  flex: 1;
}

.skill-name {
  font-weight: 600;
  font-size: 15px;
  color: var(--sr-text-primary, #1a1a2e);
  margin-bottom: 2px;
}

.skill-desc {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.skill-detail-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 8px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.skill-item:hover .skill-detail-btn {
  opacity: 1;
}

.skill-detail-btn:hover {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-accent-star, #b8a090);
}

/* 预览卡片 */
.preview-glass {
  border-radius: 24px;
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.preview-icon {
  width: 20px;
  height: 20px;
  color: #06b6d4;
}

.preview-title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--sr-text-muted, #94a3b8);
}

.preview-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(6, 182, 212, 0.1);
  border: none;
  border-radius: 10px;
  color: #0891b2;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.preview-btn:hover {
  background: rgba(6, 182, 212, 0.2);
}

.preview-btn svg {
  width: 14px;
  height: 14px;
}

.preview-content {
  margin: 0;
  padding: 24px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-wrap;
  max-height: 400px;
  overflow: auto;
}

/* 统计卡片 */
.stats-glass {
  border-radius: 20px;
}

.stats-inner {
  padding: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-icon {
  width: 20px;
  height: 20px;
  color: var(--sr-morandi-green, #a8b3a8);
}

.stat-label {
  flex: 1;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: var(--sr-morandi-green, #a8b3a8);
}

/* 记忆 */
.memory-glass {
  border-radius: 24px;
  max-width: 700px;
  margin: 0 auto;
}

.memory-inner {
  padding: 28px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 15px;
  color: var(--sr-text-primary, #1a1a2e);
}

.toggle-label svg {
  width: 18px;
  height: 18px;
  color: var(--sr-accent-star, #b8a090);
}

.memory-textarea {
  margin-top: 20px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px;
  text-align: center;
}

.empty-icon {
  width: 56px;
  height: 56px;
  color: #cbd5e1;
}

.empty-state p {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-muted, #94a3b8);
}

.empty-desc {
  font-size: 13px;
  color: #94a3b8;
}

/* 底部 */
.footer-glass {
  margin: 0 24px 24px;
  border-radius: 16px;
}

.footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px;
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

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
  }
  
  .side-col {
    order: -1;
  }
}
</style>
