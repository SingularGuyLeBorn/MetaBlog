<!--
  AgentAdmin - 悬浮式玻璃档案馆
  
  设计哲学：
  - 液态玻璃材质（玻璃+液体流动感）
  - 顶部导航栏（节省空间）
  - 呼吸动画与悬浮效果
  - 3D空间深度感
-->
<template>
  <div class="agent-admin-wrapper" v-if="visible">
    <Teleport to="body">
      <Transition name="archive">
        <div class="glass-archive-overlay" @click.self="close">
        <!-- 背景粒子效果 -->
        <div class="ambient-particles">
          <div v-for="i in 20" :key="i" class="particle" :style="getParticleStyle(i)" />
        </div>
        
        <!-- 主容器 - 玻璃档案馆 -->
        <div class="glass-archive-container" :class="{ 'config-mode': selectedAgent }">
          <!-- 顶部导航 - 悬浮玻璃条 -->
          <header class="glass-nav-bar">
            <div class="nav-brand">
              <div class="brand-icon">🤖</div>
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
                <span class="tab-icon">{{ item.icon }}</span>
                <span class="tab-label">{{ item.label }}</span>
                <span v-if="item.badge" class="tab-badge">{{ item.badge }}</span>
                <div class="tab-ink" />
              </button>
            </nav>
            
            <div class="nav-actions">
              <div v-if="activeAgent" class="active-pill" @click="currentView = 'agents'; selectedAgent = activeAgent">
                <span class="pill-avatar">{{ activeAgent.avatar }}</span>
                <span class="pill-name">{{ activeAgent.name }}</span>
                <span class="pill-status" :class="activeAgent.status" />
              </div>
              <button class="close-btn" @click="close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </header>
          
          <!-- 主内容区 -->
          <main class="archive-content">
            <!-- Agent 列表视图 -->
            <div v-if="currentView === 'agents' && !selectedAgent" class="view-agents">
              <div class="view-header">
                <h2 class="view-title">
                  <span class="title-icon">🎭</span>
                  我的 Agents
                </h2>
                <button class="create-btn liquid-glass" @click="showCreateForm = true">
                  <span class="btn-glow" />
                  <span class="btn-content">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="12" y1="5" x2="12" y2="19"/>
                      <line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    新建 Agent
                  </span>
                </button>
              </div>
              
              <div class="agents-crystal-grid">
                <div
                  v-for="agent in sortedAgents"
                  :key="agent.id"
                  class="agent-crystal-card"
                  :class="{ 
                    active: agent.id === activeAgentId,
                    default: agent.isDefault 
                  }"
                  @click="selectAgent(agent)"
                >
                  <!-- 卡片光效 -->
                  <div class="card-shine" />
                  <div class="card-glow" :class="agent.capabilities?.mode" />
                  
                  <div class="card-content">
                    <div class="card-avatar-wrapper">
                      <div class="card-avatar">{{ agent.avatar }}</div>
                      <div v-if="agent.id === activeAgentId" class="active-ring" />
                    </div>
                    
                    <div class="card-info">
                      <div class="card-header-row">
                        <h3 class="card-name">{{ agent.name }}</h3>
                        <span v-if="agent.isDefault" class="default-tag">默认</span>
                      </div>
                      <p class="card-desc">{{ agent.description }}</p>
                      
                      <div class="card-capabilities">
                        <span class="cap-badge mode" :class="agent.capabilities?.mode">
                          {{ modeIcon(agent.capabilities?.mode) }}
                          {{ modeLabel(agent.capabilities?.mode) }}
                        </span>
                        <span class="cap-badge">
                          🎯 {{ agent.capabilities?.skillIds?.length || 0 }} 技能
                        </span>
                        <span class="cap-badge">
                          🔧 {{ getEffectiveTools(agent)?.length || 0 }} 工具
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- 悬浮操作 -->
                  <div class="card-actions" @click.stop>
                    <button 
                      class="action-crystal"
                      :class="{ active: agent.id === activeAgentId }"
                      @click="activateAgent(agent)"
                      :title="agent.id === activeAgentId ? '当前活跃' : '设为活跃'"
                    >
                      <span class="crystal-glow" />
                      {{ agent.id === activeAgentId ? '●' : '○' }}
                    </button>
                    <button 
                      v-if="!agent.isDefault"
                      class="action-crystal danger"
                      @click="confirmDelete(agent)"
                      title="删除"
                    >
                      <span class="crystal-glow" />
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Agent 配置视图 -->
            <div v-else-if="currentView === 'agents' && selectedAgent" class="view-config">
              <div class="config-header">
                <button class="back-crystal" @click="selectedAgent = null">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M19 12H5M12 19l-7-7 7-7"/>
                  </svg>
                  <span>返回档案馆</span>
                </button>
                <h2 class="config-title">{{ selectedAgent.name }} 配置</h2>
              </div>
              <AgentConfigPanel
                :agent="selectedAgent"
                @save="saveAgentConfig"
                @cancel="selectedAgent = null"
              />
            </div>
            
            <!-- Skills 管理 -->
            <div v-else-if="currentView === 'skills'" class="view-skills">
              <SkillsManager />
            </div>
            
            <!-- Memory 管理 -->
            <div v-else-if="currentView === 'memory'" class="view-memory">
              <MemoryManager :agent="activeAgent" />
            </div>
          </main>
        </div>
        
        <!-- 创建 Agent 弹窗 - 液态玻璃 -->
        <Teleport to="body">
          <Transition name="glass-modal">
            <div v-if="showCreateForm" class="glass-modal-overlay" @click.self="showCreateForm = false">
              <div class="glass-modal">
                <div class="modal-glow" />
                <div class="modal-header">
                  <h3>
                    <span class="header-icon">✨</span>
                    创建新 Agent
                  </h3>
                  <button class="modal-close" @click="showCreateForm = false">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <div class="modal-body">
                  <div class="form-crystal">
                    <label>名称 <span class="required">*</span></label>
                    <input 
                      v-model="newAgentForm.name" 
                      type="text" 
                      placeholder="给你的 Agent 起个名字"
                      class="liquid-input"
                    />
                  </div>
                  <div class="form-crystal">
                    <label>描述 <span class="required">*</span></label>
                    <textarea 
                      v-model="newAgentForm.description" 
                      rows="3" 
                      placeholder="描述这个 Agent 的用途和特点..."
                      class="liquid-input"
                    />
                  </div>
                  <div class="form-crystal">
                    <label>头像</label>
                    <div class="avatar-orbit">
                      <button
                        v-for="emoji in avatarOptions"
                        :key="emoji"
                        class="orbit-avatar"
                        :class="{ active: newAgentForm.avatar === emoji }"
                        @click="newAgentForm.avatar = emoji"
                      >
                        <span class="avatar-glow" />
                        {{ emoji }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn-glass secondary" @click="showCreateForm = false">
                    <span class="btn-shine" />
                    取消
                  </button>
                  <button 
                    class="btn-glass primary" 
                    :disabled="!isFormValid"
                    @click="createNewAgent"
                  >
                    <span class="btn-shine" />
                    <span class="btn-pulse" />
                    创建 Agent
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
        
        <!-- 删除确认 - 玻璃破碎效果 -->
        <Teleport to="body">
          <Transition name="shatter">
            <div v-if="showDeleteConfirm" class="shatter-overlay" @click.self="showDeleteConfirm = false">
              <div class="shatter-modal">
                <div class="warning-icon">⚠️</div>
                <h4>确认删除</h4>
                <p>Agent "{{ agentToDelete?.name }}" 将被永久移除</p>
                <div class="shatter-actions">
                  <button class="btn-glass" @click="showDeleteConfirm = false">保留</button>
                  <button class="btn-glass danger" @click="executeDelete">
                    <span class="danger-glow" />
                    确认删除
                  </button>
                </div>
              </div>
            </div>
          </Transition>
        </Teleport>
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

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'agentChange': [agent: Agent]
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
const currentView = ref<'agents' | 'skills' | 'memory'>('agents')
const navItems = computed(() => [
  { id: 'agents' as const, label: 'Agents', icon: '🎭', badge: agents.value.length },
  { id: 'skills' as const, label: 'Skills', icon: '🎯', badge: skills.value.length },
  { id: 'memory' as const, label: 'Memory', icon: '🧠' }
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
const avatarOptions = ['🤖', '🦾', '🧠', '👨‍💻', '👩‍💻', '🎓', '🔬', '🎨', '📝', '💡', '🔧', '🚀', '🌟', '💎']

const isFormValid = computed(() => 
  newAgentForm.value.name.trim() && newAgentForm.value.description.trim()
)

// 删除确认
const showDeleteConfirm = ref(false)
const agentToDelete = ref<Agent | null>(null)

// 粒子样式
function getParticleStyle(i: number) {
  const size = Math.random() * 4 + 2
  const left = Math.random() * 100
  const delay = Math.random() * 5
  const duration = Math.random() * 10 + 10
  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  }
}

// 初始化
onMounted(() => {
  init()
})

// 方法
function close() {
  emit('update:visible', false)
  selectedAgent.value = null
}

function switchView(view: 'agents' | 'skills' | 'memory') {
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

async function saveAgentConfig(config: Agent['capabilities']) {
  console.log('[AgentAdmin] Saving config:', config)
  if (selectedAgent.value?.id) {
    console.log('[AgentAdmin] For agent:', selectedAgent.value.id)
    const updated = await updateAgent(selectedAgent.value.id, { capabilities: config })
    console.log('[AgentAdmin] Updated agent:', updated?.id)
    if (updated) {
      selectedAgent.value = updated
    }
  } else {
    console.error('[AgentAdmin] No agent selected or missing id')
  }
}

async function createNewAgent() {
  if (!isFormValid.value) return
  
  await createAgent({
    name: newAgentForm.value.name.trim(),
    description: newAgentForm.value.description.trim(),
    avatar: newAgentForm.value.avatar,
    level: 'custom'
  })
  
  showCreateForm.value = false
  newAgentForm.value = { name: '', description: '', avatar: '🤖' }
}

function confirmDelete(agent: Agent) {
  agentToDelete.value = agent
  showDeleteConfirm.value = true
}

function executeDelete() {
  if (agentToDelete.value) {
    deleteAgent(agentToDelete.value.id)
    showDeleteConfirm.value = false
    agentToDelete.value = null
  }
}

// 辅助函数
function modeIcon(mode: string): string {
  const icons: Record<string, string> = {
    raw: '📝',
    'skills-only': '🎯',
    'tools-only': '🔧',
    hybrid: '⚡'
  }
  return icons[mode] || '⚙️'
}

function modeLabel(mode: string): string {
  const labels: Record<string, string> = {
    raw: '纯提示词',
    'skills-only': '技能模式',
    'tools-only': '工具模式',
    hybrid: '混合模式'
  }
  return labels[mode] || mode
}
</script>

<style scoped>
/* 包装元素 - 确保事件监听器可继承 */
.agent-admin-wrapper {
  display: contents;
}

/* ===== 液态玻璃档案馆 - 整体架构 ===== */
.glass-archive-overlay {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
    rgba(248, 250, 252, 0.95);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 24px;
  overflow: hidden;
}

/* 背景粒子 */
.ambient-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.particle {
  position: absolute;
  bottom: -10px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent);
  border-radius: 50%;
  animation: float-up linear infinite;
}

@keyframes float-up {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    transform: translateY(-100vh) scale(0.5);
    opacity: 0;
  }
}

/* 主容器 - 玻璃档案馆 */
.glass-archive-container {
  width: 100%;
  max-width: 1400px;
  height: 85vh;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 
    0 32px 64px -16px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset,
    0 0 100px rgba(59, 130, 246, 0.1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  animation: archive-enter 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes archive-enter {
  from {
    opacity: 0;
    transform: perspective(1000px) rotateX(5deg) translateY(30px);
  }
  to {
    opacity: 1;
    transform: perspective(1000px) rotateX(0) translateY(0);
  }
}

/* ===== 顶部导航 - 悬浮玻璃条 ===== */
.glass-nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: linear-gradient(180deg, 
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.7) 100%
  );
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 12px;
  font-size: 20px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.brand-text {
  font-size: 18px;
  font-weight: 700;
  background: linear-gradient(135deg, #1e293b, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 导航标签 */
.nav-tabs {
  display: flex;
  gap: 8px;
  padding: 6px;
  background: rgba(241, 245, 249, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.5);
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
  font-size: 14px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.nav-tab:hover {
  color: #3b82f6;
  background: rgba(255, 255, 255, 0.5);
}

.nav-tab.active {
  color: #1e40af;
  font-weight: 600;
}

.tab-ink {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
  border-radius: 12px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.nav-tab.active .tab-ink {
  opacity: 1;
  transform: scale(1);
}

.tab-icon {
  font-size: 16px;
}

.tab-badge {
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 600;
}

/* 导航操作 */
.nav-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.active-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px 6px 6px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 100px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.active-pill:hover {
  background: rgba(59, 130, 246, 0.1);
  transform: translateY(-1px);
}

.pill-avatar {
  font-size: 18px;
}

.pill-name {
  font-size: 13px;
  font-weight: 500;
}

.pill-status {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: status-pulse 2s ease-in-out infinite;
}

@keyframes status-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: #fee2e2;
  color: #ef4444;
  transform: rotate(90deg);
}

.close-btn svg {
  width: 18px;
  height: 18px;
}

/* ===== 内容区 ===== */
.archive-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* ===== Agent 列表视图 ===== */
.view-agents {
  height: 100%;
  padding: 24px;
  overflow-y: auto;
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
  gap: 10px;
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
}

.title-icon {
  font-size: 28px;
}

/* 液态玻璃按钮 */
.create-btn {
  position: relative;
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.create-btn:hover .btn-glow {
  opacity: 0.6;
}

.create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.btn-content {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.btn-content svg {
  width: 18px;
  height: 18px;
}

/* Agent 水晶卡片网格 */
.agents-crystal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.agent-crystal-card {
  position: relative;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 20px;
  padding: 20px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 20px rgba(0, 0, 0, 0.05),
    inset 0 1px 1px rgba(255, 255, 255, 0.8);
}

.agent-crystal-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow: 
    0 12px 40px rgba(59, 130, 246, 0.15),
    inset 0 1px 1px rgba(255, 255, 255, 0.9);
}

.agent-crystal-card.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(139, 92, 246, 0.05));
  border-color: rgba(59, 130, 246, 0.3);
}

.card-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 40%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 60%
  );
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.agent-crystal-card:hover .card-shine {
  transform: translateX(100%);
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  opacity: 0;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.card-glow.raw {
  background: radial-gradient(circle, rgba(107, 114, 128, 0.1), transparent 50%);
}
.card-glow.skills-only {
  background: radial-gradient(circle, rgba(59, 130, 246, 0.15), transparent 50%);
}
.card-glow.tools-only {
  background: radial-gradient(circle, rgba(34, 197, 94, 0.15), transparent 50%);
}
.card-glow.hybrid {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.15), transparent 50%);
}

.agent-crystal-card:hover .card-glow {
  opacity: 1;
}

.card-content {
  display: flex;
  gap: 16px;
  position: relative;
  z-index: 1;
}

.card-avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.card-avatar {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f1f5f9, #e2e8f0);
  border-radius: 16px;
  font-size: 28px;
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.08),
    inset 0 1px 1px rgba(255, 255, 255, 0.8);
}

.active-ring {
  position: absolute;
  inset: -4px;
  border: 2px solid #3b82f6;
  border-radius: 20px;
  animation: ring-pulse 2s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
    border-color: #3b82f6;
  }
  50% { 
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    border-color: #60a5fa;
  }
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-header-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.card-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: #1e293b;
}

.default-tag {
  padding: 2px 8px;
  background: linear-gradient(135deg, #3b82f6, #60a5fa);
  color: white;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 600;
}

.card-desc {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cap-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 20px;
  font-size: 11px;
  color: #64748b;
}

.cap-badge.mode {
  font-weight: 500;
}

.cap-badge.mode.raw { color: #6b7280; }
.cap-badge.mode.skills-only { color: #3b82f6; }
.cap-badge.mode.tools-only { color: #22c55e; }
.cap-badge.mode.hybrid { color: #f59e0b; }

/* 卡片操作 */
.card-actions {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transform: translateY(-10px);
  transition: all 0.3s ease;
}

.agent-crystal-card:hover .card-actions {
  opacity: 1;
  transform: translateY(0);
}

.action-crystal {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  font-size: 14px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.crystal-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.3), transparent);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.action-crystal:hover .crystal-glow {
  opacity: 1;
}

.action-crystal:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.action-crystal.active {
  background: #3b82f6;
  color: white;
}

.action-crystal.danger:hover {
  background: #fee2e2;
  color: #ef4444;
}

/* ===== 配置视图 ===== */
.view-config {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.config-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.6);
}

.back-crystal {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 10px;
  font-size: 13px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-crystal:hover {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  transform: translateX(-2px);
}

.back-crystal svg {
  width: 16px;
  height: 16px;
}

.config-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

/* ===== Skills 和 Memory 视图 ===== */
.view-skills,
.view-memory {
  height: 100%;
  overflow-y: auto;
}

/* ===== 弹窗 - 液态玻璃效果 ===== */
.glass-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
}

.glass-modal {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 
    0 32px 64px -16px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  animation: modal-float 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes modal-float {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.modal-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.1), transparent 50%);
  pointer-events: none;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 24px 16px;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.header-icon {
  font-size: 24px;
}

.modal-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(241, 245, 249, 0.8);
  border: none;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s ease;
}

.modal-close:hover {
  background: #fee2e2;
  color: #ef4444;
  transform: rotate(90deg);
}

.modal-body {
  padding: 0 24px 24px;
}

.form-crystal {
  margin-bottom: 20px;
}

.form-crystal label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
  margin-bottom: 8px;
}

.required {
  color: #ef4444;
}

.liquid-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(203, 213, 225, 0.5);
  border-radius: 12px;
  font-size: 14px;
  transition: all 0.3s ease;
}

.liquid-input:focus {
  outline: none;
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

/* 头像轨道 */
.avatar-orbit {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 4px;
}

.orbit-avatar {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: rgba(255, 255, 255, 0.7);
  border: 2px solid transparent;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.avatar-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 16px;
  opacity: 0;
  filter: blur(4px);
  transition: opacity 0.3s ease;
}

.orbit-avatar:hover .avatar-glow,
.orbit-avatar.active .avatar-glow {
  opacity: 0.4;
}

.orbit-avatar:hover,
.orbit-avatar.active {
  transform: scale(1.1) translateY(-2px);
  border-color: #3b82f6;
  background: rgba(255, 255, 255, 0.9);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px;
}

/* 玻璃按钮 */
.btn-glass {
  position: relative;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
}

.btn-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s ease;
}

.btn-glass:hover .btn-shine {
  transform: translateX(100%);
}

.btn-glass:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
}

.btn-glass.primary {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: white;
  border: none;
}

.btn-glass.primary:hover {
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3);
}

.btn-glass.primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.btn-pulse {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3), transparent);
  animation: btn-pulse 2s ease-in-out infinite;
}

@keyframes btn-pulse {
  0%, 100% { transform: scale(1); opacity: 0; }
  50% { transform: scale(1.05); opacity: 1; }
}

/* 破碎效果删除弹窗 */
.shatter-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
}

.shatter-modal {
  padding: 40px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  text-align: center;
  animation: shatter-in 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes shatter-in {
  from {
    opacity: 0;
    transform: scale(0.9) rotate(-2deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}

.warning-icon {
  font-size: 56px;
  margin-bottom: 16px;
  animation: warning-shake 0.5s ease;
}

@keyframes warning-shake {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

.shatter-modal h4 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.shatter-modal p {
  margin: 0 0 24px 0;
  color: #64748b;
}

.shatter-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

.btn-glass.danger {
  background: linear-gradient(135deg, #ef4444, #f97316);
  color: white;
  border: none;
}

.danger-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(135deg, #fca5a5, #fdba74);
  border-radius: 14px;
  opacity: 0;
  filter: blur(8px);
  transition: opacity 0.3s ease;
}

.btn-glass.danger:hover .danger-glow {
  opacity: 0.5;
}

/* ===== 动画 ===== */
.archive-enter-active,
.archive-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.archive-enter-from,
.archive-leave-to {
  opacity: 0;
}

.glass-modal-enter-active,
.glass-modal-leave-active {
  transition: all 0.3s ease;
}

.glass-modal-enter-from,
.glass-modal-leave-to {
  opacity: 0;
}

.shatter-enter-active,
.shatter-leave-active {
  transition: all 0.3s ease;
}

.shatter-enter-from,
.shatter-leave-to {
  opacity: 0;
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .glass-archive-container {
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }
  
  .glass-nav-bar {
    flex-wrap: wrap;
    gap: 12px;
  }
  
  .nav-tabs {
    order: 3;
    width: 100%;
  }
  
  .agents-crystal-grid {
    grid-template-columns: 1fr;
  }
}
</style>
