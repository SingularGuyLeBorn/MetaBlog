<template>
  <div class="memory-manager">
    <!-- 头部-->
    <div class="manager-header">
      <div class="header-title">
        <Icon name="database" class="title-icon" />
        <div>
          <h2 class="title-text">记忆管理</h2>
          <p class="title-desc">管理 Agents 的长期记忆数据</p>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <LiquidGlass
        v-for="(stat, idx) in stats"
        :key="stat.id"
        class="stat-card-glass"
        :glow-color="stat.glowColor"
        :intensity="0.3"
      >
        <div class="stat-card">
          <div class="stat-icon" :style="{ background: stat.gradient }">
            <Icon :name="stat.icon" />
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stat.value }}</div>
            <div class="stat-label">{{ stat.label }}</div>
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 记忆列表 -->
    <LiquidGlass class="list-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.2">
      <div class="memory-list-header">
        <h3>记忆条目</h3>
        <div class="list-actions">
          <div class="search-box">
            <Icon name="search" class="search-icon" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜索记忆..."
              class="search-input"
            />
          </div>
          <LiquidGlass glow-color="var(--sr-morandi-pink, #d4b8b8)" :intensity="0.3">
            <button class="clear-btn" @click="clearAll">
              <Icon name="trash-2" />
              清空全部
            </button>
          </LiquidGlass>
        </div>
      </div>

      <div class="memory-list">
        <LiquidGlass
          v-for="memory in filteredMemories"
          :key="memory.id"
          class="memory-item-glass"
          :glow-color="getCategoryInfo(memory.category).color"
          :intensity="0.2"
        >
          <div class="memory-item">
            <div class="memory-avatar">{{ memory.agentAvatar || getCategoryInfo(memory.category).emoji }}</div>
            <div class="memory-content">
              <div class="memory-header">
                <span class="memory-agent">{{ memory.agentName || getCategoryInfo(memory.category).label }}</span>
                <span class="memory-time">{{ formatRelativeTime(memory.createdAt) }}</span>
              </div>
              <p class="memory-text">{{ memory.content }}</p>
            </div>
            <button class="delete-btn" @click="deleteMemory(memory.id)">
              <Icon name="x" />
            </button>
          </div>
        </LiquidGlass>

        <!-- 加载状态 -->
        <div v-if="loading" class="empty-state">
          <Icon name="loader" class="empty-icon" />
          <p>加载中...</p>
        </div>

        <!-- 空状态-->
        <div v-if="!loading && filteredMemories.length === 0" class="empty-state">
          <Icon name="database" class="empty-icon" />
          <p>暂无记忆数据</p>
          <span>Agent 会在对话中自动学习和存储记忆</span>
        </div>
      </div>
    </LiquidGlass>

    <!-- 导出按钮 -->
    <div class="export-section">
      <LiquidGlass glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.3">
        <button class="export-btn" @click="exportMemories">
          <Icon name="download" />
          导出记忆数据
        </button>
      </LiquidGlass>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon, LiquidGlass } from '@/theme/components/common'
import { computed, onMounted, ref } from 'vue'

interface Memory {
  id: string
  content: string
  agentName?: string
  agentAvatar?: string
  agentColor?: string
  category?: string
  createdAt: number
  enabled?: boolean
}

const searchQuery = ref('')
const memories = ref<Memory[]>([])
const loading = ref(false)

// 分类映射：中文标签 + emoji
const categoryMap: Record<string, { label: string; emoji: string; color: string }> = {
  preference: { label: '用户偏好', emoji: '👤', color: 'var(--sr-morandi-blue, #9daab8)' },
  skill: { label: '技能记忆', emoji: '🛠️', color: 'var(--sr-morandi-green, #a8b3a8)' },
  fact: { label: '事实知识', emoji: '📚', color: 'var(--sr-accent-star, #b8a090)' },
  session: { label: '会话上下文', emoji: '💬', color: '#ec4899' },
  default: { label: '通用记忆', emoji: '🤖', color: 'var(--sr-accent-star, #b8a090)' }
}

function getCategoryInfo(category?: string) {
  return categoryMap[category || ''] || categoryMap.default
}

// 相对时间格式化
function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

// 从后端加载记忆
async function loadMemories() {
  loading.value = true
  try {
    const res = await fetch('/api/memories')
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      memories.value = json.data
    }
  } catch (e) {
    console.error('[MemoryManager] 加载记忆失败:', e)
  } finally {
    loading.value = false
  }
}

onMounted(loadMemories)

// 实时统计
const stats = computed(() => {
  const total = memories.value.length
  const agents = new Set(memories.value.map(m => m.agentName || m.category || '通用')).size
  const sizeBytes = JSON.stringify(memories.value).length
  const size = sizeBytes > 1048576
    ? `${(sizeBytes / 1048576).toFixed(1)}MB`
    : sizeBytes > 1024
      ? `${(sizeBytes / 1024).toFixed(1)}KB`
      : `${sizeBytes}B`
  const todayStart = new Date().setHours(0, 0, 0, 0)
  const today = memories.value.filter(m => (m.createdAt || 0) >= todayStart).length

  return [
    { id: 'total', label: '总记忆数', value: String(total), icon: 'layers', gradient: 'linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8))', glowColor: 'var(--sr-accent-star, #b8a090)' },
    { id: 'agents', label: '涉及 Agents', value: String(agents), icon: 'users', gradient: 'linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), #2563eb)', glowColor: 'var(--sr-morandi-blue, #9daab8)' },
    { id: 'size', label: '存储大小', value: size, icon: 'hard-drive', gradient: 'linear-gradient(135deg, var(--sr-morandi-green, #a8b3a8), var(--sr-morandi-green, #a8b3a8))', glowColor: 'var(--sr-morandi-green, #a8b3a8)' },
    { id: 'today', label: '今日新增', value: String(today), icon: 'trending-up', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', glowColor: '#f59e0b' }
  ]
})

const filteredMemories = computed(() => {
  if (!searchQuery.value) return memories.value
  const q = searchQuery.value.toLowerCase()
  return memories.value.filter(m =>
    (m.content || '').toLowerCase().includes(q) ||
    (m.agentName || '').toLowerCase().includes(q) ||
    (m.category || '').toLowerCase().includes(q)
  )
})

async function deleteMemory(id: string) {
  if (!confirm('确定要删除这条记忆吗？')) return
  try {
    const res = await fetch('/api/memories/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    const json = await res.json()
    if (json.success) {
      memories.value = memories.value.filter(m => m.id !== id)
    } else {
      alert('删除失败: ' + (json.error || '未知错误'))
    }
  } catch (e) {
    alert('删除失败: 网络错误')
  }
}

async function clearAll() {
  if (!confirm('确定要清空所有记忆吗？此操作不可恢复. ')) return
  try {
    const res = await fetch('/api/memories/clear', { method: 'POST' })
    const json = await res.json()
    if (json.success) {
      memories.value = []
    } else {
      alert('清空失败: ' + (json.error || '未知错误'))
    }
  } catch (e) {
    alert('清空失败: 网络错误')
  }
}

function exportMemories() {
  const data = JSON.stringify(memories.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `memories-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
/* 使用全局导入的liquid-glass-theme.css */

.memory-manager {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

/* 头部*/
.manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  color: var(--sr-accent-star, #b8a090);
}

.title-text {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.title-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 统计网格 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card-glass {
  border-radius: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon svg {
  width: 24px;
  height: 24px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
  margin-bottom: 2px;
}

.stat-label {
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 列表 */
.list-glass {
  border-radius: 28px;
  margin-bottom: 24px;
}

.memory-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.memory-list-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.list-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #94a3b8;
}

.search-input {
  width: 240px;
  padding: 10px 14px 10px 40px;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 12px;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
  transition: all 0.2s;
}

.search-input:hover,
.search-input:focus {
  background: rgba(0, 0, 0, 0.05);
  border-color: rgba(184, 160, 144, 0.3);
  outline: none;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(212, 184, 184, 0.1);
  border: none;
  border-radius: 10px;
  color: var(--sr-morandi-pink, #d4b8b8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: rgba(212, 184, 184, 0.2);
}

.clear-btn svg {
  width: 16px;
  height: 16px;
}

/* 记忆列表 */
.memory-list {
  padding: 20px;
}

.memory-item-glass {
  border-radius: 16px;
  margin-bottom: 12px;
}

.memory-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
}

.memory-avatar {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 12px;
}

.memory-content {
  flex: 1;
}

.memory-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.memory-agent {
  font-weight: 600;
  font-size: 14px;
  color: var(--sr-text-primary, #1a1a2e);
}

.memory-time {
  font-size: 12px;
  color: #94a3b8;
}

.memory-text {
  margin: 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
  line-height: 1.5;
}

.delete-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.memory-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.delete-btn svg {
  width: 16px;
  height: 16px;
}

/* 空状态*/
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px;
  text-align: center;
  color: #94a3b8;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin-bottom: 16px;
  color: #cbd5e1;
}

.empty-state p {
  margin: 0 0 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--sr-text-muted, #94a3b8);
}

.empty-state span {
  font-size: 14px;
}

/* 导出区 */
.export-section {
  display: flex;
  justify-content: center;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, var(--sr-morandi-green, #a8b3a8), var(--sr-morandi-green, #a8b3a8));
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.export-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(168, 179, 168, 0.3);
}

.export-btn svg {
  width: 18px;
  height: 18px;
}

@media (max-width: 768px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .memory-list-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .search-input {
    width: 100%;
  }
}
</style>

