<!--
  AgentControlCenter - Agent 控制中心主组件
  
  功能：
  - 整合 Agent 列表和详情
  - 管理视图切换
  - 处理所有 Agent 操作
-->
<template>
  <Teleport to="body">
    <Transition name="center-fade">
      <div v-if="visible" class="control-center-overlay" @click.self="close">
        <div class="control-center-panel">
          <!-- 列表视图 -->
          <AgentList
            v-if="!selectedAgent"
            :agents="sortedAgents"
            :active-agent-id="activeAgentId"
            :agents-by-status="agentsByStatus"
            @create="openCreate"
            @select="selectAgent"
            @start="startAgent"
            @pause="pauseAgent"
            @edit="editAgent"
            @delete="confirmDelete"
          />
          
          <!-- 详情视图 -->
          <AgentDetailPanel
            v-else
            :agent="selectedAgent"
            @back="selectedAgent = null"
            @save="saveAgent"
            @start="startAgent"
            @pause="pauseAgent"
            @test="handleTest"
          />
        </div>
      </div>
    </Transition>
    
    <!-- 新建 Agent 弹窗 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showCreateModal" class="modal-overlay" @click.self="showCreateModal = false">
          <div class="create-modal">
            <div class="modal-header">
              <h3>🤖 新建 Agent</h3>
              <button class="btn-close" @click="showCreateModal = false">✕</button>
            </div>
            
            <div class="modal-body">
              <div class="form-group">
                <label>名称 *</label>
                <input 
                  v-model="createForm.name" 
                  type="text" 
                  placeholder="给你的 Agent 起个名字"
                  class="form-input"
                  @keyup.enter="doCreate"
                />
              </div>
              
              <div class="form-group">
                <label>描述</label>
                <textarea 
                  v-model="createForm.description" 
                  rows="3"
                  placeholder="描述这个 Agent 的用途..."
                  class="form-textarea"
                ></textarea>
              </div>
              
              <div class="form-group">
                <label>头像预览</label>
                <div class="avatar-preview">
                  <img :src="previewAvatarUrl" alt="avatar" />
                  <span>#{{ previewAvatarId }}</span>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn-secondary" @click="showCreateModal = false">取消</button>
              <button 
                class="btn-primary" 
                @click="doCreate"
                :disabled="!createForm.name.trim()"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    
    <!-- 删除确认 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="deleteConfirm" class="modal-overlay" @click.self="deleteConfirm = null">
          <div class="confirm-modal">
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
import { ref, computed, onMounted } from 'vue'
import AgentList from './AgentList.vue'
import AgentDetailPanel from './AgentDetailPanel.vue'
import { useAgentControl, generateAvatarUrl, getRandomAvatarId } from '../../../core/composables/useAgentControl'
import type { Agent } from '../../../core/composables/useAgentControl'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

// Agent 控制逻辑
const {
  agents,
  activeAgentId,
  agentsByStatus,
  sortedAgents,
  init,
  create,
  update,
  remove,
  setActive,
  startAgent: doStart,
  pauseAgent: doPause,
} = useAgentControl()

// 本地状态
const selectedAgent = ref<Agent | null>(null)
const showCreateModal = ref(false)
const deleteConfirm = ref<Agent | null>(null)

// 创建表单
const createForm = ref({
  name: '',
  description: '',
})

const previewAvatarId = ref(1)

const previewAvatarUrl = computed(() => 
  generateAvatarUrl(previewAvatarId.value)
)

// 初始化
onMounted(() => {
  init()
})

// 关闭面板
function close() {
  emit('update:visible', false)
  selectedAgent.value = null
}

// 选择 Agent 查看详情
function selectAgent(agent: Agent) {
  selectedAgent.value = agent
}

// 打开创建弹窗
function openCreate() {
  createForm.value = { name: '', description: '' }
  previewAvatarId.value = getRandomAvatarId(agents.value.map(a => a.avatarId))
  showCreateModal.value = true
}

// 创建 Agent
function doCreate() {
  if (!createForm.value.name.trim()) return
  
  const agent = create({
    name: createForm.value.name.trim(),
    description: createForm.value.description.trim(),
    avatarId: previewAvatarId.value
  })
  
  showCreateModal.value = false
  selectedAgent.value = agent
}

// 编辑 Agent
function editAgent(agent: Agent) {
  selectedAgent.value = agent
}

// 保存 Agent
function saveAgent(data: Partial<Agent>) {
  if (selectedAgent.value) {
    update(selectedAgent.value.id, data)
    // 更新本地选中的 agent
    Object.assign(selectedAgent.value, data)
  }
}

// 启动 Agent
function startAgent(agent: Agent) {
  doStart(agent.id)
  agent.status = 'running'
  agent.lastRunAt = new Date()
}

// 暂停 Agent
function pauseAgent(agent: Agent) {
  doPause(agent.id)
  agent.status = 'paused'
}

// 确认删除
function confirmDelete(agent: Agent) {
  deleteConfirm.value = agent
}

// 执行删除
function doDelete() {
  if (deleteConfirm.value) {
    remove(deleteConfirm.value.id)
    if (selectedAgent.value?.id === deleteConfirm.value.id) {
      selectedAgent.value = null
    }
    deleteConfirm.value = null
  }
}

// 处理测试消息
function handleTest(message: string) {
  console.log('Test message:', message)
  // TODO: 实现测试逻辑
}
</script>

<style scoped>
.control-center-overlay {
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

.control-center-panel {
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
.center-fade-enter-active,
.center-fade-leave-active {
  transition: all 0.3s ease;
}

.center-fade-enter-from,
.center-fade-leave-to {
  opacity: 0;
}

.center-fade-enter-from .control-center-panel,
.center-fade-leave-to .control-center-panel {
  transform: scale(0.95);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10001;
  padding: 20px;
}

.create-modal,
.confirm-modal {
  background: var(--vp-c-bg);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.create-modal {
  width: 100%;
  max-width: 480px;
}

.confirm-modal {
  width: 100%;
  max-width: 360px;
  padding: 28px;
  text-align: center;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--vp-c-divider);
}

.modal-header h3 {
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

.modal-body {
  padding: 24px;
}

.modal-footer {
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
.form-textarea {
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
.form-textarea:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.avatar-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.avatar-preview img {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: var(--vp-c-bg-mute);
}

.avatar-preview span {
  font-size: 14px;
  color: var(--vp-c-text-2);
  font-weight: 500;
}

/* 按钮 */
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
  background: var(--vp-c-bg-mute);
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

/* 确认弹窗 */
.confirm-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.confirm-modal h4 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.confirm-modal p {
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

/* 动画 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: all 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .create-modal,
.modal-fade-enter-from .confirm-modal,
.modal-fade-leave-to .create-modal,
.modal-fade-leave-to .confirm-modal {
  transform: scale(0.95);
}

/* 深色模式 */
.dark .control-center-panel {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dark .create-modal,
.dark .confirm-modal {
  background: #1a1a2e;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

/* 响应式 */
@media (max-width: 768px) {
  .control-center-overlay {
    padding: 0;
  }
  
  .control-center-panel {
    height: 100vh;
    max-width: 100%;
    border-radius: 0;
  }
}
</style>
