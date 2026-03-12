<!--
  AgentList - Agent 列表页
  
  功能：
  - 状态筛选栏
  - Agent 卡片网格
  - 新建 Agent 按钮
  - 统计信息
-->
<template>
  <div class="agent-list-page">
    <!-- 顶部工具栏 -->
    <div class="list-toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">
          <span class="title-icon">🤖</span>
          Agent 管理
        </h2>
        <span class="agent-count">共 {{ agents.length }} 个</span>
      </div>
      
      <div class="toolbar-right">
        <!-- 搜索框 -->
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索 Agent..."
            class="search-input"
          />
          <span class="search-icon">🔍</span>
        </div>
        
        <!-- 新建按钮 -->
        <button class="btn-create" @click="$emit('create')">
          <span>+</span>
          <span>新建 Agent</span>
        </button>
      </div>
    </div>
    
    <!-- 状态筛选栏 -->
    <div class="status-filter-bar">
      <button
        v-for="filter in statusFilters"
        :key="filter.status"
        class="filter-btn"
        :class="{ active: currentFilter === filter.status }"
        @click="currentFilter = filter.status"
      >
        <span class="filter-icon">{{ filter.icon }}</span>
        <span class="filter-name">{{ filter.name }}</span>
        <span class="filter-count" :class="filter.status">{{ filter.count }}</span>
      </button>
    </div>
    
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value running">{{ (agentsByStatus.running || []).length }}</div>
        <div class="stat-label">运行中</div>
      </div>
      <div class="stat-card">
        <div class="stat-value idle">{{ (agentsByStatus.idle || []).length }}</div>
        <div class="stat-label">空闲</div>
      </div>
      <div class="stat-card">
        <div class="stat-value paused">{{ (agentsByStatus.paused || []).length }}</div>
        <div class="stat-label">已暂停</div>
      </div>
      <div class="stat-card">
        <div class="stat-value error">{{ (agentsByStatus.error || []).length }}</div>
        <div class="stat-label">错误</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ totalRuns }}</div>
        <div class="stat-label">总运行次数</div>
      </div>
    </div>
    
    <!-- Agent 网格 -->
    <div class="agent-grid-container">
      <div v-if="filteredAgents.length === 0" class="empty-state">
        <div class="empty-icon">🤖</div>
        <h3>{{ emptyTitle }}</h3>
        <p>{{ emptyDesc }}</p>
        <button v-if="searchQuery" class="btn-clear" @click="searchQuery = ''">
          清除搜索
        </button>
        <button v-else class="btn-create-empty" @click="$emit('create')">
          创建第一个 Agent
        </button>
      </div>
      
      <div v-else class="agent-grid">
        <AgentStatusCard
          v-for="agent in filteredAgents"
          :key="agent.id"
          :agent="agent"
          :is-active="agent.id === activeAgentId"
          @click="$emit('select', agent)"
          @start="$emit('start', $event)"
          @pause="$emit('pause', $event)"
          @edit="$emit('edit', $event)"
          @delete="$emit('delete', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import AgentStatusCard from './AgentStatusCard.vue'
import type { Agent, AgentStatus } from '../../../core/composables'

const props = defineProps<{
  agents: Agent[]
  activeAgentId: string | null
  agentsByStatus: Record<AgentStatus | string, Agent[]>
}>()

const emit = defineEmits<{
  create: []
  select: [agent: Agent]
  start: [agent: Agent]
  pause: [agent: Agent]
  edit: [agent: Agent]
  delete: [agent: Agent]
}>()

// 搜索和筛选
const searchQuery = ref('')
const currentFilter = ref<string>('all')

// 状态筛选配置
const statusFilters = computed(() => [
  { status: 'all', name: '全部', icon: '🌐', count: props.agents.length },
  { status: 'running', name: '运行中', icon: '▶️', count: (props.agentsByStatus.running || []).length },
  { status: 'idle', name: '空闲', icon: '⏸️', count: (props.agentsByStatus.idle || []).length },
  { status: 'paused', name: '已暂停', icon: '⏹️', count: (props.agentsByStatus.paused || []).length },
  { status: 'error', name: '错误', icon: '⚠️', count: (props.agentsByStatus.error || []).length },
])

// 过滤后的 Agent
const filteredAgents = computed(() => {
  let result = props.agents
  
  // 按状态筛选
  if (currentFilter.value !== 'all') {
    result = result.filter(a => a.status === currentFilter.value)
  }
  
  // 按搜索词筛选
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(a => 
      a.name.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query)
    )
  }
  
  return result
})

// 总运行次数
const totalRuns = computed(() => 
  props.agents.reduce((sum, a) => sum + (a.totalRuns || 0), 0)
)

// 空状态文本
const emptyTitle = computed(() => {
  if (searchQuery.value) return '未找到匹配的 Agent'
  if (currentFilter.value !== 'all') return `暂无${statusFilters.value.find(f => f.status === currentFilter.value)?.name}的 Agent`
  return '还没有 Agent'
})

const emptyDesc = computed(() => {
  if (searchQuery.value) return '尝试使用其他关键词搜索'
  return '点击上方按钮创建你的第一个 AI Agent'
})
</script>

<style scoped>
.agent-list-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

/* 工具栏 */
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.title-icon {
  font-size: 24px;
}

.agent-count {
  font-size: 13px;
  color: var(--vp-c-text-2);
  padding: 4px 10px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 搜索框 */
.search-box {
  position: relative;
}

.search-input {
  width: 240px;
  padding: 10px 14px 10px 38px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  font-size: 14px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  outline: none;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  opacity: 0.5;
}

/* 新建按钮 */
.btn-create {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.3);
}

.btn-create:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(179, 168, 184, 0.4);
}

/* 状态筛选栏 */
.status-filter-bar {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
  overflow-x: auto;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  font-size: 13px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.filter-btn:hover {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}

.filter-btn.active {
  background: var(--vp-c-bg);
  border-color: var(--vp-c-brand);
  color: var(--vp-c-brand);
  font-weight: 500;
}

.filter-icon {
  font-size: 14px;
}

.filter-count {
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 10px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
}

.filter-count.running { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.filter-count.idle { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
.filter-count.paused { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.filter-count.error { background: rgba(212, 184, 184, 0.15); color: var(--sr-morandi-pink, #d4b8b8); }

/* 统计行 */
.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 12px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  transition: all 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.stat-value.running { color: #22c55e; }
.stat-value.idle { color: #6b7280; }
.stat-value.paused { color: #f59e0b; }
.stat-value.error { color: var(--sr-morandi-pink, #d4b8b8); }

.stat-label {
  font-size: 12px;
  color: var(--vp-c-text-2);
}

/* Agent 网格容器 */
.agent-grid-container {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
}

.agent-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.empty-state p {
  margin: 0 0 20px 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.btn-clear,
.btn-create-empty {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-clear {
  background: var(--vp-c-bg-mute);
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.btn-clear:hover {
  background: var(--vp-c-bg);
}

.btn-create-empty {
  background: linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-accent-star, #b8a090));
  border: none;
  color: white;
  font-weight: 500;
}

.btn-create-empty:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(179, 168, 184, 0.3);
}

/* 深色模式 */
.dark .stat-card,
.dark .search-input {
  background: rgba(255, 255, 255, 0.03);
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .agent-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .list-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .toolbar-right {
    flex-direction: column;
  }
  
  .search-input {
    width: 100%;
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
