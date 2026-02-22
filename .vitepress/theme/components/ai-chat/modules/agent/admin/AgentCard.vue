<!--
  AgentCard - Agent 卡片组件
  
  设计特点：
  - 简洁现代的设计风格
  - 显示核心信息：头像、名称、状态、技能
  - 悬停显示操作按钮
  - 点击卡片进入详情
-->
<template>
  <div 
    class="agent-card"
    :class="{ 
      'is-active': isActive,
      'is-offline': agent.status === 'offline'
    }"
    @click="$emit('click', agent)"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <!-- 状态指示器 -->
    <div class="status-bar" :class="agent.status"></div>
    
    <!-- 头部：头像和名称 -->
    <div class="card-header">
      <div class="avatar-wrapper">
        <span class="avatar">{{ agent.avatar }}</span>
        <span class="status-dot" :class="agent.status"></span>
      </div>
      
      <div class="header-info">
        <h4 class="agent-name">{{ agent.name }}</h4>
        <span class="agent-level" :style="levelStyle">{{ levelLabel }}</span>
      </div>
      
      <!-- 默认标识 -->
      <div v-if="agent.isDefault" class="default-badge">
        <span>默认</span>
      </div>
    </div>
    
    <!-- 描述 -->
    <p class="agent-desc">{{ agent.description || '暂无描述' }}</p>
    
    <!-- 技能标签 -->
    <div class="skills-section">
      <span 
        v-for="skill in displayedSkills" 
        :key="skill"
        class="skill-tag"
      >{{ skill }}</span>
      <span v-if="remainingSkills > 0" class="skill-more">+{{ remainingSkills }}</span>
    </div>
    
    <!-- 统计信息 -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-label">调用</span>
        <span class="stat-value">{{ formatNumber(agent.callCount) }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">技能</span>
        <span class="stat-value">{{ agent.skills.length }}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">权限</span>
        <span class="stat-value">{{ grantedPermissions }}</span>
      </div>
    </div>
    
    <!-- 底部操作栏 -->
    <div class="card-footer">
      <!-- 状态切换按钮 -->
      <button 
        class="btn-status"
        :class="agent.status"
        @click.stop="$emit('toggle-status', agent)"
      >
        <span class="status-indicator"></span>
        {{ statusText }}
      </button>
      
      <!-- 操作按钮组 -->
      <div class="action-group">
        <button 
          class="btn-action"
          title="编辑"
          @click.stop="$emit('edit', agent)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        
        <button 
          v-if="!agent.isDefault"
          class="btn-action delete"
          title="删除"
          @click.stop="$emit('delete', agent)"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- 悬停遮罩 -->
    <Transition name="fade">
      <div v-if="isHovered" class="hover-overlay">
        <span class="hover-text">点击查看详情</span>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Agent } from '../../../core/composables/useAgents'
import { LEVEL_CONFIG } from '../../../core/composables/useAgents'

const props = defineProps<{
  agent: Agent
  isActive: boolean
}>()

const emit = defineEmits<{
  click: [agent: Agent]
  edit: [agent: Agent]
  delete: [agent: Agent]
  'toggle-status': [agent: Agent]
}>()

const isHovered = ref(false)

// 等级配置
const levelConfig = computed(() => LEVEL_CONFIG[props.agent.level])
const levelLabel = computed(() => levelConfig.value.label)
const levelStyle = computed(() => ({
  color: levelConfig.value.color,
  background: `${levelConfig.value.color}15`
}))

// 状态文本
const statusText = computed(() => {
  const map: Record<string, string> = {
    online: '在线',
    offline: '离线',
    busy: '忙碌',
    idle: '空闲'
  }
  return map[props.agent.status] || props.agent.status
})

// 技能显示
const maxSkills = 3
const displayedSkills = computed(() => props.agent.skills.slice(0, maxSkills))
const remainingSkills = computed(() => Math.max(0, props.agent.skills.length - maxSkills))

// 权限数量
const grantedPermissions = computed(() => 
  props.agent.permissions.filter(p => p.granted).length
)

// 格式化数字
function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num.toString()
}
</script>

<style scoped>
.agent-card {
  position: relative;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.agent-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  border-color: var(--vp-c-brand);
}

.agent-card.is-active {
  border-color: var(--vp-c-brand);
  box-shadow: 0 0 0 3px var(--vp-c-brand-soft);
}

.agent-card.is-offline {
  opacity: 0.8;
}

/* 状态条 */
.status-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
}

.status-bar.online { background: linear-gradient(90deg, #22c55e, #16a34a); }
.status-bar.offline { background: linear-gradient(90deg, #6b7280, #4b5563); }
.status-bar.busy { background: linear-gradient(90deg, #f59e0b, #d97706); }
.status-bar.idle { background: linear-gradient(90deg, #3b82f6, #2563eb); }

/* 头部 */
.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.avatar-wrapper {
  position: relative;
  flex-shrink: 0;
}

.avatar {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: var(--vp-c-bg-soft);
  border-radius: 12px;
}

.status-dot {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--vp-c-bg);
}

.status-dot.online { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
.status-dot.offline { background: #6b7280; }
.status-dot.busy { background: #f59e0b; }
.status-dot.idle { background: #3b82f6; }

.header-info {
  flex: 1;
  min-width: 0;
}

.agent-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.agent-level {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
}

.default-badge {
  flex-shrink: 0;
}

.default-badge span {
  display: inline-block;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  border-radius: 20px;
}

/* 描述 */
.agent-desc {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--vp-c-text-2);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 技能标签 */
.skills-section {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.skill-tag {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
}

.skill-more {
  padding: 4px 10px;
  font-size: 12px;
  color: var(--vp-c-brand);
  background: var(--vp-c-brand-soft);
  border-radius: 6px;
  font-weight: 500;
}

/* 统计信息 */
.stats-row {
  display: flex;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--vp-c-text-3);
}

.stat-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

/* 底部操作栏 */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.btn-status {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-status.online {
  color: #16a34a;
  background: #dcfce7;
}

.btn-status.offline {
  color: #6b7280;
  background: #f3f4f6;
}

.btn-status .status-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.action-group {
  display: flex;
  gap: 8px;
}

.btn-action {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vp-c-bg-soft);
  border: none;
  border-radius: 8px;
  color: var(--vp-c-text-2);
  cursor: pointer;
  transition: all 0.2s;
}

.btn-action:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand);
}

.btn-action.delete:hover {
  background: #fee2e2;
  color: #ef4444;
}

.btn-action svg {
  width: 16px;
  height: 16px;
}

/* 悬停遮罩 */
.hover-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 16px;
}

.hover-text {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

/* 动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
