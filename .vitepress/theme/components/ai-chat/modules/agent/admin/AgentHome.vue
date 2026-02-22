<!--
  AgentHome - Agent 管理首页
  
  设计特点：
  - 卡片式布局，展示所有 Agent
  - 顶部工具栏：新建、搜索、筛选
  - 统计概览：总数、在线数、技能数等
  - 每个卡片显示：头像、名称、状态、技能、操作
  - 点击卡片进入详情配置
-->
<template>
  <div class="agent-home">
    <!-- 顶部工具栏 -->
    <header class="home-header">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-icon">🤖</span>
          <span>Agent 管理</span>
        </h1>
        <p class="page-subtitle">管理和配置您的 AI 智能助手</p>
      </div>
      
      <div class="header-actions">
        <!-- 搜索框 -->
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索 Agent..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <!-- 筛选下拉 -->
        <select v-model="filterLevel" class="filter-select">
          <option value="">全部等级</option>
          <option value="meta">元 Agent</option>
          <option value="core">核心 Agent</option>
          <option value="fixed">固定 Agent</option>
          <option value="custom">自定义 Agent</option>
        </select>
        
        <!-- 新建按钮 -->
        <button class="btn-create" @click="openCreateDialog">
          <span class="btn-icon">+</span>
          <span>新建 Agent</span>
        </button>
      </div>
    </header>
    
    <!-- 统计概览 -->
    <section class="stats-section">
      <div class="stat-card">
        <div class="stat-icon total">🤖</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.total }}</span>
          <span class="stat-label">总 Agent</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon online">🟢</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.online }}</span>
          <span class="stat-label">在线</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon skills">🎯</div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalSkills }}</span>
          <span class="stat-label">技能总数</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon calls">📞</div>
        <div class="stat-info">
          <span class="stat-value">{{ formatNumber(stats.totalCalls) }}</span>
          <span class="stat-label">总调用</span>
        </div>
      </div>
    </section>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-state">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h3>加载失败</h3>
      <p>{{ error }}</p>
      <button class="btn-retry" @click="init">重试</button>
    </div>
    
    <!-- Agent 卡片网格 -->
    <section v-else class="agents-grid">
      <div v-if="filteredAgents.length === 0" class="empty-state">
        <div class="empty-icon">🤖</div>
        <h3>还没有 Agent</h3>
        <p>点击右上角按钮创建您的第一个 AI 助手</p>
        <button class="btn-create-empty" @click="openCreateDialog">
          创建 Agent
        </button>
      </div>
      
      <template v-else>
        <AgentCard
          v-for="agent in filteredAgents"
          :key="agent.id"
          :agent="agent"
          :is-active="agent.id === activeAgentId"
          @click="openAgentDetail(agent)"
          @edit="openEditDialog(agent)"
          @delete="confirmDelete(agent)"
          @toggle-status="toggleAgentStatus(agent)"
        />
      </template>
    </section>
    
    <!-- 新建/编辑对话框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDialog" class="dialog-overlay" @click.self="closeDialog">
          <div class="dialog-content">
            <div class="dialog-header">
              <h3>{{ editingAgent ? '编辑 Agent' : '新建 Agent' }}</h3>
              <button class="btn-close" @click="closeDialog">✕</button>
            </div>
            
            <div class="dialog-body">
              <div class="form-group">
                <label>名称 *</label>
                <input
                  v-model="form.name"
                  type="text"
                  placeholder="给 Agent 起个名字"
                  class="form-input"
                />
              </div>
              
              <div class="form-group">
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
              
              <div class="form-group">
                <label>描述</label>
                <textarea
                  v-model="form.description"
                  rows="3"
                  placeholder="描述这个 Agent 的用途..."
                  class="form-textarea"
                ></textarea>
              </div>
              
              <div class="form-group">
                <label>等级</label>
                <select v-model="form.level" class="form-select">
                  <option value="custom">自定义 Agent</option>
                  <option value="fixed">固定 Agent</option>
                  <option value="core">核心 Agent</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>系统提示词</label>
                <textarea
                  v-model="form.systemPrompt"
                  rows="5"
                  placeholder="定义 Agent 的角色和行为..."
                  class="form-textarea code"
                ></textarea>
              </div>
            </div>
            
            <div class="dialog-footer">
              <button class="btn-secondary" @click="closeDialog">取消</button>
              <button
                class="btn-primary"
                :disabled="!form.name.trim() || isSaving"
                @click="saveAgent"
              >
                {{ editingAgent ? '保存' : '创建' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 删除确认对话框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="dialog-overlay" @click.self="showDeleteConfirm = false">
          <div class="dialog-content confirm">
            <div class="confirm-icon">⚠️</div>
            <h3>确认删除</h3>
            <p>确定要删除 Agent "{{ agentToDelete?.name }}" 吗？此操作无法撤销。</p>
            <div class="dialog-footer">
              <button class="btn-secondary" @click="showDeleteConfirm = false">取消</button>
              <button class="btn-danger" @click="deleteAgent">删除</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import AgentCard from './AgentCard.vue'
import { useAgents, type Agent, type AgentCreateParams, LEVEL_CONFIG } from '../../../core/composables/useAgents'

const props = defineProps<{
  activeAgentId: string | null
}>()

const emit = defineEmits<{
  'select-agent': [agent: Agent]
  'agent-change': [agent: Agent]
}>()

const { agents, isLoading, error, init, create, update, remove, setActive } = useAgents()

// 初始化加载
onMounted(() => {
  init()
})

// 搜索和筛选
const searchQuery = ref('')
const filterLevel = ref('')

// 对话框状态
const showDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingAgent = ref<Agent | null>(null)
const agentToDelete = ref<Agent | null>(null)

// 表单数据
const form = reactive({
  name: '',
  avatar: '🤖',
  description: '',
  level: 'custom' as const,
  systemPrompt: ''
})

// 头像选项
const avatarOptions = ['🤖', '👩‍💻', '👨‍💻', '🎨', '✍️', '🔬', '📊', '💼', '🎭', '🔮']

// 过滤后的 Agent
const filteredAgents = computed(() => {
  let result = agents.value
  
  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    )
  }
  
  // 等级过滤
  if (filterLevel.value) {
    result = result.filter(a => a.level === filterLevel.value)
  }
  
  // 排序：默认 Agent 在前，然后按座次
  return result.sort((a, b) => {
    if (a.isDefault) return -1
    if (b.isDefault) return 1
    return a.seat - b.seat
  })
})

// 统计数据
const stats = computed(() => {
  const total = agents.value.length
  const online = agents.value.filter(a => a.status === 'online').length
  const totalSkills = agents.value.reduce((sum, a) => sum + a.skills.length, 0)
  const totalCalls = agents.value.reduce((sum, a) => sum + a.callCount, 0)
  return { total, online, totalSkills, totalCalls }
})

// 打开新建对话框
function openCreateDialog() {
  editingAgent.value = null
  form.name = ''
  form.avatar = '🤖'
  form.description = ''
  form.level = 'custom'
  form.systemPrompt = ''
  showDialog.value = true
}

// 打开编辑对话框
function openEditDialog(agent: Agent) {
  editingAgent.value = agent
  form.name = agent.name
  form.avatar = agent.avatar
  form.description = agent.description
  form.level = agent.level
  form.systemPrompt = agent.systemPrompt
  showDialog.value = true
}

// 关闭对话框
function closeDialog() {
  showDialog.value = false
  editingAgent.value = null
}

// 保存 Agent
const isSaving = ref(false)

async function saveAgent() {
  if (!form.name.trim()) return
  
  isSaving.value = true
  try {
    if (editingAgent.value) {
      // 更新现有 Agent
      await update(editingAgent.value.id, {
        name: form.name.trim(),
        avatar: form.avatar,
        description: form.description.trim(),
        level: form.level as AgentCreateParams['level'],
        systemPrompt: form.systemPrompt.trim()
      })
    } else {
      // 创建新 Agent
      const newAgent = await create({
        name: form.name.trim(),
        avatar: form.avatar,
        description: form.description.trim(),
        level: form.level as AgentCreateParams['level'],
        systemPrompt: form.systemPrompt.trim()
      })
      emit('agent-change', newAgent)
    }
    closeDialog()
  } catch (e) {
    alert('保存失败: ' + e)
  } finally {
    isSaving.value = false
  }
}

// 确认删除
function confirmDelete(agent: Agent) {
  agentToDelete.value = agent
  showDeleteConfirm.value = true
}

// 删除 Agent
async function deleteAgent() {
  if (agentToDelete.value) {
    try {
      await remove(agentToDelete.value.id)
      showDeleteConfirm.value = false
      agentToDelete.value = null
    } catch (e) {
      alert('删除失败: ' + e)
    }
  }
}

// 切换 Agent 状态
async function toggleAgentStatus(agent: Agent) {
  const newStatus = agent.status === 'online' ? 'offline' : 'online'
  try {
    await update(agent.id, { status: newStatus })
  } catch (e) {
    alert('状态更新失败: ' + e)
  }
}

// 打开 Agent 详情
function openAgentDetail(agent: Agent) {
  emit('select-agent', agent)
}

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}
</script>

<style scoped>
.agent-home {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 24px;
  overflow-y: auto;
}

/* 顶部工具栏 */
.home-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 24px;
}

.header-left {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 4px 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.title-icon {
  font-size: 32px;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 搜索框 */
.search-box {
  position: relative;
}

.search-input {
  width: 240px;
  padding: 10px 14px 10px 38px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

/* 筛选下拉 */
.filter-select {
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  outline: none;
  cursor: pointer;
}

/* 新建按钮 */
.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.btn-icon {
  font-size: 18px;
  font-weight: 400;
}

/* 统计概览 */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--vp-c-bg);
  border-radius: 12px;
}

.stat-icon.total { background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1)); }
.stat-icon.online { background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.1)); }
.stat-icon.skills { background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 88, 12, 0.1)); }
.stat-icon.calls { background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(124, 58, 237, 0.1)); }

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.stat-label {
  font-size: 13px;
  color: var(--vp-c-text-2);
}

/* Agent 网格 */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.empty-state p {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.btn-create-empty {
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-create-empty:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* 加载状态 */
.loading-state,
.error-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.error-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.error-state p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.btn-retry {
  padding: 10px 20px;
  background: var(--vp-c-brand);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

/* 对话框 */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.dialog-content {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  background: var(--vp-c-bg);
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-content.confirm {
  max-width: 400px;
  text-align: center;
  padding: 32px;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 18px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-close:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}

.dialog-body {
  padding: 24px;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--vp-c-divider);
}

/* 表单样式 */
.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.form-textarea.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

/* 头像选择器 */
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
  font-size: 20px;
  background: var(--vp-c-bg-soft);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-option:hover {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-divider);
}

.avatar-option.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand);
}

/* 按钮样式 */
.btn-secondary,
.btn-primary,
.btn-danger {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary {
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.btn-secondary:hover {
  background: var(--vp-c-bg);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-danger {
  background: #ef4444;
  border: none;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
}

/* 确认对话框 */
.confirm-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.dialog-content.confirm h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.dialog-content.confirm p {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .dialog-content,
.modal-leave-to .dialog-content {
  transform: scale(0.95);
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .home-header {
    flex-direction: column;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .search-box,
  .search-input {
    width: 100%;
  }
  
  .stats-section {
    grid-template-columns: 1fr;
  }
  
  .agents-grid {
    grid-template-columns: 1fr;
  }
}
</style>
