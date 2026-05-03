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
          <LiquidGlass glow-color="var(--sr-morandi-green, #a8b3a8)" :intensity="0.3">
            <button class="create-btn" @click="showCreate = true">
              <Icon name="plus" />
              新增记忆
            </button>
          </LiquidGlass>
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
                <span class="memory-time">{{ formatTime(memory.createdAt) }}</span>
              </div>
              <p class="memory-text">{{ memory.content }}</p>
            </div>
            <div class="memory-actions">
              <button class="action-btn" @click="editMemory(memory)" title="编辑">
                <Icon name="edit" />
              </button>
              <button class="action-btn danger" @click="deleteMemory(memory.id)" title="删除">
                <Icon name="x" />
              </button>
            </div>
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

    <!-- 新增/编辑弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreate || editingMemory" class="modal-overlay" @click.self="closeModal">
          <LiquidGlass class="modal-glass" glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.4">
            <div class="memory-modal">
              <div class="modal-header">
                <h3>{{ editingMemory ? '编辑记忆' : '新增记忆' }}</h3>
                <button class="close-btn" @click="closeModal">
                  <Icon name="x" />
                </button>
              </div>

              <div class="modal-body">
                <div class="form-group">
                  <label>内容</label>
                  <textarea v-model="form.content" class="lg-input" rows="4" placeholder="记忆内容..." />
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>分类</label>
                    <DropdownSelect
                      v-model="form.category"
                      :options="[
                        { value: 'preference', label: '用户偏好', icon: '👤' },
                        { value: 'skill', label: '技能记忆', icon: '🛠️' },
                        { value: 'fact', label: '事实知识', icon: '📚' },
                        { value: 'session', label: '会话上下文', icon: '💬' },
                        { value: 'default', label: '通用记忆', icon: '🤖' }
                      ]"
                      placeholder="选择分类"
                    />
                  </div>
                  <div class="form-group">
                    <label>重要性 (1-10)</label>
                    <input v-model.number="form.importance" type="number" class="lg-input" min="1" max="10" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Agent 名称 (可选)</label>
                    <input v-model="form.agentName" type="text" class="lg-input" placeholder="例如：Meta 助手" />
                  </div>
                  <div class="form-group">
                    <label>Agent 头像 (可选)</label>
                    <input v-model="form.agentAvatar" type="text" class="lg-input" placeholder="例如：🤖" />
                  </div>
                </div>
              </div>

              <div class="modal-footer">
                <LiquidGlass glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
                  <button class="lg-btn" @click="closeModal">取消</button>
                </LiquidGlass>
                <LiquidGlass glow-color="var(--sr-accent-star, #b8a090)" :intensity="0.5">
                  <button class="lg-btn lg-btn-primary" @click="saveMemory">
                    <Icon name="save" />
                    {{ editingMemory ? '保存' : '创建' }}
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
import { DropdownSelect, Icon, LiquidGlass } from '@/theme/components/common'
import { formatDate } from '@/theme/utils/formatDate'
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
const showCreate = ref(false)
const editingMemory = ref<Memory | null>(null)

const form = ref({
  content: '',
  category: 'default' as string,
  importance: 5,
  agentName: '',
  agentAvatar: ''
})

function closeModal() {
  showCreate.value = false
  editingMemory.value = null
  form.value = { content: '', category: 'default', importance: 5, agentName: '', agentAvatar: '' }
}

function editMemory(memory: Memory) {
  editingMemory.value = memory
  form.value = {
    content: memory.content || '',
    category: memory.category || 'default',
    importance: (memory as any).importance || 5,
    agentName: memory.agentName || '',
    agentAvatar: memory.agentAvatar || ''
  }
}

async function saveMemory() {
  if (!form.value.content.trim()) {
    alert('内容不能为空')
    return
  }
  try {
    const payload = {
      ...(editingMemory.value ? { id: editingMemory.value.id } : {}),
      content: form.value.content.trim(),
      category: form.value.category,
      importance: form.value.importance,
      agentName: form.value.agentName.trim() || undefined,
      agentAvatar: form.value.agentAvatar.trim() || undefined
    }
    const url = editingMemory.value ? '/api/memories/update' : '/api/memories'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const json = await res.json()
    if (json.success) {
      await loadMemories()
      closeModal()
    } else {
      alert((editingMemory.value ? '更新' : '创建') + '失败: ' + (json.error || '未知错误'))
    }
  } catch (e) {
    alert((editingMemory.value ? '更新' : '创建') + '失败: ' + String(e))
  }
}

// 分类映射：中文标签 + emoji
const categoryMap: Record<string, { label: string; emoji: string; color: string }> = {
  preference: { label: '用户偏好', emoji: '👤', color: 'var(--sr-morandi-blue, #9daab8)' },
  skill: { label: '技能记忆', emoji: '🛠️', color: 'var(--sr-morandi-green, #a8b3a8)' },
  fact: { label: '事实知识', emoji: '📚', color: 'var(--sr-accent-star, #b8a090)' },
  session: { label: '会话上下文', emoji: '💬', color: 'var(--sr-morandi-pink, #d4b8b8)' },
  default: { label: '通用记忆', emoji: '🤖', color: 'var(--sr-accent-star, #b8a090)' }
}

function getCategoryInfo(category?: string) {
  return categoryMap[category || ''] || categoryMap.default
}

// 时间格式化
function formatTime(ts: number): string {
  return formatDate(ts)
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
    { id: 'agents', label: '涉及 Agents', value: String(agents), icon: 'users', gradient: 'linear-gradient(135deg, var(--sr-morandi-blue, #9daab8), var(--sr-morandi-blue, #9daab8))', glowColor: 'var(--sr-morandi-blue, #9daab8)' },
    { id: 'size', label: '存储大小', value: size, icon: 'hard-drive', gradient: 'linear-gradient(135deg, var(--sr-morandi-green, #a8b3a8), var(--sr-morandi-green, #a8b3a8))', glowColor: 'var(--sr-morandi-green, #a8b3a8)' },
    { id: 'today', label: '今日新增', value: String(today), icon: 'trending-up', gradient: 'linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8))', glowColor: 'var(--sr-accent-star, #b8a090)' }
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
/* Star River 风格 */

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
  color: var(--sr-text-muted, #94a3b8);
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

.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(168, 179, 168, 0.1);
  border: none;
  border-radius: 10px;
  color: var(--sr-morandi-green, #a8b3a8);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.create-btn:hover {
  background: rgba(168, 179, 168, 0.2);
}

.create-btn svg {
  width: 16px;
  height: 16px;
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
  border: 1px solid var(--sr-glass-border, rgba(0, 0, 0, 0.06));
  border-radius: inherit;
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

.memory-actions {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}

.memory-item:hover .memory-actions {
  opacity: 1;
}

.memory-actions .action-btn {
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
  transition: all 0.2s;
}

.memory-actions .action-btn:hover {
  background: rgba(184, 160, 144, 0.1);
  color: var(--sr-accent-star, #b8a090);
}

.memory-actions .action-btn.danger:hover {
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
}

.memory-actions .action-btn svg {
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
  color: var(--sr-glass-border-strong, rgba(0,0,0,0.12));
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

/* 弹窗 */
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1100;
  padding: 24px;
}

.modal-glass {
  width: 90%;
  max-width: 520px;
  border-radius: 24px;
}

.memory-modal {
  padding: 28px;
}

.memory-modal .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.memory-modal .modal-header h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.memory-modal .close-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
  border: none;
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.memory-modal .close-btn:hover {
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
  transform: rotate(90deg);
}

.memory-modal .close-btn svg {
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
  color: var(--sr-text-primary, #1a1a2e);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.memory-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.lg-btn {
  padding: 10px 20px;
  background: transparent;
  border: none;
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.lg-btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, var(--sr-accent-star, #b8a090), var(--sr-morandi-purple, #b3a8b8));
  color: white;
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

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>

