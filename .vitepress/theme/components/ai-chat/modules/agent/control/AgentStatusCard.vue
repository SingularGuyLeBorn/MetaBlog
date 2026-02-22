<!--
  AgentStatusCard - Agent 状态卡片
  
  显示：
  - 动态头像
  - 名称和描述
  - 状态指示器
  - 触发条件标签
  - 操作按钮
-->
<template>
  <div 
    class="agent-status-card"
    :class="{ 
      active: isActive,
      [agent.status]: true,
      'is-hovered': isHovered
    }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
    @click="$emit('click', agent)"
  >
    <!-- 状态指示条 -->
    <div class="status-bar" :class="agent.status"></div>
    
    <!-- 头像区 -->
    <div class="avatar-section">
      <div class="avatar-wrapper">
        <img 
          :src="avatarUrl" 
          :alt="agent.name"
          class="agent-avatar"
          @error="handleAvatarError"
        />
        <div class="status-dot" :class="agent.status"></div>
      </div>
      <div class="avatar-id">#{{ agent.avatarId || 1 }}</div>
    </div>
    
    <!-- 信息区 -->
    <div class="info-section">
      <h4 class="agent-name">{{ agent.name }}</h4>
      <p class="agent-desc">{{ agent.description || '暂无描述' }}</p>
      
      <!-- 触发条件标签 -->
      <div class="trigger-tags">
        <span 
          v-for="trigger in enabledTriggers" 
          :key="trigger.id"
          class="trigger-tag"
          :class="trigger.type"
          :title="trigger.name"
        >
          {{ triggerIcon(trigger.type) }}
          {{ triggerTypeName(trigger.type) }}
        </span>
        <span v-if="(agent.triggers || []).length === 0" class="trigger-tag empty">
          无触发器
        </span>
      </div>
    </div>
    
    <!-- 统计区 -->
    <div class="stats-section">
      <div class="stat-item" title="运行次数">
        <span class="stat-icon">▶️</span>
        <span class="stat-value">{{ agent.totalRuns || 0 }}</span>
      </div>
      <div class="stat-item" title="错误次数" v-if="(agent.errorCount || 0) > 0">
        <span class="stat-icon">⚠️</span>
        <span class="stat-value error">{{ agent.errorCount || 0 }}</span>
      </div>
    </div>
    
    <!-- 操作区 -->
    <div class="actions-section" @click.stop>
      <!-- 启动/暂停按钮 -->
      <button 
        v-if="agent.status === 'running'"
        class="action-btn pause"
        @click="$emit('pause', agent)"
        title="暂停"
      >
        ⏸️
      </button>
      <button 
        v-else-if="agent.status === 'error'"
        class="action-btn retry"
        @click="$emit('start', agent)"
        title="重试"
      >
        🔄
      </button>
      <button 
        v-else
        class="action-btn start"
        @click="$emit('start', agent)"
        title="启动"
        :disabled="agent.status === 'busy'"
      >
        ▶️
      </button>
      
      <!-- 编辑按钮 -->
      <button 
        class="action-btn edit"
        @click="$emit('edit', agent)"
        title="编辑"
      >
        ✏️
      </button>
      
      <!-- 删除按钮 -->
      <button 
        class="action-btn delete"
        @click="$emit('delete', agent)"
        title="删除"
      >
        🗑️
      </button>
    </div>
    
    <!-- 活跃指示器 -->
    <div v-if="isActive" class="active-indicator">
      <span class="pulse"></span>
      当前使用
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Agent, TriggerType } from '../../../core/composables'
import { generateAvatarUrl } from '../../../core/composables'

const props = defineProps<{
  agent: Agent
  isActive?: boolean
}>()

const emit = defineEmits<{
  click: [agent: Agent]
  start: [agent: Agent]
  pause: [agent: Agent]
  edit: [agent: Agent]
  delete: [agent: Agent]
}>()

const isHovered = ref(false)
const avatarError = ref(false)

// 头像 URL
const avatarUrl = computed(() => {
  if (avatarError.value) {
    return `https://api.dicebear.com/7.x/identicon/svg?seed=${props.agent.id}`
  }
  return generateAvatarUrl(props.agent.avatarId || 1, props.agent.id)
})

// 启用的触发器
const enabledTriggers = computed(() => 
  (props.agent.triggers || []).filter(t => t.enabled).slice(0, 3)
)

// 触发器图标
function triggerIcon(type: TriggerType): string {
  const icons: Record<TriggerType, string> = {
    manual: '👆',
    scheduled: '⏰',
    event: '⚡',
    webhook: '🔌',
    mention: '@️'
  }
  return icons[type] || '❓'
}

// 触发器类型名称
function triggerTypeName(type: TriggerType): string {
  const names: Record<TriggerType, string> = {
    manual: '手动',
    scheduled: '定时',
    event: '事件',
    webhook: 'Webhook',
    mention: '提及'
  }
  return names[type] || type
}

// 头像加载失败处理
function handleAvatarError() {
  avatarError.value = true
}
</script>

<style scoped>
.agent-status-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.agent-status-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--vp-c-brand);
}

.agent-status-card.active {
  border-color: var(--vp-c-brand);
  background: linear-gradient(135deg, var(--vp-c-bg-soft), rgba(59, 130, 246, 0.05));
}

/* 状态指示条 */
.status-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.status-bar.running { background: linear-gradient(180deg, #22c55e, #16a34a); }
.status-bar.paused { background: linear-gradient(180deg, #f59e0b, #d97706); }
.status-bar.error { background: linear-gradient(180deg, #ef4444, #dc2626); }
.status-bar.idle { background: linear-gradient(180deg, #6b7280, #4b5563); }
.status-bar.busy { background: linear-gradient(180deg, #3b82f6, #2563eb); }
.status-bar.online { background: linear-gradient(180deg, #22c55e, #16a34a); }
.status-bar.offline { background: linear-gradient(180deg, #9ca3af, #6b7280); }

/* 头像区 */
.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.avatar-wrapper {
  position: relative;
  width: 56px;
  height: 56px;
}

.agent-avatar {
  width: 100%;
  height: 100%;
  border-radius: 14px;
  object-fit: cover;
  background: var(--vp-c-bg-mute);
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 3px solid var(--vp-c-bg-soft);
}

.status-dot.running { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
.status-dot.paused { background: #f59e0b; }
.status-dot.error { background: #ef4444; }
.status-dot.idle { background: #6b7280; }
.status-dot.busy { background: #3b82f6; animation: pulse 1.5s infinite; }
.status-dot.online { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
.status-dot.offline { background: #9ca3af; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.avatar-id {
  font-size: 10px;
  color: var(--vp-c-text-3);
  font-weight: 500;
}

/* 信息区 */
.info-section {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.agent-name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-desc {
  margin: 0;
  font-size: 12px;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 触发器标签 */
.trigger-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.trigger-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--vp-c-bg-mute);
  color: var(--vp-c-text-2);
}

.trigger-tag.manual { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
.trigger-tag.scheduled { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
.trigger-tag.event { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.trigger-tag.webhook { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
.trigger-tag.mention { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
.trigger-tag.empty { opacity: 0.5; }

/* 统计区 */
.stats-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--vp-c-text-2);
}

.stat-icon {
  font-size: 10px;
}

.stat-value {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.stat-value.error {
  color: #ef4444;
}

/* 操作区 */
.actions-section {
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.agent-status-card:hover .actions-section,
.agent-status-card.is-hovered .actions-section {
  opacity: 1;
}

.action-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: var(--vp-c-bg);
}

.action-btn:hover {
  transform: scale(1.1);
}

.action-btn.start {
  color: #22c55e;
}
.action-btn.start:hover {
  background: rgba(34, 197, 94, 0.1);
}

.action-btn.pause {
  color: #f59e0b;
}
.action-btn.pause:hover {
  background: rgba(245, 158, 11, 0.1);
}

.action-btn.retry {
  color: #ef4444;
  animation: shake 0.5s ease-in-out;
}
.action-btn.retry:hover {
  background: rgba(239, 68, 68, 0.1);
}

.action-btn.edit {
  color: var(--vp-c-text-2);
}
.action-btn.edit:hover {
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
}

.action-btn.delete {
  color: var(--vp-c-text-2);
}
.action-btn.delete:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.1);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

/* 活跃指示器 */
.active-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 500;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 20px;
}

.pulse {
  width: 6px;
  height: 6px;
  background: #22c55e;
  border-radius: 50%;
  animation: pulse-dot 2s infinite;
}

@keyframes pulse-dot {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

/* 深色模式适配 */
.dark .agent-status-card {
  background: rgba(255, 255, 255, 0.03);
}

.dark .agent-status-card.active {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(59, 130, 246, 0.1));
}

/* 响应式 */
@media (max-width: 640px) {
  .agent-status-card {
    flex-wrap: wrap;
  }
  
  .stats-section {
    flex-direction: row;
    width: 100%;
    justify-content: flex-start;
    padding-left: 72px;
  }
  
  .actions-section {
    opacity: 1;
    width: 100%;
    justify-content: flex-end;
    padding-top: 8px;
    border-top: 1px solid var(--vp-c-divider);
    margin-top: 8px;
  }
}
</style>
