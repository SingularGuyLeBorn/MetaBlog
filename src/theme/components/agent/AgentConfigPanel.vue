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
                    <div class="skill-card" @click="toggleSkill(skill.id)">
                      <div class="skill-card-header">
                        <div class="skill-check" :class="{ checked: isSkillEnabled(skill.id) }">
                          <Icon v-if="isSkillEnabled(skill.id)" name="check" class="check-icon" />
                        </div>
                        <button class="skill-detail-btn" @click.stop="showSkillDetail(skill)">
                          <Icon name="info" />
                        </button>
                      </div>
                      <div class="skill-card-body">
                        <span class="skill-icon">{{ skill.icon }}</span>
                        <div class="skill-name">{{ skill.name }}</div>
                        <div class="skill-desc">{{ skill.description }}</div>
                      </div>
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
        <div class="layout">
          <div class="main-col">
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

                <div v-if="memoryConfig.enabled" class="agent-memories">
                  <div class="memory-toolbar">
                    <span class="memory-count">{{ agentMemories.length }} 条记忆</span>
                    <button class="add-memory-btn" @click="openAddMemoryModal">
                      <Icon name="plus" :size="14" />
                      添加
                    </button>
                  </div>
                  <div v-if="agentMemories.length === 0" class="memory-empty">
                    <Icon name="database" class="empty-icon" />
                    <p>暂无专属记忆</p>
                    <span>Agent 会在对话中自动学习和存储记忆</span>
                  </div>
                  <div v-else class="memory-list">
                    <LiquidGlass
                      v-for="mem in agentMemories"
                      :key="mem.id"
                      class="memory-item-glass"
                      :glow-color="getCategoryColor(mem.category)"
                      :intensity="0.15"
                    >
                      <div class="memory-item">
                        <div class="memory-content">
                          <p class="memory-text">{{ mem.content }}</p>
                          <div class="memory-meta">
                            <span class="memory-cat">{{ getCategoryLabel(mem.category) }}</span>
                            <span class="memory-time">{{ formatTime(mem.createdAt) }}</span>
                          </div>
                        </div>
                        <button class="memory-delete" @click="deleteAgentMemory(mem.id)">
                          <Icon name="x" :size="14" />
                        </button>
                      </div>
                    </LiquidGlass>
                  </div>
                </div>

                <div v-else class="empty-state">
                  <Icon name="moon" class="empty-icon" />
                  <p>长期记忆已禁用</p>
                  <span class="empty-desc">开启后 Agent 将记住跨对话的信息</span>
                </div>
              </div>
            </LiquidGlass>
          </div>

          <div class="side-col">
            <LiquidGlass class="stats-glass" glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.2">
              <div class="stats-inner">
                <div class="stat-item">
                  <Icon name="database" class="stat-icon" />
                  <span class="stat-label">记忆总数</span>
                  <span class="stat-value">{{ agentMemories.length }}</span>
                </div>
                <div class="stat-item">
                  <Icon name="trending-up" class="stat-icon" />
                  <span class="stat-label">今日新增</span>
                  <span class="stat-value">{{ todayMemories }}</span>
                </div>
              </div>
            </LiquidGlass>
          </div>
        </div>
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

    <!-- 添加记忆弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddMemoryModal" class="modal-overlay" @click.self="closeAddMemoryModal">
          <LiquidGlass class="memory-modal-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.4">
            <div class="memory-modal">
              <div class="memory-modal-header">
                <h3>添加记忆</h3>
                <button class="close-btn" @click="closeAddMemoryModal">
                  <Icon name="x" />
                </button>
              </div>
              <div class="memory-modal-body">
                <div class="form-group">
                  <label>记忆内容</label>
                  <textarea
                    v-model="newMemoryContent"
                    rows="3"
                    class="lg-input"
                    placeholder="输入 Agent 需要记住的信息..."
                    @keydown.ctrl.enter="confirmAddMemory"
                  />
                </div>
                <div class="form-group">
                  <label>分类</label>
                  <DropdownSelect
                    v-model="newMemoryCategory"
                    :options="memoryCategories"
                    placeholder="选择分类"
                  />
                </div>
              </div>
              <div class="memory-modal-footer">
                <LiquidGlass glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
                  <button class="lg-btn" @click="closeAddMemoryModal">取消</button>
                </LiquidGlass>
                <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.5">
                  <button class="lg-btn lg-btn-primary" @click="confirmAddMemory">
                    <Icon name="plus" />
                    添加
                  </button>
                </LiquidGlass>
              </div>
            </div>
          </LiquidGlass>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { useAgentConfig } from '@/theme/stores/agentStore'
import type { Agent, Skill } from '@/theme/types/agent'
import { formatDate } from '@/theme/utils/formatDate'
import { computed, onMounted, ref, watch } from 'vue'
import SkillDetailModal from './SkillDetailModal.vue'
import TriggerPanel from './TriggerPanel.vue'
import ModelPanel from './ModelPanel.vue'
import { DropdownSelect, Icon, LiquidGlass } from '@/theme/components/common'

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

const agentMemories = ref<any[]>([])

// 添加记忆弹窗
const showAddMemoryModal = ref(false)
const newMemoryContent = ref('')
const newMemoryCategory = ref('fact')
const memoryCategories = [
  { value: 'preference', label: '用户偏好', icon: '👤' },
  { value: 'skill', label: '技能记忆', icon: '🛠️' },
  { value: 'fact', label: '事实知识', icon: '📚' },
  { value: 'session', label: '会话上下文', icon: '💬' },
  { value: 'default', label: '通用记忆', icon: '🤖' }
]

function openAddMemoryModal() {
  newMemoryContent.value = ''
  newMemoryCategory.value = 'fact'
  showAddMemoryModal.value = true
}

function closeAddMemoryModal() {
  showAddMemoryModal.value = false
  newMemoryContent.value = ''
  newMemoryCategory.value = 'fact'
}

async function confirmAddMemory() {
  const content = newMemoryContent.value.trim()
  if (!content) return
  try {
    const res = await fetch('/api/memories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        agentName: props.agent.name,
        agentId: props.agent.id,
        category: newMemoryCategory.value,
        importance: 0.7
      })
    })
    const json = await res.json()
    if (json.success) {
      await loadAgentMemories()
      closeAddMemoryModal()
    } else {
      alert('添加失败: ' + (json.error || '未知错误'))
    }
  } catch (e) { alert('添加失败: 网络错误') }
}

const categoryMap: Record<string, { label: string; color: string }> = {
  preference: { label: '用户偏好', color: 'var(--sr-morandi-blue, #9daab8)' },
  skill: { label: '技能记忆', color: 'var(--sr-morandi-green, #a8b3a8)' },
  fact: { label: '事实知识', color: 'var(--sr-accent-star, #b8a090)' },
  session: { label: '会话上下文', color: 'var(--sr-morandi-pink, #d4b8b8)' },
  default: { label: '通用记忆', color: 'var(--sr-accent-star, #b8a090)' }
}

function getCategoryLabel(cat?: string) { return categoryMap[cat || '']?.label || categoryMap.default.label }
function getCategoryColor(cat?: string) { return categoryMap[cat || '']?.color || categoryMap.default.color }
function formatTime(ts: number): string {
  return formatDate(ts)
}

async function loadAgentMemories() {
  try {
    const res = await fetch('/api/memories')
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      agentMemories.value = json.data.filter((m: any) => (m.agentId || '') === props.agent.id)
    }
  } catch (e) { console.error('[AgentConfig] 加载记忆失败:', e) }
}

async function addQuickMemory() {
  openAddMemoryModal()
}

async function deleteAgentMemory(id: string) {
  if (!confirm('确定删除这条记忆吗?')) return
  try {
    const res = await fetch('/api/memories/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const json = await res.json()
    if (json.success) agentMemories.value = agentMemories.value.filter(m => m.id !== id)
    else alert('删除失败: ' + (json.error || '未知错误'))
  } catch (e) { alert('删除失败: 网络错误') }
}

const todayMemories = computed(() => {
  const todayStart = new Date().setHours(0, 0, 0, 0)
  return agentMemories.value.filter(m => (m.createdAt || 0) >= todayStart).length
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
  { id: 'default', name: '通用助手', prompt: '你是 Kimi,一个有帮助的 AI 助手. ' },
  { id: 'expert', name: '领域专家', prompt: '你是该领域的资深专家,注重细节. ' },
  { id: 'teacher', name: '耐心导师', prompt: '你是一位耐心的导师,善于解释复杂概念. ' },
  { id: 'creative', name: '创意伙伴', prompt: '你富有创意,善于头脑风暴. ' },
  { id: 'analyst', name: '分析师', prompt: '你是数据分析师,逻辑清晰. ' },
  { id: 'writer', name: '写作专家', prompt: '你是专业的写作专家,对语言敏感. ' }
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
  // triggers 不在 AgentUpdateParams 中,需要类型断言
  const updates: any = {
    triggers: [{ id: `trigger-${Date.now()}`, type: data.type as any, name: names[data.type], enabled: true, config: data.config }]
  }
  updateAgent(props.agent.id, updates)
}

function onModelChange(config: { model: string; temperature: number; maxTokens: number }) {
  const updates: any = {
    runtime: { model: config.model, temperature: config.temperature, maxTokens: config.maxTokens, timeout: 60, retryCount: 3, retryDelay: 1 }
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
  loadAgentMemories()
}, { deep: true })

onMounted(() => {
  initConfig()
  loadAgentMemories()
})
</script>

<style scoped>
/* Star River 风格 */

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

/* Skills 卡片网格 */
.skills-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  max-height: 420px;
  overflow-y: auto;
  padding-right: 4px;
}

.skill-item-glass {
  border-radius: 16px;
}

.skill-card {
  display: flex;
  flex-direction: column;
  padding: 14px;
  cursor: pointer;
  min-height: 150px;
}

.skill-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.skill-card-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  gap: 8px;
}

.skill-check {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 7px;
  transition: all 0.3s ease;
}

.skill-check.checked {
  background: rgba(184, 160, 144, 0.2);
  border-color: var(--sr-accent-star, #b8a090);
}

.check-icon {
  width: 12px;
  height: 12px;
  color: var(--sr-accent-star, #b8a090);
}

.skill-icon {
  font-size: 32px;
  line-height: 1;
}

.skill-name {
  font-weight: 600;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  line-height: 1.3;
}

.skill-desc {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
  line-height: 1.5;
  overflow-wrap: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.skill-detail-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 6px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.skill-card:hover .skill-detail-btn {
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
  max-height: 640px;
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

.memory-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  margin-bottom: 12px;
}

.memory-count {
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

.add-memory-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(184, 160, 144, 0.15);
  border: 1px solid rgba(184, 160, 144, 0.2);
  border-radius: 10px;
  color: var(--sr-morandi-purple, #b3a8b8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-memory-btn:hover {
  background: rgba(184, 160, 144, 0.25);
}

.memory-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 48px;
  text-align: center;
}

.memory-empty .empty-icon {
  width: 40px;
  height: 40px;
  color: #cbd5e1;
}

.memory-empty p {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--sr-text-muted, #94a3b8);
}

.memory-empty span {
  font-size: 13px;
  color: #94a3b8;
}

/* 添加记忆弹窗 */
.memory-modal-glass {
  width: 90%;
  max-width: 440px;
  border-radius: 24px;
}

.memory-modal {
  padding: 24px;
}

.memory-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.memory-modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.memory-modal-body .form-group {
  margin-bottom: 16px;
}

.memory-modal-body .form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.memory-modal-body textarea.lg-input {
  width: 100%;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(200, 195, 188, 0.4);
  border-radius: 12px;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  resize: vertical;
  transition: all 0.2s;
}

.memory-modal-body textarea.lg-input:hover,
.memory-modal-body textarea.lg-input:focus {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(184, 160, 144, 0.4);
  outline: none;
}

.memory-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.memory-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.memory-item-glass {
  border-radius: 16px;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 20px;
}

.memory-content {
  flex: 1;
  min-width: 0;
}

.memory-text {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--sr-text-primary, #1a1a2e);
  word-break: break-word;
}

.memory-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.memory-cat {
  padding: 2px 8px;
  background: rgba(184, 160, 144, 0.12);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--sr-morandi-purple, #b3a8b8);
}

.memory-time {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.memory-delete {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.memory-item:hover .memory-delete {
  opacity: 1;
}

.memory-delete:hover {
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
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
