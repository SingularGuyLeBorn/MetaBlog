<!--
  ToolsManager - 工具管理面板
  
  管理 Agent 可调用的工具
-->
<template>
  <Teleport to="body">
    <Transition name="tools-fade">
      <div v-if="visible" class="tools-overlay" @click.self="close">
        <div class="tools-panel">
          <div class="panel-header">
            <div class="header-title">
              <span class="header-icon">🛠️</span>
              <h3>工具管理</h3>
            </div>
            <button class="close-btn" @click="close">✕</button>
          </div>

          <div class="panel-body">
            <!-- 工具列表 -->
            <div class="tools-list">
              <div
                v-for="tool in tools"
                :key="tool.id"
                class="tool-item"
                :class="{ enabled: tool.enabled }"
              >
                <div class="tool-icon">{{ tool.icon }}</div>
                <div class="tool-info">
                  <h4 class="tool-name">{{ tool.name }}</h4>
                  <p class="tool-desc">{{ tool.description }}</p>
                  <div class="tool-tags">
                    <span v-for="tag in tool.tags" :key="tag" class="tool-tag">{{ tag }}</span>
                  </div>
                </div>
                <label class="toggle-switch">
                  <input type="checkbox" v-model="tool.enabled" />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>

            <!-- 工具说明 -->
            <div class="tools-help">
              <h4>💡 关于工具</h4>
              <p>工具允许 Agent 执行特定任务，如文件操作、网络搜索、代码执行等。启用工具会扩展 Agent 的能力，但也可能增加安全风险。</p>
            </div>
          </div>

          <div class="panel-footer">
            <button class="btn-secondary" @click="close">取消</button>
            <button class="btn-primary" @click="save">保存</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const props = defineProps<{
  visible: boolean
  agentId?: string
}>()

const emit = defineEmits<{
  close: []
  save: [tools: Tool[]]
}>()

interface Tool {
  id: string
  name: string
  description: string
  icon: string
  enabled: boolean
  tags: string[]
}

const tools = reactive<Tool[]>([
  {
    id: 'file_read',
    name: '文件读取',
    description: '读取项目中的文件内容',
    icon: '📄',
    enabled: true,
    tags: ['文件', '读取']
  },
  {
    id: 'file_write',
    name: '文件写入',
    description: '创建或修改项目文件',
    icon: '✏️',
    enabled: false,
    tags: ['文件', '写入']
  },
  {
    id: 'web_search',
    name: '网络搜索',
    description: '搜索互联网获取最新信息',
    icon: '🔍',
    enabled: false,
    tags: ['搜索', '网络']
  },
  {
    id: 'code_execute',
    name: '代码执行',
    description: '执行代码片段（沙箱环境）',
    icon: '⚡',
    enabled: false,
    tags: ['代码', '执行']
  },
  {
    id: 'git_ops',
    name: 'Git 操作',
    description: '执行 Git 命令管理版本',
    icon: '🌿',
    enabled: false,
    tags: ['Git', '版本控制']
  },
  {
    id: 'terminal',
    name: '终端命令',
    description: '执行 Shell 命令',
    icon: '💻',
    enabled: false,
    tags: ['终端', '命令']
  }
])

function close() {
  emit('close')
}

function save() {
  emit('save', [...tools])
  close()
}
</script>

<style scoped>
.tools-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10002;
  padding: 20px;
}

.tools-panel {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(30px);
  border-radius: 20px;
  width: 100%;
  max-width: 560px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.6);
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  border-radius: 12px;
  font-size: 20px;
}

.header-title h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
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
  font-size: 18px;
  color: var(--vp-c-text-2);
  cursor: pointer;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.1);
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

/* Tools List */
.tools-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.6);
  border: 2px solid transparent;
  border-radius: 14px;
  transition: all 0.2s;
}

.tool-item.enabled {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.3);
}

.tool-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.tool-info {
  flex: 1;
}

.tool-name {
  margin: 0 0 4px 0;
  font-size: 15px;
  font-weight: 600;
}

.tool-desc {
  margin: 0 0 8px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
}

.tool-tags {
  display: flex;
  gap: 6px;
}

.tool-tag {
  padding: 2px 8px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 100px;
  font-size: 11px;
  color: var(--vp-c-text-2);
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 26px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  left: 2px;
  top: 2px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + .toggle-slider {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(22px);
}

/* Help Section */
.tools-help {
  padding: 16px;
  background: rgba(245, 158, 11, 0.08);
  border-radius: 12px;
}

.tools-help h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.tools-help p {
  margin: 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}

/* Footer */
.panel-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.6);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.btn-secondary {
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.05);
  color: var(--vp-c-text-1);
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-primary {
  padding: 10px 24px;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* Animation */
.tools-fade-enter-active,
.tools-fade-leave-active {
  transition: all 0.3s ease;
}

.tools-fade-enter-from,
.tools-fade-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

/* Dark Mode */
.dark .tools-panel {
  background: rgba(30, 30, 40, 0.95);
  border-color: rgba(255, 255, 255, 0.1);
}

.dark .tool-item {
  background: rgba(255, 255, 255, 0.05);
}

.dark .tool-item.enabled {
  background: rgba(245, 158, 11, 0.1);
}

.dark .tool-icon,
.dark .tool-tag {
  background: rgba(255, 255, 255, 0.1);
}

.dark .tools-help {
  background: rgba(245, 158, 11, 0.1);
}

.dark .panel-footer {
  background: rgba(255, 255, 255, 0.05);
}
</style>
