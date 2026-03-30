<template>
  <div class="mcp-config">
    <!-- 头部 -->
    <div class="config-header">
      <div class="header-title">
        <Icon name="cpu" class="title-icon" />
        <div>
          <h2 class="title-text">MCP 配置</h2>
          <p class="title-desc">模型上下文协议(Model Context Protocol)设置</p>
        </div>
      </div>
    </div>

    <!-- 服务器列表 -->
    <div class="servers-section">
      <div class="section-header">
        <h3>MCP 服务器</h3>
        <LiquidGlass glow-color="#8b5cf6" :intensity="0.4">
          <button class="add-btn" @click="showAddServer = true">
            <Icon name="plus" />
            添加服务器          </button>
        </LiquidGlass>
      </div>

      <div class="servers-grid">
        <LiquidGlass
          v-for="(server, idx) in servers"
          :key="server.id"
          class="server-card-glass"
          :glow-color="server.status === 'connected' ? '#10b981' : '#ef4444'"
          :intensity="server.status === 'connected' ? 0.3 : 0.2"
        >
          <div class="server-card">
            <div class="server-header">
              <div class="server-icon" :style="{ background: server.gradient }">
                <Icon :name="server.icon" />
              </div>
              <div class="server-status" :class="server.status">
                <span class="status-dot" />
                {{ server.status === 'connected' ? '已连接' : '未连接' }}
              </div>
            </div>
            
            <div class="server-body">
              <h4 class="server-name">{{ server.name }}</h4>
              <p class="server-desc">{{ server.description }}</p>
              <div class="server-tools">
                <Icon name="tool" />
                {{ server.tools }} 个工具              </div>
            </div>

            <div class="server-actions">
              <button class="action-btn" @click="editServer(server)">
                <Icon name="edit" />
              </button>
              <button class="action-btn danger" @click="removeServer(server.id)">
                <Icon name="trash-2" />
              </button>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>

    <!-- 全局设置 -->
    <LiquidGlass class="settings-glass" glow-color="#3b82f6" :intensity="0.2">
      <div class="settings-card">
        <h3 class="settings-title">
          <Icon name="settings" />
          全局设置
        </h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">自动重连</span>
            <span class="setting-desc">连接断开后自动尝试重连</span>
          </div>
          <label class="lg-toggle">
            <input v-model="settings.autoReconnect" type="checkbox" />
            <span class="lg-toggle-slider" :class="{ on: settings.autoReconnect }" />
          </label>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">请求超时</span>
            <span class="setting-desc">MCP 请求的最大等待时间</span>
          </div>
          <input
            v-model.number="settings.timeout"
            type="number"
            class="lg-input timeout-input"
            min="1"
            max="60"
          />
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">日志级别</span>
            <span class="setting-desc">MCP 客户端日志详细程度</span>
          </div>
          <select v-model="settings.logLevel" class="lg-input">
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>
    </LiquidGlass>

    <!-- 添加服务器弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showAddServer" class="modal-overlay" @click.self="showAddServer = false">
          <LiquidGlass class="modal-glass" glow-color="#8b5cf6" :intensity="0.4">
            <div class="add-server-modal">
              <div class="modal-header">
                <h3>添加 MCP 服务器</h3>
                <button class="close-btn" @click="showAddServer = false">
                  <Icon name="x" />
                </button>
              </div>

              <div class="modal-body">
                <div class="form-group">
                  <label>服务器名称</label>
                  <input v-model="newServer.name" type="text" class="lg-input" placeholder="My MCP Server" />
                </div>

                <div class="form-group">
                  <label>连接地址</label>
                  <input v-model="newServer.url" type="text" class="lg-input" placeholder="ws://localhost:3000" />
                </div>

                <div class="form-group">
                  <label>描述</label>
                  <textarea v-model="newServer.description" class="lg-input" rows="2" placeholder="服务器功能描述..." />
                </div>

                <div class="form-group">
                  <label>认证令牌 (可选)</label>
                  <input v-model="newServer.token" type="password" class="lg-input" placeholder="Bearer token..." />
                </div>
              </div>

              <div class="modal-footer">
                <LiquidGlass glow-color="#64748b" :intensity="0.2">
                  <button class="lg-btn" @click="showAddServer = false">取消</button>
                </LiquidGlass>
                <LiquidGlass glow-color="#8b5cf6" :intensity="0.5">
                  <button class="lg-btn lg-btn-primary" @click="addServer">
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
import { ref } from 'vue'
import { Icon } from '@/theme/components/common'
import { LiquidGlass } from '@/theme/components/common'

const showAddServer = ref(false)

const servers = ref([
  {
    id: '1',
    name: '文件系统',
    description: '访问本地文件系统，读取和写入文件',
    icon: 'folder',
    gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    status: 'connected',
    tools: 8
  },
  {
    id: '2',
    name: '数据库',
    description: '连接 SQLite 数据库执行查询',
    icon: 'database',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    status: 'disconnected',
    tools: 5
  }
])

const settings = ref({
  autoReconnect: true,
  timeout: 30,
  logLevel: 'info'
})

const newServer = ref({
  name: '',
  url: '',
  description: '',
  token: ''
})

function addServer() {
  servers.value.push({
    id: Date.now().toString(),
    name: newServer.value.name,
    description: newServer.value.description,
    icon: 'server',
    gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    status: 'disconnected',
    tools: 0
  })
  showAddServer.value = false
  newServer.value = { name: '', url: '', description: '', token: '' }
}

function editServer(server: any) {
  console.log('Edit server:', server)
}

function removeServer(id: string) {
  if (confirm('确定要删除这个服务器吗？')) {
    servers.value = servers.value.filter(s => s.id !== id)
  }
}
</script>

<style scoped>
/* 使用全局导入的 liquid-glass-theme.css */

.mcp-config {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

/* 头部 */
.config-header {
  margin-bottom: 24px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 48px;
  height: 48px;
  color: #8b5cf6;
}

.title-text {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1e293b;
}

.title-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: #64748b;
}

/* 服务器区 */
.servers-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.add-btn svg {
  width: 16px;
  height: 16px;
}

.servers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.server-card-glass {
  border-radius: 20px;
}

.server-card {
  padding: 24px;
}

.server-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.server-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.server-icon svg {
  width: 24px;
  height: 24px;
}

.server-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.server-status.connected {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.server-status.disconnected {
  background: rgba(239, 68, 68, 0.15);
  color: #dc2626;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.server-body {
  margin-bottom: 16px;
}

.server-name {
  margin: 0 0 6px;
  font-size: 17px;
  font-weight: 700;
  color: #1e293b;
}

.server-desc {
  margin: 0 0 10px;
  font-size: 13px;
  color: #64748b;
}

.server-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8b5cf6;
  font-weight: 500;
}

.server-tools svg {
  width: 14px;
  height: 14px;
}

.server-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.action-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.2);
  color: #8b5cf6;
}

.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.action-btn svg {
  width: 16px;
  height: 16px;
}

/* 设置卡片 */
.settings-glass {
  border-radius: 24px;
}

.settings-card {
  padding: 28px;
}

.settings-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 24px;
  font-size: 18px;
  font-weight: 700;
  color: #1e293b;
}

.settings-title svg {
  width: 22px;
  height: 22px;
  color: #3b82f6;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-weight: 600;
  font-size: 15px;
  color: #374151;
}

.setting-desc {
  font-size: 13px;
  color: #94a3b8;
}

.timeout-input {
  width: 100px;
  text-align: center;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  z-index: 1100;
  padding: 24px;
}

.modal-glass {
  width: 90%;
  max-width: 480px;
  border-radius: 24px;
}

.add-server-modal {
  padding: 28px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
}

.close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 10px;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  transform: rotate(90deg);
}

.close-btn svg {
  width: 20px;
  height: 20px;
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

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.9);
}

@media (max-width: 640px) {
  .servers-grid {
    grid-template-columns: 1fr;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
