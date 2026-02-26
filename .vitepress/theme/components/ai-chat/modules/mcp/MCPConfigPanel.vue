<!--
  MCP Config Panel - MCP 配置面板
  
  功能：
  - 管理 MCP Server 连接
  - 从预设快速添加
  - 自定义配置
  - 连接状态监控
-->
<template>
  <div class="mcp-config-panel">
    <!-- 头部 -->
    <div class="panel-header">
      <div class="header-title">
        <svg class="icon-mcp" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <h3>MCP 服务管理</h3>
      </div>
      <button class="btn-add" @click="showAddDialog = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        添加服务
      </button>
    </div>

    <!-- 统计信息 -->
    <div class="stats-bar">
      <div class="stat-item">
        <span class="stat-value">{{ servers.length }}</span>
        <span class="stat-label">总计</span>
      </div>
      <div class="stat-item success">
        <span class="stat-value">{{ connectedCount }}</span>
        <span class="stat-label">已连接</span>
      </div>
      <div class="stat-item error">
        <span class="stat-value">{{ errorCount }}</span>
        <span class="stat-label">错误</span>
      </div>
      <div class="stat-item">
        <span class="stat-value">{{ totalTools }}</span>
        <span class="stat-label">可用工具</span>
      </div>
    </div>

    <!-- Server 列表 -->
    <div class="servers-list">
      <div 
        v-for="server in servers" 
        :key="server.id"
        class="server-card"
        :class="server.status"
      >
        <div class="server-header">
          <div class="server-info">
            <span class="server-icon">{{ getCategoryIcon(server.config.category) }}</span>
            <div class="server-details">
              <h4 class="server-name">{{ server.config.name }}</h4>
              <p class="server-desc">{{ server.config.description }}</p>
            </div>
          </div>
          <div class="server-status">
            <span class="status-badge" :class="server.status">
              {{ statusText[server.status] }}
            </span>
            <button 
              v-if="server.status === 'disconnected' || server.status === 'error'"
              class="btn-connect"
              :disabled="connecting === server.id"
              @click="connectServer(server.id)"
            >
              <span v-if="connecting === server.id" class="spinner"/>
              <span v-else>连接</span>
            </button>
            <button 
              v-else-if="server.status === 'connected'"
              class="btn-disconnect"
              @click="disconnectServer(server.id)"
            >
              断开
            </button>
          </div>
        </div>

        <div class="server-body">
          <div class="server-meta">
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
              {{ server.config.transport.toUpperCase() }}
            </span>
            <span class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ server.tools.length }} 工具
            </span>
            <span v-if="server.lastConnectedAt" class="meta-item">
              上次连接: {{ formatTime(server.lastConnectedAt) }}
            </span>
          </div>

          <div v-if="server.error" class="error-message">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {{ server.error }}
          </div>
        </div>

        <div class="server-actions">
          <button class="btn-action" @click="editServer(server.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            编辑
          </button>
          <button class="btn-action" @click="viewTools(server)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            工具列表
          </button>
          <button class="btn-action danger" @click="removeServer(server.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>

    <!-- 添加 Server 对话框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddDialog" class="modal-overlay" @click.self="showAddDialog = false">
          <div class="modal-content">
            <div class="modal-header">
              <h4>添加 MCP 服务</h4>
              <button class="btn-close" @click="showAddDialog = false">×</button>
            </div>

            <div class="modal-body">
              <!-- 预设选择 -->
              <div class="preset-section">
                <h5>快速添加预设</h5>
                <div class="category-tabs">
                  <button 
                    v-for="cat in categories" 
                    :key="cat.id"
                    class="tab-btn"
                    :class="{ active: activeCategory === cat.id }"
                    @click="activeCategory = cat.id"
                  >
                    {{ cat.name }}
                  </button>
                </div>

                <div class="preset-grid">
                  <div 
                    v-for="preset in filteredPresets" 
                    :key="preset.id"
                    class="preset-card"
                    @click="selectPreset(preset)"
                  >
                    <span class="preset-icon">{{ getCategoryIcon(preset.category) }}</span>
                    <div class="preset-info">
                      <h6>{{ preset.name }}</h6>
                      <p>{{ preset.description }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="divider">或</div>

              <!-- 自定义配置 -->
              <button class="btn-custom" @click="showCustomForm = true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                自定义配置
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 预设配置对话框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="selectedPreset" class="modal-overlay" @click.self="selectedPreset = null">
          <div class="modal-content">
            <div class="modal-header">
              <h4>配置 {{ selectedPreset.name }}</h4>
              <button class="btn-close" @click="selectedPreset = null">×</button>
            </div>

            <div class="modal-body">
              <p class="preset-description">{{ selectedPreset.description }}</p>

              <div v-if="selectedPreset.requiredConfig?.length" class="config-form">
                <div 
                  v-for="field in selectedPreset.requiredConfig" 
                  :key="field.key"
                  class="form-group"
                >
                  <label>{{ field.label }}</label>
                  <input 
                    v-if="field.type === 'string' || field.type === 'password'"
                    v-model="presetConfig[field.key]"
                    :type="field.type === 'password' ? 'password' : 'text'"
                    :placeholder="field.description"
                  />
                  <select v-else-if="field.type === 'select'" v-model="presetConfig[field.key]">
                    <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <input v-else-if="field.type === 'number'" v-model.number="presetConfig[field.key]" type="number"/>
                  <span v-if="field.description" class="field-hint">{{ field.description }}</span>
                </div>
              </div>

              <div class="modal-actions">
                <button class="btn-cancel" @click="selectedPreset = null">取消</button>
                <button 
                  class="btn-save" 
                  :disabled="!isPresetConfigValid"
                  @click="addPresetServer"
                >
                  添加并连接
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 工具列表对话框 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="viewingServer" class="modal-overlay" @click.self="viewingServer = null">
          <div class="modal-content wide">
            <div class="modal-header">
              <h4>{{ viewingServer.config.name }} - 工具列表</h4>
              <button class="btn-close" @click="viewingServer = null">×</button>
            </div>

            <div class="modal-body">
              <div class="tools-list">
                <div 
                  v-for="tool in viewingServer.tools" 
                  :key="tool.name"
                  class="tool-item"
                >
                  <h6>{{ tool.name }}</h6>
                  <p>{{ tool.description }}</p>
                  <code class="tool-schema">{{ JSON.stringify(tool.inputSchema, null, 2) }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Teleport } from 'vue'
import { mcpManager } from '../../core/mcp/manager'
import { allMCPPresets, getPresetsByCategory } from '../../core/mcp/presets'
import type { MCPServerState, MCPPreset } from '../../core/mcp/types'

// 状态
const servers = ref<MCPServerState[]>([])
const showAddDialog = ref(false)
const showCustomForm = ref(false)
const selectedPreset = ref<MCPPreset | null>(null)
const presetConfig = ref<Record<string, any>>({})
const connecting = ref<string | null>(null)
const viewingServer = ref<MCPServerState | null>(null)
const activeCategory = ref('all')

// 分类
const categories = [
  { id: 'all', name: '全部' },
  { id: 'code', name: '代码平台' },
  { id: 'social', name: '社交媒体' },
  { id: 'dev', name: '开发工具' },
  { id: 'productivity', name: '生产力' }
]

// 状态文本
const statusText: Record<string, string> = {
  disconnected: '未连接',
  connecting: '连接中',
  connected: '已连接',
  error: '错误',
  reconnecting: '重连中'
}

// 计算属性
const connectedCount = computed(() => servers.value.filter(s => s.status === 'connected').length)
const errorCount = computed(() => servers.value.filter(s => s.status === 'error').length)
const totalTools = computed(() => servers.value.reduce((sum, s) => sum + s.tools.length, 0))

const filteredPresets = computed(() => {
  if (activeCategory.value === 'all') return allMCPPresets
  return getPresetsByCategory(activeCategory.value as MCPPreset['category'])
})

const isPresetConfigValid = computed(() => {
  if (!selectedPreset.value?.requiredConfig) return true
  return selectedPreset.value.requiredConfig.every(field => 
    presetConfig.value[field.key] !== undefined && 
    presetConfig.value[field.key] !== ''
  )
})

// 方法
function loadServers() {
  servers.value = mcpManager.getAllServers()
}

function getCategoryIcon(category?: string) {
  const icons: Record<string, string> = {
    code: '💻',
    social: '💬',
    dev: '🔧',
    productivity: '📦',
    other: '📎'
  }
  return icons[category || 'other']
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

async function connectServer(serverId: string) {
  connecting.value = serverId
  try {
    await mcpManager.connectServer(serverId)
    loadServers()
  } catch (error) {
    console.error('连接失败:', error)
  } finally {
    connecting.value = null
  }
}

async function disconnectServer(serverId: string) {
  await mcpManager.disconnectServer(serverId)
  loadServers()
}

function selectPreset(preset: MCPPreset) {
  selectedPreset.value = preset
  presetConfig.value = {}
  // 设置默认值
  preset.requiredConfig?.forEach(field => {
    if (field.defaultValue) {
      presetConfig.value[field.key] = field.defaultValue
    }
  })
}

async function addPresetServer() {
  if (!selectedPreset.value) return
  
  try {
    await mcpManager.addServerFromPreset(selectedPreset.value.id, presetConfig.value)
    selectedPreset.value = null
    showAddDialog.value = false
    loadServers()
    
    // 自动连接
    const servers = mcpManager.getAllServers()
    const newServer = servers[servers.length - 1]
    if (newServer) {
      await connectServer(newServer.id)
    }
  } catch (error) {
    console.error('添加失败:', error)
  }
}

function editServer(serverId: string) {
  // TODO: 实现编辑功能
  console.log('编辑 Server:', serverId)
}

function viewTools(server: MCPServerState) {
  viewingServer.value = server
}

async function removeServer(serverId: string) {
  if (!confirm('确定要删除这个 MCP 服务吗？')) return
  
  try {
    await mcpManager.removeServer(serverId)
    loadServers()
  } catch (error) {
    console.error('删除失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadServers()
  
  // 监听事件
  mcpManager.onEvent((type, event) => {
    console.log('[MCP] 事件:', type, event)
    if (type.startsWith('server.')) {
      loadServers()
    }
  })
})
</script>

<style scoped>
.mcp-config-panel {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.icon-mcp {
  width: 24px;
  height: 24px;
  color: #3b82f6;
}

.header-title h3 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #2563eb;
}

.btn-add svg {
  width: 16px;
  height: 16px;
}

/* 统计栏 */
.stats-bar {
  display: flex;
  gap: 24px;
  padding: 16px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
}

.stat-item.success .stat-value {
  color: #22c55e;
}

.stat-item.error .stat-value {
  color: #ef4444;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
}

/* Server 列表 */
.servers-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.server-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  transition: all 0.2s;
}

.server-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.server-card.connected {
  border-color: #86efac;
  background: #f0fdf4;
}

.server-card.error {
  border-color: #fca5a5;
  background: #fef2f2;
}

.server-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.server-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.server-icon {
  font-size: 24px;
  line-height: 1;
}

.server-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px;
}

.server-desc {
  font-size: 12px;
  color: #6b7280;
  margin: 0;
  max-width: 300px;
}

.server-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
}

.status-badge.disconnected {
  background: #e5e7eb;
  color: #6b7280;
}

.status-badge.connected {
  background: #86efac;
  color: #166534;
}

.status-badge.error {
  background: #fca5a5;
  color: #991b1b;
}

.status-badge.connecting,
.status-badge.reconnecting {
  background: #fef3c7;
  color: #92400e;
}

.btn-connect,
.btn-disconnect {
  padding: 6px 12px;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-connect {
  background: #3b82f6;
  color: white;
}

.btn-connect:hover:not(:disabled) {
  background: #2563eb;
}

.btn-disconnect {
  background: #e5e7eb;
  color: #374151;
}

.btn-disconnect:hover {
  background: #d1d5db;
}

.btn-connect:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Server 主体 */
.server-body {
  margin-bottom: 12px;
}

.server-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #6b7280;
}

.meta-item svg {
  width: 14px;
  height: 14px;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fee2e2;
  border-radius: 6px;
  font-size: 12px;
  color: #991b1b;
}

.error-message svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Server 操作 */
.server-actions {
  display: flex;
  gap: 8px;
}

.btn-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.btn-action.danger:hover {
  background: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
}

.btn-action svg {
  width: 14px;
  height: 14px;
}

/* 模态框 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 560px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.modal-content.wide {
  max-width: 720px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  font-size: 20px;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.btn-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: calc(80vh - 70px);
}

/* 预设选择 */
.preset-section h5 {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 12px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 6px 12px;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e5e7eb;
}

.tab-btn.active {
  background: #3b82f6;
  color: white;
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.preset-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.preset-card:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.preset-icon {
  font-size: 20px;
  line-height: 1;
}

.preset-info h6 {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px;
}

.preset-info p {
  font-size: 11px;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.divider {
  display: flex;
  align-items: center;
  margin: 20px 0;
  color: #9ca3af;
  font-size: 12px;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e5e7eb;
}

.divider::before {
  margin-right: 12px;
}

.divider::after {
  margin-left: 12px;
}

.btn-custom {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-custom:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.btn-custom svg {
  width: 20px;
  height: 20px;
}

/* 配置表单 */
.preset-description {
  font-size: 13px;
  color: #6b7280;
  margin: 0 0 16px;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select {
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 13px;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.field-hint {
  font-size: 11px;
  color: #9ca3af;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-cancel,
.btn-save {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f3f4f6;
  border: none;
  color: #374151;
}

.btn-cancel:hover {
  background: #e5e7eb;
}

.btn-save {
  background: #3b82f6;
  border: none;
  color: white;
}

.btn-save:hover:not(:disabled) {
  background: #2563eb;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 工具列表 */
.tools-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tool-item {
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.tool-item h6 {
  font-size: 13px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px;
}

.tool-item p {
  font-size: 12px;
  color: #6b7280;
  margin: 0 0 8px;
}

.tool-schema {
  display: block;
  padding: 8px;
  background: #1f2937;
  border-radius: 4px;
  font-size: 11px;
  color: #e5e7eb;
  overflow-x: auto;
}

/* 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
