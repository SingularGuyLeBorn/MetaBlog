<!--
  AgentManager - Agent 管理中心
  卡片网格首页 + 标签页式编辑
-->
<template>
  <div class="agent-manager">
    <!-- 顶部标签栏（浏览器风格） -->
    <div class="tab-bar">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span v-if="tab.icon" class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
        <button
          v-if="tab.closable"
          class="tab-close"
          @click.stop="closeTab(tab.id)"
        >
          <Icon name="x" :size="12" />
        </button>
      </button>
      <button class="tab-new" @click="activeTab = 'home'">
        <Icon name="plus" :size="14" />
      </button>
    </div>

    <!-- 首页：Agent 卡片网格 -->
    <div v-if="activeTab === 'home'" class="tab-content">
      <div class="page-header">
        <div class="header-info">
          <h2 class="page-title">
            <Icon name="bot" :size="20" />
            Agents
          </h2>
          <span class="page-count">{{ agents.length }} 个 Agent</span>
        </div>
        <button class="new-agent-btn" @click="createNewAgent">
          <Icon name="plus" :size="14" />
          New Agent
        </button>
      </div>

      <!-- 过滤栏 -->
      <div class="filter-bar">
        <div class="search-box">
          <Icon name="search" :size="14" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索 Agent..."
          />
        </div>
        <div class="filter-group">
          <button
            v-for="f in statusFilters"
            :key="f.value"
            class="filter-chip"
            :class="{ active: statusFilter === f.value }"
            @click="statusFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>
      </div>

      <!-- 卡片网格 -->
      <div class="agents-grid">
        <LiquidGlass
          v-for="agent in filteredAgents"
          :key="agent.id"
          class="agent-card-glass"
          :glow-color="getStatusColor(agent.status)"
          :intensity="0.2"
        >
          <div class="agent-card">
            <div class="card-header">
              <span class="card-avatar">{{ agent.avatar }}</span>
              <div class="card-tags">
                <span class="status-tag" :class="agent.status">
                  {{ statusLabel(agent.status) }}
                </span>
                <span
                  v-for="taskType in getAgentTaskTypes(agent.id)"
                  :key="taskType"
                  class="task-tag"
                >
                  {{ taskType }}
                </span>
              </div>
            </div>

            <div class="card-body">
              <h3 class="card-name">{{ agent.name }}</h3>
              <p class="card-desc">{{ agent.description }}</p>
            </div>

            <div class="card-stats">
              <span class="stat-item">
                <Icon name="zap" :size="12" />
                {{ agent.capabilities?.skillIds?.length || 0 }} 技能
              </span>
              <span class="stat-item">
                <Icon name="tool" :size="12" />
                {{ getToolCount(agent) }} 工具
              </span>
            </div>

            <div class="card-actions">
              <button class="action-btn" @click="openEditTab(agent)" title="编辑">
                <Icon name="edit-2" :size="14" />
              </button>
              <button class="action-btn danger" @click="deleteAgent(agent.id)" title="删除">
                <Icon name="trash-2" :size="14" />
              </button>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>

    <!-- 编辑标签页 -->
    <div
      v-for="tab in editTabs"
      v-show="activeTab === tab.id"
      :key="tab.id"
      class="tab-content"
    >
      <AgentConfigPanel
        :agent="tab.agent"
        @save="handleSave"
        @cancel="activeTab = 'home'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, LiquidGlass } from '@/theme/components/common'
import { useAgentConfig } from '@/theme/stores'
import type { Agent } from '@/theme/types'
import { computed, ref } from 'vue'
import AgentConfigPanel from './AgentConfigPanel.vue'

const { agents, deleteAgent: removeAgent } = useAgentConfig()

const activeTab = ref('home')
const searchQuery = ref('')
const statusFilter = ref('all')

const statusFilters = [
  { label: '全部', value: 'all' },
  { label: '在线', value: 'online' },
  { label: '忙碌', value: 'busy' },
  { label: '空闲', value: 'idle' },
  { label: '离线', value: 'offline' }
]

const tabs = computed(() => [
  { id: 'home', label: '首页', icon: '🏠', closable: false as boolean },
  ...editTabs.value.map(t => ({ id: t.id, label: t.agent.name, icon: undefined as string | undefined, closable: true as boolean }))
])

const editTabs = ref<Array<{ id: string; agent: Agent }>>([])

const filteredAgents = computed(() => {
  let result = agents.value
  if (statusFilter.value !== 'all') {
    result = result.filter(a => a.status === statusFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q)
    )
  }
  return result
})

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    online: 'var(--sr-morandi-green, #a8b3a8)',
    busy: 'var(--sr-morandi-pink, #d4b8b8)',
    idle: 'var(--sr-morandi-blue, #9daab8)',
    offline: 'var(--sr-text-muted, #94a3b8)'
  }
  return map[status] || map.offline
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    online: '在线',
    busy: '忙碌',
    idle: '空闲',
    offline: '离线'
  }
  return map[status] || status
}

function getToolCount(agent: Agent): number {
  return (agent as any).toolIds?.length || agent.capabilities?.toolIds?.length || 0
}

function getAgentTaskTypes(_agentId: string): string[] {
  // TODO: 从 Task 系统获取
  return []
}

function openEditTab(agent: Agent) {
  const tabId = `edit-${agent.id}`
  if (!editTabs.value.find(t => t.id === tabId)) {
    editTabs.value.push({ id: tabId, agent })
  }
  activeTab.value = tabId
}

function closeTab(tabId: string) {
  editTabs.value = editTabs.value.filter(t => t.id !== tabId)
  if (activeTab.value === tabId) {
    activeTab.value = 'home'
  }
}

function createNewAgent() {
  // TODO: 打开新建弹窗或标签页
  alert('新建 Agent 功能开发中')
}

function handleSave() {
  activeTab.value = 'home'
}

async function deleteAgent(id: string) {
  if (!confirm('确定要删除这个 Agent 吗？')) return
  await removeAgent(id)
}
</script>

<style scoped>
.agent-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 标签栏 */
.tab-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px 0;
  border-bottom: 1px solid rgba(200, 195, 188, 0.25);
  background: rgba(248, 246, 243, 0.5);
  flex-shrink: 0;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 8px 8px 0 0;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: rgba(184, 160, 144, 0.08);
  color: var(--sr-text-primary, #1a1a2e);
}

.tab-btn.active {
  color: var(--sr-text-primary, #1a1a2e);
  border-bottom-color: var(--sr-accent-star, #b8a090);
  background: rgba(184, 160, 144, 0.1);
}

.tab-icon {
  font-size: 14px;
}

.tab-close {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  margin-left: 4px;
  opacity: 0;
  transition: opacity 0.15s;
}

.tab-btn:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: rgba(0, 0, 0, 0.08);
  color: var(--sr-text-primary, #1a1a2e);
}

.tab-new {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-new:hover {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-text-primary, #1a1a2e);
}

/* 内容区 */
.tab-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  min-height: 0;
}

/* 页面头部 */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-info {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.page-count {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.new-agent-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(184, 160, 144, 0.25);
}

.new-agent-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(184, 160, 144, 0.35);
}

/* 过滤栏 */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(200, 195, 188, 0.3);
  border-radius: 10px;
  min-width: 240px;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  width: 100%;
}

.search-box input::placeholder {
  color: var(--sr-text-muted, #94a3b8);
}

.filter-group {
  display: flex;
  gap: 6px;
}

.filter-chip {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(200, 195, 188, 0.25);
  border-radius: 20px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip:hover {
  background: rgba(184, 160, 144, 0.1);
}

.filter-chip.active {
  background: rgba(184, 160, 144, 0.15);
  border-color: rgba(184, 160, 144, 0.3);
  color: var(--sr-morandi-purple, #b3a8b8);
  font-weight: 600;
}

/* 卡片网格 */
.agents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.agent-card-glass {
  border-radius: 20px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.agent-card-glass:hover {
  transform: translateY(-2px);
}

.agent-card {
  padding: 20px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-avatar {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  background: rgba(184, 160, 144, 0.12);
  border-radius: 12px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: flex-end;
}

.status-tag {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.status-tag.online {
  background: rgba(168, 179, 168, 0.2);
  color: #6a8a6a;
}

.status-tag.busy {
  background: rgba(212, 184, 184, 0.2);
  color: #a87070;
}

.status-tag.idle {
  background: rgba(157, 170, 184, 0.2);
  color: #5a7a9a;
}

.status-tag.offline {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}

.task-tag {
  padding: 2px 8px;
  background: rgba(184, 160, 144, 0.12);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 500;
  color: var(--sr-morandi-purple, #b3a8b8);
}

.card-body {
  margin-bottom: 12px;
}

.card-name {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.card-desc {
  margin: 0;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  background: rgba(0, 0, 0, 0.04);
  border: none;
  border-radius: 6px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(184, 160, 144, 0.12);
  color: var(--sr-morandi-purple, #b3a8b8);
}

.action-btn.danger:hover {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}
</style>
