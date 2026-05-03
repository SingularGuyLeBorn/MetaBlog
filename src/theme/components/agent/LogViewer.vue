<template>
  <div class="log-viewer">
    <!-- 头部 -->
    <div class="lv-header">
      <Icon name="scroll-text" class="lv-icon" />
      <div>
        <h2 class="lv-title">日志监控</h2>
        <p class="lv-desc">查看系统运行日志和调试信息</p>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="filter-group">
        <div class="level-filters">
          <button
            v-for="l in levelOptions"
            :key="l.value"
            class="level-tab"
            :class="{ active: levelFilter === l.value }"
            @click="levelFilter = l.value"
          >
            <span class="level-dot" :style="{ background: l.color }" />
            {{ l.label }}
          </button>
        </div>
        <div class="search-box">
          <Icon name="search" class="search-icon" />
          <input
            v-model="keyword"
            type="text"
            class="search-input"
            placeholder="搜索关键词..."
            @keyup.enter="loadLogs"
          />
        </div>
      </div>
      <div class="action-group">
        <button class="refresh-btn" :class="{ spinning: refreshing }" @click="loadLogs">
          <Icon name="refresh-cw" />
        </button>
        <LiquidGlass glow-color="var(--sr-morandi-pink, #d4b8b8)" :intensity="0.3">
          <button class="cleanup-btn" @click="showCleanupModal = true">
            <Icon name="trash-2" />
            清理
          </button>
        </LiquidGlass>
      </div>
    </div>

    <!-- 日志统计 -->
    <div v-if="stats" class="stats-bar">
      <span class="stat-item">总计: <strong>{{ stats.total || 0 }}</strong></span>
      <span class="stat-item">今日: <strong>{{ stats.today || 0 }}</strong></span>
    </div>

    <!-- 日志列表 -->
    <div v-if="loading" class="loading-state">
      <Icon name="loader-2" spin class="loading-icon" />
      加载中...
    </div>
    <div v-else-if="error" class="error-state">{{ error }}</div>
    <div v-else-if="logs.length === 0" class="empty-state">
      <Icon name="inbox" class="empty-icon" />
      暂无日志
    </div>
    <div v-else class="log-list">
      <LiquidGlass
        v-for="log in logs"
        :key="log.timestamp + log.message"
        class="log-card-glass"
        :glow-color="getLevelColor(log.level)"
        :intensity="0.15"
      >
        <div class="log-card">
          <div class="log-level-badge" :style="{ background: getLevelBg(log.level), color: getLevelColor(log.level) }">
            {{ log.level }}
          </div>
          <div class="log-content">
            <div class="log-top">
              <span class="log-event">{{ log.event }}</span>
              <span class="log-time">{{ formatTime(log.timestamp) }}</span>
            </div>
            <div class="log-message">{{ log.message }}</div>
            <div v-if="log.actor || log.source || log.taskId" class="log-meta">
              <span v-if="log.actor" class="meta-tag actor">👤 {{ log.actor }}</span>
              <span v-if="log.source" class="meta-tag source">📍 {{ log.source }}</span>
              <span v-if="log.taskId" class="meta-tag task">📝 {{ log.taskId.slice(-8) }}</span>
            </div>
          </div>
        </div>
      </LiquidGlass>
    </div>

    <!-- 清理弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCleanupModal" class="modal-overlay" @click.self="showCleanupModal = false">
          <LiquidGlass class="modal-glass" glow-color="var(--sr-morandi-pink, #d4b8b8)" :intensity="0.35">
            <div class="cleanup-modal">
              <div class="modal-header">
                <h3>清理日志</h3>
                <button class="close-btn" @click="showCleanupModal = false">
                  <Icon name="x" />
                </button>
              </div>

              <div class="modal-body">
                <p class="cleanup-desc">选择保留天数，超出天数的日志将被永久删除。</p>
                <div class="form-group">
                  <label>保留天数</label>
                  <input v-model.number="cleanupDays" type="number" class="lg-input" min="0" max="365" />
                </div>
                <p class="cleanup-hint">0 表示清空所有日志</p>
              </div>

              <div class="modal-footer">
                <LiquidGlass glow-color="var(--sr-text-muted, #94a3b8)" :intensity="0.2">
                  <button class="lg-btn" @click="showCleanupModal = false">取消</button>
                </LiquidGlass>
                <LiquidGlass glow-color="var(--sr-morandi-pink, #d4b8b8)" :intensity="0.4">
                  <button class="lg-btn lg-btn-danger" :disabled="cleanupLoading" @click="cleanupLogs">
                    <Icon v-if="cleanupLoading" name="loader-2" spin />
                    {{ cleanupLoading ? '清理中...' : '确认清理' }}
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
import { Icon, LiquidGlass } from '@/theme/components/common'
import { ref, onMounted, onUnmounted, watch } from 'vue'

interface LogEntry {
  timestamp: number
  level: string
  event: string
  message: string
  actor?: string
  source?: string
  taskId?: string
  category?: string
  component?: string
  [key: string]: any
}

interface LogStats {
  total?: number
  today?: number
  [key: string]: any
}

const logs = ref<LogEntry[]>([])
const stats = ref<LogStats | null>(null)
const loading = ref(false)
const error = ref('')
const refreshing = ref(false)

const levelFilter = ref('')
const keyword = ref('')

const showCleanupModal = ref(false)
const cleanupDays = ref(7)
const cleanupLoading = ref(false)

let autoRefreshTimer: ReturnType<typeof setInterval> | null = null

const levelOptions = [
  { label: '全部', value: '', color: '#94a3b8' },
  { label: '调试', value: 'debug', color: '#9aa8b8' },
  { label: '信息', value: 'info', color: '#a8b3a8' },
  { label: '成功', value: 'success', color: '#a8b3a8' },
  { label: '警告', value: 'warn', color: '#d4b8a8' },
  { label: '错误', value: 'error', color: '#d4b8b8' },
]

function getLevelColor(level?: string) {
  const map: Record<string, string> = {
    debug: 'var(--sr-morandi-blue, #9aa8b8)',
    info: 'var(--sr-morandi-green, #a8b3a8)',
    success: 'var(--sr-morandi-green, #a8b3a8)',
    warn: '#c4a882',
    error: 'var(--sr-morandi-pink, #d4b8b8)',
  }
  return map[level || ''] || 'var(--sr-text-muted, #94a3b8)'
}

function getLevelBg(level?: string) {
  const map: Record<string, string> = {
    debug: 'rgba(154, 168, 184, 0.12)',
    info: 'rgba(168, 179, 168, 0.12)',
    success: 'rgba(168, 179, 168, 0.15)',
    warn: 'rgba(196, 168, 130, 0.12)',
    error: 'rgba(212, 184, 184, 0.12)',
  }
  return map[level || ''] || 'rgba(148, 163, 184, 0.08)'
}

function formatTime(ts?: number) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('zh-CN')
}

async function loadLogs() {
  loading.value = true
  refreshing.value = true
  error.value = ''
  try {
    let url = '/api/logs/recent?count=100'
    if (levelFilter.value) {
      url += `&level=${levelFilter.value}`
    }
    // 如果有关键词，使用 query 接口
    if (keyword.value.trim()) {
      url = `/api/logs/query?keyword=${encodeURIComponent(keyword.value.trim())}&limit=100`
      if (levelFilter.value) {
        url += `&level=${levelFilter.value}`
      }
    }

    const res = await fetch(url)
    const json = await res.json()
    if (json.success) {
      let items = json.data || []
      // 前端兜底过滤：确保 level 筛选生效
      if (levelFilter.value) {
        const lf = levelFilter.value.toLowerCase()
        items = items.filter((log: LogEntry) => (log.level || '').toLowerCase() === lf)
      }
      logs.value = items
    } else {
      error.value = json.message || '加载失败'
    }
  } catch (e) {
    error.value = '加载日志失败'
    console.error('[LogViewer] 加载失败:', e)
  } finally {
    loading.value = false
    setTimeout(() => {
      refreshing.value = false
    }, 500)
  }
}

async function loadStats() {
  try {
    const res = await fetch('/api/logs/stats')
    const json = await res.json()
    if (json.success) {
      stats.value = json.data || null
    }
  } catch (e) {
    console.error('[LogViewer] 加载统计失败:', e)
  }
}

async function cleanupLogs() {
  cleanupLoading.value = true
  try {
    const res = await fetch('/api/logs/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: cleanupDays.value })
    })
    const json = await res.json()
    if (json.success) {
      showCleanupModal.value = false
      await loadLogs()
      await loadStats()
    } else {
      alert('清理失败: ' + (json.message || '未知错误'))
    }
  } catch (e) {
    alert('清理失败: ' + String(e))
  } finally {
    cleanupLoading.value = false
  }
}

function startAutoRefresh() {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
  autoRefreshTimer = setInterval(() => {
    loadLogs()
    loadStats()
  }, 10000)
}

function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer)
    autoRefreshTimer = null
  }
}

watch([levelFilter], loadLogs)

onMounted(() => {
  loadLogs()
  loadStats()
  startAutoRefresh()
})

onUnmounted(() => {
  stopAutoRefresh()
})
</script>

<style scoped>
.log-viewer {
  max-width: 1000px;
  margin: 0 auto;
  padding: 8px;
}

/* 头部 */
.lv-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.lv-icon {
  width: 48px;
  height: 48px;
  color: var(--sr-accent-star, #b8a090);
}

.lv-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: var(--sr-text-primary, #1a1a2e);
}

.lv-desc {
  margin: 4px 0 0;
  font-size: 14px;
  color: var(--sr-text-muted, #94a3b8);
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
}

.level-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.level-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.6));
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.level-tab:hover {
  border-color: rgba(184, 160, 144, 0.3);
}

.level-tab.active {
  background: rgba(184, 160, 144, 0.12);
  color: var(--sr-accent-star, #b8a090);
  border-color: rgba(184, 160, 144, 0.25);
  font-weight: 600;
}

.level-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.search-box {
  position: relative;
  width: 220px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: var(--sr-text-muted, #94a3b8);
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 34px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  color: #1e293b;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: var(--sr-accent-star, #b8a090);
  box-shadow: 0 0 0 3px rgba(184, 160, 144, 0.1);
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.refresh-btn {
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--sr-glass-bg, rgba(255, 255, 255, 0.6));
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 10px;
  color: var(--sr-text-muted, #94a3b8);
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover {
  border-color: rgba(184, 160, 144, 0.3);
  color: var(--sr-accent-star, #b8a090);
}

.refresh-btn svg {
  width: 16px;
  height: 16px;
  transition: transform 0.3s;
}

.refresh-btn.spinning svg {
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cleanup-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: linear-gradient(135deg, var(--sr-morandi-pink, #d4b8b8), #c4a8a8);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.cleanup-btn svg {
  width: 14px;
  height: 14px;
}

/* 统计条 */
.stats-bar {
  display: flex;
  gap: 20px;
  margin-bottom: 12px;
  font-size: 13px;
  color: var(--sr-text-muted, #94a3b8);
}

.stats-bar strong {
  color: var(--sr-text-primary, #1a1a2e);
  font-weight: 700;
}

/* 列表状态 */
.loading-state,
.error-state,
.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--sr-text-muted, #94a3b8);
  font-size: 15px;
}

.error-state {
  color: var(--sr-morandi-pink, #d4b8b8);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
}

.loading-icon {
  width: 24px;
  height: 24px;
  margin-right: 8px;
}

/* 日志列表 */
.log-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.log-card-glass {
  border-radius: 14px;
}

.log-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 18px;
}

.log-level-badge {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.log-content {
  flex: 1;
  min-width: 0;
}

.log-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  gap: 8px;
}

.log-event {
  font-size: 13px;
  font-weight: 600;
  color: var(--sr-text-primary, #1a1a2e);
}

.log-time {
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
  flex-shrink: 0;
}

.log-message {
  font-size: 14px;
  color: #4a4a5a;
  line-height: 1.5;
  word-break: break-word;
}

.log-meta {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--sr-text-muted, #94a3b8);
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
  max-width: 420px;
  border-radius: 24px;
}

.cleanup-modal {
  padding: 28px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
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
  background: rgba(212, 184, 184, 0.1);
  color: var(--sr-morandi-pink, #d4b8b8);
  transform: rotate(90deg);
}

.close-btn svg {
  width: 20px;
  height: 20px;
}

.cleanup-desc {
  margin: 0 0 16px;
  font-size: 14px;
  color: #4a4a5a;
}

.cleanup-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--sr-text-muted, #94a3b8);
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.lg-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.lg-input:focus {
  border-color: var(--sr-morandi-pink, #d4b8b8);
  box-shadow: 0 0 0 3px rgba(212, 184, 184, 0.1);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
}

.lg-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: transparent;
  color: var(--sr-text-primary, #1a1a2e);
  transition: all 0.2s;
}

.lg-btn-danger {
  background: linear-gradient(135deg, var(--sr-morandi-pink, #d4b8b8), #c4a8a8);
  color: white;
  display: flex;
  align-items: center;
  gap: 6px;
}

.lg-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 动画 */
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
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
  }

  .log-card {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
