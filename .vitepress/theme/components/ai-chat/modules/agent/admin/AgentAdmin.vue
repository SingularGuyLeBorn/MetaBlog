<!--
  AgentAdmin - Agent 管理后台（重构版）
  
  架构：
  - 双视图切换：首页（AgentHome）↔ 详情（AgentDetail）
  - 保持原有液态玻璃设计风格
  - 所有配置通过 API 持久化
-->
<template>
  <Teleport to="body">
    <Transition name="admin-fade">
      <div v-if="visible" class="agent-admin-overlay" @click.self="close">
        <div class="agent-admin-panel">
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

// 当前选中的 Agent（用于详情页）
const selectedAgent = ref<Agent | null>(null)

// 关闭面板
function close() {
  emit('update:visible', false)
  selectedAgent.value = null
}

// 打开详情页
function openDetail(agent: Agent) {
  selectedAgent.value = agent
}

// 保存 Agent 配置
function saveAgent(data: Partial<Agent>) {
  if (selectedAgent.value) {
    update(selectedAgent.value.id, data)
    // 更新本地对象以反映变化
    Object.assign(selectedAgent.value, data)
  }
}

// 删除 Agent
function deleteAgent(agent: Agent) {
  remove(agent.id)
  selectedAgent.value = null
}

// Agent 变更回调
function handleAgentChange(agent: Agent) {
  emit('agent-change', agent)
}
</script>

<style scoped>
.agent-admin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.agent-admin-panel {
  width: 100%;
  max-width: 1200px;
  height: 85vh;
  background: var(--vp-c-bg);
  border-radius: 20px;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1) inset;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 动画 */
.admin-fade-enter-active,
.admin-fade-leave-active {
  transition: all 0.3s ease;
}

.admin-fade-enter-from,
.admin-fade-leave-to {
  opacity: 0;
}

.admin-fade-enter-from .agent-admin-panel,
.admin-fade-leave-to .agent-admin-panel {
  transform: scale(0.95);
}

/* 深色模式 */
.dark .agent-admin-panel {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 响应式 */
@media (max-width: 768px) {
  .agent-admin-overlay {
    padding: 0;
  }
  
  .agent-admin-panel {
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }
}
</style>
