<template>
  <div class="agent-admin-wrapper" v-if="visible">
    <Teleport to="body">
      <Transition name="archive">
        <div class="glass-archive-overlay" @click.self="close">
          <!-- 主容器 - 液态玻璃档案馆 -->
          <div class="glass-archive-container" :class="{ 'config-mode': selectedAgent }">
            <!-- 顶部导航 - 液态玻璃条 -->
            <header class="glass-nav-bar">
              <div class="nav-brand">
                <div class="brand-icon-wrapper">
                  <Icon name="bot" class="brand-icon" />
                </div>
                <span class="brand-text">Agent 档案馆</span>
              </div>
              
              <nav class="nav-tabs">
                <button
                  v-for="item in navItems"
                  :key="item.id"
                  class="nav-tab"
                  :class="{ active: currentView === item.id }"
                  @click="switchView(item.id)"
                >
                  <Icon :name="item.icon" class="tab-icon" />
                  <span class="tab-label">{{ item.label }}</span>
                  <span v-if="item.badge" class="tab-badge">{{ item.badge }}</span>
                </button>
              </nav>
              
              <div class="nav-actions">
                <LiquidGlass
                  v-if="activeAgent"
                  class="active-pill-glass"
                  glow-color="#10b981"
                  :intensity="0.4"
                  @click="currentView = 'agents'; selectedAgent = activeAgent"
                >
                  <div class="active-pill">
                    <span class="pill-avatar">{{ activeAgent.avatar }}</span>
                    <span class="pill-name">{{ activeAgent.name }}</span>
                    <span class="pill-status" :class="activeAgent.status" />
                  </div>
                </LiquidGlass>
                <button class="close-btn" @click="close">
                  <Icon name="x" />
                </button>
              </div>
            </header>
            
            <!-- 主内容区 -->
            <main class="archive-content">
              <!-- Agent 列表视图 -->
              <div v-if="currentView === 'agents' && !selectedAgent" class="view-agents">
                <div class="view-header">
                  <h2 class="view-title">
                    <Icon name="users" class="title-icon" />
                    我的 Agents
                  </h2>
                  <LiquidGlass glow-color="#8b5cf6" :intensity="0.6">
                    <button class="create-btn" @click="showCreateForm = true">
                      <Icon name="plus" />
                      新建 Agent
                    </button>
                  </LiquidGlass>
                </div>
                
                <div class="agents-grid">
                  <LiquidGlass
                    v-for="agent in sortedAgents"
                    :key="agent.id"
                    class="agent-card-glass"
                    :glow-color="agent.id === activeAgentId ? '#10b981' : '#8b5cf6'"
                    :intensity="agent.id === activeAgentId ? 0.5 : 0.3"
                    @click="selectAgent(agent)"
                  >
                    <div class="agent-card" :class="{ active: agent.id === activeAgentId }">
                      <div class="card-header">
                        <div class="card-avatar">{{ agent.avatar }}</div>
                        <div v-if="agent.isDefault" class="default-badge">默认</div>
                      </div>
                      
                      <div class="card-body">
                        <h3 class="card-name">{{ agent.name }}</h3>
                        <p class="card-desc">{{ agent.description }}</p>
                        
                        <div class="card-stats">
                          <span class="stat-badge">
                            <Icon name="zap" />
                            {{ agent.capabilities?.skillIds?.length || 0 }} 技能
                          </span>
                          <span class="stat-badge">
                            <Icon name="tool" />
                            {{ getEffectiveTools(agent)?.length || 0 }} 工具
                          </span>
                        </div>
                      </div>
                      
                      <div class="card-actions" @click.stop>
                        <button 
                          class="action-btn chat"
                          @click="startChatWithAgent(agent)"
                          title="开始对话"
                        >
                          <Icon name="message-square" />
                        </button>
                        <button 
                          class="action-btn"
                          :class="{ active: agent.id === activeAgentId }"
                          @click="activateAgent(agent)"
                          :title="agent.id === activeAgentId ? '当前活跃' : '设为活跃'"
                        >
                          <Icon :name="agent.id === activeAgentId ? 'check-circle' : 'circle'" />
                        </button>
                        <button 
                          v-if="!agent.isDefault && agent.level !== 'meta'"
                          class="action-btn danger"
                          @click="confirmDelete(agent)"
                          title="删除"
                        >
                          <Icon name="trash-2" />
                        </button>
                      </div>
                    </div>
                  </LiquidGlass>
                </div>
              </div>
              
              <!-- Agent 配置视图 -->
              <div v-else-if="currentView === 'agents' && selectedAgent" class="view-config">
                <div class="config-header">
                  <LiquidGlass class="back-btn-glass" glow-color="#64748b" :intensity="0.3">
                    <button class="back-btn" @click="selectedAgent = null">
                      <Icon name="arrow-left" />
                      <span>返回档案馆</span>
                    </button>
                  </LiquidGlass>
                  <h2 class="config-title">{{ selectedAgent.name }} 配置</h2>
                </div>
                <AgentConfigPanel
                  v-if="selectedAgent && currentView === 'agents'"
                  :key="selectedAgent.id"
                  :agent="selectedAgent"
                  @save="saveAgentConfig"
                  @cancel="selectedAgent = null"
                />
              </div>
              
              <!-- Skills 管理 -->
              <div v-else-if="currentView === 'skills'" key="skills" class="view-skills">
                <SkillsManager />
              </div>
              
              <!-- Memory 管理 -->
              <div v-else-if="currentView === 'memory'" key="memory" class="view-memory">
                <MemoryManager />
              </div>
              
              <!-- MCP 配置 -->
              <div v-else-if="currentView === 'mcp'" key="mcp" class="view-mcp">
                <MCPConfigPanel />
              </div>
            </main>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 创建 Agent 弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreateForm" class="modal-overlay" @click.self="showCreateForm = false">
          <LiquidGlass class="create-modal-glass" glow-color="#8b5cf6" :intensity="0.5">
            <div class="create-modal">
              <h3 class="modal-title">
                <Icon name="plus-circle" />
                创建新 Agent
              </h3>
              
              <div class="form-group">
                <label>名称</label>
                <input v-model="newAgentForm.name" type="text" class="lg-input" placeholder="给 Agent 起个名字" />
              </div>
              
              <div class="form-group">
                <label>描述</label>
                <textarea v-model="newAgentForm.description" class="lg-input" rows="3" placeholder="描述这个 Agent 的用途..." />
              </div>
              
              <div class="form-group">
                <label>选择头像</label>
                <div class="emoji-grid">
                  <button
                    v-for="emoji in commonEmojis"
                    :key="emoji"
                    class="emoji-btn"
                    :class="{ selected: newAgentForm.avatar === emoji }"
                    @click="newAgentForm.avatar = emoji"
                  >
                    {{ emoji }}
                  </button>
                </div>
              </div>
              
              <div class="modal-footer">
                <LiquidGlass glow-color="#64748b" :intensity="0.3">
                  <button class="lg-btn" @click="showCreateForm = false">取消</button>
                </LiquidGlass>
                <LiquidGlass glow-color="#8b5cf6" :intensity="0.6">
                  <button class="lg-btn lg-btn-primary" :disabled="!isFormValid" @click="createNewAgent">
                    <Icon name="check" />
                    创建 Agent
                  </button>
                </LiquidGlass>
              </div>
            </div>
          </LiquidGlass>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 删除确认弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="showDeleteConfirm = false">
          <LiquidGlass class="delete-modal-glass" glow-color="#ef4444" :intensity="0.4">
            <div class="delete-modal">
              <div class="warning-icon">
                <Icon name="alert-triangle" />
              </div>
              <h4>确认删除</h4>
              <p>Agent "{{ agentToDelete?.name }}" 将被永久移除</p>
              <div class="modal-footer">
                <LiquidGlass glow-color="#64748b" :intensity="0.3">
                  <button class="lg-btn" @click="showDeleteConfirm = false">保留</button>
                </LiquidGlass>
                <LiquidGlass glow-color="#ef4444" :intensity="0.5">
                  <button class="lg-btn" style="background: rgba(239, 68, 68, 0.9); color: white;" @click="executeDelete">
                    <Icon name="trash-2" />
                    确认删除
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
import { ref, computed, onMounted } from 'vue'
import { useAgentConfig } from '../../../core/composables/useAgentConfig'
import type { Agent } from '../../../core/types/agent'
import AgentConfigPanel from './AgentConfigPanel.vue'
import SkillsManager from '../skills/SkillsManager.vue'
import MemoryManager from '../memory/MemoryManager.vue'
import MCPConfigPanel from '../../mcp/MCPConfigPanel.vue'
import Icon from '../../../shared/Icon.vue'
import LiquidGlass from '../../../shared/LiquidGlass.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'agentChange': [agent: Agent]
  'startChat': [agent: Agent]
}>()

const {
  agents,
  skills,
  activeAgentId,
  activeAgent,
  sortedAgents,
  init,
  createAgent,
  updateAgent,
  deleteAgent,
  setActive,
  getEffectiveTools
} = useAgentConfig()

// 当前视图
const currentView = ref<'agents' | 'skills' | 'memory' | 'mcp'>('agents')
const navItems = computed(() => [
  { id: 'agents' as const, label: 'Agents', icon: 'users', badge: agents.value.length },
  { id: 'skills' as const, label: 'Skills', icon: 'zap', badge: skills.value.length },
  { id: 'memory' as const, label: 'Memory', icon: 'database' },
  { id: 'mcp' as const, label: 'MCP', icon: 'cpu' }
])

// 选中的 Agent
const selectedAgent = ref<Agent | null>(null)

// 创建表单
const showCreateForm = ref(false)
const newAgentForm = ref({
  name: '',
  description: '',
  avatar: '🤖'
})

const commonEmojis = ['🤖', '👨‍💻', '👩‍💻', '🎯', '🚀', '💡', '🔮', '🎨', '📊', '🔍', '💬', '🧠', '⚡', '🔥', '✨', '🌟']

const isFormValid = computed(() => {
  return newAgentForm.value.name.trim().length >= 2
})

// 删除确认
const showDeleteConfirm = ref(false)
const agentToDelete = ref<Agent | null>(null)

onMounted(() => {
  init()
})

function close() {
  emit('update:visible', false)
  selectedAgent.value = null
}

function switchView(view: 'agents' | 'skills' | 'memory' | 'mcp') {
  if (currentView.value === view) return
  currentView.value = view
  selectedAgent.value = null
}

function selectAgent(agent: Agent) {
  selectedAgent.value = agent
}

function activateAgent(agent: Agent) {
  setActive(agent.id)
  emit('agentChange', agent)
}

function startChatWithAgent(agent: Agent) {
  setActive(agent.id)
  emit('startChat', agent)
  close()
}

async function saveAgentConfig(config: Agent['capabilities']) {
  if (selectedAgent.value?.id) {
    const updated = await updateAgent(selectedAgent.value.id, { capabilities: config })
    if (updated) {
      selectedAgent.value = updated
    }
  }
}

async function createNewAgent() {
  if (!isFormValid.value) return
  
  const agent = await createAgent({
    name: newAgentForm.value.name,
    description: newAgentForm.value.description,
    avatar: newAgentForm.value.avatar,
    level: 'custom'
  })
  
  if (agent) {
    showCreateForm.value = false
    newAgentForm.value = { name: '', description: '', avatar: '🤖' }
    selectedAgent.value = agent
  }
}

function confirmDelete(agent: Agent) {
  agentToDelete.value = agent
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (agentToDelete.value) {
    await deleteAgent(agentToDelete.value.id)
    showDeleteConfirm.value = false
    agentToDelete.value = null
  }
}
</script>

<style scoped>
@import '../../../styles/liquid-glass-theme.css';

/* ===== 档案馆容器 ===== */
.glass-archive-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  z-index: 1000;
  padding: 24px;
}

.glass-archive-container {
  width: 100%;
  max-width: 1400px;
  height: 85vh;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(40px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 32px;
  box-shadow: 
    0 32px 64px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5),
    inset 0 1px 1px rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 顶部导航 ===== */
.glass-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.4);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon-wrapper {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2));
  border-radius: 14px;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.brand-icon {
  width: 24px;
  height: 24px;
  color: #8b5cf6;
}

.brand-text {
  font-size: 20px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b, #475569);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 导航标签 */
.nav-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 16px;
}

.nav-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 12px;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.nav-tab:hover {
  color: #1e293b;
  background: rgba(255, 255, 255, 0.5);
}

.nav-tab.active {
  color: white;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
}

.tab-icon {
  width: 18px;
  height: 18px;
}

.tab-badge {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
}

/* 导航操作区 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.active-pill-glass {
  border-radius: 50px;
  cursor: pointer;
}

.active-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
}

.pill-avatar {
  font-size: 20px;
}

.pill-name {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;
}

.pill-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.pill-status.offline {
  background: #94a3b8;
  box-shadow: none;
}

.close-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

/* ===== 主内容区 ===== */
.archive-content {
  flex: 1;
  overflow: auto;
  padding: 24px;
  background: 
    radial-gradient(ellipse at 20% 30%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 70%, rgba(16, 185, 129, 0.03) 0%, transparent 50%);
}

/* ===== Agent 列表视图 ===== */
.view-agents {
  max-width: 1200px;
  margin: 0 auto;
}

.view-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.view-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.title-icon {
  width: 28px;
  height: 28px;
  color: #8b5cf6;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.9), rgba(124, 58, 237, 0.9));
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.3);
}

.create-btn svg {
  width: 18px;
  height: 18px;
}

/* Agent 网格 */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.agent-card-glass {
  border-radius: 24px;
  cursor: pointer;
}

.agent-card {
  padding: 24px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.card-avatar {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1));
  border-radius: 18px;
  border: 1px solid rgba(139, 92, 246, 0.1);
}

.default-badge {
  padding: 4px 10px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 20px;
  color: #059669;
  font-size: 11px;
  font-weight: 700;
}

.card-body {
  margin-bottom: 20px;
}

.card-name {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.card-desc {
  margin: 0 0 12px;
  font-size: 14px;
  color: #64748b;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 8px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
}

.stat-badge svg {
  width: 12px;
  height: 12px;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
  transform: translateY(-2px);
}

.action-btn.active {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* ===== 配置视图 ===== */
.view-config {
  max-width: 1000px;
  margin: 0 auto;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.back-btn-glass {
  border-radius: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: transparent;
  border: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.config-title {
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

/* ===== 弹窗 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(10px);
  z-index: 1100;
  padding: 24px;
}

.create-modal-glass,
.delete-modal-glass {
  border-radius: 28px;
  max-width: 480px;
  width: 100%;
}

.create-modal,
.delete-modal {
  padding: 32px;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 24px;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
}

.modal-title svg {
  width: 26px;
  height: 26px;
  color: #8b5cf6;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}

.emoji-btn {
  padding: 12px;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 12px;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.emoji-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  transform: scale(1.1);
}

.emoji-btn.selected {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

/* 删除确认 */
.warning-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 50%;
  color: #ef4444;
}

.warning-icon svg {
  width: 32px;
  height: 32px;
}

.delete-modal h4 {
  text-align: center;
  margin: 0 0 12px;
  font-size: 20px;
  color: #1e293b;
}

.delete-modal p {
  text-align: center;
  color: #64748b;
  margin: 0 0 24px;
}

/* ===== 过渡动画 ===== */
.archive-enter-active,
.archive-leave-active {
  transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.archive-enter-from,
.archive-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .glass-archive-container {
    height: 95vh;
    border-radius: 24px;
  }
  
  .glass-nav-bar {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .nav-tabs {
    order: 3;
    width: 100%;
    overflow-x: auto;
  }
  
  .agents-grid {
    grid-template-columns: 1fr;
  }
}
</style>
