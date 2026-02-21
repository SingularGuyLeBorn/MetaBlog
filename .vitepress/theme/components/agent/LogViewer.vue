<template>
  <div class="cyber-log-viewer">
    <!-- Header -->
    <header class="cyber-header">
      <div class="header-title">
        <span class="terminal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
            <polyline points="6 8 9 11 6 14"/>
            <line x1="12" y1="11" x2="18" y2="11"/>
          </svg>
        </span>
        <h3 class="title-text">TERMINAL_LOGS</h3>
        <span class="status-indicator" :class="{ active: autoRefresh }">
          <span class="status-dot"></span>
          {{ autoRefresh ? 'LIVE' : 'PAUSED' }}
        </span>
      </div>
      <div class="header-actions">
        <button class="cyber-btn" @click="refreshLogs" title="刷新">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"/>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
          </svg>
        </button>
        <button class="cyber-btn" @click="exportLogs" title="导出">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </button>
        <button class="cyber-btn danger" @click="confirmClear" title="清空">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Stats Bar -->
    <div class="stats-container">
      <div class="stats-bar">
        <div
          v-for="(stat, key) in levelStats"
          :key="key"
          class="stat-segment"
          :class="[`level-${stat.level}`, { pulse: stat.level === 'ERROR' && stat.count > 0 }]"
          :style="{ width: stat.percentage + '%' }"
          :title="`${stat.label}: ${stat.count} (${stat.percentage.toFixed(1)}%)`"
        >
          <span v-if="stat.percentage > 8" class="segment-label">{{ stat.count }}</span>
        </div>
      </div>
      <div class="stats-legend">
        <div v-for="(stat, key) in levelStats" :key="key" class="legend-item">
          <span class="legend-dot" :class="`level-${stat.level}`"></span>
          <span class="legend-label">{{ stat.label }}</span>
          <span class="legend-count">{{ stat.count }}</span>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-panel">
      <div class="filter-row">
        <div class="filter-group search-group">
          <span class="filter-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </span>
          <input
            v-model="filters.search"
            type="text"
            placeholder="搜索日志内容..."
            class="cyber-input"
          />
        </div>
        
        <!-- Custom Level Dropdown -->
        <div class="filter-group">
          <div class="custom-dropdown" :class="{ open: showLevelDropdown }" v-click-outside="() => showLevelDropdown = false">
            <button class="dropdown-trigger" @click="showLevelDropdown = !showLevelDropdown">
              <span class="trigger-text" :class="filters.level">{{ levelLabel }}</span>
              <svg class="trigger-arrow" :class="{ open: showLevelDropdown }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="showLevelDropdown" class="dropdown-menu">
                <div 
                  v-for="option in levelOptions" 
                  :key="option.value"
                  class="dropdown-item"
                  :class="{ active: filters.level === option.value, [option.value]: true }"
                  @click="selectLevel(option.value)"
                >
                  <span class="item-dot" :class="option.value"></span>
                  <span class="item-label">{{ option.label }}</span>
                  <svg v-if="filters.level === option.value" class="item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </Transition>
          </div>
        </div>
        
        <!-- Custom Actor Dropdown -->
        <div class="filter-group">
          <div class="custom-dropdown" :class="{ open: showActorDropdown }" v-click-outside="() => showActorDropdown = false">
            <button class="dropdown-trigger" @click="showActorDropdown = !showActorDropdown">
              <span class="trigger-text">{{ actorLabel }}</span>
              <svg class="trigger-arrow" :class="{ open: showActorDropdown }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="showActorDropdown" class="dropdown-menu">
                <div 
                  v-for="option in actorOptions" 
                  :key="option.value"
                  class="dropdown-item"
                  :class="{ active: filters.actor === option.value }"
                  @click="selectActor(option.value)"
                >
                  <span class="item-actor-icon">{{ option.label.split(' ')[0] }}</span>
                  <span class="item-label">{{ option.label.split(' ')[1] || option.label }}</span>
                  <svg v-if="filters.actor === option.value" class="item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </Transition>
          </div>
        </div>
        
        <!-- Custom Event Dropdown -->
        <div class="filter-group">
          <div class="custom-dropdown" :class="{ open: showEventDropdown }" v-click-outside="() => showEventDropdown = false">
            <button class="dropdown-trigger" @click="showEventDropdown = !showEventDropdown">
              <span class="trigger-text">{{ eventLabel }}</span>
              <svg class="trigger-arrow" :class="{ open: showEventDropdown }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
            <Transition name="dropdown">
              <div v-if="showEventDropdown" class="dropdown-menu event-menu">
                <div 
                  class="dropdown-item"
                  :class="{ active: filters.event === '' }"
                  @click="selectEvent('')"
                >
                  <span class="item-label">所有事件</span>
                  <svg v-if="filters.event === ''" class="item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div v-if="uniqueEvents.length > 0" class="dropdown-divider"></div>
                <div 
                  v-for="event in uniqueEvents" 
                  :key="event"
                  class="dropdown-item"
                  :class="{ active: filters.event === event }"
                  @click="selectEvent(event)"
                >
                  <span class="item-label">{{ event }}</span>
                  <svg v-if="filters.event === event" class="item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
              </div>
            </Transition>
          </div>
        </div>
        
        <div class="filter-group">
          <button 
            class="cyber-toggle" 
            :class="{ active: autoRefresh }"
            @click="autoRefresh = !autoRefresh"
          >
            <span class="toggle-track">
              <span class="toggle-thumb"></span>
            </span>
            <span class="toggle-label">自动刷新</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Log List -->
    <div class="log-container" ref="logContainerRef">
      <!-- Empty State -->
      <div v-if="filteredLogs.length === 0" class="empty-state">
        <div class="silence-wave">
          <svg viewBox="0 0 400 60" preserveAspectRatio="none">
            <path class="wave-path" d="M0,30 Q50,10 100,30 T200,30 T300,30 T400,30" />
          </svg>
        </div>
        <p class="empty-text">系统静默中，等待事件触发...</p>
        <p class="empty-subtext">NO SIGNAL DETECTED</p>
      </div>

      <!-- Virtual Log List -->
      <div v-else class="log-list-wrapper">
        <div
          v-for="log in displayLogs"
          :key="log.id"
          class="log-capsule"
          :class="[
            `level-${log.level}`,
            { expanded: expandedLog === log.id, pulse: log.level === 'ERROR' && isNewLog(log.id) }
          ]"
          @click="toggleExpand(log.id)"
        >
          <!-- Left Color Bar -->
          <div class="capsule-indicator" :class="`level-${log.level}`"></div>
          
          <!-- Main Content -->
          <div class="capsule-content">
            <!-- Header Row -->
            <div class="capsule-header">
              <span class="log-timestamp">{{ formatTime(log.timestamp) }}</span>
              <span class="log-level-badge" :class="`level-${log.level}`">
                {{ log.level }}
              </span>
              <!-- Actor Badge -->
              <span class="log-actor-badge" :class="`actor-${log.actor}`" :title="`Actor: ${log.actor}`">
                <span class="actor-icon">{{ log.actor === 'human' ? '👤' : log.actor === 'ai' ? '🤖' : '⚙️' }}</span>
                <span class="actor-label">{{ log.actor }}</span>
              </span>
              <span class="log-event-tag">{{ log.event }}</span>
              <span class="log-message" :title="log.message">{{ log.message }}</span>
              <span v-if="log.taskId" class="log-task-id">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="9" x2="15" y2="9"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
                {{ log.taskId.slice(-6) }}
              </span>
            </div>
            
            <!-- Expanded Details -->
            <Transition name="expand">
              <div v-if="expandedLog === log.id" class="capsule-details">
                <div class="details-grid">
                  <div class="detail-item">
                    <span class="detail-key">ID</span>
                    <span class="detail-value mono">{{ log.id }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-key">Session</span>
                    <span class="detail-value mono">{{ log.sessionId }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-key">Trace</span>
                    <span class="detail-value mono">{{ log.traceId }}</span>
                  </div>
                  <div v-if="log.taskId" class="detail-item">
                    <span class="detail-key">Task</span>
                    <span class="detail-value mono">{{ log.taskId }}</span>
                  </div>
                  <div v-if="log.data?.skillName" class="detail-item">
                    <span class="detail-key">Skill</span>
                    <span class="detail-value">{{ log.data.skillName }}</span>
                  </div>
                  <div v-if="log.durationMs" class="detail-item">
                    <span class="detail-key">Duration</span>
                    <span class="detail-value mono">{{ log.durationMs }}ms</span>
                  </div>
                  <div class="detail-item full-width">
                    <span class="detail-key">Source</span>
                    <span class="detail-value">{{ log.source }}</span>
                  </div>
                  <div v-if="log.data && Object.keys(log.data).length > 0" class="detail-item full-width">
                    <span class="detail-key">Data</span>
                    <pre class="detail-code">{{ JSON.stringify(log.data, null, 2) }}</pre>
                  </div>
                </div>
              </div>
            </Transition>
          </div>
          
          <!-- Expand Indicator -->
          <div class="expand-hint" :class="{ expanded: expandedLog === log.id }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-bar">
        <button 
          class="page-btn" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span class="page-indicator">
          <span class="current-page">{{ currentPage }}</span>
          <span class="page-separator">/</span>
          <span class="total-pages">{{ totalPages }}</span>
        </span>
        <button 
          class="page-btn" 
          :disabled="currentPage === totalPages"
          @click="currentPage++"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Clear Confirm Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showClearModal" class="modal-overlay" @click="showClearModal = false">
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <div class="warning-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h4>确认清空日志</h4>
            </div>
            <div class="modal-body">
              <p>此操作将永久删除所有日志记录</p>
              <p class="warning-code">WARNING: DATA_IRREVERSIBLE</p>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" @click="showClearModal = false">取消</button>
              <button class="btn-danger" @click="clearLogs">确认清空</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { getStructuredLogger, type StructuredLogEntry, type LogStats, type LogLevel } from '../../../agent/runtime/StructuredLogger'

// Extended log entry with actor field from server
type ServerLogEntry = StructuredLogEntry & {
  actor?: 'human' | 'ai' | 'system'
}


const LEVEL_LABELS = {
  DEBUG: 'Debug',
  INFO: 'Info',
  WARN: 'Warning',
  ERROR: 'Error',
  SUCCESS: 'Success'
}

// ==================== State ====================
const logger = getStructuredLogger()
const logs = ref<ServerLogEntry[]>([])
const stats = ref<LogStats>({
  total: 0,
  byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, SUCCESS: 0 },
  byEvent: {},
  byActor: { human: 0, ai: 0, system: 0 },
  byComponent: {},
  recentErrors: [],
  avgDurationByComponent: {}
})

const filters = ref({
  search: '',
  level: '',
  event: '',
  skillName: '',
  actor: ''
})

const expandedLog = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = 50
const autoRefresh = ref(true)
const showClearModal = ref(false)
const logContainerRef = ref<HTMLElement>()
const newLogIds = ref<Set<string>>(new Set())

// Custom Dropdown State
const showLevelDropdown = ref(false)
const showEventDropdown = ref(false)
const showActorDropdown = ref(false)

const actorOptions = [
  { value: '', label: '所有操作者' },
  { value: 'human', label: '👤 人类' },
  { value: 'ai', label: '🤖 AI' },
  { value: 'system', label: '⚙️ 系统' }
]

const levelOptions = [
  { value: '', label: '所有级别' },
  { value: 'debug', label: 'DEBUG' },
  { value: 'info', label: 'INFO' },
  { value: 'warn', label: 'WARN' },
  { value: 'error', label: 'ERROR' }
]

const levelLabel = computed(() => {
  const option = levelOptions.find(o => o.value === filters.value.level)
  return option?.label || '所有级别'
})

const actorLabel = computed(() => {
  const option = actorOptions.find(o => o.value === filters.value.actor)
  return option?.label || '所有操作者'
})

const eventLabel = computed(() => {
  if (!filters.value.event) return '所有事件'
  return filters.value.event
})

// Click Outside Directive
const vClickOutside = {
  mounted(el: HTMLElement, binding: any) {
    el._clickOutside = (event: Event) => {
      if (!(el === event.target || el.contains(event.target as Node))) {
        binding.value()
      }
    }
    document.addEventListener('click', el._clickOutside, true)
  },
  unmounted(el: HTMLElement) {
    document.removeEventListener('click', (el as any)._clickOutside, true)
  }
}

function selectLevel(value: string) {
  filters.value.level = value
  showLevelDropdown.value = false
  currentPage.value = 1
}

function selectActor(value: string) {
  filters.value.actor = value
  showActorDropdown.value = false
  currentPage.value = 1
}

function selectEvent(value: string) {
  filters.value.event = value
  showEventDropdown.value = false
  currentPage.value = 1
}

let refreshInterval: number | null = null

// ==================== Computed ====================
const filteredLogs = computed(() => {
  let result = logs.value
  
  // Filter by level
  if (filters.value.level && filters.value.level !== 'all') {
    result = result.filter(l => l.level === filters.value.level)
  }
  
  // Filter by event
  if (filters.value.event) {
    result = result.filter(l => l.event === filters.value.event)
  }
  
  // Filter by skill name
  if (filters.value.skillName) {
    result = result.filter(l => l.data?.skillName === filters.value.skillName)
  }
  
  // Filter by actor
  if (filters.value.actor && filters.value.actor !== 'all') {
    result = result.filter(l => l.actor === filters.value.actor)
  }
  
  // Search in message and event
  if (filters.value.search) {
    const search = filters.value.search.toLowerCase()
    result = result.filter(l => 
      l.message?.toLowerCase().includes(search) ||
      l.event?.toLowerCase().includes(search)
    )
  }
  
  return result
})

const displayLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredLogs.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredLogs.value.length / pageSize)
})

const uniqueEvents = computed(() => {
  const events = new Set<string>()
  logs.value.forEach(l => events.add(l.event))
  return Array.from(events).sort()
})

const levelStats = computed(() => {
  const total = stats.value.total || 1 // Prevent division by zero
  const levels: LogLevel[] = ['INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS']
  
  return levels.map(level => {
    const count = stats.value.byLevel[level] || 0
    return {
      level,
      label: LEVEL_LABELS[level],
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }
  }).filter(s => s.count > 0)
})

// ==================== Methods ====================
function formatTime(timestamp: string | number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  const ms = String(date.getMilliseconds()).padStart(3, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`
}

function toggleExpand(logId: string) {
  expandedLog.value = expandedLog.value === logId ? null : logId
}

async function refreshLogs() {
  const previousIds = new Set(logs.value.map(l => l.id))
  
  // Fetch from API
  try {
    const [logsRes, statsRes] = await Promise.all([
      fetch('/api/logs/recent?count=100'),
      fetch('/api/logs/stats')
    ])
    
    const logsResult = await logsRes.json()
    const statsResult = await statsRes.json()
    
    if (logsResult.success) {
      // Transform server logs to match our format
      logs.value = logsResult.data.map((log: any) => ({
        id: log.id,
        timestamp: new Date(log.timestamp).getTime(),
        level: log.level,
        event: log.event,
        message: log.message,
        data: log.metadata || {},
        actor: log.actor,
        sessionId: log.sessionId || '',
        traceId: log.traceId || '',
        taskId: log.taskId,
        skillName: log.skillName,
        duration: log.duration,
        source: log.source
      }))
    }
    
    if (statsResult.success) {
      stats.value = {
        total: statsResult.data.total,
        byLevel: statsResult.data.byLevel,
        byEvent: statsResult.data.byEvent,
        byActor: statsResult.data.byActor,
        byComponent: statsResult.data.byComponent,
        recentErrors: (statsResult.data.recentErrors || []).map((log: any) => ({
          id: log.id,
          timestamp: new Date(log.timestamp).getTime(),
          level: log.level,
          event: log.event,
          message: log.message,
          data: log.metadata || {}
        })),
        avgDurationByComponent: statsResult.data.avgDurationByComponent || {}
      }
    }
  } catch (e) {
    console.error('Failed to fetch logs from server:', e)
    // Fallback to local logs
    logs.value = logger.getLogs()
    stats.value = logger.getStats()
  }
  
  // Track new logs for animation
  const currentIds = new Set(logs.value.map(l => l.id))
  const newIds = [...currentIds].filter(id => !previousIds.has(id))
  
  if (newIds.length > 0) {
    newLogIds.value = new Set(newIds)
    // Clear new log status after animation
    setTimeout(() => {
      newLogIds.value.clear()
    }, 2000)
  }
}

function isNewLog(logId: string): boolean {
  return newLogIds.value.has(logId)
}

async function exportLogs() {
  try {
    const response = await fetch('/api/logs/export?format=json')
    const result = await response.json()
    if (result.success) {
      const json = JSON.stringify(result.data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `logs-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  } catch (e) {
    console.error('Failed to export logs:', e)
  }
}

function confirmClear() {
  showClearModal.value = true
}

async function clearLogs() {
  try {
    await fetch('/api/logs/cleanup', { method: 'POST', body: JSON.stringify({ days: 0 }) })
    await refreshLogs()
    showClearModal.value = false
    expandedLog.value = null
  } catch (e) {
    console.error('Failed to clear logs:', e)
  }
}

// ==================== Lifecycle ====================
onMounted(() => {
  refreshLogs()
  
  // Auto refresh every 3 seconds
  refreshInterval = window.setInterval(() => {
    if (autoRefresh.value) {
      refreshLogs()
    }
  }, 3000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})

// Reset page when filters change
watch(filters, () => {
  currentPage.value = 1
  expandedLog.value = null
}, { deep: true })

// Auto scroll to top on new logs when on first page
watch(() => logs.value.length, (newLen, oldLen) => {
  if (newLen > oldLen && currentPage.value === 1 && logContainerRef.value) {
    nextTick(() => {
      logContainerRef.value!.scrollTop = 0
    })
  }
})
</script>

<style scoped>
/* ========== CSS Variables ========== */
.cyber-log-viewer {
  --bg-primary: #FAFAFA;
  --bg-secondary: #F5F5F5;
  --bg-tertiary: #FFFFFF;
  --bg-hover: rgba(37, 99, 235, 0.06);
  
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
  --text-muted: #9CA3AF;
  
  --color-info: #2563EB;
  --color-warn: #D97706;
  --color-error: #DC2626;
  --color-debug: #6B7280;
  
  --border-color: #E5E7EB;
  --border-subtle: #F3F4F6;
  
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --shadow-glow: 0 0 20px rgba(37, 99, 235, 0.15);
  
  --mono-font: 'JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', monospace;
  
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

/* ========== Header ========== */
.cyber-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.terminal-icon {
  width: 28px;
  height: 28px;
  color: var(--color-info);
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal-icon svg {
  width: 100%;
  height: 100%;
}

.title-text {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 1px;
  margin: 0;
  font-family: var(--mono-font),serif;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  font-family: var(--mono-font),serif;
  border: 1px solid var(--border-subtle);
  transition: all 0.3s ease;
}

.status-indicator.active {
  background: rgba(37, 99, 235, 0.1);
  color: var(--color-info);
  border-color: rgba(37, 99, 235, 0.2);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.header-actions {
  display: flex;
  gap: 8px;
}

.cyber-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.cyber-btn svg {
  width: 16px;
  height: 16px;
}

.cyber-btn:hover {
  border-color: var(--color-info);
  color: var(--color-info);
  background: var(--bg-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.cyber-btn.danger:hover {
  border-color: var(--color-error);
  color: var(--color-error);
  background: rgba(220, 38, 38, 0.06);
}

/* ========== Stats Bar ========== */
.stats-container {
  padding: 16px 20px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-subtle);
}

.stats-bar {
  display: flex;
  height: 28px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--bg-secondary);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.stat-segment {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 4px;
  transition: all 0.3s ease;
  position: relative;
}

.stat-segment:hover {
  filter: brightness(1.1);
}

.segment-label {
  font-size: 11px;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  font-family: var(--mono-font),serif;
}


@keyframes segment-pulse {
  0%, 100% { 
    opacity: 1;
    box-shadow: none;
  }
  50% { 
    opacity: 0.85;
    box-shadow: 0 0 8px var(--color-error);
  }
}

.stats-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}


.legend-label {
  color: var(--text-secondary);
}

.legend-count {
  font-weight: 600;
  color: var(--text-primary);
  font-family: var(--mono-font),serif;
  padding: 1px 6px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
}

/* ========== Filters ========== */
.filter-panel {
  padding: 14px 20px;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-subtle);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  align-items: center;
}

.filter-group.search-group {
  flex: 1;
  min-width: 200px;
  max-width: 320px;
  position: relative;
}

.filter-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  pointer-events: none;
}

.cyber-input {
  width: 100%;
  padding: 8px 12px 8px 38px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  transition: all 0.2s ease;
}

.cyber-input:focus {
  outline: none;
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.cyber-input::placeholder {
  color: var(--text-muted);
}

/* Custom Dropdown Styles */
.custom-dropdown {
  position: relative;
  min-width: 120px;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-trigger:hover {
  border-color: var(--color-info);
  background: var(--bg-secondary);
}

.custom-dropdown.open .dropdown-trigger {
  border-color: var(--color-info);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.trigger-text {
  font-weight: 500;
}

.trigger-arrow {
  width: 14px;
  height: 14px;
  transition: transform 0.2s ease;
  color: var(--text-secondary);
}

.trigger-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
  min-width: 140px;
}

.dropdown-menu.event-menu {
  max-height: 300px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 13px;
}

.dropdown-item:hover {
  background: var(--bg-tertiary);
}

.dropdown-item.active {
  background: rgba(37, 99, 235, 0.08);
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-secondary);
}

.item-actor-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
}

.item-label {
  flex: 1;
  color: var(--text-primary);
}

.item-check {
  width: 14px;
  height: 14px;
  color: var(--color-info);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 4px 0;
}

/* Dropdown Animation */

/* Cyber Toggle Switch */
.cyber-toggle {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-secondary);
  transition: color 0.2s ease;
}

.cyber-toggle.active {
  color: var(--color-info);
}

.toggle-track {
  position: relative;
  width: 40px;
  height: 22px;
  background: var(--bg-secondary);
  border-radius: 11px;
  border: 1px solid var(--border-color);
  transition: all 0.3s ease;
}

.cyber-toggle.active .toggle-track {
  background: rgba(37, 99, 235, 0.15);
  border-color: var(--color-info);
}

.toggle-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: var(--bg-tertiary);
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.cyber-toggle.active .toggle-thumb {
  transform: translateX(18px);
  background: var(--color-info);
}

.toggle-label {
  font-weight: 500;
}

/* ========== Log Container ========== */
.log-container {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--bg-primary);
  position: relative;
}

/* Empty State - Silence Wave */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 300px;
  padding: 40px;
}

.silence-wave {
  width: 300px;
  height: 60px;
  margin-bottom: 24px;
  opacity: 0.4;
}

.silence-wave svg {
  width: 100%;
  height: 100%;
}

.wave-path {
  fill: none;
  stroke: var(--text-muted);
  stroke-width: 2;
  stroke-linecap: round;
  animation: wave-flow 3s ease-in-out infinite;
}

@keyframes wave-flow {
  0%, 100% {
    d: path('M0,30 Q50,10 100,30 T200,30 T300,30 T400,30');
  }
  25% {
    d: path('M0,30 Q50,50 100,30 T200,30 T300,30 T400,30');
  }
  50% {
    d: path('M0,30 Q50,25 100,30 T200,30 T300,30 T400,30');
  }
  75% {
    d: path('M0,30 Q50,35 100,30 T200,30 T300,30 T400,30');
  }
}

.empty-text {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 8px 0;
}

.empty-subtext {
  font-size: 11px;
  color: var(--text-muted);
  font-family: var(--mono-font),serif;
  letter-spacing: 2px;
  margin: 0;
}

/* Log List */
.log-list-wrapper {
  padding: 8px 16px 16px;
}

/* Log Capsule */
.log-capsule {
  display: flex;
  align-items: stretch;
  margin-bottom: 6px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.2s ease;
  animation: slide-in 0.3s ease-out;
  overflow: hidden;
}

@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.log-capsule:hover {
  background: var(--bg-hover);
  border-color: rgba(37, 99, 235, 0.2);
  box-shadow: var(--shadow-glow);
}


@keyframes error-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.2);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(220, 38, 38, 0.1);
  }
}

/* Level Indicator Bar */
.capsule-indicator {
  width: 3px;
  flex-shrink: 0;
  transition: width 0.2s ease;
}

.log-capsule:hover .capsule-indicator {
  width: 4px;
}

/* Capsule Content */
.capsule-content {
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
}

.capsule-header {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}

.log-timestamp {
  font-family: var(--mono-font),fantasy;
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.log-level-badge {
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 600;
  text-transform: lowercase;
  letter-spacing: 1px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Actor Badge Styles */
.log-actor-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.log-actor-badge .actor-icon {
  font-size: 12px;
}

.log-actor-badge .actor-label {
  font-size: 9px;
}

.log-event-tag {
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.log-message {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.log-task-id {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-family: var(--mono-font),serif;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}

.log-task-id svg {
  width: 12px;
  height: 12px;
}

/* Expand Hint */
.expand-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  color: var(--text-muted);
  transition: all 0.2s ease;
}

.expand-hint svg {
  width: 16px;
  height: 16px;
  transition: transform 0.2s ease;
}

.expand-hint.expanded svg {
  transform: rotate(180deg);
}

.log-capsule:hover .expand-hint {
  color: var(--color-info);
}

/* Capsule Details */
.capsule-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle);
  overflow: hidden;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px 20px;
}

.detail-item {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-key {
  width: 70px;
  flex-shrink: 0;
  color: var(--text-muted);
  font-weight: 500;
}

.detail-value {
  color: var(--text-primary);
  word-break: break-all;
}

.detail-value.mono {
  font-family: var(--mono-font),serif;
}

.detail-code {
  grid-column: 1 / -1;
  margin: 4px 0 0 0;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  font-family: var(--mono-font),serif;
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-primary);
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

/* ========== Pagination ========== */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px;
  background: var(--bg-tertiary);
  border-top: 1px solid var(--border-subtle);
}

.page-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.page-btn svg {
  width: 16px;
  height: 16px;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--color-info);
  color: var(--color-info);
  background: var(--bg-hover);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--mono-font),serif;
  font-size: 13px;
}

.current-page {
  font-weight: 600;
  color: var(--color-info);
}

.page-separator {
  color: var(--text-muted);
}

.total-pages {
  color: var(--text-secondary);
}

/* ========== Modal ========== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-content {
  background: var(--bg-tertiary);
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 360px;
  overflow: hidden;
  box-shadow: var(--shadow-md);
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);
}

.warning-icon {
  width: 32px;
  height: 32px;
  color: var(--color-warn);
  flex-shrink: 0;
}

.warning-icon svg {
  width: 100%;
  height: 100%;
}

.modal-header h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 0 0 8px 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.warning-code {
  font-family: var(--mono-font),serif;
  font-size: 11px !important;
  color: var(--color-warn) !important;
  letter-spacing: 1px;
  margin-top: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-subtle);
}

.btn-secondary,
.btn-danger {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.btn-secondary:hover {
  border-color: var(--color-info);
  color: var(--color-info);
  background: var(--bg-hover);
}

.btn-danger {
  background: var(--color-error);
  border-color: var(--color-error);
  color: white;
}

.btn-danger:hover {
  background: #B91C1C;
  border-color: #B91C1C;
}

/* Modal Transitions */

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  opacity: 0;
  transform: scale(0.95);
}

/* ========== Scrollbar Styling ========== */
.log-container::-webkit-scrollbar {
  width: 6px;
}

.log-container::-webkit-scrollbar-track {
  background: transparent;
}

.log-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.log-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}

/* ========== Responsive ========== */
@media (max-width: 768px) {
  .cyber-header {
    padding: 12px 16px;
  }
  
  .header-title {
    gap: 8px;
  }
  
  .title-text {
    font-size: 13px;
  }
  
  .stats-container {
    padding: 12px 16px;
  }
  
  .stats-legend {
    gap: 12px;
  }
  
  .filter-panel {
    padding: 12px 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group.search-group {
    max-width: none;
  }
  
  .capsule-header {
    flex-wrap: wrap;
    gap: 6px;
  }
  
  .log-message {
    width: 100%;
    order: 99;
    margin-top: 4px;
  }
  
  .details-grid {
    grid-template-columns: 1fr;
  }
}
</style>
