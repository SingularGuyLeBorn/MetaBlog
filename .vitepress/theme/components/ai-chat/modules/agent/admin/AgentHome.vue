<!--
  AgentHome - 3D 液态玻璃风格首页
-->
<template>
  <div class="agent-home-3d">
    <!-- 背景光效 -->
    <div class="ambient-light"></div>
    
    <!-- 头部 -->
    <header class="home-header" :style="headerTransform">
      <div class="header-left">
        <h1 class="page-title">
          <span class="title-glow">🤖</span>
          <span>Agent 管理</span>
        </h1>
        <p class="page-subtitle">管理和配置您的 AI 智能助手</p>
      </div>
      
      <div class="header-actions">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索 Agent..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <select v-model="filterLevel" class="filter-select">
          <option value="">全部等级</option>
          <option value="meta">元 Agent</option>
          <option value="core">核心 Agent</option>
          <option value="fixed">固定 Agent</option>
          <option value="custom">自定义 Agent</option>
        </select>
        
        <button class="btn-create-3d" @click="openCreateDialog">
          <span class="btn-icon">+</span>
          <span>新建 Agent</span>
        </button>
      </div>
    </header>
    
    <!-- 统计卡片 - 悬浮效果 -->
    <section class="stats-float">
      <div 
        v-for="(stat, index) in statsList" 
        :key="index"
        class="stat-card-3d"
        :style="{ animationDelay: `${index * 0.1}s` }"
      >
        <div class="stat-glow" :class="stat.type"></div>
        <div class="stat-content">
          <span class="stat-icon">{{ stat.icon }}</span>
          <div class="stat-info">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-label">{{ stat.label }}</span>
          </div>
        </div>
      </div>
    </section>
    
    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-3d">
      <div class="loading-ring"></div>
      <p>加载中...</p>
    </div>
    
    <!-- 错误状态 -->
    <div v-else-if="error" class="error-3d">
      <div class="error-icon">⚠️</div>
      <h3>加载失败</h3>
      <p>{{ error }}</p>
      <button class="btn-retry" @click="init">重试</button>
    </div>
    
    <!-- Agent 网格 -->
    <section v-else class="agents-grid-3d">
      <div v-if="filteredAgents.length === 0" class="empty-3d">
        <div class="empty-icon">🤖</div>
        <h3>还没有 Agent</h3>
        <p>点击右上角按钮创建您的第一个 AI 助手</p>
        <button class="btn-create-empty" @click="openCreateDialog">
          创建 Agent
        </button>
      </div>
      
      <template v-else>
        <AgentCard
          v-for="(agent, index) in filteredAgents"
          :key="agent.id"
          :agent="agent"
          :is-active="agent.id === activeAgentId"
          @click="openAgentDetail(agent)"
          @edit="openEditDialog(agent)"
          @delete="confirmDelete(agent)"
          @toggle-status="toggleAgentStatus(agent)"
          :style="{ animationDelay: `${index * 0.05}s` }"
          class="agent-fade-in"
        />
      </template>
    </section>
    
    <!-- 对话框 -->
    <Teleport to="body">
      <Transition name="modal-3d">
        <div v-if="showDialog" class="dialog-overlay-3d" @click.self="closeDialog">
          <div class="dialog-content-3d">
            <div class="dialog-glow"></div>
            <div class="dialog-header">
              <h3>{{ editingAgent ? '编辑 Agent' : '新建 Agent' }}</h3>
              <button class="btn-close" @click="closeDialog">✕</button>
            </div>
            
            <div class="dialog-body">
              <div class="form-group">
                <label>名称 *</label>
                <input v-model="form.name" type="text" class="form-input-3d" />
              </div>
              
              <div class="form-group">
                <label>头像</label>
                <div class="avatar-grid">
                  <button
                    v-for="emoji in avatarOptions"
                    :key="emoji"
                    class="avatar-btn"
                    :class="{ active: form.avatar === emoji }"
                    @click="form.avatar = emoji"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
              
              <div class="form-group">
                <label>描述</label>
                <textarea v-model="form.description" rows="3" class="form-textarea-3d" />
              </div>
              
              <div class="form-group">
                <label>等级</label>
                <select v-model="form.level" class="form-select-3d">
                  <option value="custom">自定义 Agent</option>
                  <option value="fixed">固定 Agent</option>
                  <option value="core">核心 Agent</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>系统提示词</label>
                <textarea v-model="form.systemPrompt" rows="5" class="form-textarea-3d code" />
              </div>
            </div>
            
            <div class="dialog-footer">
              <button class="btn-secondary-3d" @click="closeDialog">取消</button>
              <button
                class="btn-primary-3d"
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
    
    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition name="modal-3d">
        <div v-if="showDeleteConfirm" class="dialog-overlay-3d" @click.self="showDeleteConfirm = false">
          <div class="dialog-content-3d confirm">
            <div class="confirm-icon-3d">⚠️</div>
            <h3>确认删除</h3>
            <p>确定要删除 Agent "{{ agentToDelete?.name }}" 吗？</p>
            <div class="dialog-footer">
              <button class="btn-secondary-3d" @click="showDeleteConfirm = false">取消</button>
              <button class="btn-danger-3d" @click="deleteAgent">删除</button>
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
import { useAgents, type Agent, type AgentCreateParams, type AgentLevel } from '../../../core/composables/useAgents'

const props = defineProps<{
  activeAgentId: string | null
}>()

const emit = defineEmits<{
  'select-agent': [agent: Agent]
  'agent-change': [agent: Agent]
}>()

const { agents, isLoading, error, init, create, update, remove } = useAgents()

const searchQuery = ref('')
const filterLevel = ref('')
const showDialog = ref(false)
const showDeleteConfirm = ref(false)
const editingAgent = ref<Agent | null>(null)
const agentToDelete = ref<Agent | null>(null)
const isSaving = ref(false)

const form = reactive({
  name: '',
  avatar: '🤖',
  description: '',
  level: 'custom' as AgentLevel,
  systemPrompt: ''
})

const avatarOptions = ['🤖', '👩‍💻', '👨‍💻', '🎨', '✍️', '🔬', '📊', '💼', '🎭', '🔮']

const filteredAgents = computed(() => {
  let result = agents.value
  
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    )
  }
  
  if (filterLevel.value) {
    result = result.filter(a => a.level === filterLevel.value)
  }
  
  return result.sort((a, b) => {
    if (a.isDefault) return -1
    if (b.isDefault) return 1
    return a.seat - b.seat
  })
})

const statsList = computed(() => [
  { icon: '🤖', value: agents.value.length, label: '总 Agent', type: 'total' },
  { icon: '🟢', value: agents.value.filter(a => a.status === 'online').length, label: '在线', type: 'online' },
  { icon: '🎯', value: agents.value.reduce((sum, a) => sum + (a.skills?.length || 0), 0), label: '技能总数', type: 'skills' },
  { icon: '📞', value: formatNumber(agents.value.reduce((sum, a) => sum + (a.callCount || 0), 0)), label: '总调用', type: 'calls' }
])

const headerTransform = computed(() => ({
  transform: `translateY(${Math.min(0, scrollY.value * 0.1)}px)`,
  opacity: Math.max(0.8, 1 - scrollY.value * 0.001)
}))

const scrollY = ref(0)

onMounted(() => {
  init()
  window.addEventListener('scroll', () => {
    scrollY.value = window.scrollY
  }, { passive: true })
})

function openCreateDialog() {
  editingAgent.value = null
  form.name = ''
  form.avatar = '🤖'
  form.description = ''
  form.level = 'custom'
  form.systemPrompt = ''
  showDialog.value = true
}

function openEditDialog(agent: Agent) {
  editingAgent.value = agent
  form.name = agent.name
  form.avatar = agent.avatar
  form.description = agent.description
  form.level = agent.level
  form.systemPrompt = agent.systemPrompt
  showDialog.value = true
}

function closeDialog() {
  showDialog.value = false
  editingAgent.value = null
}

async function saveAgent() {
  if (!form.name.trim()) return
  
  isSaving.value = true
  try {
    if (editingAgent.value) {
      await update(editingAgent.value.id, {
        name: form.name.trim(),
        avatar: form.avatar,
        description: form.description.trim(),
        level: form.level as AgentCreateParams['level'],
        systemPrompt: form.systemPrompt.trim()
      })
    } else {
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

function confirmDelete(agent: Agent) {
  agentToDelete.value = agent
  showDeleteConfirm.value = true
}

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

async function toggleAgentStatus(agent: Agent) {
  const newStatus = agent.status === 'online' ? 'offline' : 'online'
  try {
    await update(agent.id, { status: newStatus })
  } catch (e) {
    alert('状态更新失败: ' + e)
  }
}

function openAgentDetail(agent: Agent) {
  emit('select-agent', agent)
}

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}
</script>

<style scoped>
.agent-home-3d {
  position: relative;
  min-height: 100%;
  padding: 32px;
  overflow-x: hidden;
}

/* 背景光效 */
.ambient-light {
  position: fixed;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    ellipse at 30% 20%,
    rgba(59, 130, 246, 0.08) 0%,
    transparent 50%
  ),
  radial-gradient(
    ellipse at 70% 80%,
    rgba(139, 92, 246, 0.06) 0%,
    transparent 50%
  );
  pointer-events: none;
  animation: ambient-float 20s ease-in-out infinite;
}

@keyframes ambient-float {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(2%, 2%) rotate(2deg); }
  66% { transform: translate(-1%, 1%) rotate(-1deg); }
}

/* 头部 */
.home-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 24px;
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.header-left {
  flex: 1;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 8px 0;
  font-size: 32px;
  font-weight: 800;
  color: #1e293b;
  letter-spacing: -0.5px;
}

.title-glow {
  font-size: 36px;
  filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.5));
  animation: title-pulse 3s ease-in-out infinite;
}

@keyframes title-pulse {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.3)); }
  50% { filter: drop-shadow(0 0 30px rgba(59, 130, 246, 0.6)); }
}

.page-subtitle {
  margin: 0;
  font-size: 15px;
  color: #64748b;
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
  width: 260px;
  padding: 12px 16px 12px 44px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 4px 12px rgba(59, 130, 246, 0.1);
}

.search-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

.filter-select {
  padding: 12px 16px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  cursor: pointer;
  transition: all 0.3s ease;
}

/* 3D 创建按钮 */
.btn-create-3d {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 
    0 4px 12px rgba(59, 130, 246, 0.4),
    0 8px 24px rgba(59, 130, 246, 0.2);
  transform-style: preserve-3d;
}

.btn-create-3d:hover {
  transform: translateY(-2px) rotateX(5deg);
  box-shadow: 
    0 8px 20px rgba(59, 130, 246, 0.5),
    0 16px 40px rgba(59, 130, 246, 0.3);
}

.btn-create-3d:active {
  transform: translateY(0) rotateX(0);
}

.btn-icon {
  font-size: 18px;
  font-weight: 400;
}

/* 3D 统计卡片 */
.stats-float {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card-3d {
  position: relative;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 20px;
  padding: 24px;
  border: 1px solid rgba(226, 232, 240, 0.8);
  box-shadow: 
    0 4px 6px rgba(0, 0, 0, 0.02),
    0 10px 20px rgba(0, 0, 0, 0.03);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  animation: stat-float 3s ease-in-out infinite;
  overflow: hidden;
}

.stat-card-3d:hover {
  transform: translateY(-8px) rotateX(5deg);
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(59, 130, 246, 0.1);
}

@keyframes stat-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.stat-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0.1;
  filter: blur(40px);
}

.stat-glow.total { background: radial-gradient(circle, #3b82f6, transparent 70%); }
.stat-glow.online { background: radial-gradient(circle, #22c55e, transparent 70%); }
.stat-glow.skills { background: radial-gradient(circle, #f59e0b, transparent 70%); }
.stat-glow.calls { background: radial-gradient(circle, #8b5cf6, transparent 70%); }

.stat-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  font-size: 32px;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.stat-label {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 500;
}

/* Agent 网格 */
.agents-grid-3d {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.agent-fade-in {
  animation: fade-in-up 0.5s ease-out forwards;
  opacity: 0;
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 空状态 */
.empty-3d {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 80px;
  margin-bottom: 24px;
  opacity: 0.5;
  filter: drop-shadow(0 0 20px rgba(59, 130, 246, 0.3));
}

.empty-3d h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.empty-3d p {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #94a3b8;
}

.btn-create-empty {
  padding: 14px 28px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-create-empty:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.5);
}

/* 3D 对话框 */
.dialog-overlay-3d {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  perspective: 1000px;
}

.dialog-content-3d {
  position: relative;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  transform-style: preserve-3d;
}

.dialog-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
  border-radius: 26px;
  opacity: 0.3;
  filter: blur(20px);
  z-index: -1;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid #e2e8f0;
}

.dialog-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.btn-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
  border: none;
  border-radius: 10px;
  font-size: 18px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: linear-gradient(145deg, #fee2e2, #fecaca);
  color: #ef4444;
}

.dialog-body {
  padding: 28px;
  overflow-y: auto;
  max-height: calc(90vh - 160px);
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.form-input-3d,
.form-textarea-3d,
.form-select-3d {
  width: 100%;
  padding: 14px 18px;
  background: linear-gradient(145deg, #ffffff, #f8fafc);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
}

.form-input-3d:focus,
.form-textarea-3d:focus,
.form-select-3d:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.form-textarea-3d {
  resize: vertical;
  min-height: 100px;
}

.form-textarea-3d.code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
}

.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.avatar-btn {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-btn:hover {
  border-color: #cbd5e1;
  transform: scale(1.1);
}

.avatar-btn.active {
  border-color: #3b82f6;
  background: linear-gradient(145deg, #dbeafe, #bfdbfe);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px;
  border-top: 1px solid #e2e8f0;
  background: linear-gradient(145deg, #f8fafc, #f1f5f9);
}

.btn-secondary-3d,
.btn-primary-3d,
.btn-danger-3d {
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary-3d {
  background: linear-gradient(145deg, #ffffff, #f1f5f9);
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.btn-secondary-3d:hover {
  background: linear-gradient(145deg, #f1f5f9, #e2e8f0);
}

.btn-primary-3d {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.btn-primary-3d:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
}

.btn-primary-3d:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-danger-3d {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: none;
  color: white;
}

.btn-danger-3d:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

/* 确认对话框 */
.dialog-content-3d.confirm {
  max-width: 400px;
  padding: 40px;
  text-align: center;
}

.confirm-icon-3d {
  font-size: 56px;
  margin-bottom: 20px;
}

.dialog-content-3d.confirm h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.dialog-content-3d.confirm p {
  margin: 0 0 24px 0;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
}

/* 动画 */
.modal-3d-enter-active,
.modal-3d-leave-active {
  transition: all 0.3s ease;
}

.modal-3d-enter-from,
.modal-3d-leave-to {
  opacity: 0;
}

.modal-3d-enter-from .dialog-content-3d,
.modal-3d-leave-to .dialog-content-3d {
  transform: perspective(1000px) rotateX(10deg) translateY(-20px);
  opacity: 0;
}

/* 加载和错误状态 */
.loading-3d,
.error-3d {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
  text-align: center;
}

.loading-ring {
  width: 60px;
  height: 60px;
  border: 4px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.btn-retry {
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 16px;
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-float {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .agent-home-3d {
    padding: 20px;
  }
  
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
  
  .stats-float {
    grid-template-columns: 1fr;
  }
  
  .agents-grid-3d {
    grid-template-columns: 1fr;
  }
}
</style>
