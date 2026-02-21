<!--
  AgentAdmin - Agent 管理中心
  
  液态玻璃风格的后台管理面板
  - 显示当前激活 Agent 的卡片
  - 按等级分组管理所有 Agents
  - 完整的 CRUD 功能
  - 座次管理系统
-->
<template>
  <Teleport to="body">
    <Transition name="admin-fade">
      <div v-if="visible" class="agent-admin-overlay" @click.self="close">
        <div class="agent-admin-panel">
          <!-- 头部 -->
          <div class="admin-header">
            <div class="header-left">
              <div class="header-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 2a10 10 0 1 0 10 10H12V2z"/>
                  <path d="M12 2a10 10 0 0 1 10 10"/>
                  <path d="M12 12 2.5 9.5"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div class="header-titles">
                <h2 class="header-title">Agent 控制中心</h2>
                <p class="header-subtitle">管理和配置您的 AI 智能体</p>
              </div>
            </div>
            <div class="header-actions">
              <button class="header-btn tools" @click="showTools = true">
                <span class="btn-icon">🛠️</span>
                <span>工具</span>
              </button>
              <button class="header-btn memory" @click="showMemory = true">
                <span class="btn-icon">🧠</span>
                <span>记忆</span>
              </button>
              <button class="header-btn stats" @click="showStats = true">
                <span class="btn-icon">📊</span>
                <span>统计</span>
              </button>
              <button class="header-btn create" @click="openCreateForm">
                <span class="btn-icon">+</span>
                <span>新建 Agent</span>
              </button>
              <button class="header-btn close" @click="close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- 当前激活 Agent 卡片（突出显示） -->
          <div class="active-agent-section">
            <div class="section-header">
              <span class="section-icon">⭐</span>
              <span class="section-title">当前使用的 Agent</span>
              <span class="section-hint">点击卡片查看详情或切换其他 Agent</span>
            </div>
            <div class="active-agent-card-wrapper">
              <AgentCard 
                v-if="activeAgent"
                :agent="activeAgent"
                :is-active="true"
                @click="openDetail(activeAgent)"
                @edit="openEditForm"
                @delete="confirmDelete"
              />
            </div>
            <!-- 使用指引 -->
            <div class="usage-guide">
              <div class="guide-item">
                <span class="guide-icon">🎯</span>
                <span class="guide-text">当前 Agent 将用于 AI 对话</span>
              </div>
              <div class="guide-item">
                <span class="guide-icon">🛠️</span>
                <span class="guide-text">顶部工具栏可配置技能、记忆、工具</span>
              </div>
              <div class="guide-item">
                <span class="guide-icon">👇</span>
                <span class="guide-text">点击下方其他 Agent 卡片可切换</span>
              </div>
            </div>
          </div>

          <!-- 主体内容区 -->
          <div class="admin-body">
            <!-- 左侧：等级筛选 -->
            <div class="level-sidebar">
              <div class="sidebar-title">等级筛选</div>
              <div class="level-filters">
                <button
                  v-for="(config, level) in LEVEL_CONFIG"
                  :key="level"
                  class="level-filter"
                  :class="{ active: selectedLevel === level, disabled: agentsByLevel[level as AgentLevel].length === 0 }"
                  @click="selectedLevel = selectedLevel === level ? null : level"
                >
                  <span class="filter-icon" :style="{ background: config.color }">{{ config.icon }}</span>
                  <div class="filter-info">
                    <span class="filter-name">{{ config.label }}</span>
                    <span class="filter-count">{{ agentsByLevel[level as AgentLevel].length }}</span>
                  </div>
                </button>
                <button
                  class="level-filter all"
                  :class="{ active: selectedLevel === null }"
                  @click="selectedLevel = null"
                >
                  <span class="filter-icon" style="background: linear-gradient(135deg, #3b82f6, #8b5cf6)">🌐</span>
                  <div class="filter-info">
                    <span class="filter-name">全部 Agent</span>
                    <span class="filter-count">{{ agents?.length ?? 0 }}</span>
                  </div>
                </button>
              </div>
            </div>

            <!-- 右侧：Agent 列表 -->
            <div class="agents-content">
              <!-- 按等级分组显示 -->
              <template v-if="selectedLevel === null">
                <div 
                  v-for="([level, agents]) in Object.entries(displayedAgentsByLevel)" 
                  :key="level"
                  class="agent-group"
                >
                  <div v-if="agents" class="group-header">
                    <div class="group-title">
                      <span class="group-icon">{{ LEVEL_CONFIG[level as AgentLevel].icon }}</span>
                      <span>{{ LEVEL_CONFIG[level as AgentLevel].label }}</span>
                      <span class="group-count">({{ (agents as Agent[])?.length ?? 0 }})</span>
                    </div>
                    <div class="group-line"></div>
                  </div>
                  <div v-if="agents" class="agent-grid">
                    <AgentCard
                      v-for="agent in (agents as Agent[])"
                      :key="agent.id"
                      :agent="agent"
                      :is-active="agent.id === activeAgentId"
                      @click="openDetail(agent)"
                      @edit="openEditForm"
                      @delete="confirmDelete"
                    />
                  </div>
                </div>
              </template>

              <!-- 按选定等级显示 -->
              <div v-else class="agent-group single">
                <div class="group-header">
                  <div class="group-title">
                    <span class="group-icon">{{ LEVEL_CONFIG[selectedLevel].icon }}</span>
                    <span>{{ LEVEL_CONFIG[selectedLevel].label }}</span>
                    <span class="group-count">({{ filteredAgents.length }})</span>
                  </div>
                  <div class="group-line"></div>
                </div>
                <div class="agent-grid">
                  <AgentCard
                    v-for="agent in filteredAgents"
                    :key="agent.id"
                    :agent="agent"
                    :is-active="agent.id === activeAgentId"
                    @click="openDetail(agent)"
                    @edit="openEditForm"
                    @delete="confirmDelete"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Agent 详情弹窗 -->
    <AgentDetail
      v-if="detailAgent"
      :agent="detailAgent"
      :visible="showDetail"
      @close="showDetail = false"
      @activate="activateAgent"
      @edit="openEditForm"
    />

    <!-- Agent 表单弹窗（创建/编辑） -->
    <AgentForm
      v-if="formAgent || showCreateForm"
      :agent="formAgent"
      :visible="showForm"
      @close="closeForm"
      @save="saveAgent"
    />

    <!-- 统计弹窗 -->
    <AgentStats
      :visible="showStats"
      :stats="agentStats"
      @close="showStats = false"
    />

    <!-- 记忆管理弹窗 -->
    <MemoryManager
      :visible="showMemory"
      @close="showMemory = false"
    />

    <!-- 工具管理弹窗 -->
    <ToolsManager
      :visible="showTools"
      @close="showTools = false"
    />

    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="deleteConfirm" class="confirm-overlay" @click.self="deleteConfirm = null">
          <div class="confirm-dialog">
            <div class="confirm-icon">⚠️</div>
            <h4>确认删除</h4>
            <p>确定要删除 Agent "{{ deleteConfirm.name }}" 吗？此操作无法撤销。</p>
            <div class="confirm-actions">
              <button class="btn-secondary" @click="deleteConfirm = null">取消</button>
              <button class="btn-danger" @click="doDelete">删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAgents, LEVEL_CONFIG, type Agent, type AgentLevel } from '../../../core/composables/useAgents'
import AgentCard from './AgentCard.vue'
import AgentDetail from './AgentDetail.vue'
import AgentForm from './AgentForm.vue'
import AgentStats from './AgentStats.vue'
import { MemoryManager } from '../memory'
import { ToolsManager } from '../tools'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'agent-change': [agent: Agent]
}>()

const {
  agents,
  activeAgentId,
  activeAgent,
  agentsByLevel,
  sortedAgents,
  setActive,
  create,
  update,
  remove,
  getStats
} = useAgents()

const selectedLevel = ref<AgentLevel | null>(null)
const showDetail = ref(false)
const showForm = ref(false)
const showStats = ref(false)
const showMemory = ref(false)
const showTools = ref(false)
const showCreateForm = ref(false)
const detailAgent = ref<Agent | null>(null)
const formAgent = ref<Agent | null>(null)
const deleteConfirm = ref<Agent | null>(null)

// 按等级过滤后的 Agents（过滤空组和当前激活的 Agent，避免重复显示）
const displayedAgentsByLevel = computed(() => {
  const result: Partial<Record<AgentLevel, Agent[]>> = {}
  ;(['meta', 'core', 'fixed', 'custom', 'temp'] as AgentLevel[]).forEach(level => {
    const list = agentsByLevel.value[level].filter(a => a.id !== activeAgentId.value)
    if (list.length > 0) {
      result[level] = list
    }
  })
  return result
})

// 按选定等级过滤
const filteredAgents = computed(() => {
  if (!selectedLevel.value) return sortedAgents.value
  return agentsByLevel.value[selectedLevel.value]
})

// 统计
const agentStats = computed(() => getStats())

// 关闭面板
function close() {
  emit('update:visible', false)
}

// 打开详情
function openDetail(agent: Agent) {
  detailAgent.value = agent
  showDetail.value = true
}

// 激活 Agent
function activateAgent(agent: Agent) {
  setActive(agent.id)
  emit('agent-change', agent)
  showDetail.value = false
}

// 打开创建表单
function openCreateForm() {
  formAgent.value = null
  showCreateForm.value = true
  showForm.value = true
}

// 打开编辑表单
function openEditForm(agent: Agent) {
  formAgent.value = agent
  showCreateForm.value = false
  showForm.value = true
}

// 关闭表单
function closeForm() {
  showForm.value = false
  showCreateForm.value = false
  formAgent.value = null
}

// 保存 Agent
function saveAgent(data: Partial<Agent>) {
  if (formAgent.value) {
    // 编辑
    update(formAgent.value.id, data)
  } else {
    // 创建
    const newAgent = create({
      name: data.name || '未命名 Agent',
      description: data.description || '',
      level: (data.level as AgentLevel) || 'custom',
      avatar: data.avatar,
      skills: data.skills,
      systemPrompt: data.systemPrompt
    })
    // 如果是第一个自定义 Agent，自动激活
    if (agents.value.filter(a => a.level === 'custom').length === 1) {
      setActive(newAgent.id)
    }
  }
  closeForm()
}

// 确认删除
function confirmDelete(agent: Agent) {
  deleteConfirm.value = agent
}

// 执行删除
function doDelete() {
  if (deleteConfirm.value) {
    remove(deleteConfirm.value.id)
    deleteConfirm.value = null
  }
}
</script>

<style scoped>
/* 覆盖层 */
.agent-admin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

/* 主面板 - 液态玻璃风格 */
.agent-admin-panel {
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.3) inset;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 头部 */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 14px;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.header-icon svg {
  width: 26px;
  height: 26px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.header-btn.memory {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.header-btn.memory:hover {
  background: rgba(139, 92, 246, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
}

.header-btn.tools {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.header-btn.tools:hover {
  background: rgba(245, 158, 11, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.header-btn.stats {
  background: rgba(255, 255, 255, 0.8);
  color: var(--vp-c-text-1);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.header-btn.stats:hover {
  background: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-btn.create {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.header-btn.create:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.header-btn.close {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  color: var(--vp-c-text-2);
}

.header-btn.close:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.header-btn.close svg {
  width: 20px;
  height: 20px;
}

.btn-icon {
  font-size: 16px;
}

/* 当前激活 Agent 区域 */
.active-agent-section {
  padding: 20px 24px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.section-icon {
  font-size: 18px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.active-agent-card-wrapper {
  max-width: 320px;
}

.active-agent-card-wrapper :deep(.agent-card) {
  border: 2px solid #3b82f6;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.2);
}

.section-hint {
  margin-left: auto;
  font-size: 12px;
  color: var(--vp-c-text-2);
  font-weight: 400;
}

/* 使用指引 */
.usage-guide {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  border: 1px dashed rgba(59, 130, 246, 0.3);
}

.guide-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.guide-icon {
  font-size: 14px;
}

.guide-text {
  white-space: nowrap;
}

/* 主体内容区 */
.admin-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧边栏 */
.level-sidebar {
  width: 220px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.4);
  border-right: 1px solid rgba(0, 0, 0, 0.06);
  overflow-y: auto;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 16px;
}

.level-filters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.level-filter {
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

.level-filter:hover {
  background: white;
  border-color: rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.level-filter.active {
  background: white;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.level-filter.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.filter-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border-radius: 10px;
  flex-shrink: 0;
}

.filter-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.filter-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.filter-count {
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* 右侧内容 */
.agents-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.agent-group {
  margin-bottom: 32px;
}

.agent-group:last-child {
  margin-bottom: 0;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  color: var(--vp-c-text-1);
  white-space: nowrap;
}

.group-icon {
  font-size: 18px;
}

.group-count {
  font-size: 13px;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

.group-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.1), transparent);
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

/* 确认对话框 */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
}

.confirm-dialog {
  background: white;
  padding: 28px;
  border-radius: 16px;
  text-align: center;
  max-width: 360px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.confirm-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.confirm-dialog h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
}

.confirm-dialog p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn-secondary {
  padding: 10px 20px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-1);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn-danger {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

/* 动画 */
.admin-fade-enter-active,
.admin-fade-leave-active {
  transition: all 0.3s ease;
}

.admin-fade-enter-from,
.admin-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* 深色模式 */
.dark .agent-admin-panel {
  background: rgba(25, 25, 35, 0.85);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .admin-header {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .header-title {
  background: linear-gradient(135deg, #fff, #60a5fa);
  -webkit-background-clip: text;
}

.dark .active-agent-section {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
}

.dark .level-sidebar {
  background: rgba(0, 0, 0, 0.2);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .level-filter {
  background: rgba(255, 255, 255, 0.05);
}

.dark .level-filter:hover {
  background: rgba(255, 255, 255, 0.1);
}

.dark .confirm-dialog {
  background: #1e1e2e;
}

/* 响应式 */
@media (max-width: 900px) {
  .admin-body {
    flex-direction: column;
  }
  
  .level-sidebar {
    width: 100%;
    padding: 16px;
    border-right: none;
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  }
  
  .level-filters {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .agent-grid {
    grid-template-columns: 1fr;
  }
}
</style>
