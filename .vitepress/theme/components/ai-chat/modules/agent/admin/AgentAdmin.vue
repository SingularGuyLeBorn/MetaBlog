<!--
  AgentAdmin - Agent 管理后台（3D 液态玻璃风格）
-->
<template>
  <Teleport to="body">
    <Transition name="admin-3d">
      <div v-if="visible" class="agent-admin-overlay-3d" @click.self="close">
        <!-- 背景光效 -->
        <div class="admin-bg-effects">
          <div class="bg-orb orb-1"></div>
          <div class="bg-orb orb-2"></div>
          <div class="bg-orb orb-3"></div>
        </div>
        
        <div class="agent-admin-panel-3d">
          <!-- 面板光效边框 -->
          <div class="panel-glow"></div>
          
          <!-- 首页视图 -->
          <AgentHome
            v-if="!selectedAgent"
            :active-agent-id="activeAgentId"
            @select-agent="openDetail"
            @agent-change="handleAgentChange"
          />
          
          <!-- 详情视图 -->
          <AgentDetail
            v-else
            :agent="selectedAgent"
            @back="selectedAgent = null"
            @save="saveAgent"
            @delete="deleteAgent"
          />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import AgentHome from './AgentHome.vue'
import AgentDetail from './AgentDetail.vue'
import { useAgents, type Agent } from '../../../core/composables/useAgents'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'agent-change': [agent: Agent]
}>()

const { activeAgentId, setActive, update, remove } = useAgents()

const selectedAgent = ref<Agent | null>(null)

function close() {
  emit('update:visible', false)
  selectedAgent.value = null
}

function openDetail(agent: Agent) {
  selectedAgent.value = agent
}

function saveAgent(data: Partial<Agent>) {
  if (selectedAgent.value) {
    update(selectedAgent.value.id, data)
    Object.assign(selectedAgent.value, data)
  }
}

function deleteAgent(agent: Agent) {
  remove(agent.id)
  selectedAgent.value = null
}

function handleAgentChange(agent: Agent) {
  emit('agent-change', agent)
}
</script>

<style scoped>
.agent-admin-overlay-3d {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 24px;
  perspective: 1000px;
}

/* 背景光效 */
.admin-bg-effects {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.3;
  animation: orb-float 15s ease-in-out infinite;
}

.orb-1 {
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(59, 130, 246, 0.4), transparent 70%);
  top: 10%;
  left: 20%;
}

.orb-2 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%);
  bottom: 20%;
  right: 15%;
  animation-delay: -5s;
}

.orb-3 {
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.25), transparent 70%);
  top: 50%;
  left: 50%;
  animation-delay: -10s;
}

@keyframes orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -20px) scale(1.1); }
}

/* 3D 面板 */
.agent-admin-panel-3d {
  position: relative;
  width: 100%;
  max-width: 1200px;
  height: 85vh;
  background: linear-gradient(145deg, #ffffff 0%, #f8fafc 100%);
  border-radius: 24px;
  box-shadow: 
    0 32px 64px -16px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.5) inset;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform-style: preserve-3d;
  transition: transform 0.3s ease;
}

/* 面板光效边框 */
.panel-glow {
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, 
    rgba(59, 130, 246, 0.5) 0%, 
    rgba(139, 92, 246, 0.5) 50%, 
    rgba(16, 185, 129, 0.5) 100%
  );
  border-radius: 25px;
  z-index: -1;
  filter: blur(8px);
  opacity: 0.5;
  animation: glow-pulse 3s ease-in-out infinite;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.7; }
}

/* 3D 动画 */
.admin-3d-enter-active,
.admin-3d-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.admin-3d-enter-from,
.admin-3d-leave-to {
  opacity: 0;
}

.admin-3d-enter-from .agent-admin-panel-3d,
.admin-3d-leave-to .agent-admin-panel-3d {
  transform: perspective(1000px) rotateX(10deg) translateY(-50px) scale(0.9);
  opacity: 0;
}

.admin-3d-enter-active .agent-admin-panel-3d {
  animation: panel-enter 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes panel-enter {
  from {
    transform: perspective(1000px) rotateX(10deg) translateY(-50px) scale(0.9);
    opacity: 0;
  }
  to {
    transform: perspective(1000px) rotateX(0) translateY(0) scale(1);
    opacity: 1;
  }
}

/* 响应式 */
@media (max-width: 768px) {
  .agent-admin-overlay-3d {
    padding: 0;
  }
  
  .agent-admin-panel-3d {
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }
  
  .panel-glow {
    display: none;
  }
}
</style>
