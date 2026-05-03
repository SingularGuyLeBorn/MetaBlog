<!--
  AICenterPage - AI 中心总入口
  /agents 页面，包含 Chat 和 Manager 两个视图
-->
<template>
  <div class="ai-center-page">
    <!-- 次顶级栏 -->
    <nav class="sub-nav">
      <button
        v-for="tab in subTabs"
        :key="tab.id"
        class="sub-tab"
        :class="{ active: activeView === tab.id }"
        @click="activeView = tab.id"
      >
        <Icon :name="tab.icon" :size="16" />
        <span>{{ tab.label }}</span>
      </button>
    </nav>

    <!-- Chat 视图 -->
    <div v-show="activeView === 'chat'" class="view-wrapper">
      <ChatLayout />
    </div>

    <!-- Manager 视图 -->
    <div v-show="activeView === 'manager'" class="view-wrapper manager-view">
      <!-- 左侧导航 -->
      <aside class="manager-sidebar">
        <div class="sidebar-header">
          <span class="sidebar-title">管理中心</span>
        </div>
        <nav class="sidebar-nav">
          <button
            v-for="item in managerNavItems"
            :key="item.id"
            class="nav-item"
            :class="{ active: activeManagerModule === item.id }"
            @click="activeManagerModule = item.id"
          >
            <Icon :name="item.icon" :size="16" />
            <span>{{ item.label }}</span>
            <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
          </button>
        </nav>
      </aside>

      <!-- 右侧内容区 -->
      <main class="manager-content">
        <Suspense>
          <template #default>
            <component :is="activeModuleComponent" />
          </template>
          <template #fallback>
            <div class="module-loading">
              <Icon name="loader" class="loading-icon" />
              <span>加载中...</span>
            </div>
          </template>
        </Suspense>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@/theme/components/common'
import { ChatLayout } from '@/theme/components/ai-chat'
import { useAgentConfig } from '@/theme/stores'
import { computed, defineAsyncComponent, onMounted, ref } from 'vue'

const { init } = useAgentConfig()

// 异步加载各管理模块（按需加载）
const AgentManager = defineAsyncComponent(() => import('@/theme/components/agent/AgentManager.vue'))
const SkillsManager = defineAsyncComponent(() => import('@/theme/components/agent/SkillsManager.vue'))
const MemoryManager = defineAsyncComponent(() => import('@/theme/components/agent/MemoryManager.vue'))
const MCPConfigPanel = defineAsyncComponent(() => import('@/theme/components/agent/MCPConfigPanel.vue'))
const TaskManager = defineAsyncComponent(() => import('@/theme/components/agent/TaskManager.vue'))
const RuntimePanel = defineAsyncComponent(() => import('@/theme/components/agent/RuntimePanel.vue'))
const SettingsPlaceholder = defineAsyncComponent(() => import('@/theme/components/agent/SettingsPlaceholder.vue'))
const LogViewer = defineAsyncComponent(() => import('@/theme/components/agent/LogViewer.vue'))
const FileManager = defineAsyncComponent(() => import('@/theme/components/agent/FileManager.vue'))
const ArticleManager = defineAsyncComponent(() => import('@/theme/components/agent/ArticleManager.vue'))
const GitManager = defineAsyncComponent(() => import('@/theme/components/agent/GitManager.vue'))

const moduleMap: Record<string, any> = {
  agents: AgentManager,
  skills: SkillsManager,
  memory: MemoryManager,
  mcp: MCPConfigPanel,
  tasks: TaskManager,
  runtime: RuntimePanel,
  settings: SettingsPlaceholder,
  logs: LogViewer,
  files: FileManager,
  articles: ArticleManager,
  git: GitManager,
}

const subTabs = [
  { id: 'chat', label: 'Chat', icon: 'message-square' },
  { id: 'manager', label: 'Manager', icon: 'layout-grid' }
]

const managerNavItems = [
  { id: 'agents', label: 'Agents', icon: 'bot', badge: undefined as string | undefined },
  { id: 'skills', label: 'Skills', icon: 'zap', badge: undefined as string | undefined },
  { id: 'memory', label: 'Memory', icon: 'database', badge: undefined as string | undefined },
  { id: 'mcp', label: 'MCP', icon: 'plug', badge: undefined as string | undefined },
  { id: 'tasks', label: 'Tasks', icon: 'check-square', badge: undefined as string | undefined },
  { id: 'runtime', label: 'Runtime', icon: 'activity', badge: undefined as string | undefined },
  { id: 'logs', label: 'Logs', icon: 'scroll-text', badge: undefined as string | undefined },
  { id: 'files', label: 'Files', icon: 'folder-open', badge: undefined as string | undefined },
  { id: 'articles', label: 'Articles', icon: 'file-text', badge: undefined as string | undefined },
  { id: 'git', label: 'Git', icon: 'git-branch', badge: undefined as string | undefined },
  { id: 'settings', label: 'Settings', icon: 'settings', badge: undefined as string | undefined }
]

const activeView = ref<string>('chat')
const activeManagerModule = ref('agents')

const activeModuleComponent = computed(() => moduleMap[activeManagerModule.value] || AgentManager)

// 初始化 Agent/Skill 数据
onMounted(() => {
  init()
})
</script>

<style scoped>
.ai-center-page {
  height: calc(100vh - var(--vp-nav-height, 64px));
  display: flex;
  flex-direction: column;
  background: var(--ai-bg-body, #f8f6f3);
  overflow: hidden;
}

/* 次顶级栏 */
.sub-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 24px;
  background: rgba(248, 246, 243, 0.9);
  border-bottom: 1px solid rgba(200, 195, 188, 0.3);
  backdrop-filter: blur(12px);
  flex-shrink: 0;
  z-index: 10;
}

.sub-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 20px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.25s ease;
}

.sub-tab:hover {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-text-primary, #1a1a2e);
}

.sub-tab.active {
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
  box-shadow: 0 2px 8px rgba(184, 160, 144, 0.25);
}

/* 视图容器 */
.view-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.view-wrapper :deep(.chat-layout) {
  height: 100% !important;
}

/* Manager 视图 */
.manager-view {
  display: flex;
  flex-direction: row;
}

/* 左侧导航 */
.manager-sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: rgba(248, 246, 243, 0.6);
  border-right: 1px solid rgba(200, 195, 188, 0.25);
  backdrop-filter: blur(8px);
}

.sidebar-header {
  padding: 20px 20px 12px;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--sr-text-muted, #94a3b8);
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 0 12px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--sr-text-secondary, #6a6560);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.nav-item:hover {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-text-primary, #1a1a2e);
}

.nav-item.active {
  background: rgba(184, 160, 144, 0.15);
  color: var(--sr-text-primary, #1a1a2e);
  font-weight: 600;
}

.nav-badge {
  margin-left: auto;
  padding: 2px 8px;
  background: rgba(184, 160, 144, 0.2);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--sr-morandi-purple, #b3a8b8);
}

/* 右侧内容 */
.manager-content {
  flex: 1;
  min-width: 0;
  overflow: auto;
  padding: 24px;
}

.module-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 300px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
}

.loading-icon {
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式 */
@media (max-width: 768px) {
  .manager-sidebar {
    display: none;
  }
}
</style>
